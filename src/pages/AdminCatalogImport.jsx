import { useMemo, useState } from 'react';
import MasterSheetImport, { SampleFormatLink } from '../components/admin/MasterSheetImport';
import { AdminPageHead, Kpi, Panel, ViewOnlyBanner, SELECT_CLS, LABEL_CLS } from '../components/admin/AdminUI';
import { useIam } from '../context/IamStore';
import { useAdminStore } from '../context/AdminStore';
import { Button } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useRetailers } from '../store/retailers';
import { categoryName } from '../data/catalog';
import { departmentMeta } from '../data/departments';
import { isoDate } from '../lib/exportSheet';
import { MASTER_COLUMNS } from '../lib/masterSheet';
import { audit } from '../lib/auditLog';

/* Catalog import and export (requirement 28; client, Oct 2026): every upload
   is the product sheet format (lib/masterSheet.js), one retailer at a time.
   An export is written in the same format, so a retailer's catalogue can be
   taken out, edited in Excel and brought back. Exports are role-limited and
   written to the audit log. */

const SALE = { piece: 'Pieces', meter: 'Meters', number: 'Numbers' };
const PACK = { piece: 'Pieces', bag: 'Bags', box: 'Boxes', bundle: 'Bundles', coil: 'Coils', 'coil-or-box': 'Coils/ Boxes' };

/* one product as a sheet row, in MASTER_COLUMNS order */
const sheetRow = (p) => [
  p.sourceItemId ?? '', p.itemCode || p.sku, departmentMeta(p.department).name.toUpperCase(), p.subcategoryName || categoryName(p.category),
  p.kind || '', p.form || '', p.itemSubtype2 || '', p.name, p.size || '', p.color || '', p.description || '',
  p.supplierName || '', SALE[p.saleUnit] || '', PACK[p.packUnit] || '', p.stock, p.mrp, p.discount ? `${p.discount}%` : '',
  p.price, p.images?.[0] ? new URL(p.images[0], window.location.origin).href : '',
];

export default function AdminCatalogImport() {
  const toast = useToast();
  const { can } = useIam();
  const { products } = useAdminStore();
  const retailers = useRetailers().filter((r) => r.status === 'approved' || r.status === 'suspended');
  /* the first retailer until one is picked (the list may arrive after the first render) */
  const [picked, setRid] = useState('');
  const rid = picked || retailers[0]?.id || '';
  const canEdit = can('catalog', 'edit');
  const seller = retailers.find((r) => r.id === rid);
  const mine = useMemo(() => products.filter((p) => p.retailerId === rid), [products, rid]);

  const exportSheet = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([MASTER_COLUMNS.map(([, title]) => title), ...mine.map(sheetRow)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `nivora-products-${seller?.name.replace(/\W+/g, '-').toLowerCase()}-${isoDate()}.xlsx`);
    audit({ action: 'export.xlsx', entity: 'catalog', entityId: rid, summary: `Exported ${mine.length} products of ${seller?.name}` });
    toast.success(`${mine.length} products exported`);
  };

  return (
    <div className="space-y-5">
      <AdminPageHead title="Catalog import & export" note="Bring a retailer’s product sheet in, or take their catalogue out in the same format." />
      {!canEdit && <ViewOnlyBanner what="catalogue imports" />}

      <MasterSheetImport canEdit={canEdit} />

      <Panel title="Export a retailer’s catalogue" note="An .xlsx in the product sheet format — edit it and import it again.">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className={LABEL_CLS}>Retailer</span>
            <select value={rid} onChange={(e) => setRid(e.target.value)} className={SELECT_CLS}>
              {retailers.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.city}</option>)}
            </select>
          </label>
          <Button variant="outline" icon="external" onClick={() => exportSheet().catch((x) => toast.error(x.message))} disabled={!mine.length}>Export .xlsx</Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Products" value={mine.length.toLocaleString('en-IN')} icon="package" />
          <Kpi label="In stock" value={mine.filter((p) => p.stock > 0).length.toLocaleString('en-IN')} icon="check" />
          <Kpi label="Sub-categories" value={new Set(mine.map((p) => p.category)).size} icon="layers" />
          <Kpi label="Brands" value={new Set(mine.map((p) => p.supplier)).size} icon="tag" />
        </div>
      </Panel>

      <Panel title="Product sheet format" note="The first row is these headings, in this order. Item Code is the retailer’s own (the category’s first two letters and a number, e.g. PL00001) — leave it blank and the next code is given. Image URL can be an Excel hyperlink.">
        <div className="flex flex-wrap gap-1.5">
          {MASTER_COLUMNS.map(([, title], i) => (
            <span key={title} className="rounded-full bg-sunk px-3 py-1.5 text-[12px] font-bold text-forest-800"><span className="tnum text-ink-35">{i + 1}</span> {title}</span>
          ))}
        </div>
        <SampleFormatLink className="mt-4" />
      </Panel>
    </div>
  );
}
