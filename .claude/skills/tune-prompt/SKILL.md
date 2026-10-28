---
name: tune-prompt
description: Improve a workflow's prompts using real run outputs and prospect ratings from the admin activity data. Use when a prospect rated a result poorly, when output ignores company documents, or when the founder says "kết quả chưa hay".
---

# Tune a workflow prompt

1. Gather evidence: in the admin console (or `GET /api/admin/workspaces/:id/runs`)
   collect 3–5 runs of the workflow with their inputs, outputs, ratings and feedback.
   Note the pattern: wrong language, invented policy, too long, missing a section,
   wrong tone, ignored an input.
2. Decide the scope:
   - one prospect only → edit the **override** in the admin "Quy trình" tab
     (`workspace.overrides[workflowId]`), leaving the catalog untouched;
   - everyone → edit the catalog file in `shared/catalog/` and bump `version`.
3. Change one thing at a time. Prefer adding a concrete output structure or a
   negative constraint ("never promise a delivery date not in the context") over
   adjectives ("be more professional").
4. Re-run with the same inputs (mock won't reflect prompt changes; use
   `AI_PROVIDER=anthropic` or reason carefully about the diff) and compare.
5. `npm run validate:catalog && npm run test`; keep the mock renderer consistent if the
   output structure changed.
6. Record what changed and why in the workflow's `notes`/commit message so the next
   tuning round has history.
