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
  status: WorkspaceStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
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
  provider: { name: string; model: string; isDemo: boolean };
  recentRuns: Run[];
  recentLeads: Lead[];
}
