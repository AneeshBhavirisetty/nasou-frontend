import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/Modal';
import { AdminPageHead, DetailList, Kpi, StatusPill } from '../../components/admin/AdminUI';
import { useSettlements } from '../admin/Payouts';
import { pendingBalance } from '../../store/payouts';
import { useSeller } from '../../layouts/SellerLayout';
import { money } from '../../lib/format';

/* Seller payouts (requirements 13 and 14): every weekly cycle with the
   breakdown — sales, commission, plan fee, refunds, adjustments — and what
   is still owed. */
export default function SellerPayouts() {
  const { retailer, retailerId } = useSeller();
  const { rows, held } = useSettlements();
  const [open, setOpen] = useState(null);
  const mine = rows.filter((r) => r.retailerId === retailerId);
  const bal = pendingBalance(rows, held, retailerId);
  const paid = mine.filter((r) => r.status === 'paid').reduce((s, r) => s + r.net, 0);
  const row = open && mine.find((r) => r.key === open);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Payouts" note={`Paid weekly to ${retailer.bank ? `${retailer.bank.holder} · •••• ${String(retailer.bank.account).slice(-4)}` : 'your bank'} through Razorpay. Your share of each order is released when it is delivered.`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Owed to you" value={money(bal.unpaid)} note="Closed cycles not paid yet" icon="clock" />
        <Kpi label="Held until delivery" value={money(bal.held)} note="Released when delivered" icon="shield" />
        <Kpi label="Paid so far" value={money(paid)} icon="rupee" />
        <Kpi label="Commission" value={`${retailer.commission?.rate ?? 10}%`} note={Object.keys(retailer.commission?.byCategory || {}).length ? 'Some categories differ' : 'On every order'} icon="percent" />
      </div>
      <DataTable
        id="seller-payouts"
        rows={mine}
        rowKey={(r) => r.key}
        columns={[
          { key: 'start', label: 'Cycle', always: true, render: (r) => <b className="whitespace-nowrap text-ink">{r.label}</b>, csv: (r) => r.label },
          { key: 'orders', label: 'Delivered', align: 'right' },
          { key: 'sales', label: 'Sales', align: 'right', render: (r) => money(r.sales) },
          { key: 'commission', label: 'Commission', align: 'right', render: (r) => `− ${money(r.commission)}` },
          { key: 'fee', label: 'Plan fee', align: 'right', render: (r) => (r.fee ? `− ${money(r.fee)}` : '—') },
          { key: 'refunds', label: 'Refunds', align: 'right', render: (r) => (r.refunds ? `− ${money(r.refunds)}` : '—') },
          { key: 'net', label: 'You receive', align: 'right', render: (r) => <b className="text-forest">{money(r.net)}</b> },
          { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} label={{ open: 'This week', pending: 'Being checked', approved: 'Approved', on_hold: 'On hold', paid: 'Paid' }[r.status]} /> },
          { key: 'utr', label: 'Bank ref', hidden: true },
        ]}
        searchText={(r) => `${r.label} ${r.utr}`}
        searchPlaceholder="Search cycle or bank reference"
        initialSort={{ key: 'start', dir: 'desc' }}
        onRowClick={(r) => setOpen(r.key)}
        exportName="my-payouts"
      />
      {row && (
        <Modal open onClose={() => setOpen(null)} title={`Payout · ${row.label}`} size="md">
          <DetailList rows={[
            ['Status', <StatusPill status={row.status} />],
            ['Delivered orders', row.orders],
            ['Sales', money(row.sales)],
            ['Commission', `− ${money(row.commission)}`],
            ['Plan fee', row.fee ? `− ${money(row.fee)}` : '—'],
            ['Refunds', row.refunds ? `− ${money(row.refunds)}` : '—'],
            ['Adjustments', row.adjustments ? money(row.adjustments) : '—'],
            ['You receive', <b className="text-forest">{money(row.net)}</b>],
            row.utr && ['Bank reference', <span className="font-mono">{row.utr}</span>],
          ]} />
        </Modal>
      )}
    </div>
  );
}
