import { useMemo, useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/Modal';
import { AdminPageHead, DetailList, Kpi, Panel, StatusPill, ViewOnlyBanner, SELECT_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useActor, useScopedOrders, useScopedRefunds } from '../../lib/useScoped';
import { useRetailers } from '../../store/retailers';
import { useSettings } from '../../store/settings';
import { addAdjustment, checkSettlement, computeSettlements, settleRetailer, usePayoutRecords, useSettlementsSent } from '../../store/payouts';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';
import { act } from '../../lib/act';

/* Retailer payouts (requirement 13), kept simple. Customers pay Nivora; each
   week (Monday–Sunday) a retailer's delivered sales, less commission, plan fee
   and refunds, become payable. Finance presses Settle once per retailer and
   one RazorpayX payout sends everything owed to their bank; its payout id,
   status and bank UTR show here. */

export function useSettlements() {
  /* scoped: a retailer computes only their own weeks */
  const orders = useScopedOrders();
  const refunds = useScopedRefunds();
  const actor = useActor();
  const all = useRetailers();
  const retailers = useMemo(() => (actor.kind === 'retailer' ? all.filter((r) => r.id === actor.retailerId) : all), [all, actor]);
  const settings = useSettings();
  const records = usePayoutRecords();
  const sent = useSettlementsSent();
  return useMemo(() => computeSettlements({ orders, refunds, retailers, settings, records, sent }), [orders, refunds, retailers, settings, records, sent]);
}

const bankLine = (b) => (b ? `${b.holder} · A/c ••••${b.last4} · ${b.ifsc}` : 'No bank account on file');

function SettleDialog({ entry, rows, by, onClose }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const ok = await act(toast, () => settleRetailer(entry, { rows, by }), `${money(entry.amount)} on its way to ${entry.retailerName}`);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Settle ${entry.retailerName}`} size="md">
      <div className="space-y-4">
        <p className="tnum text-[28px] font-semibold tracking-[-0.03em] text-forest">{money(entry.amount)}</p>
        <DetailList rows={[
          ['For', `${entry.label} · ${entry.weeks} week${entry.weeks > 1 ? 's' : ''}`],
          ['Pay to', entry.bank.holder],
          ['Account', `••••${entry.bank.last4}`],
          ['IFSC', entry.bank.ifsc],
        ]} />
        <p className="rounded-[12px] bg-[#f6f3ed] px-3 py-2 text-[12.5px] leading-5 text-ink-70">
          Sent from Nivora’s RazorpayX account by IMPS (NEFT above ₹5 lakh). It usually reaches the bank in minutes; the status and bank UTR update here.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button icon="rupee" loading={busy} onClick={send}>Send {money(entry.amount)}</Button>
        </div>
      </div>
    </Modal>
  );
}

function SettlementSheet({ s, canEdit, onClose }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    await act(toast, () => checkSettlement(s), (x) => (x?.status === 'paid' ? 'Paid — retailer notified' : x?.status === 'failed' ? 'Payout failed' : 'Still on its way'));
    setBusy(false);
  };
  return (
    <Modal open onClose={onClose} title={`${s.retailerName} · ${money(s.amount)}`} size="md">
      <div className="space-y-4">
        <StatusPill status={s.status} />
        <DetailList rows={[
          ['Weeks', s.label],
          ['Sent', `${formatOrderDate(s.at)} by ${s.by}`],
          ['Bank', bankLine(s.bank)],
          ['Razorpay payout', s.payoutId ? <span className="font-mono">{s.payoutId}</span> : '—'],
          ['Razorpay status', s.razorpayStatus || '—'],
          ['Bank UTR', s.utr ? <span className="font-mono">{s.utr}</span> : '—'],
          s.paidAt && ['Paid', formatOrderDate(s.paidAt)],
        ]} />
        {s.failureReason && <p className="rounded-[12px] bg-clay-50 px-3 py-2 text-[12.5px] text-clay-600">{s.failureReason}{s.status === 'failed' ? ' — the weeks are back in Ready to settle.' : ''}</p>}
        {canEdit && s.status === 'processing' && (
          <div className="flex justify-end"><Button size="sm" variant="outline" icon="refresh" loading={busy} onClick={check}>Check status</Button></div>
        )}
      </div>
    </Modal>
  );
}

function WeekSheet({ row, canEdit, by, onClose }) {
  const toast = useToast();
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
          ['Net for the week', <b className="text-[15px] text-forest">{money(row.net)}</b>],
        ]} />
        {row.parts.length > 0 && (
          <details>
            <summary className="cursor-pointer text-[13px] font-bold text-forest">Sub-orders this week ({row.parts.length})</summary>
            <ul className="mt-2 divide-y divide-line-soft text-[12.5px]">
              {row.parts.map((p) => <li key={p.id} className="flex justify-between gap-3 py-1.5"><span className="font-mono">{p.id}</span><span className="tnum">{money(p.total)} − {money(p.commission)}</span></li>)}
            </ul>
          </details>
        )}
        {(row.record?.adjustments || []).length > 0 && (
          <ul className="space-y-1 text-[12.5px]">{row.record.adjustments.map((a) => <li key={a.id} className="rounded-[10px] bg-[#f6f3ed] px-3 py-2"><b>{money(a.amount)}</b> · {a.note} · {a.by}</li>)}</ul>
        )}
        {canEdit && (row.status === 'ready' || row.status === 'open') && (
          <form onSubmit={(e) => { e.preventDefault(); const n = Number(adj.amount); if (!n || adj.note.trim().length < 4) return toast.error('Enter an amount (negative to deduct) and a note.'); act(toast, () => addAdjustment(row, n, adj.note.trim(), by), 'Adjustment added'); setAdj({ amount: '', note: '' }); }} className="grid gap-2 border-t border-line pt-4 sm:grid-cols-[140px_1fr_auto]">
            <input value={adj.amount} onChange={(e) => setAdj((s) => ({ ...s, amount: e.target.value.replace(/[^\d-]/g, '') }))} placeholder="± ₹" className={SELECT_CLS} aria-label="Adjustment amount" />
            <input value={adj.note} onChange={(e) => setAdj((s) => ({ ...s, note: e.target.value }))} placeholder="Why (e.g. courier damage credit)" className={SELECT_CLS} aria-label="Adjustment note" />
            <Button type="submit" variant="outline" icon="plus">Adjust</Button>
          </form>
        )}
        {row.status === 'open' && <p className="rounded-[12px] bg-slate-50 px-3 py-2 text-[12.5px] text-slate">This week is still running. It can be settled after it closes on Sunday night.</p>}
      </div>
    </Modal>
  );
}

export default function AdminPayouts() {
  const { user } = useAuth();
  const { can } = useIam();
  const retailers = useRetailers();
  const { rows, held, due = [], settlements = [], gateway } = useSettlements();
  const [settling, setSettling] = useState(null);
  const [openSettlement, setOpenSettlement] = useState(null);
  const [openWeek, setOpenWeek] = useState(null);
  const canEdit = can('payouts', 'edit');

  const toSettle = due.filter((d) => d.canSettle).reduce((s, d) => s + d.amount, 0);
  const sending = settlements.filter((s) => s.status === 'processing');
  const monthAgo = Date.now() - 30 * 86400000;
  const paid30 = settlements.filter((s) => s.status === 'paid' && (s.paidAt || s.at) >= monthAgo).reduce((n, s) => n + s.amount, 0);
  const week = openWeek && rows.find((r) => r.key === openWeek);
  const sheet = openSettlement && settlements.find((s) => s.id === openSettlement);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Payouts" note="Weekly, Monday to Sunday. Customers pay Nivora; once a week press Settle to send each retailer what they are owed." />
      {!canEdit && <ViewOnlyBanner what="payouts" />}
      {gateway === 'simulated' && (
        <p className="rounded-[14px] border border-amber/20 bg-amber-50 px-4 py-2.5 text-[12.5px] leading-5 text-amber">Test mode — payouts are simulated and no money moves. They go live once the RazorpayX keys are added to the API.</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="To settle now" value={money(toSettle)} note={`${due.filter((d) => d.canSettle).length} retailers`} icon="clock" tone="amber" />
        <Kpi label="On its way" value={money(sending.reduce((s, x) => s + x.amount, 0))} note={`${sending.length} payouts processing`} icon="send" />
        <Kpi label="Waiting for delivery" value={money(Object.values(held).reduce((s, v) => s + v, 0))} note="Payable once delivered" icon="truck" />
        <Kpi label="Paid, last 30 days" value={money(paid30)} note="To retailers’ banks" icon="rupee" />
      </div>

      <Panel title="Ready to settle" note="Every closed week not paid yet, added up per retailer.">
        {due.length === 0 ? (
          <p className="rounded-[14px] bg-[#f6f3ed] px-4 py-6 text-center text-[13px] text-ink-50">Nothing to settle — every closed week is paid.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {due.map((d) => (
              <li key={d.retailerId} className="flex min-w-0 flex-col gap-3 rounded-[18px] border border-line bg-white p-4 shadow-card">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-ink">{d.retailerName}</p>
                  <p className={`tnum mt-1 text-[24px] font-semibold tracking-[-0.03em] ${d.amount > 0 ? 'text-forest' : 'text-clay-600'}`}>{money(d.amount)}</p>
                  <p className="text-[12px] text-ink-50">{d.label} · {d.weeks} week{d.weeks > 1 ? 's' : ''}</p>
                  <p className={`mt-1 truncate text-[12px] ${d.bank ? 'text-ink-70' : 'text-clay-600'}`}>{bankLine(d.bank)}</p>
                </div>
                {d.amount <= 0 ? (
                  <p className="text-[12px] text-ink-50">Fees and refunds were more than sales — this comes off the next settlement.</p>
                ) : canEdit && (
                  <Button full icon="rupee" disabled={!d.canSettle} onClick={() => setSettling(d)}>Settle {money(d.amount)}</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Payouts sent" note="One per Settle. Razorpay payout id and bank UTR for each." pad={false}>
        <div className="p-3 sm:p-4">
          <DataTable
            id="settlements"
            rows={settlements}
            rowKey={(s) => s.id}
            columns={[
              { key: 'at', label: 'Sent', always: true, render: (s) => <span className="whitespace-nowrap">{formatOrderDate(s.at)}</span>, csv: (s) => new Date(s.at).toISOString() },
              { key: 'retailerName', label: 'Retailer', render: (s) => <span className="font-bold text-ink">{s.retailerName}</span> },
              { key: 'label', label: 'Weeks' },
              { key: 'amount', label: 'Amount', align: 'right', render: (s) => <b>{money(s.amount)}</b> },
              { key: 'status', label: 'Status', render: (s) => <StatusPill status={s.status} /> },
              { key: 'payoutId', label: 'Razorpay payout', render: (s) => <span className="font-mono text-[12px]">{s.payoutId || '—'}</span> },
              { key: 'utr', label: 'UTR', render: (s) => <span className="font-mono text-[12px]">{s.utr || '—'}</span> },
            ]}
            searchText={(s) => `${s.retailerName} ${s.payoutId} ${s.utr}`}
            searchPlaceholder="Search retailer, payout id or UTR"
            filters={[{ key: 'status', label: 'Status', options: [['processing', 'On its way'], ['paid', 'Paid'], ['failed', 'Failed']].map(([value, label]) => ({ value, label })), test: (s, v) => s.status === v }]}
            initialSort={{ key: 'at', dir: 'desc' }}
            onRowClick={(s) => setOpenSettlement(s.id)}
            exportName="payouts-sent"
            canExport={can('payouts')}
          />
        </div>
      </Panel>

      <Panel title="Week by week" note="What each retailer earned each week. Open a week to see its orders or add an adjustment." pad={false}>
        <div className="p-3 sm:p-4">
          <DataTable
            id="payouts"
            rows={rows}
            columns={[
              { key: 'retailerName', label: 'Retailer', always: true, render: (r) => <span className="font-bold text-ink">{r.retailerName}</span> },
              { key: 'start', label: 'Week', render: (r) => <span className="whitespace-nowrap">{r.label}</span>, csv: (r) => r.label },
              { key: 'orders', label: 'Delivered', align: 'right' },
              { key: 'sales', label: 'Sales', align: 'right', render: (r) => money(r.sales) },
              { key: 'commission', label: 'Commission', align: 'right', render: (r) => money(r.commission) },
              { key: 'fee', label: 'Plan fee', align: 'right', hidden: true, render: (r) => (r.fee ? money(r.fee) : '—') },
              { key: 'refunds', label: 'Refunds', align: 'right', hidden: true, render: (r) => (r.refunds ? money(r.refunds) : '—') },
              { key: 'net', label: 'Net', align: 'right', render: (r) => <b className={r.net < 0 ? 'text-clay-600' : 'text-ink'}>{money(r.net)}</b> },
              { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
            ]}
            searchText={(r) => `${r.retailerName} ${r.label} ${r.utr}`}
            searchPlaceholder="Search retailer or week"
            filters={[
              { key: 'status', label: 'Status', options: [['open', 'This week'], ['ready', 'To settle'], ['processing', 'On its way'], ['paid', 'Paid']].map(([value, label]) => ({ value, label })), test: (r, v) => r.status === v },
              { key: 'retailer', label: 'Retailer', options: retailers.map((r) => ({ value: r.id, label: r.name })), test: (r, v) => r.retailerId === v },
            ]}
            date={(r) => r.end}
            rowKey={(r) => r.key}
            initialSort={{ key: 'start', dir: 'desc' }}
            onRowClick={(r) => setOpenWeek(r.key)}
            exportName="payouts-weekly"
            canExport={can('payouts')}
          />
        </div>
      </Panel>

      {settling && <SettleDialog entry={settling} rows={rows} by={user?.fullName} onClose={() => setSettling(null)} />}
      {sheet && <SettlementSheet s={sheet} canEdit={canEdit} onClose={() => setOpenSettlement(null)} />}
      {week && <WeekSheet row={week} canEdit={canEdit} by={user?.fullName} onClose={() => setOpenWeek(null)} />}
    </div>
  );
}
