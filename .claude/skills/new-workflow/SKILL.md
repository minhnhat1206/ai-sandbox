---
name: new-workflow
description: Add a new bilingual workflow template to the catalog (shared/catalog) from a one-line idea or a prospect pain point. Use when the founder says "add a workflow for X", "khách muốn AI làm X", or when a sandbox needs a use case the catalog lacks.
---

# New catalog workflow

Goal: a `WorkflowDef` in `shared/catalog/<category>.ts`, registered in
`shared/catalog/index.ts`, that a nervous first-time user can run in two clicks.

## Steps
1. **Clarify the job** (ask only if truly unclear): who runs it, what they paste in,
   what they expect out, how long it takes them by hand today (`minutesSavedPerRun`).
2. **Pick kind**: `form` for input → deliverable; `chat` for open Q&A over documents.
   **Make it an agent** (`agent: { tools }`) whenever the job needs company data
   (`query_records`/`aggregate_records`), documents (`search_knowledge`), actions
   (`create_ticket`/`draft_email`), deliverables (`create_artifact`), web facts (`web_search`)
   or real office files (`skills: ['xlsx']`). Use `AGENT_RULES` from `shared/catalog/agents.ts`.
3. **Design inputs** (1–4): `textarea` for pasted content, `select` for tone/audience.
   Write a realistic Vietnamese `sample` for every input (a real-looking email, table,
   meeting note). Required fields only where the output is meaningless without them.
4. **Write prompts** following `.claude/rules/03-workflows.md`:
   - system: role + `COMPANY_CONTEXT` + (`KNOWLEDGE_BLOCK` if `useKnowledge`) + `OUTPUT_LANGUAGE`
   - prompt: inputs in triple quotes, then the exact deliverable structure (sections, tables).
   - Multi-step only when a later step genuinely needs the earlier output (e.g. JD → interview kit).
5. **Pick an icon** from `shared/icons.ts`; add one there if none fits (and to `src/components/Icon.tsx`).
6. **Register** in `CATALOG` (gallery order = most impressive first).
7. **Validate and test**: `npm run validate:catalog && npm run test`. The catalog test
   checks samples pass validation.
8. **Agent mock**: for an agent step, add a script in `server/providers/mock-agents.ts`
   that calls the real tools on the seed data and narrates in VI/EN; add a test in
   `tests/agents.test.ts`.
9. **Demo quality**: run it in the UI with the mock provider (`npm run dev`, open
   `/s/demo`, enable it in the admin "Quy trình" tab if needed). If the generic mock
   output looks wrong for a sales demo, add a renderer case in
   `server/providers/mock.ts` keyed `"<id>/<stepId>"`.
10. Report: id, category, inputs, minutes saved, and what the demo output looks like.

## Template
```ts
export const myWorkflow: WorkflowDef = {
  id: 'kebab-id', version: 1, kind: 'form', category: 'operations', icon: 'FileText',
  name: { vi: '', en: '' }, tagline: { vi: '', en: '' }, description: { vi: '', en: '' },
  tags: ['operations'], minutesSavedPerRun: 20,
  inputs: [{ key: 'content', label: { vi: '', en: '' }, type: 'textarea', required: true, rows: 8, sample: '...' }],
  steps: [{ id: 'main', title: { vi: '', en: '' },
    system: `You are ... ${COMPANY_CONTEXT}\n${OUTPUT_LANGUAGE}`,
    prompt: `Content:\n"""\n{{input.content}}\n"""\n\nProduce: 1) ..., 2) ...` }],
};
```
