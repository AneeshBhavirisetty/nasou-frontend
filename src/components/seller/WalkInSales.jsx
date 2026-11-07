import { useCallback, useEffect, useState } from 'react';
import DataTable from '../admin/DataTable';
import { EmptyNote } from '../admin/AdminUI';
import { Button } from '../ui';
import Modal from '../Modal';
import { CreateOrderDialog } from './QuickActions';
import { get } from '../../lib/api';
import { LIVE } from '../../lib/config';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';
import { useToast } from '../../context/ToastContext';

/* Seller › Orders › Walk-in sales (client final review): sales the store made at
   its own counter, recorded from "Create order". Not Nivorva orders — no
   delivery, commission or payout — so they are listed apart. */
const PAID = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', OTHER: 'Other' };

export default function WalkInSales({ canRecord }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [recording, setRecording] = useState(false);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => {
    if (!LIVE) { setRows([]); return; }
    get('/seller/walk-in-sales').then(setRows).catch((x) => { setRows([]); toast.error(x.message); });
  }, [toast]);
  useEffect(load, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-50">Sales at your own counter to customers without a Nivorva account. Stock went down when each was recorded; no commission or payout.</p>
        {canRecord && <Button size="sm" icon="plus" onClick={() => setRecording(true)}>Record a walk-in sale</Button>}
      </div>
      {rows === null ? (
        <p className="py-6 text-center text-[13px] text-ink-50">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyNote icon="receipt" title="No walk-in sales yet" body="Use Create order → Walk-in sale when someone buys at your counter." />
      ) : (
        <DataTable
          id="seller-walk-ins"
          rows={rows}
          columns={[
            { key: 'number', label: 'Sale', always: true, render: (s) => <span className="font-mono text-[12.5px] font-bold text-ink">{s.number}</span> },
            { key: 'createdAt', label: 'When', render: (s) => formatOrderDate(s.createdAt) },
            { key: 'customerName', label: 'Customer', value: (s) => s.customerName || 'Walk-in', render: (s) => <span className="block min-w-[120px]"><b className="text-ink">{s.customerName || 'Walk-in'}</b>{s.phone && <span className="block text-[11.5px] text-ink-50">{s.phone}</span>}</span> },
            { key: 'units', label: 'Units', align: 'right' },
            { key: 'payment', label: 'Paid by', value: (s) => PAID[s.payment] || s.payment },
            { key: 'total', label: 'Total', align: 'right', render: (s) => money(s.total) },
            { key: 'by', label: 'Recorded by' },
          ]}
          searchText={(s) => `${s.number} ${s.customerName || ''} ${s.phone || ''} ${s.lines.map((l) => `${l.name} ${l.sku}`).join(' ')}`}
          searchPlaceholder="Search sale, customer, product"
          date={(s) => s.createdAt}
          initialSort={{ key: 'createdAt', dir: 'desc' }}
          onRowClick={(s) => setOpen(s)}
          exportName="walk-in-sales"
        />
      )}

      <CreateOrderDialog open={recording} onClose={() => { setRecording(false); load(); }} />

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Walk-in sale ${open.number}` : ''}>
        {open && (
          <div className="space-y-3 text-[13px]">
            <p className="text-ink-50">{formatOrderDate(open.createdAt)} · {open.customerName || 'Walk-in customer'}{open.phone ? ` · ${open.phone}` : ''} · paid by {(PAID[open.payment] || open.payment).toLowerCase()}{open.by ? ` · recorded by ${open.by}` : ''}</p>
            <ul className="divide-y divide-line-soft rounded-[14px] border border-line">
              {open.lines.map((l) => (
                <li key={l.sku} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1"><b className="block truncate text-ink">{l.name}</b><span className="text-[11.5px] text-ink-50">{l.sku} · {l.qty} × {money(l.unitPrice)}</span></span>
                  <b className="tnum text-ink">{money(l.total)}</b>
                </li>
              ))}
              <li className="flex justify-between px-3 py-2.5"><span className="text-ink-50">Total collected</span><b className="tnum text-ink">{money(open.total)}</b></li>
            </ul>
            {open.note && <p className="rounded-[12px] bg-[#f6f3ed] px-3 py-2 text-ink-70">{open.note}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
