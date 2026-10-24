import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { landingFor } from '../lib/auth';
import { cx } from '../lib/format';

/* "Who am I" — the page between the landing page and signing in (client
   review 6, from the reference repo and Vismaye's requirement). Each kind of
   visitor goes to their own door: a retailer to Sell on Nivora (apply, or
   seller sign-in), a customer to the usual sign-in. Manufacturers are not on
   the marketplace yet, so their card leads to the trade desk. */

const ROLES = [
  {
    key: 'manufacturer',
    icon: 'factory',
    title: 'Manufacturer',
    body: 'Produce and supply goods across a connected distribution network.',
    to: '/enquiry?purpose=dealer',
    cta: 'Talk to us',
    note: 'Coming soon — tell us what you make',
  },
  {
    key: 'retailer',
    icon: 'cube',
    title: 'Retailer',
    body: 'Source products directly from manufacturers and grow your business.',
    to: '/sell',
    cta: 'Get started',
    note: 'Apply to sell, or sign in to your store',
  },
  {
    key: 'customer',
    icon: 'user',
    title: 'Customer',
    body: 'Browse and purchase products from trusted retailers.',
    to: '/login',
    cta: 'Get started',
    note: 'Sign in or create an account',
  },
];

export default function Join() {
  const { isAuthenticated, user } = useAuth();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  if (isAuthenticated) return <Navigate to={landingFor(user, redirect)} replace />;
  const withRedirect = (to) => (redirect && to === '/login' ? `/login?redirect=${encodeURIComponent(redirect)}` : to);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas text-forest">
      {/* soft light from the corners, like the reference */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.75),transparent_35%),radial-gradient(circle_at_85%_90%,rgba(9,81,67,0.08),transparent_40%)]" />
      <div className="field-dots pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-forest-800 transition hover:-translate-x-1 hover:text-forest">
            <Icon name="arrowLeft" size={15} /> Back to shop
          </Link>
          <Link to="/" aria-label="Nivora home"><Logo size={30} /></Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <motion.span initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-full bg-sand px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-forest-800">
            Built for everyone
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-hero mt-5 text-center text-[clamp(2.3rem,7vw,3.6rem)] font-extrabold tracking-[-0.03em] text-forest">
            Join Us Today
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-2 text-center text-[15px] text-ink-50">
            A smarter way to build, sell, and shop together.
          </motion.p>

          <div className="mt-10 grid w-full max-w-5xl gap-4 sm:grid-cols-3 sm:gap-5">
            {ROLES.map((r, i) => (
              <motion.div key={r.key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.07 }} whileHover={{ y: -6 }}>
                <Link
                  to={withRedirect(r.to)}
                  className={cx(
                    'group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-forest/25 bg-white p-6 shadow-card transition-shadow hover:shadow-lift sm:min-h-[340px] sm:p-7',
                    r.key === 'retailer' && 'sm:border-forest/45'
                  )}
                >
                  {/* a forest sweep rises from the bottom on hover */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-forest transition-all duration-500 group-hover:h-1.5" />
                  <span className="grid h-16 w-16 place-items-center rounded-[16px] bg-sunk text-forest transition duration-300 group-hover:bg-forest group-hover:text-white">
                    <Icon name={r.icon} size={26} />
                  </span>
                  <h2 className="mt-7 text-[21px] font-bold tracking-[-0.01em] text-ink">{r.title}</h2>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-70">{r.body}</p>
                  <p className="mt-3 text-[12px] font-semibold text-ink-35">{r.note}</p>
                  <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-sand px-4 py-2 text-[12.5px] font-bold text-forest-800 transition group-hover:gap-2.5 group-hover:bg-forest group-hover:text-white sm:mt-8">
                    {r.cta} <Icon name="arrowRight" size={13} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

          <p className="mt-8 text-center text-[13px] text-ink-50">
            Part of the Nivora team? <Link to="/login" className="font-bold text-forest hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
