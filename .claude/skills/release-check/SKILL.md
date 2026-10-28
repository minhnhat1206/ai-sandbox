---
name: release-check
description: Full pre-release verification of the AI Sandbox - typecheck, catalog validation, unit/API tests, production build, Playwright smoke test with screenshots, and a config sanity check. Use before deploying, before sharing a sandbox link with a real prospect, or when asked "is it ready?".
---

# Release check

Run in order; stop at the first failure and fix it (never skip or disable a test).

1. `npm run check` — typecheck (both tsconfigs), catalog validation, vitest, build.
2. `npm run smoke` — boots a throwaway dev server with the mock provider and drives
   the prospect + admin flows in Chromium. Read `e2e/screenshots/*.png` and look at at
   least `03-run-result.png`, `04-chat.png`, `06-admin-dashboard.png`.
3. Config sanity (do **not** print `.env`):
   - `grep -c '^ADMIN_TOKEN=change-me' .env` must be `0` before any link goes to a prospect.
   - `grep -E '^AI_PROVIDER=' .env` should be `anthropic` for real demos; `mock` is fine
     for internal testing. The admin sidebar shows the live provider.
   - `grep -E '^VITE_BRAND_NAME=' .env` is set to our actual company name.
4. If `AI_PROVIDER=anthropic`, run one real workflow in the browser and confirm the
   admin "Hoạt động" tab shows non-zero USD cost and the output is not marked demo.
5. Report a table: step, result, time; then any follow-ups. Say explicitly which steps
   were not run and why.
