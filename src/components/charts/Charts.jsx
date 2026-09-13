import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../../lib/format';

/* ============================================================================
 * Charts — small, dependency-free SVG/HTML charts for the admin console
 * (dashboard, Billing & payments, Reports).
 *
 * Palette (validated with the dataviz skill's checker on a white surface):
 *   categorical, fixed order: emerald · sky · amber · rose · violet
 *   donut slices: max 4 (emerald · sky · amber · violet), the rest fold into
 *   "Other"; those four sit in the CVD warn band all-pairs, so donuts always
 *   ship with a legend, % labels and 2px gaps (secondary encoding).
 *   single-series charts: brand forest.
 *   status: good = emerald, warning = amber, critical = rose — always with a
 *   text label, never colour alone.
 * Every chart has a hover/focus tooltip and its ChartCard a Table view.
 * ==========================================================================*/

export const SERIES = ['#059669', '#0284c7', '#d97706', '#e11d48', '#7c3aed'];
export const DONUT = ['#059669', '#0284c7', '#d97706', '#7c3aed'];
export const OTHER = '#cad8d2';
export const FOREST = '#1f5c4a';
export const STATUS = { good: '#059669', warning: '#d97706', critical: '#e11d48', info: '#0284c7', neutral: '#82938d' };

const INK = { primary: '#1f3b34', secondary: '#61756e', muted: '#82938d', grid: '#e6ecea' };

/* width of a container, kept in sync */
function useWidth(fallback = 600) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* clean axis maximum + ticks (1 / 2 / 5 × 10^n steps) */
function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/* ── card with a Chart / Table switch ─────────────────────────────────────── */
export function ChartCard({ title, note, table, action, className = '', children }) {
  const [view, setView] = useState('chart');
  return (
    <section className={cx('min-w-0 rounded-[20px] border border-line bg-white p-4 shadow-card sm:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em] sm:text-lg">{title}</h2>
          {note && <p className="mt-0.5 text-[12.5px] text-ink-50">{note}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {table && (
            <div role="tablist" aria-label={`${title} view`} className="flex rounded-[10px] bg-[#f0f4f2] p-0.5">
              {['chart', 'table'].map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cx('rounded-[8px] px-2.5 py-1 text-[11.5px] font-bold capitalize transition', view === v ? 'bg-white text-forest shadow-sm' : 'text-ink-50 hover:text-forest')}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {view === 'chart' || !table ? children : <DataTable {...table} />}
    </section>
  );
}

export function DataTable({ headers, rows }) {
  return (
    <div className="max-h-[320px] overflow-auto rounded-[12px] border border-line-soft">
      <table className="w-full min-w-[320px] border-collapse text-left text-[12.5px]">
        <thead className="sticky top-0 bg-[#f4f7f5]">
          <tr>{headers.map((h, i) => <th key={h} className={cx('px-3 py-2 font-bold text-forest-800', i > 0 && 'text-right')}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line-soft">
              {r.map((c, j) => <td key={j} className={cx('tnum px-3 py-2 text-ink-70', j > 0 && 'text-right', j === 0 && 'font-semibold text-ink')}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── line chart (single series, area wash, crosshair tooltip) ─────────────── */
export function LineChart({ points, format = (v) => v, tick = format, label = 'Value', color = FOREST, height = 220, sub }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const m = { l: 52, r: 18, t: 14, b: 28 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const ticks = useMemo(() => niceTicks(Math.max(0, ...points.map((p) => p.value))), [points]);
  const top = ticks[ticks.length - 1] || 1;
  const x = (i) => m.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => m.t + ih - (v / top) * ih;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const last = points.length - 1;
  const xLabels = [0, Math.round(last / 2), last].filter((v, i, a) => a.indexOf(v) === i);

  const pick = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    const rel = clientX - r.left - m.l;
    const i = Math.round((rel / iw) * (points.length - 1));
    setHover(Math.max(0, Math.min(last, i)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => Math.max(0, (h ?? last) - 1)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => Math.min(last, (h ?? last) + 1)); }
  };
  const h = hover != null ? points[hover] : null;
  const total = points.reduce((s, p) => s + p.value, 0);

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${label}: ${points.length} points, total ${format(total)}. Use left and right arrows to read values.`}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover(last)}
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
        className="block touch-pan-y outline-none focus-visible:rounded-[10px] focus-visible:ring-2 focus-visible:ring-forest/30"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={INK.grid} strokeWidth="1" />
            <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={INK.muted}>{tick(t)}</text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontSize="11" fill={INK.muted}>{points[i]?.label}</text>
        ))}
        <path d={area} fill={color} fillOpacity="0.1" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke={INK.secondary} strokeWidth="1" />}
        <circle cx={x(h ? hover : last)} cy={y((h || points[last]).value)} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-[10px] border border-line bg-white px-3 py-2 shadow-lift"
          style={{ left: Math.min(Math.max(x(hover) - 70, 0), width - 150), width: 140 }}
        >
          <p className="tnum text-[14px] font-bold text-ink">{format(h.value)}</p>
          <p className="text-[11.5px] text-ink-50">{h.label}{sub ? ` · ${sub(h)}` : ''}</p>
        </div>
      )}
    </div>
  );
}

/* ── horizontal bar list (value at the tip, per-bar tooltip) ───────────────── */
export function BarList({ rows, format = (v) => v, color = FOREST, detail, max: forcedMax }) {
  const [hover, setHover] = useState(null);
  const max = forcedMax ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => {
        const pct = Math.max(1.5, (r.value / max) * 100);
        const c = r.color || color;
        return (
          <li
            key={r.key || r.label}
            tabIndex={0}
            aria-label={`${r.label}: ${format(r.value)}${detail ? `, ${detail(r)}` : ''}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="relative rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-forest/30"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className="min-w-0 truncate font-semibold text-ink-70">{r.label}</span>
              <span className="tnum shrink-0 font-bold text-ink">{format(r.value)}</span>
            </div>
            <div className="h-3.5">
              <div
                className="h-full rounded-r-[4px] transition-[width,filter] duration-500"
                style={{ width: `${pct}%`, background: c, filter: hover === i ? 'brightness(1.12)' : undefined }}
              />
            </div>
            {hover === i && detail && (
              <div className="pointer-events-none absolute -top-9 right-0 z-10 whitespace-nowrap rounded-[10px] border border-line bg-white px-2.5 py-1.5 text-[11.5px] text-ink-50 shadow-lift">
                <span className="tnum font-bold text-ink">{format(r.value)}</span> · {detail(r)}
              </div>
            )}
          </li>
        );
      })}
      {rows.length === 0 && <li className="rounded-[12px] bg-[#f4f7f5] px-3 py-6 text-center text-[12.5px] text-ink-50">No data in this range</li>}
    </ul>
  );
}

/* ── donut (≤4 slices + Other, legend with % and values) ──────────────────── */
export function Donut({ slices, format = (v) => v, center, size = 168, colors = DONUT }) {
  const [hover, setHover] = useState(null);
  const data = useMemo(() => {
    const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
    const head = sorted.slice(0, colors.length);
    const rest = sorted.slice(colors.length);
    const out = head.map((s, i) => ({ ...s, color: s.color || colors[i] }));
    if (rest.length) out.push({ label: 'Other', value: rest.reduce((n, s) => n + s.value, 0), color: OTHER });
    return out;
  }, [slices, colors]);
  const total = data.reduce((n, s) => n + s.value, 0) || 1;
  const r = size / 2;
  const inner = r * 0.62;
  let a0 = -Math.PI / 2;
  const arcs = data.map((s) => {
    const a1 = a0 + (s.value / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a, rad) => [r + rad * Math.cos(a), r + rad * Math.sin(a)];
    const [x0, y0] = p(a0, r); const [x1, y1] = p(a1, r);
    const [x2, y2] = p(a1, inner); const [x3, y3] = p(a0, inner);
    const d = data.length === 1
      ? `M${r},0 A${r},${r} 0 1 1 ${r - 0.01},0 L${r - 0.01},${r - inner} A${inner},${inner} 0 1 0 ${r},${r - inner} Z`
      : `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${inner},${inner} 0 ${large} 0 ${x3},${y3} Z`;
    a0 = a1;
    return { ...s, d };
  });
  const h = hover != null ? arcs[hover] : null;

  return (
    /* legend beside the donut only when the card is wide enough for full labels */
    <div className="@container">
    <div className="flex flex-col items-center gap-4 @[460px]:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={data.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(', ')}>
          {arcs.map((s, i) => (
            <path
              key={s.label}
              d={s.d}
              fill={s.color}
              stroke="#fff"
              strokeWidth="2"
              opacity={hover == null || hover === i ? 1 : 0.35}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className="transition-opacity"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="tnum text-[18px] font-bold text-ink">{h ? `${Math.round((h.value / total) * 100)}%` : center?.value}</p>
            <p className="max-w-[90px] truncate text-[11px] font-semibold text-ink-50">{h ? h.label : center?.label}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5">
        {arcs.map((s, i) => (
          <li
            key={s.label}
            tabIndex={0}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className={cx('flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-[12.5px] outline-none transition', hover === i ? 'bg-[#f4f7f5]' : '', 'focus-visible:ring-2 focus-visible:ring-forest/30')}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-ink-70">{s.label}</span>
            <span className="tnum shrink-0 text-ink-50">{format(s.value)}</span>
            <span className="tnum w-10 shrink-0 text-right font-bold text-ink">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
