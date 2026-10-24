import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import { ChartCard, ColumnChart, LineChart, BarList, Donut, SERIES } from '../../components/charts/Charts';
import { Panel, StatusPill } from '../../components/admin/AdminUI';
import { CreateOrderDialog, UpdateStockDialog } from '../../components/seller/QuickActions';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useScopedOrders, useScopedProducts } from '../../lib/useScoped';
import { useSeller } from '../../layouts/SellerLayout';
import { useSettlements } from '../admin/Payouts';
import { pendingBalance } from '../../store/payouts';
import { categoryName } from '../../data/catalog';
import { dailySeries, rupeesCompact } from '../../lib/analytics';
import { cx, money } from '../../lib/format';

/* Seller dashboard — the approved reference design (client review 6): the
   green "Retail operations" hero with quick actions, a KPI strip, then the
   sales trend (line), revenue by sub-category (pie) and orders per day (bar),
   and the work lists. Every number is this retailer's own (scoped). */

const RANGES = [[7, '7D'], [30, '30D'], [90, '90D']];
const DAY = 86400000;

function QuickAction({ icon, label, note, onClick, to, primary }) {
  const body = (
    <>
      <span className={cx('grid h-9 w-9 place-items-center rounded-[12px]', primary ? 'bg-forest/10 text-forest' : 'bg-white/10 text-white')}><Icon name={icon} size={17} /></span>
      <span className="mt-3 flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className={cx('block text-[14px] font-bold', primary ? 'text-forest' : 'text-white')}>{label}</span>
          <span className={cx('block truncate text-[11.5px]', primary ? 'text-ink-50' : 'text-emerald-100/80')}>{note}</span>
        </span>
        <Icon name="arrowRight" size={15} className={cx('shrink-0 transition group-hover:translate-x-1', primary ? 'text-forest' : 'text-white/70')} />
      </span>
    </>
  );
  const cls = cx('group block min-w-0 rounded-[18px] p-3.5 text-left transition hover:-translate-y-0.5 sm:p-4',
    primary ? 'bg-white shadow-lift' : 'border border-white/15 bg-white/[0.08] backdrop-blur hover:bg-white/[0.14]');
  return to ? <Link to={to} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>;
}

function Stat({ label, value, note, chip, chipTone = 'ok', to }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => to && navigate(to)} className="group min-w-0 rounded-[18px] bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-ink-50">{label}</span>
        {chip && <span className={cx('tnum rounded-full px-2 py-0.5 text-[10.5px] font-bold', chipTone === 'warn' ? 'bg-amber-50 text-amber' : chipTone === 'bad' ? 'bg-clay-50 text-clay-600' : 'bg-emerald-50 text-emerald-700')}>{chip}</span>}
      </span>
      <span className="tnum mt-3 block text-[clamp(1.4rem,3vw,1.8rem)] font-semibold tracking-[-0.03em] text-ink">{value}</span>
      <span className="mt-1 block truncate text-[12px] text-ink-50">{note}</span>
    </button>
  );
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const { canSection } = useIam();
  const { retailer, retailerId, readOnly } = useSeller();
  const orders = useScopedOrders();
  const products = useScopedProducts();
  const { rows, held } = useSettlements();
  const [range, setRange] = useState(30);
  const [dialog, setDialog] = useState(null);

  const d = useMemo(() => {
    const now = Date.now();
    const parts = orders.flatMap((o) => o.parts.map((p) => ({ ...p, orderId: o.id, createdAt: o.createdAt, customer: o.customer, city: o.city })));
    const live = parts.filter((p) => p.status !== 'Cancelled');
    const sumSince = (ms) => live.filter((p) => p.createdAt >= ms).reduce((s, p) => s + p.total, 0);
    const today0 = new Date().setHours(0, 0, 0, 0);
    const series = dailySeries(orders.map((o) => ({ ...o, total: o.parts.reduce((s, p) => s + (p.status === 'Cancelled' ? 0 : p.total), 0) })), range)
      .map((p) => ({ key: p.t, label: p.label, value: p.billed, orders: p.orders }));
    const inRange = live.filter((p) => p.createdAt >= now - range * DAY);
    const prev = live.filter((p) => p.createdAt >= now - 2 * range * DAY && p.createdAt < now - range * DAY).reduce((s, p) => s + p.total, 0);
    const sales = inRange.reduce((s, p) => s + p.total, 0);
    const share = inRange.reduce((s, p) => s + p.retailerShare, 0);
    /* revenue by sub-category, from the lines of this store's parts */
    const bySub = new Map();
    const units = new Map();
    for (const p of inRange) {
      for (const l of p.lines) {
        const key = l.category || products.find((x) => x.sku === l.sku)?.category || 'other';
        bySub.set(key, (bySub.get(key) || 0) + (l.amount ?? l.price * l.qty ?? 0));
        units.set(l.name, (units.get(l.name) || 0) + l.qty);
      }
    }
    return {
      parts,
      toAct: parts.filter((p) => p.status === 'Pending' || p.status === 'Processing').sort((a, b) => a.createdAt - b.createdAt),
      today: sumSince(today0),
      yesterday: live.filter((p) => p.createdAt >= today0 - DAY && p.createdAt < today0).reduce((s, p) => s + p.total, 0),
      newToday: parts.filter((p) => p.createdAt >= today0).length,
      sales, share, change: prev ? Math.round(((sales - prev) / prev) * 100) : null,
      series,
      revenue: [...bySub.entries()].map(([k, v]) => ({ label: k === 'other' ? 'Other' : categoryName(k), value: Math.round(v) })),
      top: [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ key: label, label, value })),
    };
  }, [orders, products, range]);

  const bal = pendingBalance(rows, held, retailerId);
  const low = products.filter((p) => p.stock <= 8).sort((a, b) => a.stock - b.stock);
  const inStockPct = products.length ? Math.round((products.filter((p) => p.stock > 0).length / products.length) * 100) : 100;
  const active = d.parts.filter((p) => ['Pending', 'Processing', 'Shipped'].includes(p.status)).length;
  const sharePct = d.sales ? Math.round((d.share / d.sales) * 100) : null;
  const can = (s) => !readOnly && canSection(s);

  return (
    <div className="space-y-5">
      {/* hero — "Retail operations", as in the approved design */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="forest-band band-live grain relative overflow-hidden rounded-[30px] p-5 text-white shadow-pop sm:p-8 lg:p-10">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(212,184,121,0.28),transparent_65%)]" />
        <div className="relative grid gap-7 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-emerald-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" /> Retail operations · {retailer.name}
            </span>
            <h1 className="font-hero mt-5 text-[clamp(2rem,4.6vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-white">
              Procure smarter.<br />Sell faster. Grow profitably.
            </h1>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-emerald-100/90">
              Hello {user.fullName.split(' ')[0]} — {d.toAct.length ? <><b className="text-white">{d.toAct.length} order{d.toAct.length > 1 ? 's' : ''}</b> waiting to be packed.</> : 'you’re all caught up.'} One place for your orders, stock, customers, discounts and payouts.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {can('products') && <QuickAction primary icon="package" label="Update stock" note={low.length ? `${low.length} running low` : 'Stock looks healthy'} onClick={() => setDialog('stock')} />}
            {can('orders') && <QuickAction icon="cart" label="Create order" note="Phone or counter order" onClick={() => setDialog('order')} />}
            {can('products') && <QuickAction icon="plus" label="Add product" note="Item code made for you" to="/seller/products?new=1" />}
            {canSection('billing') && <QuickAction icon="receipt" label="Generate invoice" note="GST invoice per order" to="/seller/billing" />}
          </div>
        </div>
      </motion.section>

      {/* KPI strip — each card opens its module */}
      <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-white/50 p-2.5 lg:grid-cols-4">
        <Stat label="Today’s sales" value={rupeesCompact(d.today)} note={`Yesterday ${money(d.yesterday)}`} chip={d.yesterday ? `${d.today >= d.yesterday ? '+' : ''}${Math.round(((d.today - d.yesterday) / d.yesterday) * 100)}%` : null} chipTone={d.today >= d.yesterday ? 'ok' : 'warn'} to="/seller/reports" />
        <Stat label="Active orders" value={active} note={`${d.toAct.length} to pack · rest on the way`} chip={d.newToday ? `+${d.newToday} new` : null} to="/seller/orders" />
        <Stat label="Inventory health" value={`${inStockPct}%`} note={`${products.length} products · in stock`} chip={low.length ? `${low.length} low` : null} chipTone={low.length ? 'warn' : 'ok'} to="/seller/products" />
        <Stat label="Owed to you" value={money(bal.unpaid)} note={sharePct != null ? `You keep ${sharePct}% after commission` : `${money(bal.held)} held until delivery`} to="/seller/payouts" />
      </div>

      {/* line + pie */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Sales trend"
          note={<>{rupeesCompact(d.sales)} in {range} days{d.change != null && <span className={cx('ml-1.5 font-bold', d.change >= 0 ? 'text-emerald-700' : 'text-clay-600')}>{d.change >= 0 ? '+' : ''}{d.change}% vs previous {range} days</span>}</>}
          action={(
            <div className="flex rounded-[10px] bg-sunk p-0.5">
              {RANGES.map(([n, l]) => <button key={n} onClick={() => setRange(n)} className={cx('rounded-[8px] px-2.5 py-1 text-[11.5px] font-bold', range === n ? 'bg-white text-forest shadow-sm' : 'text-ink-50')}>{l}</button>)}
            </div>
          )}
          table={{ headers: ['Day', 'Orders', 'Sales'], rows: d.series.filter((p) => p.orders).map((p) => [p.label, p.orders, money(p.value)]) }}
        >
          <LineChart points={d.series} height={300} format={money} tick={rupeesCompact} label="Sales per day" sub={(p) => `${p.orders} order${p.orders === 1 ? '' : 's'}`} />
        </ChartCard>
        <ChartCard title="Revenue distribution" note={`By sub-category, last ${range} days`} table={{ headers: ['Sub-category', 'Sales'], rows: d.revenue.map((r) => [r.label, money(r.value)]) }}>
          {d.revenue.length
            ? <Donut slices={d.revenue} format={money} center={{ value: rupeesCompact(d.sales), label: 'total revenue' }} />
            : <p className="rounded-[12px] bg-[#f4f7f5] px-3 py-10 text-center text-[12.5px] text-ink-50">No sales in this range yet</p>}
        </ChartCard>
      </div>

      {/* bar + best sellers */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Orders per day" note={`Last ${range} days`} table={{ headers: ['Day', 'Orders'], rows: d.series.filter((p) => p.orders).map((p) => [p.label, p.orders]) }}>
          <ColumnChart points={d.series.map((p) => ({ key: p.key, label: p.label, value: p.orders, sales: p.value }))} format={(v) => `${v} order${v === 1 ? '' : 's'}`} tick={(v) => v} label="Orders per day" sub={(p) => money(p.sales)} />
        </ChartCard>
        <ChartCard title="Best sellers" note={`Units, last ${range} days`} table={{ headers: ['Product', 'Units'], rows: d.top.map((r) => [r.label, r.value]) }}>
          <BarList rows={d.top} format={(v) => `${v} units`} color={SERIES[0]} />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Pack these next" note="Oldest first" action={<Link to="/seller/orders" className="text-[12.5px] font-bold text-forest hover:underline">All orders →</Link>}>
          <ul className="space-y-2">
            {d.toAct.slice(0, 6).map((p) => (
              <li key={p.id}><Link to={`/seller/orders/${p.orderId}`} className="flex items-center justify-between gap-2 rounded-[14px] bg-[#f6f3ed] px-3 py-2.5 text-[13px] hover:bg-sunk"><span className="min-w-0"><span className="font-mono font-bold text-ink">{p.id}</span><span className="block truncate text-[11.5px] text-ink-50">{p.customer} · {p.city} · {money(p.total)}</span></span><StatusPill status={p.status} /></Link></li>
            ))}
            {!d.toAct.length && <li className="text-[13px] text-ink-50">Nothing waiting.</li>}
          </ul>
        </Panel>
        <Panel title="Running low" note="Restock before they sell out" action={can('products') && <button onClick={() => setDialog('stock')} className="text-[12.5px] font-bold text-forest hover:underline">Update stock →</button>}>
          <ul className="space-y-1.5 text-[12.5px]">
            {low.slice(0, 7).map((p) => <li key={p.id} className="flex justify-between gap-2 rounded-[10px] bg-[#f6f3ed] px-2.5 py-1.5"><span className="truncate text-ink-70">{p.name}{p.size ? ` · ${p.size}` : ''}</span><b className={p.stock ? 'text-amber' : 'text-clay-600'}>{p.stock || 'Out'}</b></li>)}
            {!low.length && <li className="text-ink-50">Stock looks healthy.</li>}
          </ul>
        </Panel>
      </div>

      <UpdateStockDialog open={dialog === 'stock'} onClose={() => setDialog(null)} />
      <CreateOrderDialog open={dialog === 'order'} onClose={() => setDialog(null)} />
    </div>
  );
}
