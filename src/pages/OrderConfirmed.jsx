import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import { Button, Container } from '../components/ui';
import { buildTrace, products } from '../data/catalog';
import { money } from '../lib/format';

const STAGES = buildTrace(products[0]);

export default function OrderConfirmed() {
  const { state } = useLocation();
  /* Generated once per mount — a re-render must not reissue the order id. */
  const orderId = useMemo(() => `NH-${Math.floor(Math.random() * 9000 + 1000)}`, []);

  return (
    <Container className="pb-14 pt-8 sm:pt-12">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-2xl rounded-[28px] border border-white/80 bg-white p-6 text-center shadow-pop sm:p-10"
      >
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', damping: 14 }}
          className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-forest text-white shadow-btn"
        >
          <span className="animate-pulse-ring absolute -inset-2 rounded-full border-2 border-forest/25" />
          <Icon name="check" size={34} strokeWidth={2.6} />
        </motion.span>

        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-50">Nasou secure checkout</p>
        <h1 className="mt-2 text-[clamp(1.9rem,5vw,2.4rem)] font-semibold text-ink">Order placed</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-50">
          Order <span className="font-mono font-semibold text-ink">{orderId}</span> is
          confirmed. Your GST invoice is ready to download from your orders, and we&rsquo;ve
          emailed the details.
        </p>

        {state?.total != null && (
          <dl className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-[16px] bg-[#f4f7f5] px-4 py-3">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-50">Items</dt>
              <dd className="tnum mt-1 text-[16px] font-bold text-ink">{state.count}</dd>
            </div>
            <div className="rounded-[16px] bg-[#f4f7f5] px-4 py-3">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-50">Paid via</dt>
              <dd className="mt-1 text-[16px] font-bold text-ink">{state.pay}</dd>
            </div>
            <div className="rounded-[16px] bg-[#f4f7f5] px-4 py-3">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-50">Total</dt>
              <dd className="tnum mt-1 text-[16px] font-bold text-forest">{money(state.total)}</dd>
            </div>
          </dl>
        )}

        <div className="mt-8 rounded-[20px] border border-line-soft p-5 text-left sm:p-6">
          <p className="mb-5 text-[16px] font-semibold text-ink">What happens next</p>
          <ol className="space-y-4">
            {STAGES.slice(1).map((s, i) => (
              <li key={s.code} className="flex gap-3.5">
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    i === 0 ? 'bg-forest text-white' : 'bg-sunk text-ink-50'
                  }`}
                >
                  <Icon name="check" size={11} strokeWidth={3} />
                </span>
                <span>
                  <span className="block text-[14px] font-bold">{s.stage}</span>
                  <span className="block text-[12.5px] text-ink-50">{s.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button to="/shop" size="lg" iconRight="arrowRight">Keep shopping</Button>
          <Button to="/" size="lg" variant="outline">Back to home</Button>
        </div>
      </motion.div>
    </Container>
  );
}
