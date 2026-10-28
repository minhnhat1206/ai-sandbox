# Security and privacy rule

- The founder's `ANTHROPIC_API_KEY` and `ADMIN_TOKEN` live only in `.env` (gitignored).
  Never log them, never send them to the browser, never put them in a URL.
- Admin routes require `Authorization: Bearer <ADMIN_TOKEN>`. Public routes are keyed
  only by the invite token; they must never expose other prospects' runs, leads or
  workspace internals (`notes`, `contactEmail`, overrides). Use `publicView()`.
- Every request body field is length-limited and type-checked in `server/app.ts`.
  Keep it that way when adding fields (`str()`, `sanitizeInputs()`).
- Prospect inputs may contain personal data. Store only what the feature needs, and
  make sure the data-processing note in the UI stays true (`landing_trust_1`).
- Credits are deducted server-side before a run starts and refunded on provider error.
  Never trust a client-side credit count.
- Vietnam's personal data protection law (Decree 13 / Law 91/2025) and AI Law apply to
  our clients: do not add features that profile individuals or make automated decisions
  about people (hiring, credit, medical) without an explicit human-review step.
- The model output is rendered through our own Markdown renderer, which never injects
  HTML. Do not replace it with `dangerouslySetInnerHTML`.
