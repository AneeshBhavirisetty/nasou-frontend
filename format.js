import { currency } from '../data/site';

export function money(paise) {
  return `${currency.symbol}${Number(paise).toLocaleString(currency.locale)}`;
}

export function discount(price, mrp) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/* Carbon is the one number shoppers have no intuition for, so it always
   ships with a comparison rather than a bare figure. */
export function carbonNote(kg) {
  const km = Math.round(kg * 4.6);
  return `${kg} kg CO₂e · about ${km} km in a small car`;
}

export function ecoBand(score) {
  if (score >= 90) return { label: 'Excellent', tone: 'ok' };
  if (score >= 80) return { label: 'Strong', tone: 'ok' };
  if (score >= 70) return { label: 'Fair', tone: 'amber' };
  return { label: 'Needs work', tone: 'clay' };
}

export const cx = (...parts) => parts.filter(Boolean).join(' ');
