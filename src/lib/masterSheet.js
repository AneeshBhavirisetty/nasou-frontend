/* ============================================================================
 * masterSheet.js — the client's master product sheet, the catalogue's fixed
 * format (October 2026):
 *
 *   Item ID · Item Code · Category · Sub category · Item type · Item Subtype 1 ·
 *   Item Subtype 2 · Item Name · Item Size · Item Color · Item Description ·
 *   Supplier Name · Unit Measurement Type · Unit Name · Quantity · Price ·
 *   Discount · Selling price · Image URL
 *
 * The browser (Admin › Catalog import) and scripts/import-master-sheet.mjs both
 * read the file here and send the rows, unchanged, to
 * POST /admin/catalog/master-import — the API owns the rules (nasou-api
 * MasterSheetImportService). In Excel the Image URL cell shows "Open Image" and
 * the address is its hyperlink, so cells are read one by one to keep the link;
 * a CSV export loses those links.
 * ==========================================================================*/

export const MASTER_COLUMNS = [
  ['itemId', 'Item ID'], ['itemCode', 'Item Code'], ['category', 'Category'], ['subCategory', 'Sub category'],
  ['itemType', 'Item type'], ['subtype1', 'Item Subtype 1'], ['subtype2', 'Item Subtype 2'], ['itemName', 'Item Name'],
  ['itemSize', 'Item Size'], ['itemColor', 'Item Color'], ['itemDescription', 'Item Description'],
  ['supplierName', 'Supplier Name'], ['unitMeasure', 'Unit Measurement Type'], ['unitName', 'Unit Name'],
  ['quantity', 'Quantity'], ['price', 'Price'], ['discount', 'Discount'], ['sellingPrice', 'Selling price'],
  ['imageUrl', 'Image URL'],
];

const norm = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const REQUIRED = ['itemCode', 'category', 'subCategory', 'itemName', 'sellingPrice'];

/* Header cells → { field: column index }, or null when this is not the master sheet. */
export function masterColumns(headerCells) {
  const at = new Map(headerCells.map((h, i) => [norm(h), i]));
  const cols = {};
  for (const [field, title] of MASTER_COLUMNS) {
    if (at.has(norm(title))) cols[field] = at.get(norm(title));
  }
  return REQUIRED.every((f) => f in cols) ? cols : null;
}

/* Read a workbook (SheetJS) into master rows: [{ line, itemCode, …, imageUrl }].
   `XLSX` is passed in so the browser can lazy-load it and Node can require it. */
export function masterRowsFromWorkbook(XLSX, wb) {
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws?.['!ref']) continue;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const cell = (r, c) => ws[XLSX.utils.encode_cell({ r, c })];
    const text = (r, c) => { const x = cell(r, c); return x == null ? '' : String(x.w ?? x.v ?? '').trim(); };
    const header = [];
    for (let c = range.s.c; c <= range.e.c; c++) header[c - range.s.c] = text(range.s.r, c);
    const cols = masterColumns(header);
    if (!cols) continue;
    const rows = [];
    let links = 0;
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const row = { line: r + 1, sheet: name };
      for (const [field] of MASTER_COLUMNS) {
        row[field] = field in cols ? text(r, range.s.c + cols[field]) : '';
      }
      if ('imageUrl' in cols) {
        const link = cell(r, range.s.c + cols.imageUrl)?.l?.Target;
        if (link) { row.imageUrl = link.trim(); links++; }
      }
      if (MASTER_COLUMNS.some(([f]) => f !== 'line' && row[f])) rows.push(row);
    }
    return { sheet: name, rows, links };
  }
  return null;
}

/* The sample format people download when they ask for it: an .xlsx with the
   header row only (client, Oct 2026). `XLSX` is SheetJS, passed in like above. */
export function writeMasterTemplate(XLSX, filename = 'nivorva-product-sheet-format.xlsx') {
  const ws = XLSX.utils.aoa_to_sheet([MASTER_COLUMNS.map(([, title]) => title)]);
  ws['!cols'] = MASTER_COLUMNS.map(([, title]) => ({ wch: Math.max(12, title.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, filename);
}

/* What the console shows before importing. */
export function summarise(rows) {
  const by = (f) => rows.reduce((m, r) => (m[r[f] || '(blank)'] = (m[r[f] || '(blank)'] || 0) + 1, m), {});
  return {
    rows: rows.length,
    categories: by('category'),
    priced: rows.filter((r) => /\d/.test(r.sellingPrice)).length,
    unpriced: rows.filter((r) => !/\d/.test(r.sellingPrice)).length,
    imageLinks: rows.filter((r) => /^https:\/\//i.test(r.imageUrl)).length,
    imageText: rows.filter((r) => r.imageUrl && !/^https:\/\//i.test(r.imageUrl)).length,
  };
}

/* Send the rows in batches (each batch is checked and written in one
   transaction, and stays well inside the gateway timeout). `post(path, body)`
   is the caller's API helper; `retailerId` is whose sheet it is (a seller's
   own console sends to `path` = '/seller/catalog/master-import' instead, which
   is always their store). Returns the combined report. */
export async function sendMasterRows(rows, { post, path = '/admin/catalog/master-import', dryRun = false, defaultStock = 100, retailerId = null, batch = 500, onProgress } = {}) {
  const total = { dryRun, rows: 0, created: 0, updated: 0, unchanged: 0, skipped: 0, priceOnRequest: 0, withImage: 0, lines: [] };
  for (let from = 0; from < rows.length; from += batch) {
    const part = rows.slice(from, from + batch).map(({ sheet, ...r }) => r);
    /* A dropped connection (a small App Service plan restarting, a flaky
       mobile link) is retried: a batch is one transaction, and sending it again
       only updates what a first, unacknowledged attempt may have saved. */
    let rep;
    for (let attempt = 1; ; attempt++) {
      try {
        rep = await post(path, { rows: part, dryRun, defaultStock, retailerId });
        break;
      } catch (x) {
        if (attempt >= 4 || (x.status && x.status < 500)) throw x;
        await new Promise((r) => setTimeout(r, 15000 * attempt));
      }
    }
    for (const k of ['rows', 'created', 'updated', 'unchanged', 'skipped', 'priceOnRequest', 'withImage']) total[k] += rep[k] || 0;
    total.lines.push(...(rep.lines || []).filter((l) => l.errors?.length || l.notes?.length));
    onProgress?.(Math.min(from + batch, rows.length), rows.length);
  }
  return total;
}

/* ── Product photos ─────────────────────────────────────────────────────────
   The client keeps the photos in Azure Blob Storage, one per item and laid
   out like the sheet:  Nivorva Products/categories/<Category>/<Sub category>/
   <Item Name>[/<variant>]/<file>  — the variant folder (a colour, "10 WAY" …)
   is optional. The storage account is private, so scripts/upload-sheet-images
   copies them into the API's media library (resized for phones) and keeps a
   map of blob path → media URL; this picks a row's photo from that map. */

const KEY = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();

export function photoIndex(map) {
  const index = new Map();
  for (const [path, url] of Object.entries(map)) {
    const p = path.split('/');
    const at = p.indexOf('categories');
    if (at < 0 || p.length < at + 5) continue;
    const [cat, sub, name] = p.slice(at + 1, at + 4).map(KEY);
    const variant = p.length > at + 5 ? KEY(p[at + 4]) : null;
    const key = `${cat}|${sub}|${name}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ variant, url });
  }
  return index;
}

/* The photo for a sheet row: its own variant (size, colour or subtype) when
   there is one, else the item's main photo. Null when the item has none. */
export function photoFor(row, index) {
  const list = index.get(`${KEY(row.category)}|${KEY(row.subCategory)}|${KEY(row.itemName)}`);
  if (!list?.length) return null;
  const wants = [row.itemSize, row.itemColor, row.subtype1, row.subtype2].map(KEY).filter(Boolean);
  return (list.find((c) => c.variant && wants.some((w) => w === c.variant || w.startsWith(`${c.variant} `)))
    || list.find((c) => !c.variant) || list[0]).url;
}
