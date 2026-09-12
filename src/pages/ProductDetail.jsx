import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import ProductCard from '../components/ProductCard';
import TraceRail from '../components/TraceRail';
import Reveal from '../components/Reveal';
import Accordion, { AccordionItem } from '../components/Accordion';
import Tabs from '../components/Tabs';
import { Badge, Button, Container, Breadcrumbs, PriceTag, Rating, SectionHead, Stepper } from '../components/ui';
import { categoryName, findProduct, offersFor, relatedProducts } from '../data/catalog';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { money, discount, deliveryBy, cx } from '../lib/format';
import { usePointerTilt } from '../lib/motion';

/* deterministic pseudo-reviews from the product's own numbers */
function reviewsFor(p) {
  const names = ['Ravi K.', 'Suresh M.', 'Imran S.', 'Anil R.', 'Prakash V.', 'Naveen T.'];
  const blurbs = [
    'Exact fit, no leaks after a week of pressure. Packaging was intact.',
    'Good quality for the price. Threads are clean and true.',
    'Delivered next day. Matched the size chart exactly.',
    'Used 20 of these on a site job — consistent quality across the box.',
    'Slightly tight fit but that is what you want with solvent weld.',
  ];
  const n = Math.min(4, 2 + (p.row % 3));
  return Array.from({ length: n }).map((_, i) => ({
    name: names[(p.row + i) % names.length],
    rating: Math.max(3, Math.min(5, Math.round(p.rating) + ((i % 2) ? 0 : -1) + (i === 0 ? 1 : 0))),
    text: blurbs[(p.row + i) % blurbs.length],
    date: deliveryBy(-(7 + i * 9)),
  }));
}

export default function ProductDetail() {
  const { id } = useParams();
  const product = findProduct(id);
  const { add, setOpen } = useCart();
  const wishlist = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [shot, setShot] = useState(0);
  const gallery = product?.images ?? [];
  const tilt = usePointerTilt({ max: 6 });

  const offers = useMemo(() => (product ? offersFor(product) : []), [product]);
  const related = useMemo(() => (product ? relatedProducts(product, 8) : []), [product]);
  const reviews = useMemo(() => (product ? reviewsFor(product) : []), [product]);

  if (!product) return <Navigate to="/shop" replace />;

  const out = product.stock <= 0;
  const low = !out && product.stock <= 8;
  const saved = wishlist.has(product.id);
  const off = discount(product.price, product.mrp);

  const addToCart = () => {
    add(product, { qty });
    toast.success(`${qty} × ${product.name} added to cart`);
  };
  const buyNow = () => {
    add(product, { qty });
    setOpen(false);
    navigate('/checkout');
  };

  const specs = [
    ['Product code', product.sku],
    ['Material', product.material],
    ['Type', product.form.replace(/s$/, '')],
    ['Size', product.size || 'Standard'],
    ['Brand', product.supplierName],
    ['Category', categoryName(product.category)],
  ];

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: 'Home', to: '/' },
          { label: categoryName(product.category), to: `/shop?category=${product.category}` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        {/* gallery — demo 2×2 image grid */}
        <div>
          {gallery.length > 0 ? (
            <>
              <div
                ref={tilt.ref}
                onMouseMove={tilt.onMouseMove}
                onMouseLeave={tilt.onMouseLeave}
                style={tilt.style}
                className="photo-bed relative overflow-hidden rounded-[18px] border border-white/80 shadow-card"
              >
                <img src={gallery[shot]} alt={product.title} className="aspect-square w-full object-cover" />
                {product.badges[0] && <span className="absolute left-4 top-4 rounded-full bg-forest px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">{product.badges[0]}</span>}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {gallery.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setShot(i)}
                    aria-label={`View image ${i + 1}`}
                    className={cx(
                      'photo-bed grid aspect-square place-items-center overflow-hidden rounded-[14px] border-2 transition',
                      i === shot ? 'border-forest' : 'border-white/80 hover:border-forest/40'
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div
                ref={tilt.ref}
                onMouseMove={tilt.onMouseMove}
                onMouseLeave={tilt.onMouseLeave}
                style={tilt.style}
                className="photo-bed relative overflow-hidden rounded-[18px] border border-white/80 shadow-card"
              >
                <ProductArt kind={product.art} material={product.material} title={product.title} className="aspect-[4/5] w-full p-8 sm:p-10" />
                {product.badges[0] && <span className="absolute left-4 top-4 rounded-full bg-forest px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">{product.badges[0]}</span>}
              </div>
              {['socket', 'thread', 'pack'].map((v, i) => (
                <div key={v} className="photo-bed overflow-hidden rounded-[18px] border border-white/80">
                  <ProductArt kind={product.art} material={i === 2 ? 'PVC' : product.material} className={cx('aspect-[4/5] w-full p-8 sm:p-10', i === 0 && 'scale-x-[-1]')} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* buy box — demo info card */}
        <div>
          <div className="rounded-[24px] border border-white/80 bg-white p-6 shadow-card sm:p-7 lg:sticky lg:top-[136px]">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-ink-50">
              {product.supplierName} · {categoryName(product.category)}
            </p>
            <h1 className="mt-2 text-[clamp(1.6rem,4vw,2rem)] font-semibold leading-tight text-ink">{product.name}</h1>
            <p className="mt-3 text-[14.5px] leading-6 text-ink-50">{product.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-[12px] border border-line-soft px-3 py-2 text-[13px]">
                <span className="tnum font-bold text-ink">{product.rating.toFixed(1)}</span>
                <Icon name="star" size={14} fill="currentColor" className="text-amber-400" />
                <span className="h-4 w-px bg-line" />
                <span className="tnum text-ink-50">{product.reviewCount.toLocaleString('en-IN')} verified ratings</span>
              </span>
              <span className="rounded-[12px] border border-line-soft px-3 py-2 font-mono text-[12px] font-semibold text-ink-50">SKU {product.sku}</span>
              {product.badges.slice(1).map((b) => <Badge key={b} tone={b === 'Value' ? 'clay' : b === 'New' ? 'ok' : 'dark'}>{b}</Badge>)}
            </div>

            <div className="mt-5 border-t border-line-soft pt-5">
              <PriceTag price={product.price} mrp={product.mrp} size="lg" className="[&>span:first-child]:text-[32px]" />
              <p className="mt-1 text-[12.5px] font-bold text-emerald-700">
                Exclusive of GST · {off > 0 ? `you save ${money(product.mrp - product.price)}` : 'best price'}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold">
                {out ? (
                  <span className="flex items-center gap-1.5 text-ink-35"><Icon name="clock" size={15} /> Out of stock</span>
                ) : (
                  <span className={cx('flex items-center gap-1.5', low ? 'text-amber' : 'text-emerald-700')}>
                    <Icon name="check" size={15} strokeWidth={2.5} /> {low ? `Only ${product.stock} left` : 'In stock'} · dispatch {deliveryBy(1)}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink">Quantity</p>
                {qty > 1 && <p className="tnum text-[13px] text-ink-50"><span className="font-bold text-ink">{money(product.price * qty)}</span> total</p>}
              </div>
              <div className="mt-3">
                <Stepper value={qty} onChange={setQty} min={1} max={Math.max(1, Math.min(20, product.stock || 20))} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[1fr_auto] gap-3">
              <Button onClick={addToCart} disabled={out} size="lg" variant="primary" icon="cart">Add to cart</Button>
              <button
                onClick={() => wishlist.toggle(product.id)}
                aria-pressed={saved}
                className={cx('flex h-[52px] items-center justify-center gap-2 rounded-md border px-5 text-[14px] font-semibold transition',
                  saved ? 'border-clay/30 bg-clay-50 text-clay-600' : 'border-line bg-white text-forest hover:border-forest')}
              >
                <Icon name="heart" size={16} fill={saved ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline">{saved ? 'Saved' : 'Wishlist'}</span>
              </button>
            </div>
            <Button onClick={buyNow} disabled={out} size="lg" variant="mint" full className="mt-3" iconRight="arrowRight">Buy now</Button>

            <div className="mt-7">
              <p className="text-[16px] font-semibold text-ink">Delivery options</p>
              <div className="mt-3 divide-y divide-line-soft rounded-[16px] border border-line-soft">
                {[['truck', 'Free delivery over ₹999', 'Same-day dispatch on in-stock items before 2 PM'], ['refresh', '7-day returns', 'Unused fittings in original packaging'], ['shieldCheck', 'GST invoice', 'Input-credit-ready on every order']].map(([ic, t, d]) => (
                  <div key={t} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-sunk text-forest"><Icon name={ic} size={16} /></span>
                    <div>
                      <p className="text-[13.5px] font-bold text-ink">{t}</p>
                      <p className="text-[12px] text-ink-50">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* details */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-card sm:p-6">
          <Tabs
            tabs={[
              {
                key: 'specs',
                label: 'Specifications',
                content: (
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {specs.map(([k, v]) => (
                      <div key={k} className="rounded-[14px] bg-[#f4f7f5] p-3.5">
                        <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-50">{k}</dt>
                        <dd className="mt-1 text-[14px] font-semibold capitalize text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ),
              },
              {
                key: 'suppliers',
                label: `Offers (${offers.length})`,
                content: (
                  <div className="space-y-2.5">
                    {offers.map((o) => (
                      <div key={o.id} className={cx('flex items-center justify-between gap-3 rounded-[16px] border p-4', o.best ? 'border-forest bg-emerald-50/60' : 'border-line-soft')}>
                        <div>
                          <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold capitalize text-ink">{o.name} {o.best && <Badge tone="ok">Best price</Badge>}</p>
                          <p className="text-[12px] text-ink-50">{o.city} · {o.eta}</p>
                        </div>
                        <span className="tnum text-[16px] font-bold text-ink">{money(o.price)}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'reviews',
                label: `Reviews (${product.reviewCount})`,
                content: (
                  <div className="space-y-3">
                    {reviews.map((r, i) => (
                      <div key={i} className="rounded-[16px] bg-[#f4f7f5] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2.5 text-[13.5px] font-bold text-ink">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-[11px] font-black text-white">{r.name[0]}</span>
                            {r.name}
                          </span>
                          <span className="text-[11.5px] text-ink-35">{r.date}</span>
                        </div>
                        <Rating value={r.rating} size={12} className="mt-2" />
                        <p className="mt-1.5 text-[13.5px] leading-6 text-ink-70">{r.text}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-card">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-ink-50">Traceability</p>
            <div className="mt-4">
              <TraceRail product={product} compact />
            </div>
          </div>
          <Accordion>
            <AccordionItem title="Delivery & dispatch" defaultOpen>
              In-stock items ordered before 2 PM are dispatched the same working day from Hyderabad. Metro delivery next day; rest of India 2–5 days.
            </AccordionItem>
            <AccordionItem title="Returns">
              Unused fittings in original packaging can be returned within 7 days of delivery for a full refund of the item value.
            </AccordionItem>
            <AccordionItem title="Bulk & trade pricing">
              Slab pricing available on orders above ₹25,000. Sign in and contact us for a quote.
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-12">
          <SectionHead
            serif={false}
            title={`More in ${categoryName(product.category)}`}
            note="Similar size and price from the same product family"
            action={<Link to={`/shop?category=${product.category}`} className="shrink-0 text-[13px] font-bold text-forest hover:underline">View all</Link>}
          />
          <Reveal stagger={0.05} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => <Reveal.Item key={p.id}><ProductCard product={p} /></Reveal.Item>)}
          </Reveal>
        </section>
      )}
    </Container>
  );
}
