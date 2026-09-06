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
    <Container className="py-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-xl text-center"
      >
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', damping: 14 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald text-white"
        >
          <Icon name="check" size={30} strokeWidth={2.6} />
        </motion.span>

        <h1 className="mt-7 text-[clamp(1.9rem,3.6vw,2.6rem)]">Order placed</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-50">
          Your order <span className="font-mono font-semibold text-ink">{orderId}</span> is
          confirmed. The trace record for every item is already attached — you can open
          it any time from your orders.
        </p>

        {state?.total != null && (
          <dl className="mx-auto mt-8 grid max-w-sm grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <div className="bg-white px-4 py-3">
              <dt className="eyebrow !text-[9.5px]">Items</dt>
              <dd className="tnum mt-1 text-[15px] font-bold">{state.count}</dd>
            </div>
            <div className="bg-white px-4 py-3">
              <dt className="eyebrow !text-[9.5px]">Paid via</dt>
              <dd className="mt-1 text-[15px] font-bold">{state.pay}</dd>
            </div>
            <div className="bg-white px-4 py-3">
              <dt className="eyebrow !text-[9.5px]">Total</dt>
              <dd className="tnum mt-1 text-[15px] font-bold">{money(state.total)}</dd>
            </div>
          </dl>
        )}

        <div className="mt-10 rounded-lg border border-line bg-white p-7 text-left">
          <p className="eyebrow mb-5">What happens next</p>
          <ol className="space-y-4">
            {STAGES.slice(1).map((s, i) => (
              <li key={s.code} className="flex gap-3.5">
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                    i === 0 ? 'border-emerald bg-emerald text-white' : 'border-line text-ink-35'
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
