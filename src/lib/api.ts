import type { AdminOverview, ChatMessage, DataBlueprint, GeneratedData, Lang, Lead, LeadType, PublicReport, Report, Run, RunEvent, SandboxView, WorkflowDef, Workspace } from '@shared/types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
  }
}

async function request<T>(url: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(init.headers as Record<string, string> | undefined) };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!res.ok) throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, body.code);
  return body;
}

// ---- visitor identity (no account; one id per browser) ---------------------------------
const SESSION_KEY = 'sandbox.session';
const NAME_KEY = 'sandbox.visitorName';

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'v_anonymous';
  }
}
export function getVisitorName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; }
}
export function setVisitorName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
}

// ---- public sandbox ---------------------------------------------------------------------
export const sandboxApi = {
  view: (token: string) => request<SandboxView>(`/api/sandbox/${encodeURIComponent(token)}`),
  workflow: (token: string, id: string) => request<{ workflow: WorkflowDef; sample: Record<string, string> }>(`/api/sandbox/${encodeURIComponent(token)}/workflows/${encodeURIComponent(id)}`),
  myRuns: (token: string) => request<{ runs: Run[] }>(`/api/sandbox/${encodeURIComponent(token)}/runs?sessionId=${encodeURIComponent(getSessionId())}`),
  feedback: (token: string, runId: string, rating: number, feedback?: string) =>
    request<{ ok: true }>(`/api/sandbox/${encodeURIComponent(token)}/runs/${encodeURIComponent(runId)}/feedback`, { method: 'POST', body: JSON.stringify({ rating, feedback }) }),
  lead: (token: string, data: { type: LeadType; name: string; email: string; message: string }) =>
    request<{ ok: true; lead: Lead }>(`/api/sandbox/${encodeURIComponent(token)}/leads`, { method: 'POST', body: JSON.stringify({ ...data, sessionId: getSessionId() }) }),
};

/**
 * Open a streaming run and dispatch parsed events. Resolves when the stream ends.
 * Throws ApiError if the server rejects the request before streaming.
 */
export async function streamRun(
  token: string,
  kind: 'runs' | 'chat',
  payload: { workflowId: string; lang: Lang; inputs?: Record<string, string>; messages?: ChatMessage[] },
  onEvent: (e: RunEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`/api/sandbox/${encodeURIComponent(token)}/${kind}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, sessionId: getSessionId(), visitorName: getVisitorName() }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, body.code);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = chunk.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n');
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as RunEvent);
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}

/** Upload a file for a `file` input; returns the upload id to place in the inputs map. */
export async function uploadFile(token: string, file: File): Promise<{ id: string; name: string; mime: string; size: number; hasText: boolean }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/sandbox/${encodeURIComponent(token)}/uploads`, { method: 'POST', body: form });
  const body = (await res.json().catch(() => ({}))) as { error?: string; upload?: { id: string; name: string; mime: string; size: number; hasText: boolean } };
  if (!res.ok || !body.upload) throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status);
  return body.upload;
}

// ---- report for the decision maker --------------------------------------------------------
export const reportApi = {
  get: (token: string, preview = false) => request<{ report: PublicReport }>(`/api/report/${encodeURIComponent(token)}${preview ? '?preview' : ''}`),
  accept: (token: string, data: { name: string; email: string; message: string }) =>
    request<{ ok: true }>(`/api/report/${encodeURIComponent(token)}/accept`, { method: 'POST', body: JSON.stringify(data) }),
};

// ---- admin -------------------------------------------------------------------------------
const ADMIN_KEY = 'sandbox.adminToken';
export function getAdminToken(): string {
  try { return sessionStorage.getItem(ADMIN_KEY) ?? ''; } catch { return ''; }
}
export function setAdminToken(token: string): void {
  try {
    if (token) sessionStorage.setItem(ADMIN_KEY, token);
    else sessionStorage.removeItem(ADMIN_KEY);
  } catch { /* ignore */ }
}

export type WorkspaceWithStats = Workspace & { stats: { runs: number; leads: number; report: { id: string; status: Report['status']; views: number; accepted: boolean } | null } };

export const adminApi = {
  login: (token: string) => request<{ ok: true; adminTokenIsDefault: boolean }>('/api/admin/login', { method: 'POST', body: '{}' }, token),
  overview: () => request<AdminOverview>('/api/admin/overview', {}, getAdminToken()),
  catalog: () => request<{ workflows: WorkflowDef[] }>('/api/admin/catalog', {}, getAdminToken()),
  workspaces: () => request<{ workspaces: WorkspaceWithStats[] }>('/api/admin/workspaces', {}, getAdminToken()),
  workspace: (id: string) => request<{ workspace: Workspace; resolved: WorkflowDef[] }>(`/api/admin/workspaces/${encodeURIComponent(id)}`, {}, getAdminToken()),
  createWorkspace: (data: Omit<Partial<Workspace>, 'credits'> & { credits?: number; budgetUsd?: number }) => request<{ workspace: Workspace }>('/api/admin/workspaces', { method: 'POST', body: JSON.stringify(data) }, getAdminToken()),
  updateWorkspace: (id: string, data: Record<string, unknown>) =>
    request<{ workspace: Workspace; resolved: WorkflowDef[] }>(`/api/admin/workspaces/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }, getAdminToken()),
  deleteWorkspace: (id: string) => request<{ ok: true }>(`/api/admin/workspaces/${encodeURIComponent(id)}`, { method: 'DELETE' }, getAdminToken()),
  runs: (id: string) => request<{ runs: Run[] }>(`/api/admin/workspaces/${encodeURIComponent(id)}/runs`, {}, getAdminToken()),
  leads: (id: string) => request<{ leads: Lead[] }>(`/api/admin/workspaces/${encodeURIComponent(id)}/leads`, {}, getAdminToken()),
  draftWorkflow: (brief: string, lang: Lang) => request<{ workflow: unknown; problems: string[]; error?: string }>('/api/admin/ai/draft-workflow', { method: 'POST', body: JSON.stringify({ brief, lang }) }, getAdminToken()),
  uploadFile: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/admin/uploads', { method: 'POST', body: form, headers: { authorization: `Bearer ${getAdminToken()}` } });
    const body = (await res.json().catch(() => ({}))) as { error?: string; upload?: { id: string; name: string; mime: string; size: number; hasText: boolean } };
    if (!res.ok || !body.upload) throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status);
    return body.upload;
  },
  presets: () => request<{ presets: { key: string; label: string }[] }>('/api/admin/datagen/presets', {}, getAdminToken()),
  proposeBlueprint: (data: { company: string; industry: string; notes: string; headers: string; presetKey?: string; uploadIds?: string[]; asOf?: string }) =>
    request<{ blueprint: DataBlueprint }>('/api/admin/datagen/blueprint', { method: 'POST', body: JSON.stringify(data) }, getAdminToken()),
  previewData: (blueprint: DataBlueprint) => request<{ blueprint: DataBlueprint; data: GeneratedData }>('/api/admin/datagen/preview', { method: 'POST', body: JSON.stringify({ blueprint }) }, getAdminToken()),
  applyData: (id: string, blueprint: DataBlueprint, mode: 'replace' | 'merge', setWorkflows: boolean) =>
    request<{ workspace: Workspace; resolved: WorkflowDef[] }>(`/api/admin/workspaces/${encodeURIComponent(id)}/datagen/apply`, { method: 'POST', body: JSON.stringify({ blueprint, mode, setWorkflows }) }, getAdminToken()),
  reports: (id: string) => request<{ reports: Report[] }>(`/api/admin/workspaces/${encodeURIComponent(id)}/reports`, {}, getAdminToken()),
  createReport: (id: string, lang: Lang) => request<{ report: Report }>(`/api/admin/workspaces/${encodeURIComponent(id)}/reports`, { method: 'POST', body: JSON.stringify({ lang }) }, getAdminToken()),
  updateReport: (id: string, data: Record<string, unknown>) => request<{ report: Report }>(`/api/admin/reports/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }, getAdminToken()),
  deleteReport: (id: string) => request<{ ok: true }>(`/api/admin/reports/${encodeURIComponent(id)}`, { method: 'DELETE' }, getAdminToken()),
  health: () => request<{ ok: true; provider: { name: string; model: string; isDemo: boolean }; adminTokenIsDefault: boolean }>('/api/health'),
};
