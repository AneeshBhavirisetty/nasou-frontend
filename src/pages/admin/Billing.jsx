import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import ExcelExportButton from '../../components/ExcelExportButton';
import RangePicker from '../../components/admin/RangePicker';
import { AdminPageHead, FilterTabs, SearchInput, ViewOnlyBanner } from '../../components/admin/AdminUI';
import { ChartCard, BarList, Donut, STATUS, FOREST } from '../../components/charts/Charts';
import { Badge } from '../../components/ui';
import { useOrderStore } from '../../context/OrderStore';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { allOrders, formatOrderDate } from '../../data/orders';
import { billedOf, isOutstanding, isSettled, paymentStatusOf, rupeesCompact, withinDays } from '../../lib/analytics';
import { money, cx } from '../../lib/format';

/* Billing & payments (client review 2, admin item 4).
   Invoices = every order in the book; payment status comes from the order
   (Paid · Collected · Due on delivery · Invoice due · Refunded). Team members
   with billing "edit" can mark cash-on-delivery / invoice payments collected. */

const TONE = { Paid: 'ok', Collected: 'ok', 'Due on delivery': 'amber', 'Invoice due': 'amber', Refunded: 'clay' };
const TABS = [
  { value: '', label: 'All' },
  { value: 'settled', label: 'Paid & collected' },
  { value: 'due', label: 'Outstanding' },
  { value: 'Refunded', label: 'Refunded' },
];

function Tile({ label, value, note, icon, tone = 'text-forest' }) {
  return (
    <div className="rounded-[18px] border border-line bg-white p-3.5 shadow-card sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-ink-70">{label}</p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-sunk text-forest"><Icon name={icon} size={15} /></span>
      </div>
      <p className={cx('mt-1.5 text-[clamp(1.3rem,3.5vw,1.7rem)] font-semibold tracking-[-0.03em]', tone)}>{value}</p>
      <p className="mt-0.5 text-[11.5px] text-ink-50">{note}</p>
    </div>
  );
}

export default function AdminBilling() {
  const toast = useToast();
  const { placed, updateOrder } = useOrderStore();
  const canEdit = useIam().can('billing', 'edit');
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('');
  const [q, setQ] = useState('');

  const inRange = useMemo(() => withinDays(allOrders(placed), days).map((o) => ({ ...o, pay: paymentStatusOf(o) })), [placed, days]);
  const live = inRange.filter((o) => o.status !== 'Cancelled');

  const billed = live.reduce((s, o) => s + o.total, 0);
  const collected = live.filter((o) => isSettled(o.pay)).reduce((s, o) => s + o.total, 0);
  const outstanding = live.filter((o) => isOutstanding(o.pay)).reduce((s, o) => s + o.total, 0);
  const gst = live.reduce((s, o) => s + (o.gst || 0), 0);
  const refunded = inRange.filter((o) => o.pay === 'Refunded').reduce((s, o) => s + o.total, 0);

  const byMethod = useMemo(() => {
    const m = new Map();
    live.filter((o) => isSettled(o.pay)).forEach((o) => m.set(o.payment, (m.get(o.payment) || 0) + o.total));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [live]);

  const statusSlices = [
    { label: 'Paid & collected', value: collected, color: STATUS.good },
    { label: 'Outstanding', value: outstanding, color: STATUS.warning },
    { label: 'Refunded', value: refunded, color: STATUS.critical },
  ];

  const needle = q.trim().toLowerCase();
  const rows = inRange.filter((o) => {
    if (tab === 'settled' && !isSettled(o.pay)) return false;
    if (tab === 'due' && !isOutstanding(o.pay)) return false;
    if (tab === 'Refunded' && o.pay !== 'Refunded') return false;
    if (needle && !`${o.id} ${o.customer} ${o.payment}`.toLowerCase().includes(needle)) return false;
    return true;
  });

  const markCollected = (o) => {
    updateOrder(o.id, { paymentStatus: 'Collected' });
    toast.success(`${o.id} marked collected · ${money(o.total)}`);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <AdminPageHead
        title="Billing & payments"
        note={`${inRange.length} invoices · ${rupeesCompact(outstanding)} outstanding`}
      >
        <ExcelExportButton
          filename="nasou-invoices"
          label="Export"
          headers={['Invoice', 'Date', 'Customer', 'Payment method', 'Payment status', 'Subtotal', 'Discount', 'GST', 'Delivery', 'Total']}
          rows={rows.map((o) => [o.id, formatOrderDate(o.createdAt), o.customer, o.payment, o.pay, o.subtotal, o.discount || 0, o.gst, o.shipping, o.total])}
        />
      </AdminPageHead>

      {!canEdit && <ViewOnlyBanner what="billing" />}
      <RangePicker value={days} onChange={setDays} />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Tile label="Billed" value={rupeesCompact(billed)} note="Invoices incl. GST & delivery" icon="fileText" />
        <Tile label="Collected" value={rupeesCompact(collected)} note="Paid online + COD collected" icon="check" />
        <Tile label="Outstanding" value={rupeesCompact(outstanding)} note="COD due + invoices due" icon="clock" tone={outstanding ? 'text-amber' : 'text-forest'} />
        <Tile label="GST billed" value={rupeesCompact(gst)} note="18% on taxable value" icon="percent" />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <ChartCard
          title="Collected by payment method"
          note="Settled amounts in this range"
          table={{ headers: ['Method', 'Collected'], rows: byMethod.map((r) => [r.label, money(r.value)]) }}
        >
          <BarList rows={byMethod} format={rupeesCompact} color={FOREST} />
        </ChartCard>
        <ChartCard
          title="Payment status"
          note="Share of billed value"
          table={{ headers: ['Status', 'Amount'], rows: statusSlices.map((s) => [s.label, money(s.value)]) }}
        >
          <Donut slices={statusSlices} format={rupeesCompact} center={{ value: rupeesCompact(billed + refunded), label: 'billed' }} />
        </ChartCard>
      </div>

      <section className="min-w-0 rounded-[20px] border border-line bg-white p-3 shadow-card sm:p-4">
        <div className="space-y-3">
          <SearchInput placeholder="Search invoice, customer or method" value={q} onChange={(e) => setQ(e.target.value)} />
          <FilterTabs
            label="Payment status"
            value={tab}
            onChange={setTab}
            options={TABS.map((t) => ({
              ...t,
              count: t.value === '' ? inRange.length
                : t.value === 'settled' ? inRange.filter((o) => isSettled(o.pay)).length
                : t.value === 'due' ? inRange.filter((o) => isOutstanding(o.pay)).length
                : inRange.filter((o) => o.pay === 'Refunded').length,
            }))}
          />
        </div>

        <ul className="mt-3 divide-y divide-line-soft">
          {rows.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 sm:flex-nowrap">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sunk text-forest"><Icon name="fileText" size={15} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink"><span className="font-mono">{o.id}</span> · {o.customer}</p>
                <p className="truncate text-[11.5px] text-ink-50">{formatOrderDate(o.createdAt)} · {o.payment}{o.gst ? ` · GST ${money(o.gst)}` : ''}</p>
              </div>
              <Badge tone={TONE[o.pay]} className="shrink-0">{o.pay}</Badge>
              <span className="tnum w-20 shrink-0 text-right text-[13.5px] font-bold text-ink">{money(o.total)}</span>
              <div className="flex shrink-0 gap-1.5">
                {canEdit && isOutstanding(o.pay) && placed.some((p) => p.id === o.id) && (
                  <button onClick={() => markCollected(o)} className="flex h-8 items-center gap-1 rounded-md bg-forest px-2.5 text-[12px] font-bold text-white transition hover:bg-forest-800">
                    <Icon name="check" size={13} /> Collected
                  </button>
                )}
                <Link to={`/invoice/${o.id}`} className="flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-[12px] font-bold text-forest transition hover:border-forest">
                  Invoice
                </Link>
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="py-10 text-center text-[13px] text-ink-50">No invoices match.</li>}
        </ul>
      </section>
    </div>
  );
}
