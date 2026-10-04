import { useMemo, useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/Modal';
import { AdminPageHead, DetailList, Kpi, Panel, StatusPill, ViewOnlyBanner, SELECT_CLS, LABEL_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useActor, useScopedOrders, useScopedRefunds } from '../../lib/useScoped';
import { useRetailers } from '../../store/retailers';
import { useSettings } from '../../store/settings';
import { addAdjustment, computeSettlements, pendingBalance, setPayoutStatus, usePayoutRecords } from '../../store/payouts';
import { money } from '../../lib/format';
import { act } from '../../lib/act';

/* Payouts and settlements (requirement 13). Each retailer, each weekly cycle:
   sales − commission − subscription fee − refunds ± adjustments. Finance
   reviews, approves and marks paid; history and pending balance per
   retailer. */

export function useSettlements() {
  /* scoped: a retailer computes only their own cycles */
  const orders = useScopedOrders();
  const refunds = useScopedRefunds();
  const actor = useActor();
  const all = useRetailers();
  const retailers = useMemo(() => (actor.kind === 'retailer' ? all.filter((r) => r.id === actor.retailerId) : all), [all, actor]);
  const settings = useSettings();
  const records = usePayoutRecords();
  return useMemo(() => computeSettlements({ orders, refunds, retailers, settings, records }), [orders, refunds, retailers, settings, records]);
}

function PayoutSheet({ row, canEdit, by, onClose }) {
  const toast = useToast();
  const [utr, setUtr] = useState('');
  const [adj, setAdj] = useState({ amount: '', note: '' });
  return (
    <Modal open onClose={onClose} title={`${row.retailerName} · ${row.label}`} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2"><StatusPill status={row.status} />{row.utr && <span className="font-mono text-[12px] text-ink-50">{row.utr}</span>}</div>
        <DetailList rows={[
          ['Delivered sub-orders', row.orders],
          ['Sales', money(row.sales)],
          ['Commission', `− ${money(row.commission)}`],
          ['Subscription fee', row.fee ? `− ${money(row.fee)}` : '—'],
          ['Refunds (retailer share)', row.refunds ? `− ${money(row.refunds)}` : '—'],
          ['Adjustments', row.adjustments ? `${row.adjustments > 0 ? '+' : '−'} ${money(Math.abs(row.adjustments))}` : '—'],
          ['Net payout', <b className="text-[15px] text-forest">{money(row.net)}</b>],
        ]} />
        {row.parts.length > 0 && (
          <details>
            <summary className="cursor-pointer text-[13px] font-bold text-forest">Sub-orders in this cycle ({row.parts.length})</summary>
            <ul className="mt-2 divide-y divide-line-soft text-[12.5px]">
              {row.parts.map((p) => <li key={p.id} className="flex justify-between gap-3 py-1.5"><span className="font-mono">{p.id}</span><span className="tnum">{money(p.total)} − {money(p.commission)}</span></li>)}
            </ul>
          </details>
        )}
        {(row.record.adjustments || []).length > 0 && (
          <ul className="space-y-1 text-[12.5px]">{row.record.adjustments.map((a) => <li key={a.id} className="rounded-[10px] bg-[#f6f3ed] px-3 py-2"><b>{money(a.amount)}</b> · {a.note} · {a.by}</li>)}</ul>
        )}
        {canEdit && row.status !== 'open' && row.status !== 'paid' && (
          <div className="space-y-4 border-t border-line pt-4">
            <form onSubmit={(e) => { e.preventDefault(); const n = Number(adj.amount); if (!n || adj.note.trim().length < 4) return toast.error('Enter an amount (negative to deduct) and a note.'); act(toast, () => addAdjustment(row, n, adj.note.trim(), by)); setAdj({ amount: '', note: '' }); toast.success('Adjustment added'); }} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
              <input value={adj.amount} onChange={(e) => setAdj((s) => ({ ...s, amount: e.target.value.replace(/[^\d-]/g, '') }))} placeholder="± ₹" className={SELECT_CLS} aria-label="Adjustment amount" />
              <input value={adj.note} onChange={(e) => setAdj((s) => ({ ...s, note: e.target.value }))} placeholder="Why (e.g. courier damage credit)" className={SELECT_CLS} aria-label="Adjustment note" />
              <Button type="submit" variant="outline" icon="plus">Adjust</Button>
            </form>
            <div className="flex flex-wrap items-end justify-end gap-2">
              {row.status !== 'on_hold' && <Button variant="outline" size="sm" onClick={() => { act(toast, () => setPayoutStatus(row, 'on_hold', { by }), 'Payout on hold'); onClose(); }}>Hold</Button>}
              {(row.status === 'pending' || row.status === 'on_hold') && <Button size="sm" icon="check" onClick={() => { act(toast, () => setPayoutStatus(row, 'approved', { by }), 'Payout approved'); onClose(); }}>Approve</Button>}
              {row.status === 'approved' && (
                <>
                  <label className="min-w-[200px]"><span className={LABEL_CLS}>Bank UTR</span><input value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase())} placeholder="e.g. HDFCN52026100412345" className={SELECT_CLS} /></label>
                  <Button size="sm" icon="rupee" disabled={utr.trim().length < 8} onClick={() => { act(toast, () => setPayoutStatus(row, 'paid', { by, utr: utr.trim() }), 'Marked paid — retailer notified'); onClose(); }}>Mark paid</Button>
                </>
              )}
            </div>
          </div>
        )}
        {row.status === 'open' && <p className="rounded-[12px] bg-slate-50 px-3 py-2 text-[12.5px] text-slate">This cycle is still running. It can be reviewed after it closes on Sunday night.</p>}
      </div>
    </Modal>
  );
}

export default function AdminPayouts() {
  const { user } = useAuth();
  const { can } = useIam();
  const retailers = useRetailers();
  const { rows, held } = useSettlements();
  const [open, setOpen] = useState(null);
  const canEdit = can('payouts', 'edit');

  const sum = (st) => rows.filter((r) => r.status === st).reduce((s, r) => s + r.net, 0);
  const balances = retailers
    .filter((r) => rows.some((x) => x.retailerId === r.id) || held[r.id])
    .map((r) => ({ ...r, ...pendingBalance(rows, held, r.id) }))
    .sort((a, b) => b.unpaid + b.held - (a.unpaid + a.held));
  const current = open && rows.find((r) => r.key === open);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Payouts & settlements" note="Weekly cycles (Monday–Sunday). A retailer’s share becomes payable when its part is delivered." />
      {!canEdit && <ViewOnlyBanner what="payouts" />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="To review" value={money(sum('pending'))} note={`${rows.filter((r) => r.status === 'pending').length} closed cycles`} icon="clock" tone="amber" />
        <Kpi label="Approved, not paid" value={money(sum('approved'))} note="Ready for the bank file" icon="check" />
        <Kpi label="On hold" value={money(sum('on_hold'))} note="Paused by Finance" icon="lock" tone={sum('on_hold') ? 'clay' : 'forest'} />
        <Kpi label="Held until delivery" value={money(Object.values(held).reduce((s, v) => s + v, 0))} note="Razorpay transfers on hold" icon="shield" />
      </div>

      <DataTable
        id="payouts"
        rows={rows}
        columns={[
          { key: 'retailerName', label: 'Retailer', always: true, render: (r) => <span className="font-bold text-ink">{r.retailerName}</span> },
          { key: 'start', label: 'Cycle', render: (r) => <span className="whitespace-nowrap">{r.label}</span>, csv: (r) => r.label },
          { key: 'orders', label: 'Delivered', align: 'right' },
          { key: 'sales', label: 'Sales', align: 'right', render: (r) => money(r.sales) },
          { key: 'commission', label: 'Commission', align: 'right', render: (r) => money(r.commission) },
          { key: 'fee', label: 'Plan fee', align: 'right', render: (r) => (r.fee ? money(r.fee) : '—') },
          { key: 'refunds', label: 'Refunds', align: 'right', render: (r) => (r.refunds ? money(r.refunds) : '—') },
          { key: 'adjustments', label: 'Adjust.', align: 'right', hidden: true, render: (r) => (r.adjustments ? money(r.adjustments) : '—') },
          { key: 'net', label: 'Net payout', align: 'right', render: (r) => <b className={r.net < 0 ? 'text-clay-600' : 'text-ink'}>{money(r.net)}</b> },
          { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
          { key: 'utr', label: 'UTR', hidden: true },
        ]}
        searchText={(r) => `${r.retailerName} ${r.label} ${r.utr}`}
        searchPlaceholder="Search retailer, cycle or UTR"
        filters={[
          { key: 'status', label: 'Status', options: ['open', 'pending', 'approved', 'on_hold', 'paid'].map((s) => ({ value: s, label: { open: 'Open cycle', pending: 'To review', approved: 'Approved', on_hold: 'On hold', paid: 'Paid' }[s] })), test: (r, v) => r.status === v },
          { key: 'retailer', label: 'Retailer', options: retailers.map((r) => ({ value: r.id, label: r.name })), test: (r, v) => r.retailerId === v },
        ]}
        date={(r) => r.end}
        rowKey={(r) => r.key}
        initialSort={{ key: 'start', dir: 'desc' }}
        onRowClick={(r) => setOpen(r.key)}
        exportName="payouts"
        canExport={can('payouts')}
      />

      <Panel title="Pending balance by retailer" note="Unpaid closed cycles, plus shares still held until delivery.">
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {balances.map((b) => (
            <li key={b.id} className="rounded-[16px] bg-[#f6f3ed] p-3.5">
              <p className="truncate text-[13.5px] font-bold text-ink">{b.name}</p>
              <p className="tnum mt-1 text-[20px] font-semibold text-forest">{money(b.unpaid)}</p>
              <p className="tnum text-[12px] text-ink-50">+ {money(b.held)} held until delivery</p>
            </li>
          ))}
        </ul>
      </Panel>

      {current && <PayoutSheet row={current} canEdit={canEdit} by={user?.fullName} onClose={() => setOpen(null)} />}
    </div>
  );
}
