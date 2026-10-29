/**
 * The report for the decision maker after the free trial: what they tried, what the agents
 * found in their (synthetic) company data, time saved, and the Kickstart proposal.
 * Figures are computed from the stored runs; the narrative is written by Claude when a real
 * provider is configured, otherwise assembled from the agents' own summaries.
 */
import type { Lang, Lead, Report, ReportHighlight, ReportOffer, Run, Workspace } from '../shared/types.ts';
import { nowIso, shortId } from './ids.ts';
import type { Provider } from './providers/types.ts';

export const DEFAULT_OFFER: Record<Lang, ReportOffer> = {
  vi: {
    title: 'AI Kickstart: buổi thực hành 2 giờ cho đội ngũ',
    price: '6.500.000 đ (đã gồm chi phí AI của buổi học)',
    duration: '2 giờ, tại văn phòng của bạn',
    audience: 'Tối đa 25 người từ các phòng ban bạn chọn',
    agenda: [
      '15 phút: AI đã làm được gì trên dữ liệu công ty bạn (xem lại báo cáo này)',
      '30 phút: Mỗi phòng ban làm bài tập trên dữ liệu giống công ty mình, AI chấm và góp ý ngay',
      '30 phút: Chạy các agent dựng sẵn cho việc hằng ngày của từng phòng',
      '25 phút: Dùng AI an toàn: dữ liệu nào được đưa vào, tài khoản công ty và cá nhân, Nghị định 13 và Luật Bảo vệ dữ liệu cá nhân',
      '20 phút: Đo trước – sau và chọn 3 việc áp dụng ngay tuần sau',
    ],
    includes: [
      'Phòng thực hành cho mọi học viên: quét mã QR là vào, không cần tài khoản AI',
      'Bảng theo dõi trực tiếp cho người đứng lớp và kết quả đo trước – sau',
      'Chính sách dùng AI 1 trang, soạn theo quy định hiện hành',
      'Báo cáo sau buổi học kèm đề xuất bước tiếp theo',
    ],
  },
  en: {
    title: 'AI Kickstart: a 2-hour hands-on session for your team',
    price: 'USD 450 (AI usage during the session included)',
    duration: '2 hours, at your office',
    audience: 'Up to 25 people from the teams you choose',
    agenda: [
      '15 min: what AI already did on your company data (this report)',
      '30 min: each team practises on data shaped like their own, with instant AI feedback',
      '30 min: run the ready-made agents for each team’s daily work',
      '25 min: safe AI use: what data may go in, company vs personal accounts, Vietnam’s data protection rules',
      '20 min: measure before/after and pick 3 tasks to apply next week',
    ],
    includes: [
      'A practice room for every participant: scan a QR code, no AI account needed',
      'A live board for the facilitator and before/after results',
      'A one-page AI use policy aligned with current rules',
      'A post-session report with the recommended next step',
    ],
  },
};

const NEXT_STEPS: Record<Lang, string> = {
  vi: '1. Bạn chọn ngày và các phòng ban tham gia.\n2. Chúng tôi chuẩn bị bài tập theo từng phòng trên dữ liệu giống công ty bạn.\n3. Sau buổi học, bạn nhận kết quả đo trước – sau và đề xuất: đánh giá mức sẵn sàng AI hoặc dựng agent kết nối hệ thống thật.',
  en: '1. You pick a date and the teams to join.\n2. We prepare exercises per team on data shaped like your company.\n3. After the session you get before/after results and a recommendation: a readiness assessment or building agents on your real systems.',
};

/** Plain text of a run's final answer without Markdown or the demo footer. */
export function plainSummary(output: string, max = 320): string {
  const body = output.split(/\n-{3,}\n/)[0];
  const text = body.replace(/\*\*|__|`|#+\s|^\s*[-*]\s+/gm, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return `${cut.slice(0, stop > 80 ? stop + 1 : max).trim()}${stop > 80 ? '' : '…'}`;
}

export function computeReportParts(ws: Workspace, runs: Run[], leads: Lead[], lang: Lang) {
  const done = runs.filter((r) => r.status === 'done');
  const rated = done.filter((r) => r.rating);
  const byWf = new Map<string, Run[]>();
  for (const r of [...done].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) byWf.set(r.workflowId, [...(byWf.get(r.workflowId) ?? []), r]);
  const highlights: ReportHighlight[] = [...byWf.entries()].map(([workflowId, rs]) => {
    // Show the best-rated run, else the one that produced the most.
    const best = [...rs].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.artifacts.length + b.actions.length) - (a.artifacts.length + a.actions.length))[0];
    const ratings = rs.filter((r) => r.rating);
    return {
      workflowId,
      name: best.workflowName,
      runs: rs.length,
      minutesSaved: rs.reduce((n, r) => n + r.minutesSaved, 0),
      avgRating: ratings.length ? Math.round((ratings.reduce((n, r) => n + (r.rating ?? 0), 0) / ratings.length) * 10) / 10 : null,
      headline: plainSummary(best.output),
      deliverables: [...new Set(rs.flatMap((r) => r.artifacts.map((a) => a.title)))].slice(0, 6),
      actions: best.actions.slice(0, 4).map((a) => a.summary),
    };
  }).sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || b.minutesSaved - a.minutesSaved);
  const people = new Set(done.map((r) => r.visitorName.trim().toLowerCase() || r.sessionId)).size;
  const metrics: Report['metrics'] = {
    runs: done.length,
    workflowsTried: byWf.size,
    minutesSaved: done.reduce((n, r) => n + r.minutesSaved, 0),
    avgRating: rated.length ? Math.round((rated.reduce((n, r) => n + (r.rating ?? 0), 0) / rated.length) * 10) / 10 : null,
    ratings: rated.length,
    deliverables: done.reduce((n, r) => n + r.artifacts.length, 0),
    actions: done.reduce((n, r) => n + r.actions.length, 0),
    people,
  };
  const hours = Math.round((metrics.minutesSaved / 60) * 10) / 10;
  const first = done.map((r) => r.startedAt).sort()[0] ?? nowIso();
  const days = Math.max(1, Math.ceil((Date.now() - Date.parse(first)) / 86_400_000));
  const feedback = done.filter((r) => r.feedback?.trim()).map((r) => r.feedback!.trim()).slice(0, 3);
  const wishes = leads.filter((l) => l.type === 'request_workflow').map((l) => l.message.trim()).filter(Boolean).slice(0, 2);
  const summary = lang === 'vi'
    ? `Trong ${days} ngày dùng thử, ${people} người ở ${ws.company} đã chạy ${metrics.runs} lượt trên ${metrics.workflowsTried} quy trình AI, ước tính tiết kiệm **${hours} giờ** làm việc thủ công. Các agent đã đọc dữ liệu giả lập theo đúng cấu trúc công ty bạn, tạo ${metrics.deliverables} sản phẩm (bảng, báo cáo, file) và soạn sẵn ${metrics.actions} việc cần làm (ticket, email) để người phụ trách duyệt.${metrics.avgRating ? ` Điểm đánh giá trung bình: **${metrics.avgRating}/5**.` : ''}${feedback.length ? `\n\nNhận xét của bạn: “${feedback.join('”, “')}”` : ''}${wishes.length ? `\n\nViệc bạn muốn AI làm thêm: ${wishes.join('; ')}` : ''}`
    : `Over ${days} day(s) of trial, ${people} people at ${ws.company} ran ${metrics.runs} AI workflows across ${metrics.workflowsTried} use cases, saving an estimated **${hours} hours** of manual work. The agents worked on synthetic data shaped like your company, produced ${metrics.deliverables} deliverables (tables, reports, files) and prepared ${metrics.actions} actions (tickets, emails) for a person to approve.${metrics.avgRating ? ` Average rating: **${metrics.avgRating}/5**.` : ''}${feedback.length ? `\n\nYour comments: “${feedback.join('”, “')}”` : ''}${wishes.length ? `\n\nWhat you would like AI to do next: ${wishes.join('; ')}` : ''}`;
  // One sentence per workflow: the full wording stays in the highlight cards below.
  const firstSentence = (text: string) => { const m = /^(.{40,220}?[.;])(\s|$)/.exec(text); return (m ? m[1] : text.slice(0, 200)).replace(/[;:,]$/, '.'); };
  const findings = highlights.slice(0, 6).map((h) => `${h.name[lang]}: ${firstSentence(h.headline)}`);
  return { metrics, highlights, summary, findings };
}

const REPORT_SYSTEM = (lang: Lang) => `You write a short report for a company director who just tried AI agents in a sandbox built on synthetic data shaped like their company. Plain business language, no jargon (never say prompt, LLM, token, model). Do not invent numbers: use only figures that appear in the run summaries. Return ONLY JSON: {"summary": string (3-5 sentences, Markdown bold allowed, mention hours saved and that the data is synthetic), "findings": string[] (4-6 one-sentence findings, each naming the workflow and the concrete figure it found)}. Write in ${lang === 'vi' ? 'Vietnamese, polite, addressing the reader as "bạn"' : 'English'}.`;

export async function buildReport(ws: Workspace, runs: Run[], leads: Lead[], lang: Lang, provider: Provider): Promise<Report> {
  const parts = computeReportParts(ws, runs, leads, lang);
  let { summary, findings } = parts;
  if (!provider.isDemo) {
    try {
      const facts = parts.highlights.map((h) => `- ${h.name.en} (${h.runs} runs, ${h.minutesSaved} min saved${h.avgRating ? `, rated ${h.avgRating}/5` : ''}): ${h.headline}`).join('\n');
      const raw = await provider.completeText(REPORT_SYSTEM(lang), `Company: ${ws.company} (${ws.industry})\nMetrics: ${JSON.stringify(parts.metrics)}\nDraft summary:\n${summary}\n\nRun summaries:\n${facts}`, 3000);
      const json = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')) as { summary?: unknown; findings?: unknown };
      if (typeof json.summary === 'string' && json.summary.trim()) summary = json.summary.trim().slice(0, 3000);
      if (Array.isArray(json.findings)) {
        const f = json.findings.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().slice(0, 500)).slice(0, 8);
        if (f.length) findings = f;
      }
    } catch (err) {
      console.warn('[report] narrative fell back to the computed summary:', err instanceof Error ? err.message : err);
    }
  }
  const ts = nowIso();
  return {
    id: `rep_${shortId()}`,
    token: shortId(16),
    workspaceId: ws.id,
    lang,
    status: 'draft',
    title: lang === 'vi' ? `Kết quả dùng thử AI tại ${ws.company}` : `AI trial results at ${ws.company}`,
    preparedFor: ws.contactName || ws.company,
    summary,
    findings,
    metrics: parts.metrics,
    highlights: parts.highlights,
    offer: structuredClone(DEFAULT_OFFER[lang]),
    nextSteps: NEXT_STEPS[lang],
    createdAt: ts,
    updatedAt: ts,
    views: 0,
  };
}

const s = (v: unknown, max: number): string | undefined => (typeof v === 'string' ? v.slice(0, max) : undefined);
const list = (v: unknown, maxItems: number, maxLen: number): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, maxLen)).filter((x) => x.trim()).slice(0, maxItems) : undefined;

/** Apply the founder's edits (every field optional, every field length-limited). */
export function applyReportEdits(report: Report, body: Record<string, unknown>): Report {
  report.title = s(body.title, 200) ?? report.title;
  report.preparedFor = s(body.preparedFor, 120) ?? report.preparedFor;
  report.summary = s(body.summary, 4000) ?? report.summary;
  report.findings = list(body.findings, 10, 600) ?? report.findings;
  report.nextSteps = s(body.nextSteps, 3000) ?? report.nextSteps;
  if (body.offer && typeof body.offer === 'object') {
    const o = body.offer as Record<string, unknown>;
    report.offer = {
      title: s(o.title, 200) ?? report.offer.title,
      price: s(o.price, 120) ?? report.offer.price,
      duration: s(o.duration, 120) ?? report.offer.duration,
      audience: s(o.audience, 200) ?? report.offer.audience,
      agenda: list(o.agenda, 10, 300) ?? report.offer.agenda,
      includes: list(o.includes, 10, 300) ?? report.offer.includes,
    };
  }
  if (Array.isArray(body.highlights)) {
    // Only the wording of a highlight is editable; figures stay computed.
    const edits = new Map((body.highlights as unknown[]).filter((h): h is { workflowId: string; headline: string } => !!h && typeof h === 'object' && typeof (h as { workflowId?: unknown }).workflowId === 'string' && typeof (h as { headline?: unknown }).headline === 'string').map((h) => [h.workflowId, h.headline.slice(0, 600)]));
    report.highlights = report.highlights.filter((h) => !Array.isArray(body.removeHighlights) || !(body.removeHighlights as unknown[]).includes(h.workflowId)).map((h) => (edits.has(h.workflowId) ? { ...h, headline: edits.get(h.workflowId)! } : h));
  }
  if (body.status === 'published' && report.status !== 'published') { report.status = 'published'; report.publishedAt = nowIso(); }
  if (body.status === 'draft') report.status = 'draft';
  report.updatedAt = nowIso();
  return report;
}

export function publicReport(report: Report, ws: Workspace) {
  const { workspaceId: _w, views: _v, firstViewedAt: _f, lastViewedAt: _l, ...rest } = report;
  return { ...rest, company: ws.company };
}
