# Project rules: AI Sandbox

This repo is the **no-account AI trial platform** for our AI adoption business
(see `docs/DESIGN.md` for product design, `CLAUDE.md` for the map).
Prospects open `/s/<token>`, run workflows and agents **we** built for them on
**our** API credits, then (hopefully) book a call.

## Architecture in one breath
- `shared/` pure TypeScript shared by browser and server: domain types, workflow
  catalog, template engine, validators. **No Node or DOM APIs here.**
- `server/` Hono API (`app.ts`), JSON store, providers (`mock`, `anthropic`), runner.
  Mounted inside Vite in dev (`vite-plugin.ts`), standalone in prod (`index.ts`).
- `src/` React 19 + react-router 7 + Tailwind 4. Pages under `pages/sandbox` (prospect)
  and `pages/admin` (founder). i18n in `src/i18n`.
- `tests/` vitest (engine, store, API with the mock provider). `e2e/smoke.mjs` Playwright.

## Non-negotiables
1. Everything must keep working with **zero API keys** (mock provider). Never make a
   feature that only works with `AI_PROVIDER=anthropic`.
2. Relative imports in `server/`, `shared/`, `tests/`, `scripts/` **must include the
   `.ts` extension** (Vite 8 loads the config natively).
3. Run `npm run check:quick` before claiming anything works; `npm run smoke` before a
   release. Do not describe tests you did not run.
4. Keep dependencies minimal. Prefer a 40-line helper over a new package.
5. Prospect data (`data/db.json`) and `.env` are never read, printed or edited by hand.
6. Vietnamese is the primary market: every new user-facing string needs `vi` and `en`
   (see `02-i18n.md`).
