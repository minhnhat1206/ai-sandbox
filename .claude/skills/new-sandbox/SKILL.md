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
2. **Map pains → workflows** (full list and rationale in `docs/USE-CASES.md`). Rules of thumb:
   - slow customer replies / Zalo overload → `order-care-agent`, `inbox-triage-agent`, `voc-insights-agent`
   - quotes take too long → `quote-builder-agent`, `pipeline-review-agent`, `meeting-prep-agent`
   - accounting by hand → `bank-recon-agent`, `receivables-agent`, `expense-audit-agent`, `excel-builder`
   - reporting burden → `weekly-ops-agent`, `monthly-review-deck`, `data-chat`
   - operations / purchasing → `inventory-agent`, `supplier-compare-agent`, `data-cleanup`
   - HR questions / new hires → `policy-helpdesk`, `onboarding-agent`
   - leadership unsure where to start, shadow AI, new laws → `ai-readiness-agent`, `ai-policy-agent`
     (these two ARE our Readiness Assessment and AI policy offers: always enable them)
   Pick 5–8; the gallery should feel built for them, not a catalog dump.
3. **Connected data**: we never ask for real data before signing. Generate synthetic data
   shaped like their company: add `"generateData": { "industry": "...", "notes": "<pains>",
   "headers": "Phiếu xuất kho: Số phiếu, Ngày xuất, Khách hàng, ..." , "presetKey"?: "packaging" }`
   to the payload (presets: fmcg, packaging, building, fnb, medical, garment, electronics,
   agrifood, trading). It creates the 11 canonical tables every agent needs, one extra table per
   header line in THEIR column names, 6 policy documents and sample inputs pointing at the new
   data. With real Claude, prefer the admin studio (Connected data → "Tạo dữ liệu theo ngành"):
   it also reads software screenshots and proposes custom customers/products. Real MCP servers
   go in `mcpServers` (admin tab "Kết nối MCP"); they only work with the real provider.
4. **Knowledge**: paste the documents the prospect shared (or a realistic placeholder
   clearly marked "SAMPLE – replace with real policy") so `policy-helpdesk`,
   `order-care-agent`, `quote-builder-agent` and `expense-audit-agent` answer from "their" documents.
5. **Custom workflow** if a pain has no catalog match: write a brief and let the
   admin "Xây quy trình riêng" tab draft it, or write the JSON yourself per
   `.claude/rules/03-workflows.md`.
6. **Create it**. Write a JSON file in the scratchpad and run
   `npx tsx scripts/create-sandbox.ts <file.json>`. The script uses the admin API if the
   dev server is up (reads `ADMIN_TOKEN`/`PORT` from `.env`), otherwise writes the
   JSON store directly. Example payload:
   ```json
   {
     "company": "ABC Logistics", "industry": "3PL, 300 staff, Bình Dương", "language": "vi",
     "contactName": "Chị Hoa", "contactEmail": "hoa@abc.example", "credits": 60, "budgetUsd": 10,
     "brief": "HQ in Japan pushes AI... pains: ...",
     "workflowIds": ["order-care-agent", "quote-builder-agent", "bank-recon-agent", "data-chat", "policy-helpdesk", "ai-readiness-agent"],
     "knowledge": [{ "title": "Chính sách giao hàng", "content": "..." }],
     "generateData": { "notes": "Công nợ nhà thầu kéo dài, báo giá thép mất cả ngày", "headers": "Phiếu giao hàng: Số phiếu, Ngày giao, Khách hàng, Sản phẩm, Số lượng, Đơn giá, Thành tiền" },
     "customWorkflows": [],
     "notes": "Discovery call 2026-11-03. Decision maker: GD. Budget: Zone B."
   }
   ```
7. **Verify**: open the link in the browser (or `curl /api/sandbox/<token>`), run one
   workflow with sample data, check the knowledge chat answers from the documents.
8. **After the trial**: admin → sandbox → "Báo cáo cho sếp" builds the decision-maker report
   from their runs; edit, publish, send the `/r/<token>` link and watch the view counter.
9. **Hand over**: the invite link, which workflows are on and why, the credit budget,
   and a 5-line demo script (use `/demo-script` for a full one).
