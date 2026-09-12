import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import { Button, Container, Breadcrumbs } from '../components/ui';
import { useWishlist } from '../context/WishlistContext';
import { money } from '../lib/format';

/* NasouHive demo wishlist: forest banner, three stat cards, saved grid. */
export default function Wishlist() {
  const { items } = useWishlist();
  const value = items.reduce((s, p) => s + p.price, 0);
  const inStock = items.filter((p) => p.stock > 0).length;

  const stats = [
    { label: 'Total saved items', value: items.length, note: 'Curated by you', icon: 'heart' },
    { label: 'Wishlist value', value: money(value), note: 'Current combined price', icon: 'tag' },
    { label: 'Ready to ship', value: inStock, note: 'Saved items in stock now', icon: 'truck' },
  ];

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="forest-band relative overflow-hidden rounded-[24px] p-6 text-white shadow-pop sm:p-8"
      >
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d5e5df]">Your saved fittings</p>
            <h1 className="mt-2 text-[clamp(1.8rem,5vw,2.4rem)] font-semibold text-white">My wishlist</h1>
            <p className="mt-1 text-[14px] text-sunk">Products you&rsquo;ve saved for later.</p>
          </div>
          <Link to="/shop" className="w-fit rounded-md bg-white px-5 py-3 text-sm font-bold text-forest shadow-lg transition hover:-translate-y-0.5">
            Explore more products
          </Link>
        </div>
      </motion.section>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex items-start justify-between gap-3 rounded-[18px] border border-white/80 bg-white/80 p-4 shadow-card"
          >
            <div>
              <p className="text-[12.5px] font-semibold text-ink-70">{s.label}</p>
              <p className="tnum mt-2 text-[24px] font-semibold text-ink">{s.value}</p>
              <p className="mt-1 text-[11.5px] text-ink-50">{s.note}</p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-sunk text-forest"><Icon name={s.icon} size={18} /></span>
          </motion.div>
        ))}
      </div>

      <div className="mb-4 mt-8 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[clamp(1.3rem,3vw,1.6rem)] font-semibold text-ink">Saved products</h2>
          <p className="mt-1 text-[14px] text-ink-50">Prices and stock come straight from the catalogue.</p>
        </div>
        <span className="tnum shrink-0 rounded-full bg-sunk px-3 py-1 text-[12px] font-bold text-forest">{items.length} saved</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#cad8d2] bg-[#f4f7f5] py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-forest shadow-card"><Icon name="heart" size={24} /></span>
          <p className="mt-4 text-[18px] font-semibold text-ink">Nothing saved yet</p>
          <p className="mt-1.5 text-[13px] text-ink-50">Tap the heart on any product to keep it here.</p>
          <div className="mt-5"><Button to="/shop" iconRight="arrowRight">Browse the catalogue</Button></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </Container>
  );
}
