import { useSyncExternalStore } from 'react';

/* Switches the API turns on or off — the storefront snapshot's `features`
   (REFUNDS_ENABLED on the API). Off until the API says otherwise, so a
   switched-off feature never flashes on screen. */

let state = { refunds: false };
const subs = new Set();

export function setFeatures(next) {
  state = { ...state, ...(next || {}) };
  subs.forEach((fn) => fn());
}

export const featureOn = (key) => Boolean(state[key]);

export function useFeature(key) {
  return useSyncExternalStore((fn) => {
    subs.add(fn);
    return () => subs.delete(fn);
  }, () => Boolean(state[key]));
}

/* The returns line on the site follows the switch: no refund is promised while refunds are off. */
export const returnsCopy = (refundsOn) => (refundsOn
  ? 'Unused fittings in their original packaging can be returned within 7 days of delivery for a full refund of the item value. Start a return from your orders page or contact us.'
  : 'Something wrong with your order? Raise a support ticket from your orders page within 7 days of delivery and our team will sort it out with the seller.');

/* Paid online and not yet given back — with refunds off, such a part is cancelled only by Nivorva support. */
export const paidOnline = (order) => Boolean(order?.razorpay?.paymentId) || ['Paid', 'Partly refunded'].includes(order?.paymentStatus);
