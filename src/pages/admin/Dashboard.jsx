import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import Counter from '../../components/Counter';
import { Badge } from '../../components/ui';
import { ChartCard, LineChart, BarList, Donut, SERIES } from '../../components/charts/Charts';
import { adminApi } from '../../lib/api';
import { departments, suppliers } from '../../data/catalog';
import { allOrders, ORDER_STATUSES, formatOrderDate } from '../../data/orders';
import { useAdminStore } from '../../context/AdminStore';
import { useOrderStore } from '../../context/OrderStore';
import { useIam } from '../../context/IamStore';
import { billedOf, byBrand, bySubcategory, countBy, dailySeries, rupeesCompact, withinDays } from '../../lib/analytics';
import { money, cx } from '../../lib/format';

/* Admin dashboard (client review 2, admin item 1: line, bar and pie charts).
   Every number reads from the same order book as Orders / Billing / Reports
   (seeded demo orders + orders placed at checkout) via lib/analytics.js. */

const STATUS_TONE = { Pending: 'amber', Processing: 'slate', Shipped: 'slate', Delivered: 'ok', Cancelled: 'clay' };
const STATUS_BAR = { Pending: 'bg-amber', Processing: 'bg-slate', Shipped: 'bg-slate/60', Delivered: 'bg-emerald', Cancelled: 'bg-clay' };

/* Quick actions — shown only when the signed-in person may use them. */
const ACTIONS = [
  { label: 'Add product', icon: 'plus', to: '/admin/products?new=1', primary: true, module: 'products', need: 'edit' },
  { label: 'Manage orders', icon: 'truck', to: '/admin/orders', module: 'orders' },
  { label: 'Billing & payments', icon: 'rupee', to: '/admin/billing', module: 'billing' },
  { label: 'Reports', icon: 'barChart', to: '/admin/reports', module: 'reports' },
  { label: 'Discounts', icon: 'tag', to: '/admin/discounts', module: 'discounts' },
  { label: 'Users & access', icon: 'users', to: '/admin/users', module: 'users' },
];

function Panel({ className = '', children }) {
  return (
    <section className={cx('min-w-0 rounded-[20px] border border-line bg-white p-4 shadow-card sm:p-5', className)}>
      {children}
    </section>
  );
}

function PanelHead({ title, note, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] sm:text-lg">{title}</h2>
        {note && <p className="mt-0.5 text-[12.5px] text-ink-50">{note}</p>}
      </div>
      {action}
    </div>
  );
}

export default function AdminDashboard() {
  const { products } = useAdminStore();
  const { placed } = useOrderStore();
  const { can } = useIam();
  const [apiStats, setApiStats] = useState(null);

  /* a real backend can still supply headline totals; the demo derives them */
  useEffect(() => {
    let alive = true;
    adminApi.dashboard().then((r) => alive && r?.stats && setApiStats(r.stats)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const book = useMemo(() => allOrders(placed), [placed]);
  const last30 = useMemo(() => withinDays(book, 30), [book]);
  const series = useMemo(() => dailySeries(book, 30).map((p) => ({ label: p.label, value: p.billed, orders: p.orders })), [book]);
  const payMix = useMemo(() => countBy(book.filter((o) => o.status !== 'Cancelled'), (o) => o.payment), [book]);
  const subs = useMemo(() => bySubcategory(last30).slice(0, 6), [last30]);
  const brands = useMemo(() => byBrand(last30).slice(0, 6), [last30]);
  const customers = useMemo(() => new Set(book.map((o) => (o.email || o.customer).toLowerCase())).size, [book]);

  const tiles = [
    { label: 'Customers', value: apiStats?.totalUsers ?? customers, icon: 'user', to: '/admin/users', detail: 'People who have ordered', module: 'users' },
    { label: 'Products live', value: apiStats?.totalProducts ?? products.length, icon: 'package', to: '/admin/products', detail: `${departments.length} categories · ${suppliers.length} brands`, module: 'products' },
    { label: 'Orders', value: apiStats?.totalOrders ?? book.length, icon: 'truck', to: '/admin/orders', detail: `${last30.length} in the last 30 days`, module: 'orders' },
    { label: 'Billed', value: apiStats?.totalRevenue ?? book.reduce((s, o) => s + billedOf(o), 0), icon: 'rupee', money: true, to: '/admin/billing', detail: 'Incl. GST and delivery', module: 'billing' },
  ];

  const recent = book.slice(0, 5);
  const byStatus = ORDER_STATUSES.map((st) => ({ st, n: book.filter((o) => o.status === st).length }));
  const allBrands = [...suppliers].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  const actions = ACTIONS.filter((a) => can(a.module, a.need || 'view')).slice(0, 4);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* hero — demo command panel with quick actions */}
      <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#173d33_0%,#1f5c4a_100%)] p-5 text-white shadow-pop sm:rounded-[28px] sm:p-10">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgba(72,132,112,0.35)] blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-100" /> Store operations
            </span>
            <h2 className="mt-4 text-[clamp(1.6rem,4.5vw,3.1rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:mt-6">
              Run the whole storefront from one calm console.
            </h2>
            <p className="mt-3 max-w-lg text-[14px] leading-6 text-sunk sm:mt-4 sm:text-[15px]">
              Products, orders, payments, discounts and your team — in one place.
            </p>
          </div>
          {actions.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {actions.map((a, i) => (
                <motion.div key={a.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06 }}>
                  <Link
                    to={a.to}
                    className={cx(
                      'group flex h-full min-h-[76px] flex-col justify-between rounded-[16px] border p-3.5 transition hover:-translate-y-0.5 sm:min-h-[92px] sm:rounded-[18px] sm:p-4',
                      a.primary ? 'border-white bg-white text-forest' : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                    )}
                  >
                    <Icon name={a.icon} size={19} />
                    <span className="mt-2 flex items-center justify-between gap-2 text-[13px] font-bold sm:mt-3 sm:text-[14px]">
                      {a.label}
                      <Icon name="arrowRight" size={15} className="shrink-0 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => {
          const Tag = can(t.module) ? Link : 'div';
          return (
            <motion.div key={t.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Tag
                to={t.to}
                className="group relative block h-full overflow-hidden rounded-[18px] border border-line bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 sm:rounded-[20px] sm:p-5"
              >
                <span className="relative flex items-start justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink-70 sm:text-sm">{t.label}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-sunk text-forest transition group-hover:bg-forest group-hover:text-white sm:h-9 sm:w-9">
                    <Icon name={t.icon} size={16} />
                  </span>
                </span>
                <p className="relative mt-2 text-[clamp(1.35rem,3.5vw,1.9rem)] font-semibold tracking-[-0.04em] text-forest sm:mt-3">
                  {t.money ? rupeesCompact(t.value) : <Counter value={t.value} />}
                </p>
                <p className="relative mt-0.5 text-[11.5px] text-ink-50 sm:text-xs">{t.detail}</p>
              </Tag>
            </motion.div>
          );
        })}
      </div>

      {/* charts: line + pie */}
      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Sales, last 30 days"
          note="Billed per day, incl. GST and delivery"
          table={{ headers: ['Day', 'Orders', 'Billed'], rows: series.filter((p) => p.orders).map((p) => [p.label, p.orders, money(p.value)]) }}
        >
          <LineChart points={series} format={money} tick={rupeesCompact} label="Billed per day" sub={(p) => `${p.orders} order${p.orders === 1 ? '' : 's'}`} />
        </ChartCard>

        <ChartCard
          title="Payment methods"
          note="Share of orders (cancelled excluded)"
          table={{ headers: ['Method', 'Orders'], rows: payMix.map((s) => [s.label, s.value]) }}
        >
          <Donut slices={payMix} format={(v) => `${v}`} center={{ value: payMix.reduce((n, s) => n + s.value, 0), label: 'orders' }} />
        </ChartCard>
      </div>

      {/* charts: bars + status */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <ChartCard
          title="Top sub-categories"
          note="Net sales (ex-GST), last 30 days"
          table={{ headers: ['Sub-category', 'Units', 'Net sales'], rows: subs.map((r) => [r.label, r.units, money(r.net)]) }}
        >
          <BarList rows={subs.map((r) => ({ key: r.key, label: r.label, value: r.net, units: r.units }))} format={rupeesCompact} color={SERIES[0]} detail={(r) => `${r.units} units`} />
        </ChartCard>

        <ChartCard
          title="Top brands"
          note="Net sales (ex-GST), last 30 days"
          table={{ headers: ['Brand', 'Units', 'Net sales'], rows: brands.map((r) => [r.label, r.units, money(r.net)]) }}
        >
          <BarList rows={brands.map((r) => ({ key: r.key, label: r.label, value: r.net, units: r.units }))} format={rupeesCompact} color={SERIES[1]} detail={(r) => `${r.units} units`} />
        </ChartCard>

        <Panel>
          <PanelHead title="Orders by status" note={`${book.length} orders in the order book`} />
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
            {byStatus.map(({ st, n }) => n > 0 && (
              <motion.span
                key={st}
                initial={{ width: 0 }}
                animate={{ width: `${(n / book.length) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={STATUS_BAR[st]}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {byStatus.map(({ st, n }) => (
              <li key={st} className="flex items-center gap-2.5 rounded-[12px] bg-[#f4f7f5] px-3 py-2 text-[13px]">
                <span className={cx('h-2.5 w-2.5 rounded-full', STATUS_BAR[st])} />
                <span className="flex-1 font-semibold text-ink-70">{st}</span>
                <span className="tnum font-bold text-ink">{n}</span>
                <span className="tnum w-10 text-right text-ink-50">{Math.round((n / (book.length || 1)) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-1">
          <PanelHead
            title="Recent orders"
            note="Latest in the order book"
            action={can('orders') && <Link to="/admin/orders" className="shrink-0 rounded-full bg-sunk px-3 py-1.5 text-xs font-bold text-forest">View all</Link>}
          />
          <ul className="divide-y divide-line-soft overflow-hidden rounded-[16px] border border-line-soft">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center gap-3 bg-white px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunk text-[12px] font-bold text-forest">{o.customer[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{o.customer}</p>
                  <p className="truncate text-[11.5px] text-ink-50"><span className="font-mono">{o.id}</span> · {formatOrderDate(o.createdAt)}</p>
                </div>
                <Badge tone={STATUS_TONE[o.status]} className="hidden sm:inline-flex">{o.status}</Badge>
                <Link to={`/invoice/${o.id}`} title={`Invoice ${o.id}`} className="tnum text-right text-[13px] font-bold text-ink hover:text-forest">{money(o.total)}</Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead
            title="Categories"
            note={`${departments.length} categories · ${departments.reduce((n, d) => n + d.subs.length, 0)} sub-categories`}
            action={can('products') && <Link to="/admin/products" className="shrink-0 rounded-full bg-sunk px-3 py-1.5 text-xs font-bold text-forest">Manage</Link>}
          />
          <ul className="space-y-2">
            {departments.map((d) => (
              <li key={d.slug} className="flex items-center gap-3 rounded-[12px] bg-[#f4f7f5] px-3 py-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white text-forest"><Icon name={d.icon} size={15} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-ink">{d.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-50">{d.subs.length ? `${d.subs.length} sub-categories` : 'No products yet'}</span>
                </span>
                <span className="tnum text-[13px] font-bold text-forest">{d.count.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead title="Brands" note={`${suppliers.length} brands · ${products.length.toLocaleString('en-IN')} SKUs`} />
          <div className="flex max-h-[330px] flex-wrap gap-2 overflow-y-auto pr-1">
            {allBrands.map((b) => (
              <span key={b.slug} className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-3 py-1.5 text-[12.5px] font-semibold text-forest">
                {b.name}
                {b.count != null && <span className="tnum rounded-full bg-white px-1.5 text-[11px] font-bold text-forest-800">{b.count}</span>}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
