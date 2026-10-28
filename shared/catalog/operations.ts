import type { WorkflowDef } from '../types.ts';
import { COMPANY_CONTEXT, OUTPUT_LANGUAGE } from './_shared.ts';

export const weeklyReport: WorkflowDef = {
  id: 'weekly-report',
  version: 1,
  kind: 'form',
  category: 'operations',
  icon: 'FileText',
  name: { vi: 'Viết báo cáo tuần', en: 'Weekly report writer' },
  tagline: { vi: 'Từ ghi chú rời rạc thành báo cáo gửi sếp trong 1 phút', en: 'Turn scattered notes into a manager-ready report in a minute' },
  description: {
    vi: 'Dán ghi chú, số liệu, việc đã làm trong tuần. AI sắp xếp thành báo cáo có cấu trúc: kết quả, vấn đề, kế hoạch tuần tới.',
    en: 'Paste your notes, numbers and what got done this week. The AI structures it into results, issues and next-week plan.',
  },
  tags: ['operations', 'management', 'reporting'],
  minutesSavedPerRun: 35,
  inputs: [
    {
      key: 'notes',
      label: { vi: 'Ghi chú trong tuần', en: 'Notes from the week' },
      type: 'textarea',
      required: true,
      rows: 8,
      placeholder: { vi: 'Dán ghi chú, số liệu, tin nhắn nhóm...', en: 'Paste notes, numbers, team messages...' },
      sample: `- Đơn hàng tuần: 412 (tuần trước 380)
- Trễ giao 9 đơn do thiếu xe thứ 5
- Nhân sự: 1 bạn kho nghỉ việc, đang tuyển
- Khách lớn ABC phàn nàn về đóng gói, đã xin lỗi và đổi thùng carton dày hơn
- Tuần sau: kiểm kê kho, họp với nhà vận chuyển mới`,
    },
    {
      key: 'audience',
      label: { vi: 'Người nhận', en: 'Audience' },
      type: 'select',
      options: [
        { value: 'ceo', label: { vi: 'Giám đốc / Ban lãnh đạo', en: 'CEO / leadership' } },
        { value: 'team', label: { vi: 'Nhóm của tôi', en: 'My team' } },
        { value: 'hq', label: { vi: 'Trụ sở nước ngoài (tiếng Anh)', en: 'Overseas HQ (English)' } },
      ],
      sample: 'ceo',
    },
  ],
  steps: [
    {
      id: 'report',
      title: { vi: 'Soạn báo cáo', en: 'Draft the report' },
      system: `You are an experienced operations manager who writes crisp weekly reports. ${COMPANY_CONTEXT}\n${OUTPUT_LANGUAGE}`,
      prompt: `Audience: {{input.audience}} (if "hq", write in English regardless of other instructions).

Raw notes from the week:
"""
{{input.notes}}
"""

Write a weekly report with these sections: 1) Headline (2 sentences), 2) Key results with numbers and week-over-week comparison when available, 3) Problems and what was done, 4) Risks needing a decision from the reader, 5) Plan for next week. Keep it under 300 words.`,
    },
  ],
};

export const meetingNotes: WorkflowDef = {
  id: 'meeting-actions',
  version: 1,
  kind: 'form',
  category: 'operations',
  icon: 'ListChecks',
  name: { vi: 'Biên bản họp → việc cần làm', en: 'Meeting notes → action items' },
  tagline: { vi: 'Tóm tắt cuộc họp và bảng phân công rõ ràng', en: 'A clean summary plus a who-does-what table' },
  description: {
    vi: 'Dán ghi chú hoặc bản ghi cuộc họp. Nhận lại tóm tắt quyết định, bảng việc cần làm (ai, việc gì, hạn) và email gửi người tham dự.',
    en: 'Paste meeting notes or a transcript. Get the decisions, an action table (owner, task, due) and a ready-to-send recap email.',
  },
  tags: ['operations', 'management', 'meetings'],
  minutesSavedPerRun: 25,
  inputs: [
    {
      key: 'transcript',
      label: { vi: 'Ghi chú / bản ghi cuộc họp', en: 'Meeting notes / transcript' },
      type: 'textarea',
      required: true,
      rows: 10,
      sample: `Họp triển khai dự án CRM - 14/10
Tham dự: Lan (PM), Hùng (IT), Minh (Sales), chị Hoa (Kế toán)
- Lan: timeline 6 tuần, go-live 1/12. Cần danh sách khách hàng sạch từ Sales trước 25/10.
- Minh: sẽ xuất file Excel, nhưng có 2000 khách trùng, cần IT hỗ trợ lọc.
- Hùng: viết script lọc trùng, xong thứ 6 tuần này. Hỏi về tích hợp MISA.
- Chị Hoa: MISA chỉ cần đồng bộ công nợ, không cần hoá đơn. Gửi yêu cầu chi tiết cho Hùng thứ 2.
- Quyết định: dùng gói Pro, không mua thêm module marketing năm nay.
- Lan sẽ gửi lịch training cho cả công ty tuần sau.`,
    },
  ],
  steps: [
    {
      id: 'summary',
      title: { vi: 'Tóm tắt & quyết định', en: 'Summary & decisions' },
      system: `You are a meticulous chief of staff. ${COMPANY_CONTEXT}\n${OUTPUT_LANGUAGE}`,
      prompt: `Meeting notes:
"""
{{input.transcript}}
"""

Produce: 1) a 3-5 bullet summary, 2) a "Decisions" list, 3) an "Action items" Markdown table with columns Owner | Task | Due | Status (Status = "Open"). Infer due dates from the text; write "TBD" when unknown. Do not invent people who are not in the notes.`,
    },
    {
      id: 'email',
      title: { vi: 'Email tóm tắt gửi người tham dự', en: 'Recap email to attendees' },
      system: `You write short, polite business emails. ${OUTPUT_LANGUAGE}`,
      prompt: `Using this meeting summary:
{{steps.summary}}

Write a recap email to all attendees (subject line + body, under 150 words) that thanks them, lists the decisions and asks each owner to confirm their action items.`,
    },
  ],
};

export const dataInsight: WorkflowDef = {
  id: 'data-insight',
  version: 1,
  kind: 'form',
  category: 'finance',
  icon: 'BarChart3',
  name: { vi: 'Phân tích bảng số liệu', en: 'Table insights' },
  tagline: { vi: 'Dán bảng Excel, nhận nhận xét và đề xuất', en: 'Paste a spreadsheet table, get findings and recommendations' },
  description: {
    vi: 'Copy một bảng từ Excel hoặc Google Sheets. AI tìm xu hướng, điểm bất thường và đề xuất 3 việc nên làm.',
    en: 'Copy a table from Excel or Google Sheets. The AI finds trends, outliers and proposes three next actions.',
  },
  tags: ['finance', 'operations', 'analysis'],
  minutesSavedPerRun: 40,
  inputs: [
    {
      key: 'table',
      label: { vi: 'Bảng dữ liệu (dán từ Excel)', en: 'Data table (paste from Excel)' },
      type: 'textarea',
      required: true,
      rows: 10,
      sample: `Tháng\tDoanh thu\tChi phí\tSố đơn\tTỷ lệ trả hàng
T5\t1,250,000,000\t980,000,000\t1,840\t2.1%
T6\t1,310,000,000\t1,020,000,000\t1,910\t2.4%
T7\t1,180,000,000\t1,050,000,000\t1,720\t3.9%
T8\t1,420,000,000\t1,090,000,000\t2,050\t2.2%
T9\t1,390,000,000\t1,180,000,000\t1,980\t2.0%`,
    },
    {
      key: 'question',
      label: { vi: 'Bạn muốn biết điều gì?', en: 'What do you want to know?' },
      type: 'text',
      sample: 'Tháng nào có vấn đề và vì sao lợi nhuận giảm?',
    },
  ],
  steps: [
    {
      id: 'analysis',
      title: { vi: 'Phân tích', en: 'Analysis' },
      system: `You are a sharp financial analyst who explains numbers to non-technical managers. ${COMPANY_CONTEXT}\n${OUTPUT_LANGUAGE}`,
      prompt: `Data (tab or comma separated):
"""
{{input.table}}
"""
Question: {{input.question}}

Answer with: 1) Direct answer to the question (2-3 sentences), 2) Key findings with computed figures (growth %, margins, ratios), 3) Anomalies worth checking, 4) Three recommended actions, each with the expected effect. Show your arithmetic briefly so the reader can verify.`,
    },
  ],
};
