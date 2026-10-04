import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { Button, Container, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { createAccount, findAccount } from '../../store/accounts';
import { createRetailer } from '../../store/retailers';
import { DOC_TYPES } from '../../lib/marketplace';
import { DEPARTMENTS } from '../../data/departments';
import { readDocument } from '../../lib/files';
import { cx, isMobile10 } from '../../lib/format';
import { LIVE } from '../../lib/config';
import { post } from '../../lib/api';

/* Retailer signup with document upload (requirement 5). Every new retailer
   starts Pending and cannot sell until the Nivora team approves them.
   Spam protection: a hidden honeypot field, a minimum fill time and a small
   arithmetic check — the API adds rate limiting and a captcha provider. */

const STEPS = ['Account', 'Business', 'Tax', 'Bank', 'Documents'];
const STATES = ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Kerala', 'Odisha', 'Gujarat', 'Delhi', 'Other'];
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const LABEL = 'mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800';
const SELECT = 'h-12 w-full rounded-md border border-line bg-white/80 px-4 text-[14px] text-ink outline-none focus:border-forest';

export default function SellerRegister() {
  const toast = useToast();
  const navigate = useNavigate();
  const { signInAccount } = useAuth();
  const started = useRef(Date.now());
  const challenge = useMemo(() => { const a = 2 + Math.floor(Math.random() * 7); const b = 1 + Math.floor(Math.random() * 8); return { a, b }; }, []);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    contact: '', email: '', phone: '', password: '',
    name: '', legalName: '', type: 'Proprietorship', address: '', city: '', state: 'Telangana', pin: '', categories: ['plumbing'],
    gstin: '', pan: '',
    holder: '', account: '', account2: '', ifsc: '',
    website: '', answer: '', agree: false,
  });
  const [docs, setDocs] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const up = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value.toUpperCase().replace(/\s/g, '') }));

  const check = () => {
    if (step === 0) {
      if (f.contact.trim().length < 2) return 'Enter your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return 'Enter a valid email.';
      if (!isMobile10(f.phone)) return 'Enter a 10-digit mobile number.';
      if (f.password.length < 8) return 'Password needs at least 8 characters.';
      if (findAccount(f.email) || findAccount(f.phone)) return 'That email or mobile already has a Nivora account — sign in instead.';
    }
    if (step === 1) {
      if (f.name.trim().length < 3) return 'Enter your store name.';
      if (f.legalName.trim().length < 3) return 'Enter the registered business name.';
      if (f.address.trim().length < 6 || !f.city.trim()) return 'Enter the store address and city.';
      if (!/^\d{6}$/.test(f.pin)) return 'PIN code must be 6 digits.';
      if (!f.categories.length) return 'Pick at least one category you sell.';
    }
    if (step === 2) {
      if (!GSTIN.test(f.gstin)) return 'That GSTIN does not look right — it has 15 characters, e.g. 36AAPFS1234K1Z2.';
      if (!PAN.test(f.pan)) return 'That PAN does not look right, e.g. AAPFS1234K.';
      if (f.gstin.slice(2, 12) !== f.pan) return 'The PAN should match characters 3–12 of the GSTIN.';
    }
    if (step === 3) {
      if (f.holder.trim().length < 3) return 'Enter the account holder name.';
      if (!/^\d{9,18}$/.test(f.account)) return 'Account number should be 9–18 digits.';
      if (f.account !== f.account2) return 'The two account numbers do not match.';
      if (!IFSC.test(f.ifsc)) return 'That IFSC does not look right, e.g. HDFC0001234.';
    }
    if (step === 4) {
      const missing = DOC_TYPES.filter((d) => !docs[d.key]);
      if (missing.length) return `Upload: ${missing.map((d) => d.label).join(', ')}.`;
      if (Number(f.answer) !== challenge.a + challenge.b) return 'Check the sum in the last box.';
      if (!f.agree) return 'Please accept the seller terms.';
      if (f.website) return 'Something went wrong. Please try again.'; // honeypot filled — a bot
      if (Date.now() - started.current < 8000) return 'That was very quick — please check your details and submit again.';
    }
    return '';
  };

  const next = async (e) => {
    e.preventDefault();
    const problem = check();
    setErr(problem);
    if (problem) return;
    if (step < STEPS.length - 1) { setStep(step + 1); window.scrollTo({ top: 0 }); return; }
    setBusy(true);
    try {
      if (LIVE) {
        /* one multipart request: the application, the four documents and the
           owner's login — the server creates them together and signs in */
        const form = new FormData();
        const fields = {
          name: f.name.trim(), legalName: f.legalName.trim(), type: f.type, contact: f.contact.trim(), email: f.email.trim().toLowerCase(),
          phone: f.phone, password: f.password, address: f.address.trim(), city: f.city.trim(), state: f.state, pin: f.pin,
          categories: f.categories.join(','), gstin: f.gstin, pan: f.pan, bankHolder: f.holder.trim(), bankAccount: f.account,
          bankIfsc: f.ifsc, website: f.website, startedAt: String(started.current),
        };
        Object.entries(fields).forEach(([k, v]) => form.append(k, v));
        DOC_TYPES.forEach((d) => form.append(d.key, docs[d.key].file, docs[d.key].name));
        signInAccount(await post('/sellers/apply', form));
        toast.success('Application submitted — we will review it shortly');
        navigate('/seller', { replace: true });
        return;
      }
      const r = createRetailer({
        name: f.name.trim(), legalName: f.legalName.trim(), type: f.type, contact: f.contact.trim(), email: f.email.trim().toLowerCase(), phone: f.phone,
        address: f.address.trim(), city: f.city.trim(), state: f.state, pin: f.pin, categories: f.categories.map((c) => DEPARTMENTS.find((d) => d.slug === c)?.name),
        gstin: f.gstin, pan: f.pan, bank: { holder: f.holder.trim(), account: f.account, ifsc: f.ifsc },
        documents: DOC_TYPES.map((d) => docs[d.key]),
      });
      const a = await createAccount({ fullName: f.contact.trim(), email: f.email, phone: f.phone, role: 'RETAILER', retailerId: r.id, staffRole: 'owner' }, { password: f.password });
      signInAccount(a);
      toast.success('Application submitted — we will review it shortly');
      navigate('/seller', { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const attach = async (key, file) => {
    try {
      const d = await readDocument(file, key);
      setDocs((s) => ({ ...s, [key]: { ...d, file } }));
    } catch (x) {
      toast.error(x.message);
    }
  };

  return (
    <Container className="pb-14 pt-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/sell" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-forest-800 hover:text-forest"><Icon name="arrowLeft" size={14} /> Selling on Nivora</Link>
        <h1 className="font-hero mt-4 text-[clamp(1.8rem,4.5vw,2.6rem)] font-semibold">Open your store on Nivora</h1>
        <p className="mt-1 text-[14px] text-ink-50">About 10 minutes. Keep your GST certificate, PAN and a cancelled cheque handy.</p>

        <ol className="mt-6 grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => (
            <li key={s}>
              <span className={cx('block h-1.5 rounded-full transition-colors', i <= step ? 'bg-forest' : 'bg-sunk')} />
              <span className={cx('mt-2 block text-[11px] font-bold sm:text-[12.5px]', i === step ? 'text-forest' : 'text-ink-50')}>{s}</span>
            </li>
          ))}
        </ol>

        <form onSubmit={next} noValidate className="mt-6 rounded-[24px] bg-white p-5 shadow-card sm:p-8">
          {/* honeypot — hidden from people, filled by bots */}
          <label className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>

          <div key={step} className="animate-[stepIn_.26s_cubic-bezier(.22,1,.36,1)_both]">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" value={f.contact} onChange={set('contact')} autoComplete="name" />
                <Field label="Work email" type="email" value={f.email} onChange={set('email')} autoComplete="email" hint="Your sign-in for the seller console" />
                <Field label="Mobile" inputMode="numeric" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} autoComplete="tel-national" />
                <Field label="Password" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" hint="At least 8 characters" />
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Store name (shown to shoppers)" value={f.name} onChange={set('name')} placeholder="e.g. Sri Sai Pipes & Sanitary" />
                <Field label="Registered business name" value={f.legalName} onChange={set('legalName')} />
                <label><span className={LABEL}>Business type</span><select value={f.type} onChange={set('type')} className={SELECT}>{['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited'].map((t) => <option key={t}>{t}</option>)}</select></label>
                <label><span className={LABEL}>State</span><select value={f.state} onChange={set('state')} className={SELECT}>{STATES.map((t) => <option key={t}>{t}</option>)}</select></label>
                <Field label="Store address" className="sm:col-span-2" value={f.address} onChange={set('address')} autoComplete="street-address" />
                <Field label="City" value={f.city} onChange={set('city')} />
                <Field label="PIN code" inputMode="numeric" value={f.pin} onChange={(e) => setF((s) => ({ ...s, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} />
                <div className="sm:col-span-2">
                  <span className={LABEL}>What do you sell?</span>
                  <div className="flex flex-wrap gap-2">
                    {DEPARTMENTS.map((d) => {
                      const on = f.categories.includes(d.slug);
                      return <button key={d.slug} type="button" onClick={() => setF((s) => ({ ...s, categories: on ? s.categories.filter((x) => x !== d.slug) : [...s.categories, d.slug] }))} className={cx('flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition', on ? 'border-forest bg-forest text-white' : 'border-line text-ink-70 hover:border-forest/40')}><Icon name={d.icon} size={14} /> {d.name}</button>;
                    })}
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="GSTIN" value={f.gstin} onChange={up('gstin')} maxLength={15} placeholder="36AAPFS1234K1Z2" hint="15 characters" />
                <Field label="PAN" value={f.pan} onChange={up('pan')} maxLength={10} placeholder="AAPFS1234K" hint="Business or proprietor PAN" />
                <p className="rounded-[14px] bg-[#f6f3ed] p-3 text-[12.5px] text-ink-70 sm:col-span-2">Nivora collects GST on your behalf as a marketplace and issues tax invoices in your store’s name. Your GSTIN appears on every invoice.</p>
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account holder name" className="sm:col-span-2" value={f.holder} onChange={set('holder')} />
                <Field label="Account number" inputMode="numeric" value={f.account} onChange={(e) => setF((s) => ({ ...s, account: e.target.value.replace(/\D/g, '').slice(0, 18) }))} />
                <Field label="Re-enter account number" inputMode="numeric" value={f.account2} onChange={(e) => setF((s) => ({ ...s, account2: e.target.value.replace(/\D/g, '').slice(0, 18) }))} />
                <Field label="IFSC" value={f.ifsc} onChange={up('ifsc')} maxLength={11} placeholder="HDFC0001234" />
                <p className="self-end rounded-[14px] bg-[#f6f3ed] p-3 text-[12.5px] text-ink-70">Razorpay pays your share here every week once you are approved.</p>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {DOC_TYPES.map((d) => {
                    const doc = docs[d.key];
                    return (
                      <li key={d.key}>
                        <label className={cx('flex h-full cursor-pointer items-start gap-3 rounded-[18px] border-2 border-dashed p-4 transition', doc ? 'border-emerald/40 bg-emerald-50/40' : 'border-line hover:border-forest/40')}>
                          <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', doc ? 'bg-forest text-white' : 'bg-sunk text-forest')}><Icon name={doc ? 'check' : 'upload'} size={17} /></span>
                          <span className="min-w-0">
                            <span className="block text-[14px] font-bold text-ink">{d.label}</span>
                            <span className="block truncate text-[12px] text-ink-50">{doc ? `${doc.name} · ${Math.round(doc.size / 1024)} KB` : d.hint}</span>
                            <span className="mt-1 block text-[11.5px] font-bold text-forest">{doc ? 'Replace' : 'Choose file'} · PDF / JPG / PNG, max 5 MB</span>
                          </span>
                          <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => attach(d.key, e.target.files?.[0])} />
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-end">
                  <Field label={`What is ${challenge.a} + ${challenge.b}?`} inputMode="numeric" value={f.answer} onChange={(e) => setF((s) => ({ ...s, answer: e.target.value.replace(/\D/g, '').slice(0, 2) }))} hint="Helps us keep bots out" />
                  <label className="flex items-start gap-2.5 text-[13px] text-ink-70"><input type="checkbox" checked={f.agree} onChange={(e) => setF((s) => ({ ...s, agree: e.target.checked }))} className="mt-0.5 accent-[#1f5c4a]" /> I confirm these details are correct and accept the Nivora seller terms and commission schedule.</label>
                </div>
              </div>
            )}
          </div>

          {err && <p role="alert" className="mt-5 rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-line-soft pt-5">
            <Button type="button" variant="outline" icon="chevronLeft" disabled={step === 0} onClick={() => { setErr(''); setStep(step - 1); }}>Back</Button>
            <Button type="submit" size="lg" iconRight={step < STEPS.length - 1 ? 'arrowRight' : undefined} icon={step === STEPS.length - 1 ? 'send' : undefined} loading={busy}>
              {step < STEPS.length - 1 ? 'Continue' : 'Submit application'}
            </Button>
          </div>
        </form>
        <p className="mt-4 text-center text-[13px] text-ink-50">Already applied? <Link to="/login?redirect=/seller" className="font-bold text-forest">Sign in to check your status</Link></p>
      </div>
    </Container>
  );
}
