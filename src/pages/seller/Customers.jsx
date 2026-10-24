import { useMemo } from 'react';
import DataTable from '../../components/admin/DataTable';
import { AdminPageHead, Kpi } from '../../components/admin/AdminUI';
import { useScopedOrders } from '../../lib/useScoped';
import { useSellerCustomers } from '../../store/support';
import { LIVE } from '../../lib/config';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';

/* Seller › Customers (client review 6): the people who ordered from this
   store — nobody else, and only this store's part of their orders. With the
   API the list comes from GET /seller/customers; the browser demo builds it
   from the store's own (scoped) orders. */

const DAY = 86400000;

export default function SellerCustomers() {
  const server = useSellerCustomers();
  const orders = useScopedOrders();

  const rows = useMemo(() => {
    if (LIVE) return server;
    const m = new Map();
    for (const o of orders) {
      const part = o.parts[0];
      const c = m.get(o.userId) || { id: o.userId, name: o.customer, phone: o.phone, city: o.city, pin: o.pin, orders: 0, spent: 0, cancelled: 0, open: 0, firstAt: o.createdAt, lastAt: o.createdAt };
      c.orders += 1;
      if (part.status === 'Cancelled') c.cancelled += 1; else c.spent += part.total;
      if (['Pending', 'Processing', 'Shipped'].includes(part.status)) c.open += 1;
      c.firstAt = Math.min(c.firstAt, o.createdAt);
      c.lastAt = Math.max(c.lastAt, o.createdAt);
      m.set(o.userId, c);
    }
    return [...m.values()];
  }, [server, orders]);

  const repeat = rows.filter((c) => c.orders > 1).length;
  const recent = rows.filter((c) => c.lastAt >= Date.now() - 30 * DAY).length;
  const spent = rows.reduce((s, c) => s + Number(c.spent || 0), 0);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Customers" note="Everyone who has ordered from your store. Amounts are your part of their orders." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Customers" value={rows.length} note="Ordered from you at least once" icon="users" />
        <Kpi label="Repeat customers" value={repeat} note={rows.length ? `${Math.round((repeat / rows.length) * 100)}% came back` : '—'} icon="refresh" />
        <Kpi label="Active (30 days)" value={recent} note="Ordered in the last month" icon="clock" />
        <Kpi label="Average per customer" value={money(rows.length ? spent / rows.length : 0)} note="Excluding cancelled" icon="rupee" />
      </div>
      <DataTable
        id="seller-customers"
        rows={rows}
        columns={[
          { key: 'name', label: 'Customer', always: true, render: (c) => <span className="block min-w-[150px]"><b className="text-ink">{c.name}</b><span className="block text-[11.5px] text-ink-50">+91 {c.phone}{c.email ? ` · ${c.email}` : ''}</span></span> },
          { key: 'city', label: 'Area', value: (c) => `${c.city || ''} ${c.pin || ''}` },
          { key: 'orders', label: 'Orders', align: 'right' },
          { key: 'open', label: 'Open', align: 'right' },
          { key: 'spent', label: 'Spent with you', align: 'right', value: (c) => Number(c.spent), render: (c) => money(c.spent) },
          { key: 'lastAt', label: 'Last order', render: (c) => formatOrderDate(c.lastAt) },
          { key: 'firstAt', label: 'Customer since', render: (c) => formatOrderDate(c.firstAt) },
        ]}
        searchText={(c) => `${c.name} ${c.phone} ${c.email || ''} ${c.city || ''} ${c.pin || ''}`}
        searchPlaceholder="Search name, mobile or area"
        filters={[{ key: 'kind', label: 'Customers', options: [{ value: 'repeat', label: 'Repeat' }, { value: 'open', label: 'With open orders' }], test: (c, v) => (v === 'repeat' ? c.orders > 1 : c.open > 0) }]}
        date={(c) => c.lastAt}
        initialSort={{ key: 'lastAt', dir: 'desc' }}
        exportName="my-customers"
        empty="No customers yet — they appear here after their first order."
      />
    </div>
  );
}
