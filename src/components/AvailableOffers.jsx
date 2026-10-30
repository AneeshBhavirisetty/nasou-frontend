import { useEffect, useState } from 'react';
import Icon from './Icon';
import { get } from '../lib/api';
import { LIVE } from '../lib/config';
import { categoryName, departmentName } from '../data/catalog';
import { money } from '../lib/format';

/* The discount codes that fit this cart (client review 7, customer 18: "the
   customer cannot see the coupons given by the retailer and the Super Admin").
   LIVE they come from GET /storefront/offers; the demo uses the admin store's
   codes. Tapping Apply runs the same path as typing the code — the price is
   always the server's quote. */

const inScope = (p, scope) => !scope || (scope.startsWith('dept:') ? p.department === scope.slice(5) : p.category === scope);

/* does this offer cover at least one line of the cart? */
export function offerFits(o, items) {
  return items.some(({ product: p }) =>
    (!o.retailerId || p.retailerId === o.retailerId)
    && (!o.productSkus?.length || o.productSkus.includes(p.sku))
    && inScope(p, o.scope));
}

const what = (o) => (o.kind === 'percent' ? `${Number(o.value)}% off` : `${money(o.value)} off`);
const where = (o) => {
  const on = o.productSkus?.length ? `${o.productSkus.length} selected product${o.productSkus.length === 1 ? '' : 's'}`
    : o.scope?.startsWith('dept:') ? `all ${departmentName(o.scope.slice(5))}`
      : o.scope ? categoryName(o.scope) : o.retailerId ? 'all their products' : 'your whole order';
  return o.retailerName ? `From ${o.retailerName} · on ${on}` : `Nivorva offer · on ${on}`;
};

export default function AvailableOffers({ items, fallback = [], onApply, current }) {
  const [list, setList] = useState(LIVE ? null : fallback);
  useEffect(() => {
    if (!LIVE) return undefined;
    let live = true;
    get('/storefront/offers').then((r) => live && setList(r)).catch(() => live && setList([]));
    return () => { live = false; };
  }, []);

  const fits = (list || []).filter((o) => offerFits(o, items)).sort((a, b) => Number(b.value) - Number(a.value));
  if (!fits.length) return null;

  return (
    <div className="mt-3 rounded-[16px] border border-dashed border-forest/30 bg-emerald-50/40 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-forest"><Icon name="tag" size={12} /> Offers for this order · {fits.length}</p>
      <ul className="space-y-2">
        {fits.map((o) => (
          <li key={o.code} className="flex items-center gap-3 rounded-[12px] bg-white px-3 py-2.5 shadow-[0_4px_12px_rgba(37,88,73,0.06)]">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-dashed border-forest/40 px-1.5 py-0.5 font-mono text-[11.5px] font-bold text-forest">{o.code}</span>
                <b className="text-[13px] text-ink">{what(o)}</b>
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-50">
                {where(o)}{Number(o.minOrder) > 0 ? ` · min ${money(o.minOrder)}` : ''}{Number(o.maxDiscount) > 0 ? ` · up to ${money(o.maxDiscount)}` : ''}
              </span>
            </span>
            {current === o.code
              ? <span className="shrink-0 text-[12px] font-bold text-emerald-700">Applied</span>
              : <button type="button" onClick={() => onApply(o.code)} className="shrink-0 rounded-full bg-forest px-3.5 py-1.5 text-[12px] font-bold text-white shadow-btn transition hover:-translate-y-0.5">Apply</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
