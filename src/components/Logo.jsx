/* Hex cell + a routed path through it — the name and the product promise
   (a traced journey) in one mark. */
export default function Logo({ size = 30, className = '', variant = 'plain' }) {
  /* 'tile' — the demo's app mark: white glyph on a forest rounded tile. */
  if (variant === 'tile') {
    return (
      <span className={`inline-flex items-center gap-3 ${className}`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-forest text-white shadow-btn">
          <Glyph size={24} />
        </span>
        <span className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">Nasou Hive</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Glyph size={size} />
      <span className="font-display text-[19px] font-extrabold tracking-[-0.035em]">
        Nasou<span className="text-emerald"> Hive</span>
      </span>
    </span>
  );
}

function Glyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 2.6 27.3 9v14L16 29.4 4.7 23V9L16 2.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 19.5c2.6 0 3.2-7 5.5-7s2.9 7 5.5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="10.5" cy="19.5" r="2" fill="currentColor" />
    </svg>
  );
}
