import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import ProductArt from '../components/ProductArt';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import Marquee from '../components/Marquee';
import HomeHero from '../components/home/HomeHero';
import Accordion, { AccordionItem } from '../components/Accordion';
import { Container, Rating } from '../components/ui';
import { departments, bestsellers, dealProducts, newProducts, products, suppliers } from '../data/catalog';
import { testimonials, faqs, valueProps } from '../data/site';
import { useSettings } from '../store/settings';
import { useRetailers } from '../store/retailers';
import { cx } from '../lib/format';

/* Home, review 5 refresh: the reference's cream "cinematic" hero, banners
   managed in Content & settings, a category bento, the marketplace story
   (one cart, many counters, every part tracked), verified retailers, then
   the product rails. */

function Head({ label, title, note, to, cta = 'View all' }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {label && <p className="section-label">{label}</p>}
        <h2 className="font-hero mt-3 text-[clamp(1.6rem,3.6vw,2.4rem)] font-semibold leading-[1.05] text-forest">{title}</h2>
        {note && <p className="mt-2 text-[14.5px] leading-relaxed text-ink-50">{note}</p>}
      </div>
      {to && <Link to={to} className="group inline-flex items-center gap-1.5 rounded-full border border-forest/15 bg-white/70 px-4 py-2 text-[13px] font-bold text-forest transition hover:bg-white">{cta} <Icon name="arrowRight" size={14} className="transition group-hover:translate-x-0.5" /></Link>}
    </div>
  );
}


export default function Home() {
  const banners = useSettings((s) => s.banners);
  const featured = useSettings((s) => s.featured);
  const retailers = useRetailers();
  const active = banners.filter((b) => b.active);
  const sellers = retailers.filter((r) => r.status === 'approved');
  const counts = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.retailerId, (m.get(p.retailerId) || 0) + 1));
    return m;
  }, []);
  const bento = [...featured.map((slug) => departments.find((d) => d.slug === slug)).filter(Boolean), ...departments.filter((d) => !featured.includes(d.slug))];

  return (
    <Container className="space-y-14 pb-12 pt-4 sm:space-y-20 sm:pb-16 sm:pt-5">
      <HomeHero
        banners={active}
        stats={[
          { label: 'Verified retailers', value: sellers.length },
          { label: 'Live SKUs', value: `${(products.length / 1000).toFixed(1)}K` },
          { label: 'Brands', value: suppliers.length },
        ]}
      />

      {/* promises — why buy here */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {valueProps.map((v, i) => (
          <motion.div key={v.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className={cx('rounded-[22px] p-5 shadow-card', i === 1 ? 'mesh-forest text-white' : 'bg-white')}>
            <span className={cx('grid h-11 w-11 place-items-center rounded-[14px]', i === 1 ? 'bg-white text-forest' : 'bg-sand-50 text-forest')}><Icon name={v.icon} size={19} /></span>
            <p className={cx('mt-4 text-[15px] font-bold', i === 1 ? 'text-white' : 'text-forest')}>{v.title}</p>
            <p className={cx('mt-1 hidden text-[12.5px] leading-relaxed sm:block', i === 1 ? 'text-emerald-100' : 'text-ink-50')}>{v.body}</p>
          </motion.div>
        ))}
      </section>

      {/* category bento */}
      <section id="categories">
        <Head label="Shop by category" title="Everything a site needs, under one roof." note="Plumbing, electrical, agriculture, hardware, paints and more — sold by verified local counters." />
        <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[170px] sm:gap-4 lg:grid-cols-4">
          {bento.map((d, i) => {
            const big = i === 0;
            const wide = i === 1;
            return (
              <motion.div key={d.slug} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className={cx(big && 'col-span-2 row-span-2', wide && 'col-span-2')}>
                <Link to={`/shop?dept=${d.slug}`} className={cx('group relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] p-5 shadow-card', big ? 'mesh-forest text-white' : 'bg-white text-forest')}>
                  <span className={cx('grid h-11 w-11 place-items-center rounded-[14px]', big ? 'bg-white/15 text-white' : 'bg-sunk text-forest')}><Icon name={d.icon} size={20} /></span>
                  {d.slug === 'plumbing' ? (
                    <ProductArt kind="tee" material="PVC" className={cx('pointer-events-none absolute transition duration-700 group-hover:rotate-6 group-hover:scale-110', big ? '-right-6 bottom-0 h-[78%] w-[70%]' : '-right-3 -bottom-2 h-[90%] w-[55%]')} />
                  ) : (
                    <Icon name={d.icon} size={big ? 180 : 110} strokeWidth={0.8} className={cx('pointer-events-none absolute -bottom-6 -right-6 transition duration-700 group-hover:scale-110', big ? 'text-white/15' : 'text-forest/10')} />
                  )}
                  <div className="relative">
                    <p className={cx('font-hero font-semibold leading-tight', big ? 'text-[30px] text-white' : 'text-[18px]')}>{d.name}</p>
                    <p className={cx('mt-1 text-[12.5px]', big ? 'max-w-[260px] text-emerald-100' : 'text-ink-50')}>{big ? d.blurb : d.count ? `${d.count.toLocaleString('en-IN')} items` : 'Coming soon'}</p>
                    {big && <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-forest">{d.count.toLocaleString('en-IN')} items <Icon name="arrowRight" size={14} /></span>}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* bestsellers */}
      <section>
        <Head label="Moving fast" title="Bestselling this month" note="What contractors are re-ordering across every seller." to="/shop?sort=rating" />
        <Reveal stagger={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {bestsellers.slice(0, 8).map((p) => <Reveal.Item key={p.id}><ProductCard product={p} /></Reveal.Item>)}
        </Reveal>
      </section>

      {/* how the marketplace works */}
      <section className="mesh-forest grain relative overflow-hidden rounded-[32px] px-6 py-10 text-white shadow-pop sm:px-12 sm:py-14">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-emerald-100">How Nivora works</p>
            <h2 className="font-hero mt-4 text-[clamp(1.9rem,4.5vw,3.2rem)] font-semibold leading-[1.02] text-white">One cart. Many counters. Every part tracked.</h2>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-emerald-100">Add fittings from different shops, pay once, and watch each seller pack and ship their part — with one GST invoice per order.</p>
            <Link to="/shop" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[14px] font-bold text-forest">Start shopping <Icon name="arrowRight" size={15} /></Link>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              ['cart', 'Fill one cart', 'Compare verified retailers on price, stock and dispatch time.'],
              ['card', 'Pay once', 'UPI, cards, net banking or cash on delivery. Razorpay splits it securely.'],
              ['truck', 'Track each part', 'Every seller ships their part; you see each one move to your site.'],
            ].map(([ic, t, d], k) => (
              <motion.li key={t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.1 }} className="rounded-[22px] border border-white/15 bg-white/[0.08] p-5 backdrop-blur">
                <span className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-[14px] bg-white text-forest"><Icon name={ic} size={19} /></span><span className="font-hero text-[34px] font-semibold text-white/20">0{k + 1}</span></span>
                <p className="mt-4 text-[16px] font-bold text-white">{t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-emerald-100">{d}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* verified retailers */}
      {sellers.length > 0 && (
        <section>
          <Head label="Verified retailers" title="Counters you can trust." note="Every store is checked — business, GST, PAN and bank — before it can sell." to="/sell" cta="Sell on Nivora" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sellers.map((r, k) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.06 }} className="flex items-center gap-4 rounded-[22px] bg-white p-4 shadow-card">
                <span className="font-hero grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-sand-50 text-[18px] font-semibold text-forest">{r.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[15px] font-bold text-ink">{r.name} <Icon name="shieldCheck" size={15} className="shrink-0 text-emerald-700" /></p>
                  <p className="text-[12.5px] text-ink-50">{r.city} · {(counts.get(r.id) || 0).toLocaleString('en-IN')} products · on Nivora since {new Date(r.joinedAt).getFullYear()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* deals */}
      {dealProducts.length > 0 && (
        <section>
          <Head label="Deals" title="The deepest markdowns right now" note="Verified prices — the discount is real, the MRP is on the box." to="/deals" cta="All deals" />
          <Reveal stagger={0.05} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
            {dealProducts.slice(0, 10).map((p) => <Reveal.Item key={p.id}><ProductCard product={p} compact /></Reveal.Item>)}
          </Reveal>
        </section>
      )}

      {/* new arrivals */}
      {newProducts.length > 0 && (
        <section>
          <Head label="Just in" title="New arrivals" note="Fresh additions from our retailers and brands." to="/shop?sort=new" />
          <Reveal stagger={0.05} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {newProducts.slice(0, 8).map((p) => <Reveal.Item key={p.id}><ProductCard product={p} /></Reveal.Item>)}
          </Reveal>
        </section>
      )}

      {/* brands */}
      <section className="rounded-[28px] border border-white/75 bg-white/60 px-4 py-9 shadow-card sm:px-8">
        <p className="section-label mx-auto mb-6 w-fit">Brands on the shelf</p>
        <Marquee items={suppliers.slice(0, 18)} render={(s) => <span className="font-hero text-[18px] font-semibold tracking-[-0.02em] text-ink-35 sm:text-[22px]">{s.name}</span>} />
      </section>

      {/* testimonials */}
      <section>
        <Head label="From the site" title="Not the brochure." note="What contractors say after the delivery lands." />
        <Reveal stagger={0.08} className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((t, k) => (
            <Reveal.Item key={t.name} className={cx('flex h-full flex-col rounded-[24px] p-6 shadow-card', k === 1 ? 'mesh-forest text-white' : 'bg-white')}>
              <Rating value={5} showValue={false} />
              <p className={cx('font-hero mt-4 flex-1 text-[17px] leading-snug', k === 1 ? 'text-white' : 'text-forest')}>“{t.quote}”</p>
              <div className={cx('mt-5 flex items-center gap-3 border-t pt-4', k === 1 ? 'border-white/15' : 'border-line')}>
                <span className={cx('grid h-10 w-10 place-items-center rounded-full text-[12px] font-black', k === 1 ? 'bg-white text-forest' : 'bg-forest text-white')}>{t.name[0]}</span>
                <div><p className={cx('text-[13px] font-bold', k === 1 ? 'text-white' : 'text-ink')}>{t.name}</p><p className={cx('text-[12px]', k === 1 ? 'text-emerald-100' : 'text-ink-50')}>{t.role}</p></div>
              </div>
            </Reveal.Item>
          ))}
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="section-label">Help &amp; support</p>
          <h2 className="font-hero mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-semibold text-forest">Questions, answered</h2>
          <p className="mt-2 max-w-sm text-[14px] text-ink-50">Delivery, GST, returns and trade pricing — the things contractors ask first.</p>
        </div>
        <Accordion>{faqs.map((f, i) => <AccordionItem key={i} title={f.q} defaultOpen={i === 0}>{f.a}</AccordionItem>)}</Accordion>
      </section>

      {/* sell CTA */}
      <section className="relative overflow-hidden rounded-[32px] bg-[#e9dcc9] px-6 py-10 sm:px-12">
        <div className="field-dots pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="section-label">For retailers</p>
            <h2 className="font-hero mt-3 text-[clamp(1.6rem,4vw,2.6rem)] font-semibold leading-[1.05] text-forest">Run a counter? Sell on Nivora and get paid every week.</h2>
          </div>
          <Link to="/sell" className="inline-flex w-fit items-center gap-2 rounded-full bg-forest px-7 py-4 text-[14.5px] font-bold text-white shadow-btn transition hover:-translate-y-0.5">Open your store <Icon name="arrowRight" size={16} /></Link>
        </div>
      </section>
    </Container>
  );
}
