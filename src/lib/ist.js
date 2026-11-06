/* India Standard Time everywhere (client, 6 Nov 2026: Nivorva is deployed in
   India for Indian users only). Dates and times read the same in every
   browser, on every screen and in every export, whatever the device's own
   time zone — and the same as the API and the database, which are IST too.

   IST is UTC+5:30 all year (India has no daylight saving), so calendar
   arithmetic is a fixed offset: shift by 5 h 30 min, then read the UTC fields. */

export const IST_ZONE = 'Asia/Kolkata';
const OFFSET = 330 * 60000;
const DAY = 86400000;

/** A Date whose getUTC… fields are the IST wall clock of `ms`. */
export const istClock = (ms = Date.now()) => new Date(Number(ms) + OFFSET);
/** Midnight IST of the day `ms` falls on, as a timestamp. */
export const istStartOfDay = (ms = Date.now()) => Math.floor((Number(ms) + OFFSET) / DAY) * DAY - OFFSET;
/** "2026-11-06" — the IST calendar day (what date inputs and the API's day fields use). */
export const istDay = (ms = Date.now()) => istClock(ms).toISOString().slice(0, 10);
export const istHour = (ms = Date.now()) => istClock(ms).getUTCHours();
/** "2026-11-06 17:36" — IST date and time for CSV exports. */
export const istStamp = (ms) => (ms == null || Number.isNaN(Number(new Date(ms))) ? '' : istClock(new Date(ms).getTime()).toISOString().slice(0, 16).replace('T', ' '));

/* Dates shown as text: every toLocaleString / toLocaleDateString /
   toLocaleTimeString that does not name a time zone gets IST, so the many
   formatters across the app need no change. Imported first in main.jsx. */
for (const name of ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString']) {
  const original = Date.prototype[name];
  if (original.ist) continue;
  const inIst = function inIst(locales, options) {
    return original.call(this, locales, options?.timeZone ? options : { ...options, timeZone: IST_ZONE });
  };
  inIst.ist = true;
  Date.prototype[name] = inIst; // eslint-disable-line no-extend-native
}
