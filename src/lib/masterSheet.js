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
   is the caller's API helper. Returns the combined report. */
export async function sendMasterRows(rows, { post, dryRun = false, defaultStock = 100, batch = 500, onProgress } = {}) {
  const total = { dryRun, rows: 0, created: 0, updated: 0, skipped: 0, priceOnRequest: 0, withImage: 0, lines: [] };
  for (let from = 0; from < rows.length; from += batch) {
    const part = rows.slice(from, from + batch).map(({ sheet, ...r }) => r);
    const rep = await post('/admin/catalog/master-import', { rows: part, dryRun, defaultStock });
    for (const k of ['rows', 'created', 'updated', 'skipped', 'priceOnRequest', 'withImage']) total[k] += rep[k] || 0;
    total.lines.push(...(rep.lines || []).filter((l) => l.errors?.length || l.notes?.length));
    onProgress?.(Math.min(from + batch, rows.length), rows.length);
  }
  return total;
}
