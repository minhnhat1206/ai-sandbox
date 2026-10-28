# Testing rule

| Level | Command | When |
|---|---|---|
| Typecheck both projects | `npm run typecheck` | after any `.ts/.tsx` edit (post-edit hook does it) |
| Catalog validation | `npm run validate:catalog` | after editing `shared/catalog/**` |
| Unit + API tests | `npm run test` | before every commit |
| Build | `npm run build` | before release |
| Browser smoke (Playwright) | `npm run smoke` | before release, after UI changes |
| Everything | `npm run check` then `npm run smoke` | the `/release-check` skill |

- API tests use `createApp()` with an in-memory `Store(null)` and `MockProvider(0)`.
  Add a test for every new route (happy path + one rejection).
- The smoke test boots its own Vite server on port 3123 with a temp `DATA_DIR`, so it
  never touches real prospect data. Add a step for every new prospect-facing screen.
- Never skip, disable or delete a failing test to get green. Fix the cause or ask.
- Screenshots land in `e2e/screenshots/` (gitignored). Look at them when a UI change
  is involved; `99-failure.png` is written on any exception.
