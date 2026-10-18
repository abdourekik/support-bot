# Architecture

support-bot has three parts: an **ingestion** workflow that turns the shop's documents into searchable chunks, a **chat** workflow that answers customers (or hands them over to a human), and a **widget** that any website can embed.

## Overview

```mermaid
flowchart LR
    subgraph Browser["Customer's browser"]
        W["Chat widget<br/>(React, Shadow DOM)"]
    end

    subgraph N8N["n8n (Docker)"]
        CH["Support chat<br/>POST /webhook/chat"]
        EM["POST /webhook/escalation-email"]
        IN["Ingest knowledge base<br/>manual / POST /webhook/ingest"]
    end

    subgraph Gemini["Google Gemini API"]
        EMB["gemini-embedding-2<br/>768 dims"]
        LLM["gemini-3.5-flash-lite"]
    end

    subgraph SB["Supabase (Postgres + pgvector)"]
        DOC[("documents<br/>+ match_documents()")]
        CONV[("conversations")]
        ESC[("escalations")]
    end

    KB["data/knowledge_base/*.md<br/>(10 French files)"]

    W -- "question" --> CH
    CH -- "answer + sources + escalated" --> W
    W -- "email after escalation" --> EM
    EM --> ESC

    KB --> IN
    IN -- "chunks" --> EMB
    IN -- "chunks + vectors" --> DOC

    CH -- "question" --> EMB
    CH -- "top 5 chunks" --> DOC
    CH -- "prompt + chunks" --> LLM
    CH -- "log" --> CONV
    CH -- "hand-over" --> ESC
```

## Chat workflow, step by step

```mermaid
flowchart TD
    A["POST /webhook/chat<br/>{session_id, message}"] --> B{"Valid input?"}
    B -- no --> B1["400 + error"]
    B -- yes --> C["Load last 3 exchanges<br/>+ open escalation (Postgres)"]
    C --> D{"Rules"}
    D -- "prompt injection · human requested ·<br/>legal threat · compensation demand ·<br/>damaged item · order number" --> R["Fixed French reply<br/>escalated = true<br/>(no LLM call)"]
    D -- "email sent after an escalation" --> E["Save email on the escalation"]
    D -- "normal question" --> F["Embed question<br/>(query prefix, 768 dims)"]
    F --> G["match_documents → top 5 chunks"]
    G --> H["Gemini flash-lite, temperature 0.2<br/>French system prompt, JSON schema<br/>{type, answer, source_ids, reason}"]
    H --> I{"Escalate?<br/>model says so · no valid source ·<br/>best similarity < 0.60"}
    I -- no --> J["Answer + 'Source : …'"]
    I -- yes --> K["Hand-over message, ask for email"]
    F -. error / 429 .-> X["Polite fallback<br/>escalated = true"]
    G -. error .-> X
    H -. error / 429 .-> X
    R & E & J & K & X --> L["Log conversation"]
    L --> M{"New escalation?"}
    M -- yes --> N["Insert escalation"]
    M -- no --> O["Respond JSON"]
    N --> O
```

## Ingestion workflow

```mermaid
flowchart LR
    A["Manual trigger /<br/>POST /webhook/ingest"] --> B["Read /data/knowledge_base/*.md"]
    B --> C["Split by '## ' section,<br/>then ~800 chars, 100 overlap"]
    C --> D["Gemini batchEmbedContents<br/>(document prefix, 768 dims)"]
    D --> E["Delete old rows"]
    E --> F["Insert chunks<br/>metadata: source_file, section_title"]
```

Old rows are deleted only after every embedding succeeded, so a failed run never empties the store.

## Design choices

| Choice | Why |
|---|---|
| **Fixed pipeline instead of an n8n AI Agent** | Retrieval always runs (an agent may skip its tool), one LLM call per question (free-tier friendly), and the logged `confidence` is a real similarity score. |
| **Rules before the LLM** | Order numbers, requests for a human, legal threats, damaged items and injection attempts are handled instantly, for free and predictably. |
| **Gemini JSON schema** (`responseSchema`) | The model must return `{type, answer, source_ids, reason}`; no fragile text parsing. |
| **Sources checked in code** | The model cites document numbers; only numbers that were really retrieved are kept, and the "Source : …" line is added by code. A made-up source is impossible. |
| **HTTP Request nodes for Gemini** | n8n's built-in Gemini embeddings node cannot set the output size (it returns 3072 dims) or add the `gemini-embedding-2` task prefixes. |
| **768-dimension embeddings** | Smaller index and faster search than 3072, with good quality for short French documents; fits pgvector's HNSW index. |
| **Memory in Postgres** | The last 3 exchanges are read from `conversations`: survives n8n restarts, and the logs double as memory. |
| **Row Level Security, no policies** | The public (publishable) key can read nothing; only the server-side secret key used by n8n has access. |
| **Shadow DOM widget** | The host site's CSS cannot break the widget, and the widget's CSS cannot leak into the site. |

## Data model

| Table | Columns | Written by |
|---|---|---|
| `documents` | `id`, `content`, `metadata` (`source_file`, `section_title`, `doc_title`, `chunk_index`), `embedding vector(768)` | Ingestion |
| `conversations` | `session_id`, `user_message`, `bot_answer`, `sources`, `escalated`, `confidence`, `created_at` | Chat |
| `escalations` | `session_id`, `question`, `reason`, `customer_email`, `status` (`open` / `in_progress` / `closed`), `created_at` | Chat, escalation-email |

Schema: [`supabase/migrations/001_init.sql`](../supabase/migrations/001_init.sql).
