import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import { Badge, Button, Container, SectionHead } from '../components/ui';
import DemoValidation from '../components/DemoValidation';
import { categories, newProducts, products } from '../data/catalog';

export default function Home() {
  return <>
    <section className="border-b border-line bg-sunk"><Container className="grid gap-10 py-16 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
      <div><Badge tone="ok" icon="package">Plumbing catalogue</Badge><h1 className="mt-5 text-[clamp(2.4rem,5vw,4.4rem)]">Find the fitting<br />before the job stops.</h1><p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-50">Search Nasou&rsquo;s plumbing catalogue by SKU, material, size or supplier. Price and stock appear only after they have been verified.</p><div className="mt-8 flex flex-wrap gap-3"><Button to="/shop" size="lg" iconRight="arrowRight">Browse products</Button><Button to="/shop?category=pvc-fittings" size="lg" variant="outline">PVC fittings</Button></div></div>
      <div className="rounded-xl border border-line bg-white p-7 shadow-card"><p className="eyebrow">Catalogue coverage</p><dl className="mt-6 grid grid-cols-2 gap-5">{categories.slice(0,4).map((c)=><div key={c.slug} className="rounded-lg bg-canvas p-4"><dt className="tnum text-[22px] font-extrabold">{c.count}+</dt><dd className="mt-1 text-[13px] text-ink-50">{c.name}</dd></div>)}</dl><p className="mt-6 flex gap-2 text-[13px] leading-relaxed text-ink-50"><Icon name="shield" size={16} className="shrink-0 text-emerald-600"/>Prices and stock are controlled by the backend, never the browser.</p></div>
    </Container></section>
    <Container className="py-16"><SectionHead eyebrow="Browse" title="Shop by product family" note="Material and size are kept with every item record." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{categories.map((c)=><Link key={c.slug} to={`/shop?category=${c.slug}`} className="rounded-lg border border-line bg-white p-5 transition hover:-translate-y-1 hover:border-emerald hover:shadow-card"><Icon name="package" className="text-emerald-600"/><h2 className="mt-6 text-[17px]">{c.name}</h2><p className="mt-2 text-[13px] text-ink-50">{c.blurb}</p></Link>)}</div></Container>
    <Container className="pb-16"><SectionHead eyebrow="Catalogue preview" title="Recent plumbing records" note={`${products.length} representative SKUs shown from the imported workbook.`} action={<Button to="/shop" variant="ghost" size="sm">View all</Button>} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{newProducts.map((product)=><motion.div key={product.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><ProductCard product={product}/></motion.div>)}</div></Container>

<section className="mt-16">
  <Container>
    <DemoValidation />
  </Container>
</section>
  </>;
}
