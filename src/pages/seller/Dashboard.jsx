import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { ChartCard, LineChart, BarList, Donut, SERIES } from '../../components/charts/Charts';
import { Kpi, Panel, StatusPill } from '../../components/admin/AdminUI';
import { useAuth } from '../../context/AuthContext';
import { useScopedOrders, useScopedProducts } from '../../lib/useScoped';
import { useSeller } from '../../layouts/SellerLayout';
import { useSettlements } from '../admin/Payouts';
import { pendingBalance } from '../../store/payouts';
import { useSettings } from '../../store/settings';
import { dailySeries, rupeesCompact } from '../../lib/analytics';
import { money } from '../../lib/format';

/* Seller dashboard: the retailer's own sales, orders to act on, payouts and
   stock — everything scoped to their retailerId. */
export default function SellerDashboard() {
  const { user } = useAuth();
  const { retailer, retailerId } = useSeller();
  const orders = useScopedOrders();
  const products = useScopedProducts();
  const { rows, held } = useSettlements();
  const plans = useSettings((s) => s.plans);

  const d = useMemo(() => {
    const parts = orders.flatMap((o) => o.parts.map((p) => ({ ...p, orderId: o.id, createdAt: o.createdAt, customer: o.customer, city: o.city })));
    const since = Date.now() - 30 * 86400000;
    const recent = parts.filter((p) => p.createdAt >= since);
    const live = recent.filter((p) => p.status !== 'Cancelled');
    const series = dailySeries(orders.map((o) => ({ ...o, total: o.parts.reduce((s, p) => s + (p.status === 'Cancelled' ? 0 : p.total), 0) })), 30).map((p) => ({ label: p.label, value: p.billed, orders: p.orders }));
    const units = new Map();
    for (const p of live) for (const l of p.lines) units.set(l.name, (units.get(l.name) || 0) + l.qty);
    return {
      parts,
      toAct: parts.filter((p) => p.status === 'Pending' || p.status === 'Processing').sort((a, b) => a.createdAt - b.createdAt),
      sales: live.reduce((s, p) => s + p.total, 0),
      share: live.reduce((s, p) => s + p.retailerShare, 0),
      cancelled: recent.length ? Math.round(((recent.length - live.length) / recent.length) * 100) : 0,
      series,
      top: [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ key: label, label, value })),
      status: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => ({ label: s, value: parts.filter((p) => p.status === s).length })),
    };
  }, [orders]);
  const bal = pendingBalance(rows, held, retailerId);
  const low = products.filter((p) => p.stock <= 8).sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#173d33_0%,#1f5c4a_100%)] p-5 text-white shadow-pop sm:p-8">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100">{retailer.name} · {plans.find((p) => p.id === retailer.plan)?.name} plan</p>
            <h1 className="font-hero mt-3 text-[clamp(1.6rem,4vw,2.5rem)] font-semibold text-white">Hello {user.fullName.split(' ')[0]} — {d.toAct.length ? `${d.toAct.length} order${d.toAct.length > 1 ? 's' : ''} to pack.` : 'you’re all caught up.'}</h1>
            <p className="mt-2 text-[14px] text-emerald-100">Your share lands in your bank every week through Razorpay. Commission: {retailer.commission?.rate ?? 10}% of each order.</p>
          </div>
          <Link to="/seller/orders" className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-[13.5px] font-bold text-forest">Open orders <Icon name="arrowRight" size={15} /></Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Sales (30 days)" value={rupeesCompact(d.sales)} note={`${d.cancelled}% cancelled`} icon="rupee" />
        <Kpi label="Your share (30 days)" value={rupeesCompact(d.share)} note="After commission" icon="card" />
        <Kpi label="Owed to you" value={money(bal.unpaid)} note={`${money(bal.held)} held until delivery`} icon="clock" />
        <Kpi label="Low stock" value={low.length} note="8 units or fewer" icon="package" tone={low.length ? 'amber' : 'forest'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Your sales" note="Per day, last 30 days" table={{ headers: ['Day', 'Orders', 'Sales'], rows: d.series.filter((p) => p.orders).map((p) => [p.label, p.orders, money(p.value)]) }}>
          <LineChart points={d.series} format={money} tick={rupeesCompact} label="Sales per day" sub={(p) => `${p.orders} order${p.orders === 1 ? '' : 's'}`} />
        </ChartCard>
        <ChartCard title="Orders by status" table={{ headers: ['Status', 'Sub-orders'], rows: d.status.map((s) => [s.label, s.value]) }}>
          <Donut slices={d.status.filter((s) => s.label !== 'Cancelled')} format={(v) => `${v}`} center={{ value: d.parts.length, label: 'orders' }} />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Pack these next" note="Oldest first" className="lg:col-span-1">
          <ul className="space-y-2">
            {d.toAct.slice(0, 6).map((p) => (
              <li key={p.id}><Link to={`/seller/orders/${p.orderId}`} className="flex items-center justify-between gap-2 rounded-[14px] bg-[#f6f3ed] px-3 py-2.5 text-[13px] hover:bg-sunk"><span className="min-w-0"><span className="font-mono font-bold text-ink">{p.id}</span><span className="block truncate text-[11.5px] text-ink-50">{p.customer} · {p.city}</span></span><StatusPill status={p.status} /></Link></li>
            ))}
            {!d.toAct.length && <li className="text-[13px] text-ink-50">Nothing waiting.</li>}
          </ul>
        </Panel>
        <ChartCard title="Best sellers" note="Units, last 30 days" table={{ headers: ['Product', 'Units'], rows: d.top.map((r) => [r.label, r.value]) }}>
          <BarList rows={d.top} format={(v) => `${v} units`} color={SERIES[0]} />
        </ChartCard>
        <Panel title="Running low" note="Restock before they sell out">
          <ul className="space-y-1.5 text-[12.5px]">
            {low.slice(0, 7).map((p) => <li key={p.id} className="flex justify-between gap-2 rounded-[10px] bg-[#f6f3ed] px-2.5 py-1.5"><span className="truncate text-ink-70">{p.name}</span><b className={p.stock ? 'text-amber' : 'text-clay-600'}>{p.stock}</b></li>)}
            {!low.length && <li className="text-ink-50">Stock looks healthy.</li>}
          </ul>
          <Link to="/seller/products" className="mt-3 inline-block text-[12.5px] font-bold text-forest hover:underline">Update stock →</Link>
        </Panel>
      </div>
    </div>
  );
}
