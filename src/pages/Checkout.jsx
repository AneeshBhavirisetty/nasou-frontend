import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import { Badge, Button, Container, Breadcrumbs, Field } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAdminStore, couponDiscount } from '../context/AdminStore';
import { paymentMethods } from '../data/site';
import { cx, money } from '../lib/format';

const GST_RATE = 0.18;

const STEPS = ['Address', 'Delivery', 'Payment', 'Review'];

function Progress({ step }) {
  return (
    <ol className="mb-10 flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cx(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold transition',
                done && 'border-forest bg-forest text-white',
                active && 'border-forest bg-white text-forest',
                !done && !active && 'border-line bg-white text-ink-35'
              )}
            >
              {done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cx(
                'hidden text-[13px] font-semibold sm:block',
                active ? 'text-ink' : 'text-ink-35'
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={cx('h-px flex-1', done ? 'bg-forest' : 'bg-line')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

const DELIVERY_OPTIONS = [
  { id: 'standard', name: 'Standard', note: '3–5 days · free above ₹999', price: 0 },
  { id: 'express', name: 'Express', note: 'Next day by 7 PM', price: 99 },
  { id: 'sameday', name: 'Same day', note: 'Order before 2 PM, arrives by 9 PM', price: 179 },
];

export default function Checkout() {
  const { items, totals, clear } = useCart();
  const { coupons } = useAdminStore();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [delivery, setDelivery] = useState('standard');
  const [pay, setPay] = useState('UPI');
  const [placed, setPlaced] = useState(false);
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(null);
  const navigate = useNavigate();

  /* `placed` matters: clearing the cart re-renders this page, and without
     the flag the empty-cart guard below would bounce the shopper to /cart
     before the confirmation route ever loads. */
  if (items.length === 0 && !placed) return <Navigate to="/cart" replace />;

  /* Checkout requires an account — ask the shopper to sign in first. Their
     cart is held in memory, so it survives the round trip to /login and back. */
  if (!isAuthenticated) {
    return (
      <Container className="py-14 sm:py-20">
        <div className="mx-auto max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-card sm:p-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="lock" size={24} />
          </span>
          <h1 className="mt-5 display-serif text-[24px]">Sign in to check out</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-50">
            You need an account to place an order — for your GST invoice, order tracking and returns.
            Your {totals.count} item{totals.count !== 1 && 's'} {totals.count === 1 ? 'is' : 'are'} saved.
          </p>
          <div className="mt-6 space-y-2.5">
            <Button to="/login?redirect=/checkout" size="lg" full iconRight="arrowRight">Sign in</Button>
            <Button to="/login/otp?redirect=/checkout" size="lg" full variant="outline">Create an account</Button>
          </div>
          <Link to="/cart" className="mt-4 inline-block text-[13px] font-semibold text-ink-50 transition hover:text-ink">
            ← Back to cart
          </Link>
        </div>
      </Container>
    );
  }

  const cartCategories = [...new Set(items.map((i) => i.product.category))];
  const couponResult = applied
    ? couponDiscount(applied, { subtotal: totals.subtotal, categories: cartCategories })
    : null;
  const couponAmount = couponResult?.ok ? couponResult.amount : 0;

  const applyCode = () => {
    const c = coupons.find((x) => x.code === code.trim().toUpperCase());
    if (!c) return toast.error('That code isn’t valid.');
    const r = couponDiscount(c, { subtotal: totals.subtotal, categories: cartCategories });
    if (!r.ok) return toast.error(r.reason);
    setApplied(c);
    toast.success(`${c.code} applied — you save ${money(r.amount)}`);
  };

  const shipFee = DELIVERY_OPTIONS.find((d) => d.id === delivery).price || totals.delivery;
  const taxable = Math.max(0, totals.subtotal - couponAmount);
  const gst = Math.round(taxable * GST_RATE);
  const grand = taxable + shipFee + gst;

  const placeOrder = () => {
    setPlaced(true);
    navigate('/order-confirmed', {
      replace: true,
      state: { total: grand, count: totals.count, delivery, pay, coupon: applied?.code, couponAmount },
    });
    clear();
  };

  return (
    <Container className="py-10">
      <Breadcrumbs className="mb-5" items={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <h1 className="mb-8 display-serif text-[clamp(1.7rem,4vw,2.6rem)]">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div>
          <Progress step={step} />

          <div className="rounded-lg border border-line bg-white p-5 sm:p-7">
            {/* Keyed div + CSS animation rather than a wait-mode presence
                transition: gating the next step on the previous one's exit
                can strand a shopper mid-checkout if that frame never runs.
                The step always mounts; the motion is decoration. */}
            <div key={step} className="animate-[stepIn_.26s_cubic-bezier(.22,1,.36,1)_both]">
                {step === 0 && (
                  <>
                    <h2 className="text-[19px]">Where should this go?</h2>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" placeholder="Aarav Reddy" defaultValue={user?.fullName || 'Aarav Reddy'} />
                      <Field
                        label="Mobile number"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile"
                        defaultValue="9705807551"
                        onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); }}
                      />
                      <Field
                        label="Address"
                        className="sm:col-span-2"
                        placeholder="Flat, building, street"
                        defaultValue="4-2-118, Kavuri Hills, Madhapur"
                      />
                      <Field label="City" defaultValue="Hyderabad" />
                      <Field
                        label="PIN code"
                        inputMode="numeric"
                        maxLength={6}
                        defaultValue="500081"
                        onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); }}
                      />
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h2 className="text-[19px]">How fast do you need it?</h2>
                    <div className="mt-6 space-y-2.5">
                      {DELIVERY_OPTIONS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setDelivery(d.id)}
                          className={cx(
                            'flex w-full items-center gap-3 rounded-md border p-4 text-left transition',
                            delivery === d.id
                              ? 'border-forest bg-emerald-50/60 ring-1 ring-forest'
                              : 'border-line hover:border-ink-35'
                          )}
                        >
                          <span
                            className={cx(
                              'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2',
                              delivery === d.id ? 'border-forest' : 'border-line'
                            )}
                          >
                            {delivery === d.id && <span className="h-2 w-2 rounded-full bg-forest" />}
                          </span>
                          <span className="flex-1">
                            <span className="block text-[14px] font-bold">{d.name}</span>
                            <span className="block text-[12.5px] text-ink-50">{d.note}</span>
                          </span>
                          <span className="tnum text-[14px] font-bold">
                            {d.price === 0 ? <span className="text-emerald-600">Free</span> : money(d.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="text-[19px]">How would you like to pay?</h2>
                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {paymentMethods.map((m) => (
                        <button
                          key={m}
                          onClick={() => setPay(m)}
                          className={cx(
                            'flex items-center gap-3 rounded-md border p-4 text-left transition',
                            pay === m ? 'border-forest bg-emerald-50/60 ring-1 ring-forest' : 'border-line hover:border-ink-35'
                          )}
                        >
                          <span
                            className={cx(
                              'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2',
                              pay === m ? 'border-forest' : 'border-line'
                            )}
                          >
                            {pay === m && <span className="h-2 w-2 rounded-full bg-forest" />}
                          </span>
                          <span className="text-[14px] font-semibold">{m}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-6 flex items-start gap-2 rounded-md bg-canvas p-4 text-[12.5px] leading-relaxed text-ink-50">
                      <Icon name="lock" size={14} className="mt-px shrink-0 text-emerald-600" />
                      This is a front-end prototype — no payment details are collected
                      or transmitted anywhere.
                    </p>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className="text-[19px]">Check it over</h2>
                    <dl className="mt-6 space-y-4 text-[13.5px]">
                      <div className="flex justify-between gap-6 border-b border-line pb-4">
                        <dt className="font-semibold text-ink-70">Deliver to</dt>
                        <dd className="text-right text-ink-50">
                          Aarav Reddy<br />4-2-118, Kavuri Hills, Madhapur<br />Hyderabad 500081
                        </dd>
                      </div>
                      <div className="flex justify-between gap-6 border-b border-line pb-4">
                        <dt className="font-semibold text-ink-70">Delivery</dt>
                        <dd className="text-right text-ink-50">
                          {DELIVERY_OPTIONS.find((d) => d.id === delivery).name}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-6">
                        <dt className="font-semibold text-ink-70">Payment</dt>
                        <dd className="text-right text-ink-50">{pay}</dd>
                      </div>
                    </dl>
                  </>
                )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
              <Button
                variant="ghost"
                icon="chevronLeft"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button size="lg" iconRight="arrowRight" onClick={() => setStep((s) => s + 1)}>
                  Continue
                </Button>
              ) : (
                <Button size="lg" variant="accent" icon="lock" onClick={placeOrder}>
                  Place order · {money(grand)}
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside>
          <div className="sticky top-[120px] rounded-lg border border-line bg-white p-5 sm:p-6">
            <h2 className="text-[16px] font-bold">
              {totals.count} {totals.count === 1 ? 'item' : 'items'}
            </h2>

            <ul className="mt-4 space-y-3 border-b border-line pb-4">
              {items.map((line) => (
                <li key={`${line.id}-${line.supplierId}`} className="flex gap-3">
                  <span className="photo-bed grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md">
                    <ProductArt kind={line.product.art} material={line.product.material} className="h-full w-full p-1" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{line.product.name}</p>
                    <p className="tnum text-[12px] text-ink-50">Qty {line.qty} · {line.supplier?.name}</p>
                  </div>
                  <span className="tnum text-[13px] font-bold">{money(line.price * line.qty)}</span>
                </li>
              ))}
            </ul>

            {/* discount code */}
            <div className="mt-4">
              {applied && couponAmount > 0 ? (
                <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12.5px]">
                  <span className="font-semibold text-emerald-700">
                    <Icon name="tag" size={12} className="mr-1 inline" />{applied.code} applied
                  </span>
                  <button onClick={() => { setApplied(null); setCode(''); }} className="font-semibold text-ink-50 hover:text-ink">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                    placeholder="Discount code"
                    className="h-10 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-[13px] font-semibold uppercase tracking-wide outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15"
                  />
                  <Button size="sm" variant="outline" onClick={applyCode} className="shrink-0">Apply</Button>
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-2.5 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-ink-50">Subtotal</dt>
                <dd className="tnum font-semibold">{money(totals.subtotal)}</dd>
              </div>
              {couponAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount ({applied.code})</dt>
                  <dd className="tnum font-semibold">− {money(couponAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-50">Delivery</dt>
                <dd className="tnum font-semibold">
                  {shipFee === 0 ? <span className="text-emerald-600">Free</span> : money(shipFee)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-50">GST (18%)</dt>
                <dd className="tnum font-semibold">{money(gst)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[15px] font-bold">Total</span>
              <span className="tnum text-[24px] font-extrabold">{money(grand)}</span>
            </div>

            {totals.savings > 0 && (
              <div className="mt-4">
                <Badge tone="ok" icon="check">You saved {money(totals.savings)}</Badge>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Container>
  );
}
