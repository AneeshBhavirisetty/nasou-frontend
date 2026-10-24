import { createStore, useStore } from '../lib/store';
import { LIVE } from '../lib/config';
import { del, get, post } from '../lib/api';

/* "Notify me" on out-of-stock products (client review 6, customer item 13).
   The SKUs the signed-in shopper is waiting for. With the API, nasou-api keeps
   them and sends the bell notification (and an email) when stock is back —
   StockAlertService checks every minute. In the browser demo the list just
   lives in localStorage. */

export const stockAlertsStore = createStore('nivora_stock_alerts_v1', () => []);

export const useStockAlerts = () => useStore(stockAlertsStore);

export async function loadStockAlerts() {
  if (!LIVE) return;
  try { stockAlertsStore.set(await get('/stock-alerts')); } catch { /* signed out or offline */ }
}

export async function setStockAlert(sku, on) {
  if (LIVE) {
    if (on) await post(`/stock-alerts/${encodeURIComponent(sku)}`, {});
    else await del(`/stock-alerts/${encodeURIComponent(sku)}`);
  }
  stockAlertsStore.set((list) => (on ? [sku, ...list.filter((s) => s !== sku)] : list.filter((s) => s !== sku)));
}
