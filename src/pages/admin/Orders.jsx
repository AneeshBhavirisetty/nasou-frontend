import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import DataTable from '../../components/admin/DataTable';
import { AdminPageHead, Kpi, StatusPill, ViewOnlyBanner } from '../../components/admin/AdminUI';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useRetailers } from '../../store/retailers';
import { updatePart } from '../../store/orders';
import { useScopedOrders } from '../../lib/useScoped';
import { ORDER_STATUSES, formatOrderDate } from '../../data/orders';
import { invoiceUrl } from '../../lib/exportSheet';
import { rupeesCompact } from '../../lib/analytics';
import { money } from '../../lib/format';

/* Orders — global list view (requirement 7). One row per customer order;
   each order has one sub-order per retailer, tracked separately. Opening a
   row shows the order page with support controls (requirement 12). */
export default function AdminOrders() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { can } = useIam();
  const orders = useScopedOrders();
  const retailers = useRetailers();
  const canEdit = can('orders', 'edit');

  const rows = useMemo(() => orders.map((o) => ({
    ...o,
    sellers: o.parts.map((p) => p.retailerName).join(', '),
    sellerIds: o.parts.map((p) => p.retailerId),
    partCount: o.parts.length,
  })), [orders]);

  const open = rows.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const flagged = rows.filter((o) => o.flagged).length;

  const advance = (sel) => {
    let n = 0;
    sel.forEach((o) => o.parts.forEach((p) => {
      if (p.status === 'Pending') { updatePart(o.id, p.id, 'Processing', { by: user?.fullName, note: 'Bulk update' }); n += 1; }
    }));
    toast.success(n ? `${n} pending sub-order${n > 1 ? 's' : ''} moved to Processing` : 'Nothing pending in the selection');
  };

  return (
    <div className="space-y-5">
      <AdminPageHead title="Orders" note="Every customer order across all retailers. Each seller’s part moves on its own." />
      {!canEdit && <ViewOnlyBanner what="orders" />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Orders" value={rows.length.toLocaleString('en-IN')} note={`${rows.reduce((n, o) => n + o.partCount, 0)} sub-orders`} icon="truck" />
        <Kpi label="Open" value={open.length} note="Not yet delivered" icon="clock" tone={open.length ? 'amber' : 'forest'} />
        <Kpi label="Flagged" value={flagged} note="Need a look from support" icon="bell" tone={flagged ? 'clay' : 'forest'} />
        <Kpi label="Order value" value={rupeesCompact(rows.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0))} note="Incl. GST and delivery" icon="rupee" />
      </div>

      <DataTable
        id="orders"
        rows={rows}
        columns={[
          { key: 'id', label: 'Order', always: true, render: (o) => (
            <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[12.5px] font-bold text-ink">
              {o.id}{o.flagged && <Icon name="bell" size={13} className="text-clay" />}
            </span>
          ) },
          { key: 'createdAt', label: 'Placed', render: (o) => formatOrderDate(o.createdAt), csv: (o) => new Date(o.createdAt).toISOString() },
          { key: 'customer', label: 'Customer', render: (o) => <span className="block min-w-[140px]"><span className="block font-bold text-ink">{o.customer}</span><span className="text-[11.5px] text-ink-50">{o.city} {o.pin}</span></span> },
          { key: 'sellers', label: 'Sellers', render: (o) => <span className="block max-w-[220px] truncate" title={o.sellers}>{o.partCount > 1 ? `${o.partCount} sellers · ` : ''}{o.sellers}</span> },
          { key: 'status', label: 'Status', render: (o) => <StatusPill status={o.status} /> },
          { key: 'items', label: 'Units', align: 'right' },
          { key: 'total', label: 'Total', align: 'right', render: (o) => money(o.total) },
          { key: 'payment', label: 'Payment' },
          { key: 'paymentStatus', label: 'Payment status', render: (o) => <StatusPill status={o.paymentStatus} /> },
          { key: 'email', label: 'Email', hidden: true },
          { key: 'phone', label: 'Phone', hidden: true },
          { key: 'invoice', label: 'Invoice', hidden: true, sortable: false, value: (o) => invoiceUrl(o.id), render: (o) => <a href={`/invoice/${o.id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-forest hover:underline">Open</a> },
        ]}
        searchText={(o) => `${o.id} ${o.customer} ${o.email} ${o.phone} ${o.city} ${o.sellers} ${o.parts.map((p) => p.id).join(' ')}`}
        searchPlaceholder="Search order, sub-order, customer, phone, seller"
        filters={[
          { key: 'status', label: 'Status', options: ORDER_STATUSES.map((s) => ({ value: s, label: s })), test: (o, v) => o.status === v || o.parts.some((p) => p.status === v) },
          { key: 'retailer', label: 'Retailer', options: retailers.filter((r) => r.status !== 'pending').map((r) => ({ value: r.id, label: r.name })), test: (o, v) => o.sellerIds.includes(v) },
          { key: 'payment', label: 'Payment', options: ['UPI', 'Cards', 'Net banking', 'Cash on delivery', 'GST invoice'].map((s) => ({ value: s, label: s })), test: (o, v) => o.payment === v },
          { key: 'pay', label: 'Payment status', options: ['Paid', 'Due on delivery', 'Collected', 'Invoice due', 'Refunded'].map((s) => ({ value: s, label: s })), test: (o, v) => o.paymentStatus === v },
          { key: 'flag', label: 'Flag', options: [{ value: 'yes', label: 'Flagged' }, { value: 'multi', label: 'Several sellers' }], test: (o, v) => (v === 'yes' ? !!o.flagged : o.partCount > 1) },
        ]}
        date={(o) => o.createdAt}
        initialSort={{ key: 'createdAt', dir: 'desc' }}
        onRowClick={(o) => navigate(`/admin/orders/${o.id}`)}
        bulkActions={canEdit ? [{ label: 'Move pending parts to Processing', icon: 'chevronsRight', run: advance }] : []}
        exportName="orders"
        rowClass={(o) => (o.flagged ? 'bg-clay-50/30' : '')}
      />
    </div>
  );
}
