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
- Chunk metadata keys: `source_file` (e.g. `livraison.md`), `section_title` (the `##` heading), `doc_title` (the `#` heading), `chunk_index`. The bot cites `doc_title` / `section_title`.

### n8n decisions (approved by the user: "option A")

- The built-in n8n "Embeddings Google Gemini" node has **no output-dimensionality option** (it returns 3072 dims) and cannot add the `gemini-embedding-2` text prefixes. So workflows call Gemini with **HTTP Request** nodes (`batchEmbedContents` / `embedContent`, `outputDimensionality: 768`) using the predefined credential `googlePalmApi`, and talk to Supabase with the **Supabase** node or HTTP Request + credential `supabaseApi`. Do not use the LangChain vector store / embeddings nodes.
- n8n version in use: 2.43.x. `$env` is blocked in expressions/Code nodes; use credentials, not environment variables.
- File nodes can only read `N8N_RESTRICT_FILE_ACCESS_TO=/data/knowledge_base` (mounted read-only from `./data/knowledge_base`).
- Workflow JSON files contain no credential IDs; after import, select the credentials in each node.
- **Chat workflow ("option 2", approved):** fixed pipeline, not an AI Agent. Rules → embed → `match_documents` top 5 → one `gemini-3.5-flash-lite` call with `responseSchema` JSON (`type`, `answer`, `source_ids`, `reason`) → escalate if model says so / no valid source / top similarity < `SIMILARITY_THRESHOLD` (0.60, in node "Parse answer") → log → respond. The source line ("Source : …") is appended by code, not written by the model.
- Memory = last 3 exchanges read from `conversations` (not n8n Simple Memory).
- Database access in the chat workflow uses a **Postgres** credential "Supabase Postgres" (session pooler, SSL require, ignore SSL issues), because the Supabase node cannot call `match_documents`. Pass parameters with `queryReplacement` as an array expression `={{ [ ... ] }}`; never build SQL from strings.
- Webhooks only work on published workflows: `n8n publish:workflow --id=<id>` then restart n8n.
- Test payloads with accents must be sent from UTF-8 files (`--data-binary @scripts/curl/…json`); inline French text in curl on Windows arrives as `�`.
- When running `docker exec` from the Bash tool, add `< /dev/null`, otherwise the command can hang waiting for input.
- Running n8n CLI commands from Git Bash needs `MSYS_NO_PATHCONV=1` (otherwise `/workflows/...` is rewritten to a Windows path). From cmd/PowerShell no prefix is needed.
- `conversations` and `escalations` logs; escalation `status` is `open` / `in_progress` / `closed`.
- RLS on all tables, no policies: only the secret key (server side) can read/write. New tables must follow the same rule.
- The secret key is the new-style `sb_secret_…` key, stored as `SUPABASE_SERVICE_ROLE_KEY`; send it in the `apikey` header.
- New schema changes go in a new numbered file (`002_…sql`); never edit a migration that was already run.
- Never print `SUPABASE_DB_URL` or psql error output unmasked: it contains the database password.

### Widget (`widget/`)

- React 19.3, Vite 8, TypeScript 7. Two builds: `vite.config.ts` (demo site, `dist/`) and `vite.embed.config.ts` (IIFE library, `dist-embed/maison-nora-chat.js`). Both mount the widget through `src/chat/mount.tsx` into a **Shadow DOM**; CSS is imported with `?inline`.
- Put typography on `.mn-root`, not `:host` (host-page `*` rules with `!important` match the host element and are inherited).
- API contract: chat `{answer, sources[{file, section}], escalated}`; the widget strips the trailing "Source : …" line and shows sources as tags. Email field → `POST /webhook/escalation-email`.
- Host pages can open the chat with `window.dispatchEvent(new Event('maison-nora-chat:open'))`.
- No prices on product cards (the KB has none; user chose option "b"). Product facts must match `produits-entretien.md`.
- Browser-pane tests: the find/read_page tools do not see inside the Shadow DOM; use `document.getElementById('maison-nora-chat').shadowRoot` in JavaScript. The dev-server launch config lives outside the repo, in `D:\AIBot automation n8n\.claude\launch.json`.
- After a re-import + restart, n8n needs a few seconds before webhooks answer (empty response meanwhile).

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
