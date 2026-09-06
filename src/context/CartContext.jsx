import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { findProduct, offersFor } from '../data/catalog';

const CartContext = createContext(null);
const STORAGE_KEY = 'nasou_cart';

/* Persist lean cart lines so the cart survives a reload / the trip to /login. */
function loadLines() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw)
      ? raw.filter((l) => l && l.id && Number(l.qty) > 0).map((l) => ({ id: l.id, supplierId: l.supplierId, qty: Number(l.qty), price: Number(l.price) }))
      : [];
  } catch {
    return [];
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const existing = state.find(
        (l) => l.id === action.id && l.supplierId === action.supplierId
      );
      if (existing) {
        return state.map((l) =>
          l === existing ? { ...l, qty: Math.min(l.qty + action.qty, 99) } : l
        );
      }
      return [...state, { id: action.id, supplierId: action.supplierId, qty: action.qty, price: action.price }];
    }
    case 'qty':
      return state
        .map((l, i) => (i === action.index ? { ...l, qty: action.qty } : l))
        .filter((l) => l.qty > 0);
    case 'remove':
      return state.filter((_, i) => i !== action.index);
    case 'clear':
      return [];
    default:
      return state;
  }
}

const FREE_DELIVERY_ABOVE = 999;
const DELIVERY_FEE = 49;

export function CartProvider({ children }) {
  const [lines, dispatch] = useReducer(reducer, undefined, loadLines);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch { /* quota — non-fatal */ }
  }, [lines]);

  const add = useCallback((product, { qty = 1, supplierId, price } = {}) => {
    const offer = offersFor(product).find((o) => o.id === supplierId) ?? offersFor(product)[0];
    dispatch({
      type: 'add',
      id: product.id,
      supplierId: offer.id,
      qty,
      price: price ?? offer.price,
    });
    setToast({ name: product.name, qty });
    setOpen(true);
    window.clearTimeout(add._t);
    add._t = window.setTimeout(() => setToast(null), 2600);
  }, []);

  /* Lines are stored lean (id + supplier + qty). Everything displayable is
     rehydrated from the catalog so the cart can't hold stale product copy. */
  const items = useMemo(
    () =>
      lines.map((line, index) => {
        const product = findProduct(line.id);
        const supplier = offersFor(product).find((o) => o.id === line.supplierId);
        return { ...line, index, product, supplier };
      }),
    [lines]
  );

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const savings = items.reduce(
      (sum, i) => sum + Math.max(0, i.product.mrp - i.price) * i.qty,
      0
    );
    const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    return {
      subtotal,
      savings,
      delivery,
      total: subtotal + delivery,
      count: items.reduce((n, i) => n + i.qty, 0),
      toFreeDelivery: Math.max(0, FREE_DELIVERY_ABOVE - subtotal),
    };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      totals,
      open,
      toast,
      setOpen,
      add,
      setQty: (index, qty) => dispatch({ type: 'qty', index, qty }),
      remove: (index) => dispatch({ type: 'remove', index }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    [items, totals, open, toast, add]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
