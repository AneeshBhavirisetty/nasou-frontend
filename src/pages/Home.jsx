import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import ProductArt from '../components/ProductArt';
import Reveal from '../components/Reveal';
import Marquee from '../components/Marquee';
import StatTile from '../components/StatTile';
import HeroCarousel from '../components/HeroCarousel';
import Accordion, { AccordionItem } from '../components/Accordion';
import { Container, Rating, SectionHead } from '../components/ui';
import { categories, bestsellers, dealProducts, products, suppliers } from '../data/catalog';
import { brand, valueProps, testimonials, faqs } from '../data/site';

/* Home follows the NasouHive demo customer home: campaign carousel, product
   rails, photo-style category tiles, a dark "flash deals" panel beside a
   white summary card, then supporting sections — all with our content. */

const CAT_ART = { 'pvc-fittings': 'tee', 'cpvc-fittings': 'elbow', 'upvc-fittings': 'coupling', 'pvc-pipes': 'pipe', 'cpvc-pipes': 'pipe', 'upvc-pipes': 'pipe', 'plumbing-accessories': 'valve' };
const CAT_MAT = { 'pvc-fittings': 'PVC', 'cpvc-fittings': 'cPVC', 'upvc-fittings': 'uPVC', 'pvc-pipes': 'PVC', 'cpvc-pipes': 'cPVC', 'upvc-pipes': 'uPVC', 'plumbing-accessories': 'PVC' };

const SLIDES = [
  {
    id: 'catalogue',
    label: `Plumbing supplies · ${products.length.toLocaleString('en-IN')} SKUs`,
    heading: 'Find the fitting before the job stops.',
    sub: brand.promise,
    primary: { label: 'Browse the catalogue', to: '/shop' },
    secondary: { label: 'This week’s deals', to: '/deals' },
    points: [
      { icon: 'shieldCheck', label: 'Verified pricing' },
      { icon: 'truck', label: 'Same-day dispatch' },
      { icon: 'tag', label: 'GST invoice' },
    ],
    art: '3d',
  },
  {
    id: 'deals',
    label: 'This week',
    heading: 'Up to 30% off fast-moving PVC fittings.',
    sub: 'Verified prices, GST invoice, same-day dispatch on stock.',
    primary: { label: 'Shop the deals', to: '/deals' },
    secondary: { label: 'PVC fittings', to: '/shop?category=pvc-fittings' },
    art: { kind: 'tee', material: 'PVC' },
  },
  {
    id: 'cpvc',
    label: 'cPVC fittings',
    heading: 'Hot-water rated cPVC for concealed plumbing.',
    sub: 'SDR-11 cPVC pipe rated for 93°C hot water, with the fittings to match.',
    primary: { label: 'Shop cPVC fittings', to: '/shop?category=cpvc-fittings' },
    secondary: { label: 'cPVC pipes', to: '/shop?category=cpvc-pipes' },
    art: { kind: 'elbow', material: 'cPVC' },
  },
  {
    id: 'dispatch',
    label: 'Same-day dispatch',
    heading: 'Ordered before 2pm, on its way today.',
    sub: valueProps[2].body,
    primary: { label: 'Start shopping', to: '/shop' },
    secondary: { label: 'Track an order', to: '/orders' },
    art: { kind: 'valve', material: 'PVC' },
  },
  {
    id: 'trade',
    label: 'Trade & bulk buyers',
    heading: 'Slab pricing on orders above ₹25,000.',
    sub: faqs[3].a,
    primary: { label: 'Enquire now', to: '/enquiry' },
    secondary: { label: 'Contact us', to: '/contact' },
    art: { kind: 'coupling', material: 'uPVC' },
  },
];

const inStock = products.filter((p) => p.stock > 0).length;

export default function Home() {
  return (
    <Container className="space-y-12 pb-14 pt-5 sm:space-y-14">
      <HeroCarousel slides={SLIDES} />

      {/* ── Bestsellers (demo: Recommended For You) ─────────────────────── */}
      <section>
        <SectionHead
          serif={false}
          title="Bestselling fittings"
          note="Moving fast across contractor orders this month"
          action={<Link to="/shop?sort=rating" className="shrink-0 text-[13px] font-bold text-forest hover:underline">View all</Link>}
        />
        <Reveal stagger={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {bestsellers.slice(0, 8).map((p) => (
            <Reveal.Item key={p.id}><ProductCard product={p} /></Reveal.Item>
          ))}
        </Reveal>
      </section>

      {/* ── Categories (demo: Shop by Category tiles) ──────────────────── */}
      <section id="categories">
        <SectionHead serif={false} title="Shop by product family" note="Every PVC, uPVC and cPVC family, from one counter" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {categories.map((c) => (
            <motion.div key={c.slug} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
              <Link
                to={`/shop?category=${c.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-[18px] text-left text-white shadow-card"
              >
                <span className="photo-bed absolute inset-0" />
                <ProductArt kind={CAT_ART[c.slug]} material={CAT_MAT[c.slug]} className="absolute inset-x-0 top-[6%] mx-auto h-[62%] w-[80%] transition duration-500 group-hover:scale-110" />
                <span className="absolute inset-0 bg-gradient-to-t from-[#173d33]/90 via-[#173d33]/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4">
                  <span className="block text-sm font-bold">{c.name}</span>
                  <span className="tnum mt-1 block text-[11px] text-white/75">{c.count} items</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Deals (demo: Trending Products) ────────────────────────────── */}
      {dealProducts.length > 0 && (
        <section>
          <SectionHead
            serif={false}
            title="Best discounts right now"
            note="Limited — the deepest verified markdowns in the catalogue"
            action={<Link to="/deals" className="shrink-0 text-[13px] font-bold text-forest hover:underline">All deals</Link>}
          />
          <Reveal stagger={0.05} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
            {dealProducts.slice(0, 10).map((p) => (
              <Reveal.Item key={p.id}><ProductCard product={p} compact /></Reveal.Item>
            ))}
          </Reveal>
        </section>
      )}

      {/* ── Store numbers (demo: Flash Deals panel + Rewards card) ────── */}
      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-[24px] bg-ink p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c9d7d2]">Since {brand.since}</p>
              <h2 className="mt-3 text-[clamp(1.6rem,4vw,1.9rem)] font-semibold text-white">A counter that keeps its word.</h2>
              <p className="mt-2 text-sm text-[#c9d7d2]">Real stock, real suppliers, real dispatch times.</p>
            </div>
            <Link to="/deals" className="w-fit shrink-0 rounded-md bg-white px-5 py-3 text-sm font-bold text-forest transition hover:-translate-y-0.5">Explore deals</Link>
          </div>
          <Reveal stagger={0.07} className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Reveal.Item><StatTile dark icon="package" value={products.length} suffix="+" label="Live SKUs" note="from the supplier workbook" /></Reveal.Item>
            <Reveal.Item><StatTile dark icon="layers" value={suppliers.length} label="Brands stocked" note="Astral, Ashirvad, Finolex…" /></Reveal.Item>
            <Reveal.Item><StatTile dark icon="wrench" value={categories.length} label="Product families" note="PVC · uPVC · cPVC" /></Reveal.Item>
            <Reveal.Item><StatTile dark icon="truck" value={1} prefix="< " suffix=" day" label="Metro dispatch" note="same-day on stock before 2pm" /></Reveal.Item>
          </Reveal>
        </div>

        <div className="flex flex-col rounded-[24px] border border-white/75 bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-50">Nasou catalogue</p>
          <p className="tnum mt-3 text-4xl font-semibold text-ink">{products.length.toLocaleString('en-IN')}</p>
          <p className="mt-1 text-sm text-ink-50">live SKUs · {suppliers.length} brands</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-sunk">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.round((inStock / products.length) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-forest"
            />
          </div>
          <p className="tnum mt-3 text-xs text-ink-50">{inStock.toLocaleString('en-IN')} in stock right now</p>
          <div className="mt-auto pt-6">
            <Link to="/shop" className="block w-full rounded-md bg-sunk px-4 py-3 text-center text-sm font-bold text-forest transition hover:bg-emerald-100/60">
              Browse the catalogue
            </Link>
          </div>
        </div>
      </section>

      {/* ── Value props ────────────────────────────────────────────────── */}
      <section>
        <SectionHead serif={false} title="Why contractors keep the tab open" note={`Serving plumbers and site teams since ${brand.since}`} />
        <Reveal stagger={0.07} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => (
            <Reveal.Item key={v.title} className="h-full rounded-[18px] border border-white/75 bg-white p-5 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-sunk text-forest">
                <Icon name={v.icon} size={19} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{v.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-50">{v.body}</p>
            </Reveal.Item>
          ))}
        </Reveal>
      </section>

      {/* ── Brands ─────────────────────────────────────────────────────── */}
      <section className="rounded-[24px] border border-white/75 bg-white/70 px-4 py-8 shadow-card sm:px-8">
        <p className="eyebrow mb-5 text-center">Brands on the shelf</p>
        <Marquee
          items={suppliers.slice(0, 18)}
          render={(s) => (
            <span className="text-[17px] font-bold tracking-[-0.02em] text-ink-35 sm:text-[20px]">{s.name}</span>
          )}
        />
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <section>
        <SectionHead serif={false} title="From the site, not the brochure" note="What contractors say after the delivery lands" />
        <Reveal stagger={0.08} className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Reveal.Item key={t.name} className="flex h-full flex-col rounded-[18px] border border-white/75 bg-white p-5 shadow-card">
              <Rating value={5} showValue={false} />
              <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-70">“{t.quote}”</p>
              <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-[12px] font-black text-white">{t.name[0]}</span>
                <div>
                  <p className="text-[13px] font-bold text-ink">{t.name}</p>
                  <p className="text-[12px] text-ink-50">{t.role}</p>
                </div>
              </div>
            </Reveal.Item>
          ))}
        </Reveal>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow mb-2">Help &amp; support</p>
          <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold text-ink">Questions, answered</h2>
          <p className="mt-2 max-w-sm text-[14px] text-ink-50">Delivery, GST, returns and trade pricing — the things contractors ask first.</p>
        </div>
        <Accordion>
          {faqs.map((f, i) => <AccordionItem key={i} title={f.q} defaultOpen={i === 0}>{f.a}</AccordionItem>)}
        </Accordion>
      </section>

      {/* ── CTA band ───────────────────────────────────────────────────── */}
      <section className="forest-band relative overflow-hidden rounded-[24px] px-6 py-9 text-white shadow-pop sm:px-10">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d5e5df]">Your next order</p>
            <h2 className="mt-2 text-[clamp(1.6rem,4vw,2.3rem)] font-semibold text-white">Open the catalogue.</h2>
            <p className="mt-2 text-[14px] text-sunk">1,400+ fittings, real prices, one cart.</p>
          </div>
          <Link to="/shop" className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3.5 text-sm font-bold text-forest shadow-lg transition hover:-translate-y-0.5">
            Start shopping <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </section>
    </Container>
  );
}
