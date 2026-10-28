import type { WorkflowDef } from '../types.ts';
import { COMPANY_CONTEXT, KNOWLEDGE_BLOCK, OUTPUT_LANGUAGE } from './_shared.ts';

export const customerReply: WorkflowDef = {
  id: 'customer-reply',
  version: 1,
  kind: 'form',
  category: 'customer-service',
  icon: 'MessageSquareReply',
  name: { vi: 'Trả lời email khách hàng', en: 'Customer email reply' },
  tagline: { vi: 'Phản hồi chuyên nghiệp, đúng chính sách, trong 30 giây', en: 'A professional, on-policy reply in 30 seconds' },
  description: {
    vi: 'Dán email hoặc tin nhắn của khách. AI soạn câu trả lời lịch sự theo đúng chính sách công ty (nếu có tài liệu), kèm phiên bản ngắn cho chat.',
    en: 'Paste the customer email or message. The AI drafts a polite reply that follows your policy documents, plus a short chat version.',
  },
  tags: ['customer-service', 'sales'],
  minutesSavedPerRun: 12,
  useKnowledge: true,
  inputs: [
    { key: 'message', label: { vi: 'Tin nhắn của khách', en: 'Customer message' }, type: 'textarea', required: true, rows: 7,
      sample: `Chào shop, tôi đặt đơn #48213 từ thứ 2 mà đến nay thứ 6 vẫn chưa nhận được. Gọi hotline không ai nghe. Tôi muốn hủy đơn và hoàn tiền, nếu không tôi sẽ đánh giá 1 sao. - Anh Tuấn` },
    { key: 'context', label: { vi: 'Thông tin thêm (tình trạng đơn, ghi chú nội bộ)', en: 'Extra context (order status, internal notes)' }, type: 'textarea', rows: 3,
      sample: 'Đơn bị kẹt ở kho vận chuyển do bão, dự kiến giao thứ 2 tuần sau. Có thể tặng voucher 50k.' },
    { key: 'tone', label: { vi: 'Giọng văn', en: 'Tone' }, type: 'select', sample: 'warm',
      options: [
        { value: 'warm', label: { vi: 'Ấm áp, xin lỗi chân thành', en: 'Warm and apologetic' } },
        { value: 'neutral', label: { vi: 'Trung tính, chuyên nghiệp', en: 'Neutral and professional' } },
      ] },
  ],
  steps: [
    {
      id: 'reply',
      title: { vi: 'Soạn phản hồi', en: 'Draft the reply' },
      system: `You are a senior customer-service lead. Reply in the same language the customer wrote in. ${COMPANY_CONTEXT}\n${KNOWLEDGE_BLOCK}\n${OUTPUT_LANGUAGE}`,
      prompt: `Customer message:
"""
{{input.message}}
"""
Internal context: {{input.context}}
Tone: {{input.tone}}

Write: 1) a full email reply (acknowledge, explain, concrete next step with date, compensation only if the context allows it), 2) a 2-3 sentence chat version, 3) one line "Internal note" flagging anything a manager should act on. Never promise anything not supported by the context or company documents.`,
    },
  ],
};

export const policyAssistant: WorkflowDef = {
  id: 'policy-assistant',
  version: 1,
  kind: 'chat',
  category: 'hr',
  icon: 'BookOpenCheck',
  name: { vi: 'Trợ lý hỏi đáp nội quy công ty', en: 'Company policy assistant' },
  tagline: { vi: 'Nhân viên hỏi, AI trả lời theo đúng tài liệu nội bộ', en: 'Staff ask, the AI answers from your own documents' },
  description: {
    vi: 'Một trợ lý chat đọc tài liệu nội bộ (nội quy, chính sách nghỉ phép, quy trình) và trả lời câu hỏi của nhân viên. Không bịa, chỉ trả lời theo tài liệu.',
    en: 'A chat assistant that reads your internal documents (handbook, leave policy, procedures) and answers staff questions without making things up.',
  },
  tags: ['hr', 'operations', 'knowledge'],
  minutesSavedPerRun: 8,
  useKnowledge: true,
  inputs: [],
  steps: [],
  chat: {
    system: `You are {{company}}'s internal policy assistant. Answer staff questions using ONLY the company documents below. If the answer is not in the documents, say so plainly and suggest who to ask (HR or the line manager). Quote the relevant line when useful. Be brief and friendly. Answer in {{language}} unless the user writes in another language.\n${KNOWLEDGE_BLOCK}`,
    greeting: { vi: 'Xin chào! Tôi trả lời các câu hỏi về nội quy và chính sách công ty dựa trên tài liệu nội bộ. Bạn muốn hỏi gì?', en: 'Hi! I answer questions about company policies using our internal documents. What would you like to know?' },
    starters: [
      { vi: 'Tôi được nghỉ phép năm bao nhiêu ngày?', en: 'How many annual leave days do I get?' },
      { vi: 'Quy trình xin làm việc từ xa như thế nào?', en: 'How do I request remote work?' },
      { vi: 'Chi phí công tác được thanh toán những gì?', en: 'What travel expenses are reimbursed?' },
    ],
  },
};

export const generalAssistant: WorkflowDef = {
  id: 'company-assistant',
  version: 1,
  kind: 'chat',
  category: 'general',
  icon: 'Sparkles',
  name: { vi: 'Trợ lý AI của công ty', en: 'Company AI assistant' },
  tagline: { vi: 'Hỏi bất cứ việc gì trong công việc hằng ngày', en: 'Ask anything about everyday work' },
  description: {
    vi: 'Trợ lý đa năng đã hiểu bối cảnh công ty bạn: soạn văn bản, dịch, tóm tắt, lên kế hoạch, giải thích khái niệm. Dành cho người mới bắt đầu với AI.',
    en: 'A general assistant that already knows your company context: drafting, translating, summarizing, planning, explaining. Built for AI beginners.',
  },
  tags: ['general'],
  minutesSavedPerRun: 10,
  useKnowledge: true,
  inputs: [],
  steps: [],
  chat: {
    system: `You are a patient, practical work assistant for staff at {{company}} ({{industry}}). Many users are trying AI for the first time: keep answers short, concrete and formatted for easy reading; offer one follow-up suggestion at the end. Answer in {{language}} unless the user writes in another language.\n${COMPANY_CONTEXT}\n${KNOWLEDGE_BLOCK}`,
    greeting: { vi: 'Chào bạn! Tôi là trợ lý AI của công ty. Hãy thử hỏi tôi soạn email, tóm tắt tài liệu, hoặc lên kế hoạch cho một việc.', en: 'Hello! I am your company AI assistant. Try asking me to draft an email, summarize a document or plan a task.' },
    starters: [
      { vi: 'Soạn email nhắc khách thanh toán hoá đơn quá hạn 10 ngày', en: 'Draft an email reminding a customer about an invoice 10 days overdue' },
      { vi: 'Giải thích AI có thể giúp gì cho phòng kế toán', en: 'Explain what AI can do for the accounting team' },
      { vi: 'Lên checklist onboarding nhân viên mới trong tuần đầu', en: 'Create a first-week onboarding checklist for a new hire' },
    ],
  },
};
