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
          className="w-full max-w-md rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-pop"
        >
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-forest text-white shadow-btn">
            <Icon name="check" size={28} strokeWidth={2.6} />
          </span>
          <h1 className="mt-5 text-[24px] font-semibold text-ink">Enquiry received</h1>
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
      <Container className="pt-5">
        <section className="forest-band relative overflow-hidden rounded-[24px] text-white shadow-pop">
          <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative px-6 py-9 sm:px-10 sm:py-12">
            <Breadcrumbs
              className="mb-4 [&_a]:!text-white/70 [&_span]:text-white/50 [&_.font-semibold]:!text-white"
              items={[{ label: 'Home', to: '/' }, { label: 'Enquiry' }]}
            />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d5e5df]">Trade desk</p>
            <h1 className="font-hero mt-3 text-[clamp(2rem,6vw,3.2rem)] font-semibold text-white">Enquire now</h1>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-sunk">
              Bulk orders, dealer tie-ups, or a quote on specific SKUs — tell us what you need and we
              will come back within one working day with pricing and availability.
            </p>
          </div>
        </section>
      </Container>

      <Container className="pb-12 pt-5">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <form onSubmit={submit} noValidate className="rounded-[24px] border border-white/80 bg-white p-5 shadow-card sm:p-7">
            <h2 className="text-[20px] font-semibold text-ink">What is this about?</h2>
            <p className="mb-4 mt-1 text-[14px] text-ink-50">Pick the closest match — it routes your enquiry to the right desk.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PURPOSE.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set('purpose', p.id)}
                  className={cx(
                    'rounded-[16px] border p-4 text-left transition',
                    f.purpose === p.id ? 'border-forest bg-white shadow-card' : 'border-line-soft bg-white hover:border-forest/40'
                  )}
                >
                  <span className="block text-[14px] font-bold text-ink">{p.label}</span>
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
                <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800">Product family</span>
                <select
                  value={f.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="h-12 w-full rounded-md border border-line bg-white/80 px-4 text-[14px] text-ink outline-none transition focus:border-forest focus:shadow-[0_0_0_2px_rgba(31,92,74,0.18)]"
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
              <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800">What do you need?</span>
              <textarea
                rows={4}
                value={f.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder="Sizes, materials, site location, timeline…"
                className="w-full rounded-md border border-line bg-white/80 px-4 py-3 text-[14px] text-ink outline-none transition placeholder:text-ink-35 focus:border-forest focus:shadow-[0_8px_25px_rgba(37,88,73,0.14),0_0_0_2px_rgba(31,92,74,0.18)]"
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

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line-soft pt-5">
              <Button type="submit" size="lg" iconRight="arrowRight">Send enquiry</Button>
              <span className="text-[12px] text-ink-35">We reply within one working day.</span>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-card sm:p-6">
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

            <div className="rounded-[24px] bg-ink p-5 text-white sm:p-6">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c9d7d2]">Why buy trade from Nasou</p>
              <ul className="space-y-2.5 text-[13.5px] text-white/85">
                {[
                  ['tag', 'Slab pricing above ₹25,000'],
                  ['truck', 'Same-day dispatch on in-stock lines'],
                  ['shieldCheck', 'GST invoice on every order'],
                  ['layers', '27 brands under one account'],
                ].map(([ic, t]) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white/10"><Icon name={ic} size={15} /></span> {t}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-2.5 text-[12.5px] font-bold text-forest transition hover:-translate-y-0.5">
                General contact details <Icon name="arrowRight" size={13} />
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
