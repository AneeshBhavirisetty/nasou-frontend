import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { AdminPageHead, Kpi, StatusPill } from '../../components/admin/AdminUI';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { decideRefund } from '../../store/orders';
import { useSettings } from '../../store/settings';
import { useScopedRefunds } from '../../lib/useScoped';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';

/* Refunds (requirement 19). Support starts a refund from an order's part;
   Finance approves it; approval pays it back through Razorpay and reverses
   only that retailer's transfer. Access matrix: Support "Start", Finance
   "Approve", Owner both. */
export default function AdminRefunds() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { can } = useIam();
  const refunds = useScopedRefunds();
  const threshold = useSettings((s) => s.decisions.refundApprovalAbove);
  const [declining, setDeclining] = useState(null);
  const canApprove = can('refunds', 'approve');
  const by = user?.fullName;

  const waiting = refunds.filter((r) => r.status === 'requested');
  const processed = refunds.filter((r) => r.status === 'processed');

  return (
    <div className="space-y-5">
      <AdminPageHead title="Refunds" note={`Start a refund from any order’s part. ${threshold > 0 ? `Refunds up to ${money(threshold)} are approved automatically; larger ones wait for Finance.` : 'Every refund waits for Finance approval.'}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Waiting for approval" value={waiting.length} note={money(waiting.reduce((s, r) => s + r.amount, 0))} icon="clock" tone={waiting.length ? 'amber' : 'forest'} />
        <Kpi label="Refunded" value={money(processed.reduce((s, r) => s + r.amount, 0))} note={`${processed.length} refunds`} icon="refresh" />
        <Kpi label="From retailers’ shares" value={money(processed.reduce((s, r) => s + r.retailerPortion, 0))} note="Comes off their payouts" icon="store" />
        <Kpi label="Commission returned" value={money(processed.reduce((s, r) => s + r.commissionBack, 0))} note="Pro rata on each refund" icon="percent" />
      </div>

      <DataTable
        id="refunds"
        rows={refunds}
        columns={[
          { key: 'partId', label: 'Sub-order', always: true, render: (r) => <span className="font-mono text-[12.5px] font-bold text-ink">{r.partId}</span> },
          { key: 'requestedAt', label: 'Requested', render: (r) => formatOrderDate(r.requestedAt) },
          { key: 'retailerName', label: 'Retailer' },
          { key: 'customer', label: 'Customer' },
          { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
          { key: 'retailerPortion', label: 'Retailer bears', align: 'right', render: (r) => money(r.retailerPortion) },
          { key: 'reason', label: 'Reason', render: (r) => <span className="block max-w-[220px] truncate" title={r.reason}>{r.reason}</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
          { key: 'requestedBy', label: 'Started by' },
          { key: 'decidedBy', label: 'Decided by', hidden: true },
          { key: 'razorpayRefundId', label: 'Razorpay refund', hidden: true, render: (r) => r.razorpayRefundId ? <span className="font-mono text-[12px]">{r.razorpayRefundId}</span> : '—' },
          ...(canApprove ? [{ key: 'act', label: '', sortable: false, csv: false, always: true, render: (r) => r.status === 'requested' && (
            <span className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setDeclining(r)} className="h-8 rounded-full border border-line px-3 text-[12px] font-bold text-ink-70 hover:border-clay/40 hover:text-clay">Decline</button>
              <button onClick={() => { decideRefund(r.id, true, { by }); toast.success(`${money(r.amount)} refunded via Razorpay`); }} className="h-8 rounded-full bg-forest px-3 text-[12px] font-bold text-white">Approve</button>
            </span>
          ) }] : []),
        ]}
        searchText={(r) => `${r.partId} ${r.orderId} ${r.retailerName} ${r.customer} ${r.reason}`}
        searchPlaceholder="Search sub-order, retailer, customer"
        filters={[
          { key: 'status', label: 'Status', options: ['requested', 'processed', 'rejected'].map((s) => ({ value: s, label: s === 'requested' ? 'Waiting' : s === 'processed' ? 'Processed' : 'Declined' })), test: (r, v) => r.status === v },
          { key: 'source', label: 'Source', options: [{ value: 'manual', label: 'Started by the team' }, { value: 'system', label: 'Automatic on cancellation' }], test: (r, v) => (v === 'system' ? !!r.system : !r.system) },
        ]}
        date={(r) => r.requestedAt}
        initialSort={{ key: 'requestedAt', dir: 'desc' }}
        onRowClick={(r) => navigate(`/admin/orders/${r.orderId}`)}
        exportName="refunds"
        canExport={can('refunds')}
      />

      {declining && (
        <ReasonDialog open onClose={() => setDeclining(null)} title={`Decline ${money(declining.amount)} refund?`} confirm="Decline" tone="danger" label="Reason (seen by the person who started it)"
          onConfirm={(why) => { decideRefund(declining.id, false, { by, note: why }); toast.success('Refund declined'); }} />
      )}
    </div>
  );
}
