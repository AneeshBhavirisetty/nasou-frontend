import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import BulkImportDialog from '../components/admin/BulkImportDialog';
import { AdminPageHead, Kpi, Panel, ViewOnlyBanner, SELECT_CLS, LABEL_CLS } from '../components/admin/AdminUI';
import { useIam } from '../context/IamStore';
import { useAdminStore } from '../context/AdminStore';
import { Button } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useRetailers } from '../store/retailers';
import { categoryName } from '../data/catalog';
import { departmentMeta } from '../data/departments';
import { downloadSheet, isoDate } from '../lib/exportSheet';
import { audit } from '../lib/auditLog';

/* Bulk catalog import and export (requirement 28): CSV or Excel, for one
   retailer at a time. Imports go through the same checks as the product
   form; exports are role-limited and written to the audit log. */

const HEADERS = ['SKU', 'Name', 'Category', 'Sub-category', 'Material', 'Size', 'Brand', 'Price', 'MRP', 'Stock'];

export default function AdminCatalogImport() {
  const toast = useToast();
  const { can } = useIam();
  const { products, saveProduct } = useAdminStore();
  const retailers = useRetailers().filter((r) => r.status === 'approved' || r.status === 'suspended');
  const [rid, setRid] = useState(retailers[0]?.id || '');
  const [open, setOpen] = useState(false);
  const canEdit = can('catalog', 'edit');
  const seller = retailers.find((r) => r.id === rid);
  const mine = useMemo(() => products.filter((p) => p.retailerId === rid), [products, rid]);

  const exportCsv = () => {
    downloadSheet(`nivora-catalog-${seller?.name.replace(/\W+/g, '-').toLowerCase()}-${isoDate()}.csv`, HEADERS,
      mine.map((p) => [p.sku, p.name, departmentMeta(p.department).name, p.subcategoryName || categoryName(p.category), p.material, p.size, p.supplierName, p.price, p.mrp, p.stock]));
    audit({ action: 'export.csv', entity: 'catalog', entityId: rid, summary: `Exported ${mine.length} products of ${seller?.name}` });
    toast.success(`${mine.length} products exported`);
  };
  const template = () => downloadSheet('nivora-catalog-template.csv', HEADERS, [['PL009001', 'PVC Elbow', 'Plumbing', 'PVC fittings', 'PVC', '1/2"', 'Astral', 45, 60, 120]]);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Catalog import & export" note="Bring a retailer’s whole price list in from CSV or Excel, or take it out again." />
      {!canEdit && <ViewOnlyBanner what="catalogue imports" />}

      <Panel>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className={LABEL_CLS}>Retailer</span>
            <select value={rid} onChange={(e) => setRid(e.target.value)} className={SELECT_CLS}>
              {retailers.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.city}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon="external" onClick={exportCsv} disabled={!mine.length}>Export CSV</Button>
            {canEdit && <Button icon="upload" onClick={() => setOpen(true)} disabled={!rid}>Import for this retailer</Button>}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Products" value={mine.length.toLocaleString('en-IN')} icon="package" />
        <Kpi label="In stock" value={mine.filter((p) => p.stock > 0).length.toLocaleString('en-IN')} icon="check" />
        <Kpi label="Sub-categories" value={new Set(mine.map((p) => p.category)).size} icon="layers" />
        <Kpi label="Brands" value={new Set(mine.map((p) => p.supplier)).size} icon="tag" />
      </div>

      <Panel title="File format" note="First row is the header. Existing SKUs are skipped; new ones are created for the chosen retailer and go live straight away.">
        <div className="thin-bar overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead><tr>{HEADERS.map((h) => <th key={h} className="border-b border-line px-2 py-2 text-left font-bold text-forest-800">{h}</th>)}</tr></thead>
            <tbody><tr>{['PL009001', 'PVC Elbow', 'Plumbing', 'PVC fittings', 'PVC', '1/2"', 'Astral', '45', '60', '120'].map((v, i) => <td key={i} className="px-2 py-2 font-mono text-ink-70">{v}</td>)}</tr></tbody>
          </table>
        </div>
        <button onClick={template} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-forest hover:underline"><Icon name="fileText" size={14} /> Download the template</button>
      </Panel>

      <BulkImportDialog
        open={open}
        onClose={() => setOpen(false)}
        existingSkus={new Set(products.map((p) => p.sku))}
        onImport={(list) => {
          list.forEach((p) => saveProduct({ ...p, retailerId: rid }, 'bulk import'));
          audit({ action: 'catalog.import', entity: 'catalog', entityId: rid, summary: `Imported ${list.length} products for ${seller?.name}` });
          toast.success(`${list.length} products added to ${seller?.name}`);
        }}
      />
    </div>
  );
}
