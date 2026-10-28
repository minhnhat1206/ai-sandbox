---
name: new-sandbox
description: Turn discovery-call notes about a prospect into a ready-to-share sandbox (workspace with brief, enabled workflows, knowledge documents, credits, custom workflow if needed) and return the invite link. Use after a sales call or when the founder says "tạo sandbox cho khách X".
---

# New prospect sandbox

Input: call notes, an email thread, or a short brief about the prospect.
Output: a live sandbox at `/s/<token>` plus a demo script.

## Steps
1. **Extract** from the notes: company, industry and size, contact, language (VI for
   Vietnamese teams, EN for overseas HQ), 3–5 concrete pains, any documents they
   mentioned (policies, price lists, FAQs). Do not invent facts; mark unknowns.
2. **Map pains → workflows** using the catalog (`npm run validate:catalog` prints the
   list; details in `shared/catalog/*.ts`). Rules of thumb:
   - slow customer replies → `customer-reply`, `company-assistant`
   - reporting burden → `weekly-report`, `meeting-actions`, `data-insight`
   - HR questions → `policy-assistant` (needs knowledge docs), `job-description`
   - sales/marketing → `sales-outreach`, `social-post`
   - admin/finance paperwork → `invoice-extract`, `translate-business`
   Pick 4–6; the gallery should feel built for them, not a catalog dump.
3. **Knowledge**: paste the documents the prospect shared (or a realistic placeholder
   clearly marked "SAMPLE – replace with real policy") so `policy-assistant` and
   `customer-reply` answer from "their" documents.
4. **Custom workflow** if a pain has no catalog match: write a brief and let the
   admin "Xây quy trình riêng" tab draft it, or write the JSON yourself per
   `.claude/rules/03-workflows.md`.
5. **Create it**. Write a JSON file in the scratchpad and run
   `npx tsx scripts/create-sandbox.ts <file.json>`. The script uses the admin API if the
   dev server is up (reads `ADMIN_TOKEN`/`PORT` from `.env`), otherwise writes the
   JSON store directly. Example payload:
   ```json
   {
     "company": "ABC Logistics", "industry": "3PL, 300 staff, Bình Dương", "language": "vi",
     "contactName": "Chị Hoa", "contactEmail": "hoa@abc.example", "credits": 60,
     "brief": "HQ in Japan pushes AI... pains: ...",
     "workflowIds": ["company-assistant", "customer-reply", "weekly-report", "policy-assistant"],
     "knowledge": [{ "title": "Chính sách giao hàng", "content": "..." }],
     "customWorkflows": [],
     "notes": "Discovery call 2026-11-03. Decision maker: GD. Budget: Zone B."
   }
   ```
6. **Verify**: open the link in the browser (or `curl /api/sandbox/<token>`), run one
   workflow with sample data, check the knowledge chat answers from the documents.
7. **Hand over**: the invite link, which workflows are on and why, the credit budget,
   and a 5-line demo script (use `/demo-script` for a full one).
