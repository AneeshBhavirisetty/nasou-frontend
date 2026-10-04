import { useState } from 'react';
import Icon from '../Icon';
import ProductArt from '../ProductArt';
import ReasonDialog from './ReasonDialog';
import { StatusPill, SELECT_CLS, LABEL_CLS } from './AdminUI';
import { findProduct } from '../../data/catalog';
import { createRefund, refundableOn, updatePart } from '../../store/orders';
import { useToast } from '../../context/ToastContext';
import { ORDER_FLOW, nextStatus } from '../../lib/marketplace';
import { money, cx } from '../../lib/format';
import { act } from '../../lib/act';

/* One retailer's sub-order: lines, progress, Razorpay transfer and the
   actions the viewer may take. Shared by the Super Admin order page and the
   seller console. */

const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const TRANSFER = { on_hold: 'Held until delivery', released: 'Released to retailer', reversed: 'Reversed' };

export default function PartCard({ order, part, by, canAdvance, canCancel, canRefund, byRetailer = false, showMoney = true }) {
  const toast = useToast();
  const [dialog, setDialog] = useState(null);
  const [amount, setAmount] = useState('');
  const reached = part.status === 'Cancelled' ? -1 : ORDER_FLOW.indexOf(part.status);
  const live = part.status !== 'Cancelled' && part.status !== 'Delivered';
  const max = refundableOn(order.id, part.id);
  const next = nextStatus(part.status);

  const advance = () => {
    act(toast, () => updatePart(order.id, part.id, next, { by, byRetailer }), `${part.id} → ${next}`);
  };

  return (
    <article className={cx('overflow-hidden rounded-[22px] border bg-white shadow-card', part.status === 'Cancelled' ? 'border-clay/20' : 'border-line')}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft bg-[#f6f3ed] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14.5px] font-bold text-ink"><Icon name="store" size={15} className="text-forest" /> {part.retailerName}</p>
          <p className="font-mono text-[11.5px] text-ink-50">{part.id}</p>
        </div>
        <StatusPill status={part.status} />
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {part.status !== 'Cancelled' ? (
          <ol className="grid grid-cols-4 gap-1" aria-label="Progress">
            {ORDER_FLOW.map((s, i) => (
              <li key={s} className="text-center">
                <span className={cx('mx-auto block h-1.5 rounded-full', i <= reached ? 'bg-forest' : 'bg-sunk')} />
                <span className={cx('mt-1.5 block text-[10.5px] font-bold', i === reached ? 'text-forest' : 'text-ink-35')}>{s}</span>
              </li>
            ))}
          </ol>
        ) : <p className="rounded-[12px] bg-clay-50 px-3 py-2 text-[12.5px] font-semibold text-clay-600">Cancelled — stock returned{order.payment !== 'Cash on delivery' ? ' and payment refunded' : ''}.</p>}

        <ul className="space-y-2">
          {part.lines.map((l) => {
            const p = findProduct(l.id);
            return (
              <li key={l.id} className="flex items-center gap-3">
                <span className="photo-bed grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[12px]">
                  {p?.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : <ProductArt kind={p?.art} material={p?.material} className="h-full w-full p-1" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{l.name}</p>
                  <p className="tnum text-[11.5px] text-ink-50">{l.sku} · {l.size || 'standard'} · Qty {l.qty} · {money(l.price)} each</p>
                </div>
                <span className="tnum shrink-0 text-[13px] font-bold">{money(l.amount)}</span>
              </li>
            );
          })}
        </ul>

        {showMoney && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-[14px] bg-[#f6f3ed] p-3 text-[12.5px] sm:grid-cols-4">
            <div><dt className="text-ink-50">Part value</dt><dd className="tnum font-bold text-ink">{money(part.total)}</dd></div>
            <div><dt className="text-ink-50">Commission ({part.commissionRate}%)</dt><dd className="tnum font-bold text-ink">{money(part.commission)}</dd></div>
            <div><dt className="text-ink-50">Retailer share</dt><dd className="tnum font-bold text-ink">{money(part.retailerShare)}</dd></div>
            <div><dt className="text-ink-50">Refunded</dt><dd className="tnum font-bold text-ink">{money(part.refunded || 0)}</dd></div>
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-ink-50">Razorpay transfer</dt>
              <dd className="font-semibold text-ink">{part.transfer ? <><span className="font-mono">{part.transfer.id}</span> → <span className="font-mono">{part.transfer.account || 'linked account'}</span> · {TRANSFER[part.transfer.status]}{part.transfer.reversed ? ` · ${money(part.transfer.reversed)} reversed` : ''}</> : 'Cash on delivery — settled through the weekly payout'}</dd>
            </div>
          </dl>
        )}

        <details className="text-[12.5px]">
          <summary className="cursor-pointer font-bold text-forest">Status history ({part.statusLog?.length || 0})</summary>
          <ol className="mt-2 space-y-1.5 border-l border-line pl-3">
            {(part.statusLog || []).map((s, i) => <li key={i}><b className="text-ink">{s.status}</b> <span className="text-ink-50">· {when(s.at)}{s.by ? ` · ${s.by}` : ''}{s.note ? ` — ${s.note}` : ''}</span></li>)}
          </ol>
        </details>

        {(canAdvance || canCancel || canRefund) && (
          <div className="flex flex-wrap gap-2 border-t border-line-soft pt-3">
            {canAdvance && live && <button onClick={advance} className="flex h-9 items-center gap-1.5 rounded-full bg-forest px-4 text-[12.5px] font-bold text-white shadow-btn hover:bg-forest-800"><Icon name="chevronsRight" size={14} /> Mark {next.toLowerCase()}</button>}
            {canCancel && live && <button onClick={() => setDialog('cancel')} className="flex h-9 items-center gap-1.5 rounded-full border border-clay/30 px-4 text-[12.5px] font-bold text-clay-600 hover:bg-clay-50"><Icon name="close" size={14} /> Cancel part</button>}
            {canRefund && max > 0 && part.status !== 'Cancelled' && order.payment !== 'Cash on delivery' && <button onClick={() => { setAmount(String(max)); setDialog('refund'); }} className="flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12.5px] font-bold text-forest hover:border-forest"><Icon name="refresh" size={14} /> Start refund</button>}
          </div>
        )}
      </div>

      <ReasonDialog open={dialog === 'cancel'} onClose={() => setDialog(null)} title={`Cancel ${part.id}?`} confirm="Cancel this part" tone="danger" label="Reason (shown to the customer)"
        intro={<>Only <b>{part.retailerName}</b>’s part is cancelled; other sellers’ parts carry on. Stock goes back{order.payment !== 'Cash on delivery' ? ` and ${money(part.total - (part.refunded || 0))} is refunded` : ''}.</>}
        onConfirm={(why) => { act(toast, () => updatePart(order.id, part.id, 'Cancelled', { by, note: why, byRetailer }), `${part.id} cancelled`); }} />
      <ReasonDialog open={dialog === 'refund'} onClose={() => setDialog(null)} title={`Refund on ${part.id}`} confirm="Start refund" label="Reason"
        intro={<>Comes only out of <b>{part.retailerName}</b>’s share (commission is returned pro rata). Up to <b>{money(max)}</b>. Finance approves before Razorpay pays it out.</>}
        onConfirm={(why) => { createRefund({ orderId: order.id, partId: part.id, amount, reason: why, by }); toast.success('Refund started — waiting for Finance'); }}>
        <label className="block max-w-[220px]">
          <span className={LABEL_CLS}>Amount (₹)</span>
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className={SELECT_CLS} />
        </label>
      </ReasonDialog>
    </article>
  );
}
