import { useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import ExcelExportButton from '../../components/ExcelExportButton';
import RangePicker from '../../components/admin/RangePicker';
import { AdminPageHead } from '../../components/admin/AdminUI';
import { ChartCard, LineChart, BarList, DataTable, SERIES } from '../../components/charts/Charts';
import { useOrderStore } from '../../context/OrderStore';
import { allOrders } from '../../data/orders';
import { billedOf, byBrand, byDepartment, byProduct, bySubcategory, dailySeries, rupeesCompact, topCustomers, withinDays } from '../../lib/analytics';
import { money } from '../../lib/format';

/* Reports & analytics (client review 2, admin item 7 — "for future use").
   Reads the order book through lib/analytics.js today; when the analytics
   API lands, swap `book` for its response — the reports keep their shape. */

function Stat({ label, value, note }) {
  return (
    <div className="rounded-[18px] border border-line bg-white p-3.5 shadow-card sm:p-4">
      <p className="text-[12.5px] font-semibold text-ink-70">{label}</p>
      <p className="mt-1.5 text-[clamp(1.3rem,3.5vw,1.7rem)] font-semibold tracking-[-0.03em] text-forest">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-ink-50">{note}</p>
    </div>
  );
}

export default function AdminReports() {
  const { placed } = useOrderStore();
  const [days, setDays] = useState(30);
  const book = useMemo(() => allOrders(placed), [placed]);
  const orders = useMemo(() => withinDays(book, days), [book, days]);
  const live = orders.filter((o) => o.status !== 'Cancelled');

  const trendDays = days || Math.max(30, Math.ceil((Date.now() - Math.min(...book.map((o) => o.createdAt))) / 86400000) + 1);
  const trend = useMemo(() => dailySeries(book, trendDays).map((p) => ({ label: p.label, value: p.orders, billed: p.billed })), [book, trendDays]);
  const depts = useMemo(() => byDepartment(orders), [orders]);
  const subs = useMemo(() => bySubcategory(orders), [orders]);
  const brands = useMemo(() => byBrand(orders), [orders]);
  const productsTop = useMemo(() => byProduct(orders).slice(0, 12), [orders]);
  const customers = useMemo(() => topCustomers(orders).slice(0, 10), [orders]);

  const billed = live.reduce((s, o) => s + billedOf(o), 0);
  const units = live.reduce((n, o) => n + o.items, 0);
  const aov = live.length ? billed / live.length : 0;
  const cancelRate = orders.length ? Math.round(((orders.length - live.length) / orders.length) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <AdminPageHead title="Reports & analytics" note="Sales, products and customers from the order book">
        <ExcelExportButton
          filename={`nasou-sales-report-${days || 'all'}d`}
          label="Export"
          headers={['Product', 'SKU', 'Units', 'Orders', 'Net sales (ex-GST)']}
          rows={byProduct(orders).map((r) => [r.label, r.key, r.units, r.orders, r.net])}
        />
      </AdminPageHead>

      <RangePicker value={days} onChange={setDays} />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={live.length.toLocaleString('en-IN')} note={`${cancelRate}% cancelled`} />
        <Stat label="Units sold" value={units.toLocaleString('en-IN')} note="Across all products" />
        <Stat label="Billed" value={rupeesCompact(billed)} note="Incl. GST & delivery" />
        <Stat label="Average order" value={rupeesCompact(aov)} note="Billed ÷ orders" />
      </div>

      <ChartCard
        title="Orders per day"
        note={days ? `Last ${days} days` : 'All time'}
        table={{ headers: ['Day', 'Orders', 'Billed'], rows: trend.filter((p) => p.value).map((p) => [p.label, p.value, money(p.billed)]) }}
      >
        <LineChart points={trend} format={(v) => `${v} order${v === 1 ? '' : 's'}`} tick={(v) => String(v)} label="Orders per day" height={200} sub={(p) => money(p.billed)} />
      </ChartCard>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <ChartCard title="By category" note="Net sales (ex-GST)" table={{ headers: ['Category', 'Units', 'Net sales'], rows: depts.map((r) => [r.label, r.units, money(r.net)]) }}>
          <BarList rows={depts.map((r) => ({ key: r.key, label: r.label, value: r.net, units: r.units }))} format={rupeesCompact} color={SERIES[0]} detail={(r) => `${r.units} units`} />
        </ChartCard>
        <ChartCard title="By sub-category" note="Net sales (ex-GST)" table={{ headers: ['Sub-category', 'Units', 'Net sales'], rows: subs.map((r) => [r.label, r.units, money(r.net)]) }}>
          <BarList rows={subs.slice(0, 7).map((r) => ({ key: r.key, label: r.label, value: r.net, units: r.units }))} format={rupeesCompact} color={SERIES[1]} detail={(r) => `${r.units} units`} />
        </ChartCard>
        <ChartCard title="By brand" note="Net sales (ex-GST)" table={{ headers: ['Brand', 'Units', 'Net sales'], rows: brands.map((r) => [r.label, r.units, money(r.net)]) }}>
          <BarList rows={brands.slice(0, 7).map((r) => ({ key: r.key, label: r.label, value: r.net, units: r.units }))} format={rupeesCompact} color={SERIES[2]} detail={(r) => `${r.units} units`} />
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-[20px] border border-line bg-white p-4 shadow-card sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold">Top products</h2>
            <ExcelExportButton filename="nasou-top-products" label="CSV" headers={['Product', 'SKU', 'Units', 'Orders', 'Net sales']} rows={productsTop.map((r) => [r.label, r.key, r.units, r.orders, r.net])} />
          </div>
          <DataTable headers={['Product', 'Units', 'Orders', 'Net sales']} rows={productsTop.map((r) => [r.label, r.units, r.orders, money(r.net)])} />
        </section>
        <section className="min-w-0 rounded-[20px] border border-line bg-white p-4 shadow-card sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold">Top customers</h2>
            <ExcelExportButton filename="nasou-top-customers" label="CSV" headers={['Customer', 'City', 'Orders', 'Billed']} rows={customers.map((c) => [c.name, c.city, c.orders, c.billed])} />
          </div>
          <DataTable headers={['Customer', 'City', 'Orders', 'Billed']} rows={customers.map((c) => [c.name, c.city, c.orders, money(c.billed)])} />
        </section>
      </div>

      <p className="flex items-start gap-2 text-[12px] text-ink-35">
        <Icon name="barChart" size={13} className="mt-0.5 shrink-0" />
        Reports read the order book (demo orders + orders placed at checkout). Connect the analytics API to report on live data — the layout stays the same.
      </p>
    </div>
  );
}
