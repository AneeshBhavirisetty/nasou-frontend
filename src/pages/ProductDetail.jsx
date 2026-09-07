import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductArt from '../components/ProductArt';
import ProductCard from '../components/ProductCard';
import TraceRail from '../components/TraceRail';
import Reveal from '../components/Reveal';
import Accordion, { AccordionItem } from '../components/Accordion';
import Tabs from '../components/Tabs';
import { Badge, Button, Container, Breadcrumbs, PriceTag, Rating, Stepper } from '../components/ui';
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
    <Container className="py-8 sm:py-10">
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: 'Home', to: '/' },
          { label: categoryName(product.category), to: `/shop?category=${product.category}` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* gallery */}
        <div>
          <div
            ref={tilt.ref}
            onMouseMove={tilt.onMouseMove}
            onMouseLeave={tilt.onMouseLeave}
            style={tilt.style}
            className="photo-bed overflow-hidden rounded-xl border border-line"
          >
            {gallery.length > 0 ? (
              <img src={gallery[shot]} alt={product.title} className="aspect-square w-full object-cover" />
            ) : (
              <ProductArt kind={product.art} material={product.material} title={product.title} className="aspect-square w-full p-10 sm:p-16" />
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {gallery.length > 0
              ? gallery.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setShot(i)}
                    aria-label={`View image ${i + 1}`}
                    className={cx(
                      'photo-bed grid aspect-square place-items-center overflow-hidden rounded-md border transition',
                      i === shot ? 'border-forest ring-2 ring-forest/20' : 'border-line hover:border-ink-35'
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))
              : ['front', 'socket', 'thread', 'pack'].map((v, i) => (
                  <div key={v} className="photo-bed grid aspect-square place-items-center rounded-md border border-line opacity-80">
                    <ProductArt kind={product.art} material={i === 3 ? 'PVC' : product.material} className="h-full w-full p-3" />
                  </div>
                ))}
          </div>
        </div>

        {/* buy box */}
        <div>
          <p className="eyebrow">{categoryName(product.category)} · {product.size || 'standard'}</p>
          <h1 className="mt-2 display-serif text-[clamp(1.7rem,4.5vw,2.6rem)]">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Rating value={product.rating} count={product.reviewCount} />
            <span className="text-ink-35">·</span>
            <span className="font-mono text-[12px] text-ink-50">SKU {product.sku}</span>
            {product.badges.map((b) => <Badge key={b} tone={b === 'Value' ? 'clay' : b === 'New' ? 'ok' : 'dark'}>{b}</Badge>)}
          </div>

          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-50">{product.description}</p>

          <div className="mt-6 rounded-xl border border-line bg-white p-5">
            <PriceTag price={product.price} mrp={product.mrp} size="lg" />
            <p className="mt-1 text-[12px] text-ink-35">Exclusive of GST · {off > 0 ? `you save ${money(product.mrp - product.price)}` : 'best price'}</p>

            <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold">
              {out ? (
                <span className="flex items-center gap-1.5 text-ink-35"><Icon name="clock" size={15} /> Out of stock</span>
              ) : (
                <span className={cx('flex items-center gap-1.5', low ? 'text-amber' : 'text-emerald-600')}>
                  <Icon name="check" size={15} strokeWidth={2.5} /> {low ? `Only ${product.stock} left` : 'In stock'} · dispatch {deliveryBy(1)}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Stepper value={qty} onChange={setQty} min={1} max={Math.max(1, Math.min(20, product.stock || 20))} />
              <span className="text-[12.5px] text-ink-50">
                {qty > 1 && <span className="tnum font-semibold text-ink">{money(product.price * qty)}</span>} {qty > 1 && 'total'}
              </span>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <Button onClick={addToCart} disabled={out} size="lg" variant="primary" icon="cart">Add to cart</Button>
              <Button onClick={buyNow} disabled={out} size="lg" variant="accent" iconRight="arrowRight">Buy now</Button>
            </div>
            <button
              onClick={() => wishlist.toggle(product.id)}
              className={cx('mt-2.5 flex w-full items-center justify-center gap-2 rounded-md border py-2.5 text-[13px] font-semibold transition',
                saved ? 'border-clay/30 bg-clay-50 text-clay-600' : 'border-line text-ink-70 hover:border-ink-35')}
            >
              <Icon name="heart" size={15} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Saved to wishlist' : 'Save to wishlist'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[['truck', 'Free over ₹999'], ['refresh', '7-day returns'], ['shieldCheck', 'GST invoice']].map(([ic, t]) => (
              <div key={t} className="rounded-md border border-line bg-white px-2 py-3">
                <Icon name={ic} size={16} className="mx-auto text-emerald-600" />
                <p className="mt-1.5 text-[11px] font-semibold text-ink-70">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* details tabs */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Tabs
          tabs={[
            {
              key: 'specs',
              label: 'Specifications',
              content: (
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
                  {specs.map(([k, v]) => (
                    <div key={k} className="bg-white p-3.5">
                      <dt className="eyebrow !text-[9px]">{k}</dt>
                      <dd className="mt-1 text-[13.5px] font-semibold capitalize">{v}</dd>
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
                    <div key={o.id} className={cx('flex items-center justify-between gap-3 rounded-md border p-3.5', o.best ? 'border-emerald bg-emerald-50/50' : 'border-line')}>
                      <div>
                        <p className="text-[13.5px] font-bold capitalize">{o.name} {o.best && <Badge tone="ok">Best price</Badge>}</p>
                        <p className="text-[12px] text-ink-50">{o.city} · {o.eta}</p>
                      </div>
                      <span className="tnum text-[15px] font-extrabold">{money(o.price)}</span>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'reviews',
              label: `Reviews (${product.reviewCount})`,
              content: (
                <div className="space-y-4">
                  {reviews.map((r, i) => (
                    <div key={i} className="border-b border-line pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold">{r.name}</span>
                        <span className="text-[11.5px] text-ink-35">{r.date}</span>
                      </div>
                      <Rating value={r.rating} showValue={false} size={12} className="mt-1" />
                      <p className="mt-1.5 text-[13px] text-ink-70">{r.text}</p>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />

        <div>
          <p className="eyebrow mb-4">Traceability</p>
          <div className="rounded-lg border border-line bg-white p-5">
            <TraceRail product={product} compact />
          </div>
          <Accordion className="mt-4">
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
        <div className="mt-14">
          <h2 className="display-serif text-[clamp(1.4rem,3.5vw,2rem)]">More in {categoryName(product.category)}</h2>
          <Reveal stagger={0.05} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => <Reveal.Item key={p.id}><ProductCard product={p} /></Reveal.Item>)}
          </Reveal>
        </div>
      )}
    </Container>
  );
}
