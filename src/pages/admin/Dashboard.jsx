import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import Counter from '../../components/Counter';
import { Button } from '../../components/ui';
import { adminApi } from '../../lib/api';
import { products, categories, suppliers } from '../../data/catalog';
import { money } from '../../lib/format';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-serif text-[clamp(1.5rem,4vw,2rem)]">Dashboard</h1>
          <p className="text-[13px] text-ink-50">{loading ? 'Loading store metrics…' : 'Live store metrics · demo data'}</p>
        </div>
        <Button to="/admin/products" size="sm" icon="package">Manage products</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Link to={t.to} className="block rounded-lg border border-line bg-white p-4 transition hover:border-emerald hover:shadow-card">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-50 text-emerald-600"><Icon name={t.icon} size={17} /></span>
              <p className="mt-3 display-serif text-[clamp(1.4rem,4vw,1.9rem)]">
                {loading ? '—' : t.money ? <Counter value={t.value} prefix="₹" /> : <Counter value={t.value} />}
              </p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-ink-70">{t.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-line bg-white p-5">
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
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
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
        </div>
      </div>
    </div>
  );
}
