import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import Modal from '../components/Modal';
import { Badge, Button, Container, Breadcrumbs } from '../components/ui';
import { findProduct } from '../data/catalog';
import { formatOrderDate } from '../data/orders';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { updatePart, useRefunds } from '../store/orders';
import { useScopedOrders } from '../lib/useScoped';
import { money, cx } from '../lib/format';

/* Your orders: one payment, one order — with each seller's part tracked on
   its own (requirement 15). A part that has not been packed yet can be
   cancelled by the customer; prepaid money comes back automatically. */

const SHOW = { Pending: 'Placed', Processing: 'Packing', Shipped: 'In transit', Delivered: 'Delivered', Cancelled: 'Cancelled' };
const TONE = { Placed: 'amber', Packing: 'amber', 'In transit': 'slate', Delivered: 'ok', Cancelled: 'clay' };
const FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const units = (lines) => lines.reduce((n, l) => n + l.qty, 0);
const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function PartTracker({ order, part, onCancel }) {
  const reached = part.status === 'Cancelled' ? -1 : FLOW.indexOf(part.status);
  const last = part.statusLog?.[part.statusLog.length - 1];
  return (
    <div className="rounded-[20px] border border-line-soft bg-[#fbfaf7] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[14px] font-bold text-ink"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-forest text-white"><Icon name="store" size={15} /></span>{part.retailerName}</p>
        <Badge tone={TONE[SHOW[part.status]]}>{SHOW[part.status]}</Badge>
      </div>
      {part.status === 'Cancelled' ? (
        <p className="mt-3 rounded-[12px] bg-clay-50 px-3 py-2 text-[12.5px] font-semibold text-clay-600">This part was cancelled{last?.note ? ` — ${last.note}` : ''}.{part.refunded ? ` ${money(part.refunded)} refunded.` : ''}</p>
      ) : (
        <ol className="mt-4 grid grid-cols-4 gap-1">
          {FLOW.map((s, i) => (
            <li key={s} className="text-center">
              <span className={cx('mx-auto grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold', i <= reached ? 'bg-forest text-white' : 'bg-sunk text-ink-50')}>
                {i < reached || reached === FLOW.length - 1 ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cx('mx-auto mt-2 block h-1 rounded-full', i <= reached ? 'bg-forest' : 'bg-sunk')} />
              <span className="mt-1.5 block text-[10.5px] font-bold text-ink-50 sm:text-[11.5px]">{SHOW[s]}</span>
            </li>
          ))}
        </ol>
      )}
      {last && part.status !== 'Cancelled' && <p className="mt-3 text-[11.5px] text-ink-50">Last update {when(last.at)}</p>}
      <ul className="mt-3 space-y-2">
        {part.lines.map((l) => {
          const p = findProduct(l.id);
          return (
            <li key={l.id} className="flex items-center gap-3 rounded-[14px] bg-white p-2.5">
              <span className="photo-bed grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[12px]">
                {p?.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : <ProductArt kind={p?.art} material={p?.material} className="h-full w-full p-1" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{l.name}</p>
                <p className="tnum text-[12px] text-ink-50">{l.sku} · {l.size || 'standard'} · Qty {l.qty} · {money(l.price)} each</p>
              </div>
              <p className="tnum shrink-0 text-[12.5px] font-bold text-ink">{money(l.amount)}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
        <span className="text-ink-50">Part total <b className="tnum text-ink">{money(part.total)}</b></span>
        {part.status === 'Pending' && <button onClick={() => onCancel(part)} className="font-bold text-clay-600 hover:underline">Cancel this part</button>}
      </div>
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const orders = useScopedOrders();
  const refunds = useRefunds();
  const { add } = useCart();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState('');

  const list = useMemo(() => [...orders].sort((a, b) => b.createdAt - a.createdAt), [orders]);
  const o = list.find((x) => x.id === params.get('id')) ?? list[0];
  const mineRefunds = o ? refunds.filter((r) => r.orderId === o.id) : [];

  const reorder = () => {
    let n = 0;
    o.lines.forEach((l) => {
      const p = findProduct(l.id);
      if (p && p.stock > 0) { add(p, { qty: Math.min(l.qty, p.stock) }); n += 1; }
    });
    if (!n) toast.error('Those items are out of stock right now.');
  };

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'Orders' }]} />
      {!o ? (
        <div className="mx-auto max-w-md rounded-[24px] bg-white p-10 text-center shadow-card">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sunk text-forest"><Icon name="package" size={24} /></span>
          <h1 className="mt-4 text-[22px] font-semibold">No orders yet</h1>
          <p className="mt-1 text-[14px] text-ink-50">Your orders and every seller’s delivery will show up here.</p>
          <div className="mt-5"><Button to="/shop" iconRight="arrowRight">Start shopping</Button></div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="min-w-0">
            <h1 className="font-hero text-[clamp(1.6rem,4vw,2.1rem)] font-semibold">Your orders</h1>
            <p className="mt-1 text-[14px] text-ink-50">Track every seller’s part, reorder and download invoices · {user?.fullName}</p>
            <div className="mt-4 space-y-3">
              {list.map((x) => {
                const st = SHOW[x.status] || x.status;
                return (
                  <button key={x.id} onClick={() => setParams({ id: x.id })} aria-pressed={x.id === o.id} className={cx('w-full rounded-[20px] border bg-white p-4 text-left shadow-sm transition hover:shadow-card', x.id === o.id ? 'border-forest ring-2 ring-forest/10' : 'border-white')}>
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{x.lines[0]?.name}{x.lines.length > 1 && <span className="font-medium text-ink-50"> +{x.lines.length - 1} more</span>}</p>
                        <p className="mt-1 text-[12px] text-ink-50"><span className="font-mono">{x.id}</span> · {formatOrderDate(x.createdAt)}</p>
                      </div>
                      <Badge tone={TONE[st]} className="h-fit shrink-0">{st}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="tnum rounded-full bg-sunk px-2.5 py-1 text-[12px] font-bold text-forest">{x.parts.length} seller{x.parts.length > 1 ? 's' : ''} · {units(x.lines)} unit{units(x.lines) === 1 ? '' : 's'}</span>
                      <span className="tnum font-bold text-ink">{money(x.total)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <AnimatePresence mode="wait">
            <motion.section key={o.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="h-fit min-w-0 rounded-[24px] bg-white p-4 shadow-card sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-50">Order tracking</p>
                  <h2 className="font-hero mt-2 text-[22px] font-semibold">Order {o.id}</h2>
                  <p className="mt-1 text-sm text-ink-50">Placed {formatOrderDate(o.createdAt)} · {units(o.lines)} unit{units(o.lines) === 1 ? '' : 's'} · {o.parts.length > 1 ? `ships in ${o.parts.length} parts` : 'one seller'}</p>
                </div>
                <Badge tone={TONE[SHOW[o.status]]} className="shrink-0">{SHOW[o.status]}</Badge>
              </div>

              <div className="mt-5 space-y-3">
                {o.parts.map((p) => <PartTracker key={p.id} order={o} part={p} onCancel={setCancelling} />)}
              </div>

              <dl className="mt-5 space-y-1.5 rounded-[18px] bg-[#f6f3ed] p-4 text-sm">
                {o.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discounts</dt><dd className="tnum font-semibold">− {money(o.discount)}</dd></div>}
                <div className="flex justify-between text-ink-50"><dt>GST</dt><dd className="tnum">{money(o.gst)}</dd></div>
                <div className="flex justify-between text-ink-50"><dt>Delivery</dt><dd className="tnum">{o.shipping ? money(o.shipping) : 'Free'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-50">Order total</dt><dd className="tnum font-bold text-ink">{money(o.total)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-50">Payment</dt><dd className="text-right font-semibold text-ink">{o.payment} · {o.paymentStatus}</dd></div>
                {mineRefunds.filter((r) => r.status === 'processed').map((r) => <div key={r.id} className="flex justify-between text-emerald-700"><dt>Refund · {r.partId}</dt><dd className="tnum font-semibold">{money(r.amount)}</dd></div>)}
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button to={`/invoice/${o.id}`} size="sm" variant="outline" icon="fileText">Invoice</Button>
                <Button size="sm" variant="ghost" icon="refresh" onClick={reorder}>Reorder</Button>
                <Link to="/enquiry" className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-bold text-forest hover:bg-sunk"><Icon name="headset" size={15} /> Need help?</Link>
              </div>
            </motion.section>
          </AnimatePresence>
        </div>
      )}

      {cancelling && (
        <Modal open onClose={() => setCancelling(null)} title={`Cancel ${cancelling.retailerName}’s part?`} size="sm">
          <p className="text-[13.5px] text-ink-70">Only this seller’s items are cancelled — the rest of your order carries on.{o.payment !== 'Cash on delivery' ? ` ${money(cancelling.total)} comes back to your original payment method in 5–7 working days.` : ''}</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-4 h-11 w-full rounded-md border border-line px-3 text-[14px]">
            <option value="">Why are you cancelling?</option>
            {['Ordered by mistake', 'Found a better price', 'Delivery is too slow', 'Changed my plan'].map((r) => <option key={r}>{r}</option>)}
          </select>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCancelling(null)}>Keep it</Button>
            <Button size="sm" className="!border-clay !bg-clay" disabled={!reason} onClick={() => { updatePart(o.id, cancelling.id, 'Cancelled', { by: user.fullName, note: `Cancelled by customer: ${reason}` }); toast.success('Part cancelled'); setCancelling(null); setReason(''); }}>Cancel part</Button>
          </div>
        </Modal>
      )}
    </Container>
  );
}
