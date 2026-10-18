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

## Chat workflow (n8n)

`n8n/workflows/chat.json` ("Support chat") answers the widget at `POST /webhook/chat`.

Request: `{ "session_id": "8-64 chars", "message": "max 1000 chars" }`
Response: `{ "answer": "...", "sources": [{ "file": "livraison.md", "section": "Frais de livraison" }], "escalated": false }`

```
Webhook → validate input (400 if invalid)
 → load the last 3 exchanges + any open escalation for this session (Postgres)
 → rules: prompt injection, human requested, legal threat, damaged item, order number
      → matched: fixed French reply, escalate (no LLM call)
      → email sent after an escalation: save it on the escalation
 → embed the question (gemini-embedding-2, query prefix, 768 dims)
 → match_documents, top 5
 → Gemini gemini-3.5-flash-lite, temperature 0.2, French system prompt,
   JSON output { type: answer | escalate | small_talk, answer, source_ids, reason }
 → escalate if the model says so, cites no retrieved document, or best similarity < 0.60
 → log to conversations (+ escalations) → respond (CORS: http://localhost:5173)
Any Gemini/database error → polite French fallback, escalated = true
```

Design choice: a fixed pipeline instead of an n8n AI Agent. Retrieval always runs, the sources shown are the chunks actually retrieved, the best similarity is logged as `confidence`, and each question costs one LLM call.

Setup: the workflow uses two credentials, *Google Gemini(PaLM) Api* and a **Postgres** credential named *Supabase Postgres* (host, database, user, password and port from `SUPABASE_DB_URL`, SSL `require`, *Ignore SSL Issues* on). After importing, select them in the Postgres and HTTP Request nodes and publish the workflow.

Test with the sample payloads (stored as UTF-8 files so accents survive on Windows):

```bash
curl -X POST http://localhost:5678/webhook/chat -H "Content-Type: application/json; charset=utf-8" --data-binary @scripts/curl/1_normal.json
curl -X POST http://localhost:5678/webhook/chat -H "Content-Type: application/json; charset=utf-8" --data-binary @scripts/curl/2_escalate.json
curl -X POST http://localhost:5678/webhook/chat -H "Content-Type: application/json; charset=utf-8" --data-binary @scripts/curl/3_injection.json
```

A second webhook in the same workflow, `POST /webhook/escalation-email` with `{ "session_id", "email" }`, attaches the customer's email to the latest open escalation of the session (200 `{ ok: true }`, 404 if there is none, 400 if the email is invalid). The widget's email field uses it.

## Chat widget and demo shop (`widget/`)

React 19 + Vite + TypeScript. Needs Node 20+.

```bash
cd widget
npm install
npm run dev          # demo shop at http://localhost:5173 (n8n must be running)
npm run build        # typecheck + dist/ (demo site) + dist-embed/maison-nora-chat.js
```

The webhook URLs come from `VITE_CHAT_WEBHOOK_URL` and `VITE_ESCALATION_WEBHOOK_URL` in the root `.env` (Vite reads it via `envDir: '..'`; only `VITE_*` variables reach the browser).

Widget features: welcome message and suggestion chips, typing indicator, Enter to send (Shift+Enter for a new line), auto-scroll, sources as tags, inline email field after an escalation, French error messages with a retry button (30 s timeout), `session_id` and messages kept in `sessionStorage` (with an in-memory fallback), full-screen panel under 480 px, focus trap, Escape to close, `aria-live` message log, reduced-motion support.

### Embed on any website

`npm run build:embed` produces one self-contained file, `widget/dist-embed/maison-nora-chat.js` (React and CSS included, ~74 kB gzipped). Host it anywhere and add one tag before `</body>`:

```html
<script src="https://your-site.example/maison-nora-chat.js"
        data-webhook-url="https://your-n8n.example/webhook/chat"
        defer></script>
```

| Attribute | Default |
|---|---|
| `data-webhook-url` | value of `VITE_CHAT_WEBHOOK_URL` at build time |
| `data-email-webhook-url` | the chat URL with `/chat` replaced by `/escalation-email` |

The widget renders inside a Shadow DOM, so the host site's CSS does not change it and its CSS does not leak into the site. The n8n webhooks only accept requests from the origins listed in their *Allowed Origins (CORS)* option (`http://localhost:5173` in this demo): add the client's domain there. `widget/embed-test.html` (open http://localhost:5173/embed-test.html after `npm run build:embed`) loads the script on a page with deliberately aggressive CSS.

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
