import { useParams, Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import { Badge, Button, Container } from '../components/ui';
import { findOrder, formatOrderDate } from '../data/orders';
import { brand } from '../data/site';
import { money } from '../lib/format';

/* Printable GST invoice — the target of the invoice links in the Excel export. */
export default function Invoice() {
  const { id } = useParams();
  const order = findOrder(id);

  if (!order) {
    return (
      <Container className="flex min-h-[60dvh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-pop">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber">
            <Icon name="fileText" size={24} />
          </span>
          <h1 className="mt-5 text-[22px] font-semibold text-ink">Invoice not found</h1>
          <p className="mt-2 text-[13.5px] text-ink-50">
            No order matches <span className="font-mono">{id}</span>.
          </p>
          <div className="mt-6"><Button to="/orders" iconRight="arrowRight">Your orders</Button></div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-50 transition hover:text-ink">
          <Icon name="arrowLeft" size={14} /> Back to orders
        </Link>
        <Button size="sm" icon="fileText" onClick={() => window.print()}>Print / save PDF</Button>
      </div>

      <article className="mx-auto max-w-3xl rounded-[24px] border border-white/80 bg-white p-6 shadow-card sm:p-10 print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <span className="text-forest"><Logo /></span>
            <p className="mt-3 max-w-[16rem] text-[12px] leading-relaxed text-ink-50">{brand.address}</p>
            <p className="mt-1 text-[12px] text-ink-50">GSTIN {brand.gst}</p>
            <p className="text-[12px] text-ink-50">{brand.phone} · {brand.email}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Tax invoice</p>
            <p className="mt-1 font-mono text-[20px] font-bold">{order.id}</p>
            <p className="mt-1 text-[12.5px] text-ink-50">{formatOrderDate(order.createdAt)}</p>
            <div className="mt-2 flex justify-end">
              <Badge tone={order.status === 'Delivered' ? 'ok' : order.status === 'Cancelled' ? 'clay' : 'slate'}>
                {order.status}
              </Badge>
            </div>
          </div>
        </header>

        <div className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Billed to</p>
            <p className="text-[14px] font-bold">{order.customer}</p>
            <p className="text-[13px] text-ink-50">{order.email}</p>
            <p className="text-[13px] text-ink-50">+91 {order.phone}</p>
            <p className="text-[13px] text-ink-50">{order.city} — {order.pin}</p>
          </div>
          <div className="sm:text-right">
            <p className="eyebrow mb-2">Payment</p>
            <p className="text-[14px] font-bold">{order.payment}</p>
            <p className="text-[13px] text-ink-50">{order.items} items · {order.lines.length} lines</p>
          </div>
        </div>

        <div className="overflow-x-auto py-6">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-ink-35">
                <th className="pb-2">Item</th>
                <th className="pb-2">SKU</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr key={i} className="border-b border-line-soft">
                  <td className="py-2.5 text-[13px] font-semibold">
                    {l.name}
                    {l.size && <span className="font-normal text-ink-50"> · {l.size}</span>}
                  </td>
                  <td className="py-2.5 font-mono text-[12px] text-ink-50">{l.sku}</td>
                  <td className="tnum py-2.5 text-right text-[13px]">{l.qty}</td>
                  <td className="tnum py-2.5 text-right text-[13px]">{money(l.price)}</td>
                  <td className="tnum py-2.5 text-right text-[13px] font-semibold">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-[13.5px]">
            <div className="flex justify-between"><dt className="text-ink-50">Subtotal</dt><dd className="tnum font-semibold">{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-50">GST (18%)</dt><dd className="tnum font-semibold">{money(order.gst)}</dd></div>
            <div className="flex justify-between">
              <dt className="text-ink-50">Delivery</dt>
              <dd className="tnum font-semibold">{order.shipping === 0 ? <span className="text-emerald-600">Free</span> : money(order.shipping)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="text-[15px] font-bold">Total</dt>
              <dd className="tnum text-[22px] font-extrabold">{money(order.total)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-8 border-t border-line pt-5 text-[11.5px] leading-relaxed text-ink-35">
          Computer-generated invoice — valid without signature. Goods once sold may be returned within
          7 days if unused and in original packaging. Subject to Hyderabad jurisdiction.
        </footer>
      </article>
    </Container>
  );
}
