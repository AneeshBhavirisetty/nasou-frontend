import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from './Icon';
import ProductArt from './ProductArt';
import { Badge, PriceTag } from './ui';
import { categoryName } from '../data/catalog';
import { cx } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const BADGE_TONE = { New: 'ok', Bestseller: 'dark', Value: 'clay' };

export default function ProductCard({ product, compact = false }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);
  const out = product.stock <= 0;
  const low = !out && product.stock <= 8;
  const to = `/product/${product.id}`;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white transition-colors hover:border-ink-35/40 hover:shadow-lift"
    >
      <div className="relative">
        <Link to={to} className="block">
          <div className={cx('photo-bed relative overflow-hidden', compact ? 'aspect-square' : 'aspect-[5/4]')}>
            <ProductArt
              kind={product.art}
              material={product.material}
              title={product.title}
              className="absolute inset-0 h-full w-full p-6 transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {product.badges.slice(0, 2).map((b) => (
            <Badge key={b} tone={BADGE_TONE[b] || 'neutral'}>{b}</Badge>
          ))}
        </div>

        <button
          onClick={() => wishlist.toggle(product.id)}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={saved}
          className={cx(
            'absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full border bg-white/95 shadow-card backdrop-blur transition',
            saved ? 'border-clay/30 text-clay' : 'border-line text-ink-35 hover:text-ink'
          )}
        >
          <Icon name="heart" size={16} fill={saved ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>

        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-white/95 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-70 shadow-card">
          {product.sku}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="eyebrow mb-1.5 !text-[9.5px]">
          {categoryName(product.category)} · {product.size || 'standard'}
        </p>
        <h3 className="text-[14px] font-bold leading-snug sm:text-[15px]">
          <Link to={to} className="transition hover:text-emerald-600">{product.name}</Link>
        </h3>
        <p className="mt-1 text-[12px] text-ink-50">
          by <span className="capitalize">{product.supplierName}</span>
        </p>

        <div className="mt-2.5">
          <PriceTag price={product.price} mrp={product.mrp} size="sm" />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
          <span
            className={cx(
              'text-[11.5px] font-semibold',
              out ? 'text-ink-35' : low ? 'text-amber' : 'text-emerald-600'
            )}
          >
            {out ? 'Out of stock' : low ? `Only ${product.stock} left` : 'In stock'}
          </span>
          <button
            onClick={() => !out && add(product, { qty: 1 })}
            disabled={out}
            aria-label={`Add ${product.name} to cart`}
            className={cx(
              'grid h-10 w-10 shrink-0 place-items-center rounded-md border transition',
              out
                ? 'cursor-not-allowed border-line bg-sunk text-ink-35'
                : 'border-forest bg-forest text-white hover:bg-emerald-600 active:translate-y-px'
            )}
          >
            <Icon name="cart" size={16} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
