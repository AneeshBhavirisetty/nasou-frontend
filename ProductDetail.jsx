import { Link, Navigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { Badge, Button, Container, Photo } from '../components/ui';
import { categoryName, findProduct } from '../data/catalog';

export default function ProductDetail() {
  const { id } = useParams(); const product = findProduct(id); if (!product) return <Navigate to="/shop" replace />;
  return <Container className="py-10"><nav className="mb-7 flex items-center gap-1.5 text-[12.5px] text-ink-50"><Link to="/">Home</Link><Icon name="chevronRight" size={13}/><Link to={`/shop?category=${product.category}`}>{categoryName(product.category)}</Link><Icon name="chevronRight" size={13}/><span className="font-semibold text-ink">{product.name}</span></nav>
    <div className="grid gap-10 lg:grid-cols-2"><div className="overflow-hidden rounded-xl border border-line bg-white"><Photo src={product.photo} alt={product.name} ratio="aspect-[4/3]"/></div><div><p className="eyebrow">{categoryName(product.category)} · {product.subcategory}</p><h1 className="mt-3 text-[clamp(2rem,4vw,3.4rem)]">{product.name}</h1><p className="mt-4 text-[16px] text-ink-50">{product.description}</p><dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line"><Data label="Product code" value={product.sku}/><Data label="Supplier" value={product.supplier}/><Data label="Material" value={product.material}/><Data label="Size" value={product.size}/><Data label="Unit" value={product.unit}/><Data label="Status" value="Pricing pending"/></dl><div className="mt-8 rounded-lg border border-amber/30 bg-amber-50 p-5"><Badge tone="amber">Not available yet</Badge><p className="mt-3 text-[13.5px] leading-relaxed text-ink-70">This SKU came from the product workbook, but no price or quantity was provided. It will become purchasable when an administrator publishes verified inventory.</p></div><Button to="/shop" variant="outline" className="mt-6" icon="chevronLeft">Back to catalogue</Button></div></div>
  </Container>;
}
function Data({label,value}) { return <div className="bg-white p-4"><dt className="eyebrow !text-[9px]">{label}</dt><dd className="mt-1.5 text-[14px] font-semibold capitalize">{value}</dd></div>; }
