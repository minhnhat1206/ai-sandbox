import type { Lang } from '../../shared/types.ts';
import { runMockAgent } from './mock-agents.ts';
import type { AgentHooks, AgentRequest, CompletionRequest, CompletionResult, Provider } from './types.ts';

/**
 * Deterministic demo provider. Runs with zero keys so the whole platform can be
 * exercised (and tested) offline. Output is clearly labelled as demo output.
 * For a few workflows it does real parsing/arithmetic so the demo is credible.
 */
export class MockProvider implements Provider {
  readonly name = 'mock';
  readonly model = 'mock-demo';
  readonly isDemo = true;

  constructor(private readonly delayMs = 6) {}

  async complete(req: CompletionRequest, onDelta: (t: string) => void, signal?: AbortSignal): Promise<CompletionResult> {
    const text = renderMock(req);
    const inputTokens = Math.ceil((req.system.length + req.messages.reduce((n, m) => n + m.content.length, 0)) / 4);
    // Stream in small word chunks so the UI shows real streaming behaviour.
    const chunks = text.match(/\S+\s*|\s+/g) ?? [text];
    for (const c of chunks) {
      if (signal?.aborted) break;
      onDelta(c);
      if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    }
    return { text, inputTokens, outputTokens: Math.ceil(text.length / 4) };
  }

  async runAgent(req: AgentRequest, hooks: AgentHooks, signal?: AbortSignal): Promise<CompletionResult> {
    const text = await runMockAgent(req, hooks, this.delayMs, signal);
    const inputTokens = Math.ceil((req.system.length + req.messages.reduce((n, m) => n + m.content.length, 0)) / 4);
    return { text, inputTokens, outputTokens: Math.ceil(text.length / 4) + 400 };
  }

  async completeText(_system: string, user: string): Promise<string> {
    return draftWorkflowJson(user);
  }
}

const T = (lang: Lang, vi: string, en: string) => (lang === 'vi' ? vi : en);

/**
 * Plain (non-agent) completions only happen for custom workflows a founder adds without
 * an agent spec, or chats without tools. Every catalog workflow is an agent and is
 * handled by the scripted agents in mock-agents.ts.
 */
function renderMock(req: CompletionRequest): string {
  const { stepId, lang, inputs } = req.meta;
  const last = req.messages[req.messages.length - 1]?.content ?? '';
  const body = stepId === 'chat' ? mockChat(last, lang) : mockGeneric(inputs, lang);
  return `${body}\n\n---\n*${T(lang, 'Kết quả demo (chưa kết nối AI thật). Khi bật Claude, nội dung sẽ được tạo từ dữ liệu bạn nhập.', 'Demo output (real AI not connected). With Claude enabled, this is generated from your actual input.')}*`;
}

function mockChat(user: string, lang: Lang): string {
  const q = user.trim().slice(0, 140);
  return T(lang,
    `Tôi hiểu bạn cần: *"${q}"*.\n\n1. Làm rõ mục tiêu và người nhận.\n2. Soạn bản nháp ngắn gọn, đúng giọng văn công ty.\n3. Gợi ý 1–2 điểm cần kiểm tra lại trước khi gửi.\n\nBạn muốn tôi bắt đầu từ bước nào?`,
    `I understand you need: *"${q}"*.\n\n1. Clarify the goal and audience.\n2. Draft a short version in your company tone.\n3. Point out 1–2 things to double-check.\n\nWhere should I start?`);
}

function mockGeneric(inputs: Record<string, string>, lang: Lang): string {
  const lines = Object.entries(inputs).map(([k, v]) => `- **${k}**: ${v.slice(0, 160)}${v.length > 160 ? '…' : ''}`);
  return T(lang,
    `## Kết quả\nDựa trên thông tin bạn cung cấp, đây là bản nháp đầu tiên.\n\n### Dữ liệu đã nhận\n${lines.join('\n')}\n\n### Nội dung\n1. Mở đầu nêu rõ mục tiêu và đối tượng.\n2. Phần thân trình bày các ý chính, mỗi ý một câu.\n3. Kết thúc bằng một hành động cụ thể cho người đọc.`,
    `## Result\nBased on what you provided, here is a first draft.\n\n### Inputs received\n${lines.join('\n')}\n\n### Content\n1. Open with the goal and the audience.\n2. Body in short bullets, one idea each.\n3. Close with one concrete action for the reader.`);
}

/** Mock "agent" that drafts a workflow definition from a brief (admin tooling). */
function draftWorkflowJson(user: string): string {
  const brief = user.replace(/^\s*Prospect brief:\s*/i, '').trim();
  const short = brief.trim().split(/\r?\n/)[0]?.slice(0, 60) || 'Custom workflow';
  const id = short.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'custom-workflow';
  const wf = {
    id: `custom-${id}`,
    version: 1,
    kind: 'form',
    category: 'general',
    icon: 'Wand2',
    name: { vi: short, en: short },
    tagline: { vi: 'Quy trình được thiết kế riêng từ mô tả của bạn', en: 'A workflow drafted from your brief' },
    description: { vi: brief.slice(0, 300), en: brief.slice(0, 300) },
    tags: ['custom'],
    minutesSavedPerRun: 20,
    useKnowledge: true,
    inputs: [
      { key: 'content', label: { vi: 'Nội dung đầu vào', en: 'Input content' }, type: 'textarea', required: true, rows: 8, sample: 'Dán nội dung cần xử lý vào đây.' },
      { key: 'goal', label: { vi: 'Mục tiêu', en: 'Goal' }, type: 'text', sample: 'Tóm tắt và đề xuất bước tiếp theo' },
    ],
    steps: [
      {
        id: 'main',
        title: { vi: 'Xử lý', en: 'Process' },
        system: `You help {{company}} with this task: ${brief.replace(/\s+/g, ' ').slice(0, 400)}. Use company documents when relevant:\n{{knowledge}}\nWrite in {{language}} using clean Markdown.`,
        prompt: 'Goal: {{input.goal}}\n\nContent:\n"""\n{{input.content}}\n"""\n\nProduce a complete, ready-to-use result with headings and a short list of things to double-check.',
      },
    ],
  };
  return JSON.stringify(wf, null, 2);
}
