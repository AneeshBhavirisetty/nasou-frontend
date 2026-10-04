import { useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import { AdminPageHead, Panel, ViewOnlyBanner, SELECT_CLS, LABEL_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useAdminStore } from '../../context/AdminStore';
import { saveSetting, useSettings } from '../../store/settings';
import { DEPARTMENTS, slugifyCategory } from '../../data/departments';
import { categories as liveCats } from '../../data/catalog';
import { cx } from '../../lib/format';

/* Master catalog (requirement 16): the Super Admin owns the categories,
   sub-types and the item schema. Retailers pick from these when they add a
   product, and new retailer products go live without approval. */
export default function AdminMasterCatalog() {
  const toast = useToast();
  const { can } = useIam();
  const canEdit = can('catalog', 'edit');
  const catalog = useSettings((s) => s.catalog);
  const { products } = useAdminStore();
  const [dept, setDept] = useState(DEPARTMENTS[0].slug);
  const [name, setName] = useState('');
  const [attr, setAttr] = useState('');

  const subs = useMemo(() => {
    const m = new Map();
    for (const c of liveCats) m.set(c.slug, { slug: c.slug, name: c.name, department: c.department });
    for (const c of catalog.subs) m.set(c.slug, c);
    return [...m.values()];
  }, [catalog.subs]);
  const counts = useMemo(() => {
    const n = new Map();
    const sellers = new Map();
    products.forEach((p) => {
      n.set(p.category, (n.get(p.category) || 0) + 1);
      if (!sellers.has(p.category)) sellers.set(p.category, new Set());
      sellers.get(p.category).add(p.retailerId);
    });
    return { n, sellers };
  }, [products]);

  const d = DEPARTMENTS.find((x) => x.slug === dept);
  const deptSubs = subs.filter((s) => s.department === dept);
  const attrs = catalog.attributes[dept] || [];

  const addSub = (e) => {
    e.preventDefault();
    const nm = name.trim();
    if (nm.length < 2) return;
    let slug = slugifyCategory(nm);
    if (subs.some((s) => s.slug === slug)) {
      if (subs.some((s) => s.slug === slug && s.department === dept)) return toast.error('That sub-category already exists here.');
      slug = `${dept}-${slug}`;
    }
    saveSetting('catalog', { ...catalog, subs: [...catalog.subs, { slug, name: nm, department: dept }] }, `Added sub-category ${nm} under ${d.name}`);
    setName('');
    toast.success(`${nm} added — retailers can list under it now`);
  };
  const removeSub = (s) => {
    if (counts.n.get(s.slug)) return toast.error('Products use this sub-category — move them first.');
    saveSetting('catalog', { ...catalog, subs: catalog.subs.filter((x) => x.slug !== s.slug) }, `Removed sub-category ${s.name}`);
  };
  const setAttrs = (list, summary) => saveSetting('catalog', { ...catalog, attributes: { ...catalog.attributes, [dept]: list } }, summary);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Master catalog" note="Categories, sub-types and the fields every product carries. Retailers choose from this list." />
      {!canEdit && <ViewOnlyBanner what="the master catalog" />}

      <div className="no-bar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {DEPARTMENTS.map((x) => (
          <button key={x.slug} onClick={() => setDept(x.slug)} className={cx('flex shrink-0 items-center gap-2 rounded-[16px] border px-4 py-3 text-left transition', dept === x.slug ? 'border-forest bg-forest text-white shadow-btn' : 'border-line bg-white text-ink-70 hover:border-forest/40')}>
            <Icon name={x.icon} size={18} />
            <span><span className="block text-[13.5px] font-bold">{x.name}</span><span className={cx('block text-[11px]', dept === x.slug ? 'text-emerald-100' : 'text-ink-50')}>{subs.filter((s) => s.department === x.slug).length} sub-types</span></span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel title={`${d.name} sub-categories`} note={d.blurb}>
          <ul className="divide-y divide-line-soft">
            {deptSubs.map((s) => (
              <li key={s.slug} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-ink">{s.name}</p>
                  <p className="text-[12px] text-ink-50"><span className="font-mono">{s.slug}</span> · {counts.n.get(s.slug) || 0} products · {counts.sellers.get(s.slug)?.size || 0} retailers</p>
                </div>
                {canEdit && catalog.subs.some((x) => x.slug === s.slug) && (
                  <button onClick={() => removeSub(s)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-50 hover:text-clay" aria-label={`Remove ${s.name}`}><Icon name="trash" size={13} /></button>
                )}
              </li>
            ))}
            {!deptSubs.length && <li className="py-4 text-[13px] text-ink-50">No sub-categories yet — add the first one below.</li>}
          </ul>
          {canEdit && (
            <form onSubmit={addSub} className="mt-4 flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${d.name.toLowerCase()} sub-category, e.g. ${dept === 'electrical' ? 'MCBs & distribution boards' : 'Drip irrigation'}`} className={SELECT_CLS} />
              <Button type="submit" icon="plus">Add</Button>
            </form>
          )}
        </Panel>

        <Panel title="Item schema" note={`Fields a retailer fills in for every ${d.name.toLowerCase()} product.`}>
          <div className="flex flex-wrap gap-2">
            {['Name', 'SKU', 'Price', 'MRP', 'Stock', 'Photos'].map((f) => <span key={f} className="rounded-full bg-sunk px-3 py-1.5 text-[12.5px] font-bold text-ink-50" title="Always required">{f} · required</span>)}
            {attrs.map((f) => (
              <span key={f} className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12.5px] font-bold text-emerald-700">
                {f}
                {canEdit && <button onClick={() => setAttrs(attrs.filter((x) => x !== f), `Removed field ${f} from ${d.name}`)} aria-label={`Remove ${f}`} className="text-emerald-700/60 hover:text-clay"><Icon name="close" size={12} /></button>}
              </span>
            ))}
          </div>
          {canEdit && (
            <form onSubmit={(e) => { e.preventDefault(); const v = attr.trim(); if (!v || attrs.includes(v)) return; setAttrs([...attrs, v], `Added field ${v} to ${d.name}`); setAttr(''); }} className="mt-4">
              <span className={LABEL_CLS}>Add a field</span>
              <div className="flex gap-2"><input value={attr} onChange={(e) => setAttr(e.target.value)} placeholder="e.g. ISI mark" className={SELECT_CLS} /><Button type="submit" variant="outline" icon="plus">Add</Button></div>
            </form>
          )}
          <p className="mt-4 rounded-[12px] bg-[#f6f3ed] px-3 py-2.5 text-[12px] text-ink-70">New retailer products in these sub-categories go live straight away — no product approval step.</p>
        </Panel>
      </div>
    </div>
  );
}
