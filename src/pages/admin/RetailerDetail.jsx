import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import DataTable from '../../components/admin/DataTable';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { Avatar, BackLinkInline, DetailList, Kpi, Panel, StatusPill, Tabs, SELECT_CLS, LABEL_CLS, TEXTAREA_CLS, EmptyNote } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useAdminStore } from '../../context/AdminStore';
import { requestAction, setRetailerStatus, updateRetailer, useRetailer } from '../../store/retailers';
import { useOrders, useRefunds } from '../../store/orders';
import { computeSettlements, pendingBalance, usePayoutRecords } from '../../store/payouts';
import { useSettings } from '../../store/settings';
import { useRetailers } from '../../store/retailers';
import { deleteRetailer, retailerFootprint, suspendRetailer } from '../../store/actions';
import { useAuditLog } from '../../lib/auditLog';
import { DOC_TYPES, retailerStatusLabel } from '../../lib/marketplace';
import { categories, categoryName } from '../../data/catalog';
import { formatOrderDate } from '../../data/orders';
import { money, cx } from '../../lib/format';

const mask = (acct = '') => (acct ? `•••• ${String(acct).slice(-4)}` : '—');
const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function DeleteDialog({ retailer, onClose, onConfirm }) {
  const fp = useMemo(() => retailerFootprint(retailer.id), [retailer.id]);
  const [typed, setTyped] = useState('');
  return (
    <ReasonDialog
      open
      onClose={onClose}
      title={`Delete ${retailer.name}?`}
      confirm="Delete retailer"
      tone="danger"
      label="Reason (kept in the audit log)"
      extraValid={typed.trim() === retailer.name}
      onConfirm={onConfirm}
      intro={<>This is a soft delete — the record stays so past orders and payouts keep their link. Here is what happens now:</>}
    >
      <ul className="space-y-2 rounded-[14px] bg-clay-50/60 p-3.5 text-[13px] text-ink-70">
        <li className="flex gap-2"><Icon name="package" size={15} className="mt-0.5 shrink-0 text-clay-600" /> <span><b>{fp.products}</b> products leave the storefront ({fp.liveProducts} in stock).</span></li>
        <li className="flex gap-2"><Icon name="truck" size={15} className="mt-0.5 shrink-0 text-clay-600" /> <span><b>{fp.openParts.length}</b> open sub-orders are cancelled and their stock returned.</span></li>
        <li className="flex gap-2"><Icon name="rupee" size={15} className="mt-0.5 shrink-0 text-clay-600" /> <span><b>{money(fp.refund)}</b> already paid is refunded to customers through Razorpay.</span></li>
        <li className="flex gap-2"><Icon name="lock" size={15} className="mt-0.5 shrink-0 text-clay-600" /> <span>Every account of this retailer loses sign-in.</span></li>
      </ul>
      <label className="block">
        <span className={LABEL_CLS}>Type the store name to confirm</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={retailer.name} className={SELECT_CLS} />
      </label>
    </ReasonDialog>
  );
}

function CommissionEditor({ retailer, canEdit, plans, fallback }) {
  const toast = useToast();
  const [rate, setRate] = useState(retailer.commission?.rate ?? '');
  const [over, setOver] = useState(() => Object.entries(retailer.commission?.byCategory || {}).map(([cat, v]) => ({ cat, v: String(v) })));
  const [plan, setPlan] = useState(retailer.plan);
  const save = () => {
    const byCategory = {};
    for (const o of over) if (o.cat && o.v !== '') byCategory[o.cat] = Math.max(0, Math.min(50, Number(o.v)));
    updateRetailer(retailer.id, { commission: { rate: rate === '' ? null : Math.max(0, Math.min(50, Number(rate))), byCategory }, plan }, 'Commission / plan changed');
    toast.success('Commission and plan saved');
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Commission" note={`Taken from each sub-order’s value. Empty = platform default (${fallback}%).`}>
        <label className="block max-w-[200px]">
          <span className={LABEL_CLS}>Retailer rate (%)</span>
          <input disabled={!canEdit} inputMode="decimal" value={rate ?? ''} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} placeholder={String(fallback)} className={SELECT_CLS} />
        </label>
        <p className="mb-2 mt-5 text-[12.5px] font-bold text-forest">Per-category overrides</p>
        <div className="space-y-2">
          {over.map((o, i) => (
            <div key={i} className="flex gap-2">
              <select disabled={!canEdit} value={o.cat} onChange={(e) => setOver((l) => l.map((x, j) => (j === i ? { ...x, cat: e.target.value } : x)))} className={SELECT_CLS}>
                <option value="">Pick a sub-category</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
              <input disabled={!canEdit} value={o.v} onChange={(e) => setOver((l) => l.map((x, j) => (j === i ? { ...x, v: e.target.value.replace(/[^\d.]/g, '') } : x)))} className={cx(SELECT_CLS, '!w-24')} placeholder="%" />
              {canEdit && <button type="button" onClick={() => setOver((l) => l.filter((_, j) => j !== i))} className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line text-ink-50 hover:text-clay" aria-label="Remove"><Icon name="trash" size={15} /></button>}
            </div>
          ))}
          {canEdit && <button type="button" onClick={() => setOver((l) => [...l, { cat: '', v: '' }])} className="text-[12.5px] font-bold text-forest hover:underline">+ Add a category rate</button>}
          {!over.length && !canEdit && <p className="text-[12.5px] text-ink-50">No overrides.</p>}
        </div>
      </Panel>
      <Panel title="Subscription plan" note="Monthly fee per the plan. Billing mode is set in Commission & plans.">
        <div className="grid gap-2">
          {plans.map((p) => (
            <label key={p.id} className={cx('flex cursor-pointer items-start gap-3 rounded-[14px] border p-3.5 transition', plan === p.id ? 'border-forest bg-emerald-50/50' : 'border-line hover:border-forest/40', !canEdit && 'pointer-events-none')}>
              <input type="radio" name="plan" checked={plan === p.id} onChange={() => setPlan(p.id)} className="mt-1 accent-[#1f5c4a]" />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2 text-[14px] font-bold text-ink">{p.name}<span className="tnum">{p.monthly ? `${money(p.monthly)}/mo` : 'Free'}</span></span>
                <span className="block text-[12px] text-ink-50">{p.perks}</span>
              </span>
            </label>
          ))}
        </div>
      </Panel>
      {canEdit && <div className="lg:col-span-2"><Button icon="check" onClick={save}>Save commission & plan</Button></div>}
    </div>
  );
}

export default function RetailerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const r = useRetailer(id);
  const { user, startView } = useAuth();
  const { can } = useIam();
  const { products } = useAdminStore();
  const orders = useOrders();
  const refunds = useRefunds();
  const records = usePayoutRecords();
  const settings = useSettings();
  const retailers = useRetailers();
  const log = useAuditLog();
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState(null);
  const [note, setNote] = useState('');

  const mine = useMemo(() => products.filter((p) => p.retailerId === id), [products, id]);
  const parts = useMemo(() => orders.flatMap((o) => o.parts.filter((p) => p.retailerId === id).map((p) => ({ ...p, orderId: o.id, createdAt: o.createdAt, customer: o.customer, city: o.city, payment: o.payment }))), [orders, id]);
  const money_ = useMemo(() => {
    const live = parts.filter((p) => p.status !== 'Cancelled');
    const { rows, held } = computeSettlements({ orders, refunds, retailers, settings, records });
    return { sales: live.reduce((s, p) => s + p.total, 0), commission: live.reduce((s, p) => s + p.commission, 0), ...pendingBalance(rows, held, id) };
  }, [parts, orders, refunds, retailers, settings, records, id]);
  const history = useMemo(() => log.filter((e) => e.entityId === id || (e.entity === 'payout' && String(e.entityId).startsWith(`${id}:`))).slice(-40).reverse(), [log, id]);

  if (!r) return <EmptyNote icon="store" title="No such retailer" body="It may have been removed from this browser’s demo data." />;

  const by = user?.fullName;
  const canStatus = can('retailerStatus', 'edit');
  const canRequest = can('retailerStatus', 'request');
  const canView = ['owner', 'operations'].includes(user?.teamRole) && r.status !== 'deleted' && r.status !== 'pending';
  const canEdit = can('retailers', 'edit');

  return (
    <div className="space-y-5">
      <BackLinkInline to="/admin/retailers">All retailers</BackLinkInline>

      <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#173d33_0%,#1f5c4a_100%)] p-5 text-white shadow-pop sm:p-7">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] bg-white text-[20px] font-black text-forest">{r.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[clamp(1.4rem,3.5vw,2rem)] font-semibold text-white">{r.name}</h2>
                <StatusPill status={r.status} className="!bg-white/15 !text-white" />
              </div>
              <p className="mt-1 text-[13px] text-emerald-100">{r.legalName} · {r.type} · {r.city}, {r.state}</p>
              <p className="mt-1 text-[12.5px] text-emerald-100/80">Joined {formatOrderDate(r.joinedAt)} · Razorpay {r.razorpayAccount ? <span className="font-mono">{r.razorpayAccount}</span> : 'not linked yet'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(r.status === 'pending' || r.status === 'needs_changes') && canEdit && <Link to={`/admin/approvals?id=${r.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-bold text-forest"><Icon name="shieldCheck" size={15} /> Review application</Link>}
            {canView && <button onClick={() => setDialog('view')} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-[13px] font-bold text-white hover:bg-white/20"><Icon name="eye" size={15} /> View as retailer</button>}
            {canStatus && r.status === 'approved' && <button onClick={() => setDialog('suspend')} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-[13px] font-bold text-white hover:bg-white/20"><Icon name="lock" size={15} /> Suspend</button>}
            {canStatus && (r.status === 'suspended' || r.status === 'deactivated') && <button onClick={() => { setRetailerStatus(r.id, 'approved', { by, note: 'Reinstated' }); toast.success(`${r.name} is active again`); }} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-bold text-forest"><Icon name="check" size={15} /> Reinstate</button>}
            {canStatus && (r.status === 'approved' || r.status === 'suspended') && <button onClick={() => setDialog('deactivate')} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-[13px] font-bold text-white hover:bg-white/20"><Icon name="close" size={15} /> Deactivate</button>}
            {r.status !== 'deleted' && (canStatus || canRequest) && <button onClick={() => setDialog(canStatus ? 'delete' : 'request')} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-clay/40 bg-clay/20 px-4 text-[13px] font-bold text-white hover:bg-clay/35"><Icon name="trash" size={15} /> {canStatus ? 'Delete' : 'Request deletion'}</button>}
          </div>
        </div>
      </section>

      <Tabs value={tab} onChange={setTab} options={[
        { value: 'overview', label: 'Overview' },
        { value: 'documents', label: 'Documents', count: r.documents.length },
        { value: 'products', label: 'Products', count: mine.length },
        { value: 'orders', label: 'Orders', count: parts.length },
        { value: 'commission', label: 'Commission & plan' },
        { value: 'notes', label: 'Notes', count: r.notes?.length || 0 },
        { value: 'history', label: 'History' },
      ]} />

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Sales" value={money(money_.sales)} note={`${parts.filter((p) => p.status !== 'Cancelled').length} live sub-orders`} icon="rupee" />
            <Kpi label="Commission earned" value={money(money_.commission)} note={`${r.commission?.rate ?? settings.commission.default}% base rate`} icon="percent" />
            <Kpi label="Owed to retailer" value={money(money_.unpaid)} note={`${money(money_.held)} more held until delivery`} icon="card" />
            <Kpi label="Products" value={mine.length} note={`${mine.filter((p) => p.stock > 0).length} in stock`} icon="package" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Business">
              <DetailList rows={[
                ['Legal name', r.legalName], ['Type', r.type], ['GSTIN', <span className="font-mono">{r.gstin}</span>], ['PAN', <span className="font-mono">{r.pan}</span>],
                ['Bank', r.bank ? `${r.bank.holder} · ${mask(r.bank.account)} · ${r.bank.ifsc}` : '—'],
                ['Razorpay linked account', r.razorpayAccount || 'Created on approval'],
                ['Plan', settings.plans.find((p) => p.id === r.plan)?.name],
              ]} />
              {r.pendingChanges && <p className="mt-3 rounded-[12px] bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber">Profile change waiting for approval: {Object.keys(r.pendingChanges.fields).join(', ')} — <Link to="/admin/approvals?tab=changes" className="underline">review</Link></p>}
            </Panel>
            <Panel title="Contact">
              <DetailList rows={[['Contact', r.contact], ['Email', r.email], ['Phone', `+91 ${r.phone}`], ['Address', `${r.address}, ${r.city} ${r.pin}`]]} />
            </Panel>
          </div>
          <Panel title="Status timeline">
            <ol className="space-y-3">
              {[...(r.statusLog || [])].reverse().map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-forest" />
                  <div className="min-w-0"><p className="text-[13.5px] font-bold text-ink">{retailerStatusLabel(s.status)} <span className="font-medium text-ink-50">· {when(s.at)}{s.by ? ` · ${s.by}` : ''}</span></p>{s.note && <p className="text-[12.5px] text-ink-50">{s.note}</p>}</div>
                </li>
              ))}
              {!r.statusLog?.length && <li className="text-[13px] text-ink-50">Onboarded before status history was kept.</li>}
            </ol>
          </Panel>
        </div>
      )}

      {tab === 'documents' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {DOC_TYPES.map((t) => {
            const d = r.documents.find((x) => x.type === t.key);
            return (
              <Panel key={t.key}>
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-sunk text-forest"><Icon name="fileText" size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-ink">{t.label}</p>
                    <p className="truncate text-[12.5px] text-ink-50">{d ? `${d.name} · ${Math.round(d.size / 1024)} KB · ${formatOrderDate(d.uploadedAt)}` : 'Not uploaded'}</p>
                  </div>
                  {d && <StatusPill status={d.status === 'verified' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending'} label={d.status === 'verified' ? 'Verified' : d.status === 'rejected' ? 'Rejected' : 'To review'} />}
                </div>
                {d?.dataUrl && (d.mime || '').startsWith('image/') && <img src={d.dataUrl} alt={t.label} className="mt-3 max-h-48 w-full rounded-[12px] object-contain bg-sunk" />}
              </Panel>
            );
          })}
        </div>
      )}

      {tab === 'products' && (
        <DataTable
          id="retailer-products"
          rows={mine}
          columns={[
            { key: 'name', label: 'Product', always: true, render: (p) => <span className="block min-w-[200px] font-bold text-ink">{p.name}</span> },
            { key: 'sku', label: 'SKU', render: (p) => <span className="font-mono text-[12px]">{p.sku}</span> },
            { key: 'category', label: 'Sub-category', value: (p) => categoryName(p.category) },
            { key: 'price', label: 'Price', align: 'right', render: (p) => money(p.price) },
            { key: 'stock', label: 'Stock', align: 'right' },
          ]}
          searchText={(p) => `${p.name} ${p.sku}`}
          searchPlaceholder="Search this retailer’s products"
          exportName={`products-${r.id}`}
          canExport={can('catalog')}
          onRowClick={(p) => navigate(`/product/${p.id}`)}
        />
      )}

      {tab === 'orders' && (
        <DataTable
          id="retailer-orders"
          rows={parts}
          columns={[
            { key: 'id', label: 'Sub-order', always: true, render: (p) => <span className="font-mono text-[12.5px] font-bold text-ink">{p.id}</span> },
            { key: 'createdAt', label: 'Placed', render: (p) => formatOrderDate(p.createdAt) },
            { key: 'customer', label: 'Customer' },
            { key: 'status', label: 'Status', render: (p) => <StatusPill status={p.status} /> },
            { key: 'total', label: 'Value', align: 'right', render: (p) => money(p.total) },
            { key: 'commission', label: 'Commission', align: 'right', render: (p) => money(p.commission) },
            { key: 'retailerShare', label: 'Retailer share', align: 'right', render: (p) => money(p.retailerShare) },
          ]}
          searchText={(p) => `${p.id} ${p.customer} ${p.city}`}
          filters={[{ key: 'status', label: 'Status', options: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => ({ value: s, label: s })), test: (p, v) => p.status === v }]}
          date={(p) => p.createdAt}
          initialSort={{ key: 'createdAt', dir: 'desc' }}
          exportName={`suborders-${r.id}`}
          onRowClick={(p) => navigate(`/admin/orders/${p.orderId}`)}
        />
      )}

      {tab === 'commission' && <CommissionEditor key={r.id + JSON.stringify(r.commission) + r.plan} retailer={r} canEdit={can('commission', 'edit')} plans={settings.plans} fallback={settings.commission.default} />}

      {tab === 'notes' && (
        <Panel title="Internal notes" note="Only the Nasou Hive team sees these.">
          {canEdit && (
            <form onSubmit={(e) => { e.preventDefault(); if (note.trim().length < 3) return; updateRetailer(r.id, { notes: [{ text: note.trim(), by, at: Date.now() }, ...(r.notes || [])] }, 'Internal note added'); setNote(''); }} className="mb-4 space-y-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className={TEXTAREA_CLS} placeholder="e.g. Spoke to Ravi — GST certificate renewal due in March." />
              <Button size="sm" type="submit" icon="plus">Add note</Button>
            </form>
          )}
          <ul className="space-y-2">
            {(r.notes || []).map((n, i) => <li key={i} className="rounded-[14px] bg-[#f6f3ed] p-3 text-[13px]"><p className="text-ink">{n.text}</p><p className="mt-1 text-[11.5px] text-ink-50">{n.by} · {when(n.at)}</p></li>)}
            {!r.notes?.length && <li className="text-[13px] text-ink-50">No notes yet.</li>}
          </ul>
        </Panel>
      )}

      {tab === 'history' && (
        <Panel title="Audit history" note="Everything recorded against this retailer. Read-only.">
          <ul className="divide-y divide-line-soft">
            {history.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-[13px]">
                <span className="min-w-0"><span className="font-bold text-ink">{e.summary}</span> <span className="text-ink-50">· {e.actorName}</span></span>
                <span className="text-[12px] text-ink-35">{when(e.at)}</span>
              </li>
            ))}
            {!history.length && <li className="py-3 text-[13px] text-ink-50">Nothing recorded yet.</li>}
          </ul>
          <Link to={`/admin/audit?q=${encodeURIComponent(r.name)}`} className="mt-3 inline-block text-[12.5px] font-bold text-forest hover:underline">Open in the audit log →</Link>
        </Panel>
      )}

      <ReasonDialog open={dialog === 'suspend'} onClose={() => setDialog(null)} title={`Suspend ${r.name}?`} confirm="Suspend" tone="danger"
        intro="Their products disappear from the storefront and new orders are blocked. Open orders stay with them to finish. You can reinstate them any time."
        onConfirm={(why) => { suspendRetailer(r.id, { by, reason: why }); toast.success(`${r.name} suspended`); }} />
      <ReasonDialog open={dialog === 'deactivate'} onClose={() => setDialog(null)} title={`Deactivate ${r.name}?`} confirm="Deactivate" tone="danger"
        intro="Nobody at this retailer can sign in and their products are hidden. Reversible."
        onConfirm={(why) => { setRetailerStatus(r.id, 'deactivated', { by, note: why }); toast.success(`${r.name} deactivated`); }} />
      <ReasonDialog open={dialog === 'request'} onClose={() => setDialog(null)} title={`Ask the Owner to delete ${r.name}`} confirm="Send request"
        intro="Deleting a retailer needs Owner approval. They will see your reason and the effects before deciding."
        onConfirm={(why) => { requestAction({ kind: 'delete', retailerId: r.id, reason: why, by }); toast.success('Request sent to the Owner'); }} />
      <ReasonDialog open={dialog === 'view'} onClose={() => setDialog(null)} title={`View as ${r.name}`} confirm="Start view-only session" label="Why do you need to see their console?" placeholder="e.g. Retailer reports payouts page shows the wrong cycle — ticket #4471"
        intro={<>You will see their seller console exactly as they do, <b>read-only</b>, for up to 15 minutes. A banner stays on screen and the session is recorded in the audit log.</>}
        onConfirm={(why) => { startView(r.id, why); navigate('/seller'); }} />
      {dialog === 'delete' && (
        <DeleteDialog retailer={r} onClose={() => setDialog(null)} onConfirm={(why) => { deleteRetailer(r.id, { by, reason: why }); toast.success(`${r.name} deleted`); }} />
      )}
    </div>
  );
}
