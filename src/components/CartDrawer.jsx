import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import ProductArt from './ProductArt';
import { Button, Stepper } from './ui';
import { useCart } from '../context/CartContext';
import { money } from '../lib/format';

export default function CartDrawer() {
  const { items, totals, open, setOpen, setQty, remove } = useCart();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-ink/35 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 320 }}
            className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-[420px] flex-col bg-canvas shadow-pop sm:rounded-l-[24px]"
          >
            <header className="flex items-center justify-between border-b border-white/70 px-5 py-4 sm:rounded-tl-[24px]">
              <h2 className="flex items-center gap-2 text-[18px] font-semibold text-ink">
                Shopping cart
                <span className="tnum rounded-full bg-forest px-2 py-0.5 text-[12px] font-bold text-white">
                  {totals.count}
                </span>
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-forest shadow-sm transition hover:-translate-y-0.5"
                aria-label="Close cart"
              >
                <Icon name="close" size={18} />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-forest shadow-card">
                  <Icon name="cart" size={24} />
                </span>
                <div>
                  <p className="text-[18px] font-semibold text-ink">Nothing here yet</p>
                  <p className="mt-1 text-[13.5px] text-ink-50">
                    Everything you add keeps its trace record attached.
                  </p>
                </div>
                <Button to="/shop" onClick={() => setOpen(false)} variant="primary">
                  Start shopping
                </Button>
              </div>
            ) : (
              <>
                {totals.toFreeDelivery > 0 && (
                  <div className="mx-5 mt-4 rounded-[16px] bg-white px-4 py-3 shadow-sm">
                    <p className="text-[12.5px] font-medium text-ink-70">
                      Add <strong className="tnum text-ink">{money(totals.toFreeDelivery)}</strong> more for free delivery
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunk">
                      <div
                        className="h-full rounded-full bg-forest transition-all duration-500"
                        style={{ width: `${Math.min(100, (totals.subtotal / 999) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <ul className="space-y-3">
                    {items.map((line) => (
                      <li
                        key={`${line.id}-${line.supplierId}`}
                        className="flex gap-3 rounded-[18px] bg-white p-3 shadow-sm"
                      >
                        <Link to={`/product/${line.id}`} onClick={() => setOpen(false)} className="shrink-0">
                          <span className="photo-bed grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-[14px]">
                            <ProductArt kind={line.product.art} material={line.product.material} className="h-full w-full p-1.5" />
                          </span>
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/product/${line.id}`}
                              onClick={() => setOpen(false)}
                              className="text-[14px] font-semibold leading-snug text-ink hover:text-forest"
                            >
                              {line.product.name}
                            </Link>
                            <button
                              onClick={() => remove(line.index)}
                              className="shrink-0 text-ink-35 transition hover:text-clay"
                              aria-label="Remove item"
                            >
                              <Icon name="close" size={15} />
                            </button>
                          </div>
                          <p className="mt-0.5 truncate text-[11.5px] text-ink-50">
                            Sold by {line.supplier?.name} · {line.supplier?.eta}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <Stepper
                              size="sm"
                              value={line.qty}
                              onChange={(q) => setQty(line.index, q)}
                              min={0}
                            />
                            <span className="tnum text-[14px] font-bold">
                              {money(line.price * line.qty)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <footer className="m-3 rounded-[20px] bg-white px-5 py-4 shadow-card">
                  <dl className="mb-3 space-y-1.5 text-[13px]">
                    <div className="flex justify-between">
                      <dt className="text-ink-50">Subtotal</dt>
                      <dd className="tnum font-semibold">{money(totals.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-50">Delivery</dt>
                      <dd className="tnum font-semibold">
                        {totals.delivery === 0 ? (
                          <span className="text-emerald-600">Free</span>
                        ) : (
                          money(totals.delivery)
                        )}
                      </dd>
                    </div>
                    {totals.savings > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <dt>You save</dt>
                        <dd className="tnum font-semibold">{money(totals.savings)}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mb-4 flex items-baseline justify-between border-t border-line pt-3">
                    <span className="text-[14px] font-bold">Total</span>
                    <span className="tnum text-[22px] font-semibold text-ink">
                      {money(totals.total)}
                    </span>
                  </div>
                  <Button to="/checkout" onClick={() => setOpen(false)} full size="lg" iconRight="arrowRight">
                    Checkout
                  </Button>
                  <Link
                    to="/cart"
                    onClick={() => setOpen(false)}
                    className="mt-2.5 block text-center text-[13px] font-bold text-forest transition hover:underline"
                  >
                    View full cart
                  </Link>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
