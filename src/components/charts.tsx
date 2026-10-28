import { useState } from 'react';

/**
 * Minimal single-series charts following the dataviz mark specs:
 * thin bars (<= 24px), 4px rounded data-end square at the baseline, 2px surface
 * gap, hairline grid, text in text tokens, per-mark hover tooltip, table fallback.
 */

export interface Point { label: string; value: number; hint?: string }

export function ColumnChart({ data, height = 120, format = (v: number) => String(v), title }: { data: Point[]; height?: number; format?: (v: number) => string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const w = 100;
  const n = data.length;
  const band = w / Math.max(1, n);
  const barW = Math.min(band * 0.62, 24);
  const padTop = 6;
  const plotH = height - 22;
  const y = (v: number) => padTop + plotH - (v / ticks[ticks.length - 1]) * plotH;
  return (
    <figure className="relative" aria-label={title}>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img">
        {ticks.map((tk) => (
          <line key={tk} x1="0" x2={w} y1={y(tk)} y2={y(tk)} stroke="var(--color-sand-4)" strokeWidth=".5" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const x = i * band + (band - barW) / 2;
          const top = y(d.value);
          const h = Math.max(0, padTop + plotH - top);
          const r = Math.min(2, h);
          const active = hover === i;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * band} y={0} width={band} height={height} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x} ${padTop + plotH} V${top + r} a${r} ${r} 0 0 1 ${r}-${r} h${barW - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} V${padTop + plotH} Z`}
                  fill={active ? 'var(--color-jade-10)' : 'var(--color-jade-8)'}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-sand-9 tnum">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(n / 2)]?.label}</span>
        <span>{data[n - 1]?.label}</span>
      </div>
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg bg-sand-12 px-2.5 py-1.5 text-xs text-white shadow-lg animate-pop">
          <span className="text-white/60">{data[hover].hint ?? data[hover].label}</span> · <strong className="tnum">{format(data[hover].value)}</strong>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{format(d.value)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export function BarList({ data, format = (v: number) => String(v) }: { data: Point[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="group">
          <div className="mb-1 flex items-center justify-between text-[13px]">
            <span className="truncate text-sand-11">{d.label}</span>
            <span className="ml-3 shrink-0 font-semibold text-sand-12 tnum">{format(d.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-jade-3">
            <div className="h-full rounded-full bg-jade-8 transition-[width] duration-700 group-hover:bg-jade-10" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Sparkline({ values, width = 72, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - 2 - (v / max) * (height - 4)}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <path d={`M${pts.join(' L')}`} fill="none" stroke="var(--color-jade-8)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="3" fill="var(--color-jade-9)" stroke="white" strokeWidth="2" />
    </svg>
  );
}

function niceTicks(max: number): number[] {
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step || 1;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}
