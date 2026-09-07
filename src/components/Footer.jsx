import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import Logo from './Logo';
import { Container } from './ui';
import { useToast } from '../context/ToastContext';
import { brand, footerColumns, paymentMethods, socials } from '../data/site';

function Newsletter() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email address.');
    toast.success('Subscribed — watch your inbox for stock alerts and deals.');
    setEmail('');
  };
  return (
    <form onSubmit={submit} className="mt-6">
      <p className="text-[12.5px] font-semibold text-white/70">Stock alerts &amp; trade offers</p>
      <div className="mt-2 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email address"
          className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-3 text-[13px] text-white outline-none transition placeholder:text-white/35 focus:border-emerald-100 focus:bg-white/10"
        />
        <button className="sheen h-10 shrink-0 rounded-md bg-emerald px-4 text-[13px] font-semibold text-white transition hover:bg-emerald-600">
          Subscribe
        </button>
      </div>
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-forest text-white sm:mt-28">
      <div className="field-dots-dark">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr]">
            <div>
              <Link to="/" className="text-white"><Logo /></Link>
              <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-white/60">{brand.promise}</p>
              <div className="mt-5 flex flex-col gap-1.5 text-[13px] text-white/70">
                <a href={`tel:${brand.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 transition hover:text-white">
                  <Icon name="phone" size={13} /> {brand.phone}
                </a>
                <a href={`mailto:${brand.email}`} className="flex items-center gap-2 transition hover:text-white">
                  <Icon name="mail" size={13} /> {brand.email}
                </a>
                <span className="flex items-start gap-2 text-white/55">
                  <Icon name="pin" size={13} className="mt-0.5 shrink-0" /> {brand.address}
                </span>
              </div>
              <Newsletter />
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {footerColumns.map((col) => (
                <div key={col.title}>
                  <h3 className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-white/45">{col.title}</h3>
                  <ul className="space-y-1">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link to={l.to} className="-my-0.5 inline-block py-1.5 text-[13px] text-white/70 transition hover:text-white">{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-5 border-t border-white/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-white/45">
              <span>© {new Date().getFullYear()} {brand.name}</span>
              <span className="hidden sm:inline">·</span>
              <span>GSTIN {brand.gst}</span>
              <Link to="/returns" className="transition hover:text-white/80">Returns</Link>
              <Link to="/contact" className="transition hover:text-white/80">Contact</Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="text-[12px] text-white/55 transition hover:text-white">
                  {s.label}
                </a>
              ))}
              <span className="mx-1 h-3 w-px bg-white/15" />
              {paymentMethods.map((m) => (
                <span key={m} className="rounded border border-white/15 px-2 py-1 text-[10.5px] font-medium text-white/65">{m}</span>
              ))}
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
