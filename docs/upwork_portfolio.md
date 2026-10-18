# Upwork portfolio entry

## Title

**EN:** AI Customer Support Chatbot (French RAG) with Human Hand-off – n8n, Supabase, Gemini, React

**FR :** Chatbot de service client IA en français, avec passage à un humain – n8n, Supabase, Gemini, React

## Description (English)

A customer support assistant for small online shops. It answers customers in French, 24/7, using only the shop's own policies (delivery, returns, payment, product care), and shows the source of every answer. When a request is sensitive or not covered (a specific order, a damaged parcel, a legal threat, a request for a human), it hands over to the team and collects the customer's email.

Built for a fictional linen shop, "Maison Nora":

- Retrieval-augmented generation: shop documents are split into sections, embedded with Gemini and searched in Supabase (pgvector).
- n8n workflows for ingestion and chat: input validation, rule-based safety checks, one LLM call per question with a strict JSON output, verified sources, conversation and escalation logs.
- Resists prompt-injection attempts; falls back to a polite message and a human hand-over if the AI service is unavailable.
- React chat widget that installs on any website with one `<script>` tag (Shadow DOM, mobile-friendly, keyboard accessible).
- Evaluated on 62 real-style customer questions with an automatic report (see the README for the numbers).
- Runs on free tiers; paid setup estimated at a few euros per month for a small shop.

What I can do for you: adapt it to your FAQ and terms, your brand colours and your website, and connect escalations to your email or helpdesk.

## Description (français)

Un assistant de service client pour les petites boutiques en ligne. Il répond à vos clients en français, 24 h/24, uniquement à partir de vos propres conditions (livraison, retours, paiement, entretien des produits), et cite la source de chaque réponse. Quand une demande est sensible ou non couverte (une commande précise, un colis abîmé, une menace juridique, une demande de parler à un humain), il passe la main à votre équipe et recueille l'adresse e-mail du client.

Réalisé pour une boutique fictive de linge de maison, « Maison Nora » :

- Génération augmentée par recherche (RAG) : vos documents sont découpés par section, vectorisés avec Gemini et recherchés dans Supabase (pgvector).
- Workflows n8n pour l'import des documents et le chat : validation des entrées, règles de sécurité, un seul appel à l'IA par question avec une réponse JSON stricte, sources vérifiées, historique des conversations et des transferts.
- Résiste aux tentatives de manipulation ; en cas d'indisponibilité de l'IA, message poli et transfert à un humain.
- Widget de chat React qui s'installe sur n'importe quel site avec une seule balise `<script>` (Shadow DOM, adapté au mobile, accessible au clavier).
- Évalué sur 62 questions de clients avec un rapport automatique (résultats dans le README).
- Fonctionne avec des offres gratuites ; en version payante, quelques euros par mois pour une petite boutique.

Ce que je peux faire pour vous : l'adapter à votre FAQ et à vos conditions, à vos couleurs et à votre site, et relier les transferts à votre messagerie ou à votre outil de support.

## Skills tags

n8n · AI Chatbot · Retrieval Augmented Generation (RAG) · Google Gemini API · Supabase · PostgreSQL · pgvector · React · TypeScript · Vite · Python · Prompt Engineering · Customer Support Automation · Workflow Automation · Docker

## Media to attach

1. Thumbnail: the chat panel open on the demo shop, showing an answer with its "Source" tag.
2. Demo video (2 min, script: [`video_script.md`](video_script.md)).
3. Screenshot: the escalation with the email field, next to the Supabase `escalations` table.
4. Screenshot: the n8n "Support chat" workflow.
5. Screenshot: the evaluation summary table ([`eval_report.md`](eval_report.md)).
