import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { AdminPageHead, DetailList, EmptyNote, Panel, StatusPill, Tabs, ViewOnlyBanner } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { closeRequest, decideChanges, retailersStore, setDocumentStatus, setRetailerStatus, useRequests, useRetailers } from '../../store/retailers';
import DocLink from '../../components/admin/DocLink';
import { LIVE } from '../../lib/config';
import { deleteRetailer, retailerFootprint } from '../../store/actions';
import { DOC_TYPES } from '../../lib/marketplace';
import { money, cx } from '../../lib/format';
import { timeAgo } from '../../context/NotificationStore';
import { act } from '../../lib/act';

/* Approval queue (requirements 6 and 17, plus Owner sign-off from 11).
   Applications: review documents → approve, reject with a reason, or ask
   for corrections. The retailer is notified either way. */

const mask = (a = '') => (a ? `•••• ${String(a).slice(-4)}` : '—');
const FIELD_LABEL = { legalName: 'Legal name', gstin: 'GSTIN', pan: 'PAN', bank: 'Bank account', type: 'Business type' };
const show = (k, v) => (k === 'bank' && v ? `${v.holder} · ${mask(v.account)} · ${v.ifsc}` : String(v ?? '—'));

function setDocStatus(retailerId, type, status, doc) {
  if (LIVE) return setDocumentStatus(retailerId, doc.id, status);
  return retailersStore.set((list) => list.map((r) => (r.id === retailerId ? { ...r, documents: r.documents.map((d) => (d.type === type ? { ...d, status } : d)) } : r)));
}

function Application({ r, canEdit, by }) {
  const toast = useToast();
  const [dialog, setDialog] = useState(null);
  const docs = DOC_TYPES.map((t) => ({ ...t, doc: r.documents.find((d) => d.type === t.key) }));
  const missing = docs.filter((d) => !d.doc).length;
  const rejected = docs.filter((d) => d.doc?.status === 'rejected');
  const verified = docs.filter((d) => d.doc?.status === 'verified').length;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-[19px] font-semibold text-forest">{r.name}</h2><StatusPill status={r.status} /></div>
            <p className="mt-1 text-[13px] text-ink-50">{r.legalName} · {r.type} · {r.city}, {r.state} · applied {timeAgo(r.joinedAt)}</p>
          </div>
          <Link to={`/admin/retailers/${r.id}`} className="text-[12.5px] font-bold text-forest hover:underline">Full profile →</Link>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <DetailList rows={[['Contact', `${r.contact} · +91 ${r.phone}`], ['Email', r.email], ['Address', `${r.address}, ${r.city} ${r.pin}`], ['Categories', (r.categories || []).join(', ') || '—']]} />
          <DetailList rows={[['GSTIN', <span className="font-mono">{r.gstin}</span>], ['PAN', <span className="font-mono">{r.pan}</span>], ['Bank', r.bank ? `${r.bank.holder} · ${mask(r.bank.account)}` : '—'], ['IFSC', <span className="font-mono">{r.bank?.ifsc}</span>]]} />
        </div>
        {r.statusLog?.length > 1 && <p className="mt-3 rounded-[12px] bg-[#f6f3ed] px-3 py-2 text-[12.5px] text-ink-70"><b>Last note:</b> {r.statusLog[r.statusLog.length - 1].note}</p>}
      </Panel>

      <Panel title="Documents" note={`${verified} of ${DOC_TYPES.length} verified${missing ? ` · ${missing} missing` : ''}. Mark each one before deciding.`}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {docs.map(({ key, label, hint, doc }) => (
            <li key={key} className={cx('rounded-[16px] border p-3.5', doc?.status === 'rejected' ? 'border-clay/30 bg-clay-50/40' : doc?.status === 'verified' ? 'border-emerald/30 bg-emerald-50/40' : 'border-line')}>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-forest shadow-sm"><Icon name={doc?.mime?.startsWith('image/') ? 'image' : 'fileText'} size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-ink">{label}</p>
                  <p className="truncate text-[12px] text-ink-50">{doc ? `${doc.name} · ${Math.round(doc.size / 1024)} KB` : hint}</p>
                </div>
              </div>
              <DocLink doc={doc} label={label} />
              {doc && canEdit && (
                <div className="mt-3 flex gap-1.5">
                  {[['verified', 'Looks right', 'check'], ['rejected', 'Problem', 'close']].map(([st, txt, ic]) => (
                    <button key={st} type="button" onClick={() => act(toast, () => setDocStatus(r.id, key, st, doc))} className={cx('flex h-8 flex-1 items-center justify-center gap-1 rounded-full border text-[12px] font-bold transition', doc.status === st ? (st === 'verified' ? 'border-emerald bg-emerald text-white' : 'border-clay bg-clay text-white') : 'border-line bg-white text-ink-70 hover:border-forest/40')}>
                      <Icon name={ic} size={12} /> {txt}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      {canEdit && (
        <div className="sticky bottom-[calc(var(--tabbar-h,0px)+12px)] z-10 flex flex-wrap items-center justify-end gap-2 rounded-[20px] border border-line bg-white/95 p-3 shadow-lift backdrop-blur sm:pr-24">
          <span className="mr-auto text-[12.5px] text-ink-50">{rejected.length ? `${rejected.length} document(s) marked with a problem` : missing ? 'Some documents are missing' : 'Ready to decide'}</span>
          <Button variant="outline" size="sm" icon="close" onClick={() => setDialog('reject')}>Reject</Button>
          <Button variant="outline" size="sm" icon="pencil" onClick={() => setDialog('changes')}>Ask for corrections</Button>
          <Button size="sm" icon="check" disabled={missing > 0 || rejected.length > 0} onClick={() => { act(toast, () => setRetailerStatus(r.id, 'approved', { by, note: 'Documents verified' }), `${r.name} approved — Razorpay linked account created`); }}>Approve</Button>
        </div>
      )}

      <ReasonDialog open={dialog === 'changes'} onClose={() => setDialog(null)} title="Ask for corrections" confirm="Send to retailer" label="What should they fix?"
        placeholder={rejected.length ? `Please re-upload: ${rejected.map((d) => d.label).join(', ')}` : 'e.g. The GSTIN on the certificate does not match the one entered.'}
        onConfirm={(why) => { act(toast, () => setRetailerStatus(r.id, 'needs_changes', { by, note: why }), 'Sent — the retailer can fix and re-submit'); }} />
      <ReasonDialog open={dialog === 'reject'} onClose={() => setDialog(null)} title={`Reject ${r.name}?`} confirm="Reject application" tone="danger" label="Reason (sent to the retailer)"
        onConfirm={(why) => { act(toast, () => setRetailerStatus(r.id, 'rejected', { by, note: why }), 'Application rejected'); }} />
    </div>
  );
}

export default function AdminApprovals() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { can, isOwner } = useIam();
  const toast = useToast();
  const retailers = useRetailers();
  const requests = useRequests();
  const canEdit = can('retailers', 'edit');
  const by = user?.fullName;

  const apps = useMemo(() => retailers.filter((r) => r.status === 'pending' || r.status === 'needs_changes').sort((a, b) => b.joinedAt - a.joinedAt), [retailers]);
  const changes = useMemo(() => retailers.filter((r) => r.pendingChanges), [retailers]);
  const open = requests.filter((q) => q.status === 'open');
  const tab = params.get('tab') || 'applications';
  const sel = apps.find((r) => r.id === params.get('id')) || apps[0];
  const [deciding, setDeciding] = useState(null);

  const set = (patch) => setParams({ ...Object.fromEntries(params), ...patch }, { replace: true });

  return (
    <div className="space-y-5">
      <AdminPageHead title="Approval queue" note="New retailers cannot sell until approved. Bank, tax and legal changes wait here too." />
      {!canEdit && <ViewOnlyBanner what="the approval queue" />}
      <Tabs value={tab} onChange={(v) => set({ tab: v })} options={[
        { value: 'applications', label: 'New retailers', count: apps.length },
        { value: 'changes', label: 'Profile changes', count: changes.length },
        { value: 'owner', label: 'Owner sign-off', count: open.length },
      ]} />

      {tab === 'applications' && (apps.length === 0 ? <EmptyNote title="No applications waiting" body="New retailer signups land here for review." /> : (
        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <ul className="space-y-2">
            {apps.map((r) => (
              <li key={r.id}>
                <button onClick={() => set({ id: r.id })} className={cx('w-full rounded-[18px] border bg-white p-3.5 text-left shadow-sm transition hover:shadow-card', sel?.id === r.id ? 'border-forest ring-2 ring-forest/10' : 'border-line')}>
                  <div className="flex items-start justify-between gap-2"><p className="truncate text-[14px] font-bold text-ink">{r.name}</p><StatusPill status={r.status} /></div>
                  <p className="mt-0.5 text-[12px] text-ink-50">{r.city} · {timeAgo(r.joinedAt)} · {r.documents.length} docs</p>
                </button>
              </li>
            ))}
          </ul>
          {sel && <Application key={sel.id} r={sel} canEdit={canEdit} by={by} />}
        </div>
      ))}

      {tab === 'changes' && (changes.length === 0 ? <EmptyNote title="No profile changes waiting" body="When a retailer edits bank, tax or legal details, the change waits here." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {changes.map((r) => (
            <Panel key={r.id} title={r.name} note={`Asked ${timeAgo(r.pendingChanges.at)} by ${r.pendingChanges.by}`}>
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-50"><th className="pb-2">Field</th><th className="pb-2">Now</th><th className="pb-2">Requested</th></tr></thead>
                <tbody>
                  {Object.entries(r.pendingChanges.fields).map(([k, v]) => (
                    <tr key={k} className="border-t border-line-soft align-top"><td className="py-2 font-bold text-ink">{FIELD_LABEL[k] || k}</td><td className="py-2 text-ink-50 line-through">{show(k, r[k])}</td><td className="py-2 font-semibold text-emerald-700">{show(k, v)}</td></tr>
                  ))}
                </tbody>
              </table>
              {canEdit && (
                <div className="mt-4 flex justify-end gap-2">
                  <Button size="sm" variant="outline" icon="close" onClick={() => setDeciding({ r, approve: false })}>Decline</Button>
                  <Button size="sm" icon="check" onClick={() => { act(toast, () => decideChanges(r.id, true, { by }), 'Change approved and applied'); }}>Approve</Button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      ))}

      {tab === 'owner' && (
        <div className="space-y-3">
          {!isOwner && <ViewOnlyBanner what="requests waiting for the Owner" />}
          {requests.length === 0 && <EmptyNote title="No requests" body="Operations can ask the Owner to delete a retailer; those requests wait here." />}
          {requests.map((q) => {
            const fp = q.status === 'open' ? retailerFootprint(q.retailerId) : null;
            return (
              <Panel key={q.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-ink">Delete {q.retailerName}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-50">Asked by {q.by} · {timeAgo(q.at)}</p>
                    <p className="mt-2 text-[13.5px] text-ink-70">“{q.reason}”</p>
                    {fp && <p className="mt-2 text-[12.5px] text-clay-600">Effect: {fp.products} products delisted · {fp.openParts.length} open sub-orders cancelled · {money(fp.refund)} refunded</p>}
                  </div>
                  {q.status === 'open' ? (isOwner && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { act(toast, () => closeRequest(q.id, 'declined', by), 'Request declined'); }}>Decline</Button>
                      <Button size="sm" icon="trash" className="!border-clay !bg-clay" onClick={() => { act(toast, () => deleteRetailer(q.retailerId, { by, reason: `Approved request from ${q.by}: ${q.reason}` })); act(toast, () => closeRequest(q.id, 'approved', by), `${q.retailerName} deleted`); }}>Approve & delete</Button>
                    </div>
                  )) : <StatusPill status={q.status === 'approved' ? 'approved' : 'deactivated'} label={`${q.status} · ${q.decidedBy}`} />}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {deciding && (
        <ReasonDialog open onClose={() => setDeciding(null)} title={`Decline ${deciding.r.name}’s change`} confirm="Decline change" label="Reason (sent to the retailer)"
          onConfirm={(why) => { act(toast, () => decideChanges(deciding.r.id, false, { by, note: why }), 'Change declined'); }} />
      )}
      <p className="text-[12px] text-ink-35">Every decision is recorded in the audit log with who decided and why.</p>
    </div>
  );
}
