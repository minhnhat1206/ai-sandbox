import { describe, expect, it } from 'vitest';
import { CATALOG } from '../shared/catalog/index.ts';
import { applyOverride, buildContext, renderTemplate, sampleInputs, validateInputs } from '../shared/engine/template.ts';
import { validateCatalog, validateWorkflow } from '../shared/engine/validate.ts';
import { estimateCostUsd } from '../shared/engine/pricing.ts';
import type { WorkflowDef } from '../shared/types.ts';

const ws = { company: 'ACME', industry: 'Logistics', brief: 'Slow replies', knowledge: [{ id: 'k1', title: 'Policy', content: '12 days leave', updatedAt: '' }] };

describe('renderTemplate', () => {
  it('fills every supported variable and blanks unknown ones', () => {
    const ctx = buildContext(ws, 'vi', { name: 'Minh' }, true);
    ctx.steps.first = 'STEP1';
    const out = renderTemplate('{{company}}|{{industry}}|{{brief}}|{{input.name}}|{{steps.first}}|{{lang}}|{{language}}|{{nope.x}}|{{input.missing}}', ctx);
    expect(out).toBe('ACME|Logistics|Slow replies|Minh|STEP1|vi|Vietnamese (Tiếng Việt)||');
    expect(renderTemplate('{{knowledge}}', ctx)).toContain('### Policy');
  });
  it('omits knowledge when the workflow does not use it', () => {
    const ctx = buildContext(ws, 'en', {}, false);
    expect(renderTemplate('[{{knowledge}}]', ctx)).toBe('[]');
  });
});

describe('validateInputs', () => {
  const fields = CATALOG.find((w) => w.id === 'weekly-report')!.inputs;
  it('requires required fields and validates selects', () => {
    expect(validateInputs(fields, { notes: '', audience: 'ceo' })).toHaveLength(1);
    expect(validateInputs(fields, { notes: 'x', audience: 'bogus' })[0].key).toBe('audience');
    expect(validateInputs(fields, { notes: 'x', audience: 'ceo' })).toEqual([]);
  });
  it('rejects oversized input', () => {
    expect(validateInputs(fields, { notes: 'a'.repeat(20001), audience: 'ceo' })[0].message.en).toMatch(/too long/);
  });
});

describe('catalog', () => {
  it('is structurally valid and every form workflow has samples that pass validation', () => {
    expect(validateCatalog(CATALOG)).toEqual([]);
    for (const wf of CATALOG.filter((w) => w.kind === 'form')) {
      expect(validateInputs(wf.inputs, sampleInputs(wf)), wf.id).toEqual([]);
    }
  });
  it('catches broken definitions', () => {
    const bad = { ...CATALOG[1], id: 'Bad Id', steps: [{ id: 's', title: { vi: 'a', en: 'b' }, system: 'x', prompt: '{{input.unknown}} {{steps.later}}' }] } as WorkflowDef;
    const errs = validateWorkflow(bad);
    expect(errs.some((e) => e.includes('kebab-case'))).toBe(true);
    expect(errs.some((e) => e.includes('unknown input'))).toBe(true);
    expect(errs.some((e) => e.includes('does not run before'))).toBe(true);
  });
});

describe('applyOverride', () => {
  it('replaces prompts and samples without mutating the catalog', () => {
    const wf = CATALOG.find((w) => w.id === 'weekly-report')!;
    const out = applyOverride(wf, { steps: { report: { prompt: 'NEW' } }, samples: { notes: 'S' } });
    expect(out.steps[0].prompt).toBe('NEW');
    expect(out.inputs[0].sample).toBe('S');
    expect(wf.steps[0].prompt).not.toBe('NEW');
    expect(sampleInputs(wf, { samples: { notes: 'S' } }).notes).toBe('S');
  });
});

describe('pricing', () => {
  it('computes cost from known rates and zero for mock', () => {
    expect(estimateCostUsd('claude-opus-5-5', 1_000_000, 0)).toBe(4);
    expect(estimateCostUsd('mock-demo', 1000, 1000)).toBe(0);
  });
});
