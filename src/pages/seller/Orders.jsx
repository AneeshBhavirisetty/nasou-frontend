import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import PartCard from '../../components/admin/PartCard';
import { AdminPageHead, BackLinkInline, DetailList, EmptyNote, Panel, StatusPill } from '../../components/admin/AdminUI';
import { useAuth } from '../../context/AuthContext';
import { useScopedOrders } from '../../lib/useScoped';
import { useSeller } from '../../layouts/SellerLayout';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';

/* Seller orders: only this retailer's sub-orders (lib/scope cuts every
   multi-seller order down to their part). */

export default function SellerOrders() {
  const navigate = useNavigate();
  const orders = useScopedOrders();
  const rows = useMemo(() => orders.map((o) => ({ ...o, part: o.parts[0] })), [orders]);
  return (
    <div className="space-y-5">
      <AdminPageHead title="Orders" note="Your part of each customer order. Move it along as you pack and ship — the customer sees every step." />
      <DataTable
        id="seller-orders"
        rows={rows}
        columns={[
          { key: 'pid', label: 'Order', always: true, value: (o) => o.part.id, render: (o) => <span className="font-mono text-[12.5px] font-bold text-ink">{o.part.id}</span> },
          { key: 'createdAt', label: 'Placed', render: (o) => formatOrderDate(o.createdAt) },
          { key: 'customer', label: 'Customer', render: (o) => <span className="block min-w-[140px]"><b className="text-ink">{o.customer}</b><span className="block text-[11.5px] text-ink-50">{o.city} {o.pin}</span></span> },
          { key: 'units', label: 'Units', align: 'right', value: (o) => o.part.lines.reduce((n, l) => n + l.qty, 0) },
          { key: 'status', label: 'Status', value: (o) => o.part.status, render: (o) => <StatusPill status={o.part.status} /> },
          { key: 'total', label: 'Value', align: 'right', value: (o) => o.part.total, render: (o) => money(o.part.total) },
          { key: 'share', label: 'Your share', align: 'right', value: (o) => o.part.retailerShare, render: (o) => money(o.part.retailerShare) },
          { key: 'payment', label: 'Payment' },
        ]}
        searchText={(o) => `${o.part.id} ${o.customer} ${o.city} ${o.part.lines.map((l) => `${l.name} ${l.sku}`).join(' ')}`}
        searchPlaceholder="Search order, customer, product"
        filters={[{ key: 'status', label: 'Status', options: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => ({ value: s, label: s })), test: (o, v) => o.part.status === v }]}
        date={(o) => o.createdAt}
        initialSort={{ key: 'createdAt', dir: 'desc' }}
        onRowClick={(o) => navigate(`/seller/orders/${o.id}`)}
        exportName="my-orders"
      />
    </div>
  );
}

export function SellerOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { readOnly } = useSeller();
  const orders = useScopedOrders();
  const o = orders.find((x) => x.id === id);
  if (!o) return <EmptyNote icon="truck" title="Order not found" body="It may belong to another store." />;
  const part = o.parts[0];
  return (
    <div className="space-y-5">
      <BackLinkInline to="/seller/orders">All orders</BackLinkInline>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <PartCard order={o} part={part} by={user.fullName} canAdvance={!readOnly} canCancel={!readOnly} canRefund={false} byRetailer />
        <aside className="space-y-4">
          <Panel title="Deliver to">
            <DetailList rows={[['Name', o.customer], ['Mobile', `+91 ${o.phone}`], ['Address', `${o.address || ''}`], ['City', `${o.city} ${o.pin}`], ['Delivery', o.delivery], ['Payment', o.payment === 'Cash on delivery' ? `Collect ${money(part.total)} on delivery` : `${o.payment} · paid`]]} />
          </Panel>
          <p className="text-[12px] text-ink-50">Placed {formatOrderDate(o.createdAt)}. Other sellers in this order ship their own parts — you only see yours.</p>
        </aside>
      </div>
    </div>
  );
}
