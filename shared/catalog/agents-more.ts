import type { WorkflowDef } from '../types.ts';
import { KNOWLEDGE_BLOCK, OUTPUT_LANGUAGE } from './_shared.ts';
import { AGENT_RULES } from './agents.ts';

/**
 * Second wave of agent use cases. Chosen from the role tracks in the business plan
 * (sales, finance, HR, customer service, operations) and from our own offer
 * (AI readiness assessment, AI policy aligned with Vietnamese law).
 * Each one needs data + documents + actions + a deliverable, so it cannot be done
 * by pasting text into a free chatbot.
 */

const HUMAN_REVIEW = 'This output supports a human decision; never present it as a final decision about a person.';

/* ================================================================ SALES */

export const quoteBuilder: WorkflowDef = {
  id: 'quote-builder-agent',
  version: 1,
  kind: 'form',
  category: 'sales',
  icon: 'Tags',
  name: { vi: 'Agent lập báo giá từ yêu cầu khách', en: 'Quote builder agent' },
  tagline: { vi: 'Đọc yêu cầu, áp giá theo phân khúc, kiểm tồn kho và hạn mức nợ, xuất báo giá', en: 'Reads the request, prices by segment, checks stock and credit, issues the quote' },
  description: {
    vi: 'Dán email hoặc tin Zalo xin báo giá. Agent nhận diện khách, lấy giá đúng phân khúc trong bảng giá, áp chiết khấu theo chính sách, kiểm tra tồn kho từng mặt hàng và hạn mức tín dụng, rồi xuất báo giá in được và soạn email gửi khách. Vượt hạn mức thì tự tạo ticket xin duyệt.',
    en: 'Paste a quote request. The agent identifies the customer, prices each line by segment, applies the discount policy, checks stock and credit limit, then publishes a printable quote and drafts the email. Over the credit limit, it opens an approval ticket.',
  },
  tags: ['sales', 'agent', 'pricing'],
  minutesSavedPerRun: 40,
  useKnowledge: true,
  inputs: [
    { key: 'request', label: { vi: 'Yêu cầu báo giá của khách', en: 'Customer quote request' }, type: 'textarea', required: true, rows: 7,
      sample: `Chào anh Lan,
Siêu thị GreenMart cần báo giá cho đợt hàng Tết:
- 1200 thùng nước suối 500ml
- 600 thùng mì gói
- 300 bao gạo ST25 5kg
- 400 thùng nước ngọt lon
Giao trước 10/11 tại kho Thủ Đức. Nhờ anh báo giá tốt nhất trong tuần này.
Chị Ngọc – Phòng Mua hàng GreenMart` },
    { key: 'validity', label: { vi: 'Hiệu lực báo giá (ngày)', en: 'Quote validity (days)' }, type: 'number', sample: '15' },
  ],
  steps: [
    {
      id: 'quote',
      title: { vi: 'Agent lập báo giá', en: 'Agent builds the quote' },
      agent: { tools: ['query_records', 'aggregate_records', 'search_knowledge', 'calculate', 'create_ticket', 'draft_email', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `Quote request:
"""
{{input.request}}
"""
Validity: {{input.validity}} days.

Tasks: identify the customer in "customers" (segment, credit_limit, account manager); match every requested item to a SKU in "price_list" and use the price column for the customer's segment; check "inventory" availability (on_hand - reserved) per line and flag shortfalls with a realistic delivery date (lead_time_days); read the pricing policy and apply the correct order-value discount; compute subtotal, discount, VAT 8% and total with calculate; check open balance in "receivables" plus this order against the credit limit and any invoice > 30 days overdue; if the policy requires approval, create_ticket for the approver; publish an HTML artifact "Quotation" (printable, company header, customer block, line table, totals, validity, terms) and a table artifact "Quote lines"; draft the email to the customer; final answer: total, margin of safety on stock, and any approval needed.`,
    },
  ],
};

export const pipelineReview: WorkflowDef = {
  id: 'pipeline-review-agent',
  version: 1,
  kind: 'form',
  category: 'sales',
  icon: 'Funnel',
  name: { vi: 'Agent rà soát pipeline bán hàng', en: 'Sales pipeline review agent' },
  tagline: { vi: 'Tìm cơ hội bị bỏ quên, dự báo doanh số, giao việc follow-up cho từng sales', en: 'Finds stalled deals, forecasts revenue, assigns follow-ups per rep' },
  description: {
    vi: 'Trước buổi họp sales thứ Hai: agent đọc pipeline, tính doanh số dự báo có trọng số, phát hiện cơ hội không có hoạt động quá 14 ngày hoặc đã quá ngày dự kiến chốt, đối chiếu công nợ của khách, tạo việc cho từng người phụ trách và soạn email follow-up. Kết quả là dashboard pipeline và danh sách việc.',
    en: 'Before Monday sales meeting: the agent reads the pipeline, computes the weighted forecast, flags deals idle for 14+ days or past their close date, checks the customer’s debt, assigns tasks per rep and drafts follow-up emails. Output: a pipeline dashboard and a task list.',
  },
  tags: ['sales', 'management', 'agent', 'dashboard'],
  minutesSavedPerRun: 75,
  inputs: [
    { key: 'idle_days', label: { vi: 'Coi là "nguội" sau bao nhiêu ngày không hoạt động', en: 'Treat as stalled after how many idle days' }, type: 'number', sample: '14' },
    { key: 'target', label: { vi: 'Chỉ tiêu doanh số quý (VND)', en: 'Quarter revenue target (VND)' }, type: 'number', sample: '1500000000' },
  ],
  steps: [
    {
      id: 'review',
      title: { vi: 'Agent rà soát', en: 'Agent reviews' },
      agent: { tools: ['query_records', 'aggregate_records', 'calculate', 'create_ticket', 'draft_email', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${OUTPUT_LANGUAGE}`,
      prompt: `Idle threshold: {{input.idle_days}} days. Quarter target: {{input.target}} VND. Today is 2026-10-28.

Tasks: aggregate "deals" by stage (count, value) and by owner; compute weighted pipeline = value × probability / 100 for open deals; list stalled deals (last_activity older than the threshold) and slipped deals (expected_close before today, not won/lost); cross-check each stalled customer in "receivables" for overdue debt; compute coverage = weighted pipeline / (target - won); create one follow-up ticket per stalled/slipped deal assigned to its owner; draft follow-up emails for the 3 largest stalled deals; publish an HTML artifact "Pipeline dashboard" (KPI tiles, inline SVG bar chart by stage, table of at-risk deals) and a table artifact "Follow-up tasks"; final answer: forecast vs target and the 3 deals to discuss first.`,
    },
  ],
};

/* ============================================================ CUSTOMERS */

export const inboxTriage: WorkflowDef = {
  id: 'inbox-triage-agent',
  version: 1,
  kind: 'form',
  category: 'customer-service',
  icon: 'Inbox',
  name: { vi: 'Agent phân loại hộp thư Zalo/email', en: 'Inbox triage agent' },
  tagline: { vi: 'Đọc cả loạt tin nhắn, tra đơn hàng và công nợ, soạn trả lời, mở ticket việc gấp', en: 'Reads a batch of messages, checks orders and debt, drafts replies, opens tickets' },
  description: {
    vi: 'Dán cả buổi sáng tin nhắn từ Zalo OA và email. Agent phân loại từng tin (khiếu nại, đặt hàng, thanh toán, hỏi giá, rác), tra đơn và công nợ liên quan, xếp mức ưu tiên, soạn sẵn câu trả lời cho từng tin và mở ticket cho việc cần người xử lý. Nhân viên chỉ việc duyệt.',
    en: 'Paste a morning’s worth of Zalo OA and email messages. The agent classifies each (complaint, order, payment, price question, spam), looks up related orders and debt, sets priority, drafts a reply for each and opens tickets for what needs a human. Staff just approve.',
  },
  tags: ['customer-service', 'sales', 'agent'],
  minutesSavedPerRun: 60,
  useKnowledge: true,
  inputs: [
    { key: 'messages', label: { vi: 'Tin nhắn (ngăn cách bằng ---)', en: 'Messages (separated by ---)' }, type: 'textarea', required: true, rows: 12,
      sample: `Từ: Chị Sen – Nhà hàng Sen Vàng (Zalo)
Đơn 48213 vẫn chưa thấy đâu, cuối tuần có tiệc, giao không kịp thì huỷ giúp chị.
---
Từ: Anh Khoa – Chuỗi tiện lợi 24h (email)
Bên anh muốn đặt thêm 500 thùng nước suối giao thứ Sáu này, xác nhận giúp anh.
---
Từ: Kế toán Đại lý Phú Quý (email)
Chúng tôi đã chuyển 20 triệu hôm 23/10, nhờ bên chị đối chiếu và gửi lại công nợ.
---
Từ: Mr. Tanaka – Khách sạn Riverside (email)
Could you send me the price for 200 bags of ST25 rice for December?
---
Từ: Số lạ (Zalo)
Chúc mừng bạn trúng thưởng iPhone, bấm link để nhận quà!!!
---
Từ: Anh Bảy – Tạp hoá Anh Bảy (Zalo)
Nước mắm lô trước có 2 chai rò rỉ, đổi giúp anh nhé.` },
  ],
  steps: [
    {
      id: 'triage',
      title: { vi: 'Agent phân loại & xử lý', en: 'Agent triages' },
      agent: { tools: ['query_records', 'search_knowledge', 'create_ticket', 'draft_email', 'create_artifact'], maxTurns: 12 },
      system: `${AGENT_RULES}\nReply to each customer in the language they wrote in. Never click or repeat links from suspicious messages.\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `Messages:
"""
{{input.messages}}
"""

Tasks: for each message: identify sender and customer record; classify (complaint, order, payment, price_request, spam, other); look up related orders/receivables/inventory/price_list; set priority (urgent/high/normal/ignore) with a one-line reason; draft the reply (draft_email) unless spam; create a ticket when a human must act (delivery, refund, reconciliation, stock reservation); publish a table artifact "Triage board" (#, sender, customer, type, priority, facts found, action taken, ticket/draft id); final answer: what needs attention in the next hour.`,
    },
  ],
};

export const vocInsights: WorkflowDef = {
  id: 'voc-insights-agent',
  version: 1,
  kind: 'form',
  category: 'marketing',
  icon: 'Megaphone',
  name: { vi: 'Agent phân tích phản hồi khách hàng', en: 'Customer feedback insights agent' },
  tagline: { vi: 'Gom đánh giá Google/Zalo/Shopee và ticket, tìm nguyên nhân gốc, đề xuất hành động', en: 'Combines reviews and tickets, finds root causes, proposes actions' },
  description: {
    vi: 'Agent đọc toàn bộ đánh giá trên Google, Zalo, Facebook, Shopee cùng ticket CSKH trong tháng, phân nhóm chủ đề, đo điểm trung bình theo kênh và sản phẩm, nối từng phàn nàn với đơn hàng thật để tìm nguyên nhân gốc (đơn vị vận chuyển, đóng gói…), mở ticket cho 2 vấn đề lớn nhất và soạn phản hồi công khai cho các đánh giá 1–2 sao.',
    en: 'The agent reads every review on Google, Zalo, Facebook and Shopee plus the month’s support tickets, groups them by theme, scores by channel and product, links complaints to real orders to find root causes (carrier, packaging…), opens tickets for the two biggest issues and drafts public replies to 1–2 star reviews.',
  },
  tags: ['marketing', 'customer-service', 'agent', 'dashboard'],
  minutesSavedPerRun: 90,
  inputs: [
    { key: 'period', label: { vi: 'Kỳ phân tích', en: 'Period' }, type: 'text', sample: 'Tháng 10/2026' },
  ],
  steps: [
    {
      id: 'insights',
      title: { vi: 'Agent phân tích', en: 'Agent analyses' },
      agent: { tools: ['query_records', 'aggregate_records', 'calculate', 'create_ticket', 'draft_email', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${OUTPUT_LANGUAGE}`,
      prompt: `Period: {{input.period}}.

Tasks: read all "reviews" and "tickets"; tag each review with themes (delivery, packaging, quality, price, invoice, service, praise) and sentiment; aggregate average rating by source and by product; for delivery complaints join the order_id to "orders" to find the carrier and the delay in days; quantify each theme (count, share, avg rating); open tickets for the two biggest fixable issues with evidence; draft public replies for every 1–2 star review (polite, specific, no promises outside policy); publish an HTML artifact "Voice of customer" (KPI tiles, inline SVG bars by theme, table of root causes with order ids) and a table artifact "Tagged reviews"; final answer: the 3 insights leadership should act on.`,
    },
  ],
};

/* ============================================================== FINANCE */

export const bankRecon: WorkflowDef = {
  id: 'bank-recon-agent',
  version: 1,
  kind: 'form',
  category: 'finance',
  icon: 'Landmark',
  name: { vi: 'Agent đối soát sao kê ngân hàng', en: 'Bank reconciliation agent' },
  tagline: { vi: 'Khớp từng giao dịch với hoá đơn, phát hiện trả trùng, đề xuất bút toán', en: 'Matches each transaction to invoices, catches duplicates, proposes entries' },
  description: {
    vi: 'Việc mỗi sáng của kế toán: agent đọc sao kê, khớp từng khoản tiền vào với hoá đơn công nợ theo số hoá đơn, tên khách và số tiền (kể cả nội dung chuyển khoản không dấu, viết tắt), phát hiện khách trả trùng hoặc trả thiếu, phân loại tiền ra, đề xuất bút toán để nhập MISA và soạn email xác nhận cho khách.',
    en: 'The accountant’s morning job: the agent reads the bank statement, matches each receipt to open invoices by invoice number, customer name and amount (even unaccented or abbreviated memos), flags duplicate or partial payments, classifies outgoing items, proposes journal entries for the accounting system and drafts confirmations to customers.',
  },
  tags: ['finance', 'agent'],
  minutesSavedPerRun: 80,
  inputs: [
    { key: 'statement', label: { vi: 'Sao kê (CSV, tuỳ chọn)', en: 'Statement (CSV, optional)' }, type: 'file', accept: '.csv,.txt', sample: '', help: { vi: 'Bỏ trống để dùng sao kê đã kết nối (bank_transactions).', en: 'Leave empty to use the connected statement (bank_transactions).' } },
    { key: 'tolerance', label: { vi: 'Sai lệch chấp nhận khi khớp (VND)', en: 'Matching tolerance (VND)' }, type: 'number', sample: '1000' },
  ],
  steps: [
    {
      id: 'reconcile',
      title: { vi: 'Agent đối soát', en: 'Agent reconciles' },
      agent: { tools: ['query_records', 'aggregate_records', 'calculate', 'create_ticket', 'draft_email', 'create_artifact'], maxTurns: 12 },
      system: `${AGENT_RULES}\nYou are a careful accounts-receivable accountant in Vietnam. Bank memos are often unaccented, abbreviated or missing the invoice number.\n${OUTPUT_LANGUAGE}`,
      prompt: `Tolerance: {{input.tolerance}} VND. Statement: {{input.statement}} (if no file, use "bank_transactions").

Tasks: for each credit, match to "receivables" by invoice number in the memo (normalise INV2625 → INV-2625), else by customer name (accent-insensitive) and amount within tolerance; classify as matched, partial (amount < balance), overpaid/duplicate (invoice already matched), ambiguous (several candidates) or unidentified; classify debits (bank fee, supplier payment, other) and interest; propose journal entries (Nợ 112 / Có 131 per customer, Nợ 6425 / Có 112 for fees, Có 515 for interest, Nợ 331 / Có 112 for suppliers); open tickets for duplicate, ambiguous and unidentified items; draft confirmation emails for partial and duplicate payments; publish a table artifact "Reconciliation" and a CSV artifact "journal_entries.csv"; final answer: matched amount, open exceptions and what the accountant must decide.`,
    },
  ],
};

export const expenseAudit: WorkflowDef = {
  id: 'expense-audit-agent',
  version: 1,
  kind: 'form',
  category: 'finance',
  icon: 'Wallet',
  name: { vi: 'Agent kiểm tra đề nghị thanh toán chi phí', en: 'Expense claim audit agent' },
  tagline: { vi: 'Đối chiếu từng khoản với quy định, phát hiện trùng, thiếu hoá đơn, vượt định mức', en: 'Checks every claim against policy: duplicates, missing invoices, over limits' },
  description: {
    vi: 'Agent đọc đề nghị thanh toán trong tháng, áp từng điều của quy định chi phí (định mức taxi, khách sạn, tiếp khách, công tác phí, hoá đơn điện tử, hạn nộp 30 ngày), tìm khoản trùng lặp, tính số tiền được duyệt và cần bổ sung, soạn email cho từng người cần bổ sung chứng từ. Kế toán chỉ duyệt ngoại lệ, không phải soát từng dòng.',
    en: 'The agent reads the month’s expense claims, applies each rule of the expense policy (taxi, hotel, entertainment, per diem, e-invoice, 30-day deadline), finds duplicates, computes approvable vs pending amounts and drafts an email to each claimant who must add documents. Accounting reviews exceptions only.',
  },
  tags: ['finance', 'hr', 'agent'],
  minutesSavedPerRun: 70,
  useKnowledge: true,
  inputs: [
    { key: 'month', label: { vi: 'Tháng', en: 'Month' }, type: 'text', sample: '10/2026' },
  ],
  steps: [
    {
      id: 'audit',
      title: { vi: 'Agent kiểm tra', en: 'Agent audits' },
      agent: { tools: ['query_records', 'aggregate_records', 'search_knowledge', 'calculate', 'draft_email', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${HUMAN_REVIEW}\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `Month: {{input.month}}.

Tasks: read the expense policy; read every claim in "expenses"; for each claim check: per-unit limits (taxi per trip, hotel per night = amount / nights, entertainment per person = amount / pax, per diem per day), invoice required (amount >= 200,000 except per diem), submission within 30 days, duplicates (same employee, date, amount, category), wrong channel (software/equipment); compute approvable amount and amount on hold per claim; aggregate by department; publish a table artifact "Claim review" (claim, employee, amount, issues, approvable, on hold) and an HTML artifact "Expense summary" (KPI tiles, totals by department, list of exceptions); draft one email per employee with issues, listing exactly what to fix; final answer: total claimed vs approvable and the exceptions needing a manager.`,
    },
  ],
};

/* =========================================================== OPERATIONS */

export const supplierCompare: WorkflowDef = {
  id: 'supplier-compare-agent',
  version: 1,
  kind: 'form',
  category: 'operations',
  icon: 'ShoppingCart',
  name: { vi: 'Agent so sánh báo giá nhà cung cấp', en: 'Supplier quote comparison agent' },
  tagline: { vi: 'Đọc 3 báo giá khác định dạng, quy về tổng chi phí thật, đề xuất và soạn PO', en: 'Reads three differently formatted quotes, compares true total cost, drafts the PO' },
  description: {
    vi: 'Dán (hoặc tải PDF) các báo giá. Agent trích đơn giá, số lượng tối thiểu, phí vận chuyển, thời gian giao, điều khoản thanh toán; quy đổi về tổng chi phí cho đúng số lượng bạn cần; so với tồn kho và tốc độ bán để xem có kịp hàng không; chấm điểm, đề xuất nhà cung cấp và soạn email đặt hàng.',
    en: 'Paste (or upload PDF) supplier quotes. The agent extracts unit price, MOQ, freight, lead time and payment terms; converts to total landed cost for your quantity; checks stock and sales velocity to see if delivery is in time; scores, recommends and drafts the purchase order email.',
  },
  tags: ['operations', 'finance', 'agent'],
  minutesSavedPerRun: 50,
  inputs: [
    { key: 'need', label: { vi: 'Nhu cầu mua', en: 'What you need' }, type: 'text', required: true, sample: 'Gạo ST25 5kg, 600 bao, cần về kho trước 05/11' },
    { key: 'file', label: { vi: 'Báo giá (PDF/ảnh, tuỳ chọn)', en: 'Quotes (PDF/image, optional)' }, type: 'file', accept: '.pdf,.png,.jpg,.jpeg,.txt', sample: '' },
    { key: 'quotes', label: { vi: 'Hoặc dán nội dung báo giá', en: 'Or paste the quotes' }, type: 'textarea', rows: 10,
      sample: `NCC 1 – Nông sản Sóc Trăng: đơn giá 118.000đ/bao, tối thiểu 500 bao, giao 5 ngày, phí vận chuyển 2.500.000đ, thanh toán 30 ngày.
NCC 2 – Gạo Mekong Xanh: đơn giá 112.000đ/bao, tối thiểu 1.000 bao, giao 9 ngày, miễn phí vận chuyển, thanh toán trước 50%.
NCC 3 – Hợp tác xã Lúa Thơm: đơn giá 121.000đ/bao, tối thiểu 200 bao, giao 3 ngày, phí vận chuyển 1.200.000đ, thanh toán 45 ngày.` },
  ],
  steps: [
    {
      id: 'compare',
      title: { vi: 'Agent so sánh', en: 'Agent compares' },
      agent: { tools: ['query_records', 'calculate', 'draft_email', 'create_artifact'], maxTurns: 8 },
      system: `${AGENT_RULES}\n${OUTPUT_LANGUAGE}`,
      prompt: `Need: {{input.need}}
Quotes (pasted, if any):
"""
{{input.quotes}}
"""
If a file is attached, it contains the quotes.

Tasks: extract each supplier's unit price, MOQ, lead time, freight, payment terms; compute order quantity = max(need, MOQ) and total landed cost = qty × price + freight, plus cost per unit actually needed; check "inventory" for the product (available, avg_daily_sales) and compute whether each lead time arrives before stock-out; score suppliers (cost 50%, on-time 30%, payment terms 20%) and recommend one, with a fallback; publish a table artifact "Supplier comparison" and a markdown artifact "Recommendation"; draft the purchase order email to the recommended supplier; final answer: recommendation, savings vs the next best option and any risk.`,
    },
  ],
};

export const monthlyDeck: WorkflowDef = {
  id: 'monthly-review-deck',
  version: 1,
  kind: 'form',
  category: 'management',
  icon: 'Presentation',
  name: { vi: 'Bộ slide họp giao ban tháng', en: 'Monthly business review deck' },
  tagline: { vi: 'Tự gom số từ bán hàng, công nợ, kho, CSKH thành bộ slide cho ban giám đốc', en: 'Pulls sales, receivables, stock and service numbers into a leadership deck' },
  description: {
    vi: 'Agent tổng hợp số liệu từ mọi hệ thống đã kết nối, viết nhận định cho từng mảng và dựng bộ slide họp tháng: doanh thu, giao hàng, công nợ, tồn kho, khách hàng, pipeline, quyết định cần thông qua. Với Claude thật, kỹ năng PowerPoint xuất file .pptx tải về được; ở chế độ demo là bộ slide HTML.',
    en: 'The agent compiles numbers from every connected system, writes the commentary per area and builds the monthly review deck: revenue, delivery, receivables, stock, customers, pipeline and decisions needed. With real Claude, the PowerPoint skill produces a downloadable .pptx; in demo mode it is an HTML deck.',
  },
  tags: ['management', 'agent', 'skills'],
  minutesSavedPerRun: 180,
  inputs: [
    { key: 'month', label: { vi: 'Tháng', en: 'Month' }, type: 'text', sample: 'Tháng 10/2026' },
    { key: 'audience', label: { vi: 'Người nghe', en: 'Audience' }, type: 'select', sample: 'board', options: [{ value: 'board', label: { vi: 'Ban giám đốc', en: 'Leadership team' } }, { value: 'hq', label: { vi: 'Tập đoàn / trụ sở nước ngoài (tiếng Anh)', en: 'Group HQ (English)' } }] },
  ],
  steps: [
    {
      id: 'deck',
      title: { vi: 'Agent dựng slide', en: 'Agent builds the deck' },
      agent: { tools: ['query_records', 'aggregate_records', 'calculate', 'create_artifact'], skills: ['pptx'], maxTurns: 12 },
      system: `${AGENT_RULES}\nWhen the pptx skill is available, build a real 8–10 slide deck (title, one message per slide, charts from the numbers, speaker notes) and save it as a file; also publish an HTML version with create_artifact. If the audience is "hq", write the deck in English.\n${OUTPUT_LANGUAGE}`,
      prompt: `Month: {{input.month}}. Audience: {{input.audience}}.

Slides: 1 title; 2 headline (3 numbers + 1 sentence); 3 revenue by region and segment; 4 on-time delivery and carrier performance; 5 receivables ageing and top overdue; 6 stock risk; 7 customer feedback themes; 8 pipeline and forecast; 9 decisions needed (max 3, each with cost and owner). Compute every number with the tools. Final answer: the headline slide text.`,
    },
  ],
};

/* ================================================================== HR */

export const onboardingAgent: WorkflowDef = {
  id: 'onboarding-agent',
  version: 1,
  kind: 'form',
  category: 'hr',
  icon: 'GraduationCap',
  name: { vi: 'Agent chuẩn bị đón nhân viên mới', en: 'New hire onboarding agent' },
  tagline: { vi: 'Từ 1 dòng thông tin: checklist có hạn, ticket cho IT/Hành chính, email chào mừng, kế hoạch 30-60-90', en: 'From one line: dated checklist, IT/admin tickets, welcome email, 30-60-90 plan' },
  description: {
    vi: 'Nhập tên, vị trí và ngày bắt đầu. Agent đọc quy trình tiếp nhận của công ty, tính hạn cho từng việc theo ngày làm việc, mở ticket cho IT (tài khoản, laptop), Hành chính (thẻ, chỗ ngồi) và Nhân sự (hợp đồng, BHXH), soạn email chào mừng gửi nhân viên mới và email nhờ quản lý chọn người hướng dẫn, kèm kế hoạch 30-60-90 ngày theo vị trí.',
    en: 'Enter name, role and start date. The agent reads the company onboarding procedure, computes working-day deadlines, opens tickets for IT (accounts, laptop), Admin (badge, desk) and HR (contract, social insurance), drafts the welcome email and the buddy request to the manager, plus a 30-60-90 day plan for the role.',
  },
  tags: ['hr', 'agent'],
  minutesSavedPerRun: 55,
  useKnowledge: true,
  inputs: [
    { key: 'name', label: { vi: 'Họ tên', en: 'Full name' }, type: 'text', required: true, sample: 'Phan Thị Hạnh' },
    { key: 'role', label: { vi: 'Vị trí', en: 'Role' }, type: 'text', required: true, sample: 'Chuyên viên Chăm sóc khách hàng (tiếng Anh)' },
    { key: 'department', label: { vi: 'Phòng ban', en: 'Department' }, type: 'text', sample: 'CSKH' },
    { key: 'start', label: { vi: 'Ngày bắt đầu (yyyy-mm-dd)', en: 'Start date (yyyy-mm-dd)' }, type: 'text', sample: '2026-11-09' },
    { key: 'manager', label: { vi: 'Quản lý trực tiếp', en: 'Line manager' }, type: 'text', sample: 'Lê Thu – Trưởng nhóm CSKH' },
  ],
  steps: [
    {
      id: 'onboard',
      title: { vi: 'Agent chuẩn bị', en: 'Agent prepares' },
      agent: { tools: ['search_knowledge', 'calculate', 'create_ticket', 'draft_email', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `New hire: {{input.name}}, role {{input.role}}, department {{input.department}}, start {{input.start}}, manager {{input.manager}}.

Tasks: read the onboarding procedure, security rules and leave policy; compute working-day deadlines relative to the start date; create tickets for IT, Admin and HR with due dates and exact items; draft the welcome email to the new hire (what to bring, first-day schedule, documents) and an email to the manager asking for a buddy and first-week tasks; publish a table artifact "Onboarding checklist" (task, owner, due date, status) and a markdown artifact "30-60-90 plan" tailored to the role; final answer: what is due before day one and who owns it.`,
    },
  ],
};

/* ====================================================== AI ADOPTION (our offer) */

export const aiReadiness: WorkflowDef = {
  id: 'ai-readiness-agent',
  version: 1,
  kind: 'form',
  category: 'management',
  icon: 'Radar',
  name: { vi: 'Đánh giá mức sẵn sàng AI của công ty', en: 'Company AI readiness assessment' },
  tagline: { vi: 'Từ khảo sát nội bộ: bảng điểm 5 trụ cột, rủi ro "AI chui", số giờ có thể tiết kiệm', en: 'From the staff survey: 5-pillar scorecard, shadow-AI risk, hours that could be saved' },
  description: {
    vi: 'Agent đọc kết quả khảo sát sử dụng AI của nhân viên, đo mức sử dụng theo phòng ban, tỷ lệ dùng tài khoản cá nhân và đưa dữ liệu khách hàng/tài chính vào AI (rủi ro theo Luật Bảo vệ dữ liệu cá nhân), tỷ lệ được đào tạo và số giờ việc lặp lại mỗi tuần, rồi chấm điểm 5 trụ cột, ước tính giờ tiết kiệm và đề xuất lộ trình 90 ngày.',
    en: 'The agent reads the staff AI-usage survey, measures usage by department, the share using personal accounts and pasting customer/financial data into AI (a data-protection risk), training coverage and weekly repetitive hours, then scores 5 pillars, estimates hours saved and proposes a 90-day roadmap.',
  },
  tags: ['management', 'agent', 'dashboard'],
  minutesSavedPerRun: 240,
  useKnowledge: true,
  inputs: [
    { key: 'goal', label: { vi: 'Mục tiêu của ban giám đốc', en: 'Leadership goal' }, type: 'text', sample: 'Dùng AI an toàn, đúng luật và giảm 20% thời gian việc giấy tờ trong 2027' },
    { key: 'automation', label: { vi: 'Tỷ lệ việc lặp lại AI có thể làm (ước tính, %)', en: 'Share of repetitive work AI can take (estimate, %)' }, type: 'number', sample: '30' },
  ],
  steps: [
    {
      id: 'assess',
      title: { vi: 'Agent đánh giá', en: 'Agent assesses' },
      agent: { tools: ['query_records', 'aggregate_records', 'search_knowledge', 'calculate', 'create_artifact'], maxTurns: 12 },
      system: `${AGENT_RULES}\nYou are an AI adoption consultant. Vietnam's AI Law (in force 1 March 2026) and the Personal Data Protection Law (in force 1 January 2026) apply; mention them as context, not as legal advice.\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `Leadership goal: {{input.goal}}. Automatable share of repetitive work: {{input.automation}}%.

Tasks: from "ai_survey" compute overall and per-department: adoption rate, daily users, personal-account share, share sharing customer/financial/employee data, training coverage, repetitive hours per week; compute potential hours saved per month = repetitive hours × automatable share × 4.3; read the security rules to see if an approved tool list exists; score 5 pillars 1–5 (Usage, Skills, Governance, Data safety, Opportunity) with a one-line justification each; publish an HTML artifact "AI readiness scorecard" (pillar scores, inline SVG bars of adoption by department, risk table, hours opportunity) and a markdown artifact "90-day roadmap" (weeks 1–2 policy and approved tools, 3–6 team training on real tasks, 4–12 builds connected to systems, day 90 measurement); final answer: overall score, the biggest risk and the biggest opportunity in numbers.`,
    },
  ],
};

export const aiPolicy: WorkflowDef = {
  id: 'ai-policy-agent',
  version: 1,
  kind: 'form',
  category: 'management',
  icon: 'Scale',
  name: { vi: 'Soạn quy định sử dụng AI cho công ty', en: 'Draft the company AI use policy' },
  tagline: { vi: 'Dựa trên cách nhân viên đang dùng AI và quy định bảo mật, theo Luật AI & Luật BVDLCN', en: 'Based on how staff use AI today and your security rules, aligned with VN AI and data laws' },
  description: {
    vi: 'Agent đọc khảo sát sử dụng AI và quy định bảo mật hiện có, rồi soạn bản dự thảo quy định sử dụng AI: phạm vi, công cụ được phép, dữ liệu cấm đưa vào AI, gắn nhãn nội dung AI, trách nhiệm từng vai trò, xử lý vi phạm; kèm danh sách công cụ đề xuất phê duyệt và hướng dẫn 1 trang cho nhân viên. Với Claude thật, kỹ năng Word xuất file .docx. Cần luật sư rà soát trước khi ban hành.',
    en: 'The agent reads the AI-usage survey and existing security rules, then drafts the AI use policy: scope, approved tools, data that must never go into AI, labelling AI content, responsibilities, violations; plus a proposed approved-tool list and a one-page staff guide. With real Claude, the Word skill produces a .docx. Needs legal review before adoption.',
  },
  tags: ['management', 'hr', 'agent', 'skills'],
  minutesSavedPerRun: 300,
  useKnowledge: true,
  inputs: [
    { key: 'company_type', label: { vi: 'Loại hình công ty', en: 'Company type' }, type: 'select', sample: 'fdi', options: [{ value: 'fdi', label: { vi: 'Công ty vốn nước ngoài (FDI)', en: 'Foreign-owned (FDI)' } }, { value: 'local', label: { vi: 'Công ty trong nước', en: 'Domestic company' } }, { value: 'outsourcing', label: { vi: 'Gia công / outsourcing cho khách nước ngoài', en: 'Outsourcing for overseas clients' } }] },
    { key: 'tools', label: { vi: 'Công cụ công ty định cấp tài khoản', en: 'Tools the company plans to license' }, type: 'text', sample: 'Microsoft Copilot (M365), Claude Team' },
  ],
  steps: [
    {
      id: 'policy',
      title: { vi: 'Agent soạn quy định', en: 'Agent drafts the policy' },
      agent: { tools: ['query_records', 'aggregate_records', 'search_knowledge', 'create_artifact'], skills: ['docx'], maxTurns: 10 },
      system: `${AGENT_RULES}\nYou draft internal policies for companies in Vietnam. Reference the AI Law (Law 134/2025, effective 1 March 2026: risk-based duties, labelling of AI-generated content) and the Personal Data Protection Law (Law 91/2025, effective 1 January 2026) at the level of principles; mark the draft "requires legal review". When the docx skill is available, produce the policy as a Word file as well.\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `Company type: {{input.company_type}}. Tools to license: {{input.tools}}.

Tasks: from "ai_survey" list the tools staff use today, account types and the data they put into AI (with counts); read the security rules; draft the policy (purpose, scope, definitions, approved tools and accounts, prohibited data, allowed and prohibited uses, human review of AI output, labelling AI content sent outside, personal data rules, roles: leadership/IT/managers/staff, training, incident reporting, violations, review cycle); publish it as a markdown artifact "AI use policy (draft)"; publish a table artifact "Tool decision" (tool, used by, account type today, decision: approve/replace/ban, reason); publish a markdown artifact "One-page staff guide" (do / don't); final answer: the 3 changes staff will feel first.`,
    },
  ],
};

/* ================================================================ CHATS */

export const dataChat: WorkflowDef = {
  id: 'data-chat',
  version: 1,
  kind: 'chat',
  category: 'management',
  icon: 'Bot',
  name: { vi: 'Hỏi đáp dữ liệu công ty', en: 'Ask your company data' },
  tagline: { vi: 'Hỏi bằng tiếng Việt, agent tự truy vấn hệ thống và trả về bảng, số liệu', en: 'Ask in plain language; the agent queries your systems and returns tables and numbers' },
  description: {
    vi: 'Trợ lý chat kết nối với dữ liệu đơn hàng, công nợ, tồn kho, pipeline, đánh giá khách hàng. Bạn hỏi "khách nào nợ quá hạn nhiều nhất?" hay "doanh thu theo khu vực tháng này?", agent tự viết truy vấn, tính toán và trả về bảng có thể tải xuống. Không cần biết Excel hay SQL.',
    en: 'A chat assistant connected to orders, receivables, inventory, pipeline and reviews. Ask "who owes us the most?" or "revenue by region this month?" and the agent queries, computes and returns a downloadable table. No Excel or SQL needed.',
  },
  tags: ['management', 'finance', 'sales', 'agent'],
  minutesSavedPerRun: 15,
  inputs: [],
  steps: [],
  chat: {
    system: `${AGENT_RULES}\nYou are a data assistant for managers who do not use Excel. For every question: query or aggregate the data (never guess numbers), answer in 2–5 sentences with the key figures, and publish a table artifact when the answer has more than 3 rows. Suggest one follow-up question.\n${OUTPUT_LANGUAGE}`,
    greeting: { vi: 'Chào bạn! Tôi đã kết nối với dữ liệu đơn hàng, công nợ, tồn kho, pipeline và đánh giá khách hàng. Hãy hỏi bất cứ điều gì về số liệu.', en: 'Hi! I am connected to orders, receivables, inventory, pipeline and customer reviews. Ask me anything about the numbers.' },
    starters: [
      { vi: 'Khách nào đang nợ quá hạn nhiều nhất?', en: 'Which customers have the most overdue debt?' },
      { vi: 'Doanh thu tháng 10 theo khu vực?', en: 'October revenue by region?' },
      { vi: 'Mặt hàng nào sắp hết hàng?', en: 'Which products are about to run out?' },
      { vi: 'Pipeline của từng sales đang thế nào?', en: 'How does each rep’s pipeline look?' },
    ],
    agent: { tools: ['query_records', 'aggregate_records', 'calculate', 'create_artifact'], maxTurns: 8 },
  },
};

export const policyHelpdesk: WorkflowDef = {
  id: 'policy-helpdesk',
  version: 1,
  kind: 'chat',
  category: 'hr',
  icon: 'BookOpenCheck',
  name: { vi: 'Trợ lý HR & nội quy (có chuyển tiếp)', en: 'HR & policy helpdesk (with escalation)' },
  tagline: { vi: 'Trả lời theo đúng tài liệu nội bộ; không có trong tài liệu thì tự mở ticket cho HR', en: 'Answers from your documents; if it is not there, it opens a ticket for HR' },
  description: {
    vi: 'Nhân viên hỏi về nghỉ phép, công tác phí, bảo mật, quy trình… Agent tìm trong tài liệu nội bộ, trích đúng điều khoản. Câu hỏi không có trong tài liệu thì không bịa: agent mở ticket chuyển HR kèm câu hỏi gốc và báo lại cho nhân viên. HR thấy được câu hỏi nào lặp lại để bổ sung tài liệu.',
    en: 'Staff ask about leave, travel allowance, security, procedures… The agent searches internal documents and quotes the exact clause. If the answer is not documented, it does not invent one: it opens an HR ticket with the original question and tells the employee. HR sees which questions repeat.',
  },
  tags: ['hr', 'agent', 'knowledge'],
  minutesSavedPerRun: 10,
  useKnowledge: true,
  inputs: [],
  steps: [],
  chat: {
    system: `You are {{company}}'s HR and policy helpdesk. For every question, call search_knowledge first. If the documents answer it, reply briefly and quote the clause with the document title. If they do not, do NOT guess: call create_ticket (assignee "HR", priority normal, summary = the employee's question) and tell the employee it was forwarded with the ticket id. Answer in {{language}} unless the user writes in another language.`,
    greeting: { vi: 'Xin chào! Tôi trả lời câu hỏi về nội quy, nghỉ phép, chi phí và bảo mật dựa trên tài liệu công ty. Nếu tài liệu chưa có, tôi sẽ chuyển câu hỏi cho phòng Nhân sự.', en: 'Hello! I answer questions about policies, leave, expenses and security from company documents. If something is not documented, I forward it to HR.' },
    starters: [
      { vi: 'Tôi được nghỉ phép năm bao nhiêu ngày?', en: 'How many annual leave days do I get?' },
      { vi: 'Đi taxi công tác được thanh toán tối đa bao nhiêu?', en: 'What is the taxi limit for business trips?' },
      { vi: 'Tôi có được dùng ChatGPT cá nhân để soạn báo giá không?', en: 'May I use my personal ChatGPT to draft quotes?' },
      { vi: 'Công ty có hỗ trợ học phí MBA không?', en: 'Does the company sponsor MBA tuition?' },
    ],
    agent: { tools: ['search_knowledge', 'create_ticket'], maxTurns: 4 },
  },
};

export const MORE_AGENT_WORKFLOWS: WorkflowDef[] = [quoteBuilder, inboxTriage, bankRecon, pipelineReview, vocInsights, expenseAudit, supplierCompare, monthlyDeck, onboardingAgent, aiReadiness, aiPolicy, dataChat, policyHelpdesk];
