import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import Counter from '../../components/Counter';
import { AdminPageHead } from '../../components/admin/AdminUI';
import { Badge, Button } from '../../components/ui';
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
    { label: 'Customers', value: s.totalUsers, icon: 'user', to: '/admin/users' },
    { label: 'Products live', value: s.totalProducts, icon: 'package', to: '/admin/products' },
    { label: 'Orders', value: s.totalOrders, icon: 'truck', to: '/admin/orders' },
    { label: 'Revenue', value: s.totalRevenue, icon: 'gauge', money: true, to: '/admin/orders' },
  ];

  /* Read-only glance at the same demo order book the Orders page uses. */
  const recent = orders.slice(0, 5);
  const byStatus = ORDER_STATUSES.map((st) => ({ st, n: orders.filter((o) => o.status === st).length }));

  return (
    <div className="space-y-6">
      <AdminPageHead icon="gauge" title="Dashboard" note={loading ? 'Loading store metrics…' : 'Live store metrics · demo data'}>
        <Button to="/admin/products" size="sm" icon="package">Manage products</Button>
      </AdminPageHead>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => {
          const hero = t.money;
          return (
            <motion.div key={t.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link
                to={t.to}
                className={cx(
                  'group relative block h-full overflow-hidden rounded-lg border p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift sm:p-5',
                  hero ? 'border-forest bg-forest text-white' : 'border-line bg-white hover:border-emerald-100'
                )}
              >
                {hero && <span className="field-dots-dark absolute inset-0 opacity-60" aria-hidden />}
                <span className="relative flex items-center justify-between">
                  <span className={cx('grid h-9 w-9 place-items-center rounded-md', hero ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-600')}>
                    <Icon name={t.icon} size={17} />
                  </span>
                  <Icon
                    name="arrowUpRight"
                    size={15}
                    className={cx('transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5', hero ? 'text-white/60' : 'text-ink-35')}
                  />
                </span>
                <p className="relative mt-3 display-serif text-[clamp(1.4rem,4vw,1.9rem)]">
                  {loading ? '—' : t.money ? <Counter value={t.value} prefix="₹" /> : <Counter value={t.value} />}
                </p>
                <p className={cx('relative mt-0.5 text-[12.5px] font-semibold', hero ? 'text-emerald-100' : 'text-ink-70')}>{t.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold">Recent orders</h2>
            <Link to="/admin/orders" className="flex items-center gap-1 text-[12.5px] font-semibold text-emerald-600 transition hover:text-emerald">
              View all <Icon name="arrowRight" size={13} />
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-600">
                  {o.customer[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{o.customer}</p>
                  <p className="truncate text-[11.5px] text-ink-35">
                    <span className="font-mono">{o.id}</span> · {formatOrderDate(o.createdAt)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[o.status]} className="hidden sm:inline-flex">{o.status}</Badge>
                <Link to={`/invoice/${o.id}`} title={`Invoice ${o.id}`} className="tnum text-right text-[13px] font-extrabold transition hover:text-emerald-600">
                  {money(o.total)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="text-[15px] font-bold">Orders by status</h2>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-sunk" aria-hidden>
            {byStatus.map(({ st, n }) => n > 0 && (
              <span key={st} className={STATUS_BAR[st]} style={{ width: `${(n / orders.length) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {byStatus.map(({ st, n }) => (
              <li key={st} className="flex items-center gap-2.5 text-[12.5px]">
                <span className={cx('h-2 w-2 rounded-full', STATUS_BAR[st])} />
                <span className="flex-1 font-medium text-ink-70">{st}</span>
                <span className="tnum font-bold">{n}</span>
                <span className="tnum w-10 text-right text-ink-35">{Math.round((n / orders.length) * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] text-ink-35">{orders.length} orders in the demo order book</p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="text-[15px] font-bold">Recent activity</h2>
          <ul className="mt-3 space-y-1">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-md p-2 transition hover:bg-canvas">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${a.tone === 'clay' ? 'bg-clay-50 text-clay-600' : a.tone === 'forest' ? 'bg-forest/10 text-forest' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Icon name={a.icon} size={15} />
                </span>
                <span className="flex-1 text-[13px] text-ink-70">{a.text}</span>
                <span className="text-[11.5px] text-ink-35">{a.when}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="text-[15px] font-bold">Catalogue mix</h2>
          <ul className="mt-3 space-y-2.5">
            {categories.slice(0, 6).map((c) => {
              const pct = Math.round((c.count / products.length) * 100);
              return (
                <li key={c.slug}>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="font-medium text-ink-70">{c.name}</span>
                    <span className="tnum text-ink-35">{c.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunk">
                    <div className="h-full rounded-full bg-emerald" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11.5px] text-ink-35">{suppliers.length} brands · {products.length} SKUs</p>
        </section>
      </div>
    </div>
  );
}
