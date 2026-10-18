# support-bot

A French-language customer support chatbot (RAG) for **Maison Nora**, a fictional online shop selling home linen.
The bot answers only from the shop's own documents, cites the source section, and escalates to a human when it is not confident.

> Maison Nora is entirely invented. Any resemblance to a real company is coincidental.

**Status:** project skeleton. Features are added step by step.

## Stack

- **n8n** (self-hosted, Docker Compose) for orchestration of ingestion and chat workflows
- **Supabase** (Postgres + pgvector) as vector store and for conversation / escalation logs
- **Google Gemini API** (free tier): `gemini-3.5-flash-lite` for chat, `gemini-embedding-2` (768 dimensions) for embeddings
- **React + Vite + TypeScript** chat widget embedded in a demo shop page
- **Python 3.11+** scripts for data preparation and evaluation

## Repository layout

| Path | Content |
|---|---|
| `data/knowledge_base/` | French markdown documents of the fictional shop |
| `data/eval/` | French test questions |
| `data/raw/` | Downloaded datasets (git-ignored) |
| `scripts/` | Python data prep, upload and evaluation scripts |
| `n8n/workflows/` | Exported n8n workflows (JSON) |
| `supabase/migrations/` | SQL migrations |
| `widget/` | React chat widget and demo page |
| `docs/` | Architecture diagram, screenshots, video script |

## Quick start

1. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```
2. Start n8n:
   ```bash
   docker compose up -d
   ```
3. Open http://localhost:5678 and create the owner account.

More setup steps (Supabase, workflows, widget) will be documented as they are built.

## Supabase setup

1. Create a free Supabase project and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_…` key) and `SUPABASE_DB_URL` (Session pooler URI) in `.env`.
2. In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of `supabase/migrations/001_init.sql` and click **Run**. The script is safe to run more than once.
3. Check the schema:
   ```bash
   python scripts/test_supabase.py
   ```

The migration creates:

| Object | Purpose |
|---|---|
| `documents` + `match_documents()` | Vector store used by the n8n Supabase Vector Store node (768-dim embeddings, cosine similarity, HNSW index) |
| `conversations` | One row per question/answer, with cited sources, confidence and escalation flag |
| `escalations` | Questions handed over to a human (`open` / `in_progress` / `closed`) |

Row Level Security is enabled on every table with no policies, so the public (publishable) key can read nothing. Only the server-side secret key used by n8n and the scripts has access.

## Ingestion workflow (n8n)

`n8n/workflows/ingest.json` ("Ingest knowledge base") turns the markdown files into searchable chunks:

```
Manual trigger / POST /webhook/ingest
  → Read /data/knowledge_base/*.md
  → Split by "## " section, then ~800-char chunks with ~100-char overlap
  → Gemini gemini-embedding-2 (batchEmbedContents, 768 dims, document prefix)
  → Delete old rows in documents → Insert new rows
  → Summary {files, chunks}
```

Old rows are deleted only after all embeddings succeed, so a failed run never leaves the store empty.

1. Create two credentials in n8n (**Overview → Create → Credential**): *Google Gemini(PaLM) Api* (API key) and *Supabase API* (host + secret key).
2. Import the workflow:
   ```bash
   docker compose exec n8n n8n import:workflow --input=/workflows/ingest.json
   ```
3. Open the workflow, select the credentials in the nodes **Gemini: embed batch**, **Delete old chunks** and **Insert chunks**, save, then click **Execute workflow**.
4. Check in the Supabase SQL editor:
   ```sql
   select metadata->>'source_file' as file, count(*) as chunks
   from documents group by 1 order by 1;
   ```

Why HTTP Request nodes instead of n8n's Gemini embeddings node: that node cannot set the output dimensionality (it returns 3072 dimensions), and the database is built for 768.

## Data preparation

The scripts use only the Python standard library (Python 3.11+).

```bash
python scripts/download_bitext.py   # downloads the Bitext CSV into data/raw/ (checksum verified)
python scripts/explore_bitext.py    # prints categories and intents with row counts
python scripts/check_kb.py          # checks data/eval/questions.jsonl against data/knowledge_base/
```

- `data/knowledge_base/`: 10 French markdown files with the fictional shop's policies (delivery, returns, payment, invoices, account, etc.). They were written from scratch, using the Bitext intents only as a checklist of topics customers ask about.
- `data/eval/questions.jsonl`: 62 French test questions. 47 can be answered from the knowledge base (each lists its source file and the key facts the answer must contain). 15 must be escalated to a human.

## Data attribution

The list of customer intents used to plan the knowledge base and the evaluation questions comes from the
[Bitext Customer Service Tagged Training Dataset for LLM-based Virtual Assistants](https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset)
by Bitext Innovations, licensed under the
[Community Data License Agreement – Sharing, Version 1.0 (CDLA-Sharing-1.0)](https://cdla.dev/sharing-1-0/).

The dataset itself is not redistributed in this repository: `scripts/download_bitext.py` downloads it from Hugging Face into the git-ignored `data/raw/` folder. The evaluation questions are French adaptations of instructions from the dataset, with placeholders replaced.
