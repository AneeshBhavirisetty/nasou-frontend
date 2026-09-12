import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from './Icon';
import ProductArt from './ProductArt';
import { Rating } from './ui';
import { categoryName } from '../data/catalog';
import { money, discount as pctOff, cx } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

/* NasouHive demo product card: image on a mist bed with a forest badge chip
   and a round wishlist button, then category · name · rating · price with a
   square forest add button. Lifts on hover, image zooms. */
export default function ProductCard({ product, compact = false }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);
  const out = product.stock <= 0;
  const low = !out && product.stock <= 8;
  const off = pctOff(product.price, product.mrp);
  const to = `/product/${product.id}`;
  const badge = product.badges[0];

  return (
    <motion.article
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-white/75 bg-white shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="relative">
        <Link to={to} className="block" aria-label={product.title}>
          <div className={cx('photo-bed relative overflow-hidden', compact ? 'aspect-square' : 'aspect-[4/3]')}>
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <ProductArt
                kind={product.art}
                material={product.material}
                title={product.title}
                className="absolute inset-0 h-full w-full p-6 transition duration-500 group-hover:scale-105"
              />
            )}
          </div>
        </Link>

        {badge && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-forest px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
            {badge}
          </span>
        )}

        <button
          onClick={() => wishlist.toggle(product.id)}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={saved}
          className={cx(
            'absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white/90 shadow-sm transition hover:scale-105',
            saved ? 'text-clay' : 'text-forest'
          )}
        >
          <Icon name="heart" size={16} fill={saved ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>

        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-70">
          {product.sku}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-ink-50">
          {categoryName(product.category)} · {product.size || 'standard'}
        </p>
        <h3 className="mt-1 text-[15px] font-semibold leading-snug text-ink sm:text-base">
          <Link to={to} className="line-clamp-2 transition hover:text-forest">{product.name}</Link>
        </h3>
        {product.rating > 0 && (
          <Rating value={product.rating} count={product.reviewCount} size={13} className="mt-2" />
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2">
              <p className="tnum text-lg font-semibold text-ink">{money(product.price)}</p>
              {off > 0 && <span className="text-[12px] font-bold text-emerald-700">{off}% off</span>}
            </div>
            {off > 0
              ? <p className="tnum text-[12px] text-ink-35 line-through">{money(product.mrp)}</p>
              : <p className="truncate text-[12px] capitalize text-ink-50">by {product.supplierName}</p>}
            <p className={cx('mt-1 text-[11.5px] font-semibold', out ? 'text-ink-35' : low ? 'text-amber' : 'text-emerald-700')}>
              {out ? 'Out of stock' : low ? `Only ${product.stock} left` : 'In stock'}
            </p>
          </div>
          <button
            onClick={() => !out && add(product, { qty: 1 })}
            disabled={out}
            aria-label={`Add ${product.name} to cart`}
            className={cx(
              'grid h-10 w-10 shrink-0 place-items-center rounded-md transition',
              out
                ? 'cursor-not-allowed bg-sunk text-ink-35'
                : 'bg-forest text-white shadow-btn hover:-translate-y-0.5 hover:bg-forest-800 active:translate-y-px'
            )}
          >
            <Icon name="plus" size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
