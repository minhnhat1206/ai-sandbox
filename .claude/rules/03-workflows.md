# Workflow authoring rule

A workflow is data (`WorkflowDef` in `shared/types.ts`), never custom React code.

**Every catalog workflow is an agent** (`tests/engine.test.ts` enforces it). Before adding
one, check it meets the five criteria in `docs/USE-CASES.md` (real data, an action, a
deliverable, measurable time saved, a role track or our own offer). Single-prompt helpers
that a free chatbot can do do not belong in the catalog.

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

## Agent steps (tools, artifacts, actions)
- A step becomes an agent with `agent: { tools: [...], skills?: [...], maxTurns? }`. Tools come
  from `server/tools/registry.ts`; never add a tool in a prompt that is not registered.
- Put `{{sources}}` in the agent system prompt (via `AGENT_RULES` in `shared/catalog/agents.ts`)
  so the model sees the connected tables and columns.
- Deliverables are published with `create_artifact` (html | table | markdown | csv | json), never
  pasted into the final answer. The final answer is a short summary + what needs a human.
- Actions (`create_ticket`, `draft_email`) are simulated: they land in the run's outbox. Never
  describe them to prospects as "sent".
- `web_search` and `skills` cannot be combined in one step (both need code execution).
- Chat workflows can be agents too: `chat.agent: { tools }` (see `data-chat`, `policy-helpdesk`).
- Every agent workflow needs a scripted mock in `server/providers/mock-agents.ts` (or
  `mock-agents-extra.ts`, helpers in `mock-kit.ts`) that runs
  the real tools on the demo data (`server/seed-data.ts`), so offline demos show real numbers.
  `tests/usecases.test.ts` runs every catalog workflow on the samples; add a figure-level
  assertion there for the numbers the demo relies on.
- File inputs (`type: 'file'`) must be optional and paired with a textarea sample.
- New data for the demo sandbox goes in `server/seed-data.ts` as CSV with lower-case
  identifier column names; keep figures consistent across tables (ids, names, amounts).
