import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { AdminPageHead, Panel, Tabs, ViewOnlyBanner, SELECT_CLS, LABEL_CLS, TEXTAREA_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { saveSetting, useSettings } from '../../store/settings';
import { useRetailers } from '../../store/retailers';
import { uid } from '../../lib/store';
import { DEPARTMENTS } from '../../data/departments';
import { cx } from '../../lib/format';

/* Content and settings (requirements 24–27): homepage banners and featured
   categories, tax rules, shipping rules and message templates. */

const STATES = ['All', 'Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Kerala', 'Odisha', 'Delhi', 'Gujarat'];
const TONES = [['cream', 'Cream'], ['forest', 'Forest'], ['sand', 'Sand']];

function useDraft(section) {
  const value = useSettings((s) => s[section]);
  const [draft, setDraft] = useState(value);
  return [draft, setDraft, JSON.stringify(draft) !== JSON.stringify(value)];
}

function SaveBar({ dirty, onSave, canEdit }) {
  if (!canEdit) return null;
  return <Button size="sm" icon="check" disabled={!dirty} onClick={onSave}>Save changes</Button>;
}

function Banners({ canEdit }) {
  const toast = useToast();
  const [list, setList, dirty] = useDraft('banners');
  const [featured, setFeatured, fDirty] = useDraft('featured');
  const set = (i, k, v) => setList((l) => l.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const move = (i, d) => setList((l) => { const n = [...l]; const [x] = n.splice(i, 1); n.splice(Math.max(0, Math.min(n.length, i + d)), 0, x); return n; });
  return (
    <div className="space-y-5">
      <Panel title="Homepage banners" note="Shown in order on the storefront hero. Inactive banners are kept but hidden."
        action={<SaveBar canEdit={canEdit} dirty={dirty} onSave={() => { saveSetting('banners', list, 'Updated homepage banners'); toast.success('Banners published'); }} />}>
        <div className="space-y-3">
          {list.map((b, i) => (
            <div key={b.id} className={cx('grid gap-3 rounded-[18px] border p-4 lg:grid-cols-[1fr_1fr_auto]', b.active ? 'border-line bg-white' : 'border-dashed border-line bg-[#f6f3ed] opacity-75')}>
              <div className="space-y-2">
                <input disabled={!canEdit} value={b.eyebrow} onChange={(e) => set(i, 'eyebrow', e.target.value)} className={SELECT_CLS} placeholder="Eyebrow" aria-label="Eyebrow" />
                <input disabled={!canEdit} value={b.title} onChange={(e) => set(i, 'title', e.target.value)} className={cx(SELECT_CLS, 'font-bold')} placeholder="Headline" aria-label="Headline" />
                <textarea disabled={!canEdit} value={b.sub} onChange={(e) => set(i, 'sub', e.target.value)} className={cx(TEXTAREA_CLS, '!min-h-[64px]')} placeholder="Supporting line" aria-label="Supporting line" />
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input disabled={!canEdit} value={b.cta} onChange={(e) => set(i, 'cta', e.target.value)} className={SELECT_CLS} placeholder="Button text" aria-label="Button text" />
                  <input disabled={!canEdit} value={b.to} onChange={(e) => set(i, 'to', e.target.value)} className={SELECT_CLS} placeholder="/shop" aria-label="Button link" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map(([v, l]) => <button key={v} type="button" disabled={!canEdit} onClick={() => set(i, 'tone', v)} className={cx('rounded-full border px-3 py-1.5 text-[12px] font-bold', b.tone === v ? 'border-forest bg-forest text-white' : 'border-line text-ink-70')}>{l}</button>)}
                </div>
                <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-70"><input type="checkbox" disabled={!canEdit} checked={b.active} onChange={(e) => set(i, 'active', e.target.checked)} className="accent-[#1f5c4a]" /> Active on the homepage</label>
              </div>
              {canEdit && (
                <div className="flex gap-1.5 lg:flex-col">
                  <button type="button" onClick={() => move(i, -1)} className="grid h-9 w-9 place-items-center rounded-full border border-line" aria-label="Move up"><Icon name="chevronUp" size={15} /></button>
                  <button type="button" onClick={() => move(i, 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line" aria-label="Move down"><Icon name="chevronDown" size={15} /></button>
                  <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== i))} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-50 hover:text-clay" aria-label="Delete banner"><Icon name="trash" size={14} /></button>
                </div>
              )}
            </div>
          ))}
          {canEdit && <button type="button" onClick={() => setList((l) => [...l, { id: uid('bn'), eyebrow: 'New', title: 'Headline', sub: '', cta: 'Shop now', to: '/shop', tone: 'cream', active: false }])} className="text-[13px] font-bold text-forest hover:underline">+ Add a banner</button>}
        </div>
      </Panel>
      <Panel title="Featured categories" note="Highlighted on the homepage, in this order."
        action={<SaveBar canEdit={canEdit} dirty={fDirty} onSave={() => { saveSetting('featured', featured, 'Updated featured categories'); toast.success('Featured categories saved'); }} />}>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((d) => {
            const on = featured.includes(d.slug);
            return <button key={d.slug} type="button" disabled={!canEdit} onClick={() => setFeatured((f) => (on ? f.filter((x) => x !== d.slug) : [...f, d.slug]))} className={cx('flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold transition', on ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-70')}><Icon name={d.icon} size={14} /> {d.name}{on && <span className="tnum rounded-full bg-white/20 px-1.5 text-[11px]">{featured.indexOf(d.slug) + 1}</span>}</button>;
          })}
        </div>
      </Panel>
    </div>
  );
}

function RuleTable({ title, note, section, columns, blank, canEdit }) {
  const toast = useToast();
  const [rows, setRows, dirty] = useDraft(section);
  const set = (i, k, v) => setRows((l) => l.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <Panel title={title} note={note} action={<SaveBar canEdit={canEdit} dirty={dirty} onSave={() => { saveSetting(section, rows, `Updated ${title.toLowerCase()}`); toast.success(`${title} saved`); }} />}>
      <div className="thin-bar overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead><tr>{columns.map((c) => <th key={c.key} className="px-2 pb-2 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-forest-800">{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-line-soft">
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-2">
                    {c.options
                      ? <select disabled={!canEdit} value={r[c.key]} onChange={(e) => set(i, c.key, e.target.value)} className={cx(SELECT_CLS, '!h-10')}>{c.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                      : <input disabled={!canEdit} value={r[c.key]} onChange={(e) => set(i, c.key, c.num ? Number(e.target.value.replace(/\D/g, '')) : e.target.value)} className={cx(SELECT_CLS, '!h-10', c.num && 'tnum')} />}
                  </td>
                ))}
                <td className="px-2">{canEdit && <button onClick={() => setRows((l) => l.filter((_, j) => j !== i))} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-50 hover:text-clay" aria-label="Delete rule"><Icon name="trash" size={13} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && <button type="button" onClick={() => setRows((l) => [...l, { id: uid('rule'), ...blank }])} className="mt-3 text-[13px] font-bold text-forest hover:underline">+ Add a rule</button>}
    </Panel>
  );
}

function Templates({ canEdit }) {
  const toast = useToast();
  const [list, setList, dirty] = useDraft('templates');
  const [sel, setSel] = useState(list[0]?.key);
  const t = list.find((x) => x.key === sel);
  const sample = { name: 'Aarav', orderId: 'NV-10142', total: '₹4,320', retailer: 'Sri Sai Pipes & Sanitary', partId: 'NV-10142-1', link: 'nivora.in/o/NV-10142', amount: '₹1,250', cycle: '29 Sep – 5 Oct', utr: 'HDFCN52026100412345', reason: 'Please upload a clearer cancelled cheque.' };
  const fill = (s = '') => s.replace(/\{\{(\w+)\}\}/g, (_, k) => sample[k] ?? `{{${k}}}`);
  const set = (k, v) => setList((l) => l.map((x) => (x.key === sel ? { ...x, [k]: v } : x)));
  return (
    <Panel title="Message templates" note="Email, SMS and in-app notification text. Use {{placeholders}} for live values."
      action={<SaveBar canEdit={canEdit} dirty={dirty} onSave={() => { saveSetting('templates', list, 'Updated message templates'); toast.success('Templates saved'); }} />}>
      <div className="grid gap-5 lg:grid-cols-[240px_1fr_1fr]">
        <ul className="space-y-1">
          {list.map((x) => (
            <li key={x.key}><button onClick={() => setSel(x.key)} className={cx('w-full rounded-[12px] px-3 py-2 text-left text-[13px] font-bold transition', sel === x.key ? 'bg-forest text-white' : 'text-ink-70 hover:bg-sunk')}>{x.key.replace(/_/g, ' ')}<span className={cx('ml-1.5 rounded-full px-1.5 text-[10.5px] uppercase', sel === x.key ? 'bg-white/20' : 'bg-sunk')}>{x.channel}</span></button></li>
          ))}
        </ul>
        {t && (
          <div className="space-y-3">
            <label className="block"><span className={LABEL_CLS}>Channel</span><select disabled={!canEdit} value={t.channel} onChange={(e) => set('channel', e.target.value)} className={SELECT_CLS}><option value="email">Email</option><option value="sms">SMS</option><option value="push">In-app notification</option></select></label>
            {t.channel !== 'sms' && <label className="block"><span className={LABEL_CLS}>Subject / title</span><input disabled={!canEdit} value={t.subject} onChange={(e) => set('subject', e.target.value)} className={SELECT_CLS} /></label>}
            <label className="block"><span className={LABEL_CLS}>Body</span><textarea disabled={!canEdit} value={t.body} onChange={(e) => set('body', e.target.value)} className={cx(TEXTAREA_CLS, 'min-h-[140px]')} /></label>
            {t.channel === 'sms' && <p className={cx('text-[12px]', fill(t.body).length > 160 ? 'text-clay-600' : 'text-ink-50')}>{fill(t.body).length} / 160 characters</p>}
          </div>
        )}
        {t && (
          <div>
            <span className={LABEL_CLS}>Preview</span>
            <div className="rounded-[18px] border border-line bg-[#f6f3ed] p-4">
              {t.channel !== 'sms' && <p className="text-[14px] font-bold text-forest">{fill(t.subject)}</p>}
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-70">{fill(t.body)}</p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default function AdminSettings() {
  const [params, setParams] = useSearchParams();
  const { can } = useIam();
  const retailers = useRetailers();
  const canEdit = can('content', 'edit');
  const tab = params.get('tab') || 'home';
  const retailerOpts = [['all', 'All retailers'], ...retailers.filter((r) => r.status === 'approved').map((r) => [r.id, r.name])];

  return (
    <div className="space-y-5">
      <AdminPageHead title="Content & settings" note="What shoppers see on the homepage, how tax and delivery are charged, and what messages say." />
      {!canEdit && <ViewOnlyBanner what="content and settings" />}
      <Tabs value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={[
        { value: 'home', label: 'Homepage & banners', icon: 'image' },
        { value: 'tax', label: 'Tax rules', icon: 'percent' },
        { value: 'shipping', label: 'Shipping rules', icon: 'truck' },
        { value: 'templates', label: 'Message templates', icon: 'mail' },
      ]} />
      {tab === 'home' && <Banners canEdit={canEdit} />}
      {tab === 'tax' && (
        <RuleTable title="Tax rules" section="taxRules" canEdit={canEdit}
          note="GST by category and delivery state. A state rule beats the All-India rule for the same category. Confirm rates with your accountant."
          blank={{ department: 'plumbing', region: 'All', rate: 18 }}
          columns={[
            { key: 'department', label: 'Category', options: DEPARTMENTS.map((d) => [d.slug, d.name]) },
            { key: 'region', label: 'Delivery state', options: STATES.map((s) => [s, s === 'All' ? 'All India' : s]) },
            { key: 'rate', label: 'GST %', num: true },
          ]} />
      )}
      {tab === 'shipping' && (
        <RuleTable title="Shipping rules" section="shippingRules" canEdit={canEdit}
          note="Delivery fee per seller’s part. The most specific rule wins (retailer + state, then retailer, then state, then everyone). Set after talking with retailers."
          blank={{ retailerId: 'all', region: 'All', basis: 'price', min: 0, max: 0, fee: 49, freeAbove: 999 }}
          columns={[
            { key: 'retailerId', label: 'Retailer', options: retailerOpts },
            { key: 'region', label: 'State', options: STATES.map((s) => [s, s === 'All' ? 'All India' : s]) },
            { key: 'basis', label: 'Based on', options: [['price', 'Order value'], ['weight', 'Weight']] },
            { key: 'min', label: 'From ₹/kg', num: true },
            { key: 'max', label: 'To (0 = no cap)', num: true },
            { key: 'fee', label: 'Fee ₹', num: true },
            { key: 'freeAbove', label: 'Free above ₹', num: true },
          ]} />
      )}
      {tab === 'templates' && <Templates canEdit={canEdit} />}
    </div>
  );
}
