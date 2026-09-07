import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import ExportDialog from '../../components/admin/ExportDialog';
import { Badge, Button, Field } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { orders as SEED, ORDER_FLOW, ORDER_STATUSES, formatOrderDate } from '../../data/orders';
import { downloadSheet, hyperlink, invoiceUrl, isoDate } from '../../lib/exportSheet';
import { money, cx } from '../../lib/format';

const TONE = { Pending: 'amber', Processing: 'slate', Shipped: 'slate', Delivered: 'ok', Cancelled: 'clay' };

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-serif text-[clamp(1.5rem,4vw,2rem)]">Orders</h1>
          <p className="text-[13px] text-ink-50">{filtered.length} of {rows.length} orders · demo data</p>
        </div>
        <Button size="sm" variant="outline" icon="external" onClick={() => setExporting(true)}>
          Export to Excel
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-line bg-white p-3">
        <div className="min-w-[200px] flex-1">
          <Field placeholder="Search order # or customer" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-[13px] font-semibold outline-none">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        {filtered.map((o, i) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-0"
          >
            <span className="font-mono text-[13px] font-bold">{o.id}</span>
            <span className="text-[13px] text-ink-70">{o.customer}</span>
            <Badge tone={TONE[o.status]}>{o.status}</Badge>
            <span className="text-[12px] text-ink-35">{o.items} items · {formatOrderDate(o.createdAt)}</span>
            <span className="tnum ml-auto text-[14px] font-extrabold">{money(o.total)}</span>
            <Link
              to={`/invoice/${o.id}`}
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-70 transition hover:border-ink-35 hover:text-ink"
            >
              <Icon name="fileText" size={13} /> Invoice
            </Link>
            {o.status !== 'Delivered' && o.status !== 'Cancelled' && (
              <button onClick={() => advance(o.id)} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-70 transition hover:border-ink-35 hover:text-ink">
                <Icon name="chevronsRight" size={13} /> Advance
              </button>
            )}
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-ink-50">No orders match.</p>}
      </div>

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
