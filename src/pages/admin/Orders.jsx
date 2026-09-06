import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import ExcelExportButton from '../../components/ExcelExportButton';
import { Badge, Button, Field } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { products } from '../../data/catalog';
import { money, deliveryBy, cx } from '../../lib/format';

const FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const TONE = { Pending: 'amber', Processing: 'slate', Shipped: 'slate', Delivered: 'ok', Cancelled: 'clay' };
const NAMES = ['Priya Sharma', 'Rahul Kumar', 'Amit Patel', 'Kavya Reddy', 'Imran Sheikh', 'Naveen Rao', 'Sana Fatima', 'Vikram Das'];

function seedOrders() {
  return Array.from({ length: 14 }).map((_, i) => {
    const lines = 1 + ((i * 7) % 4);
    const total = Array.from({ length: lines }).reduce((s, _, j) => s + products[(i * 53 + j * 17) % products.length].price * (1 + (j % 3)), 0);
    return {
      id: `NH-${4900 - i * 3}`,
      customer: NAMES[i % NAMES.length],
      items: lines,
      total: Math.round(total * 1.18),
      status: FLOW[(i + 1) % FLOW.length],
      date: deliveryBy(-(i * 2 + 1)),
    };
  });
}

export default function AdminOrders() {
  const toast = useToast();
  const [rows, setRows] = useState(seedOrders);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(
    () => rows.filter((o) => (!status || o.status === status) && (!q || `${o.id} ${o.customer}`.toLowerCase().includes(q.toLowerCase()))),
    [rows, q, status]
  );

  const advance = (id) =>
    setRows((r) => r.map((o) => {
      if (o.id !== id) return o;
      const next = FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(o.status) + 1)];
      toast.success(`${id} → ${next}`);
      return { ...o, status: next };
    }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-serif text-[clamp(1.5rem,4vw,2rem)]">Orders</h1>
          <p className="text-[13px] text-ink-50">{filtered.length} orders · demo data</p>
        </div>
        <ExcelExportButton endpoint="/admin/orders/export" filename="orders.xlsx" label="Export" />
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-line bg-white p-3">
        <div className="min-w-[200px] flex-1"><Field placeholder="Search order # or customer" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-[13px] font-semibold outline-none">
          <option value="">All statuses</option>
          {FLOW.concat('Cancelled').map((s) => <option key={s} value={s}>{s}</option>)}
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
            <span className="text-[12px] text-ink-35">{o.items} item{o.items !== 1 && 's'} · {o.date}</span>
            <span className="tnum ml-auto text-[14px] font-extrabold">{money(o.total)}</span>
            {o.status !== 'Delivered' && o.status !== 'Cancelled' && (
              <button onClick={() => advance(o.id)} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-70 hover:border-ink-35">
                <Icon name="chevronsRight" size={13} /> Advance
              </button>
            )}
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-ink-50">No orders match.</p>}
      </div>
    </div>
  );
}
