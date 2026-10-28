import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../Icon';
import { cx } from '../../lib/format';
import { downloadSheet, isoDate } from '../../lib/exportSheet';
import { audit } from '../../lib/auditLog';
import { useToast } from '../../context/ToastContext';

/* ============================================================================
 * DataTable — the list view every Super Admin and seller list uses
 * (requirement 7): search, filters, date range, sorting, pagination, column
 * choice, bulk actions where safe, CSV export (role-limited and audited,
 * requirement 23), and a row click that opens the detail page.
 *
 * columns: [{ key, label, render?(row), value?(row), align?, hidden?,
 *             sortable? (default true), csv? (false to leave out) }]
 * filters: [{ key, label, options: [{ value, label }], test(row, value) }]
 * ==========================================================================*/

const DATE_PRESETS = [
  { key: '', label: 'Any time' },
  { key: '1', label: 'Today' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];

const readCols = (id) => {
  try { return JSON.parse(localStorage.getItem(`nivora_cols_${id}`) || 'null'); } catch { return null; }
};

const valueOf = (c, row) => (c.value ? c.value(row) : row[c.key]);

function Pill({ children, active, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={cx('flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-bold transition', active ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-70 hover:border-forest/40 hover:text-forest', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

function SelectPill({ label, value, onChange, options }) {
  return (
    <label className={cx('relative flex h-10 shrink-0 items-center rounded-full border pl-3.5 pr-8 text-[12.5px] font-bold transition', value ? 'border-forest bg-emerald-50 text-forest' : 'border-line bg-white text-ink-70')}>
      <span className="mr-1 text-ink-50">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label}>
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className="max-w-[140px] truncate">{value ? options.find((o) => o.value === value)?.label : 'All'}</span>
      <Icon name="chevronDown" size={13} className="pointer-events-none absolute right-3" />
    </label>
  );
}

export default function DataTable({
  id,
  rows,
  columns,
  rowKey = (r) => r.id,
  searchText,
  searchPlaceholder = 'Search',
  filters = [],
  date,
  onRowClick,
  bulkActions = [],
  exportName,
  canExport = true,
  initialSort,
  pageSize: initialSize = 25,
  toolbar,
  empty = 'Nothing matches these filters.',
  rowClass,
  initialQuery = '',
}) {
  const toast = useToast();
  const [q, setQ] = useState(initialQuery);
  const [fv, setFv] = useState({});
  const [range, setRange] = useState('');
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialSize);
  const [sel, setSel] = useState(() => new Set());
  const [colsOpen, setColsOpen] = useState(false);
  const [shown, setShown] = useState(() => readCols(id) || columns.filter((c) => !c.hidden).map((c) => c.key));
  const colsRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(`nivora_cols_${id}`, JSON.stringify(shown)); } catch { /* ignore */ }
  }, [id, shown]);
  useEffect(() => {
    const close = (e) => { if (!colsRef.current?.contains(e.target)) setColsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => { setPage(0); }, [q, fv, range, size]);

  const visibleCols = columns.filter((c) => shown.includes(c.key) || c.always);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const since = range ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() - (Number(range) - 1) * 86400000; })() : 0;
    let out = rows.filter((r) => {
      if (n && !(searchText ? searchText(r) : JSON.stringify(r)).toLowerCase().includes(n)) return false;
      for (const f of filters) if (fv[f.key] && !f.test(r, fv[f.key])) return false;
      if (since && date && (date(r) || 0) < since) return false;
      return true;
    });
    if (sort) {
      const c = columns.find((x) => x.key === sort.key);
      if (c) {
        out = [...out].sort((a, b) => {
          const va = valueOf(c, a);
          const vb = valueOf(c, b);
          const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), 'en', { numeric: true });
          return sort.dir === 'asc' ? d : -d;
        });
      }
    }
    return out;
  }, [rows, q, fv, range, sort, filters, columns, searchText, date]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * size, cur * size + size);
  const selectedRows = filtered.filter((r) => sel.has(rowKey(r)));
  const allOnPage = slice.length > 0 && slice.every((r) => sel.has(rowKey(r)));

  const toggleSort = (c) => {
    if (c.sortable === false) return;
    setSort((s) => (s?.key === c.key ? (s.dir === 'desc' ? { key: c.key, dir: 'asc' } : null) : { key: c.key, dir: 'desc' }));
  };

  const doExport = () => {
    const cols = visibleCols.filter((c) => c.csv !== false);
    const csvVal = (c, r) => {
      const v = typeof c.csv === 'function' ? c.csv(r) : valueOf(c, r);
      return v instanceof Date ? isoDate(v) : v;
    };
    downloadSheet(`nivora-${exportName}-${isoDate()}.csv`, cols.map((c) => c.label), filtered.map((r) => cols.map((c) => csvVal(c, r))));
    audit({ action: 'export.csv', entity: exportName, summary: `Exported ${filtered.length} ${exportName} rows to CSV${q || Object.values(fv).some(Boolean) || range ? ' (filtered)' : ''}` });
    toast.success(`${filtered.length} rows exported`);
  };

  const activeFilters = Object.values(fv).filter(Boolean).length + (range ? 1 : 0) + (q ? 1 : 0);

  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-line bg-white shadow-card">
      <div className="space-y-3 border-b border-line-soft p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-35" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-10 w-full rounded-full border border-line bg-canvas/40 pl-10 pr-4 text-[13.5px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-35 focus:border-forest/40 focus:bg-white"
            />
          </label>
          {toolbar}
          <div ref={colsRef} className="relative">
            <Pill onClick={() => setColsOpen((v) => !v)} aria-expanded={colsOpen}><Icon name="list" size={14} /> Columns</Pill>
            {colsOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-[16px] border border-line bg-white p-2 shadow-lift">
                <p className="px-2 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-35">Show columns</p>
                {columns.filter((c) => !c.always).map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-[13px] font-semibold text-ink-70 hover:bg-sunk/60">
                    <input type="checkbox" className="accent-[#1f5c4a]" checked={shown.includes(c.key)} onChange={(e) => setShown((s) => (e.target.checked ? [...s, c.key] : s.filter((k) => k !== c.key)))} />
                    {c.label}
                  </label>
                ))}
                <button type="button" onClick={() => setShown(columns.filter((c) => !c.hidden).map((c) => c.key))} className="mt-1 w-full rounded-[10px] px-2 py-1.5 text-left text-[12px] font-bold text-forest hover:bg-sunk/60">Reset to default</button>
              </div>
            )}
          </div>
          {exportName && canExport && (
            <Pill onClick={doExport} disabled={!filtered.length}><Icon name="external" size={14} /> Export CSV</Pill>
          )}
        </div>
        {(filters.length > 0 || date) && (
          <div className="no-bar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5">
            <Icon name="filter" size={15} className="shrink-0 text-ink-35" />
            {filters.map((f) => (
              <SelectPill key={f.key} label={f.label} value={fv[f.key] || ''} onChange={(v) => setFv((s) => ({ ...s, [f.key]: v }))} options={f.options} />
            ))}
            {date && <SelectPill label="Date" value={range} onChange={setRange} options={DATE_PRESETS.filter((d) => d.key).map((d) => ({ value: d.key, label: d.label }))} />}
            {activeFilters > 0 && (
              <button type="button" onClick={() => { setQ(''); setFv({}); setRange(''); }} className="shrink-0 px-2 text-[12.5px] font-bold text-clay-600 hover:underline">Clear all</button>
            )}
          </div>
        )}
      </div>

      {bulkActions.length > 0 && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-emerald-50/70 px-4 py-2.5">
          <span className="text-[13px] font-bold text-forest">{selectedRows.length} selected</span>
          {bulkActions.map((a) => (
            <button key={a.label} type="button" onClick={() => { a.run(selectedRows); setSel(new Set()); }} className={cx('flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-bold transition', a.tone === 'danger' ? 'border-clay/30 bg-white text-clay-600 hover:bg-clay-50' : 'border-forest/30 bg-white text-forest hover:bg-sunk')}>
              {a.icon && <Icon name={a.icon} size={13} />} {a.label}
            </button>
          ))}
          <button type="button" onClick={() => setSel(new Set())} className="ml-auto text-[12px] font-bold text-ink-50 hover:text-ink">Clear selection</button>
        </div>
      )}

      <div className="thin-bar overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead className="bg-[#f6f3ed]">
            <tr>
              {bulkActions.length > 0 && (
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" aria-label="Select all on this page" className="accent-[#1f5c4a]" checked={allOnPage} onChange={(e) => setSel((s) => { const n = new Set(s); slice.forEach((r) => (e.target.checked ? n.add(rowKey(r)) : n.delete(rowKey(r)))); return n; })} />
                </th>
              )}
              {visibleCols.map((c) => (
                <th key={c.key} className={cx('whitespace-nowrap px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-forest-800', c.align === 'right' && 'text-right')}>
                  {c.sortable === false ? c.label : (
                    <button type="button" onClick={() => toggleSort(c)} className={cx('inline-flex items-center gap-1 uppercase hover:text-forest', c.align === 'right' && 'flex-row-reverse')}>
                      {c.label}
                      <Icon name={sort?.key === c.key ? (sort.dir === 'asc' ? 'chevronUp' : 'chevronDown') : 'chevronDown'} size={12} className={sort?.key === c.key ? 'text-forest' : 'text-ink-35/50'} />
                    </button>
                  )}
                </th>
              ))}
              {onRowClick && <th className="w-8" aria-hidden />}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              const k = rowKey(r);
              return (
                <tr
                  key={k}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cx('group border-t border-line-soft transition', onRowClick && 'cursor-pointer hover:bg-[#f8f6f1]', sel.has(k) && 'bg-emerald-50/50', rowClass?.(r))}
                >
                  {bulkActions.length > 0 && (
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label="Select row" className="accent-[#1f5c4a]" checked={sel.has(k)} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(k); else n.delete(k); return n; })} />
                    </td>
                  )}
                  {visibleCols.map((c) => (
                    <td key={c.key} className={cx('px-3 py-3 align-middle text-ink-70', c.align === 'right' && 'tnum text-right', c.className)}>
                      {c.render ? c.render(r) : valueOf(c, r)}
                    </td>
                  ))}
                  {onRowClick && <td className="pr-3 text-ink-35 transition group-hover:translate-x-0.5 group-hover:text-forest"><Icon name="chevronRight" size={15} /></td>}
                </tr>
              );
            })}
            {slice.length === 0 && (
              <tr><td colSpan={visibleCols.length + 2} className="px-4 py-14 text-center text-[13px] text-ink-50">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-[12.5px] text-ink-50">
        <span className="tnum">{filtered.length ? `${cur * size + 1}–${Math.min(filtered.length, cur * size + size)} of ${filtered.length.toLocaleString('en-IN')}` : '0 rows'}{filtered.length !== rows.length && <> · {rows.length.toLocaleString('en-IN')} total</>}</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            Rows
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-8 rounded-full border border-line bg-white px-2 text-[12.5px] font-bold text-ink outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-forest disabled:opacity-35" aria-label="Previous page"><Icon name="chevronLeft" size={14} /></button>
          <span className="tnum font-bold text-ink">{cur + 1} / {pages}</span>
          <button type="button" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-forest disabled:opacity-35" aria-label="Next page"><Icon name="chevronRight" size={14} /></button>
        </div>
      </div>
    </section>
  );
}
