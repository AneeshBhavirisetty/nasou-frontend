import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import ProductArt from '../components/ProductArt';
import Reveal from '../components/Reveal';
import Marquee from '../components/Marquee';
import StatTile from '../components/StatTile';
import Accordion, { AccordionItem } from '../components/Accordion';
import HeroStage from '../components/hero/HeroStage';
import { Badge, Button, Container, Rating } from '../components/ui';
import { categories, bestsellers, dealProducts, products, suppliers } from '../data/catalog';
import { brand, valueProps, testimonials, faqs } from '../data/site';
import { useMagnetic } from '../lib/motion';

function HeroSearch() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop'); }}
      className="mt-7 flex w-full max-w-md items-center gap-2 rounded-full border border-line bg-white p-1.5 shadow-card"
    >
      <Icon name="search" size={17} className="ml-2.5 shrink-0 text-ink-35" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Try “3/4 cpvc elbow” or a SKU"
        aria-label="Search the catalogue"
        className="h-9 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-35"
      />
      <Button type="submit" size="sm" className="shrink-0 rounded-full px-4">Search</Button>
    </form>
  );
}

function MagneticCTA({ to, children, variant = 'primary' }) {
  const m = useMagnetic(0.25);
  return (
    <span ref={m.ref} onMouseMove={m.onMouseMove} onMouseLeave={m.onMouseLeave} style={m.style} className="inline-block">
      <Button to={to} size="lg" variant={variant} iconRight="arrowRight">{children}</Button>
    </span>
  );
}

export default function Home() {
  const catArt = { 'pvc-fittings': 'tee', 'cpvc-fittings': 'elbow', 'upvc-fittings': 'coupling', 'pvc-pipes': 'pipe', 'cpvc-pipes': 'pipe', 'upvc-pipes': 'pipe', 'plumbing-accessories': 'valve' };
  const catMat = { 'pvc-fittings': 'PVC', 'cpvc-fittings': 'cPVC', 'upvc-fittings': 'uPVC', 'pvc-pipes': 'PVC', 'cpvc-pipes': 'cPVC', 'upvc-pipes': 'uPVC', 'plumbing-accessories': 'PVC' };

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line bg-sunk">
        <div className="field-dots absolute inset-0 opacity-60" />
        <Container className="relative grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-6 lg:py-24">
          <div className="flex flex-col justify-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <Badge tone="ok" icon="droplet">Plumbing supplies · {products.length.toLocaleString('en-IN')} SKUs</Badge>
              <h1 className="mt-4 display-serif text-[clamp(2.3rem,7vw,4.2rem)]">
                Find the fitting<br />before the job stops.
              </h1>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-50 sm:text-[16px]">
                {brand.promise}
              </p>
            </motion.div>

            <HeroSearch />

            <div className="mt-7 flex flex-wrap gap-3">
              <MagneticCTA to="/shop">Browse the catalogue</MagneticCTA>
              <Button to="/deals" size="lg" variant="outline">This week&rsquo;s deals</Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-ink-50">
              <span className="flex items-center gap-1.5"><Icon name="shieldCheck" size={15} className="text-emerald-600" /> Verified pricing</span>
              <span className="flex items-center gap-1.5"><Icon name="truck" size={15} className="text-emerald-600" /> Same-day dispatch</span>
              <span className="flex items-center gap-1.5"><Icon name="tag" size={15} className="text-emerald-600" /> GST invoice</span>
            </div>
          </div>

          <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-[440px]">
            <HeroStage className="absolute inset-0" />
          </div>
        </Container>
      </section>

      {/* ── Categories ────────────────────────────────────────────────── */}
      <Container className="py-12 sm:py-16">
        <Reveal><h2 className="display-serif text-[clamp(1.5rem,4vw,2.3rem)]">Shop by product family</h2></Reveal>
        <Reveal stagger={0.06} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Reveal.Item key={c.slug}>
              <Link
                to={`/shop?category=${c.slug}`}
                className="group flex h-full flex-col rounded-lg border border-line bg-white p-4 transition hover:-translate-y-1 hover:border-emerald hover:shadow-card"
              >
                <div className="photo-bed mb-3 aspect-[4/3] overflow-hidden rounded-md">
                  <ProductArt kind={catArt[c.slug]} material={catMat[c.slug]} className="h-full w-full p-4 transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h3 className="text-[14px] font-bold sm:text-[15px]">{c.name}</h3>
                <p className="mt-1 line-clamp-2 text-[12px] text-ink-50">{c.blurb}</p>
                <span className="tnum mt-auto pt-2 text-[11.5px] font-semibold text-emerald-600">{c.count} products →</span>
              </Link>
            </Reveal.Item>
          ))}
        </Reveal>
      </Container>

      {/* ── Bestsellers rail ──────────────────────────────────────────── */}
      <div className="border-y border-line bg-canvas">
        <Container className="py-12 sm:py-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Moving fast</p>
              <h2 className="display-serif text-[clamp(1.5rem,4vw,2.3rem)]">Bestselling fittings</h2>
            </div>
            <Button to="/shop?sort=rating" variant="ghost" size="sm" iconRight="arrowRight">View all</Button>
          </div>
          <div className="no-bar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {bestsellers.map((p) => (
              <div key={p.id} className="w-[230px] shrink-0 snap-start sm:w-[248px]">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── Stats band ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-forest text-white">
        <div className="field-dots-dark absolute inset-0 opacity-70" />
        <Container className="relative py-12 sm:py-16">
          <Reveal><h2 className="display-serif text-[clamp(1.5rem,4vw,2.2rem)] text-white">A counter that keeps its word</h2></Reveal>
          <Reveal stagger={0.08} className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Reveal.Item><StatTile dark icon="package" value={products.length} suffix="+" label="Live SKUs" note="from the supplier workbook" /></Reveal.Item>
            <Reveal.Item><StatTile dark icon="layers" value={suppliers.length} label="Brands stocked" note="Astral, Ashirvad, Finolex…" /></Reveal.Item>
            <Reveal.Item><StatTile dark icon="wrench" value={categories.length} label="Product families" note="PVC · uPVC · cPVC" /></Reveal.Item>
            <Reveal.Item><StatTile dark icon="truck" value={1} prefix="< " suffix=" day" label="Metro dispatch" note="same-day on stock before 2pm" /></Reveal.Item>
          </Reveal>
        </Container>
      </section>

      {/* ── Value props ───────────────────────────────────────────────── */}
      <Container className="py-12 sm:py-16">
        <Reveal><SectionEyebrow eyebrow={`Since ${brand.since}`} title="Why contractors keep the tab open" /></Reveal>
        <Reveal stagger={0.07} className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => (
            <Reveal.Item key={v.title} className="rounded-lg border border-line bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-600">
                <Icon name={v.icon} size={18} />
              </span>
              <h3 className="mt-4 text-[15px] font-bold">{v.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-50">{v.body}</p>
            </Reveal.Item>
          ))}
        </Reveal>
      </Container>

      {/* ── Deals rail ────────────────────────────────────────────────── */}
      {dealProducts.length > 0 && (
        <div className="border-y border-line bg-canvas">
          <Container className="py-12 sm:py-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-2 text-clay">Limited</p>
                <h2 className="display-serif text-[clamp(1.5rem,4vw,2.3rem)]">Best discounts right now</h2>
              </div>
              <Button to="/deals" variant="ghost" size="sm" iconRight="arrowRight">All deals</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {dealProducts.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </Container>
        </div>
      )}

      {/* ── Supplier marquee ──────────────────────────────────────────── */}
      <Container className="py-10 sm:py-14">
        <p className="eyebrow mb-5 text-center">Brands on the shelf</p>
        <Marquee
          items={suppliers.slice(0, 18)}
          render={(s) => (
            <span className="font-serif text-[17px] font-semibold text-ink-35 sm:text-[20px]">{s.name}</span>
          )}
        />
      </Container>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <div className="border-y border-line bg-canvas">
        <Container className="py-12 sm:py-16">
          <Reveal><h2 className="display-serif text-[clamp(1.5rem,4vw,2.3rem)]">From the site, not the brochure</h2></Reveal>
          <Reveal stagger={0.08} className="mt-7 grid gap-4 lg:grid-cols-3">
            {testimonials.map((t) => (
              <Reveal.Item key={t.name} className="flex flex-col rounded-lg border border-line bg-white p-5">
                <Rating value={5} showValue={false} />
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-70">“{t.quote}”</p>
                <p className="mt-4 text-[13px] font-bold">{t.name}</p>
                <p className="text-[12px] text-ink-50">{t.role}</p>
              </Reveal.Item>
            ))}
          </Reveal>
        </Container>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <Container className="py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal><h2 className="display-serif text-[clamp(1.5rem,4vw,2.3rem)]">Questions,<br />answered</h2></Reveal>
          <Reveal>
            <Accordion>
              {faqs.map((f, i) => <AccordionItem key={i} title={f.q} defaultOpen={i === 0}>{f.a}</AccordionItem>)}
            </Accordion>
          </Reveal>
        </div>
      </Container>

      {/* ── CTA band ──────────────────────────────────────────────────── */}
      <section className="bg-forest text-white">
        <Container className="flex flex-col items-start gap-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
          <div>
            <h2 className="display-serif text-[clamp(1.6rem,4vw,2.4rem)] text-white">Open the catalogue.</h2>
            <p className="mt-2 text-[14px] text-white/60">1,400+ fittings, real prices, one cart.</p>
          </div>
          <Button to="/shop" size="lg" variant="emerald" iconRight="arrowRight">Start shopping</Button>
        </Container>
      </section>
    </>
  );
}

function SectionEyebrow({ eyebrow, title }) {
  return (
    <div>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="display-serif text-[clamp(1.5rem,4vw,2.3rem)]">{title}</h2>
    </div>
  );
}
