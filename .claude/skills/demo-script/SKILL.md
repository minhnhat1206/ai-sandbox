---
name: demo-script
description: Write a 15-minute live demo script for a specific prospect sandbox, in Vietnamese or English, mapped to their pains and ending with the Kickstart/Assessment offer. Use before a sales call or webinar.
---

# Demo script for a sandbox

1. Load the workspace: `curl -s localhost:3000/api/sandbox/<token>` (or read it via
   the admin API) to see the brief, enabled workflows and knowledge titles.
2. Order the demo by **pain severity**, not by catalog order. First workflow must be
   the one that makes the decision maker say "that's my Monday morning".
3. For each workflow (max 4): the pain in their words → what you type (use the sample
   data or, better, something they said on the call) → the one sentence to say while it
   streams → the "so what" (minutes saved × people × weeks).
4. Show the knowledge chat answering a policy question **and** refusing one that is
   not in the documents (builds trust: "it doesn't make things up").
5. Show "Kết quả của tôi" (hours saved) and explain that this is exactly how the
   90-day report will measure the real rollout.
6. Objection prep: "staff can use free ChatGPT" → policy + their documents + measurement;
   "we have an IT vendor" → we do people and integrations, they do licenses.
7. Close with the next step from the business plan: AI Kickstart (2-hour session) or a
   Readiness Assessment, with the founding-client discount in exchange for a case study.
8. Output format: numbered timeline with minute marks, speaker lines in the prospect's
   language, and a checklist of what to prepare (knowledge docs loaded, credits ≥ 20,
   ADMIN_TOKEN changed, provider = anthropic for the real call).
