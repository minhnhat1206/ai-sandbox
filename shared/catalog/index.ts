import type { WorkflowDef } from '../types.ts';
import { dataInsight, meetingNotes, weeklyReport } from './operations.ts';
import { salesOutreach, socialPost } from './sales.ts';
import { customerReply, generalAssistant, policyAssistant } from './customer-service.ts';
import { invoiceExtract, jobDescription, translateLocalize } from './hr-finance.ts';
import { AGENT_WORKFLOWS } from './agents.ts';

/** Every workflow template we can enable in a sandbox. Order = gallery order. */
export const CATALOG: WorkflowDef[] = [
  ...AGENT_WORKFLOWS,
  generalAssistant,
  customerReply,
  weeklyReport,
  meetingNotes,
  policyAssistant,
  salesOutreach,
  invoiceExtract,
  dataInsight,
  jobDescription,
  socialPost,
  translateLocalize,
];

export const CATALOG_BY_ID: Record<string, WorkflowDef> = Object.fromEntries(CATALOG.map((w) => [w.id, w]));

export function getCatalogWorkflow(id: string): WorkflowDef | undefined {
  return CATALOG_BY_ID[id];
}
