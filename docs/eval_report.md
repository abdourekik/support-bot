# Evaluation report

Run `20261018210345` on 2026-10-18 21:11 UTC · 62 questions (47 answerable, 15 must escalate) · `python scripts/evaluate.py`

## Summary

| Metric | Result |
|---|---|
| Answerable: correct source file | 47/47 (100 %) |
| Answerable: all must_contain facts present | 47/47 (100 %) |
| Answerable: fully correct (source + facts, not escalated) | 47/47 (100 %) |
| Answerable: falsely escalated | 0/47 (0 %) |
| Escalation questions: correctly escalated | 15/15 (100 %) |
| Requests failed (no answer) | 0 |
| Latency median / max | 2.3 s / 8.7 s |

"All must_contain facts present" is strict: the answer must contain each key fact (case, spacing and `×`/`x` are ignored). A correct paraphrase counts as a miss.

## Escalation threshold

Best similarity of the retrieved chunks (logged as `confidence`). Current threshold: 0.6. Questions caught by a rule never reach the search, so only 4 of the 15 escalation questions have a value.

- Answerable questions: min 0.70, median 0.79, max 0.84
- Escalation questions that reached the search: 0.67, 0.68, 0.72, 0.76

| Threshold | Answerable questions below (would be escalated) | Escalation questions below (caught) |
|---|---|---|
| 0.50 | 0/47 | 0/4 |
| 0.55 | 0/47 | 0/4 |
| 0.60 | 0/47 | 0/4 |
| 0.65 | 0/47 | 0/4 |
| 0.70 | 0/47 | 2/4 |

## Failures

None.
## All results

| id | expected | escalated | sources | confidence | ok |
|---|---|---|---|---|---|
| q01 | commandes.md | False | commandes.md | 0.73 | ✅ |
| q02 | commandes.md | False | commandes.md | 0.79 | ✅ |
| q03 | commandes.md | False | commandes.md | 0.80 | ✅ |
| q04 | commandes.md | False | commandes.md | 0.79 | ✅ |
| q05 | commandes.md | False | commandes.md | 0.78 | ✅ |
| q06 | commandes.md | False | commandes.md | 0.81 | ✅ |
| q07 | commandes.md | False | commandes.md | 0.79 | ✅ |
| q08 | commandes.md | False | commandes.md | 0.80 | ✅ |
| q09 | commandes.md | False | livraison.md, commandes.md | 0.79 | ✅ |
| q10 | livraison.md | False | livraison.md, livraison.md | 0.73 | ✅ |
| q11 | livraison.md | False | livraison.md, livraison.md | 0.77 | ✅ |
| q12 | livraison.md | False | livraison.md | 0.78 | ✅ |
| q13 | livraison.md | False | livraison.md, commandes.md | 0.76 | ✅ |
| q14 | livraison.md | False | livraison.md | 0.78 | ✅ |
| q15 | livraison.md | False | livraison.md, commandes.md | 0.82 | ✅ |
| q16 | livraison.md | False | livraison.md | 0.80 | ✅ |
| q17 | livraison.md | False | livraison.md | 0.84 | ✅ |
| q18 | livraison.md | False | livraison.md | 0.81 | ✅ |
| q19 | retours-remboursements.md | False | retours-remboursements.md | 0.77 | ✅ |
| q20 | retours-remboursements.md | False | retours-remboursements.md | 0.83 | ✅ |
| q21 | retours-remboursements.md | False | retours-remboursements.md, retours-remboursements.md | 0.77 | ✅ |
| q22 | retours-remboursements.md | False | retours-remboursements.md | 0.76 | ✅ |
| q23 | retours-remboursements.md | False | retours-remboursements.md, retours-remboursements.md | 0.81 | ✅ |
| q24 | retours-remboursements.md | False | retours-remboursements.md | 0.81 | ✅ |
| q25 | paiement.md | False | paiement.md | 0.78 | ✅ |
| q26 | paiement.md | False | paiement.md | 0.76 | ✅ |
| q27 | paiement.md | False | paiement.md | 0.81 | ✅ |
| q28 | paiement.md | False | paiement.md | 0.79 | ✅ |
| q29 | factures.md | False | factures.md, factures.md | 0.80 | ✅ |
| q30 | factures.md | False | factures.md | 0.79 | ✅ |
| q31 | factures.md | False | factures.md | 0.84 | ✅ |
| q32 | factures.md | False | factures.md | 0.83 | ✅ |
| q33 | compte-client.md | False | compte-client.md | 0.81 | ✅ |
| q34 | compte-client.md | False | compte-client.md | 0.70 | ✅ |
| q35 | compte-client.md | False | compte-client.md | 0.78 | ✅ |
| q36 | compte-client.md | False | compte-client.md | 0.79 | ✅ |
| q37 | compte-client.md | False | compte-client.md | 0.77 | ✅ |
| q38 | compte-client.md | False | compte-client.md | 0.82 | ✅ |
| q39 | compte-client.md | False | compte-client.md | 0.79 | ✅ |
| q40 | newsletter.md | False | newsletter.md | 0.82 | ✅ |
| q41 | newsletter.md | False | newsletter.md | 0.82 | ✅ |
| q42 | reclamations.md | False | reclamations.md | 0.77 | ✅ |
| q43 | reclamations.md | False | reclamations.md | 0.82 | ✅ |
| q44 | contact.md | False | contact.md | 0.81 | ✅ |
| q45 | contact.md | False | contact.md | 0.71 | ✅ |
| q46 | produits-entretien.md | False | produits-entretien.md | 0.71 | ✅ |
| q47 | produits-entretien.md | False | produits-entretien.md | 0.79 | ✅ |
| e01 | escalate | True | - | - | ✅ |
| e02 | escalate | True | - | - | ✅ |
| e03 | escalate | True | - | - | ✅ |
| e04 | escalate | True | - | - | ✅ |
| e05 | escalate | True | - | - | ✅ |
| e06 | escalate | True | - | - | ✅ |
| e07 | escalate | True | - | - | ✅ |
| e08 | escalate | True | - | - | ✅ |
| e09 | escalate | True | - | 0.67 | ✅ |
| e10 | escalate | True | - | 0.68 | ✅ |
| e11 | escalate | True | - | - | ✅ |
| e12 | escalate | True | - | 0.76 | ✅ |
| e13 | escalate | True | - | 0.72 | ✅ |
| e14 | escalate | True | - | - | ✅ |
| e15 | escalate | True | - | - | ✅ |
