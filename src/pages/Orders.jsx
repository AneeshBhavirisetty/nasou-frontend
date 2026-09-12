import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import { Badge, Button, Container, Breadcrumbs } from '../components/ui';
import { products } from '../data/catalog';
import { useAuth } from '../context/AuthContext';
import { money, deliveryBy, cx } from '../lib/format';

/* Seeded sample order history so a signed-in demo account has something to show. */
function sampleOrders(seed = 7) {
  const pick = (i) => products[(i * 137 + seed * 11) % products.length];
  return [
    { id: 'NH-4821', status: 'Delivered', days: -12, lines: [pick(3), pick(9)] },
    { id: 'NH-4790', status: 'In transit', days: -3, lines: [pick(21), pick(48), pick(77)] },
    { id: 'NH-4756', status: 'Processing', days: -1, lines: [pick(105)] },
  ].map((o) => ({
    ...o,
    date: deliveryBy(o.days),
    total: o.lines.reduce((s, p) => s + p.price * (1 + (p.row % 3)), 0),
  }));
}

const STATUS_TONE = { Delivered: 'ok', 'In transit': 'slate', Processing: 'amber' };
/* Tracking steps, and how far each status has got along them. */
const FLOW = ['Placed', 'Processing', 'In transit', 'Delivered'];
const REACHED = { Processing: 1, 'In transit': 2, Delivered: 3 };

/* Layout follows the NasouHive demo "Your Orders": order list on the left,
   a live-tracking panel for the selected order on the right. */
export default function Orders() {
  const { user } = useAuth();
  const orders = useMemo(() => sampleOrders(), []);
  const [sel, setSel] = useState(orders[0].id);
  const o = orders.find((x) => x.id === sel) ?? orders[0];
  const reached = REACHED[o.status] ?? 0;

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'Orders' }]} />

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <h1 className="text-[clamp(1.5rem,4vw,1.75rem)] font-semibold text-ink">Your orders</h1>
          <p className="mt-1 text-[14px] text-ink-50">Track, reorder and download invoices · signed in as {user?.fullName || 'customer'}</p>

          <div className="mt-4 space-y-3">
            {orders.map((x) => (
              <button
                key={x.id}
                onClick={() => setSel(x.id)}
                aria-pressed={x.id === sel}
                className={cx(
                  'w-full rounded-[18px] border bg-white p-4 text-left shadow-sm transition hover:shadow-card',
                  x.id === sel ? 'border-forest' : 'border-white'
                )}
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{x.lines[0].name}{x.lines.length > 1 && <span className="font-medium text-ink-50"> +{x.lines.length - 1} more</span>}</p>
                    <p className="mt-1 font-mono text-[12px] text-ink-50">{x.id}</p>
                  </div>
                  <Badge tone={STATUS_TONE[x.status]} className="h-fit shrink-0">{x.status}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-ink-50">
                    <span className="flex -space-x-2">
                      {x.lines.map((p) => (
                        <span key={p.id} className="photo-bed grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-white">
                          <ProductArt kind={p.art} material={p.material} className="h-full w-full p-0.5" />
                        </span>
                      ))}
                    </span>
                    Ordered {x.date}
                  </span>
                  <span className="tnum font-bold text-ink">{money(x.total)}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-35">
            <Icon name="clock" size={13} /> Sample history shown for the demo account.
          </p>
        </section>

        <AnimatePresence mode="wait">
          <motion.section
            key={o.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-fit rounded-[20px] bg-white p-5 shadow-card sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-50">Order tracking</p>
                <h2 className="mt-2 text-xl font-semibold text-ink">Order {o.id}</h2>
                <p className="mt-1 text-sm text-ink-50">Ordered {o.date} · {o.lines.length} item{o.lines.length !== 1 && 's'}</p>
              </div>
              <Badge tone={STATUS_TONE[o.status]} className="shrink-0">{o.status}</Badge>
            </div>

            <ol className="mt-8 grid grid-cols-4 gap-1">
              {FLOW.map((step, i) => (
                <li key={step} className="text-center">
                  <span className={cx('mx-auto grid h-9 w-9 place-items-center rounded-full text-xs font-bold', i <= reached ? 'bg-forest text-white' : 'bg-sunk text-ink-50')}>
                    {i < reached || reached === FLOW.length - 1 ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cx('mx-auto mt-2 block h-1 rounded-full', i <= reached ? 'bg-forest' : 'bg-sunk')} />
                  <span className="mt-2 block text-[10.5px] font-bold text-ink-50 sm:text-xs">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-7 rounded-[18px] border border-dashed border-[#cad8d2] bg-[#f4f7f5] p-4">
              <p className="text-sm font-bold text-ink">Items in this order</p>
              <ul className="mt-3 space-y-2.5">
                {o.lines.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-[14px] bg-white p-2.5">
                    <span className="photo-bed grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[12px]">
                      <ProductArt kind={p.art} material={p.material} className="h-full w-full p-1" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{p.name}</p>
                      <p className="text-[12px] text-ink-50">{p.sku} · {p.size || 'standard'}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-[#cad8d2] pt-3 text-sm">
                <span className="text-ink-50">Order total</span>
                <span className="tnum font-bold text-ink">{money(o.total)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon="external">Download invoice</Button>
              {o.status !== 'Delivered' && <Button size="sm" variant="ghost" icon="truck">Track</Button>}
              <Button size="sm" variant="ghost" icon="refresh">Reorder</Button>
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
    </Container>
  );
}
