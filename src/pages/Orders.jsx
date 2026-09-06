import { useMemo } from 'react';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import { Badge, Button, Container, Breadcrumbs } from '../components/ui';
import { products } from '../data/catalog';
import { useAuth } from '../context/AuthContext';
import { money, deliveryBy } from '../lib/format';

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

export default function Orders() {
  const { user } = useAuth();
  const orders = useMemo(() => sampleOrders(), []);

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs className="mb-5" items={[{ label: 'Home', to: '/' }, { label: 'Orders' }]} />
      <h1 className="display-serif text-[clamp(1.7rem,4vw,2.6rem)]">Your orders</h1>
      <p className="mt-2 text-[13.5px] text-ink-50">Signed in as {user?.fullName || 'customer'}</p>

      <div className="mt-7 space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border border-line bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-bold">{o.id}</span>
                <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
              </div>
              <span className="text-[12px] text-ink-50">Ordered {o.date}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex -space-x-2">
                {o.lines.map((p) => (
                  <span key={p.id} className="photo-bed grid h-11 w-11 place-items-center overflow-hidden rounded-md border-2 border-white">
                    <ProductArt kind={p.art} material={p.material} className="h-full w-full p-1" />
                  </span>
                ))}
              </div>
              <span className="text-[13px] text-ink-70">{o.lines.length} item{o.lines.length !== 1 && 's'}</span>
              <span className="ml-auto tnum text-[15px] font-extrabold">{money(o.total)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon="external">Download invoice</Button>
              {o.status !== 'Delivered' && <Button size="sm" variant="ghost" icon="truck">Track</Button>}
              <Button size="sm" variant="ghost" icon="refresh">Reorder</Button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-center gap-2 text-[12px] text-ink-35">
        <Icon name="clock" size={13} /> Sample history shown for the demo account.
      </p>
    </Container>
  );
}
