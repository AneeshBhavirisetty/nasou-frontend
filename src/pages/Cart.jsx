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
      <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-emerald-600">
        <Icon name="check" size={14} strokeWidth={3} /> You&rsquo;ve unlocked free delivery.
      </p>
    );
  }
  return (
    <div className="rounded-md border border-line bg-white p-3.5">
      <p className="text-[12.5px] text-ink-70">
        Add <span className="tnum font-bold text-ink">{money(toFree)}</span> more for free delivery.
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk">
        <motion.div className="h-full rounded-full bg-emerald" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: EASE }} />
      </div>
    </div>
  );
}

export default function Cart() {
  const { items, totals, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-md rounded-xl border border-line bg-white p-10 text-center sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="cart" size={28} /></span>
          <h1 className="mt-6 display-serif text-[24px]">Your cart is empty</h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-ink-50">1,400+ fittings with real prices are one search away.</p>
          <div className="mt-7"><Button to="/shop" size="lg" iconRight="arrowRight">Start shopping</Button></div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs className="mb-5" items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1 className="display-serif text-[clamp(1.7rem,4vw,2.6rem)]">Your cart</h1>
      <p className="mt-2 text-[13.5px] text-ink-50">
        <span className="tnum font-semibold text-ink">{totals.count}</span> item{totals.count !== 1 && 's'}
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
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
                  className="flex gap-3 rounded-lg border border-line bg-white p-3.5 sm:gap-4 sm:p-4"
                >
                  <Link to={`/product/${line.id}`} className="shrink-0">
                    <span className="photo-bed grid h-24 w-24 place-items-center overflow-hidden rounded-md sm:h-28 sm:w-28">
                      <ProductArt kind={line.product.art} material={line.product.material} className="h-full w-full p-2" />
                    </span>
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/product/${line.id}`} className="text-[14px] font-bold leading-snug transition hover:text-emerald-600 sm:text-[15px]">
                          {line.product.name}
                        </Link>
                        <p className="mt-0.5 text-[12px] text-ink-50">{line.product.sku} · {line.product.size || 'standard'}</p>
                      </div>
                      <button onClick={() => remove(line.index)} className="shrink-0 text-ink-35 transition hover:text-clay" aria-label="Remove item">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="slate" icon="truck">{line.supplier?.name} · {line.supplier?.eta}</Badge>
                    </div>

                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                      <Stepper value={line.qty} onChange={(q) => setQty(line.index, q)} min={0} size="sm" />
                      <div className="text-right">
                        <p className="tnum text-[16px] font-extrabold sm:text-[18px]">{money(line.price * line.qty)}</p>
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
          <div className="sticky top-[120px] rounded-lg border border-line bg-white p-5 sm:p-6">
            <h2 className="text-[16px] font-bold">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-[13.5px]">
              <div className="flex justify-between"><dt className="text-ink-50">Subtotal</dt><dd className="tnum font-semibold">{money(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-50">Delivery</dt><dd className="tnum font-semibold">{totals.delivery === 0 ? <span className="text-emerald-600">Free</span> : money(totals.delivery)}</dd></div>
              {totals.savings > 0 && <div className="flex justify-between text-emerald-600"><dt>You save</dt><dd className="tnum font-semibold">− {money(totals.savings)}</dd></div>}
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[15px] font-bold">Total</span>
              <span className="tnum text-[24px] font-extrabold">{money(totals.total)}</span>
            </div>
            <p className="mt-1 text-[11.5px] text-ink-35">Exclusive of 18% GST · added at checkout</p>
            <div className="mt-5"><Button to="/checkout" size="lg" full iconRight="arrowRight">Checkout</Button></div>
            <Link to="/shop" className="mt-3 block text-center text-[13px] font-semibold text-ink-50 transition hover:text-ink">Continue shopping</Link>
            <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-[11.5px] leading-relaxed text-ink-35">
              <Icon name="shieldCheck" size={14} className="mt-px shrink-0" />
              GST invoice generated on checkout. 7-day returns on unused fittings.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
