# AI Sandbox

No-account AI trial platform for our AI training & build consultancy (business plan:
`docs/AI_Enablement_Business_Plan.md`, product design: `docs/DESIGN.md`). Prospects open
an invite link, run workflows and chat agents **we** pre-built for them on **our**
Anthropic credits, rate the results, and book a call. The founder manages everything in
`/admin`.

## Commands
| Command | What |
|---|---|
| `npm run dev` | Vite + API on http://localhost:3000 (demo sandbox at `/s/demo`, admin at `/admin`, password = `ADMIN_TOKEN`, default `change-me`) |
| `npm run check:quick` | typecheck (web + server) and vitest |
| `npm run check` | + catalog validation + production build |
| `npm run smoke` | Playwright end-to-end run with screenshots in `e2e/screenshots/` |
| `npm run build && npm start` | production: Hono serves `dist/` + API on `PORT` |
| `npx tsx scripts/create-sandbox.ts payload.json` | create a prospect sandbox from JSON |

## Map
- `shared/` types (`types.ts`), workflow catalog (`catalog/`), template engine +
  validators (`engine/`), icon whitelist. Pure TS, used by both sides.
- `server/` Hono API `app.ts` (public `/api/sandbox/:token/*`, admin `/api/admin/*`),
  `runner.ts` (step execution + SSE events), `providers/` (`mock` = zero-key demo,
  `anthropic` = Claude via SDK with server-side refusal fallbacks), `store.ts` (JSON file
  `data/db.json`, seeded with the demo workspace), `config.ts` (.env loader).
- `src/` React app. `pages/sandbox/*` prospect flow, `pages/admin/*` founder console,
  `i18n/dict.ts` every UI string in VI + EN, `lib/api.ts` fetch + SSE client,
  `lib/markdown.tsx` safe renderer.
- `.claude/` rules (auto-loaded), skills (`/new-workflow`, `/new-sandbox`,
  `/demo-script`, `/tune-prompt`, `/release-check`), subagents, hooks (guards + checks).

## Conventions that bite
- Relative imports in `server/`, `shared/`, `tests/`, `scripts/` need the `.ts` extension.
- Everything must work with `AI_PROVIDER=mock` (no keys). Tests use the mock provider.
- New UI strings go in `src/i18n/dict.ts` with both `vi` and `en`.
- Workflows are data (`WorkflowDef`), validated by `npm run validate:catalog`.
- Model default `claude-opus-5-5`, effort `medium` (`.env`). One run = one credit.
- Never read/edit `.env` or `data/db.json` by hand (hooks block it).

## Definition of done
`npm run check` green, `npm run smoke` green, screenshots looked at, and the change
works in the browser with the mock provider.
