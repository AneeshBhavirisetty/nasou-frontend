import { useMemo, useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { AdminPageHead, Kpi, StatusPill } from '../../components/admin/AdminUI';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useOrders, useRefunds } from '../../store/orders';
import { ourLedger, razorpayReport, reconcile, resolveRecon, useRecon } from '../../store/payouts';
import { useSettlements } from './Payouts';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';

/* Reconciliation (requirement 20): every payment, transfer, refund and payout
   in our books matched against Razorpay's settlement report; differences are
   flagged until someone resolves them with a note. */
export default function AdminReconciliation() {
  const toast = useToast();
  const { user } = useAuth();
  const { can } = useIam();
  const orders = useOrders();
  const refunds = useRefunds();
  const resolved = useRecon();
  const { rows: payoutRows } = useSettlements();
  const [resolving, setResolving] = useState(null);

  const rows = useMemo(() => {
    const ledger = ourLedger({ orders, refunds, payoutRows });
    return reconcile(ledger, razorpayReport(ledger)).map((r) => ({ ...r, state: resolved[r.id] ? 'resolved' : r.status, resolution: resolved[r.id] }));
  }, [orders, refunds, payoutRows, resolved]);

  const issues = rows.filter((r) => r.state !== 'matched' && r.state !== 'resolved');

  return (
    <div className="space-y-5">
      <AdminPageHead title="Reconciliation" note="Our books against the Razorpay settlement report. Anything that does not match is flagged here." />
      <p className="rounded-[14px] border border-slate/15 bg-slate-50 px-4 py-2.5 text-[12.5px] text-slate">Demo: the Razorpay report is simulated from our own records with three planted differences. With the API connected it comes from Razorpay’s settlement reports.</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Matched" value={rows.filter((r) => r.state === 'matched').length.toLocaleString('en-IN')} note={`of ${rows.length.toLocaleString('en-IN')} movements`} icon="check" />
        <Kpi label="Open differences" value={issues.length} note="Need a look" icon="bell" tone={issues.length ? 'clay' : 'forest'} />
        <Kpi label="Payments captured" value={money(rows.filter((r) => r.type === 'Payment' && r.ours != null).reduce((s, r) => s + r.ours, 0))} icon="card" />
        <Kpi label="Transfers to retailers" value={money(rows.filter((r) => r.type === 'Transfer' && r.ours != null).reduce((s, r) => s + r.ours, 0))} icon="store" />
      </div>

      <DataTable
        id="recon"
        rows={rows}
        columns={[
          { key: 'type', label: 'Type', always: true, render: (r) => <span className="font-bold text-ink">{r.type}</span> },
          { key: 'ref', label: 'Reference', render: (r) => <span className="font-mono text-[12px]">{r.ref}</span> },
          { key: 'orderId', label: 'Order / part', render: (r) => r.partId || r.orderId || '—' },
          { key: 'retailer', label: 'Retailer' },
          { key: 'at', label: 'Date', render: (r) => formatOrderDate(r.at) },
          { key: 'ours', label: 'Our books', align: 'right', render: (r) => (r.ours == null ? '—' : money(r.ours)) },
          { key: 'theirs', label: 'Razorpay', align: 'right', render: (r) => (r.theirs == null ? '—' : money(r.theirs)) },
          { key: 'diff', label: 'Difference', align: 'right', value: (r) => (r.ours ?? 0) - (r.theirs ?? 0), render: (r) => { const d = (r.ours ?? 0) - (r.theirs ?? 0); return d ? <b className="text-clay-600">{money(d)}</b> : '—'; } },
          { key: 'state', label: 'Status', render: (r) => <StatusPill status={r.state} /> },
          ...(can('payouts', 'edit') ? [{ key: 'act', label: '', sortable: false, csv: false, always: true, render: (r) => (r.state !== 'matched' && r.state !== 'resolved' ? <button onClick={(e) => { e.stopPropagation(); setResolving(r); }} className="h-8 rounded-full border border-line px-3 text-[12px] font-bold text-forest hover:border-forest">Resolve</button> : r.resolution ? <span className="text-[11.5px] text-ink-50" title={r.resolution.note}>{r.resolution.by}</span> : null) }] : []),
        ]}
        searchText={(r) => `${r.type} ${r.ref} ${r.orderId} ${r.partId} ${r.retailer}`}
        searchPlaceholder="Search reference, order, retailer"
        filters={[
          { key: 'state', label: 'Status', options: [['matched', 'Matched'], ['mismatch', 'Amount differs'], ['missing_in_razorpay', 'Not in Razorpay'], ['missing_in_books', 'Not in our books'], ['resolved', 'Resolved']].map(([value, label]) => ({ value, label })), test: (r, v) => r.state === v },
          { key: 'type', label: 'Type', options: ['Payment', 'Transfer', 'Refund', 'Payout'].map((t) => ({ value: t, label: t })), test: (r, v) => r.type === v },
        ]}
        date={(r) => r.at}
        initialSort={{ key: 'diff', dir: 'desc' }}
        exportName="reconciliation"
        canExport={can('payouts')}
        rowClass={(r) => (r.state !== 'matched' && r.state !== 'resolved' ? 'bg-clay-50/30' : '')}
      />

      {resolving && (
        <ReasonDialog open onClose={() => setResolving(null)} title={`Resolve ${resolving.type.toLowerCase()} ${resolving.ref}`} confirm="Mark resolved" label="What was it, and what did you do?"
          placeholder="e.g. Razorpay deducted a ₹40 transfer fee — booked as a platform expense."
          onConfirm={(note) => { resolveRecon(resolving.id, note, user?.fullName); toast.success('Marked resolved'); }} />
      )}
    </div>
  );
}
