import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import { Badge, Button, Container, Breadcrumbs, PriceTag, Stepper } from '../components/ui';
import { useCart } from '../context/CartContext';
import { money, cx } from '../lib/format';
import { EASE } from '../lib/motion';

function FreeDeliveryBar({ subtotal, toFree }) {
  const pct = Math.min(100, (subtotal / (subtotal + toFree || 1)) * 100);
  if (toFree <= 0) {
    return (
      <p className="flex items-center gap-2 rounded-[16px] bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">
        <Icon name="check" size={14} strokeWidth={3} /> You&rsquo;ve unlocked free delivery.
      </p>
    );
  }
  return (
    <div className="rounded-[16px] bg-white p-4 shadow-sm">
      <p className="text-[13px] text-ink-70">
        Add <span className="tnum font-bold text-ink">{money(toFree)}</span> more for free delivery.
      </p>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-sunk">
        <motion.div className="h-full rounded-full bg-forest" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: EASE }} />
      </div>
    </div>
  );
}

export default function Cart() {
  const { items, totals, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-md rounded-[24px] border border-white/80 bg-white p-10 text-center shadow-card sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sunk text-forest"><Icon name="cart" size={28} /></span>
          <h1 className="mt-6 text-[24px] font-semibold text-ink">Your cart is empty</h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-ink-50">1,400+ fittings with real prices are one search away.</p>
          <div className="mt-7"><Button to="/shop" size="lg" iconRight="arrowRight">Start shopping</Button></div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1 className="text-[clamp(1.5rem,4vw,1.75rem)] font-semibold text-ink">Shopping cart</h1>
      <p className="mt-1 text-[14px] text-ink-50">
        <span className="tnum font-semibold text-ink">{totals.count}</span> item{totals.count !== 1 && 's'} ready for checkout
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-4"><FreeDeliveryBar subtotal={totals.subtotal} toFree={totals.toFreeDelivery} /></div>
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((line) => (
                <motion.li
                  key={`${line.id}-${line.supplierId}`}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="flex gap-3 rounded-[18px] bg-white p-3.5 shadow-sm transition hover:shadow-card sm:gap-4 sm:p-4"
                >
                  <Link to={`/product/${line.id}`} className="shrink-0">
                    <span className="photo-bed grid h-24 w-24 place-items-center overflow-hidden rounded-[14px]">
                      <ProductArt kind={line.product.art} material={line.product.material} className="h-full w-full p-2" />
                    </span>
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/product/${line.id}`} className="text-[15px] font-semibold leading-snug text-ink transition hover:text-forest">
                          {line.product.name}
                        </Link>
                        <p className="mt-0.5 text-[12px] text-ink-50">{line.product.sku} · {line.product.size || 'standard'}</p>
                      </div>
                      <button onClick={() => remove(line.index)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-35 transition hover:bg-clay-50 hover:text-clay" aria-label="Remove item">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="slate" icon="truck">{line.supplier?.name} · {line.supplier?.eta}</Badge>
                    </div>

                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                      <Stepper value={line.qty} onChange={(q) => setQty(line.index, q)} min={0} size="sm" />
                      <div className="text-right">
                        <p className="tnum text-[17px] font-semibold text-ink">{money(line.price * line.qty)}</p>
                        {line.qty > 1 && <p className="tnum text-[11.5px] text-ink-35">{money(line.price)} each</p>}
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>

        <aside>
          <div className="sticky top-[136px] rounded-[20px] bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Order summary</h2>
            <dl className="mt-5 space-y-3 text-[14px] text-ink-50">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tnum text-ink">{money(totals.subtotal)}</dd></div>
              {totals.savings > 0 && <div className="flex justify-between text-emerald-700"><dt>Savings</dt><dd className="tnum font-semibold">− {money(totals.savings)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery</dt><dd className="tnum text-ink">{totals.delivery === 0 ? <span className="font-semibold text-emerald-700">Free</span> : money(totals.delivery)}</dd></div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-4">
              <span className="text-lg font-semibold text-ink">Total</span>
              <span className="tnum text-[24px] font-semibold text-ink">{money(totals.total)}</span>
            </div>
            <p className="mt-1 text-[11.5px] text-ink-35">Exclusive of 18% GST · added at checkout</p>
            <div className="mt-5"><Button to="/checkout" size="lg" full iconRight="arrowRight">Checkout</Button></div>
            <Link to="/shop" className="mt-3 block text-center text-[13px] font-bold text-forest transition hover:underline">Continue shopping</Link>
            <p className="mt-5 flex items-start gap-2 rounded-[14px] bg-[#f4f7f5] p-3 text-[11.5px] leading-relaxed text-ink-50">
              <Icon name="shieldCheck" size={14} className="mt-px shrink-0" />
              GST invoice generated on checkout. 7-day returns on unused fittings.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
