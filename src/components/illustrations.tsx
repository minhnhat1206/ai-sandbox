/**
 * Spot illustrations drawn for this product. All inline SVG, currentColor-aware,
 * so they inherit the surrounding palette and stay crisp at any size.
 */

/** A miniature sandbox window: a form on the left, a streaming result on the right. */
export function HeroPreview({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 360" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hp-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F5F2EC" />
        </linearGradient>
        <linearGradient id="hp-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2E9A7C" />
          <stop offset="1" stopColor="#137A62" />
        </linearGradient>
        <filter id="hp-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#0B2F27" floodOpacity=".28" />
        </filter>
      </defs>
      {/* window */}
      <rect x="20" y="20" width="480" height="320" rx="22" fill="url(#hp-panel)" filter="url(#hp-shadow)" />
      <rect x="20.5" y="20.5" width="479" height="319" rx="21.5" fill="none" stroke="#1B1814" strokeOpacity=".08" />
      {/* titlebar */}
      <circle cx="44" cy="44" r="4.5" fill="#E7E3DA" /><circle cx="58" cy="44" r="4.5" fill="#E7E3DA" /><circle cx="72" cy="44" r="4.5" fill="#E7E3DA" />
      <rect x="200" y="36" width="120" height="16" rx="8" fill="#F0EDE6" />
      <rect x="430" y="36" width="52" height="16" rx="8" fill="#DCF1EA" />
      <text x="456" y="48" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0C5A49" fontFamily="JetBrains Mono, monospace">47/50</text>
      {/* left: form */}
      <rect x="40" y="72" width="180" height="248" rx="14" fill="#FFFFFF" stroke="#1B1814" strokeOpacity=".07" />
      <rect x="54" y="88" width="90" height="8" rx="4" fill="#CFC9BC" />
      <rect x="54" y="106" width="152" height="86" rx="8" fill="#F7F5F0" stroke="#1B1814" strokeOpacity=".06" />
      <rect x="62" y="116" width="120" height="6" rx="3" fill="#DDD8CD" /><rect x="62" y="128" width="100" height="6" rx="3" fill="#DDD8CD" /><rect x="62" y="140" width="128" height="6" rx="3" fill="#DDD8CD" /><rect x="62" y="152" width="84" height="6" rx="3" fill="#DDD8CD" />
      <rect x="54" y="204" width="60" height="8" rx="4" fill="#CFC9BC" />
      <rect x="54" y="220" width="152" height="26" rx="8" fill="#F7F5F0" stroke="#1B1814" strokeOpacity=".06" />
      <rect x="64" y="229" width="70" height="8" rx="4" fill="#DDD8CD" />
      <rect x="54" y="268" width="152" height="34" rx="10" fill="url(#hp-accent)" />
      <path d="M121 279l9 6-9 6z" fill="#fff" />
      <rect x="136" y="281" width="30" height="8" rx="4" fill="#fff" fillOpacity=".9" />
      {/* right: result paper */}
      <rect x="236" y="72" width="244" height="248" rx="14" fill="#FFFFFF" stroke="#1B1814" strokeOpacity=".07" />
      <rect x="252" y="90" width="120" height="10" rx="5" fill="#0B2F27" />
      <g className="hp-lines">
        <rect x="252" y="112" width="200" height="6" rx="3" fill="#CFC9BC" /><rect x="252" y="124" width="172" height="6" rx="3" fill="#CFC9BC" /><rect x="252" y="136" width="188" height="6" rx="3" fill="#CFC9BC" />
      </g>
      {/* table */}
      <rect x="252" y="156" width="212" height="22" rx="6" fill="#F0EDE6" />
      <rect x="252" y="178" width="212" height="22" fill="#FFFFFF" stroke="#E7E3DA" />
      <rect x="252" y="200" width="212" height="22" fill="#FCFBF8" stroke="#E7E3DA" />
      <rect x="262" y="164" width="60" height="6" rx="3" fill="#9A927F" /><rect x="380" y="164" width="40" height="6" rx="3" fill="#9A927F" />
      <rect x="262" y="186" width="80" height="6" rx="3" fill="#B9B2A3" /><rect x="390" y="186" width="46" height="6" rx="3" fill="#B9B2A3" />
      <rect x="262" y="208" width="66" height="6" rx="3" fill="#B9B2A3" /><rect x="396" y="208" width="40" height="6" rx="3" fill="#B9B2A3" />
      {/* checks */}
      <g>
        <circle cx="260" cy="244" r="7" fill="#DCF1EA" /><path d="M256.5 244l2.5 2.5 4.5-5" stroke="#137A62" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="274" y="241" width="130" height="6" rx="3" fill="#CFC9BC" />
        <circle cx="260" cy="266" r="7" fill="#DCF1EA" /><path d="M256.5 266l2.5 2.5 4.5-5" stroke="#137A62" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="274" y="263" width="104" height="6" rx="3" fill="#CFC9BC" />
      </g>
      {/* streaming caret */}
      <rect x="252" y="288" width="140" height="6" rx="3" fill="#CFC9BC" />
      <rect x="396" y="286" width="5" height="10" rx="1" fill="#137A62">
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
      </rect>
      {/* floating stars badge */}
      <g className="animate-float">
        <rect x="392" y="296" width="104" height="36" rx="12" fill="#0B2F27" />
        <g fill="#F4C15D" transform="translate(404 307)">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} transform={`translate(${i * 15} 0) scale(.55)`} d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
          ))}
        </g>
      </g>
      {/* spark */}
      <g transform="translate(476 64)">
        <path d="M0-14l2.6 8.2L12 0 2.6 2.6 0 12l-2.6-9.4L-12 0l9.4-5.8z" fill="#F4C15D">
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="18s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  );
}

/** Three spot illustrations for the "how it works" steps. */
export function StepArt({ step, className = '' }: { step: 1 | 2 | 3; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (step === 1)
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M10 20a6 6 0 0 1 6-6h18a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H22l-8 6v-6a6 6 0 0 1-4-6z" fill="currentColor" opacity=".14" />
        <path d="M10 20a6 6 0 0 1 6-6h18a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H22l-8 6v-6a6 6 0 0 1-4-6z" {...common} />
        <path d="M18 23h16M18 28h9" {...common} />
        <path d="M44 30h4a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-1l-7 5v-5h-6a6 6 0 0 1-6-6v-2" {...common} />
        <circle cx="47" cy="41" r="1.4" fill="currentColor" /><circle cx="42" cy="41" r="1.4" fill="currentColor" /><circle cx="52" cy="41" r="1.4" fill="currentColor" />
      </svg>
    );
  if (step === 2)
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M14 46l20-20 6 6-20 20z" fill="currentColor" opacity=".14" />
        <path d="M14 46l20-20 6 6-20 20zM30 30l6 6" {...common} />
        <path d="M42 12l1.6 4.4 4.4 1.6-4.4 1.6L42 24l-1.6-4.4-4.4-1.6 4.4-1.6z" fill="currentColor" />
        <path d="M52 26l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="currentColor" />
        <path d="M14 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="currentColor" />
        <path d="M46 40h8M50 36v8" {...common} />
      </svg>
    );
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="24" cy="22" r="7" fill="currentColor" opacity=".14" />
      <circle cx="24" cy="22" r="7" {...common} />
      <path d="M10 46a14 14 0 0 1 28 0" fill="currentColor" opacity=".14" />
      <path d="M10 46a14 14 0 0 1 28 0" {...common} />
      <circle cx="42" cy="26" r="5" {...common} />
      <path d="M44 36a11 11 0 0 1 10 10" {...common} />
      <circle cx="50" cy="48" r="9" fill="#F4C15D" />
      <path d="M45.5 48l3 3 6-6" fill="none" stroke="#1B1814" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Empty-state art: a folder with a spark, waiting for the first run. */
export function EmptyArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true">
      <path d="M14 26a6 6 0 0 1 6-6h22l8 8h50a6 6 0 0 1 6 6v38a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="currentColor" opacity=".10" />
      <path d="M14 26a6 6 0 0 1 6-6h22l8 8h50a6 6 0 0 1 6 6v38a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 40h92" stroke="currentColor" strokeWidth="1.6" strokeOpacity=".5" />
      <rect x="34" y="50" width="40" height="5" rx="2.5" fill="currentColor" opacity=".3" />
      <rect x="34" y="60" width="26" height="5" rx="2.5" fill="currentColor" opacity=".2" />
      <path d="M96 10l2.3 6.2 6.2 2.3-6.2 2.3L96 27l-2.3-6.2-6.2-2.3 6.2-2.3z" fill="#F4C15D" />
    </svg>
  );
}

/** Result-pane placeholder: a document outline with a soft pulse. */
export function WaitingArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <rect x="30" y="10" width="100" height="100" rx="12" fill="currentColor" opacity=".06" />
      <rect x="30.5" y="10.5" width="99" height="99" rx="11.5" fill="none" stroke="currentColor" strokeOpacity=".25" strokeDasharray="4 4" />
      <rect x="46" y="28" width="52" height="8" rx="4" fill="currentColor" opacity=".35" />
      <rect x="46" y="46" width="68" height="5" rx="2.5" fill="currentColor" opacity=".18" />
      <rect x="46" y="57" width="60" height="5" rx="2.5" fill="currentColor" opacity=".18" />
      <rect x="46" y="68" width="66" height="5" rx="2.5" fill="currentColor" opacity=".18" />
      <rect x="46" y="84" width="40" height="5" rx="2.5" fill="currentColor" opacity=".18" />
      <circle cx="122" cy="22" r="10" fill="#F4C15D" opacity=".9">
        <animate attributeName="r" values="9;11;9" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <path d="M117 22l3.5 3.5 5.5-6" fill="none" stroke="#1B1814" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Decorative ring used behind stat values on dark surfaces. */
export function Ring({ value, max, size = 44, stroke = 4, className = '' }: { value: number; max: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .6s var(--ease-out-expo)' }} />
    </svg>
  );
}
