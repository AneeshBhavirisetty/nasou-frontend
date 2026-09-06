import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import { Button, Container, Breadcrumbs } from '../components/ui';
import { useWishlist } from '../context/WishlistContext';

export default function Wishlist() {
  const { items } = useWishlist();

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs className="mb-5" items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />
      <h1 className="display-serif text-[clamp(1.7rem,4vw,2.6rem)]">Your wishlist</h1>
      <p className="mt-2 text-[13.5px] text-ink-50">
        <span className="tnum font-semibold text-ink">{items.length}</span> saved fitting{items.length !== 1 && 's'}
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line bg-white py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="heart" size={24} /></span>
          <p className="mt-4 font-serif text-[18px] font-semibold">Nothing saved yet</p>
          <p className="mt-1.5 text-[13px] text-ink-50">Tap the heart on any product to keep it here.</p>
          <div className="mt-5"><Button to="/shop" iconRight="arrowRight">Browse the catalogue</Button></div>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </Container>
  );
}
