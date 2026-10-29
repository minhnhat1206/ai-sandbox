import type { ReactNode } from 'react';
import type { Lang, PublicReport, Report } from '@shared/types';
import { Logo } from '@/components/Logo';
import { Badge, IconTile, Stars } from '@/components/ui';
import { Icon } from '@/icons';
import { DICT, type DictKey } from '@/i18n/dict';
import { Markdown } from '@/lib/markdown';

/** Labels follow the report's own language, not the viewer's UI language. */
const tr = (lang: Lang, key: DictKey, vars: Record<string, string | number> = {}) => {
  let s: string = DICT[key][lang];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
};

const fmtDate = (iso: string | undefined, lang: Lang) => (iso ? new Date(iso).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

/**
 * The decision-maker report, used by the public page (/r/:token) and the admin preview.
 * Print-friendly: the browser's "Save as PDF" gives a clean document.
 */
export function ReportView({ report, company, cta }: { report: Report | PublicReport; company: string; cta?: ReactNode }) {
  const L = report.lang;
  const m = report.metrics;
  const hours = Math.round((m.minutesSaved / 60) * 10) / 10;
  const kpis: { icon: string; label: string; value: string; hint?: string }[] = [
    { icon: 'hours', label: tr(L, 'rp_kpi_hours'), value: `${hours.toLocaleString(L === 'vi' ? 'vi-VN' : 'en-US')} ${tr(L, 'rp_hours_unit')}`, hint: tr(L, 'rp_kpi_hours_hint') },
    { icon: 'play', label: tr(L, 'rp_kpi_runs'), value: String(m.runs), hint: tr(L, 'rp_kpi_runs_hint', { n: m.workflowsTried, p: m.people }) },
    { icon: 'docCheck', label: tr(L, 'rp_kpi_deliverables'), value: String(m.deliverables), hint: tr(L, 'rp_kpi_actions_hint', { n: m.actions }) },
    { icon: 'star', label: tr(L, 'rp_kpi_rating'), value: m.avgRating ? `${m.avgRating}/5` : '—', hint: m.ratings ? tr(L, 'rp_kpi_rating_hint', { n: m.ratings }) : tr(L, 'rp_kpi_rating_none') },
  ];
  return (
    <article className="report mx-auto max-w-4xl space-y-6" lang={L}>
      <header className="grain overflow-hidden rounded-xl3 bg-ink-900 p-7 text-white shadow-[var(--shadow-lift)] md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo tone="light" />
          <span className="text-[12px] text-white/60 tnum">{fmtDate(report.publishedAt ?? report.updatedAt, L)}</span>
        </div>
        <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.14em] text-jade-6">{tr(L, 'rp_eyebrow')}</p>
        <h1 className="display mt-2 text-[28px] font-bold leading-tight md:text-[38px]">{report.title}</h1>
        <p className="mt-3 text-[14px] text-white/70">{tr(L, 'rp_prepared_for', { name: report.preparedFor, company })}</p>
      </header>

      <section aria-label={tr(L, 'rp_kpis')} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl2 bg-white p-4 hairline shadow-[var(--shadow-card)]">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sand-9"><Icon name={k.icon} size={14} className="text-jade-9" /> {k.label}</p>
            <p className="display mt-2 text-[26px] font-bold text-jade-12 tnum">{k.value}</p>
            {k.hint && <p className="mt-1 text-[12px] leading-snug text-sand-9">{k.hint}</p>}
          </div>
        ))}
      </section>

      <section className="rounded-xl2 bg-white p-6 hairline shadow-[var(--shadow-card)] md:p-8">
        <h2 className="display text-[19px] font-bold text-jade-12">{tr(L, 'rp_summary')}</h2>
        <Markdown text={report.summary} className="mt-3 text-[15px] leading-relaxed text-sand-12" />
        {report.findings.length > 0 && (
          <>
            <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-sand-10">{tr(L, 'rp_findings')}</h3>
            <ol className="mt-3 space-y-2.5">
              {report.findings.map((f, i) => (
                <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed text-sand-12">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jade-3 text-[12px] font-bold text-jade-11 tnum">{i + 1}</span>
                  <span>{f}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {report.highlights.length > 0 && (
        <section>
          <h2 className="display px-1 text-[19px] font-bold text-jade-12">{tr(L, 'rp_highlights')}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {report.highlights.map((h) => (
              <div key={h.workflowId} className="report-card flex flex-col rounded-xl2 bg-white p-5 hairline shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-3">
                  <IconTile name="Bot" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-jade-12">{h.name[L]}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-sand-9 tnum">
                      <span>{tr(L, 'rp_runs_n', { n: h.runs })}</span>·<span>{tr(L, 'rp_minutes_n', { n: h.minutesSaved })}</span>
                      {h.avgRating && <span className="inline-flex items-center gap-1">· <Stars value={Math.round(h.avgRating)} size="sm" /></span>}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-sand-12">{h.headline}</p>
                {h.deliverables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {h.deliverables.map((d) => <Badge key={d} tone="brand"><Icon name="FileText" size={12} /> {d}</Badge>)}
                  </div>
                )}
                {h.actions.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-sand-4 pt-3 text-[12.5px] text-sand-10">
                    {h.actions.map((a, i) => <li key={i} className="flex gap-1.5"><Icon name="ClipboardList" size={13} className="mt-0.5 shrink-0 text-amber-10" /> {a}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 px-1 text-[12.5px] leading-relaxed text-sand-9"><Icon name="shield" size={14} className="mt-0.5 shrink-0 text-jade-9" /> {tr(L, 'rp_data_note')}</p>
        </section>
      )}

      <section className="grain overflow-hidden rounded-xl3 bg-jade-12 p-7 text-white shadow-[var(--shadow-lift)] md:p-9">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-jade-6">{tr(L, 'rp_offer_eyebrow')}</p>
        <h2 className="display mt-2 text-[24px] font-bold md:text-[30px]">{report.offer.title}</h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {[['rp_offer_price', report.offer.price], ['rp_offer_duration', report.offer.duration], ['rp_offer_audience', report.offer.audience]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/[.07] p-3.5 ring-1 ring-white/10">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">{tr(L, k as DictKey)}</dt>
              <dd className="mt-1 text-[15px] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/60">{tr(L, 'rp_offer_agenda')}</h3>
            <ol className="mt-3 space-y-2">
              {report.offer.agenda.map((a, i) => <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-white/90"><span className="mt-0.5 font-mono text-[12px] text-jade-6">{String(i + 1).padStart(2, '0')}</span> {a}</li>)}
            </ol>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/60">{tr(L, 'rp_offer_includes')}</h3>
            <ul className="mt-3 space-y-2">
              {report.offer.includes.map((a, i) => <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-white/90"><Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-jade-6" /> {a}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl2 bg-white p-6 hairline shadow-[var(--shadow-card)] md:p-8">
        <h2 className="display text-[19px] font-bold text-jade-12">{tr(L, 'rp_next')}</h2>
        <Markdown text={report.nextSteps} className="mt-3 text-[14.5px] leading-relaxed text-sand-12" />
        {cta && <div className="mt-6 border-t border-sand-4 pt-6 print:hidden">{cta}</div>}
      </section>
    </article>
  );
}
