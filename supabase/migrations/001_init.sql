-- 001_init.sql
-- Schema for support-bot: vector store for the n8n "Supabase Vector Store" node,
-- plus conversation and escalation logs.
--
-- The documents table and match_documents function follow the Supabase LangChain
-- quickstart (https://supabase.com/docs/guides/ai/langchain), which is what the
-- n8n node expects (table "documents", query name "match_documents"), with the
-- vector size set to 768 for gemini-embedding-2.
--
-- Safe to run more than once.

-- 1. pgvector ---------------------------------------------------------------

create extension if not exists vector with schema extensions;

-- 2. Vector store -----------------------------------------------------------

create table if not exists public.documents (
  id bigserial primary key,
  content text,                        -- chunk text
  metadata jsonb,                      -- e.g. {"source": "livraison.md", "section": "Frais de livraison"}
  embedding extensions.vector(768)     -- gemini-embedding-2, output_dimensionality = 768
);

-- Approximate nearest-neighbour index for cosine distance (<=>).
create index if not exists documents_embedding_hnsw_idx
  on public.documents
  using hnsw (embedding extensions.vector_cosine_ops);

-- Same signature as the LangChain quickstart: n8n calls it with
-- query_embedding, match_count and filter.
create or replace function public.match_documents (
  query_embedding extensions.vector(768),
  match_count int default 5,
  filter jsonb default '{}'
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity  -- cosine similarity, 1 = identical
  from public.documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 3. Conversation log -------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_message text not null,
  bot_answer text,
  sources jsonb,                       -- cited sections, e.g. [{"source": "livraison.md", "section": "..."}]
  escalated boolean not null default false,
  confidence real,                     -- best similarity score of the retrieved chunks
  created_at timestamptz not null default now()
);

create index if not exists conversations_session_idx
  on public.conversations (session_id, created_at);

-- 4. Escalations to a human -------------------------------------------------

create table if not exists public.escalations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  question text not null,
  reason text,                         -- e.g. "low_confidence", "human_requested", "out_of_scope"
  customer_email text null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists escalations_status_idx
  on public.escalations (status, created_at);

-- 5. Security ---------------------------------------------------------------
-- RLS on, and no policies: the publishable (anon) key can read or write nothing.
-- Only the secret / service_role key used by n8n and the Python scripts
-- bypasses RLS.

alter table public.documents     enable row level security;
alter table public.conversations enable row level security;
alter table public.escalations   enable row level security;

-- Explicit grants for service_role (do not rely on project defaults).
grant select, insert, update, delete on public.documents, public.conversations, public.escalations to service_role;
grant usage, select on sequence public.documents_id_seq to service_role;

-- Only the backend may call the search function.
revoke execute on function public.match_documents(extensions.vector, int, jsonb) from public, anon, authenticated;
grant execute on function public.match_documents(extensions.vector, int, jsonb) to service_role;
