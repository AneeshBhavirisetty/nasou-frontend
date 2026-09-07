/* ============================================================================
 * exportSheet — build a spreadsheet the browser can download, no dependency.
 *
 * Output is CSV with UTF-8 BOM, which Excel and Google Sheets both open
 * natively. Cells declared `link: true` are written as =HYPERLINK("url","label")
 * so invoice URLs stay clickable in the opened sheet.
 * ==========================================================================*/

const esc = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A clickable cell: hyperlink(url, label) */
export const hyperlink = (url, label) => ({ __link: true, url, label: label ?? url });

function cell(v) {
  if (v && typeof v === 'object' && v.__link) {
    const u = String(v.url).replace(/"/g, '""');
    const l = String(v.label).replace(/"/g, '""');
    // The whole formula must survive CSV quoting, hence the doubled quotes.
    return `"=HYPERLINK(""${u}"",""${l}"")"`;
  }
  return esc(v);
}

/**
 * @param {string}   filename  e.g. "nasou-orders-2026-09-07.csv"
 * @param {string[]} headers   column titles
 * @param {Array[]}  rows      array of row arrays; a cell may be hyperlink()
 */
export function downloadSheet(filename, headers, rows) {
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(cell).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return rows.length;
}

/** YYYY-MM-DD in local time (date inputs speak this). */
export const isoDate = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};

/** Inclusive day-range test against a millisecond timestamp. */
export function withinRange(ms, fromIso, toIso) {
  if (fromIso) {
    const from = new Date(`${fromIso}T00:00:00`).getTime();
    if (ms < from) return false;
  }
  if (toIso) {
    const to = new Date(`${toIso}T23:59:59.999`).getTime();
    if (ms > to) return false;
  }
  return true;
}

/** Absolute invoice URL for an order id. */
export const invoiceUrl = (orderId) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/invoice/${orderId}`;
