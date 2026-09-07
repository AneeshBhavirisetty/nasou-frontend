import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import { Badge, Button, Container, Breadcrumbs, Field } from '../components/ui';
import PhoneField from '../components/auth/PhoneField';
import { useToast } from '../context/ToastContext';
import { categories } from '../data/catalog';
import { brand } from '../data/site';
import { isMobile10, cx } from '../lib/format';

const PURPOSE = [
  { id: 'bulk', label: 'Bulk / project order', note: 'Slab pricing above ₹25,000' },
  { id: 'dealer', label: 'Dealer / retailer tie-up', note: 'Stock our catalogue' },
  { id: 'quote', label: 'Price quote', note: 'Specific SKUs and sizes' },
  { id: 'other', label: 'Something else', note: 'General enquiry' },
];

export default function Enquiry() {
  const toast = useToast();
  const [f, setF] = useState({
    name: '', company: '', phone: '', email: '',
    purpose: 'bulk', category: '', qty: '', message: '',
  });
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) return setErr('Please tell us your name.');
    if (!isMobile10(f.phone)) return setErr('Enter a valid 10-digit mobile number.');
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('That email address doesn’t look right.');
    if (!f.message.trim()) return setErr('Add a line about what you need.');
    setSent(true);
    toast.success('Enquiry received — we’ll call you back within one working day.');
  };

  if (sent) {
    return (
      <Container className="flex min-h-[60dvh] items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-card"
        >
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="check" size={26} strokeWidth={2.6} />
          </span>
          <h1 className="mt-5 display-serif text-[24px]">Enquiry received</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-50">
            Thanks {f.name.split(' ')[0]} — our trade desk will call{' '}
            <span className="tnum font-semibold text-ink">+91 {f.phone}</span> within one working day.
            For anything urgent, ring {brand.phone}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button to="/shop" iconRight="arrowRight">Browse the catalogue</Button>
            <Button variant="outline" onClick={() => { setSent(false); set('message', ''); }}>
              Send another
            </Button>
          </div>
        </motion.div>
      </Container>
    );
  }

  return (
    <>
      <section className="border-b border-line bg-forest text-white">
        <div className="field-dots-dark">
          <Container className="py-10 sm:py-14">
            <Breadcrumbs
              className="mb-4 [&_a]:text-white/60 [&_span]:text-white/50"
              items={[{ label: 'Home', to: '/' }, { label: 'Enquiry' }]}
            />
            <p className="eyebrow mb-2 text-emerald-100/80">Trade desk</p>
            <h1 className="display-serif text-[clamp(1.9rem,6vw,3.2rem)] text-white">Enquire now</h1>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-white/60">
              Bulk orders, dealer tie-ups, or a quote on specific SKUs — tell us what you need and we
              will come back within one working day with pricing and availability.
            </p>
          </Container>
        </div>
      </section>

      <Container className="py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-white p-5 sm:p-6">
            <p className="eyebrow mb-3">What is this about?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PURPOSE.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set('purpose', p.id)}
                  className={cx(
                    'rounded-md border p-3 text-left transition',
                    f.purpose === p.id ? 'border-forest bg-emerald-50/60 ring-1 ring-forest' : 'border-line hover:border-ink-35'
                  )}
                >
                  <span className="block text-[13.5px] font-bold">{p.label}</span>
                  <span className="block text-[12px] text-ink-50">{p.note}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Your name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" autoComplete="name" required />
              <Field label="Company / firm" value={f.company} onChange={(e) => set('company', e.target.value)} placeholder="Optional" autoComplete="organization" />
              <PhoneField value={f.phone} onChange={(v) => set('phone', v)} />
              <Field label="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Optional" autoComplete="email" />

              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Product family</span>
                <select
                  value={f.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15"
                >
                  <option value="">Any / not sure</option>
                  {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </label>

              <Field
                label="Approx. quantity"
                inputMode="numeric"
                value={f.qty}
                onChange={(e) => set('qty', e.target.value.replace(/\D/g, '').slice(0, 7))}
                placeholder="e.g. 500"
                hint="Pieces — helps us quote slab pricing"
              />
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">What do you need?</span>
              <textarea
                rows={4}
                value={f.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder="Sizes, materials, site location, timeline…"
                className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-[14px] outline-none transition placeholder:text-ink-35 focus:border-emerald focus:ring-2 focus:ring-emerald/15"
                required
              />
            </label>

            {err && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mt-3 rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600"
              >
                {err}
              </motion.p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button type="submit" size="lg" iconRight="arrowRight">Send enquiry</Button>
              <span className="text-[12px] text-ink-35">We reply within one working day.</span>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-lg border border-line bg-white p-5">
              <Badge tone="ok" icon="phone">Talk to us</Badge>
              <div className="mt-4 space-y-2.5 text-[13.5px]">
                <a href={`tel:${brand.phone.replace(/\s/g, '')}`} className="flex items-center gap-2.5 font-semibold transition hover:text-emerald-600">
                  <Icon name="phone" size={15} className="text-emerald-600" /> {brand.phone}
                </a>
                <p className="flex items-center gap-2.5 text-ink-50">
                  <Icon name="phone" size={15} className="text-emerald-600" /> Toll-free {brand.toll}
                </p>
                <a href={`mailto:${brand.email}`} className="flex items-center gap-2.5 font-semibold transition hover:text-emerald-600">
                  <Icon name="mail" size={15} className="text-emerald-600" /> {brand.email}
                </a>
                <p className="flex items-start gap-2.5 text-ink-50">
                  <Icon name="pin" size={15} className="mt-0.5 shrink-0 text-emerald-600" /> {brand.address}
                </p>
                <p className="flex items-center gap-2.5 text-ink-35">
                  <Icon name="clock" size={15} /> Mon–Sat, 9am to 7pm
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-canvas p-5">
              <p className="eyebrow mb-3">Why buy trade from Nasou</p>
              <ul className="space-y-2.5 text-[13px] text-ink-70">
                {[
                  ['tag', 'Slab pricing above ₹25,000'],
                  ['truck', 'Same-day dispatch on in-stock lines'],
                  ['shieldCheck', 'GST invoice on every order'],
                  ['layers', '27 brands under one account'],
                ].map(([ic, t]) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <Icon name={ic} size={15} className="shrink-0 text-emerald-600" /> {t}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-600">
                General contact details <Icon name="arrowRight" size={13} />
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
