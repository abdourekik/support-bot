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
