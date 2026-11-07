import { useMemo, useState } from 'react';
import Modal from '../Modal';
import Icon from '../Icon';
import { Button } from '../ui';
import { LABEL_CLS, SELECT_CLS } from '../admin/AdminUI';
import { useAdminStore } from '../../context/AdminStore';
import { useToast } from '../../context/ToastContext';
import { useScopedProducts } from '../../lib/useScoped';
import { photoOf } from '../../data/catalog';
import { get, post } from '../../lib/api';
import { LIVE } from '../../lib/config';
import { refresh } from '../../lib/live';
import { cx, digits10, isMobile10, money, itemCode } from '../../lib/format';

/* Seller dashboard quick actions (client review 6: "restore dashboard-level
   quick actions such as Update Stock and Create Orders"). */

function ProductPicker({ products, onPick, placeholder = 'Search your products by name, code or size' }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const hits = needle.length < 1 ? products.slice(0, 6)
    : products.filter((p) => `${p.name} ${p.sku} ${p.itemCode || ''} ${p.size || ''}`.toLowerCase().includes(needle)).slice(0, 8);
  return (
    <div>
      <label className="flex h-11 items-center gap-2.5 rounded-md border border-line bg-white px-3.5 focus-within:border-forest">
        <Icon name="search" size={15} className="text-ink-50" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-35" autoFocus />
      </label>
      <ul className="mt-2 max-h-[260px] space-y-1 overflow-y-auto">
        {hits.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => { onPick(p); setQ(''); }} className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-sunk/70">
              <span className="photo-bed grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[10px]">
                {photoOf(p) ? <img src={photoOf(p)} alt="" className="h-full w-full object-cover" /> : <Icon name="package" size={15} className="text-forest" />}
              </span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold text-ink">{p.name}{p.size ? ` · ${p.size}` : ''}</span><span className="block text-[11.5px] text-ink-50">{itemCode(p)} · {money(p.price)}</span></span>
              <span className={cx('tnum shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', p.stock <= 0 ? 'bg-clay-50 text-clay-600' : p.stock <= 8 ? 'bg-amber-50 text-amber' : 'bg-emerald-50 text-emerald-700')}>{p.stock} in stock</span>
            </button>
          </li>
        ))}
        {hits.length === 0 && <li className="px-2 py-4 text-center text-[12.5px] text-ink-50">No product matches “{q}”.</li>}
      </ul>
    </div>
  );
}

/* Update stock: find a product, type the count on the shelf. */
export function UpdateStockDialog({ open, onClose }) {
  const products = useScopedProducts();
  const { setStock } = useAdminStore();
  const toast = useToast();
  const [p, setP] = useState(null);
  const [n, setN] = useState('');
  const [busy, setBusy] = useState(false);
  const lowFirst = useMemo(() => [...products].sort((a, b) => a.stock - b.stock), [products]);
  const close = () => { setP(null); setN(''); onClose(); };
  const save = async () => {
    setBusy(true);
    try {
      await setStock(p.id, Number(n));
      toast.success(`${p.name}: stock set to ${Number(n)}`);
      close();
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={close} title="Update stock">
      {!p ? (
        <>
          <p className="mb-3 text-[13px] text-ink-50">Lowest stock first. Pick a product, then enter what is on the shelf now.</p>
          <ProductPicker products={lowFirst} onPick={(x) => { setP(x); setN(String(x.stock)); }} />
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-[14px] bg-sand-50 p-3">
            <span className="photo-bed grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[12px]">{photoOf(p) ? <img src={photoOf(p)} alt="" className="h-full w-full object-cover" /> : <Icon name="package" size={16} />}</span>
            <span className="min-w-0 flex-1"><b className="block truncate text-[14px] text-ink">{p.name}{p.size ? ` · ${p.size}` : ''}</b><span className="text-[12px] text-ink-50">{itemCode(p)} · now {p.stock}</span></span>
            <button onClick={() => setP(null)} className="text-[12px] font-bold text-forest">Change</button>
          </div>
          <div className="flex items-center gap-2">
            {[-10, -1].map((d) => <button key={d} type="button" onClick={() => setN(String(Math.max(0, Number(n || 0) + d)))} className="h-12 w-14 rounded-md border border-line font-bold text-forest">{d}</button>)}
            <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, '').slice(0, 7))} aria-label="New stock" className="tnum h-12 min-w-0 flex-1 rounded-md border border-line text-center text-[20px] font-bold text-ink outline-none focus:border-forest" />
            {[1, 10].map((d) => <button key={d} type="button" onClick={() => setN(String(Number(n || 0) + d))} className="h-12 w-14 rounded-md border border-line font-bold text-forest">+{d}</button>)}
          </div>
          {p.stock <= 0 && Number(n) > 0 && <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-700"><Icon name="bell" size={13} /> Shoppers waiting on “Notify me” will be told it is back.</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={save} loading={busy} disabled={n === '' || Number(n) === p.stock} icon="check">Save stock</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* Create order, two ways (client final review: "create orders for walk-in
   customers without requiring customer registration … no Nivorva commission"):
   - Walk-in sale: at the store's own counter, no account needed — name and
     mobile optional, paid to the store; stock is taken at once
     (POST /seller/walk-in-sales). Not a Nivorva order: no commission, no payout.
   - Registered customer: by mobile, delivered, cash on delivery —
     POST /seller/orders runs the normal checkout. */
export function CreateOrderDialog({ open, onClose }) {
  const [mode, setMode] = useState('walkin');
  const close = () => { setMode('walkin'); onClose(); };
  return (
    <Modal open={open} onClose={close} title="Create order" size="lg">
      <div className="mb-5 grid grid-cols-2 gap-2">
        {[['walkin', 'Walk-in sale', 'At your counter · no account needed'], ['registered', 'Nivorva customer', 'Delivered · cash on delivery']].map(([k, t, n]) => (
          <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k}
            className={cx('rounded-[14px] border px-3 py-2.5 text-left transition', mode === k ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink hover:border-forest/40')}>
            <span className="block text-[13.5px] font-bold">{t}</span>
            <span className={cx('block text-[11.5px]', mode === k ? 'text-white/75' : 'text-ink-50')}>{n}</span>
          </button>
        ))}
      </div>
      {open && (mode === 'walkin' ? <WalkInSale onDone={close} /> : <RegisteredOrder onDone={close} />)}
    </Modal>
  );
}

const PAY = [['CASH', 'Cash'], ['UPI', 'UPI'], ['CARD', 'Card'], ['OTHER', 'Other']];

function WalkInSale({ onDone }) {
  const products = useScopedProducts().filter((p) => p.stock > 0);
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pay, setPay] = useState('CASH');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [requestId] = useState(() => Math.random().toString(36).slice(2));
  const unit = (l) => (l.price === '' ? 0 : Number(l.price));
  const total = lines.reduce((s, l) => s + unit(l) * l.qty, 0);
  const add = (p) => setLines((ls) => (ls.some((l) => l.p.id === p.id) ? ls.map((l) => (l.p.id === p.id ? { ...l, qty: Math.min(p.stock, l.qty + 1) } : l)) : [...ls, { p, qty: 1, price: String(Number(p.price) || '') }]));
  const set = (id, patch) => setLines((ls) => ls.map((x) => (x.p.id === id ? { ...x, ...patch } : x)));
  const record = async () => {
    if (!lines.length) return toast.error('Add at least one product.');
    if (phone && !isMobile10(phone)) return toast.error('Enter a 10-digit mobile, or leave it empty.');
    if (lines.some((l) => l.price === '' || !(Number(l.price) >= 0))) return toast.error('Enter the price charged for each product.');
    setBusy(true);
    try {
      if (LIVE) {
        const sale = await post('/seller/walk-in-sales', {
          customerName: name.trim() || null, phone: phone || null, payment: pay, note: note.trim() || null, requestId,
          items: lines.map((l) => ({ sku: l.p.sku, qty: l.qty, price: Number(l.price) })),
        });
        await refresh('products', 'stock');
        toast.success(`Sale ${sale.number} recorded — ${money(sale.total)}, stock updated`);
      } else {
        toast.success('Demo: sale recorded (connect the API to record real sales)');
      }
      onDone();
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <div>
        <span className={LABEL_CLS}>1 · Customer (optional)</span>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} placeholder="Name — e.g. Ravi (walk-in)" className={SELECT_CLS} />
          <label className="flex h-11 min-w-0 items-center overflow-hidden rounded-md border border-line bg-white focus-within:border-forest">
            <span className="grid h-full place-items-center border-r border-line bg-sunk/60 px-3 text-[13px] font-bold text-forest">+91</span>
            <input inputMode="numeric" value={phone} onChange={(e) => setPhone(digits10(e.target.value))} placeholder="Mobile (optional)" className="h-full min-w-0 flex-1 px-3 text-[14px] outline-none" />
          </label>
        </div>
      </div>

      <div>
        <span className={LABEL_CLS}>2 · Products (yours, in stock)</span>
        <ProductPicker products={products} onPick={add} />
        {lines.length > 0 && (
          <ul className="mt-3 divide-y divide-line-soft rounded-[14px] border border-line">
            {lines.map((l) => (
              <li key={l.p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1 basis-40 truncate font-semibold text-ink">{l.p.name}{l.p.size ? ` · ${l.p.size}` : ''}<span className="block text-[11.5px] font-normal text-ink-50">{itemCode(l.p)} · {l.p.stock} in stock</span></span>
                <label className="flex items-center gap-1 text-[11.5px] text-ink-50">Qty
                  <input inputMode="numeric" value={l.qty} onChange={(e) => set(l.p.id, { qty: Math.max(1, Math.min(l.p.stock, Number(e.target.value.replace(/\D/g, '')) || 1)) })} aria-label="Quantity" className="tnum h-9 w-14 rounded-md border border-line text-center text-[13px] font-bold text-ink outline-none focus:border-forest" />
                </label>
                <label className="flex items-center gap-1 text-[11.5px] text-ink-50">₹ each
                  <input inputMode="decimal" value={l.price} onChange={(e) => set(l.p.id, { price: e.target.value.replace(/[^\d.]/g, '').slice(0, 10) })} aria-label="Price charged per unit" className="tnum h-9 w-20 rounded-md border border-line text-center text-[13px] font-bold text-ink outline-none focus:border-forest" />
                </label>
                <span className="tnum w-20 text-right font-bold text-ink">{money(unit(l) * l.qty)}</span>
                <button onClick={() => setLines((ls) => ls.filter((x) => x.p.id !== l.p.id))} aria-label="Remove" className="text-ink-35 hover:text-clay"><Icon name="close" size={14} /></button>
              </li>
            ))}
            <li className="flex justify-between px-3 py-2.5 text-[13px]"><span className="text-ink-50">Total collected</span><b className="tnum text-ink">{money(total)}</b></li>
          </ul>
        )}
      </div>

      <div>
        <span className={LABEL_CLS}>3 · Paid by</span>
        <div className="flex flex-wrap gap-2">
          {PAY.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setPay(k)} aria-pressed={pay === k} className={cx('rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold', pay === k ? 'border-forest bg-forest text-white' : 'border-line text-ink-70')}>{l}</button>
          ))}
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} placeholder="Note (optional) — e.g. bill no. 482" className={cx(SELECT_CLS, 'mt-2 w-full')} />
        <p className="mt-2 text-[12px] text-ink-50">Collected by your store at the counter. Stock goes down as soon as you record it. It is not a Nivorva order: no delivery, no commission, no payout. Listed under Orders → Walk-in sales.</p>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={record} loading={busy} disabled={!lines.length} icon="check">Record sale{lines.length ? ` · ${money(total)}` : ''}</Button>
      </div>
    </div>
  );
}

function RegisteredOrder({ onDone }) {
  const products = useScopedProducts().filter((p) => p.stock > 0 && Number(p.price) > 0);
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [who, setWho] = useState(null);
  const [lines, setLines] = useState([]);
  const [addr, setAddr] = useState({ use: 'saved', name: '', line: '', pin: '' });
  const [busy, setBusy] = useState(false);
  const [requestId] = useState(() => Math.random().toString(36).slice(2));
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const close = onDone;

  const lookup = async () => {
    if (!isMobile10(phone)) return toast.error('Enter the customer’s 10-digit mobile.');
    if (!LIVE) return setWho({ found: true, firstName: 'Demo customer', savedAddress: 'Tirupati 517501' });
    setBusy(true);
    try { setWho(await get(`/seller/customer-lookup?phone=${phone}`)); } catch (x) { toast.error(x.message); } finally { setBusy(false); }
  };
  const add = (p) => setLines((ls) => (ls.some((l) => l.p.id === p.id) ? ls.map((l) => (l.p.id === p.id ? { ...l, qty: Math.min(p.stock, l.qty + 1) } : l)) : [...ls, { p, qty: 1 }]));
  const place = async () => {
    if (!lines.length) return toast.error('Add at least one product.');
    const manual = addr.use === 'new' || !who?.savedAddress;
    if (manual && (addr.name.trim().length < 2 || addr.line.trim().length < 6 || !/^\d{6}$/.test(addr.pin))) return toast.error('Enter the delivery name, address and 6-digit PIN.');
    setBusy(true);
    try {
      if (LIVE) {
        const order = await post('/seller/orders', {
          phone, requestId,
          items: lines.map((l) => ({ sku: l.p.sku, qty: l.qty })),
          address: manual ? { name: addr.name.trim(), phone, address: addr.line.trim(), city: 'Tirupati', pin: addr.pin } : null,
        });
        await refresh('orders', 'products');
        toast.success(`Order NV-${order.number} placed for ${who.firstName} — cash on delivery`);
      } else {
        toast.success('Demo: order placed (connect the API to create real orders)');
      }
      close();
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
      <div className="space-y-5">
        <div>
          <span className={LABEL_CLS}>1 · Customer’s mobile</span>
          <div className="flex gap-2">
            <label className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-line bg-white focus-within:border-forest">
              <span className="grid h-full place-items-center border-r border-line bg-sunk/60 px-3 text-[13px] font-bold text-forest">+91</span>
              <input inputMode="numeric" value={phone} onChange={(e) => { setPhone(digits10(e.target.value)); setWho(null); }} placeholder="98765 43210" className="h-full min-w-0 flex-1 px-3 text-[14px] outline-none" />
            </label>
            <Button onClick={lookup} loading={busy && !who} variant="outline" icon="search">Find</Button>
          </div>
          {who && !who.found && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-[12.5px] text-amber">No Nivorva customer has this number. For a customer at your counter, use <b>Walk-in sale</b> above — no account needed.</p>}
          {who?.found && <p className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-emerald-700"><Icon name="check" size={14} /> {who.firstName}{who.savedAddress ? ` · delivers to ${who.savedAddress}` : ' · no saved address'}</p>}
        </div>

        {who?.found && (
          <>
            <div>
              <span className={LABEL_CLS}>2 · Products (yours, in stock)</span>
              <ProductPicker products={products} onPick={add} />
              {lines.length > 0 && (
                <ul className="mt-3 divide-y divide-line-soft rounded-[14px] border border-line">
                  {lines.map((l) => (
                    <li key={l.p.id} className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{l.p.name}{l.p.size ? ` · ${l.p.size}` : ''}</span>
                      <input inputMode="numeric" value={l.qty} onChange={(e) => setLines((ls) => ls.map((x) => (x.p.id === l.p.id ? { ...x, qty: Math.max(1, Math.min(l.p.stock, Number(e.target.value.replace(/\D/g, '')) || 1)) } : x)))} aria-label="Quantity" className="tnum h-9 w-16 rounded-md border border-line text-center font-bold outline-none focus:border-forest" />
                      <span className="tnum w-20 text-right font-bold text-ink">{money(l.p.price * l.qty)}</span>
                      <button onClick={() => setLines((ls) => ls.filter((x) => x.p.id !== l.p.id))} aria-label="Remove" className="text-ink-35 hover:text-clay"><Icon name="close" size={14} /></button>
                    </li>
                  ))}
                  <li className="flex justify-between px-3 py-2.5 text-[13px]"><span className="text-ink-50">Items (before GST and delivery)</span><b className="tnum text-ink">{money(total)}</b></li>
                </ul>
              )}
            </div>

            <div>
              <span className={LABEL_CLS}>3 · Deliver to</span>
              {who.savedAddress && (
                <div className="mb-2 flex gap-2">
                  {[['saved', `Saved address (${who.savedAddress})`], ['new', 'Another address']].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setAddr((a) => ({ ...a, use: k }))} className={cx('rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold', addr.use === k ? 'border-forest bg-forest text-white' : 'border-line text-ink-70')}>{l}</button>
                  ))}
                </div>
              )}
              {(addr.use === 'new' || !who.savedAddress) && (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px]">
                  <input value={addr.name} onChange={(e) => setAddr((a) => ({ ...a, name: e.target.value }))} placeholder="Name for delivery" className={SELECT_CLS} />
                  <input value={addr.line} onChange={(e) => setAddr((a) => ({ ...a, line: e.target.value }))} placeholder="House, street, area" className={SELECT_CLS} />
                  <input inputMode="numeric" value={addr.pin} onChange={(e) => setAddr((a) => ({ ...a, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="PIN 5175xx" className={SELECT_CLS} />
                </div>
              )}
              <p className="mt-2 text-[12px] text-ink-50">Cash on delivery. Prices, GST and delivery are worked out exactly as at checkout; the customer is notified and sees the order under Orders.</p>
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={place} loading={busy} disabled={!lines.length} icon="check">Place order</Button>
            </div>
          </>
        )}
      </div>
  );
}
