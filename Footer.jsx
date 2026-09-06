import { Link } from 'react-router-dom';
import Icon from './Icon';
import Logo from './Logo';
import { Container } from './ui';
import { brand, footerColumns, paymentMethods } from '../data/site';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-forest text-white">
      <div className="field-dots-dark">
        <Container className="py-16">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_2fr]">
            <div>
              <Link to="/" className="text-white">
                <Logo />
              </Link>
              <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-white/60">
                {brand.promise}
              </p>
              <div className="mt-6 flex flex-col gap-1.5 text-[13.5px] text-white/70">
                <a href={`mailto:${brand.email}`} className="transition hover:text-white">
                  {brand.email}
                </a>
                <a href={`tel:${brand.phone.replace(/\s/g, '')}`} className="transition hover:text-white">
                  {brand.phone}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {footerColumns.map((col) => (
                <div key={col.title}>
                  <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white/45">
                    {col.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          to={l.to}
                          className="text-[13.5px] text-white/70 transition hover:text-white"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-5 border-t border-white/12 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-white/45">
              © {new Date().getFullYear()} {brand.name}. Prototype storefront.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 flex items-center gap-1.5 text-[12px] text-white/45">
                <Icon name="lock" size={13} />
                Secure payments
              </span>
              {paymentMethods.map((m) => (
                <span
                  key={m}
                  className="rounded border border-white/15 px-2 py-1 text-[11px] font-medium text-white/65"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
