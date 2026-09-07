/* ============================================================================
 * ProductArt — deterministic, on-brand SVG illustrations for every fitting
 * type in the catalog. No external images, crisp at any size, consistent
 * across all 1,472 products. Swap for real photos later without a data change.
 *
 *   <ProductArt kind="elbow" material="cPVC" />
 * ==========================================================================*/

/* All three read as cream — differentiated by warmth, never by grey/blue. */
const MATERIAL = {
  PVC: { body: '#fbf6ea', shade: '#e6dcc5', edge: '#c2b699', ring: '#d9cdb2' },
  uPVC: { body: '#f4f4e6', shade: '#dbdcc2', edge: '#b3b593', ring: '#cbcdae' },
  cPVC: { body: '#f9f0e0', shade: '#e8d7ba', edge: '#c9ae86', ring: '#dec9a6' },
  Brass: { body: '#e7cf9c', shade: '#caa86a', edge: '#a5843f', ring: '#d4b477' },
};

function palette(material) {
  return MATERIAL[material] || MATERIAL.PVC;
}

/* Shared defs: soft body gradient + drop shadow for a "studio render" feel. */
function Defs({ id, c }) {
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={c.body} />
        <stop offset="0.55" stopColor={c.body} />
        <stop offset="1" stopColor={c.shade} />
      </linearGradient>
      <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={c.ring} />
        <stop offset="1" stopColor={c.edge} />
      </linearGradient>
      <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#101711" floodOpacity="0.14" />
      </filter>
    </defs>
  );
}

function Socket({ cx, cy, rx = 15, ry = 8, c, id }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-ring)`} />
      <ellipse cx={cx} cy={cy} rx={rx - 4} ry={ry - 3} fill={c.shade} />
    </g>
  );
}

const SHAPES = {
  pipe: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <rect x="40" y="78" width="120" height="44" rx="8" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <ellipse cx="160" cy="100" rx="10" ry="22" fill={`url(#${id}-ring)`} />
      <ellipse cx="160" cy="100" rx="6" ry="15" fill={c.shade} />
      <ellipse cx="40" cy="100" rx="10" ry="22" fill={c.shade} opacity="0.7" />
      <rect x="52" y="84" width="96" height="4" rx="2" fill="#fff" opacity="0.5" />
    </g>
  ),
  elbow: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <path d="M70 150 V96 A30 30 0 0 1 100 66 H150" fill="none" stroke={`url(#${id}-body)`} strokeWidth="44" strokeLinecap="butt" />
      <path d="M70 150 V96 A30 30 0 0 1 100 66 H150" fill="none" stroke={c.edge} strokeWidth="46" strokeOpacity="0.25" />
      <Socket id={id} c={c} cx={150} cy={66} rx={9} ry={22} />
      <Socket id={id} c={c} cx={70} cy={150} rx={22} ry={9} />
      <path d="M84 150 V96 A16 16 0 0 1 100 80 H150" fill="none" stroke="#fff" strokeWidth="3" strokeOpacity="0.45" />
    </g>
  ),
  bend: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <path d="M58 156 V104 A46 46 0 0 1 104 58 H156" fill="none" stroke={`url(#${id}-body)`} strokeWidth="40" />
      <Socket id={id} c={c} cx={156} cy={58} rx={8} ry={20} />
      <Socket id={id} c={c} cx={58} cy={156} rx={20} ry={8} />
      <path d="M72 156 V104 A32 32 0 0 1 104 72 H156" fill="none" stroke="#fff" strokeWidth="3" strokeOpacity="0.4" />
    </g>
  ),
  shoe: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <path d="M78 52 V120 A28 28 0 0 0 106 148 H156" fill="none" stroke={`url(#${id}-body)`} strokeWidth="42" />
      <Socket id={id} c={c} cx={78} cy={52} rx={22} ry={9} />
      <Socket id={id} c={c} cx={156} cy={148} rx={9} ry={21} />
      <path d="M92 52 V120 A14 14 0 0 0 106 134 H156" fill="none" stroke="#fff" strokeWidth="3" strokeOpacity="0.4" />
    </g>
  ),
  tee: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <rect x="34" y="82" width="132" height="42" rx="10" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <rect x="80" y="82" width="40" height="74" rx="10" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <Socket id={id} c={c} cx={34} cy={103} rx={9} ry={21} />
      <Socket id={id} c={c} cx={166} cy={103} rx={9} ry={21} />
      <Socket id={id} c={c} cx={100} cy={156} rx={21} ry={9} />
      <rect x="44" y="88" width="112" height="4" rx="2" fill="#fff" opacity="0.5" />
    </g>
  ),
  coupling: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <rect x="58" y="76" width="84" height="48" rx="10" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <rect x="94" y="70" width="12" height="60" rx="4" fill={c.edge} opacity="0.5" />
      <Socket id={id} c={c} cx={58} cy={100} rx={10} ry={24} />
      <Socket id={id} c={c} cx={142} cy={100} rx={10} ry={24} />
      <rect x="66" y="82" width="68" height="4" rx="2" fill="#fff" opacity="0.5" />
    </g>
  ),
  reducer: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <path d="M56 72 H108 L146 90 V110 L108 128 H56 Z" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <Socket id={id} c={c} cx={56} cy={100} rx={11} ry={28} />
      <Socket id={id} c={c} cx={146} cy={100} rx={7} ry={16} />
      <path d="M64 78 H104 L136 92" fill="none" stroke="#fff" strokeWidth="3" strokeOpacity="0.4" />
    </g>
  ),
  bush: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <path d="M66 74 H120 L120 126 H66 Z" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <path d="M120 82 H140 V118 H120 Z" fill={c.shade} stroke={c.edge} strokeWidth="2" />
      <Socket id={id} c={c} cx={66} cy={100} rx={12} ry={28} />
      <ellipse cx="140" cy="100" rx="6" ry="15" fill={c.edge} opacity="0.6" />
      <path d="M74 80 H116" stroke="#fff" strokeWidth="3" strokeOpacity="0.4" />
    </g>
  ),
  adapter: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <rect x="52" y="78" width="60" height="44" rx="8" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <g>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={116 + i * 6} y="82" width="4" height="36" rx="1" fill={c.edge} opacity="0.55" />
        ))}
      </g>
      <path d="M112 74 L150 74 L150 126 L112 126" fill={c.shade} stroke={c.edge} strokeWidth="2" />
      <Socket id={id} c={c} cx={52} cy={100} rx={10} ry={22} />
      <rect x="60" y="84" width="44" height="4" rx="2" fill="#fff" opacity="0.5" />
    </g>
  ),
  cap: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <path d="M74 74 H132 A14 14 0 0 1 146 88 V112 A14 14 0 0 1 132 126 H74 Z" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <Socket id={id} c={c} cx={74} cy={100} rx={12} ry={26} />
      <path d="M82 80 H128" stroke="#fff" strokeWidth="3" strokeOpacity="0.4" />
    </g>
  ),
  union: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <rect x="52" y="80" width="40" height="40" rx="8" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <rect x="108" y="80" width="40" height="40" rx="8" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <path d="M88 66 L112 66 L120 100 L112 134 L88 134 L80 100 Z" fill={c.shade} stroke={c.edge} strokeWidth="2" />
      <Socket id={id} c={c} cx={52} cy={100} rx={9} ry={20} />
      <Socket id={id} c={c} cx={148} cy={100} rx={9} ry={20} />
    </g>
  ),
  valve: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <rect x="52" y="82" width="96" height="44" rx="10" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <circle cx="100" cy="104" r="20" fill={c.shade} stroke={c.edge} strokeWidth="2" />
      <rect x="92" y="40" width="16" height="42" rx="4" fill="#0f6b4d" />
      <rect x="72" y="30" width="56" height="14" rx="7" fill="#12805c" />
      <Socket id={id} c={c} cx={52} cy={104} rx={10} ry={22} />
      <Socket id={id} c={c} cx={148} cy={104} rx={10} ry={22} />
    </g>
  ),
  saddle: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <path d="M50 118 A50 26 0 0 1 150 118 L150 132 A50 20 0 0 0 50 132 Z" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      <rect x="86" y="70" width="28" height="40" rx="6" fill={c.shade} stroke={c.edge} strokeWidth="2" />
      <ellipse cx="100" cy="72" rx="10" ry="5" fill={c.edge} opacity="0.6" />
      <circle cx="58" cy="126" r="4" fill={c.edge} />
      <circle cx="142" cy="126" r="4" fill={c.edge} />
    </g>
  ),
  nipple: (id, c) => (
    <g filter={`url(#${id}-sh)`}>
      <rect x="62" y="84" width="76" height="32" rx="6" fill={`url(#${id}-body)`} stroke={c.edge} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={64 + i * 7} y="88" width="4" height="24" rx="1" fill={c.edge} opacity="0.5" />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={122 + i * 7} y="88" width="4" height="24" rx="1" fill={c.edge} opacity="0.5" />
      ))}
      <rect x="96" y="76" width="8" height="48" rx="2" fill={c.edge} opacity="0.6" />
    </g>
  ),
};

export default function ProductArt({ kind = 'coupling', material = 'PVC', className = '', title }) {
  const c = palette(material);
  const id = `pa-${kind}-${material}`.replace(/[^a-z0-9-]/gi, '');
  const shape = SHAPES[kind] || SHAPES.coupling;
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={title || `${material} ${kind}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs id={id} c={c} />
      <ellipse cx="100" cy="176" rx="62" ry="10" fill="#101711" opacity="0.08" />
      {shape(id, c)}
    </svg>
  );
}
