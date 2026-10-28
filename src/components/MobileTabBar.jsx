import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { cx } from '../lib/format';

/* Phone bottom navigation from the NasouHive demo portal — a floating glass
   dock in the reference's frosted style. Every tab points at
   an existing page (cart opens the existing drawer). While mounted it flags
   <html> so floating widgets can sit above it (see --tabbar-h in index.css). */

const tab = (active) =>
  cx(
    'relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] font-bold transition',
    active ? 'button-primary shadow-btn' : 'text-ink-50 active:bg-sunk/80'
  );

function Count({ n, active }) {
  if (!n) return null;
  return (
    <span className={cx('tnum absolute right-[18%] top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9.5px] font-bold', active ? 'bg-white text-forest' : 'bg-forest text-white')}>
      {n}
    </span>
  );
}

export default function MobileTabBar() {
  const { totals, open, setOpen } = useCart();
  const wishlist = useWishlist();

  useEffect(() => {
    document.documentElement.classList.add('has-tabbar');
    return () => document.documentElement.classList.remove('has-tabbar');
  }, []);

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-3 bottom-[calc(8px+env(safe-area-inset-bottom))] z-40 rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(239,234,225,0.86))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_20px_50px_rgba(31,59,52,0.2)] backdrop-blur-2xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        <NavLink to="/home" end className={({ isActive }) => tab(isActive && !open)}>
          <Icon name="store" size={19} /><span>Home</span>
        </NavLink>
        <NavLink to="/shop" className={({ isActive }) => tab(isActive && !open)}>
          <Icon name="search" size={19} /><span>Shop</span>
        </NavLink>
        <button type="button" onClick={() => setOpen(true)} className={tab(open)} aria-label={`Cart, ${totals.count} items`}>
          <Icon name="cart" size={19} /><span>Cart</span>
          <Count n={totals.count} active={open} />
        </button>
        <NavLink to="/wishlist" className={({ isActive }) => tab(isActive && !open)}>
          {({ isActive }) => (
            <>
              <Icon name="heart" size={19} /><span>Wishlist</span>
              <Count n={wishlist.count} active={isActive && !open} />
            </>
          )}
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => tab(isActive && !open)}>
          <Icon name="package" size={19} /><span>Orders</span>
        </NavLink>
      </div>
    </nav>
  );
}
