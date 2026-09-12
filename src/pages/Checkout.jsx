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
    <ol className="mt-7 grid gap-2" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="text-center">
            <span
              className={cx(
                'mx-auto grid h-10 w-10 place-items-center rounded-full text-[13px] font-bold transition',
                done || active ? 'bg-forest text-white shadow-btn' : 'bg-sunk text-ink-50',
                active && 'ring-4 ring-forest/15'
              )}
            >
              {done ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('mt-3 block h-1 rounded-full transition-colors', done || active ? 'bg-forest' : 'bg-sunk')} />
            <span className={cx('mt-2.5 block text-[11px] font-bold sm:text-[12.5px]', active ? 'text-ink' : 'text-ink-50')}>
              {label}
            </span>
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
        <div className="mx-auto max-w-md rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-card sm:p-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest text-white shadow-btn">
            <Icon name="lock" size={24} />
          </span>
          <h1 className="mt-5 text-[24px] font-semibold text-ink">Sign in to check out</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-50">
            You need an account to place an order — for your GST invoice, order tracking and returns.
            Your {totals.count} item{totals.count !== 1 && 's'} {totals.count === 1 ? 'is' : 'are'} saved.
          </p>
          <div className="mt-6 space-y-2.5">
            <Button to="/login?redirect=/checkout" size="lg" full iconRight="arrowRight">Sign in</Button>
            <Button to="/login/otp?redirect=/checkout" size="lg" full variant="outline">Create an account</Button>
          </div>
          <Link to="/cart" className="mt-4 inline-block text-[13px] font-bold text-forest transition hover:underline">
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
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <div className="rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-card backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-50">Nasou secure checkout</p>
            <h1 className="mt-2 text-[clamp(1.6rem,4vw,2rem)] font-semibold text-ink">Complete your order</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
            <Icon name="shieldCheck" size={14} /> GST invoice · secure checkout
          </span>
        </div>
        <Progress step={step} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-card sm:p-7">
            {/* Keyed div + CSS animation rather than a wait-mode presence
                transition: gating the next step on the previous one's exit
                can strand a shopper mid-checkout if that frame never runs.
                The step always mounts; the motion is decoration. */}
            <div key={step} className="animate-[stepIn_.26s_cubic-bezier(.22,1,.36,1)_both]">
                {step === 0 && (
                  <>
                    <h2 className="text-[20px] font-semibold text-ink">Where should this go?</h2>
                    <p className="mt-1 text-[14px] text-ink-50">Choose where this order should arrive.</p>
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
                    <h2 className="text-[20px] font-semibold text-ink">How fast do you need it?</h2>
                    <p className="mt-1 text-[14px] text-ink-50">Pick a delivery speed — fees update in the summary.</p>
                    <div className="mt-6 space-y-2.5">
                      {DELIVERY_OPTIONS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setDelivery(d.id)}
                          className={cx(
                            'flex w-full items-center gap-4 rounded-[18px] border p-4 text-left transition sm:p-5',
                            delivery === d.id
                              ? 'border-forest bg-white shadow-card'
                              : 'border-line-soft bg-white hover:border-forest/40'
                          )}
                        >
                          <span
                            className={cx(
                              'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                              delivery === d.id ? 'border-forest' : 'border-[#cad8d2]'
                            )}
                          >
                            {delivery === d.id && <span className="h-2.5 w-2.5 rounded-full bg-forest" />}
                          </span>
                          <span className="flex-1">
                            <span className="block text-[15px] font-bold text-ink">{d.name}</span>
                            <span className="block text-[12.5px] text-ink-50">{d.note}</span>
                          </span>
                          <span className="tnum text-[14px] font-bold">
                            {d.price === 0 ? <span className="text-emerald-700">FREE</span> : money(d.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="text-[20px] font-semibold text-ink">How would you like to pay?</h2>
                    <p className="mt-1 text-[14px] text-ink-50">Every method is covered by a GST invoice.</p>
                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {paymentMethods.map((m) => (
                        <button
                          key={m}
                          onClick={() => setPay(m)}
                          className={cx(
                            'flex items-center gap-3 rounded-[18px] border p-4 text-left transition sm:p-5',
                            pay === m ? 'border-forest bg-white shadow-card' : 'border-line-soft bg-white hover:border-forest/40'
                          )}
                        >
                          <span
                            className={cx(
                              'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                              pay === m ? 'border-forest' : 'border-[#cad8d2]'
                            )}
                          >
                            {pay === m && <span className="h-2.5 w-2.5 rounded-full bg-forest" />}
                          </span>
                          <span className="text-[15px] font-bold text-ink">{m}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-6 flex items-start gap-2 rounded-[16px] bg-[#f4f7f5] p-4 text-[12.5px] leading-relaxed text-ink-50">
                      <Icon name="lock" size={14} className="mt-px shrink-0 text-forest" />
                      This is a front-end prototype — no payment details are collected
                      or transmitted anywhere.
                    </p>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className="text-[20px] font-semibold text-ink">Check it over</h2>
                    <p className="mt-1 text-[14px] text-ink-50">Review the details before placing your order.</p>
                    <dl className="mt-6 space-y-3 text-[13.5px]">
                      <div className="flex justify-between gap-6 rounded-[16px] bg-[#f4f7f5] p-4">
                        <dt className="font-semibold text-ink-70">Deliver to</dt>
                        <dd className="text-right text-ink-50">
                          Aarav Reddy<br />4-2-118, Kavuri Hills, Madhapur<br />Hyderabad 500081
                        </dd>
                      </div>
                      <div className="flex justify-between gap-6 rounded-[16px] bg-[#f4f7f5] p-4">
                        <dt className="font-semibold text-ink-70">Delivery</dt>
                        <dd className="text-right text-ink-50">
                          {DELIVERY_OPTIONS.find((d) => d.id === delivery).name}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-6 rounded-[16px] bg-[#f4f7f5] p-4">
                        <dt className="font-semibold text-ink-70">Payment</dt>
                        <dd className="text-right text-ink-50">{pay}</dd>
                      </div>
                    </dl>
                  </>
                )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line-soft pt-6">
              <Button
                variant="outline"
                icon="chevronLeft"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button size="lg" iconRight="arrowRight" onClick={() => setStep((s) => s + 1)}>
                  <span className="sm:hidden">Continue</span><span className="hidden sm:inline">Continue securely</span>
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
          <div className="sticky top-[136px] rounded-[24px] border border-white/80 bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold text-ink">Order summary</h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                {totals.count} {totals.count === 1 ? 'item' : 'items'}
              </span>
            </div>

            <ul className="mt-4 space-y-3 border-b border-line-soft pb-4">
              {items.map((line) => (
                <li key={`${line.id}-${line.supplierId}`} className="flex gap-3">
                  <span className="photo-bed grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[12px]">
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
                <div className="flex items-center justify-between rounded-[12px] bg-emerald-50 px-3 py-2.5 text-[12.5px]">
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
                    className="h-11 min-w-0 flex-1 rounded-md border border-[#dfe7e3] bg-white px-3.5 text-[13px] font-semibold uppercase tracking-wide outline-none focus:border-forest focus:shadow-[0_0_0_2px_rgba(31,92,74,0.18)]"
                  />
                  <button onClick={applyCode} className="h-11 shrink-0 rounded-md bg-sunk px-4 text-[13px] font-bold text-forest transition hover:bg-emerald-100/60">Apply</button>
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-50">Items total</dt>
                <dd className="tnum font-semibold text-ink">{money(totals.subtotal)}</dd>
              </div>
              {couponAmount > 0 && (
                <div className="flex justify-between font-semibold text-emerald-700">
                  <dt>Coupon savings ({applied.code})</dt>
                  <dd className="tnum font-semibold">− {money(couponAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-50">Delivery charges</dt>
                <dd className="tnum font-semibold text-ink">
                  {shipFee === 0 ? <span className="text-emerald-700">FREE</span> : money(shipFee)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-50">GST (18%)</dt>
                <dd className="tnum font-semibold text-ink">{money(gst)}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-line-soft pt-5">
              <span className="text-[16px] font-bold text-ink">Final amount</span>
              <span className="tnum text-[26px] font-bold text-forest">{money(grand)}</span>
            </div>

            {totals.savings > 0 && (
              <div className="mt-4">
                <Badge tone="ok" icon="check">You saved {money(totals.savings)}</Badge>
              </div>
            )}
            <p className="mt-4 flex items-center gap-2 rounded-[16px] bg-[#f4f7f5] p-3.5 text-[12.5px] font-semibold text-ink-70">
              <Icon name="shieldCheck" size={16} className="shrink-0 text-forest" /> Verified pricing. No hidden charges.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
