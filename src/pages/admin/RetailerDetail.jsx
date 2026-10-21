import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import DataTable from '../../components/admin/DataTable';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { Avatar, BackLinkInline, DetailList, Kpi, Panel, StatusPill, Tabs, SELECT_CLS, LABEL_CLS, EmptyNote } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useAdminStore } from '../../context/AdminStore';
import { requestAction, setRetailerStatus, updateRetailer, useRetailer } from '../../store/retailers';
import DocLink from '../../components/admin/DocLink';
import { useOrders, useRefunds } from '../../store/orders';
import { computeSettlements, pendingBalance, usePayoutRecords } from '../../store/payouts';
import { useSettings } from '../../store/settings';
import { useRetailers } from '../../store/retailers';
import { deleteRetailer, retailerFootprint, suspendRetailer } from '../../store/actions';
import { DOC_TYPES, retailerStatusLabel } from '../../lib/marketplace';
import { categories, categoryName } from '../../data/catalog';
import { formatOrderDate } from '../../data/orders';
import { money, cx } from '../../lib/format';
import { act } from '../../lib/act';

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

function CommissionEditor({ retailer, canEdit, fallback }) {
  const toast = useToast();
  const [rate, setRate] = useState(retailer.commission?.rate ?? '');
  const [over, setOver] = useState(() => Object.entries(retailer.commission?.byCategory || {}).map(([cat, v]) => ({ cat, v: String(v) })));
  const save = () => {
    const byCategory = {};
    for (const o of over) if (o.cat && o.v !== '') byCategory[o.cat] = Math.max(0, Math.min(50, Number(o.v)));
    act(toast, () => updateRetailer(retailer.id, { commission: { rate: rate === '' ? null : Math.max(0, Math.min(50, Number(rate))), byCategory }, plan: retailer.plan }, 'Commission changed'), 'Commission saved');
  };
  return (
    <div className="grid gap-5 lg:max-w-2xl">
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
      {canEdit && <div><Button icon="check" onClick={save}>Save commission</Button></div>}
    </div>
  );
}

export default function RetailerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const r = useRetailer(id);
  const { user } = useAuth();
  const { can } = useIam();
  const { products } = useAdminStore();
  const orders = useOrders();
  const refunds = useRefunds();
  const records = usePayoutRecords();
  const settings = useSettings();
  const retailers = useRetailers();
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState(null);

  const mine = useMemo(() => products.filter((p) => p.retailerId === id), [products, id]);
  const parts = useMemo(() => orders.flatMap((o) => o.parts.filter((p) => p.retailerId === id).map((p) => ({ ...p, orderId: o.id, createdAt: o.createdAt, customer: o.customer, city: o.city, payment: o.payment }))), [orders, id]);
  const money_ = useMemo(() => {
    const live = parts.filter((p) => p.status !== 'Cancelled');
    const { rows, held } = computeSettlements({ orders, refunds, retailers, settings, records });
    return { sales: live.reduce((s, p) => s + p.total, 0), commission: live.reduce((s, p) => s + p.commission, 0), ...pendingBalance(rows, held, id) };
  }, [parts, orders, refunds, retailers, settings, records, id]);

  if (!r) return <EmptyNote icon="store" title="No such retailer" body="It may have been removed from this browser’s demo data." />;

  const by = user?.fullName;
  const canStatus = can('retailerStatus', 'edit');
  const canRequest = can('retailerStatus', 'request');
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
              <p className="mt-1 text-[12.5px] text-emerald-100/80">Joined {formatOrderDate(r.joinedAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(r.status === 'pending' || r.status === 'needs_changes') && canEdit && <Link to={`/admin/approvals?id=${r.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-bold text-forest"><Icon name="shieldCheck" size={15} /> Review application</Link>}
            {canStatus && r.status === 'approved' && <button onClick={() => setDialog('suspend')} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-[13px] font-bold text-white hover:bg-white/20"><Icon name="lock" size={15} /> Suspend</button>}
            {canStatus && (r.status === 'suspended' || r.status === 'deactivated') && <button onClick={() => { act(toast, () => setRetailerStatus(r.id, 'approved', { by, note: 'Reinstated' }), `${r.name} is active again`); }} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-bold text-forest"><Icon name="check" size={15} /> Reinstate</button>}
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
        { value: 'commission', label: 'Commission' },
      ]} />

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Sales" value={money(money_.sales)} note={`${parts.filter((p) => p.status !== 'Cancelled').length} live sub-orders`} icon="rupee" />
            <Kpi label="Commission earned" value={money(money_.commission)} note={`${r.commission?.rate ?? settings.commission.default}% base rate`} icon="percent" />
            <Kpi label="Owed to retailer" value={money(money_.unpaid)} note={`${money(money_.held)} more once delivered`} icon="card" />
            <Kpi label="Products" value={mine.length} note={`${mine.filter((p) => p.stock > 0).length} in stock`} icon="package" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Business">
              <DetailList rows={[
                ['Legal name', r.legalName], ['Type', r.type], ['GSTIN', <span className="font-mono">{r.gstin}</span>], ['PAN', <span className="font-mono">{r.pan}</span>],
                ['Bank', r.bank ? `${r.bank.holder} · ${mask(r.bank.account)} · ${r.bank.ifsc}` : '—'],
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
                    <p className="text-[14px] font-bold text-ink">{t.label}{!t.required && <span className="font-medium text-ink-50"> (optional)</span>}</p>
                    <p className="truncate text-[12.5px] text-ink-50">{d ? `${d.name} · ${Math.round(d.size / 1024)} KB · ${formatOrderDate(d.uploadedAt)}` : 'Not uploaded'}</p>
                  </div>
                  {d && <StatusPill status={d.status === 'verified' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending'} label={d.status === 'verified' ? 'Verified' : d.status === 'rejected' ? 'Rejected' : 'To review'} />}
                </div>
                <DocLink doc={d} label={t.label} />
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

      {tab === 'commission' && <CommissionEditor key={r.id + JSON.stringify(r.commission)} retailer={r} canEdit={can('commission', 'edit')} fallback={settings.commission.default} />}

      <ReasonDialog open={dialog === 'suspend'} onClose={() => setDialog(null)} title={`Suspend ${r.name}?`} confirm="Suspend" tone="danger"
        intro="Their products disappear from the storefront and new orders are blocked. Open orders stay with them to finish. You can reinstate them any time."
        onConfirm={(why) => { act(toast, () => suspendRetailer(r.id, { by, reason: why }), `${r.name} suspended`); }} />
      <ReasonDialog open={dialog === 'deactivate'} onClose={() => setDialog(null)} title={`Deactivate ${r.name}?`} confirm="Deactivate" tone="danger"
        intro="Nobody at this retailer can sign in and their products are hidden. Reversible."
        onConfirm={(why) => { act(toast, () => setRetailerStatus(r.id, 'deactivated', { by, note: why }), `${r.name} deactivated`); }} />
      <ReasonDialog open={dialog === 'request'} onClose={() => setDialog(null)} title={`Ask the Owner to delete ${r.name}`} confirm="Send request"
        intro="Deleting a retailer needs Owner approval. They will see your reason and the effects before deciding."
        onConfirm={(why) => { act(toast, () => requestAction({ kind: 'delete', retailerId: r.id, reason: why, by }), 'Request sent to the Owner'); }} />
      {dialog === 'delete' && (
        <DeleteDialog retailer={r} onClose={() => setDialog(null)} onConfirm={(why) => { act(toast, () => deleteRetailer(r.id, { by, reason: why }), `${r.name} deleted`); }} />
      )}
    </div>
  );
}
