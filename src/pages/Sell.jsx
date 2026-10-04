import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import { Button, Container } from '../components/ui';
import { useSettings } from '../store/settings';
import { useRetailers } from '../store/retailers';
import { money } from '../lib/format';

/* "Sell on Nivora" — the retailer acquisition page that leads to signup. */
const STEPS = [
  ['userPlus', 'Apply in 10 minutes', 'Store, GST, PAN and bank details plus four documents.'],
  ['shieldCheck', 'Get verified', 'The Nivora team checks your documents — usually within a working day.'],
  ['package', 'List from the master catalog', 'Pick categories, add stock and prices. Products go live straight away.'],
  ['rupee', 'Get paid every week', 'Razorpay splits each payment and settles your share to your bank.'],
];

export default function Sell() {
  const plans = useSettings((s) => s.plans);
  const commission = useSettings((s) => s.commission.default);
  const live = useRetailers().filter((r) => r.status === 'approved').length;
  return (
    <Container className="space-y-12 pb-14 pt-5 sm:space-y-16">
      <section className="relative overflow-hidden rounded-[32px] bg-[#f4ede2] px-6 py-12 shadow-card sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(31,92,74,0.18),transparent_65%)]" />
        <div className="field-dots pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative max-w-2xl">
          <p className="section-label">Sell on Nivora</p>
          <h1 className="font-hero mt-5 text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02] text-forest">Your counter, open to every contractor in the state.</h1>
          <p className="mt-5 max-w-xl text-[15.5px] leading-7 text-ink-70">Join {live} verified retailers selling plumbing, electrical, hardware and more on one marketplace. One cart for the buyer, a clean order queue for you, weekly payouts straight to your bank.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/sell/register" size="lg" iconRight="arrowRight">Start your application</Button>
            <Button to="/login?redirect=/seller" size="lg" variant="outline">Seller sign in</Button>
          </div>
          <p className="mt-6 text-[13px] font-semibold text-ink-50">Commission from {commission}% per order · no listing fees on Starter</p>
        </div>
      </section>

      <section>
        <p className="section-label">How it works</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([ic, t, d], i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="relative rounded-[24px] bg-white p-6 shadow-card">
              <span className="font-hero absolute right-5 top-4 text-[44px] font-semibold text-sunk">{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-forest text-white shadow-btn"><Icon name={ic} size={20} /></span>
              <p className="mt-5 text-[17px] font-bold text-forest">{t}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-50">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <p className="section-label">Plans</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {plans.map((p, i) => (
            <div key={p.id} className={i === 1 ? 'rounded-[26px] bg-forest p-7 text-white shadow-pop' : 'rounded-[26px] bg-white p-7 shadow-card'}>
              <p className={i === 1 ? 'text-[13px] font-bold uppercase tracking-[0.16em] text-emerald-100' : 'text-[13px] font-bold uppercase tracking-[0.16em] text-ink-50'}>{p.name}</p>
              <p className={i === 1 ? 'font-hero mt-3 text-[36px] font-semibold text-white' : 'font-hero mt-3 text-[36px] font-semibold text-forest'}>{p.monthly ? money(p.monthly) : 'Free'}<span className="text-[14px] font-medium opacity-70">{p.monthly ? ' / month' : ''}</span></p>
              <p className={i === 1 ? 'mt-3 text-[14px] text-emerald-100' : 'mt-3 text-[14px] text-ink-50'}>{p.perks}</p>
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
