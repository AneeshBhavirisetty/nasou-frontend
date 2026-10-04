import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import { ChartCard, LineChart, BarList, Donut, SERIES } from '../../components/charts/Charts';
import { Kpi, Panel, StatusPill, Tabs } from '../../components/admin/AdminUI';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useAdminStore } from '../../context/AdminStore';
import { useRetailers, useRequests } from '../../store/retailers';
import { useRefunds } from '../../store/orders';
import { useSettings } from '../../store/settings';
import { useScopedOrders } from '../../lib/useScoped';
import { useSettlements } from './Payouts';
import { byProduct, dailySeries, rupeesCompact, withinDays } from '../../lib/analytics';
import { userRoleLabel } from '../../lib/roles';
import { money, cx } from '../../lib/format';

/* Super Admin dashboards (requirement 22): Executive, Retailer performance,
   Operations, Finance, Customers & catalog. Every number is derived from
   the same order book, refunds and payouts the other screens use. */

const DAY = 86400000;
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);
const hours = (ms) => (ms / 3600000);
const logAt = (p, s) => p.statusLog?.find((x) => x.status === s)?.at;

function Delta({ now, before, dark = false }) {
  const d = pct(now, before);
  if (!before && !now) return null;
  const tone = dark ? 'rounded-full bg-white/15 px-1.5 text-white' : d >= 0 ? 'text-emerald-700' : 'text-clay-600';
  return <span className={cx('ml-1 font-bold', tone)}>{d >= 0 ? '▲' : '▼'} {Math.abs(d)}%</span>;
}

function useDashboardData() {
  const orders = useScopedOrders();
  const retailers = useRetailers();
  const refunds = useRefunds();
  const settings = useSettings();
  const { products } = useAdminStore();
  const { rows: payouts, held } = useSettlements();

  return useMemo(() => {
    const now = Date.now();
    const live = (o) => o.status !== 'Cancelled';
    const last30 = withinDays(orders, 30);
    const prev30 = orders.filter((o) => o.createdAt < now - 30 * DAY && o.createdAt >= now - 60 * DAY);
    const gmv = (list) => list.filter(live).reduce((s, o) => s + o.total, 0);
    const commission = (list) => list.reduce((s, o) => s + o.parts.filter((p) => p.status !== 'Cancelled').reduce((n, p) => n + p.commission, 0), 0);
    const mrr = retailers.filter((r) => r.status === 'approved').reduce((s, r) => s + (settings.plans.find((p) => p.id === r.plan)?.monthly || 0), 0);

    const firstOrder = new Map();
    [...orders].sort((a, b) => a.createdAt - b.createdAt).forEach((o) => { const k = o.userId || o.email || o.phone; if (!firstOrder.has(k)) firstOrder.set(k, o.createdAt); });
    const customers30 = new Set(last30.map((o) => o.userId || o.email || o.phone));
    const newCustomers = [...customers30].filter((k) => firstOrder.get(k) >= now - 30 * DAY).length;

    const parts = orders.flatMap((o) => o.parts.map((p) => ({ ...p, orderId: o.id, createdAt: o.createdAt, customer: o.customer })));
    const perRetailer = retailers.filter((r) => r.status !== 'pending' && r.status !== 'needs_changes' && r.status !== 'rejected').map((r) => {
      const mine = parts.filter((p) => p.retailerId === r.id);
      const done = mine.filter((p) => p.status === 'Delivered' && logAt(p, 'Delivered'));
      const fulfil = done.length ? done.reduce((s, p) => s + hours(logAt(p, 'Delivered') - p.createdAt), 0) / done.length : 0;
      return {
        id: r.id, name: r.name, status: r.status,
        sales: mine.filter((p) => p.status !== 'Cancelled').reduce((s, p) => s + p.total, 0),
        parts: mine.length,
        cancelRate: mine.length ? Math.round((mine.filter((p) => p.status === 'Cancelled').length / mine.length) * 100) : 0,
        fulfilHours: Math.round(fulfil),
        commission: mine.filter((p) => p.status !== 'Cancelled').reduce((s, p) => s + p.commission, 0),
      };
    }).sort((a, b) => b.sales - a.sales);

    const LIMIT = { Pending: 2, Processing: 3, Shipped: 5 };
    const delayed = parts.filter((p) => LIMIT[p.status] && now - ((p.statusLog?.[p.statusLog.length - 1]?.at) || p.createdAt) > LIMIT[p.status] * DAY)
      .map((p) => ({ ...p, stuckDays: Math.floor((now - (p.statusLog?.[p.statusLog.length - 1]?.at || p.createdAt)) / DAY) }))
      .sort((a, b) => b.stuckDays - a.stuckDays);

    const top = byProduct(last30).slice(0, 8);
    const sold = new Set(last30.flatMap((o) => o.lines.map((l) => l.id)));
    const noSale = products.filter((p) => !sold.has(p.id));
    const refunds30 = refunds.filter((r) => r.status === 'processed' && (r.processedAt || r.decidedAt || 0) >= now - 30 * DAY);

    return {
      orders, last30, prev30,
      gmv30: gmv(last30), gmvPrev: gmv(prev30),
      net30: commission(last30) + mrr, netPrev: commission(prev30) + mrr,
      commission30: commission(last30), mrr,
      orders30: last30.length, ordersPrev: prev30.length,
      aov: last30.filter(live).length ? Math.round(gmv(last30) / last30.filter(live).length) : 0,
      activeRetailers: retailers.filter((r) => r.status === 'approved').length,
      newCustomers, returning: customers30.size - newCustomers,
      series: dailySeries(orders, 30).map((p) => ({ label: p.label, value: p.billed, orders: p.orders })),
      commissionSeries: dailySeries(orders, 30).map((p) => ({ ...p, value: 0 })).map((p) => ({ ...p, value: commission(orders.filter((o) => new Date(o.createdAt).toDateString() === new Date(p.t).toDateString())) })),
      perRetailer, parts, delayed,
      partStatus: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => ({ label: s, value: parts.filter((p) => p.status === s).length })),
      flagged: orders.filter((o) => o.flagged),
      payouts, held,
      refunds30,
      top, noSale,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 8),
    };
  }, [orders, retailers, refunds, settings, products, payouts, held]);
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can, isOwner } = useIam();
  const retailers = useRetailers();
  const requests = useRequests();
  const refunds = useRefunds();
  const d = useDashboardData();
  const [tab, setTab] = useState('exec');

  const attention = [
    can('retailers') && { n: retailers.filter((r) => r.status === 'pending').length, label: 'retailers to approve', to: '/admin/approvals', icon: 'store' },
    can('retailers') && { n: retailers.filter((r) => r.pendingChanges).length, label: 'profile changes', to: '/admin/approvals?tab=changes', icon: 'pencil' },
    isOwner && { n: requests.filter((q) => q.status === 'open').length, label: 'Owner sign-offs', to: '/admin/approvals?tab=owner', icon: 'shield' },
    can('refunds', 'approve') && { n: refunds.filter((r) => r.status === 'requested').length, label: 'refunds to approve', to: '/admin/refunds', icon: 'refresh' },
    can('orders') && { n: d.delayed.length, label: 'delayed sub-orders', to: '/admin/orders', icon: 'clock' },
    can('orders') && { n: d.flagged.length, label: 'flagged orders', to: '/admin/orders', icon: 'bell' },
    can('payouts') && { n: d.payouts.filter((p) => p.status === 'pending').length, label: 'payouts to review', to: '/admin/payouts', icon: 'rupee' },
  ].filter((x) => x && x.n > 0);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const settled = d.payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#173d33_0%,#1f5c4a_60%,#2b6b55_100%)] p-5 text-white shadow-pop sm:p-8">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(229,216,199,0.28),transparent_65%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.2em]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-100" /> {userRoleLabel(user)}</p>
            <h2 className="font-hero mt-4 text-[clamp(1.7rem,4.2vw,2.8rem)] font-semibold leading-[1.05] text-white">{greet}, {user?.fullName?.split(' ')[0]}.</h2>
            <p className="mt-2 max-w-lg text-[14px] text-emerald-100">{d.activeRetailers} retailers are selling on Nivora. {rupeesCompact(d.gmv30)} in orders over the last 30 days <Delta dark now={d.gmv30} before={d.gmvPrev} />.</p>
          </div>
          <div className="rounded-[20px] border border-white/15 bg-white/[0.07] p-4 backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">Needs your attention</p>
            {attention.length ? (
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link to={a.to} className="flex items-center gap-2 rounded-[12px] bg-white/10 px-3 py-2 text-[13px] font-semibold transition hover:bg-white/20">
                      <Icon name={a.icon} size={14} /> <b className="tnum">{a.n}</b> <span className="truncate">{a.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 flex items-center gap-2 text-[13.5px] font-semibold"><Icon name="check" size={15} /> All clear — nothing waiting on you.</p>}
          </div>
        </div>
      </section>

      <Tabs value={tab} onChange={setTab} options={[
        { value: 'exec', label: 'Executive', icon: 'gauge' },
        { value: 'retail', label: 'Retailer performance', icon: 'store' },
        { value: 'ops', label: 'Operations', icon: 'truck' },
        { value: 'fin', label: 'Finance', icon: 'rupee' },
        { value: 'cust', label: 'Customers & catalog', icon: 'users' },
      ]} />

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
        {tab === 'exec' && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <Kpi label="Sales (30 days)" value={rupeesCompact(d.gmv30)} note={<>vs previous 30 <Delta now={d.gmv30} before={d.gmvPrev} /></>} icon="rupee" />
              <Kpi label="Net revenue" value={rupeesCompact(d.net30)} note="Commission + plan fees" icon="percent" />
              <Kpi label="Orders" value={d.orders30} note={<>last 30 days <Delta now={d.orders30} before={d.ordersPrev} /></>} icon="truck" />
              <Kpi label="Avg order value" value={money(d.aov)} note="Cancelled excluded" icon="cart" />
              <Kpi label="Active retailers" value={d.activeRetailers} note={`${retailers.length} on record`} icon="store" />
              <Kpi label="New customers" value={d.newCustomers} note={`${d.returning} returning`} icon="userPlus" />
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
              <ChartCard title="Sales trend" note="Order value per day, last 30 days" table={{ headers: ['Day', 'Orders', 'Value'], rows: d.series.filter((p) => p.orders).map((p) => [p.label, p.orders, money(p.value)]) }}>
                <LineChart points={d.series} format={money} tick={rupeesCompact} label="Order value per day" sub={(p) => `${p.orders} order${p.orders === 1 ? '' : 's'}`} />
              </ChartCard>
              <ChartCard title="Sales by retailer" note="Share of all live sub-orders" table={{ headers: ['Retailer', 'Sales'], rows: d.perRetailer.map((r) => [r.name, money(r.sales)]) }}>
                <Donut slices={d.perRetailer.map((r) => ({ label: r.name, value: r.sales }))} format={rupeesCompact} center={{ value: rupeesCompact(d.perRetailer.reduce((s, r) => s + r.sales, 0)), label: 'all time' }} />
              </ChartCard>
            </div>
          </>
        )}

        {tab === 'retail' && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Sales by retailer" note="All live sub-orders" table={{ headers: ['Retailer', 'Sales', 'Sub-orders'], rows: d.perRetailer.map((r) => [r.name, money(r.sales), r.parts]) }}>
                <BarList rows={d.perRetailer.map((r) => ({ key: r.id, label: r.name, value: r.sales, parts: r.parts }))} format={rupeesCompact} color={SERIES[0]} detail={(r) => `${r.parts} sub-orders`} />
              </ChartCard>
              <ChartCard title="Average fulfilment time" note="Order placed → delivered, hours" table={{ headers: ['Retailer', 'Hours'], rows: d.perRetailer.map((r) => [r.name, r.fulfilHours]) }}>
                <BarList rows={d.perRetailer.map((r) => ({ key: r.id, label: r.name, value: r.fulfilHours }))} format={(v) => `${v} h`} color={SERIES[1]} />
              </ChartCard>
            </div>
            <Panel title="Scorecard" pad={false}>
              <div className="thin-bar overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead className="bg-[#f6f3ed] text-left text-[11px] uppercase tracking-[0.1em] text-forest-800"><tr><th className="px-4 py-2.5">Retailer</th><th className="px-3">Status</th><th className="px-3 text-right">Sales</th><th className="px-3 text-right">Sub-orders</th><th className="px-3 text-right">Cancelled</th><th className="px-3 text-right">Fulfilment</th><th className="px-4 text-right">Commission</th></tr></thead>
                  <tbody>{d.perRetailer.map((r) => (
                    <tr key={r.id} onClick={() => navigate(`/admin/retailers/${r.id}`)} className="cursor-pointer border-t border-line-soft hover:bg-[#f8f6f1]">
                      <td className="px-4 py-2.5 font-bold text-ink">{r.name}</td><td className="px-3"><StatusPill status={r.status} /></td>
                      <td className="tnum px-3 text-right">{money(r.sales)}</td><td className="tnum px-3 text-right">{r.parts}</td>
                      <td className={cx('tnum px-3 text-right font-bold', r.cancelRate > 10 ? 'text-clay-600' : 'text-ink-70')}>{r.cancelRate}%</td>
                      <td className="tnum px-3 text-right">{r.fulfilHours ? `${r.fulfilHours} h` : '—'}</td><td className="tnum px-4 text-right">{money(r.commission)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {tab === 'ops' && (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
            <ChartCard title="Sub-orders by status" note={`${d.parts.length} sub-orders`} table={{ headers: ['Status', 'Sub-orders'], rows: d.partStatus.map((s) => [s.label, s.value]) }}>
              <BarList rows={d.partStatus.map((s, i) => ({ key: s.label, label: s.label, value: s.value, color: [SERIES[2], SERIES[1], '#5b9bd5', SERIES[0], SERIES[3]][i] }))} format={(v) => `${v}`} />
            </ChartCard>
            <Panel title="Delays" note="Pending over 2 days, processing over 3, shipped over 5." action={<Link to="/admin/orders" className="text-[12.5px] font-bold text-forest hover:underline">All orders →</Link>}>
              <ul className="space-y-2">
                {d.delayed.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link to={`/admin/orders/${p.orderId}`} className="flex items-center justify-between gap-3 rounded-[14px] bg-[#f6f3ed] px-3 py-2.5 text-[13px] transition hover:bg-sunk">
                      <span className="min-w-0"><span className="font-mono font-bold text-ink">{p.id}</span> <span className="text-ink-50">· {p.retailerName}</span></span>
                      <span className="flex shrink-0 items-center gap-2"><StatusPill status={p.status} /><b className="tnum text-clay-600">{p.stuckDays} d</b></span>
                    </Link>
                  </li>
                ))}
                {!d.delayed.length && <li className="text-[13px] text-ink-50">Nothing is running late.</li>}
              </ul>
              {d.flagged.length > 0 && <p className="mt-3 text-[12.5px] text-clay-600"><Icon name="bell" size={13} className="mr-1 inline" />{d.flagged.length} flagged order(s) also need support.</p>}
            </Panel>
          </div>
        )}

        {tab === 'fin' && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi label="Commission (30 d)" value={rupeesCompact(d.commission30)} icon="percent" />
              <Kpi label="Subscription revenue" value={`${money(d.mrr)}/mo`} note="Active plans" icon="card" />
              <Kpi label="Payouts to review" value={rupeesCompact(d.payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.net, 0))} icon="clock" tone="amber" />
              <Kpi label="Paid to retailers" value={rupeesCompact(settled)} note="All time" icon="rupee" />
              <Kpi label="Refunds (30 d)" value={rupeesCompact(d.refunds30.reduce((s, r) => s + r.amount, 0))} note={`${d.refunds30.length} refunds`} icon="refresh" />
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
              <ChartCard title="Commission per day" note="Last 30 days" table={{ headers: ['Day', 'Commission'], rows: d.commissionSeries.filter((p) => p.value).map((p) => [p.label, money(p.value)]) }}>
                <LineChart points={d.commissionSeries} format={money} tick={rupeesCompact} label="Commission per day" color={SERIES[0]} />
              </ChartCard>
              <ChartCard title="Payout status" note="Retailer × cycle" table={{ headers: ['Status', 'Amount'], rows: ['open', 'pending', 'approved', 'on_hold', 'paid'].map((s) => [s, money(d.payouts.filter((p) => p.status === s).reduce((n, p) => n + p.net, 0))]) }}>
                <Donut slices={[['Paid', 'paid'], ['To review', 'pending'], ['Approved', 'approved'], ['Open cycle', 'open']].map(([label, s]) => ({ label, value: Math.max(0, d.payouts.filter((p) => p.status === s).reduce((n, p) => n + p.net, 0)) }))} format={rupeesCompact} center={{ value: rupeesCompact(Object.values(d.held).reduce((s, v) => s + v, 0)), label: 'held' }} />
              </ChartCard>
            </div>
            <p className="text-[12.5px] text-ink-50"><Link to="/admin/reconciliation" className="font-bold text-forest hover:underline">Reconciliation</Link> lists anything Razorpay and our books disagree on.</p>
          </>
        )}

        {tab === 'cust' && (
          <div className="grid gap-5 lg:grid-cols-3">
            <ChartCard title="New vs returning" note="Customers who ordered in the last 30 days" table={{ headers: ['Type', 'Customers'], rows: [['New', d.newCustomers], ['Returning', d.returning]] }}>
              <Donut slices={[{ label: 'New', value: d.newCustomers }, { label: 'Returning', value: d.returning }]} format={(v) => `${v}`} center={{ value: d.newCustomers + d.returning, label: 'customers' }} />
            </ChartCard>
            <ChartCard title="Top products" note="Net sales, last 30 days" table={{ headers: ['Product', 'Units', 'Net'], rows: d.top.map((r) => [r.label, r.units, money(r.net)]) }}>
              <BarList rows={d.top.map((r) => ({ key: r.key, label: r.label, value: r.net, units: r.units }))} format={rupeesCompact} color={SERIES[1]} detail={(r) => `${r.units} units`} />
            </ChartCard>
            <Panel title="No-sale products" note={`${d.noSale.length.toLocaleString('en-IN')} listed products sold nothing in 30 days`}>
              <ul className="space-y-1.5 text-[12.5px]">
                {d.noSale.slice(0, 7).map((p) => <li key={p.id} className="flex justify-between gap-2 rounded-[10px] bg-[#f6f3ed] px-2.5 py-1.5"><span className="truncate text-ink-70">{p.name}</span><span className="tnum shrink-0 text-ink-50">{p.stock} in stock</span></li>)}
              </ul>
              <p className="mt-3 text-[12.5px] text-amber"><b>{d.lowStock.length}</b> products are down to 8 units or fewer.</p>
            </Panel>
          </div>
        )}
      </motion.div>
    </div>
  );
}
