# CLAUDE.md — support-bot

Re-read this file before every task. It is the source of truth for scope, stack and working rules.

## Project

- **Name:** support-bot
- **What it is:** a French-language customer support chatbot (RAG) for **Maison Nora**, a **fictional** online shop selling home linen (sheets, towels, cushions).
  - Answers **only** from the shop's own documents in `data/knowledge_base/`.
  - **Cites the source section** of every answer.
  - **Escalates to a human** when it is not confident (low retrieval score, no relevant source, or out-of-scope question), and logs the escalation.
- **Everything about the shop is invented.** Never use real brand names, real addresses, real phone numbers, real emails or real people. Use clearly fake data, e.g. `contact@maison-nora.example`, phone numbers in the reserved fictional range (+33 1 99 00 xx xx).
- **Exception approved by the user:** « PayPal » may appear as a payment method (`paiement.md`), because it is realistic for a French shop. No other real brand names.
- **Knowledge base = single source of truth for shop facts.** Before writing anything that states a shop fact (prices, delays, sizes, contact details), read the matching file in `data/knowledge_base/` and reuse its exact values. After changing the KB, run `python scripts/check_kb.py`.
- **Audience:** small French-speaking businesses in Europe, shown as an Upwork portfolio demo. Quality of the demo, clarity of the README and GDPR-friendly choices matter.

## Stack (do not change without asking the user)

| Layer | Choice |
|---|---|
| Orchestration | n8n, self-hosted with Docker Compose, image `n8nio/n8n:latest` (the stable tag), named volume `n8n_data`, port 5678 |
| Vector store + logs | Supabase (hosted, free plan) with the `pgvector` extension; also stores conversations and escalations |
| LLM | Google Gemini API, **free tier only** |
| Frontend | React + Vite + TypeScript chat widget, embedded in a one-page demo shop site (`widget/`) |
| Scripts | Python 3.11+ for data prep, upload and evaluation (`scripts/`) |

### Gemini model IDs (verified 2026-10-18 in the official Gemini API docs)

Sources: https://ai.google.dev/gemini-api/docs/models, `/docs/embeddings`, `/docs/pricing`.

- **Chat model (default):** `gemini-3.5-flash-lite` — stable, free tier.
- **Chat model (fallback, if quality is not enough):** `gemini-3.8-flash` — stable, free tier.
- **Embeddings:** `gemini-embedding-2` — stable, free tier, input limit 8,192 tokens.
  - Always request `output_dimensionality: 768` → the pgvector column is `vector(768)`.
  - `gemini-embedding-2` normalizes truncated vectors automatically (no manual L2 normalization needed). Use cosine distance.
  - It does **not** support `task_type`. Use text prefixes instead:
    - documents: `title: {section title} | text: {content}`
    - queries: `task: search result | query: {question}`
  - The same model and prefix rules must be used at ingestion and at query time. Changing the embedding model means re-embedding everything.
- REST base URL: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` / `:embedContent`, auth header `x-goog-api-key`.
- Free-tier rate limits are low: batch and throttle embedding calls, and retry on HTTP 429 with backoff.
- Re-check these IDs in the docs before changing any model; models get deprecated.

### Supabase schema (`supabase/migrations/001_init.sql`)

- `documents(id bigserial, content text, metadata jsonb, embedding vector(768))` + HNSW index (`vector_cosine_ops`).
- `match_documents(query_embedding vector(768), match_count int default 5, filter jsonb default '{}')` → `id, content, metadata, similarity` (cosine, 1 = identical). Filter is JSONB containment (`metadata @> filter`).
- n8n Supabase Vector Store node: table name `documents`, query name `match_documents`.
- Chunk metadata keys: `source` (file name, e.g. `livraison.md`) and `section` (the `##` heading). The bot cites these.
- `conversations` and `escalations` logs; escalation `status` is `open` / `in_progress` / `closed`.
- RLS on all tables, no policies: only the secret key (server side) can read/write. New tables must follow the same rule.
- The secret key is the new-style `sb_secret_…` key, stored as `SUPABASE_SERVICE_ROLE_KEY`; send it in the `apikey` header.
- New schema changes go in a new numbered file (`002_…sql`); never edit a migration that was already run.
- Never print `SUPABASE_DB_URL` or psql error output unmasked: it contains the database password.

## Folder structure

```
support-bot/
  CLAUDE.md
  README.md
  .env.example
  .gitignore
  docker-compose.yml
  data/raw/             downloaded datasets (git-ignored)
  data/knowledge_base/  French markdown documents of the fictional shop
  data/eval/            French test questions
  scripts/              Python: data prep, upload, evaluation
  n8n/workflows/        exported workflow JSON files (versioned)
  supabase/migrations/  SQL files
  widget/               React + Vite app
  docs/                 architecture diagram, screenshots, video script
```

`./n8n/workflows` is mounted read-only at `/workflows` in the n8n container. Import with:
`docker compose exec n8n n8n import:workflow --separate --input=/workflows`

## Environment variables

Defined in `.env` (never committed); placeholders in `.env.example`:
`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `N8N_ENCRYPTION_KEY`, `VITE_CHAT_WEBHOOK_URL`.
The service role key is server-side only (n8n, Python scripts). It must **never** reach the widget or any `VITE_*` variable.

## Rules for every task

1. **Read CLAUDE.md first.** Then show the user a short plan and **wait for "go"** before writing code.
2. **Stay inside the scope** of the current prompt. Note ideas for later instead of building them.
3. **Never commit secrets.** No real keys, URLs with credentials, or tokens in any file (including exported n8n workflows: strip credentials before committing). Keep `.env.example` up to date whenever a new variable is introduced.
4. **Language:** all user-facing chatbot text (answers, widget UI, escalation messages, knowledge base, eval questions) is in **French**. Code, comments, commit messages and README are in **English**.
5. **After each task, report:**
   - the list of files changed;
   - how to test it manually (step by step);
   - a short beginner-friendly explanation of the concepts used (5–8 bullets);
   - a Conventional Commit message (e.g. `feat(n8n): add chat workflow`).
6. **Do not push.** Commit only when the user asks.
