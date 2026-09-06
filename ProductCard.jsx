import { Link } from 'react-router-dom';
import Icon from './Icon';
import { Badge, Photo } from './ui';
import { categoryName } from '../data/catalog';
import { cx } from '../lib/format';

export default function ProductCard({ product, compact = false }) {
  return <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white transition hover:-translate-y-1 hover:border-ink-35/40 hover:shadow-lift">
    <Link to={`/product/${product.id}`} className="relative block"><Photo src={product.photo} alt={product.name} ratio={compact ? 'aspect-square' : 'aspect-[5/4]'}/><div className="absolute left-3 top-3"><Badge tone="dark">{product.material}</Badge></div><div className="absolute right-3 top-3"><span className="rounded-full bg-white/95 px-2 py-1 font-mono text-[10px] font-bold shadow-card">{product.sku}</span></div></Link>
    <div className="flex flex-1 flex-col p-4"><p className="eyebrow mb-2 !text-[10px]">{categoryName(product.category)} · {product.size}</p><h3 className="text-[15px] font-bold leading-snug"><Link to={`/product/${product.id}`} className="transition hover:text-emerald-600">{product.name}</Link></h3><p className="mt-1.5 text-[12.5px] text-ink-50">Supplier: <span className="capitalize">{product.supplier}</span></p><p className="mt-2 text-[12.5px] text-ink-70">{product.description}</p><div className="mt-auto flex items-center justify-between gap-3 pt-4"><span className="text-[12px] font-semibold text-amber">Price & stock pending</span><Link to={`/product/${product.id}`} aria-label={`View ${product.name}`} className={cx('grid h-10 w-10 place-items-center rounded-md border border-forest bg-forest text-white transition hover:bg-emerald-600')}><Icon name="arrowRight" size={17}/></Link></div></div>
  </article>;
}