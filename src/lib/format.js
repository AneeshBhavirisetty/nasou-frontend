import { currency } from '../data/site';

/* Money — integer rupees in, formatted string out. */
export function money(rupees) {
  return `${currency.symbol}${Number(rupees || 0).toLocaleString(currency.locale)}`;
}

/* Percentage off, floored at 0. */
export function discount(price, mrp) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/* Compact "in 2 days" style relative phrasing for delivery estimates. */
export function deliveryBy(days = 2) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(currency.locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* Mobile numbers: strip to digits, keep at most 10 (Indian mobile). */
export const digits10 = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 10);
export const isMobile10 = (v) => /^\d{10}$/.test(String(v ?? '').replace(/\D/g, ''));
