import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import AddressForm, { addressProblem, blankAddress } from '../components/AddressForm';
import { Badge, Button, Container, Breadcrumbs } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAdminStore, couponDiscount, productById } from '../context/AdminStore';
import { placeOrder as saveOrder } from '../store/orders';
import { notify } from '../store/notifications';
import { shippingFor, taxRateFor } from '../store/settings';
import { checkoutApi, IS_MOCK } from '../lib/api';
import { addressBook, formatAddress } from '../lib/geo';
import { allocate } from '../lib/marketplace';
import { isListed } from '../data/catalog';
import { paymentMethods } from '../data/site';
import { cx, money } from '../lib/format';

/* Checkout (requirements 8, 9, 15; customer review items 3 and admin 2–3).
   One payment, one order — split into a part per seller. Delivery fees come
   from the shipping rules per seller, GST from the tax rules per product
   and delivery state, category codes apply themselves, and placing the
   order takes the stock out (through the API when one is configured). */

const STEPS = ['Address', 'Delivery', 'Payment', 'Review'];

function Progress({ step }) {
  return (
    <ol className="mt-7 grid gap-2" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="text-center">
            <span className={cx('mx-auto grid h-10 w-10 place-items-center rounded-full text-[13px] font-bold transition', done || active ? 'bg-forest text-white shadow-btn' : 'bg-sunk text-ink-50', active && 'ring-4 ring-forest/15')}>
              {done ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('mt-3 block h-1 rounded-full transition-colors', done || active ? 'bg-forest' : 'bg-sunk')} />
            <span className={cx('mt-2.5 block text-[11px] font-bold sm:text-[12.5px]', active ? 'text-ink' : 'text-ink-50')}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const PAY_NOTE = {
  UPI: 'Any UPI app — instant confirmation',
  Cards: 'Credit or debit card',
  'Net banking': 'All major Indian banks',
  'Cash on delivery': 'Pay each seller’s part when it arrives',
  'GST invoice': 'Trade accounts — pay against the invoice',
};
const SPEED = [
  { id: 'standard', name: 'Standard', note: '3–5 days · per-seller fee, free above each seller’s threshold', extra: 0 },
  { id: 'express', name: 'Express', note: 'Next day by 7 PM', extra: 99 },
  { id: 'sameday', name: 'Same day', note: 'Order before 2 PM, arrives by 9 PM', extra: 179 },
];
const ONLINE = (p) => p !== 'Cash on delivery' && p !== 'GST invoice';

export default function Checkout() {
  const { items, groups, totals, clear } = useCart();
  const { coupons } = useAdminStore();
  const { isAuthenticated, user, profile, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [speed, setSpeed] = useState('standard');
  const [pay, setPay] = useState('UPI');
  const [placed, setPlaced] = useState(false);
  const [paying, setPaying] = useState(false);
  const [code, setCode] = useState('');
  const [manual, setManual] = useState(null);
  const [removedAuto, setRemovedAuto] = useState(false);

  const book = addressBook(profile);
  const [addrId, setAddrId] = useState(() => (book.find((a) => a.isDefault) || book[0])?.id || 'new');
  const [draft, setDraft] = useState(() => ({ ...blankAddress, name: user?.fullName || '', phone: profile?.phone || user?.phone || '' }));
  const [saveNew, setSaveNew] = useState(true);
  const [addrErr, setAddrErr] = useState('');
  useEffect(() => { if (addrId !== 'new' && !book.some((a) => a.id === addrId)) setAddrId(book[0]?.id || 'new'); }, [book, addrId]);
  const addr = addrId === 'new' ? draft : book.find((a) => a.id === addrId) || draft;

  /* ── money ──────────────────────────────────────────────────────────── */
  const calc = useMemo(() => {
    const cats = new Set();
    for (const it of items) { cats.add(it.product.category); cats.add(`dept:${it.product.department || 'plumbing'}`); }
    const lineNet = (it) => it.price * it.qty - (it.bulk?.amount || 0);
    const inScope = (it, scope) => !scope || (scope.startsWith('dept:') ? `dept:${it.product.department || 'plumbing'}` === scope : it.product.category === scope);
    const eligibleSubtotal = (scope) => items.filter((it) => inScope(it, scope)).reduce((s, it) => s + lineNet(it), 0);
    const ctx = { subtotal: totals.net, categories: [...cats], eligibleSubtotal };

    /* a typed code wins; otherwise the best auto-apply code the cart qualifies for */
    let coupon = manual;
    let auto = false;
    if (!coupon && !removedAuto) {
      const best = coupons.filter((c) => c.autoApply && c.scope).map((c) => ({ c, r: couponDiscount(c, ctx) })).filter((x) => x.r.ok).sort((a, b) => b.r.amount - a.r.amount)[0];
      if (best) { coupon = best.c; auto = true; }
    }
    const result = coupon ? couponDiscount(coupon, ctx) : null;
    const couponAmount = result?.ok ? result.amount : 0;

    /* share the coupon over the sellers whose items it covers */
    const discountByRetailer = {};
    if (couponAmount) {
      const elig = groups.map((g) => g.items.filter((it) => inScope(it, coupon.scope)).reduce((s, it) => s + lineNet(it), 0));
      allocate(couponAmount, elig).forEach((v, i) => { discountByRetailer[groups[i].retailerId] = v; });
    }

    const speedExtra = SPEED.find((s) => s.id === speed).extra;
    const parts = groups.map((g, i) => {
      const net = g.items.reduce((s, it) => s + lineNet(it), 0);
      const disc = discountByRetailer[g.retailerId] || 0;
      const ship = shippingFor({ retailerId: g.retailerId, state: addr.state, value: net - disc }) + (i === 0 ? speedExtra : 0);
      /* GST on each line's value after its share of the discount */
      const gst = g.items.reduce((s, it) => {
        const share = net ? (lineNet(it) / net) * disc : 0;
        return s + Math.round(((lineNet(it) - share) * taxRateFor(it.product, addr.state)) / 100);
      }, 0);
      return { ...g, net, disc, ship, gst, total: net - disc + ship + gst };
    });
    return {
      coupon, auto, result, couponAmount, discountByRetailer, parts,
      shipping: parts.reduce((s, p) => s + p.ship, 0),
      gst: parts.reduce((s, p) => s + p.gst, 0),
      grand: parts.reduce((s, p) => s + p.total, 0),
    };
  }, [items, groups, totals.net, coupons, manual, removedAuto, speed, addr.state]);

  useEffect(() => {
    if (manual && calc.result && !calc.result.ok) { toast.error(calc.result.reason); setManual(null); }
    else if (manual && calc.result?.ok) toast.success(`${manual.code} applied — you save ${money(calc.couponAmount)}`);
  }, [manual]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0 && !placed) return <Navigate to="/cart" replace />;

  if (!isAuthenticated) {
    return (
      <Container className="py-14 sm:py-20">
        <div className="mx-auto max-w-md rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-card sm:p-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest text-white shadow-btn"><Icon name="lock" size={24} /></span>
          <h1 className="mt-5 text-[24px] font-semibold text-forest">Sign in to check out</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-50">You need an account for your GST invoice, order tracking and returns. Your {totals.count} item{totals.count !== 1 && 's'} {totals.count === 1 ? 'is' : 'are'} saved.</p>
          <div className="mt-6 space-y-2.5">
            <Button to="/login?redirect=/checkout" size="lg" full iconRight="arrowRight">Sign in</Button>
            <Button to="/login/otp?redirect=/checkout" size="lg" full variant="outline">Create an account</Button>
          </div>
          <Link to="/cart" className="mt-4 inline-block text-[13px] font-bold text-forest hover:underline">← Back to cart</Link>
        </div>
      </Container>
    );
  }
  if (user.role !== 'CUSTOMER') {
    return (
      <Container className="py-16"><div className="mx-auto max-w-md rounded-[24px] bg-white p-8 text-center shadow-card"><Icon name="user" size={26} className="mx-auto text-forest" /><h1 className="mt-3 text-[22px] font-semibold">Use a customer account to buy</h1><p className="mt-2 text-[14px] text-ink-50">You are signed in as a team or retailer account. Sign in as a customer to place orders.</p></div></Container>
    );
  }

  const applyCode = () => {
    const c = coupons.find((x) => x.code === code.trim().toUpperCase());
    if (!c) return toast.error('That code isn’t valid.');
    setManual(c);
    setRemovedAuto(false);
  };

  const next = () => {
    if (step === 0) {
      const problem = addressProblem(addr);
      setAddrErr(problem);
      if (problem) return;
      if (addrId === 'new' && saveNew) {
        const entry = { ...draft, id: `ad_${Date.now().toString(36)}`, isDefault: book.length === 0 };
        updateProfile({ addresses: [...book, entry] }).then(() => setAddrId(entry.id));
        notify({ userId: user.id, icon: 'pin', kind: 'account', title: `${entry.label} address saved`, body: formatAddress(entry), to: '/account#addresses' });
      }
    }
    setStep((s) => s + 1);
  };

  const placeOrder = async () => {
    const blocked = groups.find((g) => !g.listed);
    if (blocked) return toast.error(`${blocked.name} is not taking orders right now — remove their items from your cart.`);
    const short = items.find((l) => { const live = productById(l.id); return live && l.qty > live.stock; });
    if (short) return toast.error(`Only ${productById(short.id).stock} left of ${short.product.name} — update the quantity in your cart.`);
    if (items.some((l) => !isListed(l.product))) return toast.error('An item in your cart is no longer for sale.');

    setPaying(true);
    try {
      if (!IS_MOCK) {
        /* the API re-prices, checks stock and decrements it in one transaction */
        await checkoutApi.create({
          items: items.map((l) => ({ sku: l.product.sku, qty: l.qty })),
          coupon: calc.coupon?.code || null,
          delivery: speed,
          payment: pay,
          address: { name: addr.name, phone: addr.phone, address: [addr.line1, addr.landmark].filter(Boolean).join(', '), city: addr.city, pin: addr.pin },
        }, crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`);
      } else if (ONLINE(pay)) {
        await new Promise((r) => setTimeout(r, 1100)); // Razorpay checkout stand-in
      }

      const order = saveOrder({
        userId: user.id,
        customer: addr.name.trim(),
        email: user.email || '',
        phone: addr.phone,
        address: [addr.line1, addr.landmark].filter(Boolean).join(', '),
        city: addr.city.trim(),
        state: addr.state,
        pin: addr.pin,
        geo: addr.lat ? { lat: addr.lat, lng: addr.lng } : null,
        lines: items.map((l) => ({
          id: l.id, sku: l.product.sku, name: l.product.name, size: l.product.size, qty: l.qty, price: l.price,
          amount: l.price * l.qty - (l.bulk?.amount || 0),
          bulk: l.bulk ? { name: l.bulk.rule.name, amount: l.bulk.amount } : null,
          retailerId: l.retailerId, category: l.product.category,
        })),
        items: totals.count,
        subtotal: totals.subtotal,
        discount: totals.bulk + calc.couponAmount,
        couponDiscount: calc.couponAmount,
        discountByRetailer: calc.discountByRetailer,
        gst: calc.gst,
        gstByRetailer: Object.fromEntries(calc.parts.map((p) => [p.retailerId, p.gst])),
        shipping: calc.shipping,
        shippingByRetailer: Object.fromEntries(calc.parts.map((p) => [p.retailerId, p.ship])),
        payment: pay,
        paymentStatus: pay === 'Cash on delivery' ? 'Due on delivery' : pay === 'GST invoice' ? 'Invoice due' : 'Paid',
        delivery: SPEED.find((d) => d.id === speed).name,
        coupon: calc.coupon?.code || null,
      });
      setPlaced(true);
      navigate('/order-confirmed', { replace: true, state: { id: order.id, total: order.total, count: totals.count, delivery: speed, pay, coupon: calc.coupon?.code, couponAmount: calc.couponAmount, parts: order.parts.length } });
      clear();
    } catch (x) {
      toast.error(x.message || 'We could not place the order. Nothing was charged.');
    } finally {
      setPaying(false);
    }
  };

  const Radio = ({ on }) => (
    <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-forest' : 'border-[#cad8d2]')}>{on && <span className="h-2.5 w-2.5 rounded-full bg-forest" />}</span>
  );

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <div className="rounded-[20px] bg-white/70 p-4 shadow-card backdrop-blur sm:rounded-[24px] sm:border sm:border-white/80 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-50">Nivora secure checkout</p>
            <h1 className="font-hero mt-2 text-[clamp(1.6rem,4vw,2.1rem)] font-semibold text-forest">Complete your order</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700"><Icon name="shieldCheck" size={14} /> {groups.length} seller{groups.length > 1 ? 's' : ''} · one payment</span>
        </div>
        <Progress step={step} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_400px]">
        <div className="rounded-[20px] bg-white p-4 shadow-card sm:rounded-[24px] sm:border sm:border-white/80 sm:p-7">
          <div key={step} className="animate-[stepIn_.26s_cubic-bezier(.22,1,.36,1)_both]">
            {step === 0 && (
              <>
                <h2 className="text-[20px] font-semibold text-forest">Where should this go?</h2>
                <p className="mt-1 text-[14px] text-ink-50">Pick a saved address, or add one — “Use my current location” fills most of it.</p>
                {book.length > 0 && (
                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {book.map((a) => (
                      <button key={a.id} type="button" onClick={() => setAddrId(a.id)} className={cx('flex items-start gap-3 rounded-[18px] border p-4 text-left transition', addrId === a.id ? 'border-forest bg-emerald-50/40 shadow-card' : 'border-line-soft bg-white hover:border-forest/40')}>
                        <Radio on={addrId === a.id} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[14px] font-bold text-ink">{a.label}{a.isDefault && <span className="rounded-full bg-sunk px-1.5 text-[10.5px] text-forest">Default</span>}</span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-50">{a.name} · +91 {a.phone}<br />{formatAddress(a)}</span>
                        </span>
                      </button>
                    ))}
                    <button type="button" onClick={() => setAddrId('new')} className={cx('flex items-center gap-3 rounded-[18px] border border-dashed p-4 text-left transition', addrId === 'new' ? 'border-forest bg-emerald-50/40' : 'border-line hover:border-forest/40')}>
                      <Radio on={addrId === 'new'} /><span className="text-[14px] font-bold text-forest">+ Add a new address</span>
                    </button>
                  </div>
                )}
                {addrId === 'new' && (
                  <div className="mt-5">
                    <AddressForm value={draft} onChange={setDraft} />
                    <label className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-ink-70"><input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="accent-[#1f5c4a]" /> Save to my address book</label>
                  </div>
                )}
                {addrErr && <p role="alert" className="mt-4 rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{addrErr}</p>}
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-[20px] font-semibold text-forest">How fast do you need it?</h2>
                <p className="mt-1 text-[14px] text-ink-50">Each seller ships their own part. Fees follow each seller’s delivery rules for {addr.state}.</p>
                <div className="mt-6 space-y-2.5">
                  {SPEED.map((d) => (
                    <button key={d.id} onClick={() => setSpeed(d.id)} className={cx('flex w-full items-center gap-4 rounded-[18px] border p-4 text-left transition sm:p-5', speed === d.id ? 'border-forest bg-white shadow-card' : 'border-line-soft bg-white hover:border-forest/40')}>
                      <Radio on={speed === d.id} />
                      <span className="flex-1"><span className="block text-[15px] font-bold text-ink">{d.name}</span><span className="block text-[12.5px] text-ink-50">{d.note}</span></span>
                      <span className="tnum text-[14px] font-bold">{d.extra ? `+ ${money(d.extra)}` : 'Per seller'}</span>
                    </button>
                  ))}
                </div>
                <ul className="mt-5 divide-y divide-line-soft rounded-[18px] bg-[#f6f3ed] px-4 text-[13px]">
                  {calc.parts.map((p) => <li key={p.retailerId} className="flex justify-between gap-3 py-2.5"><span className="flex items-center gap-1.5 font-semibold text-ink"><Icon name="store" size={14} className="text-forest" /> {p.name}</span><span className="tnum font-bold">{p.ship ? money(p.ship) : <span className="text-emerald-700">FREE</span>}</span></li>)}
                </ul>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-[20px] font-semibold text-forest">How would you like to pay?</h2>
                <p className="mt-1 text-[14px] text-ink-50">Pay once — Razorpay splits it between the sellers and Nivora.</p>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {paymentMethods.filter((m) => m !== 'GST invoice').map((m) => (
                    <button key={m} onClick={() => setPay(m)} className={cx('flex items-center gap-3 rounded-[18px] border p-4 text-left transition sm:p-5', pay === m ? 'border-forest bg-white shadow-card' : 'border-line-soft bg-white hover:border-forest/40')}>
                      <Radio on={pay === m} />
                      <span className="min-w-0"><span className="block text-[15px] font-bold text-ink">{m}</span><span className="block text-[12px] text-ink-50">{PAY_NOTE[m]}</span></span>
                    </button>
                  ))}
                </div>
                <p className="mt-6 flex items-start gap-2 rounded-[16px] bg-[#f6f3ed] p-4 text-[12.5px] leading-relaxed text-ink-50">
                  <Icon name="lock" size={14} className="mt-px shrink-0 text-forest" />
                  {IS_MOCK ? 'Demo checkout — Razorpay is simulated and no card or UPI details are collected.' : 'You will finish payment in Razorpay’s secure window.'}
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-[20px] font-semibold text-forest">Check it over</h2>
                <p className="mt-1 text-[14px] text-ink-50">Your order ships in {calc.parts.length} part{calc.parts.length > 1 ? 's' : ''} — one per seller, each tracked on its own.</p>
                <div className="mt-6 space-y-3">
                  {calc.parts.map((p, i) => (
                    <div key={p.retailerId} className="rounded-[18px] border border-line-soft p-4">
                      <p className="flex items-center justify-between gap-2 text-[14px] font-bold text-ink"><span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-forest text-[11px] text-white">{i + 1}</span> {p.name}</span><span className="tnum">{money(p.total)}</span></p>
                      <p className="mt-1 text-[12.5px] text-ink-50">{p.items.map((it) => `${it.product.name} × ${it.qty}`).join(' · ')}</p>
                    </div>
                  ))}
                </div>
                <dl className="mt-4 space-y-2 text-[13.5px]">
                  <div className="flex justify-between gap-6 rounded-[16px] bg-[#f6f3ed] p-4"><dt className="font-semibold text-ink-70">Deliver to</dt><dd className="text-right text-ink-50">{addr.name} · +91 {addr.phone}<br />{formatAddress(addr)}</dd></div>
                  <div className="flex justify-between gap-6 rounded-[16px] bg-[#f6f3ed] p-4"><dt className="font-semibold text-ink-70">Delivery · Payment</dt><dd className="text-right text-ink-50">{SPEED.find((d) => d.id === speed).name} · {pay}{pay === 'Cash on delivery' && <><br /><span className="font-semibold text-forest">Pay each part as it arrives</span></>}</dd></div>
                </dl>
              </>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line-soft pt-6">
            <Button variant="outline" icon="chevronLeft" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
            {step < STEPS.length - 1 ? (
              <Button size="lg" iconRight="arrowRight" onClick={next}><span className="sm:hidden">Continue</span><span className="hidden sm:inline">Continue securely</span></Button>
            ) : (
              <Button size="lg" icon="lock" loading={paying} onClick={placeOrder}>
                {paying ? (ONLINE(pay) ? 'Paying with Razorpay…' : 'Placing order…') : pay === 'Cash on delivery' ? 'Place order · pay on delivery' : `Pay ${money(calc.grand)}`}
              </Button>
            )}
          </div>
        </div>

        <aside>
          <div className="sticky top-[136px] rounded-[20px] bg-white p-4 shadow-card sm:rounded-[24px] sm:border sm:border-white/80 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold text-forest">Order summary</h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-emerald-700">{totals.count} {totals.count === 1 ? 'item' : 'items'}</span>
            </div>

            <div className="mt-4 max-h-[300px] space-y-4 overflow-y-auto border-b border-line-soft pb-4 thin-bar">
              {calc.parts.map((g) => (
                <div key={g.retailerId}>
                  <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-forest-800"><Icon name="store" size={12} /> {g.name}</p>
                  <ul className="space-y-2.5">
                    {g.items.map((line) => (
                      <li key={`${line.id}-${line.supplierId}`} className="flex gap-3">
                        <span className="photo-bed grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[12px]"><ProductArt kind={line.product.art} material={line.product.material} className="h-full w-full p-1" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold">{line.product.name}</p>
                          <p className="tnum text-[12px] text-ink-50">Qty {line.qty}{line.bulk ? ` · bulk − ${money(line.bulk.amount)}` : ''}</p>
                        </div>
                        <span className="tnum text-[13px] font-bold">{money(line.price * line.qty - (line.bulk?.amount || 0))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-4">
              {calc.coupon && calc.couponAmount > 0 ? (
                <div className="flex items-center justify-between rounded-[12px] bg-emerald-50 px-3 py-2.5 text-[12.5px]">
                  <span className="font-semibold text-emerald-700"><Icon name="tag" size={12} className="mr-1 inline" />{calc.coupon.code} {calc.auto ? 'auto-applied' : 'applied'}</span>
                  <button onClick={() => { if (calc.auto) setRemovedAuto(true); setManual(null); setCode(''); }} className="font-semibold text-ink-50 hover:text-ink">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && applyCode()} placeholder="Discount code" className="h-11 min-w-0 flex-1 rounded-md border border-[#dfe7e3] bg-white px-3.5 text-[13px] font-semibold uppercase tracking-wide outline-none focus:border-forest" />
                  <button onClick={applyCode} className="h-11 shrink-0 rounded-md bg-sunk px-4 text-[13px] font-bold text-forest hover:bg-emerald-100/60">Apply</button>
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-2.5 text-[14px]">
              <div className="flex justify-between"><dt className="text-ink-50">Items total</dt><dd className="tnum font-semibold text-ink">{money(totals.subtotal)}</dd></div>
              {totals.bulk > 0 && <div className="flex justify-between font-semibold text-emerald-700"><dt>Bulk pricing</dt><dd className="tnum">− {money(totals.bulk)}</dd></div>}
              {calc.couponAmount > 0 && <div className="flex justify-between font-semibold text-emerald-700"><dt>Code {calc.coupon.code}</dt><dd className="tnum">− {money(calc.couponAmount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-50">Delivery ({calc.parts.length} part{calc.parts.length > 1 ? 's' : ''})</dt><dd className="tnum font-semibold text-ink">{calc.shipping === 0 ? <span className="text-emerald-700">FREE</span> : money(calc.shipping)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-50">GST</dt><dd className="tnum font-semibold text-ink">{money(calc.gst)}</dd></div>
            </dl>
            <div className="mt-5 flex items-baseline justify-between border-t border-line-soft pt-5">
              <span className="text-[16px] font-bold text-ink">Final amount</span>
              <span className="font-hero tnum text-[28px] font-semibold text-forest">{money(calc.grand)}</span>
            </div>
            {totals.savings > 0 && <div className="mt-4"><Badge tone="ok" icon="check">You saved {money(totals.savings + calc.couponAmount)}</Badge></div>}
            <p className="mt-4 flex items-center gap-2 rounded-[16px] bg-[#f6f3ed] p-3.5 text-[12.5px] font-semibold text-ink-70">
              <Icon name="shieldCheck" size={16} className="shrink-0 text-forest" /> Verified sellers. One payment, split securely by Razorpay.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
