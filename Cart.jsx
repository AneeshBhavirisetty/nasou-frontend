import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { Badge, Button, Container, Photo, Stepper } from '../components/ui';
import { useCart } from '../context/CartContext';
import { batchId } from '../data/catalog';
import { money } from '../lib/format';

export default function Cart() {
  const { items, totals, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <Container className="py-24">
        <div className="mx-auto max-w-md rounded-xl border border-line bg-white p-12 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sunk text-ink-35">
            <Icon name="cart" size={28} />
          </span>
          <h1 className="mt-6 text-[24px]">Your cart is empty</h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-ink-50">
            Browse the catalogue — every listing shows its origin before you commit.
          </p>
          <div className="mt-7">
            <Button to="/shop" size="lg" iconRight="arrowRight">Start shopping</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <nav className="mb-6 flex items-center gap-1.5 text-[12.5px] text-ink-50">
        <Link to="/" className="transition hover:text-ink">Home</Link>
        <Icon name="chevronRight" size={13} className="text-ink-35" />
        <span className="font-semibold text-ink">Cart</span>
      </nav>

      <h1 className="text-[clamp(1.9rem,3.5vw,2.6rem)]">Your cart</h1>
      <p className="mt-2.5 text-[14px] text-ink-50">
        <span className="tnum font-semibold text-ink">{totals.count}</span> items from{' '}
        <span className="tnum font-semibold text-ink">
          {new Set(items.map((i) => i.supplierId)).size}
        </span>{' '}
        suppliers
      </p>

      <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {items.map((line) => (
            <li
              key={`${line.id}-${line.supplierId}`}
              className="flex flex-col gap-4 rounded-lg border border-line bg-white p-5 sm:flex-row"
            >
              <Link to={`/product/${line.id}`} className="shrink-0">
                <Photo
                  src={line.product.photo}
                  alt={line.product.name}
                  ratio="aspect-square"
                  className="w-full rounded-md sm:w-[130px]"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/product/${line.id}`}
                      className="text-[16px] font-bold leading-snug transition hover:text-emerald-600"
                    >
                      {line.product.name}
                    </Link>
                    <p className="mt-1 text-[12.5px] text-ink-50">
                      {line.product.maker} · {line.product.origin}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(line.index)}
                    className="shrink-0 text-ink-35 transition hover:text-clay"
                    aria-label="Remove"
                  >
                    <Icon name="close" size={17} />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="slate" icon="truck">{line.supplier.name} · {line.supplier.eta}</Badge>
                  <Badge tone="neutral">
                    <span className="font-mono">{batchId(line.product)}</span>
                  </Badge>
                  <Badge tone="ok" icon="leaf">Eco {line.product.ecoScore}</Badge>
                </div>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
                  <Stepper value={line.qty} onChange={(q) => setQty(line.index, q)} min={0} />
                  <div className="text-right">
                    <p className="tnum font-display text-[19px] font-extrabold">
                      {money(line.price * line.qty)}
                    </p>
                    {line.qty > 1 && (
                      <p className="tnum text-[12px] text-ink-35">{money(line.price)} each</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside>
          <div className="sticky top-[126px] rounded-lg border border-line bg-white p-6">
            <h2 className="text-[17px]">Order summary</h2>

            <dl className="mt-5 space-y-2.5 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-ink-50">Subtotal</dt>
                <dd className="tnum font-semibold">{money(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-50">Delivery</dt>
                <dd className="tnum font-semibold">
                  {totals.delivery === 0 ? <span className="text-emerald-600">Free</span> : money(totals.delivery)}
                </dd>
              </div>
              {totals.savings > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Offer savings</dt>
                  <dd className="tnum font-semibold">− {money(totals.savings)}</dd>
                </div>
              )}
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[15px] font-bold">Total</span>
              <span className="tnum font-display text-[26px] font-extrabold">{money(totals.total)}</span>
            </div>

            <div className="mt-6">
              <Button to="/checkout" size="lg" full iconRight="arrowRight">Proceed to checkout</Button>
            </div>

            <Link
              to="/shop"
              className="mt-3 block text-center text-[13px] font-semibold text-ink-50 transition hover:text-ink"
            >
              Continue shopping
            </Link>

            <p className="mt-6 flex items-start gap-2 border-t border-line pt-5 text-[12px] leading-relaxed text-ink-35">
              <Icon name="shield" size={14} className="mt-px shrink-0" />
              Each line keeps its batch id through checkout, so a return can be traced
              back to the exact lot.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
