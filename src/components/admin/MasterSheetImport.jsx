import { useState } from 'react';
import Icon from '../Icon';
import { Panel, Kpi, LABEL_CLS, SELECT_CLS } from './AdminUI';
import { Button } from '../ui';
import { useRetailers } from '../../store/retailers';
import { useToast } from '../../context/ToastContext';
import { post } from '../../lib/api';
import { LIVE } from '../../lib/config';
import { masterRowsFromWorkbook, sendMasterRows, summarise } from '../../lib/masterSheet';

/* The client's master product sheet (lib/masterSheet.js has the format). Read
   in the browser — the .xlsx keeps the "Open Image" hyperlinks, a CSV does not
   — checked by the API first, then imported 500 rows at a time. The sheet is
   the master list: known Item Codes are updated, new ones created, and
   "Remove items not in the sheet" retires the rest of the house catalogue. */

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function MasterSheetImport({ canEdit }) {
  const toast = useToast();
  /* whose sheet this is (client review, Oct 2026: one final sheet per retailer); '' = Nivora's own */
  const retailers = useRetailers().filter((r) => r.status === 'approved' || r.status === 'suspended');
  const [owner, setOwner] = useState('');
  const ownerName = owner ? retailers.find((r) => r.id === owner)?.name || 'this retailer' : 'Nivora’s own catalogue';
  const [sheet, setSheet] = useState(null);
  const [stock, setStock] = useState(100);
  const [retire, setRetire] = useState(true);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState(null);

  const pick = async (file) => {
    setReport(null);
    setSheet(null);
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const csv = /\.csv$/i.test(file.name);
      const wb = csv ? XLSX.read(await file.text(), { type: 'string', raw: true }) : XLSX.read(await file.arrayBuffer());
      const read = masterRowsFromWorkbook(XLSX, wb);
      if (!read) return toast.error('This is not the master sheet — it needs Item Code, Category, Sub category, Item Name and Selling price columns.');
      setSheet({ name: file.name, csv, ...read, summary: summarise(read.rows) });
    } catch (x) {
      toast.error(`Could not read that file: ${x.message}`);
    }
  };

  const run = async (dryRun) => {
    setBusy(dryRun ? 'check' : 'import');
    setProgress(0);
    try {
      const retailerId = owner || null;
      const rep = await sendMasterRows(sheet.rows, { post, dryRun, retailerId, defaultStock: Number(stock) || 0, onProgress: (d, t) => setProgress(Math.round((d / t) * 100)) });
      if (retire) {
        const keep = sheet.rows.map((r) => r.itemCode).filter(Boolean);
        rep.retire = await post('/admin/catalog/master-import/retire', { keep, dryRun, retailerId });
      }
      setReport(rep);
      toast.success(dryRun ? 'Checked — nothing was changed' : `Imported for ${ownerName}: ${fmt(rep.created)} new, ${fmt(rep.updated)} updated`);
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy('');
    }
  };

  if (!LIVE) {
    return <Panel title="Master product sheet" note="Importing the master sheet needs the live API (it is not available in the browser demo)." />;
  }
  const s = sheet?.summary;
  const problems = report?.lines.filter((l) => l.errors.length) || [];
  const notes = report?.lines.filter((l) => !l.errors.length && l.notes.some((n) => !n.startsWith('no selling price'))) || [];

  return (
    <Panel title="Master product sheet" note="One final sheet per retailer, in the master format (Item Code, Category, Sub category … Selling price, Image URL). Upload the .xlsx so the image links come with it.">
      <div className="space-y-4">
        <label className="block">
          <span className={LABEL_CLS}>Whose sheet is this?</span>
          <select value={owner} onChange={(e) => { setOwner(e.target.value); setReport(null); }} disabled={!!busy} className={SELECT_CLS}>
            <option value="">Nivora — own catalogue</option>
            {retailers.map((r) => <option key={r.id} value={r.id}>{r.name}{r.city ? ` — ${r.city}` : ''}</option>)}
          </select>
          <span className="mt-1 block text-[11.5px] text-ink-50">Every row is added to, or updates, {ownerName}. An Item Code already used by someone else is reported and skipped.</span>
        </label>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-forest/30 bg-emerald-50/40 px-4 py-6 text-center transition hover:border-forest">
          <Icon name="upload" size={22} className="text-forest" />
          <span className="text-[14px] font-bold text-forest">{sheet ? sheet.name : 'Choose the master sheet (.xlsx or .csv)'}</span>
          <span className="text-[12px] text-ink-50">{sheet ? `${sheet.sheet} · ${fmt(s.rows)} rows` : 'Read here in your browser, nothing is sent until you check or import'}</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" disabled={!canEdit || !!busy} onChange={(e) => pick(e.target.files?.[0])} />
        </label>

        {s && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Rows" value={fmt(s.rows)} icon="package" />
              <Kpi label="With a price" value={fmt(s.priced)} icon="rupee" />
              <Kpi label="Price on request" value={fmt(s.unpriced)} note="Listed at ₹0, not buyable" icon="chat" />
              <Kpi label="Image links" value={fmt(s.imageLinks)} icon="image" />
            </div>
            {s.imageText > 0 && (
              <p className="rounded-[14px] bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber">
                {fmt(s.imageText)} image cells have no link{sheet.csv ? ' — a CSV loses Excel hyperlinks; upload the .xlsx to bring the photos in.' : '.'}
              </p>
            )}
            <p className="text-[12.5px] text-ink-50">
              {Object.entries(s.categories).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL_CLS}>Stock for new items</span>
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="h-11 w-full rounded-md border border-line px-3 text-[14px] outline-none focus:border-forest" />
                <span className="mt-1 block text-[11.5px] text-ink-50">The sheet’s Quantity column is empty. Existing items keep their stock.</span>
              </label>
              <label className="flex items-start gap-2.5 rounded-[14px] border border-line px-3 py-2.5">
                <input type="checkbox" checked={retire} onChange={(e) => setRetire(e.target.checked)} className="mt-1 h-4 w-4 accent-[#095143]" />
                <span>
                  <span className="block text-[13px] font-bold text-ink">Remove {owner ? 'their' : 'Nivora’s'} items not in the sheet</span>
                  <span className="block text-[11.5px] text-ink-50">{ownerName} then matches the sheet exactly. Everyone else’s products are never touched.</span>
                </span>
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" icon="check" onClick={() => run(true)} disabled={!canEdit || !!busy}>{busy === 'check' ? `Checking… ${progress}%` : 'Check first'}</Button>
              <Button icon="upload" onClick={() => run(false)} disabled={!canEdit || !!busy}>{busy === 'import' ? `Importing… ${progress}%` : `Import ${fmt(s.rows)} rows for ${owner ? ownerName : 'Nivora'}`}</Button>
            </div>
          </>
        )}

        {report && (
          <div className="space-y-2 rounded-[18px] border border-line bg-sunk/40 p-3 text-[13px]">
            <p className="font-bold text-forest">
              {report.dryRun ? 'Check: ' : 'Done: '}{fmt(report.created)} new · {fmt(report.updated)} updated · {fmt(report.unchanged)} unchanged · {fmt(report.skipped)} skipped · {fmt(report.priceOnRequest)} price on request · {fmt(report.withImage)} with a photo
              {report.retire && ` · ${report.retire.dryRun ? 'would remove' : 'removed'} ${fmt(report.retire.retired)} not in the sheet`}
            </p>
            {problems.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-[12px] text-clay-600">
                {problems.slice(0, 100).map((l) => <li key={l.line}>Line {l.line} {l.sku}: {l.errors.join('; ')}</li>)}
              </ul>
            )}
            {notes.length > 0 && (
              <ul className="max-h-32 space-y-1 overflow-y-auto text-[12px] text-ink-70">
                {notes.slice(0, 100).map((l) => <li key={l.line}>Line {l.line} {l.sku}: {l.notes.filter((n) => !n.startsWith('no selling price')).join('; ')}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
