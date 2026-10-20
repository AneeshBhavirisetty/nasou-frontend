import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/Modal';
import { AdminPageHead, DetailList, Kpi, Panel, StatusPill } from '../../components/admin/AdminUI';
import { useSettlements } from '../admin/Payouts';
import { pendingBalance } from '../../store/payouts';
import { useSeller } from '../../layouts/SellerLayout';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';

/* Seller payouts (requirements 13 and 14): what each week earned, what is
   still owed, and every payment Nivora sent — with Razorpay's payout id and
   the bank UTR to match against the bank statement. */
const WEEK_TEXT = { open: 'This week', ready: 'To be paid', processing: 'On its way', paid: 'Paid' };

export default function SellerPayouts() {
  const { retailer, retailerId } = useSeller();
  const { rows, held, settlements = [] } = useSettlements();
  const [open, setOpen] = useState(null);
  const mine = rows.filter((r) => r.retailerId === retailerId);
  const sent = settlements.filter((s) => s.retailerId === retailerId);
  const bal = pendingBalance(rows, held, retailerId);
  const paid = sent.filter((s) => s.status === 'paid').reduce((n, s) => n + s.amount, 0)
    + mine.filter((r) => r.status === 'paid' && !r.settlementId).reduce((n, r) => n + r.net, 0);
  const row = open && mine.find((r) => r.key === open);
  const bank = retailer.bank ? `${retailer.bank.holder} · •••• ${String(retailer.bank.account).slice(-4)}` : 'your bank';

  return (
    <div className="space-y-5">
      <AdminPageHead title="Payouts" note={`Paid every week to ${bank}. An order counts once it is delivered; each Monday the week before is settled.`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Owed to you" value={money(bal.unpaid)} note="Closed weeks not paid yet" icon="clock" />
        <Kpi label="Waiting for delivery" value={money(bal.held)} note="Counts once delivered" icon="truck" />
        <Kpi label="Paid so far" value={money(paid)} icon="rupee" />
        <Kpi label="Commission" value={`${retailer.commission?.rate ?? 10}%`} note={Object.keys(retailer.commission?.byCategory || {}).length ? 'Some categories differ' : 'On every order'} icon="percent" />
      </div>

      {sent.length > 0 && (
        <Panel title="Payments to your bank" note="Match the UTR with your bank statement.">
          <ul className="divide-y divide-line-soft">
            {sent.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="tnum text-[15px] font-bold text-ink">{money(s.amount)}</p>
                  <p className="text-[12px] text-ink-50">{s.label} · sent {formatOrderDate(s.at)}</p>
                  <p className="truncate font-mono text-[11.5px] text-ink-50">{s.utr ? `UTR ${s.utr}` : s.payoutId}</p>
                </div>
                <StatusPill status={s.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <DataTable
        id="seller-payouts"
        rows={mine}
        rowKey={(r) => r.key}
        columns={[
          { key: 'start', label: 'Week', always: true, render: (r) => <b className="whitespace-nowrap text-ink">{r.label}</b>, csv: (r) => r.label },
          { key: 'orders', label: 'Delivered', align: 'right' },
          { key: 'sales', label: 'Sales', align: 'right', render: (r) => money(r.sales) },
          { key: 'commission', label: 'Commission', align: 'right', render: (r) => `− ${money(r.commission)}` },
          { key: 'fee', label: 'Plan fee', align: 'right', render: (r) => (r.fee ? `− ${money(r.fee)}` : '—') },
          { key: 'refunds', label: 'Refunds', align: 'right', render: (r) => (r.refunds ? `− ${money(r.refunds)}` : '—') },
          { key: 'net', label: 'You receive', align: 'right', render: (r) => <b className="text-forest">{money(r.net)}</b> },
          { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} label={WEEK_TEXT[r.status]} /> },
          { key: 'utr', label: 'Bank ref', hidden: true },
        ]}
        searchText={(r) => `${r.label} ${r.utr}`}
        searchPlaceholder="Search week or bank reference"
        initialSort={{ key: 'start', dir: 'desc' }}
        onRowClick={(r) => setOpen(r.key)}
        exportName="my-payouts"
      />
      {row && (
        <Modal open onClose={() => setOpen(null)} title={`Week of ${row.label}`} size="md">
          <DetailList rows={[
            ['Status', <StatusPill status={row.status} label={WEEK_TEXT[row.status]} />],
            ['Delivered orders', row.orders],
            ['Sales', money(row.sales)],
            ['Commission', `− ${money(row.commission)}`],
            ['Plan fee', row.fee ? `− ${money(row.fee)}` : '—'],
            ['Refunds', row.refunds ? `− ${money(row.refunds)}` : '—'],
            ['Adjustments', row.adjustments ? money(row.adjustments) : '—'],
            ['You receive', <b className="text-forest">{money(row.net)}</b>],
            row.payoutId && ['Razorpay payout', <span className="font-mono">{row.payoutId}</span>],
            row.utr && ['Bank UTR', <span className="font-mono">{row.utr}</span>],
          ]} />
        </Modal>
      )}
    </div>
  );
}
