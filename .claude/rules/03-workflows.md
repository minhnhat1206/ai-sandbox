# Workflow authoring rule

A workflow is data (`WorkflowDef` in `shared/types.ts`), never custom React code.

- Catalog templates live in `shared/catalog/*.ts`, registered in `shared/catalog/index.ts`.
  Prospect-specific ones are stored on the workspace (`customWorkflows`) via the admin UI
  or the `/new-sandbox` skill.
- `id` is kebab-case and stable forever (runs reference it). Bump `version` on prompt changes.
- Every input has a realistic Vietnamese `sample` so a nervous first-time user can press
  "Use sample data" then "Run" without typing. Samples must pass `validateInputs`.
- `minutesSavedPerRun` is an honest estimate of human time saved; it feeds the
  "hours saved" metric we show prospects and ourselves. Do not inflate it.
- Prompts: system = role + company context (`{{company}}`, `{{brief}}`) + output rules
  (`OUTPUT_LANGUAGE`); user prompt = the inputs in triple quotes + the exact deliverable
  structure. Keep the stable text first (prompt-cache friendly), inputs last.
- If a workflow uses `{{knowledge}}` set `useKnowledge: true` and instruct the model to
  say "not in the documents" rather than invent policy.
- Icons must be in `shared/icons.ts` (whitelist keeps the bundle small).
- After editing, `npm run validate:catalog` and `npm run test` must pass; add a mock
  renderer in `server/providers/mock.ts` only when the generic one looks wrong in a demo.
