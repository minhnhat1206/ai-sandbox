import type { InputField, KnowledgeDoc, Lang, WorkflowDef, WorkflowOverride, Workspace } from '../types.ts';

export interface TemplateContext {
  input: Record<string, string>;
  steps: Record<string, string>;
  knowledge: string;
  company: string;
  industry: string;
  brief: string;
  lang: Lang;
  language: string;
  /** Connected data-source catalogue for agent prompts. */
  sources?: string;
}

const LANGUAGE_NAME: Record<Lang, string> = { vi: 'Vietnamese (Tiếng Việt)', en: 'English' };

export function languageName(lang: Lang): string {
  return LANGUAGE_NAME[lang];
}

/**
 * Minimal, safe template renderer. Supports {{input.key}}, {{steps.id}},
 * {{knowledge}}, {{company}}, {{industry}}, {{brief}}, {{lang}}, {{language}}.
 * Unknown variables render as an empty string (never throw mid-run).
 */
export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, path: string) => {
    const [head, ...rest] = path.split('.');
    const key = rest.join('.');
    switch (head) {
      case 'input':
        return ctx.input[key] ?? '';
      case 'steps':
        return ctx.steps[key] ?? '';
      case 'knowledge':
        return ctx.knowledge;
      case 'company':
        return ctx.company;
      case 'industry':
        return ctx.industry;
      case 'brief':
        return ctx.brief;
      case 'lang':
        return ctx.lang;
      case 'language':
        return ctx.language;
      case 'sources':
        return ctx.sources ?? '(no connected data sources)';
      default:
        return '';
    }
  });
}

export function formatKnowledge(docs: KnowledgeDoc[]): string {
  if (!docs.length) return '(no company documents provided)';
  return docs
    .map((d) => `### ${d.title}\n${d.content.trim()}`)
    .join('\n\n');
}

export function buildContext(
  ws: Pick<Workspace, 'company' | 'industry' | 'brief' | 'knowledge'>,
  lang: Lang,
  input: Record<string, string>,
  useKnowledge: boolean,
): TemplateContext {
  return {
    input,
    steps: {},
    knowledge: useKnowledge ? formatKnowledge(ws.knowledge) : '',
    company: ws.company,
    industry: ws.industry,
    brief: ws.brief,
    lang,
    language: languageName(lang),
  };
}

export interface ValidationError {
  key: string;
  message: { vi: string; en: string };
}

export function validateInputs(fields: InputField[], input: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of fields) {
    const v = (input[f.key] ?? '').trim();
    if (f.required && !v) {
      errors.push({ key: f.key, message: { vi: `Vui lòng nhập "${f.label.vi}"`, en: `Please fill in "${f.label.en}"` } });
      continue;
    }
    if (v && f.type === 'file' && !/^upl_[a-z0-9]+$/.test(v)) {
      errors.push({ key: f.key, message: { vi: `Tệp "${f.label.vi}" chưa được tải lên`, en: `File "${f.label.en}" was not uploaded` } });
    }
    if (v && f.type === 'number' && Number.isNaN(Number(v))) {
      errors.push({ key: f.key, message: { vi: `"${f.label.vi}" phải là số`, en: `"${f.label.en}" must be a number` } });
    }
    if (v && f.type === 'select' && f.options && !f.options.some((o) => o.value === v)) {
      errors.push({ key: f.key, message: { vi: `Giá trị không hợp lệ cho "${f.label.vi}"`, en: `Invalid value for "${f.label.en}"` } });
    }
    if (v.length > 20000) {
      errors.push({ key: f.key, message: { vi: `"${f.label.vi}" quá dài (tối đa 20.000 ký tự)`, en: `"${f.label.en}" is too long (max 20,000 characters)` } });
    }
  }
  return errors;
}

/** Sample inputs for a workflow, honouring workspace overrides. */
export function sampleInputs(wf: WorkflowDef, override?: WorkflowOverride): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of wf.inputs) out[f.key] = override?.samples?.[f.key] ?? f.sample;
  return out;
}

/** Apply a workspace override to a catalog workflow, returning a new definition. */
export function applyOverride(wf: WorkflowDef, override?: WorkflowOverride): WorkflowDef {
  if (!override) return wf;
  const steps = wf.steps.map((s) => ({ ...s, ...(override.steps?.[s.id] ?? {}) }));
  const inputs = wf.inputs.map((f) => ({ ...f, sample: override.samples?.[f.key] ?? f.sample }));
  const chat = wf.chat ? { ...wf.chat, system: override.chatSystem ?? wf.chat.system } : undefined;
  return { ...wf, steps, inputs, chat };
}
