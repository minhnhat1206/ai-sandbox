import type { WorkflowDef } from '../types.ts';
import { WORKFLOW_ICONS } from '../icons.ts';

const ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;
const CATEGORIES = new Set(['operations', 'sales', 'marketing', 'finance', 'hr', 'customer-service', 'general']);
const TOOLS = new Set(['query_records', 'aggregate_records', 'search_knowledge', 'create_ticket', 'draft_email', 'calculate', 'create_artifact', 'web_search']);
const SKILLS = new Set(['xlsx', 'docx', 'pptx', 'pdf']);

function isL(v: unknown): v is { vi: string; en: string } {
  return !!v && typeof v === 'object' && typeof (v as { vi?: unknown }).vi === 'string' && typeof (v as { en?: unknown }).en === 'string'
    && (v as { vi: string }).vi.trim().length > 0 && (v as { en: string }).en.trim().length > 0;
}

/**
 * Structural validation for a workflow definition. Returns a list of human
 * readable problems; an empty list means the definition is usable.
 */
export function validateWorkflow(wf: unknown): string[] {
  const errs: string[] = [];
  if (!wf || typeof wf !== 'object') return ['workflow must be an object'];
  const w = wf as Partial<WorkflowDef> & Record<string, unknown>;
  const at = (msg: string) => errs.push(`${typeof w.id === 'string' ? w.id : '<no id>'}: ${msg}`);

  if (typeof w.id !== 'string' || !ID_RE.test(w.id)) at('id must be kebab-case (a-z, 0-9, -), 2-64 chars');
  if (typeof w.version !== 'number' || w.version < 1) at('version must be a positive number');
  if (w.kind !== 'form' && w.kind !== 'chat') at("kind must be 'form' or 'chat'");
  if (typeof w.category !== 'string' || !CATEGORIES.has(w.category)) at(`category must be one of ${[...CATEGORIES].join(', ')}`);
  if (typeof w.icon !== 'string' || !(WORKFLOW_ICONS as readonly string[]).includes(w.icon)) at(`icon must be one of: ${WORKFLOW_ICONS.join(', ')}`);
  for (const k of ['name', 'tagline', 'description'] as const) {
    if (!isL(w[k])) at(`${k} must have non-empty vi and en`);
  }
  if (!Array.isArray(w.tags)) at('tags must be an array');
  if (typeof w.minutesSavedPerRun !== 'number' || w.minutesSavedPerRun <= 0) at('minutesSavedPerRun must be > 0');

  if (!Array.isArray(w.inputs)) {
    at('inputs must be an array');
  } else {
    const keys = new Set<string>();
    w.inputs.forEach((f, i) => {
      if (!f || typeof f !== 'object') return at(`inputs[${i}] must be an object`);
      if (typeof f.key !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(f.key)) at(`inputs[${i}].key must be an identifier`);
      else if (keys.has(f.key)) at(`inputs[${i}].key "${f.key}" is duplicated`);
      else keys.add(f.key);
      if (!isL(f.label)) at(`inputs[${i}].label must have vi and en`);
      if (!['text', 'textarea', 'select', 'number', 'file'].includes(f.type)) at(`inputs[${i}].type is invalid`);
      if (f.type === 'file' && f.required) at(`inputs[${i}] file inputs must be optional (pair them with a textarea sample so the 2-click demo works)`);
      if (typeof f.sample !== 'string') at(`inputs[${i}].sample is required (string) so first-time users can run with one click`);
      if (f.type === 'select') {
        if (!Array.isArray(f.options) || f.options.length === 0) at(`inputs[${i}] select needs options`);
        else if (!f.options.some((o) => o.value === f.sample)) at(`inputs[${i}].sample must match one of the options`);
      }
    });
  }

  if (w.kind === 'form') {
    if (!Array.isArray(w.steps) || w.steps.length === 0) {
      at('form workflows need at least one step');
    } else {
      const seen = new Set<string>();
      w.steps.forEach((s, i) => {
        if (!s || typeof s !== 'object') return at(`steps[${i}] must be an object`);
        if (typeof s.id !== 'string' || !ID_RE.test(s.id)) at(`steps[${i}].id must be kebab-case`);
        else if (seen.has(s.id)) at(`steps[${i}].id "${s.id}" is duplicated`);
        else seen.add(s.id);
        if (!isL(s.title)) at(`steps[${i}].title must have vi and en`);
        if (typeof s.system !== 'string' || !s.system.trim()) at(`steps[${i}].system is required`);
        if (typeof s.prompt !== 'string' || !s.prompt.trim()) at(`steps[${i}].prompt is required`);
        if (s.agent !== undefined) {
          if (!s.agent || typeof s.agent !== 'object' || !Array.isArray(s.agent.tools) || s.agent.tools.length === 0) at(`steps[${i}].agent.tools must be a non-empty list`);
          else {
            for (const tname of s.agent.tools) if (!TOOLS.has(tname)) at(`steps[${i}].agent uses unknown tool "${tname}"`);
            if (s.agent.skills) for (const sk of s.agent.skills) if (!SKILLS.has(sk)) at(`steps[${i}].agent uses unknown skill "${sk}"`);
            if (s.agent.skills?.length && s.agent.tools.includes('web_search')) at(`steps[${i}].agent cannot combine web_search with skills (both need code execution)`);
            if (s.agent.maxTurns !== undefined && (typeof s.agent.maxTurns !== 'number' || s.agent.maxTurns < 1 || s.agent.maxTurns > 20)) at(`steps[${i}].agent.maxTurns must be 1-20`);
          }
        }
        // Referenced variables must exist.
        const refs = `${s.system}\n${s.prompt}`.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g);
        for (const m of refs) {
          const [head, key] = m[1].split('.');
          if (head === 'input' && Array.isArray(w.inputs) && !w.inputs.some((f) => f && f.key === key)) at(`steps[${i}] references unknown input "${key}"`);
          if (head === 'steps' && !seen.has(key)) at(`steps[${i}] references step "${key}" which does not run before it`);
          if (head === 'knowledge' && !w.useKnowledge) at(`steps[${i}] uses {{knowledge}} but useKnowledge is not true`);
        }
      });
    }
  }
  if (w.kind === 'chat') {
    if (!w.chat || typeof w.chat !== 'object') at('chat workflows need a chat block');
    else {
      if (typeof w.chat.system !== 'string' || !w.chat.system.trim()) at('chat.system is required');
      if (!isL(w.chat.greeting)) at('chat.greeting must have vi and en');
      if (!Array.isArray(w.chat.starters) || w.chat.starters.length === 0 || !w.chat.starters.every(isL)) at('chat.starters must be a non-empty bilingual list');
    }
  }
  return errs;
}

export function validateCatalog(list: WorkflowDef[]): string[] {
  const errs = list.flatMap(validateWorkflow);
  const ids = new Set<string>();
  for (const w of list) {
    if (ids.has(w.id)) errs.push(`${w.id}: duplicated id in catalog`);
    ids.add(w.id);
  }
  return errs;
}
