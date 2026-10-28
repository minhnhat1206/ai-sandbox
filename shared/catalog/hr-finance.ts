import type { WorkflowDef } from '../types.ts';
import { COMPANY_CONTEXT, OUTPUT_LANGUAGE } from './_shared.ts';

export const jobDescription: WorkflowDef = {
  id: 'job-description',
  version: 1,
  kind: 'form',
  category: 'hr',
  icon: 'UserPlus',
  name: { vi: 'Mô tả công việc & câu hỏi phỏng vấn', en: 'Job description & interview kit' },
  tagline: { vi: 'JD chuẩn chỉnh và bộ câu hỏi phỏng vấn trong 1 lần chạy', en: 'A polished JD and interview questions in one run' },
  description: {
    vi: 'Nhập vị trí và vài yêu cầu chính. Nhận mô tả công việc đầy đủ (VI + EN), 8 câu hỏi phỏng vấn theo năng lực và thang chấm điểm.',
    en: 'Enter the role and a few key requirements. Get a full JD (VI + EN), 8 competency-based interview questions and a scoring guide.',
  },
  tags: ['hr'],
  minutesSavedPerRun: 60,
  inputs: [
    { key: 'title', label: { vi: 'Vị trí tuyển', en: 'Job title' }, type: 'text', required: true, sample: 'Nhân viên chăm sóc khách hàng (tiếng Anh)' },
    { key: 'requirements', label: { vi: 'Yêu cầu chính', en: 'Key requirements' }, type: 'textarea', rows: 5,
      sample: '- 1-2 năm kinh nghiệm CSKH\n- Tiếng Anh giao tiếp tốt (khách Úc, Singapore)\n- Làm ca xoay, có ca tối\n- Biết dùng Zendesk hoặc tương tự là lợi thế\n- Lương 12-16 triệu + thưởng' },
    { key: 'level', label: { vi: 'Cấp bậc', en: 'Level' }, type: 'select', sample: 'junior',
      options: [
        { value: 'junior', label: { vi: 'Nhân viên', en: 'Junior' } },
        { value: 'senior', label: { vi: 'Chuyên viên cao cấp', en: 'Senior' } },
        { value: 'manager', label: { vi: 'Quản lý', en: 'Manager' } },
      ] },
  ],
  steps: [
    {
      id: 'jd',
      title: { vi: 'Mô tả công việc', en: 'Job description' },
      system: `You are an HR business partner who writes inclusive, specific job descriptions. ${COMPANY_CONTEXT}`,
      prompt: `Role: {{input.title}} ({{input.level}})
Requirements: {{input.requirements}}

Write the job description in Vietnamese first, then an English version. Sections: About the role, Responsibilities (5-7), Must-have, Nice-to-have, What we offer. Avoid gendered or age-biased language.`,
    },
    {
      id: 'interview',
      title: { vi: 'Bộ câu hỏi phỏng vấn', en: 'Interview kit' },
      system: `You design structured, competency-based interviews. ${OUTPUT_LANGUAGE}`,
      prompt: `Based on this job description:
{{steps.jd}}

Create 8 interview questions grouped by competency, each with "what a strong answer includes". Then a 1-5 scoring rubric table (columns: Competency | 1 | 3 | 5).`,
    },
  ],
};

export const invoiceExtract: WorkflowDef = {
  id: 'invoice-extract',
  version: 1,
  kind: 'form',
  category: 'finance',
  icon: 'Receipt',
  name: { vi: 'Trích xuất dữ liệu hoá đơn / đơn hàng', en: 'Invoice / PO data extraction' },
  tagline: { vi: 'Từ văn bản lộn xộn thành bảng sẵn sàng nhập Excel', en: 'From messy text to a table ready for Excel' },
  description: {
    vi: 'Dán nội dung hoá đơn, đơn đặt hàng hoặc email báo giá. AI trích ra bảng có cấu trúc: nhà cung cấp, số, ngày, từng dòng hàng, thuế, tổng. Kiểm tra tổng có khớp không.',
    en: 'Paste invoice, purchase order or quote text. The AI extracts a structured table: vendor, number, date, line items, tax, total, and checks that totals add up.',
  },
  tags: ['finance', 'operations'],
  minutesSavedPerRun: 15,
  inputs: [
    { key: 'document', label: { vi: 'Nội dung hoá đơn / đơn hàng', en: 'Invoice / PO text' }, type: 'textarea', required: true, rows: 10,
      sample: `CÔNG TY TNHH BAO BÌ THÀNH PHÁT
HÓA ĐƠN GTGT  Số: 0001287   Ngày 12/10/2026
Khách hàng: Công ty CP Phân Phối Việt Minh   MST: 0312345678
1. Thùng carton 60x40x40 5 lớp - 2.000 cái x 8.500 = 17.000.000
2. Băng keo trong 48mm - 300 cuộn x 12.000 = 3.600.000
3. Màng PE quấn pallet - 50 cuộn x 95.000 = 4.750.000
Cộng tiền hàng: 25.350.000
Thuế GTGT 8%: 2.028.000
Tổng thanh toán: 27.378.000
Thanh toán chuyển khoản trong 30 ngày.` },
  ],
  steps: [
    {
      id: 'extract',
      title: { vi: 'Trích xuất & kiểm tra', en: 'Extract & verify' },
      system: `You are a careful accounts-payable clerk. Extract exactly what is in the text; never guess missing values (write "n/a"). ${OUTPUT_LANGUAGE}`,
      prompt: `Document text:
"""
{{input.document}}
"""

Output: 1) a "Header" table (Vendor, Tax ID, Invoice/PO number, Date, Customer, Payment terms, Currency), 2) a "Line items" table (# | Description | Qty | Unit price | Amount), 3) "Totals" (subtotal, tax rate, tax, grand total), 4) "Checks": recompute subtotal and tax from the line items and state whether they match the stated totals, flagging any difference. 5) A CSV block of the line items ready to paste into Excel.`,
    },
  ],
};

export const translateLocalize: WorkflowDef = {
  id: 'translate-business',
  version: 1,
  kind: 'form',
  category: 'general',
  icon: 'Languages',
  name: { vi: 'Dịch & chỉnh văn phong Việt ↔ Anh', en: 'Business translation VI ↔ EN' },
  tagline: { vi: 'Dịch đúng ngữ cảnh kinh doanh, kèm giải thích lựa chọn từ', en: 'Context-aware business translation with notes on word choices' },
  description: {
    vi: 'Dán email, hợp đồng, bài thuyết trình. Nhận bản dịch tự nhiên theo đúng giọng văn, cộng danh sách thuật ngữ và những chỗ cần người kiểm tra lại.',
    en: 'Paste an email, contract clause or slide text. Get a natural translation in the right register, a glossary and a list of spots a human should double-check.',
  },
  tags: ['general', 'sales', 'operations'],
  minutesSavedPerRun: 20,
  inputs: [
    { key: 'text', label: { vi: 'Văn bản cần dịch', en: 'Text to translate' }, type: 'textarea', required: true, rows: 8,
      sample: `Dear Mr. Tanaka,

Thank you for visiting our factory last week. As discussed, we can commit to a lead time of 21 days for the first order of 5,000 units, with a 30% deposit and the balance due before shipment. Please note that the price is valid until 30 November due to raw material fluctuations.

We look forward to a long-term partnership.` },
    { key: 'direction', label: { vi: 'Chiều dịch', en: 'Direction' }, type: 'select', sample: 'en-vi',
      options: [
        { value: 'en-vi', label: { vi: 'Anh → Việt', en: 'English → Vietnamese' } },
        { value: 'vi-en', label: { vi: 'Việt → Anh', en: 'Vietnamese → English' } },
      ] },
    { key: 'register', label: { vi: 'Văn phong', en: 'Register' }, type: 'select', sample: 'formal',
      options: [
        { value: 'formal', label: { vi: 'Trang trọng (đối tác, hợp đồng)', en: 'Formal (partners, contracts)' } },
        { value: 'friendly', label: { vi: 'Thân thiện (khách hàng, nội bộ)', en: 'Friendly (customers, internal)' } },
      ] },
  ],
  steps: [
    {
      id: 'translation',
      title: { vi: 'Bản dịch', en: 'Translation' },
      system: `You are a professional Vietnamese-English business translator. Preserve meaning, numbers, names and dates exactly. Match the requested register.`,
      prompt: `Direction: {{input.direction}}. Register: {{input.register}}.
Text:
"""
{{input.text}}
"""

Output: 1) the translation, 2) a short glossary table (Source term | Translation | Note) for 3-6 key business terms, 3) "Please double-check" list for ambiguous phrases, legal terms or anything that depends on context the text does not give.`,
    },
  ],
};
