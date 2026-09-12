import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import ExportDialog from '../../components/admin/ExportDialog';
import { AdminPageHead, FilterTabs, SearchInput } from '../../components/admin/AdminUI';
import { Badge, Button } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { orders as SEED, ORDER_FLOW, ORDER_STATUSES, formatOrderDate } from '../../data/orders';
import { downloadSheet, hyperlink, invoiceUrl, isoDate } from '../../lib/exportSheet';
import { money, cx } from '../../lib/format';

const TONE = { Pending: 'amber', Processing: 'slate', Shipped: 'slate', Delivered: 'ok', Cancelled: 'clay' };
const DOT = { Pending: 'bg-amber', Processing: 'bg-slate', Shipped: 'bg-slate', Delivered: 'bg-emerald', Cancelled: 'bg-clay' };

export default function AdminOrders() {
  const toast = useToast();
  const [rows, setRows] = useState(SEED);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(
    () => rows.filter((o) =>
      (!status || o.status === status) &&
      (!q || `${o.id} ${o.customer} ${o.email}`.toLowerCase().includes(q.toLowerCase()))
    ),
    [rows, q, status]
  );

  const counts = useMemo(() => {
    const n = q.toLowerCase();
    const hit = rows.filter((o) => !n || `${o.id} ${o.customer} ${o.email}`.toLowerCase().includes(n));
    const by = Object.fromEntries(ORDER_STATUSES.map((st) => [st, 0]));
    hit.forEach((o) => { by[o.status] += 1; });
    return { all: hit.length, by };
  }, [rows, q]);

  const inView = filtered.reduce((sum, o) => sum + (o.status === 'Cancelled' ? 0 : o.total), 0);

  const advance = (id) =>
    setRows((r) => r.map((o) => {
      if (o.id !== id) return o;
      const next = ORDER_FLOW[Math.min(ORDER_FLOW.length - 1, ORDER_FLOW.indexOf(o.status) + 1)];
      toast.success(`${id} → ${next}`);
      return { ...o, status: next };
    }));

  const runExport = (matched, meta) => {
    const headers = [
      'Order ID', 'Date', 'Customer', 'Email', 'Phone', 'City', 'PIN',
      'Items', 'Subtotal', 'GST', 'Delivery', 'Total', 'Payment', 'Status', 'Invoice link',
    ];
    const body = matched.map((o) => [
      o.id, formatOrderDate(o.createdAt), o.customer, o.email, `+91 ${o.phone}`, o.city, o.pin,
      o.items, o.subtotal, o.gst, o.shipping, o.total, o.payment, o.status,
      hyperlink(invoiceUrl(o.id), `Invoice ${o.id}`),
    ]);
    const stamp = meta.singleDay && meta.from ? meta.from
      : meta.from || meta.to ? `${meta.from || 'start'}_${meta.to || 'today'}`
        : isoDate();
    downloadSheet(`nasou-orders-${stamp}.csv`, headers, body);
    toast.success(`${matched.length} order${matched.length === 1 ? '' : 's'} exported with invoice links`);
  };

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Orders"
        note={<>{filtered.length} of {rows.length} orders · <span className="tnum font-semibold text-ink-70">{money(inView)}</span> in view · demo data</>}
      >
        <Button size="sm" variant="outline" icon="external" onClick={() => setExporting(true)}>
          Export to Excel
        </Button>
      </AdminPageHead>

      <div className="space-y-3 rounded-[20px] border border-line bg-white/86 p-3 shadow-[0_18px_40px_rgba(37,88,73,0.08)]">
        <SearchInput placeholder="Search order # or customer" value={q} onChange={(e) => setQ(e.target.value)} />
        <FilterTabs
          label="Order status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All', count: counts.all },
            ...ORDER_STATUSES.map((st) => ({ value: st, label: st, count: counts.by[st], dot: DOT[st] })),
          ]}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}
            >
              <OrderCard order={o} onAdvance={() => advance(o.id)} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-[#cad8d2] bg-[#f4f7f5] px-4 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="search" size={20} /></span>
          <p className="mt-3 text-[13px] text-ink-50">No orders match.</p>
        </div>
      )}

      <ExportDialog
        open={exporting}
        onClose={() => setExporting(false)}
        title="Export orders to Excel"
        rows={rows}
        statuses={ORDER_STATUSES}
        getDate={(o) => o.createdAt}
        getStatus={(o) => o.status}
        onExport={runExport}
      />
    </div>
  );
}

/* One order as a card: who, what, where it is in the flow, and the actions. */
function OrderCard({ order: o, onAdvance }) {
  const step = ORDER_FLOW.indexOf(o.status);
  const cancelled = o.status === 'Cancelled';
  const open = o.status !== 'Delivered' && !cancelled;
  const first = o.lines[0];
  const more = o.lines.length - 1;

  return (
    <article className="flex h-full flex-col rounded-[20px] border border-line bg-white p-4 shadow-[0_18px_40px_rgba(37,88,73,0.08)] transition hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-lift sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[14px] font-bold">{o.id}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-35">
            <Icon name="calendar" size={12} /> {formatOrderDate(o.createdAt)} · {o.payment}
          </p>
        </div>
        <Badge tone={TONE[o.status]}>{o.status}</Badge>
      </header>

      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-[13px] font-bold text-emerald-600">
          {o.customer[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold">{o.customer}</p>
          <p className="flex items-center gap-1 truncate text-[11.5px] text-ink-50">
            <Icon name="pin" size={11} /> {o.city} {o.pin}
          </p>
        </div>
      </div>

      {/* flow: Pending → Processing → Shipped → Delivered */}
      <div className="mt-4 rounded-md bg-canvas/70 px-3 py-2.5">
        {cancelled ? (
          <p className="flex items-center gap-2 text-[12px] font-semibold text-clay-600">
            <Icon name="close" size={13} /> Order cancelled
          </p>
        ) : (
          <>
            <div className="flex items-center gap-1" aria-hidden>
              {ORDER_FLOW.map((st, k) => (
                <span key={st} className={cx('h-1.5 flex-1 rounded-full', k <= step ? 'bg-emerald' : 'bg-line')} />
              ))}
            </div>
            <p className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-ink-35">
              {ORDER_FLOW.map((st, k) => (
                <span key={st} className={cx(k === step && 'text-emerald-600')}>{st}</span>
              ))}
            </p>
          </>
        )}
      </div>

      <p className="mb-4 mt-3 truncate text-[12px] text-ink-50" title={o.lines.map((l) => l.name).join(', ')}>
        <span className="font-semibold text-ink-70">{o.items} items</span>
        {first && <> · {first.name}{more > 0 && <span className="text-ink-35"> +{more} more</span>}</>}
      </p>

      <footer className="mt-auto flex items-center gap-2 border-t border-line pt-3.5">
        <div className="mr-auto">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-35">Total</p>
          <p className="tnum text-[17px] font-extrabold leading-tight">{money(o.total)}</p>
        </div>
        <Link
          to={`/invoice/${o.id}`}
          className="flex items-center gap-1 rounded-md border border-line px-2.5 py-2 text-[12px] font-semibold text-ink-70 transition hover:border-ink-35 hover:text-ink"
        >
          <Icon name="fileText" size={13} /> Invoice
        </Link>
        {open && (
          <button onClick={onAdvance} className="flex items-center gap-1 rounded-md border border-forest bg-forest px-2.5 py-2 text-[12px] font-semibold text-white transition hover:bg-forest-800">
            <Icon name="chevronsRight" size={13} /> Advance
          </button>
        )}
      </footer>
    </article>
  );
}
