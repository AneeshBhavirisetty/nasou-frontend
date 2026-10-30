import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import Icon from '../../components/Icon';
import { AdminPageHead, Kpi, Panel, StatusPill } from '../../components/admin/AdminUI';
import { ChartCard, Donut } from '../../components/charts/Charts';
import { useScopedOrders } from '../../lib/useScoped';
import { useSettlements } from '../admin/Payouts';
import { pendingBalance } from '../../store/payouts';
import { useSeller } from '../../layouts/SellerLayout';
import { formatOrderDate } from '../../data/orders';
import { rupeesCompact } from '../../lib/analytics';
import { money } from '../../lib/format';

/* Seller › Billing & payments (client review 6, retailer items 7 and 13 —
   "how do we see invoices?"). One row per order part with its GST invoice,
   how the customer paid, and what reaches the store after commission; the
   money flow is spelled out above. Every invoice opens at /invoice/<order>,
   printable or saved as PDF. */

const DAY = 86400000;

export default function SellerBilling() {
  const orders = useScopedOrders();
  const { retailer, retailerId } = useSeller();
  const { rows: weeks, held } = useSettlements();
  const [days] = useState(90);

  const rows = useMemo(() => orders.map((o) => {
    const p = o.parts[0];
    return { ...o, part: p, paid: o.payment === 'Cash on delivery' ? (p.status === 'Delivered' ? 'Collected' : 'Due on delivery') : 'Paid' };
  }), [orders]);
  const live = rows.filter((r) => r.part.status !== 'Cancelled' && r.createdAt >= Date.now() - days * DAY);
  const billed = live.reduce((s, r) => s + r.part.total, 0);
  const gst = live.reduce((s, r) => s + (r.part.gst || 0), 0);
  const commission = live.reduce((s, r) => s + (r.part.commission || 0), 0);
  const share = live.reduce((s, r) => s + (r.part.retailerShare || 0), 0);
  const bal = pendingBalance(weeks, held, retailerId);
  const byMethod = useMemo(() => {
    const m = new Map();
    live.forEach((r) => m.set(r.payment, (m.get(r.payment) || 0) + r.part.total));
    return [...m.entries()].map(([label, value]) => ({ label, value: Math.round(value) }));
  }, [live]);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Billing & payments" note="Every order’s GST invoice, how it was paid, and what reaches your bank after commission." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={`Billed (${days} days)`} value={rupeesCompact(billed)} note={`${live.length} orders · incl. GST`} icon="receipt" />
        <Kpi label="GST on your invoices" value={rupeesCompact(gst)} note="Collected by Nivorva as the marketplace" icon="fileText" />
        <Kpi label="Commission" value={rupeesCompact(commission)} note={`${retailer?.commission?.rate ?? 10}% of each order`} icon="percent" />
        <Kpi label="Owed to you now" value={money(bal.unpaid)} note={`${money(bal.held)} held until delivery`} icon="rupee" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="How the money moves">
          <ol className="grid gap-3 sm:grid-cols-4">
            {[
              ['cart', 'Customer pays Nivorva', 'UPI, card, net banking, or cash on delivery.'],
              ['receipt', 'GST invoice per order', 'In your store’s name with your GSTIN — open it below.'],
              ['percent', 'Commission comes off', `${retailer?.commission?.rate ?? 10}% of the order total.`],
              ['rupee', 'Weekly payout', 'Every Monday–Sunday week, once delivered, to your bank.'],
            ].map(([ic, t, d], i) => (
              <li key={t} className="rounded-[16px] bg-[#f6f3ed] p-3.5">
                <span className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-white text-forest shadow-card"><Icon name={ic} size={15} /></span><span className="font-hero text-[22px] font-semibold text-ink-35/60">0{i + 1}</span></span>
                <p className="mt-3 text-[13px] font-bold text-ink">{t}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-ink-50">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[12.5px] text-ink-50">Your share in the last {days} days: <b className="text-ink">{money(share)}</b>. Payout history is under <Link to="/seller/payouts" className="font-bold text-forest hover:underline">Payouts</Link>.</p>
        </Panel>
        <ChartCard title="Payment methods" note={`Share of billed value, last ${days} days`} table={{ headers: ['Method', 'Billed'], rows: byMethod.map((m) => [m.label, money(m.value)]) }}>
          {byMethod.length ? <Donut slices={byMethod} format={money} center={{ value: rupeesCompact(billed), label: 'billed' }} /> : <p className="rounded-[12px] bg-[#f3f6f4] px-3 py-10 text-center text-[12.5px] text-ink-50">No orders in this range</p>}
        </ChartCard>
      </div>

      <DataTable
        id="seller-invoices"
        rows={rows}
        columns={[
          { key: 'pid', label: 'Invoice', always: true, value: (r) => r.part.id, render: (r) => <span className="font-mono text-[12.5px] font-bold text-ink">{r.part.id}</span> },
          { key: 'createdAt', label: 'Date', render: (r) => formatOrderDate(r.createdAt) },
          { key: 'customer', label: 'Billed to' },
          { key: 'total', label: 'Total', align: 'right', value: (r) => r.part.total, render: (r) => money(r.part.total) },
          { key: 'gst', label: 'GST', align: 'right', value: (r) => r.part.gst || 0, render: (r) => money(r.part.gst || 0) },
          { key: 'share', label: 'Your share', align: 'right', value: (r) => r.part.retailerShare, render: (r) => money(r.part.retailerShare) },
          { key: 'payment', label: 'Paid by' },
          { key: 'paid', label: 'Payment', render: (r) => <StatusPill status={r.part.status === 'Cancelled' ? 'Cancelled' : r.paid} label={r.part.status === 'Cancelled' ? 'Cancelled' : r.paid} /> },
          { key: 'inv', label: '', render: (r) => <Link to={`/invoice/${r.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-full border border-forest/30 px-2.5 py-1 text-[11.5px] font-bold text-forest hover:bg-forest hover:text-white"><Icon name="fileText" size={12} /> Invoice</Link> },
        ]}
        searchText={(r) => `${r.part.id} ${r.customer} ${r.payment}`}
        searchPlaceholder="Search invoice or customer"
        filters={[{ key: 'paid', label: 'Payment', options: ['Paid', 'Collected', 'Due on delivery'].map((v) => ({ value: v, label: v })), test: (r, v) => r.paid === v }]}
        date={(r) => r.createdAt}
        initialSort={{ key: 'createdAt', dir: 'desc' }}
        exportName="my-invoices"
      />
    </div>
  );
}
