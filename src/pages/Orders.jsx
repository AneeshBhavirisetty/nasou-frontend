import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import { Badge, Button, Container, Breadcrumbs } from '../components/ui';
import { findProduct, products } from '../data/catalog';
import { formatOrderDate } from '../data/orders';
import { useAuth } from '../context/AuthContext';
import { useOrderStore } from '../context/OrderStore';
import { useCart } from '../context/CartContext';
import { money, deliveryBy, cx } from '../lib/format';

/* Seeded sample history so a demo account has something to show. Quantities
   are part of the line (client review 2, item 12: show how many were ordered). */
function sampleOrders(seed = 7) {
  const pick = (i) => products[(i * 137 + seed * 11) % products.length];
  return [
    { id: 'NH-4821', status: 'Delivered', days: -12, picks: [3, 9] },
    { id: 'NH-4790', status: 'In transit', days: -3, picks: [21, 48, 77] },
    { id: 'NH-4756', status: 'Processing', days: -1, picks: [105] },
  ].map((o) => {
    const lines = o.picks.map((i) => {
      const p = pick(i);
      const qty = 1 + (p.row % 3) * 5;
      return { id: p.id, sku: p.sku, name: p.name, size: p.size, qty, price: p.price, amount: p.price * qty };
    });
    return {
      ...o,
      sample: true,
      date: deliveryBy(o.days),
      lines,
      total: lines.reduce((s, l) => s + l.amount, 0),
      payment: 'UPI',
    };
  });
}

/* Order-book statuses → the words a customer sees on the tracker. */
const SHOW = { Pending: 'Placed', Processing: 'Processing', Shipped: 'In transit', Delivered: 'Delivered', Cancelled: 'Cancelled' };
const STATUS_TONE = { Placed: 'amber', Processing: 'amber', 'In transit': 'slate', Delivered: 'ok', Cancelled: 'clay' };
const FLOW = ['Placed', 'Processing', 'In transit', 'Delivered'];

const units = (o) => o.lines.reduce((n, l) => n + l.qty, 0);

/* Layout follows the NasouHive demo "Your Orders": order list on the left,
   a live-tracking panel for the selected order on the right. */
export default function Orders() {
  const { user } = useAuth();
  const { placed } = useOrderStore();
  const { add } = useCart();

  const orders = useMemo(() => {
    const mine = placed
      .filter((o) => o.userId === (user?.id || 'guest'))
      .map((o) => ({ ...o, status: SHOW[o.status] || o.status, date: formatOrderDate(o.createdAt) }));
    return [...mine, ...sampleOrders()];
  }, [placed, user?.id]);

  const [sel, setSel] = useState(null);
  const o = orders.find((x) => x.id === sel) ?? orders[0];
  const reached = o.status === 'Cancelled' ? -1 : FLOW.indexOf(o.status);

  const reorder = () => {
    o.lines.forEach((l) => {
      const p = findProduct(l.id);
      if (p && p.stock > 0) add(p, { qty: Math.min(l.qty, p.stock) });
    });
  };

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'Orders' }]} />

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="min-w-0">
          <h1 className="text-[clamp(1.5rem,4vw,1.75rem)] font-semibold">Your orders</h1>
          <p className="mt-1 text-[14px] text-ink-50">Track, reorder and download invoices · signed in as {user?.fullName || 'customer'}</p>

          <div className="mt-4 space-y-3">
            {orders.map((x) => (
              <button
                key={x.id}
                onClick={() => setSel(x.id)}
                aria-pressed={x.id === o.id}
                className={cx(
                  'w-full rounded-[18px] border bg-white p-4 text-left shadow-sm transition hover:shadow-card',
                  x.id === o.id ? 'border-forest' : 'border-white'
                )}
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {x.lines[0].name} <span className="tnum font-bold text-forest">× {x.lines[0].qty}</span>
                      {x.lines.length > 1 && <span className="font-medium text-ink-50"> +{x.lines.length - 1} more</span>}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-50"><span className="font-mono">{x.id}</span> · Ordered {x.date}</p>
                  </div>
                  <Badge tone={STATUS_TONE[x.status]} className="h-fit shrink-0">{x.status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="tnum rounded-full bg-sunk px-2.5 py-1 text-[12px] font-bold text-forest">
                    {x.lines.length} product{x.lines.length !== 1 && 's'} · {units(x)} unit{units(x) !== 1 && 's'}
                  </span>
                  <span className="tnum font-bold text-ink">{money(x.total)}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-35">
            <Icon name="clock" size={13} /> Orders you place appear at the top; older ones are sample history for the demo.
          </p>
        </section>

        <AnimatePresence mode="wait">
          <motion.section
            key={o.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-fit min-w-0 rounded-[20px] bg-white p-4 shadow-card sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-50">Order tracking</p>
                <h2 className="mt-2 text-xl font-semibold">Order {o.id}</h2>
                <p className="mt-1 text-sm text-ink-50">
                  Ordered {o.date} · {o.lines.length} product{o.lines.length !== 1 && 's'} · <span className="tnum font-semibold text-ink">{units(o)} units</span>
                </p>
              </div>
              <Badge tone={STATUS_TONE[o.status]} className="shrink-0">{o.status}</Badge>
            </div>

            {o.status === 'Cancelled' ? (
              <p className="mt-6 flex items-center gap-2 rounded-[14px] bg-clay-50 px-4 py-3 text-[13px] font-semibold text-clay-600">
                <Icon name="close" size={14} /> This order was cancelled.
              </p>
            ) : (
              <ol className="mt-7 grid grid-cols-4 gap-1">
                {FLOW.map((step, i) => (
                  <li key={step} className="text-center">
                    <span className={cx('mx-auto grid h-9 w-9 place-items-center rounded-full text-xs font-bold', i <= reached ? 'bg-forest text-white' : 'bg-sunk text-ink-50')}>
                      {i < reached || reached === FLOW.length - 1 ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={cx('mx-auto mt-2 block h-1 rounded-full', i <= reached ? 'bg-forest' : 'bg-sunk')} />
                    <span className="mt-2 block text-[10.5px] font-bold text-ink-50 sm:text-xs">{step}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-6 rounded-[18px] bg-[#f4f7f5] p-3 sm:p-4">
              <p className="text-sm font-bold text-forest">Items in this order</p>
              <ul className="mt-3 space-y-2">
                {o.lines.map((l) => {
                  const p = findProduct(l.id);
                  return (
                    <li key={l.id} className="flex items-center gap-3 rounded-[14px] bg-white p-2.5">
                      <span className="photo-bed grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[12px]">
                        {p?.images?.[0]
                          ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                          : <ProductArt kind={p?.art} material={p?.material} className="h-full w-full p-1" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{l.name}</p>
                        <p className="tnum text-[12px] text-ink-50">{l.sku} · {l.size || 'standard'} · {money(l.price)} each</p>
                        {l.bulk && <p className="text-[11.5px] font-semibold text-emerald-700">Bulk price · − {money(l.bulk.amount)}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tnum rounded-full bg-forest px-2.5 py-0.5 text-[12px] font-bold text-white">× {l.qty}</p>
                        <p className="tnum mt-1 text-[12.5px] font-bold text-ink">{money(l.amount)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-3 space-y-1.5 border-t border-[#cad8d2] pt-3 text-sm">
                {o.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discounts</dt><dd className="tnum font-semibold">− {money(o.discount)}</dd></div>}
                {o.gst > 0 && <div className="flex justify-between text-ink-50"><dt>GST (18%)</dt><dd className="tnum">{money(o.gst)}</dd></div>}
                <div className="flex justify-between"><dt className="text-ink-50">Order total</dt><dd className="tnum font-bold text-ink">{money(o.total)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-50">Payment</dt>
                  <dd className="text-right font-semibold text-ink">{o.payment}{o.paymentStatus === 'Due on delivery' && <span className="block text-[12px] text-forest">Pay {money(o.total)} on delivery</span>}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {!o.sample
                ? <Button to={`/invoice/${o.id}`} size="sm" variant="outline" icon="fileText">Invoice</Button>
                : <Button size="sm" variant="outline" icon="fileText" disabled>Invoice</Button>}
              <Button size="sm" variant="ghost" icon="refresh" onClick={reorder}>Reorder</Button>
              <Link to="/enquiry" className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-bold text-forest hover:bg-sunk">
                <Icon name="headset" size={15} /> Need help?
              </Link>
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
    </Container>
  );
}
