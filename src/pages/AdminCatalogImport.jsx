import { useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import { AdminPageHead } from '../components/admin/AdminUI';
import { Button } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { products, categories } from '../data/catalog';
import { cx } from '../lib/format';

export default function AdminCatalogImport() {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | working | done
  const [result, setResult] = useState(null);

  const take = (f) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) return toast.error('Choose an .xlsx, .xls or .csv workbook.');
    setFile(f);
    setResult(null);
    setPhase('idle');
  };

  const run = () => {
    setPhase('working');
    setTimeout(() => {
      setResult({
        rows: products.length,
        created: 0,
        updated: products.length,
        categories: categories.length,
        skipped: 0,
      });
      setPhase('done');
      toast.success('Workbook imported — catalogue is up to date.');
    }, 1400);
  };

  return (
    <div className="space-y-5">
      <AdminPageHead title="Catalogue import" note="Upsert product metadata from a supplier workbook." />

      <div className="max-w-2xl rounded-[20px] border border-line bg-white/86 p-5 shadow-[0_18px_40px_rgba(37,88,73,0.08)] sm:p-6">
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
          className={cx(
            'flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition',
            drag ? 'border-emerald bg-emerald-50/50' : 'border-line bg-canvas/40 hover:border-emerald/50 hover:bg-emerald-50/30'
          )}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="layers" size={22} />
          </span>
          <p className="mt-3 text-[14px] font-bold">{file ? file.name : 'Drop your workbook here'}</p>
          <p className="mt-1 text-[12px] text-ink-50">
            {file ? `${(file.size / 1024).toFixed(0)} KB · ready to import` : '.xlsx, .xls or .csv · or click to browse'}
          </p>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => take(e.target.files?.[0])} />
        </label>

        <div className="mt-4 flex gap-2">
          <Button onClick={run} disabled={!file || phase === 'working'} loading={phase === 'working'} icon="package">
            {phase === 'working' ? 'Importing…' : 'Import workbook'}
          </Button>
          {file && phase !== 'working' && (
            <Button variant="ghost" onClick={() => { setFile(null); setResult(null); }}>Clear</Button>
          )}
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-bold text-emerald-700">
              <Icon name="check" size={15} strokeWidth={3} /> Import complete
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] text-ink-70 sm:grid-cols-4">
              <div><dt className="text-ink-35">Rows</dt><dd className="tnum font-bold">{result.rows.toLocaleString('en-IN')}</dd></div>
              <div><dt className="text-ink-35">Updated</dt><dd className="tnum font-bold">{result.updated.toLocaleString('en-IN')}</dd></div>
              <div><dt className="text-ink-35">Created</dt><dd className="tnum font-bold">{result.created}</dd></div>
              <div><dt className="text-ink-35">Categories</dt><dd className="tnum font-bold">{result.categories}</dd></div>
            </dl>
          </motion.div>
        )}

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-35">
          The live catalogue in this demo is built from <span className="font-mono">shop data 1.xlsx</span> by
          <span className="font-mono"> scripts/build-catalog.mjs</span>. Rows without a price stay as drafts.
        </p>
      </div>
    </div>
  );
}
