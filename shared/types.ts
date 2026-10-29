/**
 * Shared domain types used by the browser app, the API server and tests.
 * Keep this file dependency-free.
 */

export type Lang = 'vi' | 'en';

/** A string that exists in both languages. */
export interface L {
  vi: string;
  en: string;
}

export type WorkflowKind = 'form' | 'chat';

export type WorkflowCategory =
  | 'operations'
  | 'sales'
  | 'marketing'
  | 'finance'
  | 'hr'
  | 'customer-service'
  | 'management'
  | 'general';

export type InputType = 'text' | 'textarea' | 'select' | 'number' | 'file';

/** Server-side tools an agent step may call (see server/tools). */
export type ToolName =
  | 'query_records'
  | 'aggregate_records'
  | 'search_knowledge'
  | 'create_ticket'
  | 'draft_email'
  | 'calculate'
  | 'create_artifact'
  | 'web_search';

/** Anthropic Agent Skills (real provider): produce real office files. */
export type SkillName = 'xlsx' | 'docx' | 'pptx' | 'pdf';

export interface AgentSpec {
  tools: ToolName[];
  skills?: SkillName[];
  /** Max model turns (tool rounds). Default 8. */
  maxTurns?: number;
}

export interface InputField {
  key: string;
  label: L;
  type: InputType;
  required?: boolean;
  placeholder?: L;
  help?: L;
  options?: { value: string; label: L }[];
  /** Pre-filled example so a nervous first-time user can just press Run. */
  sample: string;
  rows?: number;
  /** For type = 'file': accepted extensions, e.g. ".pdf,.csv,.txt". */
  accept?: string;
}

export interface WorkflowStep {
  id: string;
  title: L;
  /** System prompt for the model. May use template variables. */
  system: string;
  /** User prompt template. Variables: {{input.key}}, {{steps.id}}, {{knowledge}}, {{company}}, {{lang}}, {{language}} */
  prompt: string;
  maxTokens?: number;
  /** When set, the step runs as an agent loop with these tools instead of a single completion. */
  agent?: AgentSpec;
}

export interface WorkflowDef {
  id: string;
  version: number;
  kind: WorkflowKind;
  category: WorkflowCategory;
  icon: string;
  name: L;
  tagline: L;
  description: L;
  /** Which business role this helps, for the gallery filter. */
  tags: string[];
  /** Estimated minutes a human saves per run; feeds the "hours saved" metric. */
  minutesSavedPerRun: number;
  /** Include workspace knowledge documents in the prompt context. */
  useKnowledge?: boolean;
  inputs: InputField[];
  /** For kind = 'form'. Executed in order; later steps can read earlier outputs. */
  steps: WorkflowStep[];
  /** For kind = 'chat'. */
  chat?: {
    system: string;
    starters: L[];
    greeting: L;
    /** When set, each chat turn runs as an agent with these tools. */
    agent?: AgentSpec;
  };
}

/** A CSV table the prospect "connected" (pasted by us). Agents query it like a system of record. */
export interface DataSource {
  id: string;
  name: string;
  description: string;
  csv: string;
  updatedAt: string;
}

/** A remote MCP server the real provider may call through the Anthropic MCP connector. */
export interface McpServer {
  id: string;
  name: string;
  url: string;
  authToken?: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export type WorkspaceStatus = 'draft' | 'active' | 'converted' | 'archived';

export interface Workspace {
  id: string;
  /** Invite slug used in the public URL /s/:token */
  token: string;
  company: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  language: Lang;
  /** What the prospect told us: pains, goals. Shown to the model as context. */
  brief: string;
  /** Catalog workflows enabled for this sandbox. */
  workflowIds: string[];
  /** Per-workspace prompt/sample overrides keyed by workflow id. */
  overrides: Record<string, WorkflowOverride>;
  /** Workflows authored specifically for this prospect (not in the catalog). */
  customWorkflows: WorkflowDef[];
  knowledge: KnowledgeDoc[];
  dataSources: DataSource[];
  mcpServers: McpServer[];
  credits: { total: number; used: number };
  /** Hard USD cap for this prospect's trial; runs are refused once spent >= budget. */
  budgetUsd: number;
  /** Sum of costUsd over this workspace's runs. */
  spentUsd: number;
  status: WorkspaceStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  /** "Today" of the connected (synthetic) data, yyyy-mm-dd. Demo data: 2026-10-28. */
  dataAsOf?: string;
}

export interface WorkflowOverride {
  /** Replace a step's system/prompt text. */
  steps?: Record<string, Partial<Pick<WorkflowStep, 'system' | 'prompt'>>>;
  /** Replace a field's sample value. */
  samples?: Record<string, string>;
  chatSystem?: string;
  hidden?: boolean;
}

export type RunStatus = 'running' | 'done' | 'error';

export type ArtifactKind = 'html' | 'table' | 'markdown' | 'csv' | 'json' | 'file';

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  /** html / markdown / csv / json text content. */
  content?: string;
  /** For kind = 'table'. */
  columns?: string[];
  rows?: Record<string, string | number | boolean | null>[];
  /** For kind = 'file' (downloaded from the provider, stored on disk). */
  filename?: string;
  mime?: string;
  size?: number;
}

export type ActionType = 'ticket' | 'email';

/** Something the agent "did" in a connected system. Simulated in the sandbox: nothing leaves the server. */
export interface Action {
  id: string;
  type: ActionType;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  stepId: string;
  tool: string;
  input: unknown;
  output?: string;
  isError?: boolean;
  startedAt: string;
  durationMs?: number;
}

export interface UploadMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** Extracted text when available (txt/csv/md/pdf). */
  text?: string;
  createdAt: string;
}

export interface RunStepResult {
  id: string;
  title: L;
  output: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  durationMs: number;
}

export interface Run {
  id: string;
  workspaceId: string;
  workflowId: string;
  workflowName: L;
  kind: WorkflowKind;
  sessionId: string;
  visitorName: string;
  lang: Lang;
  inputs: Record<string, string>;
  steps: RunStepResult[];
  /** Final markdown output (last step, or the assistant reply for chat). */
  output: string;
  status: RunStatus;
  error?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Part of inputTokens served from the prompt cache (billed at the cache-read rate). */
  cacheReadTokens: number;
  costUsd: number;
  minutesSaved: number;
  trace: ToolCall[];
  artifacts: Artifact[];
  actions: Action[];
  rating?: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  startedAt: string;
  finishedAt?: string;
}

export type LeadType = 'book_call' | 'request_workflow' | 'feedback';

export interface Lead {
  id: string;
  workspaceId: string;
  type: LeadType;
  name: string;
  email: string;
  message: string;
  sessionId: string;
  createdAt: string;
}

/* --------------------------------------------------------------- data studio */

/** Vocabulary of one industry: everything the synthetic-data generator needs to sound like the prospect. */
export interface IndustryProfile {
  /** Preset key (e.g. "packaging") or "custom" when proposed by the AI. */
  key: string;
  /** Industry label shown in the admin, e.g. "Sản xuất bao bì nhựa". */
  label: string;
  /** Customer segments (3-4). Each becomes a price column in price_list. */
  segments: string[];
  customers: { name: string; segment: string; city: string; contact: string }[];
  products: { name: string; category: string; unit: string; price: number; supplier: string }[];
  /** Delivery methods / carriers used in orders. */
  carriers: string[];
  /** Prospects not yet customers (pipeline). */
  prospects: { name: string; segment: string }[];
  /** Typical quantity per order line [min, max]. */
  qtyRange: [number, number];
  departments: string[];
}

export type ColumnKind = 'id' | 'text' | 'person' | 'customer' | 'product' | 'enum' | 'integer' | 'money' | 'percent' | 'date' | 'email' | 'phone' | 'boolean';

/** A table in the prospect's own structure (from pasted headers, a template file or a screenshot). */
export interface ExtraTableSpec {
  name: string;
  description: string;
  rows: number;
  columns: { name: string; label: string; kind: ColumnKind; values?: string[]; min?: number; max?: number }[];
}

/** What the data studio proposes before generating anything; the founder reviews and edits it. */
export interface DataBlueprint {
  company: string;
  industry: string;
  /** "Today" in the synthetic data (yyyy-mm-dd). */
  asOf: string;
  profile: IndustryProfile;
  extraTables: ExtraTableSpec[];
  /** Catalog workflows that fit this company, in demo order. */
  workflowIds: string[];
  /** Assumptions and warnings for the founder to check. */
  notes: string[];
  source: 'ai' | 'heuristic';
}

/** Preview of what generation produced (nothing is saved until the founder applies it). */
export interface GeneratedData {
  dataSources: { name: string; description: string; csv: string; rows: number; columns: string[] }[];
  knowledge: { title: string; content: string }[];
  /** Sample inputs adapted to the generated data, keyed by workflow id. */
  samples: Record<string, Record<string, string>>;
  asOf: string;
}

/* ------------------------------------------------------------------ reports */

/** One workflow the decision maker tried, summarised for the report. */
export interface ReportHighlight {
  workflowId: string;
  name: L;
  runs: number;
  minutesSaved: number;
  avgRating: number | null;
  /** One or two sentences: what the agent did on their data. */
  headline: string;
  /** Titles of deliverables the agent produced. */
  deliverables: string[];
  /** Simulated actions (tickets, email drafts) the agent prepared. */
  actions: string[];
}

/** The paid next step proposed in the report (AI Kickstart by default). */
export interface ReportOffer {
  title: string;
  price: string;
  duration: string;
  audience: string;
  agenda: string[];
  includes: string[];
}

export type ReportStatus = 'draft' | 'published';

/** Report for the decision maker after the free trial. Written in one language. */
export interface Report {
  id: string;
  /** Random share token used in /r/:token. */
  token: string;
  workspaceId: string;
  lang: Lang;
  status: ReportStatus;
  title: string;
  preparedFor: string;
  /** Short narrative (Markdown) opening the report. */
  summary: string;
  /** What the agents found in the (synthetic) company data. */
  findings: string[];
  metrics: { runs: number; workflowsTried: number; minutesSaved: number; avgRating: number | null; ratings: number; deliverables: number; actions: number; people: number };
  highlights: ReportHighlight[];
  offer: ReportOffer;
  /** Markdown: what happens after they say yes. */
  nextSteps: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  views: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
  acceptedAt?: string;
}

/** What the public report page receives. */
export type PublicReport = Omit<Report, 'workspaceId' | 'views' | 'firstViewedAt' | 'lastViewedAt'> & { company: string };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Public view returned to a prospect. Never includes other prospects' data. */
export interface SandboxView {
  workspace: Pick<Workspace, 'id' | 'token' | 'company' | 'industry' | 'language' | 'status' | 'brief' | 'expiresAt'>;
  workflows: WorkflowDef[];
  knowledgeTitles: string[];
  dataSources: { id: string; name: string; description: string; rows: number; columns: string[] }[];
  connectors: string[];
  creditsRemaining: number;
  creditsTotal: number;
  /** True when the trial budget is used up (USD figures are never shown to prospects). */
  budgetExhausted: boolean;
  provider: { name: string; model: string; isDemo: boolean };
}

/** Server-sent events for streaming runs. */
export type RunEvent =
  | { type: 'run.started'; runId: string; creditsRemaining: number }
  | { type: 'step.started'; stepId: string; title: L; index: number; total: number }
  | { type: 'step.delta'; stepId: string; text: string }
  | { type: 'step.done'; stepId: string }
  | { type: 'tool.call'; call: ToolCall }
  | { type: 'tool.result'; id: string; output: string; isError: boolean; durationMs: number }
  | { type: 'artifact'; artifact: Artifact }
  | { type: 'action'; action: Action }
  | { type: 'run.done'; run: Run; creditsRemaining: number }
  | { type: 'error'; message: string; code?: string };

export interface AdminOverview {
  workspaces: number;
  activeWorkspaces: number;
  runs: number;
  leads: number;
  hoursSaved: number;
  avgRating: number | null;
  creditsUsed: number;
  costUsd: number;
  budgetUsd: number;
  provider: { name: string; model: string; isDemo: boolean };
  recentRuns: Run[];
  recentLeads: Lead[];
}
