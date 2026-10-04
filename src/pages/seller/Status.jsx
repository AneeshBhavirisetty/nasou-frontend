import { useState } from 'react';
import Icon from '../../components/Icon';
import { Button } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { resubmitApplication } from '../../store/retailers';
import { DOC_TYPES } from '../../lib/marketplace';
import { readDocument } from '../../lib/files';
import { useSeller } from '../../layouts/SellerLayout';
import { cx } from '../../lib/format';

/* What a retailer sees until they are approved (requirements 5 and 6):
   where the application stands, what the team asked for, and — when
   corrections are asked — a way to fix documents and re-submit. */
export default function SellerStatus() {
  const toast = useToast();
  const { logout } = useAuth();
  const { retailer: r, readOnly } = useSeller();
  const [docs, setDocs] = useState(() => r.documents);
  const [busy, setBusy] = useState(false);
  const last = [...(r.statusLog || [])].reverse().find((s) => s.note && s.status !== 'pending');
  const steps = ['Submitted', 'Under review', 'Approved'];
  const at = r.status === 'pending' ? 1 : r.status === 'needs_changes' ? 1 : r.status === 'rejected' ? 1 : 2;

  const replace = async (type, file) => {
    try {
      const d = await readDocument(file, type);
      setDocs((list) => [...list.filter((x) => x.type !== type), d]);
    } catch (x) {
      toast.error(x.message);
    }
  };
  const resubmit = () => {
    setBusy(true);
    resubmitApplication(r.id, { documents: docs.map((d) => (d.status === 'rejected' ? d : { ...d, status: d.status === 'verified' ? 'verified' : 'submitted' })) });
    toast.success('Re-submitted — the Nivora team will review it again');
    setBusy(false);
  };
  const stillRejected = docs.some((d) => d.status === 'rejected');

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#173d33_0%,#1f5c4a_100%)] p-6 text-white shadow-pop sm:p-9">
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100">Your Nivora application</p>
          <h1 className="font-hero mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-semibold text-white">
            {r.status === 'pending' && 'We’re checking your documents.'}
            {r.status === 'needs_changes' && 'A few things need fixing.'}
            {r.status === 'rejected' && 'Your application was not approved.'}
            {(r.status === 'deactivated' || r.status === 'deleted') && 'This store is closed.'}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-emerald-100">
            {r.status === 'pending' && 'Most stores are reviewed within one working day. You cannot sell until you are approved — we will notify you here and by email.'}
            {r.status === 'needs_changes' && 'Fix the items below and re-submit. Your place in the queue is kept.'}
            {r.status === 'rejected' && 'You can reply to the reason below by writing to sellers@nivora.in.'}
          </p>
          <ol className="mt-6 grid grid-cols-3 gap-2">
            {steps.map((s, i) => (
              <li key={s}>
                <span className={cx('block h-1.5 rounded-full', i <= at ? 'bg-white' : 'bg-white/25')} />
                <span className={cx('mt-2 block text-[12px] font-bold', i <= at ? 'text-white' : 'text-white/50')}>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {last && (
        <div className={cx('rounded-[20px] border p-4', r.status === 'rejected' ? 'border-clay/20 bg-clay-50' : 'border-amber/20 bg-amber-50')}>
          <p className={cx('text-[13px] font-bold', r.status === 'rejected' ? 'text-clay-600' : 'text-amber')}>Message from the Nivora team</p>
          <p className="mt-1 text-[14px] text-ink">{last.note}</p>
        </div>
      )}

      <section className="rounded-[22px] bg-white p-5 shadow-card">
        <h2 className="text-[17px] font-semibold">Documents</h2>
        <ul className="mt-3 divide-y divide-line-soft">
          {DOC_TYPES.map((t) => {
            const d = docs.find((x) => x.type === t.key);
            return (
              <li key={t.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-ink">{t.label}</p>
                  <p className="truncate text-[12.5px] text-ink-50">{d ? d.name : 'Missing'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cx('rounded-full px-2.5 py-1 text-[11.5px] font-bold', d?.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : d?.status === 'rejected' ? 'bg-clay-50 text-clay-600' : 'bg-sunk text-ink-70')}>
                    {d?.status === 'verified' ? 'Verified' : d?.status === 'rejected' ? 'Please re-upload' : d ? 'Waiting for review' : 'Missing'}
                  </span>
                  {r.status === 'needs_changes' && !readOnly && d?.status !== 'verified' && (
                    <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-bold text-forest hover:border-forest">
                      <Icon name="upload" size={14} /> Replace
                      <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => replace(t.key, e.target.files?.[0])} />
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {r.status === 'needs_changes' && !readOnly && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-line-soft pt-4">
            {stillRejected && <span className="text-[12.5px] text-clay-600">Replace the documents marked “Please re-upload” first.</span>}
            <Button icon="send" loading={busy} disabled={stillRejected} onClick={resubmit}>Re-submit for review</Button>
          </div>
        )}
      </section>

      {!readOnly && <button onClick={() => logout()} className="mx-auto flex items-center gap-2 text-[13px] font-bold text-ink-50 hover:text-clay"><Icon name="logout" size={14} /> Sign out</button>}
    </div>
  );
}
