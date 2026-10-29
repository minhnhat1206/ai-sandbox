import type { WorkflowDef } from '../types.ts';
import { COMPANY_CONTEXT, KNOWLEDGE_BLOCK, OUTPUT_LANGUAGE } from './_shared.ts';

/**
 * Agent workflows: the model plans, calls connector tools against the prospect's
 * data, takes actions (ticket, email draft) and publishes deliverables (artifacts).
 * The system prompt gets the data-source catalogue injected via {{sources}}.
 */

export const AGENT_RULES = `You are an autonomous work agent for {{company}} ({{industry}}).
Work method: 1) look up the facts with the tools before writing anything, 2) do all arithmetic with aggregate_records or calculate, 3) take the actions the task calls for (create_ticket / draft_email), 4) publish deliverables with create_artifact, 5) finish with a short answer in {{language}} that summarises what you found, what you did and what needs a human decision. Never invent records that the tools did not return. Quote company documents when you rely on them.
Connected data sources:
{{sources}}`;

export const orderCareAgent: WorkflowDef = {
  id: 'order-care-agent',
  version: 1,
  kind: 'form',
  category: 'customer-service',
  icon: 'Headset',
  name: { vi: 'Agent xử lý khiếu nại đơn hàng', en: 'Order complaint agent' },
  tagline: { vi: 'Tra đơn hàng, đối chiếu chính sách, tạo ticket và soạn trả lời', en: 'Looks up the order, checks policy, opens a ticket and drafts the reply' },
  description: {
    vi: 'Dán tin nhắn khiếu nại. Agent tự tra đơn trong hệ thống đơn hàng, đọc chính sách hoàn trả, tính mức bồi thường được phép, tạo ticket cho đội vận hành và soạn email trả lời khách. Mọi thao tác hiện trong dòng thời gian để bạn thấy AI đã làm gì.',
    en: 'Paste a complaint. The agent looks the order up in the order system, reads the refund policy, computes the allowed compensation, opens an ops ticket and drafts the customer reply. Every step is visible in the timeline.',
  },
  tags: ['customer-service', 'operations', 'agent'],
  minutesSavedPerRun: 25,
  useKnowledge: true,
  inputs: [
    { key: 'message', label: { vi: 'Tin nhắn của khách', en: 'Customer message' }, type: 'textarea', required: true, rows: 6,
      sample: 'Chào bên anh, nhà hàng Sen Vàng đặt đơn 48213 (200 bao gạo ST25) hẹn giao 22/10 mà đến hôm nay 28/10 vẫn chưa thấy hàng. Gọi hotline không ai nghe. Cuối tuần tiệc lớn, nếu không giao kịp thì huỷ và hoàn tiền giúp. - Chị Sen' },
    { key: 'channel', label: { vi: 'Kênh', en: 'Channel' }, type: 'select', sample: 'zalo', options: [{ value: 'zalo', label: { vi: 'Zalo', en: 'Zalo' } }, { value: 'email', label: { vi: 'Email', en: 'Email' } }, { value: 'phone', label: { vi: 'Điện thoại (ghi chú)', en: 'Phone (note)' } }] },
  ],
  steps: [
    {
      id: 'resolve',
      title: { vi: 'Agent xử lý', en: 'Agent run' },
      agent: { tools: ['query_records', 'search_knowledge', 'calculate', 'create_ticket', 'draft_email', 'create_artifact'], maxTurns: 8 },
      system: `${AGENT_RULES}\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `Customer message (channel: {{input.channel}}):
"""
{{input.message}}
"""

Tasks: find the order and the customer in the connected data; check delivery status, promised vs delivered dates and the customer's open invoices; look up the refund/compensation policy in the documents; decide what we can offer within policy (compute the amounts); open a ticket for operations with priority and due date; draft the reply to the customer in their language and tone (apologetic, concrete next step, dated); publish a markdown artifact "Case file" with: facts found, policy applied, offer, ticket id, internal note for the manager.`,
    },
  ],
};

export const receivablesAgent: WorkflowDef = {
  id: 'receivables-agent',
  version: 1,
  kind: 'form',
  category: 'finance',
  icon: 'Receipt',
  name: { vi: 'Agent thu hồi công nợ', en: 'Receivables collection agent' },
  tagline: { vi: 'Phân nhóm nợ quá hạn, dashboard và email nhắc theo từng nhóm', en: 'Segments overdue debt, builds a dashboard and drafts reminders per segment' },
  description: {
    vi: 'Agent đọc bảng công nợ, tổng hợp theo khách và số ngày quá hạn, dựng dashboard HTML, lập danh sách việc cần gọi cho kế toán và soạn sẵn email nhắc thanh toán theo mức độ (nhẹ nhàng / cứng rắn).',
    en: 'The agent reads the receivables table, aggregates by customer and ageing bucket, builds an HTML dashboard, lists the calls accounting must make and drafts reminder emails by severity.',
  },
  tags: ['finance', 'agent', 'dashboard'],
  minutesSavedPerRun: 90,
  inputs: [
    { key: 'threshold', label: { vi: 'Nhắc từ bao nhiêu ngày quá hạn', en: 'Remind from how many days overdue' }, type: 'number', sample: '15' },
    { key: 'tone', label: { vi: 'Giọng email', en: 'Email tone' }, type: 'select', sample: 'firm', options: [{ value: 'soft', label: { vi: 'Nhẹ nhàng', en: 'Soft' } }, { value: 'firm', label: { vi: 'Cứng rắn nhưng lịch sự', en: 'Firm but polite' } }] },
  ],
  steps: [
    {
      id: 'collect',
      title: { vi: 'Agent phân tích & soạn thảo', en: 'Agent analysis & drafting' },
      agent: { tools: ['query_records', 'aggregate_records', 'calculate', 'draft_email', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${OUTPUT_LANGUAGE}`,
      prompt: `Threshold: remind customers with balance > 0 and days_overdue >= {{input.threshold}}. Tone: {{input.tone}}.

Tasks: 1) aggregate total balance and overdue balance by customer and by ageing bucket (0, 1-15, 16-30, 31-60, 60+ days); 2) compute the share of overdue balance in total balance; 3) publish an HTML artifact "Receivables dashboard" (self-contained, inline CSS, a bar chart as inline SVG of balance by ageing bucket, a table of the top overdue customers with account manager); 4) publish a table artifact "Call list" with customer, balance, days overdue, account manager, suggested action; 5) draft one reminder email per customer at or above the threshold (max 5), personalised with invoice numbers and amounts; 6) final answer: key numbers, who to call first and why.`,
    },
  ],
};

export const weeklyOpsAgent: WorkflowDef = {
  id: 'weekly-ops-agent',
  version: 1,
  kind: 'form',
  category: 'operations',
  icon: 'LineChart',
  name: { vi: 'Agent báo cáo vận hành tuần', en: 'Weekly operations report agent' },
  tagline: { vi: 'Tự lấy số từ đơn hàng và ticket, dựng dashboard, soạn email gửi sếp', en: 'Pulls numbers from orders and tickets, builds a dashboard, drafts the email to leadership' },
  description: {
    vi: 'Không cần gõ số liệu. Agent tổng hợp đơn hàng theo tuần/khu vực, tỷ lệ giao đúng hẹn, ticket theo loại, viết nhận định và đề xuất, xuất dashboard HTML kèm email gửi ban giám đốc.',
    en: 'No numbers to type. The agent aggregates orders by week and region, on-time delivery rate, tickets by category, writes findings and recommendations, and publishes an HTML dashboard plus the email to leadership.',
  },
  tags: ['operations', 'management', 'agent', 'dashboard'],
  minutesSavedPerRun: 120,
  inputs: [
    { key: 'period', label: { vi: 'Kỳ báo cáo', en: 'Reporting period' }, type: 'text', sample: '20/10/2026 – 28/10/2026' },
    { key: 'focus', label: { vi: 'Điểm sếp quan tâm', en: 'What leadership cares about' }, type: 'text', sample: 'Giao đúng hẹn và khiếu nại giao trễ' },
  ],
  steps: [
    {
      id: 'report',
      title: { vi: 'Agent tổng hợp', en: 'Agent compiles' },
      agent: { tools: ['query_records', 'aggregate_records', 'calculate', 'draft_email', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${OUTPUT_LANGUAGE}`,
      prompt: `Reporting period: {{input.period}}. Leadership focus: {{input.focus}}.

Tasks: from "orders" compute revenue, order count and on-time rate (delivered_date <= promised_date) for the period and for the whole month by region and carrier; from "tickets" count by category and priority and average resolution_hours; identify the 3 biggest problems with evidence (order ids, customers); publish an HTML artifact "Weekly ops dashboard" (KPI tiles, an inline SVG bar chart of orders by region, a table of late orders) and a markdown artifact "Weekly report" with sections Headline, Results, Problems, Decisions needed, Next week; draft the email to the General Director (subject + body, under 150 words) referencing the dashboard; final answer: the headline in 3 sentences.`,
    },
  ],
};

export const inventoryAgent: WorkflowDef = {
  id: 'inventory-agent',
  version: 1,
  kind: 'form',
  category: 'operations',
  icon: 'Package',
  name: { vi: 'Agent đề xuất đặt hàng tồn kho', en: 'Inventory reorder agent' },
  tagline: { vi: 'Tính ngày còn hàng, cảnh báo thiếu, lập đơn đặt hàng đề xuất', en: 'Computes days of cover, flags shortages, drafts the purchase proposal' },
  description: {
    vi: 'Agent đọc tồn kho và tốc độ bán, tính số ngày còn hàng (tồn khả dụng ÷ bán trung bình/ngày) so với lead time nhà cung cấp, xếp mức ưu tiên và tạo bảng đặt hàng đề xuất kèm giá trị, xuất CSV cho bộ phận mua hàng.',
    en: 'The agent reads stock and sales velocity, computes days of cover (available ÷ daily sales) against supplier lead time, ranks urgency and publishes a reorder proposal with values, exported as CSV for purchasing.',
  },
  tags: ['operations', 'finance', 'agent'],
  minutesSavedPerRun: 60,
  inputs: [
    { key: 'safety', label: { vi: 'Số ngày dự phòng mong muốn', en: 'Safety days of cover' }, type: 'number', sample: '7' },
    { key: 'budget', label: { vi: 'Ngân sách mua hàng tuần này (VND)', en: 'Purchasing budget this week (VND)' }, type: 'number', sample: '300000000' },
  ],
  steps: [
    {
      id: 'reorder',
      title: { vi: 'Agent tính toán', en: 'Agent computes' },
      agent: { tools: ['query_records', 'aggregate_records', 'calculate', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${OUTPUT_LANGUAGE}`,
      prompt: `Safety days: {{input.safety}}. Budget: {{input.budget}} VND.

Tasks: for every SKU in "inventory" compute available = on_hand - reserved, days_of_cover = available / avg_daily_sales, and flag urgent when days_of_cover < lead_time_days + safety days; propose reorder_qty = (lead_time_days + safety + 14) * avg_daily_sales - available (never below 0, round up to 10) and value = reorder_qty * unit_cost; sort by urgency; stay within the budget by deferring the least urgent items and say which; publish a table artifact "Reorder proposal" (sku, product, supplier, available, days_of_cover, lead_time_days, reorder_qty, value, urgency) and a CSV artifact of the same for purchasing; final answer: items at risk of stock-out this week and total proposed spend vs budget.`,
    },
  ],
};

export const meetingPrepAgent: WorkflowDef = {
  id: 'meeting-prep-agent',
  version: 1,
  kind: 'form',
  category: 'sales',
  icon: 'Briefcase',
  name: { vi: 'Agent chuẩn bị gặp khách hàng', en: 'Customer meeting prep agent' },
  tagline: { vi: 'Gom lịch sử mua, công nợ, ticket và tin tức thành bản brief 1 trang', en: 'Pulls purchase history, debt, tickets and news into a one-page brief' },
  description: {
    vi: 'Nhập tên khách sắp gặp. Agent tra CRM nội bộ (đơn hàng, công nợ, ticket), tìm tin tức công khai về khách (khi có kết nối web), rồi tạo bản brief: tình hình, rủi ro, cơ hội bán thêm, 5 câu hỏi nên hỏi, kèm trang HTML để mở trên điện thoại trước cuộc họp.',
    en: 'Enter the customer you are meeting. The agent queries the internal CRM (orders, receivables, tickets), searches public news (when web is connected) and produces a brief: situation, risks, upsell, 5 questions to ask, plus an HTML one-pager for your phone.',
  },
  tags: ['sales', 'agent', 'web'],
  minutesSavedPerRun: 45,
  useKnowledge: true,
  inputs: [
    { key: 'customer', label: { vi: 'Khách hàng', en: 'Customer' }, type: 'text', required: true, sample: 'Đại lý Phú Quý' },
    { key: 'goal', label: { vi: 'Mục tiêu cuộc gặp', en: 'Meeting goal' }, type: 'text', sample: 'Gia hạn hợp đồng năm 2027 và xử lý công nợ' },
  ],
  steps: [
    {
      id: 'brief',
      title: { vi: 'Agent chuẩn bị', en: 'Agent prepares' },
      agent: { tools: ['query_records', 'aggregate_records', 'search_knowledge', 'web_search', 'create_artifact'], maxTurns: 10 },
      system: `${AGENT_RULES}\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `Customer: {{input.customer}}. Meeting goal: {{input.goal}}.

Tasks: find the customer record; aggregate their orders this month (count, revenue, late deliveries); list open receivables with days overdue; list their tickets; search the web for recent news about the customer (if unavailable, say so); check company documents for relevant terms (credit, discounts); publish an HTML artifact "Meeting brief" (one page: header with contact and account manager, KPIs, timeline of recent orders and issues, risks, upsell ideas, 5 questions) and a markdown artifact "Talking points"; final answer: the 3 things to open the meeting with.`,
    },
  ],
};

export const documentReview: WorkflowDef = {
  id: 'document-review',
  version: 1,
  kind: 'form',
  category: 'general',
  icon: 'FileSearch',
  name: { vi: 'Rà soát hợp đồng / tài liệu (PDF)', en: 'Contract & document review (PDF)' },
  tagline: { vi: 'Tải PDF lên, nhận bảng rủi ro có trích dẫn và câu hỏi cho luật sư', en: 'Upload a PDF, get a risk table with quotes and questions for your lawyer' },
  description: {
    vi: 'Tải hợp đồng, điều khoản hoặc công văn (PDF, ảnh chụp, văn bản). AI đọc toàn bộ, trích các điều khoản quan trọng, đánh giá rủi ro cho phía bạn, so với chính sách công ty, và xuất bảng tóm tắt. Không thay thế tư vấn pháp lý.',
    en: 'Upload a contract, terms or official letter (PDF, photo, text). The AI reads it all, extracts key clauses, rates the risk for your side against company policy and publishes a summary table. Not legal advice.',
  },
  tags: ['general', 'operations', 'documents'],
  minutesSavedPerRun: 50,
  useKnowledge: true,
  inputs: [
    { key: 'file', label: { vi: 'Tệp hợp đồng (PDF, ảnh, .txt)', en: 'Contract file (PDF, image, .txt)' }, type: 'file', accept: '.pdf,.png,.jpg,.jpeg,.txt,.md', sample: '', help: { vi: 'Không bắt buộc: có thể dán văn bản bên dưới thay vì tải tệp.', en: 'Optional: you can paste the text below instead.' } },
    { key: 'text', label: { vi: 'Hoặc dán nội dung', en: 'Or paste the text' }, type: 'textarea', rows: 8,
      sample: `HỢP ĐỒNG CUNG CẤP HÀNG HOÁ số 27/2026/HĐ
Điều 3. Giao hàng: Bên B giao hàng trong 3 ngày làm việc kể từ khi nhận đơn. Chậm giao quá 2 ngày, Bên B chịu phạt 0,5%/ngày trên giá trị lô hàng, tối đa 10%.
Điều 5. Thanh toán: Bên A thanh toán trong 45 ngày kể từ ngày nhận hoá đơn. Chậm thanh toán chịu lãi 0,03%/ngày.
Điều 7. Đổi trả: Hàng lỗi được đổi trong 7 ngày; Bên A tự chịu chi phí vận chuyển trả hàng.
Điều 9. Độc quyền: Bên B không được cung cấp sản phẩm cùng loại cho đối thủ của Bên A trong khu vực TP.HCM trong thời hạn hợp đồng và 12 tháng sau khi chấm dứt.
Điều 11. Chấm dứt: Bên A có quyền chấm dứt hợp đồng bất kỳ lúc nào với thông báo trước 15 ngày; Bên B phải thông báo trước 90 ngày.` },
    { key: 'side', label: { vi: 'Bạn là bên nào', en: 'Which party are you' }, type: 'select', sample: 'B', options: [{ value: 'A', label: { vi: 'Bên A (mua)', en: 'Party A (buyer)' } }, { value: 'B', label: { vi: 'Bên B (bán / cung cấp)', en: 'Party B (seller / supplier)' } }] },
  ],
  steps: [
    {
      id: 'review',
      title: { vi: 'Đọc & đánh giá', en: 'Read & assess' },
      agent: { tools: ['search_knowledge', 'calculate', 'create_artifact'], maxTurns: 6 },
      system: `You are a commercial contracts analyst (not a lawyer) helping {{company}}. Read the document carefully, quote exact wording, and assess risk for the user's side. ${COMPANY_CONTEXT}\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `We are party {{input.side}}.
Document (pasted text, if any):
"""
{{input.text}}
"""
If a file is attached, it is the primary document.

Tasks: extract every clause that creates an obligation, penalty, exclusivity, termination or payment term; for each give the quote, what it means for our side, a risk level (low/medium/high) and a suggested change; compute worst-case penalty exposure on a 100,000,000 VND shipment where the text allows; check company documents for internal policy conflicts; publish a table artifact "Clause review" (clause, quote, meaning, risk, suggested change) and a markdown artifact "Questions for the lawyer"; final answer: overall risk and the 3 clauses to negotiate first.`,
    },
  ],
};

export const dataCleanup: WorkflowDef = {
  id: 'data-cleanup',
  version: 1,
  kind: 'form',
  category: 'operations',
  icon: 'Table',
  name: { vi: 'Làm sạch danh sách khách hàng (Excel)', en: 'Customer list clean-up (Excel)' },
  tagline: { vi: 'Dán hoặc tải CSV: chuẩn hoá SĐT, email, gộp trùng, xuất file sạch', en: 'Paste or upload a CSV: normalise phones and emails, merge duplicates, export a clean file' },
  description: {
    vi: 'Dữ liệu khách hàng lộn xộn từ nhiều nguồn? AI chuẩn hoá số điện thoại Việt Nam, email, tên công ty, phát hiện bản ghi trùng (kể cả gõ khác nhau) và xuất bảng sạch kèm nhật ký thay đổi để bạn kiểm tra trước khi nhập CRM.',
    en: 'Messy customer data from several sources? The AI normalises Vietnamese phone numbers, emails and company names, detects duplicates (even when typed differently) and exports a clean table plus a change log to check before importing into your CRM.',
  },
  tags: ['operations', 'sales', 'data'],
  minutesSavedPerRun: 75,
  inputs: [
    { key: 'file', label: { vi: 'Tệp CSV (tuỳ chọn)', en: 'CSV file (optional)' }, type: 'file', accept: '.csv,.txt', sample: '' },
    { key: 'data', label: { vi: 'Hoặc dán bảng', en: 'Or paste the table' }, type: 'textarea', rows: 9,
      sample: `Tên,Điện thoại,Email,Công ty,Thành phố
Nguyễn Văn Tuấn,0903 111 222,Tuan@MinhPhat.example,Siêu thị Minh Phát,HCM
Nguyen Van Tuan,+84903111222,tuan@minhphat.example,Sieu thi Minh Phat,Hồ Chí Minh
Trần Thị Mai,0909333444,mai@hoamai.example ,Chuỗi CH Hoa Mai,Binh Duong
Lê Thành,912444555,thanh@thanhcong.example,Đại lý Thành Công,Đồng Nai
Lê Thành,0912444555,,Dai ly Thanh Cong,Dong Nai
Phạm Sen,0913.555.666,SEN@senvang.example,Nhà hàng Sen Vàng,HCM
Mr Tanaka,0915777888,purchasing@riverside.example,Khách sạn Riverside,TP HCM
Ngô Ngọc,0916 888 999,ngoc@greenmart,Siêu thị GreenMart,HCM` },
  ],
  steps: [
    {
      id: 'clean',
      title: { vi: 'Chuẩn hoá & gộp trùng', en: 'Normalise & dedupe' },
      agent: { tools: ['create_artifact'], maxTurns: 4 },
      system: `You are a meticulous data steward. Rules: Vietnamese mobile numbers become 10 digits starting with 0 (strip spaces, dots, +84); emails lower-case and trimmed, flag invalid ones; company names keep Vietnamese diacritics (prefer the diacritic version when duplicates differ); city names normalised to the official province/city name; duplicates are rows with the same phone or the same email or the same normalised name+company. ${OUTPUT_LANGUAGE}`,
      prompt: `Data (pasted, if any):
"""
{{input.data}}
"""
If a CSV file is attached, it is the primary data.

Tasks: clean every row; merge duplicates keeping the most complete values; publish a table artifact "Clean customer list" with the normalised columns plus "merged_from" (original row numbers) and "flags"; publish a CSV artifact of the same table named "clean_customers.csv"; publish a markdown artifact "Change log" listing every change per row; final answer: rows in, rows out, duplicates merged, invalid values flagged.`,
    },
  ],
};

export const excelBuilder: WorkflowDef = {
  id: 'excel-builder',
  version: 1,
  kind: 'form',
  category: 'finance',
  icon: 'Calculator',
  name: { vi: 'Tạo file Excel có công thức', en: 'Build a working Excel file' },
  tagline: { vi: 'Mô tả bảng tính bạn cần, nhận file .xlsx có công thức và định dạng', en: 'Describe the spreadsheet you need, get a formatted .xlsx with formulas' },
  description: {
    vi: 'Nhập yêu cầu bằng lời (ví dụ: bảng theo dõi công nợ theo tháng có tổng và cảnh báo quá hạn). AI dùng kỹ năng tạo Excel để xuất file .xlsx thật với công thức, định dạng điều kiện và dữ liệu mẫu lấy từ hệ thống của bạn. Ở chế độ demo, kết quả là bảng và CSV.',
    en: 'Describe what you need in words (e.g. a monthly receivables tracker with totals and overdue alerts). The AI uses its spreadsheet skill to produce a real .xlsx with formulas, conditional formatting and sample data pulled from your systems. In demo mode the output is a table and a CSV.',
  },
  tags: ['finance', 'operations', 'skills'],
  minutesSavedPerRun: 60,
  inputs: [
    { key: 'spec', label: { vi: 'Bạn cần bảng tính gì?', en: 'What spreadsheet do you need?' }, type: 'textarea', required: true, rows: 5,
      sample: 'Bảng theo dõi công nợ theo khách hàng: số dư, số ngày quá hạn, nhóm tuổi nợ (0 / 1-15 / 16-30 / 31-60 / 60+), tổng theo nhóm, tô đỏ dòng quá hạn trên 30 ngày, có sheet tổng hợp theo người phụ trách.' },
    { key: 'source', label: { vi: 'Lấy dữ liệu mẫu từ', en: 'Sample data from' }, type: 'select', sample: 'receivables', options: [{ value: 'receivables', label: { vi: 'Công nợ', en: 'Receivables' } }, { value: 'orders', label: { vi: 'Đơn hàng', en: 'Orders' } }, { value: 'inventory', label: { vi: 'Tồn kho', en: 'Inventory' } }, { value: 'none', label: { vi: 'Không, chỉ cấu trúc', en: 'None, structure only' } }] },
  ],
  steps: [
    {
      id: 'build',
      title: { vi: 'Dựng bảng tính', en: 'Build the workbook' },
      agent: { tools: ['query_records', 'aggregate_records', 'create_artifact'], skills: ['xlsx'], maxTurns: 8 },
      system: `${AGENT_RULES}\nWhen the xlsx skill is available, build the real workbook with it (formulas, number formats, conditional formatting, a summary sheet) and save it as a file; otherwise publish the sheets as table and CSV artifacts.\n${OUTPUT_LANGUAGE}`,
      prompt: `Specification:
"""
{{input.spec}}
"""
Sample data source: {{input.source}} (query it for up to 50 rows when not "none").

Tasks: design the sheet structure first (columns, formulas, validation); fill with the sample rows; publish the workbook (file via the xlsx skill, or table + CSV artifacts in demo mode); publish a markdown artifact "How to use" explaining each sheet and formula; final answer: what was built and what the user should replace with live data.`,
    },
  ],
};

