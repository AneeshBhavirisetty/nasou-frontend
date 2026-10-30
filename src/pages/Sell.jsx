import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import { Button, Container } from '../components/ui';
import { useSettings } from '../store/settings';
import { useRetailers } from '../store/retailers';

/* "Sell on Nivorva" — the retailer acquisition page that leads to signup. */
const STEPS = [
  ['userPlus', 'Apply in 10 minutes', 'Store details, GST and PAN with their certificates, and a cancelled cheque.'],
  ['shieldCheck', 'Get verified', 'The Nivorva team checks your documents — usually within a working day.'],
  ['package', 'List from the master catalog', 'Pick categories, add stock and prices. Products go live straight away.'],
  ['rupee', 'Get paid every week', 'Razorpay splits each payment and settles your share to your bank.'],
];

export default function Sell() {
  const commission = useSettings((s) => s.commission.default);
  const live = useRetailers().filter((r) => r.status === 'approved').length;
  return (
    <Container className="space-y-12 pb-14 pt-5 sm:space-y-16">
      <section className="relative overflow-hidden rounded-[32px] bg-sand-50 px-6 py-12 shadow-card sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(37,88,73,0.18),transparent_65%)]" />
        <div className="field-dots pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative max-w-2xl">
          <p className="section-label">Sell on Nivorva</p>
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

    </Container>
  );
}
