import type { WorkflowDef } from '../types.ts';
import { COMPANY_CONTEXT, OUTPUT_LANGUAGE } from './_shared.ts';

export const salesOutreach: WorkflowDef = {
  id: 'sales-outreach',
  version: 1,
  kind: 'form',
  category: 'sales',
  icon: 'Send',
  name: { vi: 'Email & tin nhắn chào hàng', en: 'Sales outreach sequence' },
  tagline: { vi: '3 email + 1 tin Zalo theo đúng nỗi đau của khách', en: '3 emails + 1 chat message tailored to the buyer' },
  description: {
    vi: 'Mô tả sản phẩm và khách hàng mục tiêu. Nhận chuỗi 3 email tiếp cận và 1 tin nhắn Zalo/LinkedIn ngắn, kèm tiêu đề thử A/B.',
    en: 'Describe your offer and target buyer. Get a 3-email sequence plus one short Zalo/LinkedIn message, with A/B subject lines.',
  },
  tags: ['sales', 'marketing'],
  minutesSavedPerRun: 45,
  inputs: [
    { key: 'product', label: { vi: 'Sản phẩm / dịch vụ', en: 'Product / service' }, type: 'textarea', required: true, rows: 4,
      sample: 'Dịch vụ cho thuê xe tải kèm tài xế theo tháng cho doanh nghiệp phân phối hàng tiêu dùng tại TP.HCM. Cam kết giao đúng giờ 98%, có app theo dõi xe.' },
    { key: 'target', label: { vi: 'Khách hàng mục tiêu', en: 'Target buyer' }, type: 'text', required: true,
      sample: 'Trưởng phòng logistics tại công ty phân phối FMCG 100-500 nhân viên' },
    { key: 'pain', label: { vi: 'Nỗi đau của họ', en: 'Their pain' }, type: 'text', sample: 'Xe hay trễ, khó kiểm soát chi phí xăng và tài xế' },
    { key: 'tone', label: { vi: 'Giọng văn', en: 'Tone' }, type: 'select', sample: 'friendly',
      options: [
        { value: 'friendly', label: { vi: 'Thân thiện', en: 'Friendly' } },
        { value: 'formal', label: { vi: 'Trang trọng', en: 'Formal' } },
        { value: 'direct', label: { vi: 'Ngắn gọn, đi thẳng', en: 'Direct' } },
      ] },
  ],
  steps: [
    {
      id: 'sequence',
      title: { vi: 'Soạn chuỗi tin nhắn', en: 'Write the sequence' },
      system: `You are a B2B sales copywriter who writes like a human, not a brochure. ${COMPANY_CONTEXT}\n${OUTPUT_LANGUAGE}`,
      prompt: `Offer: {{input.product}}
Target buyer: {{input.target}}
Their pain: {{input.pain}}
Tone: {{input.tone}}

Write: Email 1 (first touch, under 120 words, 2 subject line options), Email 2 (follow-up 4 days later with one proof point), Email 3 (break-up email), and a 2-sentence Zalo/LinkedIn message. Each email ends with one low-friction question. Avoid hype words.`,
    },
  ],
};

export const socialPost: WorkflowDef = {
  id: 'social-post',
  version: 1,
  kind: 'form',
  category: 'marketing',
  icon: 'Megaphone',
  name: { vi: 'Bài đăng Facebook / LinkedIn', en: 'Social media posts' },
  tagline: { vi: 'Một ý tưởng → 3 bài đăng, 2 ngôn ngữ', en: 'One idea → three posts in two languages' },
  description: {
    vi: 'Nhập thông tin sản phẩm hoặc tin tức công ty. Nhận 3 phiên bản bài đăng (kể chuyện, lợi ích, ngắn gọn) bằng tiếng Việt và tiếng Anh.',
    en: 'Enter product info or company news. Get three post variants (story, benefits, short) in Vietnamese and English.',
  },
  tags: ['marketing', 'sales'],
  minutesSavedPerRun: 30,
  inputs: [
    { key: 'topic', label: { vi: 'Nội dung muốn đăng', en: 'What to announce' }, type: 'textarea', required: true, rows: 5,
      sample: 'Khai trương kho mới 2.000 m2 tại Bình Dương, giao hàng khu vực Đông Nam Bộ nhanh hơn 1 ngày. Ưu đãi miễn phí giao hàng tháng đầu cho khách mới.' },
    { key: 'platform', label: { vi: 'Nền tảng', en: 'Platform' }, type: 'select', sample: 'facebook',
      options: [
        { value: 'facebook', label: { vi: 'Facebook', en: 'Facebook' } },
        { value: 'linkedin', label: { vi: 'LinkedIn', en: 'LinkedIn' } },
        { value: 'zalo', label: { vi: 'Zalo OA', en: 'Zalo OA' } },
      ] },
  ],
  steps: [
    {
      id: 'posts',
      title: { vi: 'Viết bài', en: 'Write posts' },
      system: `You are a bilingual (Vietnamese/English) social media writer for SMEs. ${COMPANY_CONTEXT}`,
      prompt: `Platform: {{input.platform}}
Content: {{input.topic}}

Write three post variants: (A) storytelling, (B) benefits list, (C) short punchy. For each, give the Vietnamese version then the English version. Match the platform's style (hashtags for Facebook/LinkedIn, none for Zalo). Add one suggested image idea per variant. Use Markdown headings for A/B/C.`,
    },
  ],
};
