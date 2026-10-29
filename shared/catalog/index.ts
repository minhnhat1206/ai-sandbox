import type { WorkflowDef } from '../types.ts';
import { dataCleanup, documentReview, excelBuilder, inventoryAgent, meetingPrepAgent, orderCareAgent, receivablesAgent, weeklyOpsAgent } from './agents.ts';
import { aiPolicy, aiReadiness, bankRecon, dataChat, expenseAudit, inboxTriage, monthlyDeck, onboardingAgent, pipelineReview, policyHelpdesk, quoteBuilder, supplierCompare, vocInsights } from './agents-more.ts';

/**
 * Every workflow template we can enable in a sandbox. Order = gallery order:
 * the most immediately impressive, data-connected agents first.
 * All are agents: they call tools on connected data, take actions and publish deliverables.
 */
export const CATALOG: WorkflowDef[] = [
  orderCareAgent,
  quoteBuilder,
  inboxTriage,
  receivablesAgent,
  bankRecon,
  dataChat,
  weeklyOpsAgent,
  monthlyDeck,
  pipelineReview,
  meetingPrepAgent,
  vocInsights,
  inventoryAgent,
  supplierCompare,
  expenseAudit,
  onboardingAgent,
  policyHelpdesk,
  aiReadiness,
  aiPolicy,
  documentReview,
  dataCleanup,
  excelBuilder,
];

export const CATALOG_BY_ID: Record<string, WorkflowDef> = Object.fromEntries(CATALOG.map((w) => [w.id, w]));

export function getCatalogWorkflow(id: string): WorkflowDef | undefined {
  return CATALOG_BY_ID[id];
}
