import { useMemo, useState } from 'react';
import Modal from '../Modal';
import Icon from '../Icon';
import { Button } from '../ui';
import { cx } from '../../lib/format';
import { isoDate, withinRange } from '../../lib/exportSheet';

/* ============================================================================
 * ExportDialog — pick a date range (or a single day) and which statuses to
 * include, see the live match count, then download.
 *
 *   rows       full data set
 *   statuses   string[] of every selectable status
 *   getDate    row -> ms timestamp
 *   getStatus  row -> status string
 *   onExport   (matchedRows, meta) => void   // does the actual download
 * ==========================================================================*/
export default function ExportDialog({
  open,
  onClose,
  title = 'Export to Excel',
  rows = [],
  statuses = [],
  getDate = () => Date.now(),
  getStatus = () => '',
  onExport,
}) {
  const today = isoDate();
  const [singleDay, setSingleDay] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [picked, setPicked] = useState(() => new Set(statuses));

  const allOn = picked.size === statuses.length;
  const toggle = (s) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  const toggleAll = () => setPicked(allOn ? new Set() : new Set(statuses));

  const matched = useMemo(() => {
    const f = from || null;
    const t = singleDay ? from || null : to || null;
    return rows.filter((r) => {
      if (statuses.length && !picked.has(getStatus(r))) return false;
      return withinRange(getDate(r), f, t);
    });
  }, [rows, picked, from, to, singleDay, statuses.length, getDate, getStatus]);

  const run = () => {
    onExport(matched, {
      from: from || null,
      to: singleDay ? from || null : to || null,
      statuses: [...picked],
      singleDay,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-5">
        {/* range */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-ink-35">Date range</p>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink-70">
              <input type="checkbox" checked={singleDay} onChange={(e) => setSingleDay(e.target.checked)} className="sr-only" />
              <span className={cx('grid h-5 w-9 items-center rounded-full border p-0.5 transition', singleDay ? 'border-forest bg-forest' : 'border-line bg-sunk')}>
                <span className={cx('h-4 w-4 rounded-full bg-white transition-transform', singleDay && 'translate-x-4')} />
              </span>
              Single day only
            </label>
          </div>

          <div className={cx('grid gap-3', singleDay ? 'sm:grid-cols-1' : 'sm:grid-cols-2')}>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">
                {singleDay ? 'Date' : 'From'}
              </span>
              <input
                type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)}
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15"
              />
            </label>
            {!singleDay && (
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">To</span>
                <input
                  type="date" value={to} min={from || undefined} max={today} onChange={(e) => setTo(e.target.value)}
                  className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15"
                />
              </label>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-ink-35">
            {singleDay
              ? 'Pick one date — everything from that day is exported.'
              : 'Leave both blank to export every date.'}
          </p>
        </div>

        {/* statuses */}
        {statuses.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12.5px] font-bold uppercase tracking-wider text-ink-35">Status</p>
              <button onClick={toggleAll} className="text-[12.5px] font-semibold text-emerald-600 transition hover:text-emerald-700">
                {allOn ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {statuses.map((s) => {
                const on = picked.has(s);
                return (
                  <label key={s} className="group flex cursor-pointer items-center gap-2 rounded-md border border-line px-2.5 py-2 transition hover:border-ink-35">
                    <span className={cx('grid h-[18px] w-[18px] shrink-0 place-items-center rounded border transition', on ? 'border-forest bg-forest text-white' : 'border-line bg-white')}>
                      {on && <Icon name="check" size={11} strokeWidth={3} />}
                    </span>
                    <input type="checkbox" checked={on} onChange={() => toggle(s)} className="sr-only" />
                    <span className="text-[13px] text-ink-70">{s}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-canvas px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-[13px] text-ink-70">
            <Icon name="fileText" size={15} className="text-emerald-600" />
            <span className="tnum font-bold text-ink">{matched.length}</span>
            {matched.length === 1 ? 'row' : 'rows'} will be exported
          </span>
          <span className="text-[11.5px] text-ink-35">Includes an invoice link column</span>
        </div>

        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">
            Cancel
          </button>
          <Button onClick={run} disabled={matched.length === 0} icon="external">
            Download {matched.length > 0 ? `(${matched.length})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
