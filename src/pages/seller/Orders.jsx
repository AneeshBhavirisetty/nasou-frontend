import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import PartCard from '../../components/admin/PartCard';
import Icon from '../../components/Icon';
import { Button } from '../../components/ui';
import { AdminPageHead, BackLinkInline, DetailList, EmptyNote, Panel, StatusPill } from '../../components/admin/AdminUI';
import { useAuth } from '../../context/AuthContext';
import { useScopedOrders } from '../../lib/useScoped';
import { useSeller } from '../../layouts/SellerLayout';
import { formatOrderDate } from '../../data/orders';
import { cx, money } from '../../lib/format';

/* Seller orders: only this retailer's sub-orders (lib/scope cuts every
   multi-seller order down to their part). Review 6 (retailer item 12) brought
   back order tracking: a board of how many sit at each step, and every row
   shows how far it has got — Received → Processing → Shipped → Delivered. */

export const STEPS = [
  ['Pending', 'Received', 'inbox'],
  ['Processing', 'Processing', 'package'],
  ['Shipped', 'Shipped', 'truck'],
  ['Delivered', 'Delivered', 'check'],
];
const stepIndex = (s) => STEPS.findIndex(([k]) => k === s);

/* four small segments; cancelled shows as one red bar */
export function TrackBar({ status, compact = false }) {
  if (status === 'Cancelled') return <span className="block h-1.5 w-full max-w-[160px] rounded-full bg-clay/60" title="Cancelled" />;
  const at = stepIndex(status);
  return (
    <span className={cx('flex w-full items-center gap-1', compact ? 'max-w-[160px]' : '')} title={STEPS[at]?.[1]}>
      {STEPS.map(([k], i) => <span key={k} className={cx('h-1.5 flex-1 rounded-full transition-colors', i <= at ? (at === 3 ? 'bg-emerald-600' : 'bg-forest') : 'bg-sunk')} />)}
    </span>
  );
}

export default function SellerOrders() {
  const navigate = useNavigate();
  const orders = useScopedOrders();
  const [step, setStep] = useState('');
  const rows = useMemo(() => orders.map((o) => ({ ...o, part: o.parts[0] })), [orders]);
  const count = (s) => rows.filter((r) => r.part.status === s).length;
  const shown = step ? rows.filter((r) => r.part.status === step) : rows;

  return (
    <div className="space-y-5">
      <AdminPageHead title="Orders" note="Your part of each customer order. Move it along as you pack and ship — the customer sees every step." />

      {/* tracking board — tap a step to list just those */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {STEPS.map(([k, label, icon], i) => (
          <button key={k} onClick={() => setStep(step === k ? '' : k)} className={cx('relative overflow-hidden rounded-[18px] p-4 text-left shadow-card transition hover:-translate-y-0.5', step === k ? 'bg-forest text-white' : 'bg-white')}>
            <span className="flex items-center justify-between">
              <span className={cx('grid h-9 w-9 place-items-center rounded-[12px]', step === k ? 'bg-white/15' : 'bg-sunk text-forest')}><Icon name={icon} size={16} /></span>
              {i < 3 && <Icon name="chevronRight" size={16} className={step === k ? 'text-white/50' : 'text-ink-35'} />}
            </span>
            <span className={cx('tnum mt-3 block text-[26px] font-semibold tracking-[-0.03em]', step === k ? 'text-white' : 'text-ink')}>{count(k)}</span>
            <span className={cx('block text-[12.5px] font-semibold', step === k ? 'text-emerald-100' : 'text-ink-50')}>{label}</span>
          </button>
        ))}
      </div>

      <DataTable
        id="seller-orders"
        rows={shown}
        columns={[
          { key: 'pid', label: 'Order', always: true, value: (o) => o.part.id, render: (o) => <span className="font-mono text-[12.5px] font-bold text-ink">{o.part.id}</span> },
          { key: 'createdAt', label: 'Placed', render: (o) => formatOrderDate(o.createdAt) },
          { key: 'customer', label: 'Customer', render: (o) => <span className="block min-w-[140px]"><b className="text-ink">{o.customer}</b><span className="block text-[11.5px] text-ink-50">{o.city} {o.pin}</span></span> },
          { key: 'track', label: 'Tracking', value: (o) => stepIndex(o.part.status), render: (o) => <span className="block min-w-[150px]"><TrackBar status={o.part.status} compact /><span className="mt-1 block text-[11px] font-semibold text-ink-50">{o.part.status === 'Cancelled' ? 'Cancelled' : STEPS[stepIndex(o.part.status)]?.[1]}</span></span> },
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLinkInline to="/seller/orders">All orders</BackLinkInline>
        <Button size="sm" variant="outline" icon="fileText" to={`/invoice/${o.id}`}>GST invoice</Button>
      </div>
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
