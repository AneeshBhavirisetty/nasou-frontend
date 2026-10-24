import { useMemo, useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import { AdminPageHead, Kpi, StatusPill } from '../../components/admin/AdminUI';
import { BarList, ChartCard, ColumnChart, Donut, STATUS } from '../../components/charts/Charts';
import { useScopedOrders, useScopedProducts } from '../../lib/useScoped';
import { categoryName } from '../../data/catalog';
import { rupeesCompact } from '../../lib/analytics';
import { cx, money } from '../../lib/format';

/* Seller › Reports & analytics (client review 6, retailer item 7: "Reporting
   and analytics (inventory insights)"). From the store's own products and
   orders: what the shelf is worth, what sells, what does not move, and how
   many days of stock are left at the current pace. */

const DAY = 86400000;
const WINDOWS = [[30, '30 days'], [90, '90 days']];

/* days of stock left at the recent selling pace */
const coverOf = (stock, soldPerDay) => (soldPerDay > 0 ? Math.floor(stock / soldPerDay) : null);
const health = (p) => (p.stock <= 0 ? ['Out of stock', STATUS.critical, 'clay'] : p.cover != null && p.cover < 14 ? ['Reorder soon', STATUS.warning, 'amber']
  : p.sold === 0 ? ['Not moving', STATUS.neutral, 'neutral'] : ['Healthy', STATUS.good, 'ok']);

export default function SellerReports() {
  const products = useScopedProducts();
  const orders = useScopedOrders();
  const [win, setWin] = useState(30);

  const r = useMemo(() => {
    const since = Date.now() - win * DAY;
    const sold = new Map();
    const revenue = new Map();
    const weeks = new Map();
    for (const o of orders) {
      const p = o.parts[0];
      if (!p || p.status === 'Cancelled' || o.createdAt < since) continue;
      const wk = Math.floor((Date.now() - o.createdAt) / (7 * DAY));
      weeks.set(wk, (weeks.get(wk) || 0) + p.lines.reduce((s, l) => s + l.qty, 0));
      for (const l of p.lines) {
        sold.set(l.sku, (sold.get(l.sku) || 0) + l.qty);
        const cat = l.category || 'other';
        revenue.set(cat, (revenue.get(cat) || 0) + Number(l.amount ?? l.price * l.qty));
      }
    }
    const rows = products.map((p) => {
      const n = sold.get(p.sku) || 0;
      return { ...p, sold: n, value: Number(p.price) * p.stock, cover: coverOf(p.stock, n / win) };
    });
    const stockBySub = new Map();
    rows.forEach((p) => stockBySub.set(p.category, (stockBySub.get(p.category) || 0) + p.value));
    const nWeeks = Math.ceil(win / 7);
    return {
      rows,
      value: rows.reduce((s, p) => s + p.value, 0),
      units: rows.reduce((s, p) => s + p.stock, 0),
      out: rows.filter((p) => p.stock <= 0).length,
      reorder: rows.filter((p) => p.stock > 0 && p.cover != null && p.cover < 14).length,
      still: rows.filter((p) => p.stock > 0 && p.sold === 0).length,
      soldUnits: [...sold.values()].reduce((s, n) => s + n, 0),
      stockBySub: [...stockBySub.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ key: k, label: categoryName(k), value: Math.round(v) })),
      revenue: [...revenue.entries()].map(([k, v]) => ({ label: k === 'other' ? 'Other' : categoryName(k), value: Math.round(v) })),
      weekly: Array.from({ length: nWeeks }, (_, i) => nWeeks - 1 - i).map((w) => ({ key: w, label: w === 0 ? 'This wk' : `${w} wk ago`, value: weeks.get(w) || 0 })),
      health: ['Healthy', 'Reorder soon', 'Not moving', 'Out of stock'].map((h) => {
        const list = rows.filter((p) => health(p)[0] === h);
        return { label: h, value: list.length, color: health(list[0] || { stock: h === 'Out of stock' ? 0 : 1, cover: h === 'Reorder soon' ? 1 : null, sold: h === 'Not moving' ? 0 : 1 })[1] };
      }),
    };
  }, [products, orders, win]);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Reports & analytics" note="Inventory insights from your own products and orders.">
        <div className="flex rounded-[12px] bg-white p-1 shadow-card">
          {WINDOWS.map(([n, l]) => <button key={n} onClick={() => setWin(n)} className={cx('rounded-[9px] px-3 py-1.5 text-[12.5px] font-bold', win === n ? 'bg-forest text-white' : 'text-ink-50')}>{l}</button>)}
        </div>
      </AdminPageHead>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Stock value" value={rupeesCompact(r.value)} note={`${r.units.toLocaleString('en-IN')} units on the shelf`} icon="layers" />
        <Kpi label={`Units sold (${win} days)`} value={r.soldUnits.toLocaleString('en-IN')} note={`${(r.soldUnits / win).toFixed(1)} a day`} icon="cart" />
        <Kpi label="Reorder soon" value={r.reorder} note="Under 14 days of stock left" icon="clock" tone={r.reorder ? 'amber' : 'forest'} />
        <Kpi label="Out of stock" value={r.out} note={`${r.still} more in stock but not selling`} icon="package" tone={r.out ? 'amber' : 'forest'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Stock health" note="Products by state" table={{ headers: ['State', 'Products'], rows: r.health.map((h) => [h.label, h.value]) }}>
          <Donut slices={r.health} format={(v) => `${v} products`} center={{ value: products.length, label: 'products' }} />
        </ChartCard>
        <ChartCard title="Where the stock value sits" note="By sub-category" table={{ headers: ['Sub-category', 'Value'], rows: r.stockBySub.map((s) => [s.label, money(s.value)]) }}>
          <BarList rows={r.stockBySub} format={rupeesCompact} />
        </ChartCard>
        <ChartCard title="Units sold per week" note={`Last ${win} days`} table={{ headers: ['Week', 'Units'], rows: r.weekly.map((w) => [w.label, w.value]) }}>
          <ColumnChart points={r.weekly} format={(v) => `${v} units`} tick={(v) => v} label="Units sold per week" height={200} />
        </ChartCard>
      </div>

      <DataTable
        id="seller-inventory"
        rows={r.rows}
        columns={[
          { key: 'name', label: 'Product', always: true, render: (p) => <span className="block min-w-[170px]"><b className="text-ink">{p.name}</b><span className="block text-[11.5px] text-ink-50">{p.sku}{p.size ? ` · ${p.size}` : ''} · {categoryName(p.category)}</span></span> },
          { key: 'stock', label: 'Stock', align: 'right' },
          { key: 'sold', label: `Sold (${win}d)`, align: 'right' },
          { key: 'cover', label: 'Days left', align: 'right', value: (p) => p.cover ?? 99999, render: (p) => (p.stock <= 0 ? '—' : p.cover == null ? 'No sales' : `${p.cover} d`) },
          { key: 'value', label: 'Stock value', align: 'right', render: (p) => money(p.value) },
          { key: 'state', label: 'State', value: (p) => health(p)[0], render: (p) => <StatusPill status={p.sku} label={health(p)[0]} tone={health(p)[2]} /> },
        ]}
        searchText={(p) => `${p.name} ${p.sku} ${p.size || ''}`}
        searchPlaceholder="Search products"
        filters={[{ key: 'state', label: 'State', options: ['Healthy', 'Reorder soon', 'Not moving', 'Out of stock'].map((v) => ({ value: v, label: v })), test: (p, v) => health(p)[0] === v }]}
        initialSort={{ key: 'cover', dir: 'asc' }}
        exportName="inventory-insights"
      />
    </div>
  );
}
