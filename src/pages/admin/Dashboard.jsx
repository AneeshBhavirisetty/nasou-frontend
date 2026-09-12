import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import Counter from '../../components/Counter';
import { Badge } from '../../components/ui';
import { adminApi } from '../../lib/api';
import { products, categories, suppliers } from '../../data/catalog';
import { orders, ORDER_STATUSES, formatOrderDate } from '../../data/orders';
import { money, cx } from '../../lib/format';

const FALLBACK = () => ({
  totalUsers: 128,
  totalProducts: products.length,
  totalOrders: 342,
  totalRevenue: products.slice(0, 342).reduce((s, p, i) => s + p.price * (1 + (i % 4)), 0),
});

const ACTIVITY = [
  { icon: 'truck', tone: 'emerald', text: 'Order NH-4821 marked delivered', when: '2 min ago' },
  { icon: 'userPlus', tone: 'forest', text: 'New customer registered — Kavya R.', when: '18 min ago' },
  { icon: 'package', tone: 'emerald', text: 'Inventory updated for 12 cPVC SKUs', when: '1 hr ago' },
  { icon: 'tag', tone: 'clay', text: 'Coupon MONSOON10 created', when: '3 hrs ago' },
];

const STATUS_TONE = { Pending: 'amber', Processing: 'slate', Shipped: 'slate', Delivered: 'ok', Cancelled: 'clay' };
const STATUS_BAR = { Pending: 'bg-amber', Processing: 'bg-slate', Shipped: 'bg-slate/60', Delivered: 'bg-emerald', Cancelled: 'bg-clay' };

/* Quick actions — every one opens an existing admin screen. */
const ACTIONS = [
  { label: 'Add product', icon: 'plus', to: '/admin/products?new=1', primary: true },
  { label: 'Manage orders', icon: 'truck', to: '/admin/orders' },
  { label: 'Discount codes', icon: 'tag', to: '/admin/discounts' },
  { label: 'User management', icon: 'user', to: '/admin/users' },
];

/* demo ThemeCard */
function Panel({ className = '', children }) {
  return (
    <section className={cx('rounded-[20px] border border-line bg-white/86 p-5 shadow-[0_18px_40px_rgba(37,88,73,0.08)] backdrop-blur-xl', className)}>
      {children}
    </section>
  );
}

function PanelHead({ title, note, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-forest">{title}</h2>
        {note && <p className="mt-1 text-sm text-forest-800">{note}</p>}
      </div>
      {action}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    adminApi
      .dashboard()
      .then((r) => alive && setStats(r?.stats ?? FALLBACK()))
      .catch(() => alive && setStats(FALLBACK()));
    return () => { alive = false; };
  }, []);

  const s = stats ?? FALLBACK();
  const loading = !stats;

  const tiles = [
    { label: 'Customers', value: s.totalUsers, icon: 'user', to: '/admin/users', detail: 'Registered accounts' },
    { label: 'Products live', value: s.totalProducts, icon: 'package', to: '/admin/products', detail: `${categories.length} categories · ${suppliers.length} brands` },
    { label: 'Orders', value: s.totalOrders, icon: 'truck', to: '/admin/orders', detail: 'All-time order count' },
    { label: 'Revenue', value: s.totalRevenue, icon: 'gauge', money: true, to: '/admin/orders', detail: 'Billed across orders' },
  ];

  /* Read-only glance at the same demo order book the Orders page uses. */
  const recent = orders.slice(0, 5);
  const byStatus = ORDER_STATUSES.map((st) => ({ st, n: orders.filter((o) => o.status === st).length }));
  const brands = [...suppliers].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  return (
    <div className="space-y-5">
      {/* hero — demo command panel with quick actions */}
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#173d33_0%,#1f5c4a_100%)] p-6 text-white shadow-pop sm:p-10">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgba(72,132,112,0.35)] blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-100" /> Store operations
            </span>
            <h2 className="mt-6 text-[clamp(1.9rem,4.5vw,3.1rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
              Run the whole storefront from one calm console.
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-6 text-sunk">
              {loading ? 'Loading store metrics…' : 'Live store metrics · demo data'} — products, orders, discounts and customers in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((a, i) => (
              <motion.div key={a.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06 }}>
                <Link
                  to={a.to}
                  className={cx(
                    'group flex h-full min-h-[92px] flex-col justify-between rounded-[18px] border p-4 transition hover:-translate-y-0.5',
                    a.primary ? 'border-white bg-white text-forest' : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                  )}
                >
                  <Icon name={a.icon} size={19} />
                  <span className="mt-3 flex items-center justify-between gap-2 text-[14px] font-bold">
                    {a.label}
                    <Icon name="arrowRight" size={15} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* KPI row — demo MiniStat cards */}
      <div className="rounded-[24px] border border-white/70 bg-white/40 p-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <motion.div key={t.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link
                to={t.to}
                className="group relative block h-full overflow-hidden rounded-[20px] border border-line bg-white p-4 shadow-[0_18px_40px_rgba(37,88,73,0.08)] transition hover:-translate-y-0.5 sm:p-5"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/80 to-transparent" />
                <span className="relative flex items-start justify-between gap-2">
                  <span className="text-sm text-forest-800">{t.label}</span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-canvas text-forest transition group-hover:bg-forest group-hover:text-white">
                    <Icon name={t.icon} size={16} />
                  </span>
                </span>
                <p className="tnum relative mt-3 text-[clamp(1.5rem,3.5vw,1.9rem)] font-semibold tracking-[-0.04em] text-forest">
                  {loading ? '—' : t.money ? <Counter value={t.value} prefix="₹" /> : <Counter value={t.value} />}
                </p>
                <p className="relative mt-1 text-xs text-forest-800">{t.detail}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHead
            title="Recent orders"
            note="Latest activity in the order book"
            action={<Link to="/admin/orders" className="shrink-0 rounded-full bg-canvas px-3 py-1.5 text-xs font-bold text-forest transition hover:bg-sunk">View all</Link>}
          />
          <div className="overflow-hidden rounded-[18px] border border-line">
            <ul className="divide-y divide-line-soft">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center gap-3 bg-white px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunk text-[12px] font-bold text-forest">{o.customer[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{o.customer}</p>
                    <p className="truncate text-[11.5px] text-ink-50"><span className="font-mono">{o.id}</span> · {formatOrderDate(o.createdAt)}</p>
                  </div>
                  <Badge tone={STATUS_TONE[o.status]} className="hidden sm:inline-flex">{o.status}</Badge>
                  <Link to={`/invoice/${o.id}`} title={`Invoice ${o.id}`} className="tnum text-right text-[13.5px] font-bold text-ink transition hover:text-forest">
                    {money(o.total)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Orders by status" note={`${orders.length} orders in the demo order book`} />
          <div className="flex h-3 overflow-hidden rounded-full bg-sunk" aria-hidden>
            {byStatus.map(({ st, n }) => n > 0 && (
              <motion.span
                key={st}
                initial={{ width: 0 }}
                animate={{ width: `${(n / orders.length) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={STATUS_BAR[st]}
              />
            ))}
          </div>
          <ul className="mt-5 space-y-2.5">
            {byStatus.map(({ st, n }) => (
              <li key={st} className="flex items-center gap-2.5 rounded-[14px] bg-[#f4f7f5] px-3 py-2.5 text-[13px]">
                <span className={cx('h-2.5 w-2.5 rounded-full', STATUS_BAR[st])} />
                <span className="flex-1 font-semibold text-ink-70">{st}</span>
                <span className="tnum font-bold text-ink">{n}</span>
                <span className="tnum w-10 text-right text-ink-50">{Math.round((n / orders.length) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel>
          <PanelHead title="Recent activity" note="What changed in the store today" />
          <ul className="space-y-2">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-[14px] bg-[#f4f7f5] p-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] ${a.tone === 'clay' ? 'bg-clay-50 text-clay-600' : a.tone === 'forest' ? 'bg-forest text-white' : 'bg-white text-forest'}`}>
                  <Icon name={a.icon} size={15} />
                </span>
                <span className="flex-1 text-[13px] font-semibold text-ink-70">{a.text}</span>
                <span className="shrink-0 text-[11.5px] text-ink-50">{a.when}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead
            title="Categories"
            note={`All ${categories.length} product families`}
            action={<Link to="/admin/products" className="shrink-0 rounded-full bg-canvas px-3 py-1.5 text-xs font-bold text-forest transition hover:bg-sunk">Manage</Link>}
          />
          <ul className="space-y-3">
            {categories.map((c) => {
              const pct = Math.round((c.count / products.length) * 100);
              return (
                <li key={c.slug}>
                  <div className="flex justify-between text-[13px]">
                    <span className="font-semibold text-ink-70">{c.name}</span>
                    <span className="tnum text-ink-50">{c.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunk">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-forest"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <PanelHead title="Brands" note={`${suppliers.length} brands · ${products.length.toLocaleString('en-IN')} SKUs`} />
          <div className="flex max-h-[300px] flex-wrap gap-2 overflow-y-auto pr-1">
            {brands.map((b) => (
              <span key={b.slug} className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-[12.5px] font-semibold text-forest">
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
