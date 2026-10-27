/**
 * Alpana (আলপনা) ornaments — the white rice-paste floor drawings that welcome
 * Maa Kali into a Bengali home, redrawn here as inline SVG so they scale
 * crisply on any phone screen without extra requests.
 */

export function AlponaMedallion({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="47" fill="url(#alponaCore)" />
      <g stroke="#ffe9b8" strokeOpacity="0.85" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <circle cx="50" cy="50" r="43" />
        <circle cx="50" cy="50" r="30" strokeOpacity="0.5" />
        {/* eight lotus petals around the centre */}
        <g>
          <path d="M50 22c6 8 6 16 0 24-6-8-6-16 0-24z" />
          <path d="M50 78c6-8 6-16 0-24-6 8-6 16 0 24z" />
          <path d="M22 50c8 6 16 6 24 0-8-6-16-6-24 0z" />
          <path d="M78 50c-8 6-16 6-24 0 8-6 16-6 24 0z" />
          <path d="M30 30c8 2 14 8 16 16-8-2-14-8-16-16z" strokeOpacity="0.7" />
          <path d="M70 70c-8-2-14-8-16-16 8 2 14 8 16 16z" strokeOpacity="0.7" />
          <path d="M70 30c-2 8-8 14-16 16 2-8 8-14 16-16z" strokeOpacity="0.7" />
          <path d="M30 70c2-8 8-14 16-16-2 8-8 14-16 16z" strokeOpacity="0.7" />
        </g>
      </g>
      <circle cx="50" cy="50" r="7" fill="#ffdf9a" />
      <circle cx="50" cy="50" r="3" fill="#7a1030" />
      <g fill="#ffe9b8" fillOpacity="0.8">
        <circle cx="50" cy="14" r="1.8" />
        <circle cx="50" cy="86" r="1.8" />
        <circle cx="14" cy="50" r="1.8" />
        <circle cx="86" cy="50" r="1.8" />
      </g>
      <defs>
        <radialGradient id="alponaCore" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0%" stopColor="#8e1a3f" />
          <stop offset="55%" stopColor="#5c0f30" />
          <stop offset="100%" stopColor="#250a24" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Horizontal alpana rule used between sections. */
export function AlponaDivider({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-gold/70" />
      <svg width="56" height="18" viewBox="0 0 56 18" fill="none">
        <g stroke="#f5c76a" strokeWidth="1.1" strokeOpacity="0.85" fill="none" strokeLinecap="round">
          <path d="M28 15c-4-2-6-6-6-10 4 1 6 4 6 10z" />
          <path d="M28 15c4-2 6-6 6-10-4 1-6 4-6 10z" />
          <path d="M28 15V5" />
          <path d="M14 15c-3-1.5-5-4.5-5-8 3 .8 5 3 5 8z" strokeOpacity="0.6" />
          <path d="M14 15c3-1.5 5-4.5 5-8-3 .8-5 3-5 8z" strokeOpacity="0.6" />
          <path d="M42 15c-3-1.5-5-4.5-5-8 3 .8 5 3 5 8z" strokeOpacity="0.6" />
          <path d="M42 15c3-1.5 5-4.5 5-8-3 .8-5 3-5 8z" strokeOpacity="0.6" />
        </g>
        <circle cx="28" cy="16.6" r="1.4" fill="#f5c76a" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/40 to-gold/70" />
    </div>
  );
}

/** Soft corner alpana used behind headings. */
export function AlponaCorner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <g stroke="#f5c76a" strokeOpacity="0.35" strokeWidth="1.4" fill="none" strokeLinecap="round">
        <path d="M2 2c40 0 74 12 96 34 22 22 20 56 20 82" />
        <path d="M2 26c30 0 56 10 74 28 18 18 22 44 22 64" strokeOpacity="0.22" />
        <path d="M30 2c0 22 8 40 22 54 14 14 34 22 54 22" strokeOpacity="0.22" />
      </g>
      <g fill="#f5c76a" fillOpacity="0.3">
        <circle cx="26" cy="26" r="2" />
        <circle cx="44" cy="20" r="2.6" />
        <circle cx="20" cy="44" r="2.6" />
        <circle cx="62" cy="30" r="1.8" />
        <circle cx="30" cy="62" r="1.8" />
      </g>
    </svg>
  );
}
