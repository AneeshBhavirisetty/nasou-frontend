import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import Icon from '../../components/Icon';
import { Button } from '../../components/ui';
import { AdminPageHead, EmptyNote, Kpi, LABEL_CLS, SELECT_CLS, StatusPill, TEXTAREA_CLS } from '../../components/admin/AdminUI';
import TicketThread, { PriorityPill } from '../../components/support/TicketThread';
import { useToast } from '../../context/ToastContext';
import { useSeller } from '../../layouts/SellerLayout';
import { useScopedOrders } from '../../lib/useScoped';
import { categoryLabel, loadTickets, openTicket, TICKET_CATEGORIES, TICKET_PRIORITIES, ticketStatusLabel, useTickets } from '../../store/support';
import { LIVE } from '../../lib/config';
import { cx } from '../../lib/format';

/* Seller › Support (client review 6, section 15): raise a ticket for a
   technical problem, product uploads, an order, payments, payouts or the
   account — with a category, priority, description and an attachment — and
   follow it Open → In progress → Resolved → Closed while the Nivora team
   replies here. Each reply or status change also rings the bell and emails
   the store. */

const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

function NewTicket({ open, onClose, onCreated }) {
  const toast = useToast();
  const orders = useScopedOrders();
  const [f, setF] = useState({ category: 'technical', priority: 'medium', subject: '', description: '', orderRef: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (f.subject.trim().length < 4) return toast.error('Give the ticket a short subject.');
    if (f.description.trim().length < 5) return toast.error('Describe the problem.');
    setBusy(true);
    try {
      const t = await openTicket({ ...f, subject: f.subject.trim(), description: f.description.trim(), file });
      toast.success(`${t.number} raised — the Nivora team will reply here`);
      setF({ category: 'technical', priority: 'medium', subject: '', description: '', orderRef: '' });
      setFile(null);
      onCreated(t.id);
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Raise a support ticket" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className={LABEL_CLS}>What is it about?</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TICKET_CATEGORIES.map(([k, l]) => (
              <button key={k} type="button" onClick={() => setF((s) => ({ ...s, category: k }))} className={cx('rounded-[12px] border px-3 py-2 text-left text-[12.5px] font-bold', f.category === k ? 'border-forest bg-forest text-white' : 'border-line text-ink-70 hover:border-forest/40')}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <label><span className={LABEL_CLS}>Subject</span><input value={f.subject} onChange={set('subject')} maxLength={160} placeholder="e.g. Last week’s payout has not arrived" className={SELECT_CLS} /></label>
          <label><span className={LABEL_CLS}>Priority</span>
            <select value={f.priority} onChange={set('priority')} className={SELECT_CLS}>{TICKET_PRIORITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
        </div>
        {(f.category === 'orders' || f.category === 'payments') && (
          <label className="block"><span className={LABEL_CLS}>Order (optional)</span>
            <select value={f.orderRef} onChange={set('orderRef')} className={SELECT_CLS}>
              <option value="">Not about one order</option>
              {orders.slice(0, 80).map((o) => <option key={o.id} value={o.parts[0]?.id || o.id}>{o.parts[0]?.id || o.id} · {o.customer}</option>)}
            </select>
          </label>
        )}
        <label className="block"><span className={LABEL_CLS}>Description</span><textarea value={f.description} onChange={set('description')} rows={5} placeholder="What happened, what you expected, and anything you already tried." className={TEXTAREA_CLS} /></label>
        <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border-2 border-dashed border-line p-3 hover:border-forest/40">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-sunk text-forest"><Icon name={file ? 'check' : 'upload'} size={15} /></span>
          <span className="text-[13px]"><b className="block text-ink">{file ? file.name : 'Attach a screenshot or document'}</b><span className="text-[11.5px] text-ink-50">PDF, JPG, PNG or WebP, up to 5 MB · optional</span></span>
          <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} icon="send">Raise ticket</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SellerSupport() {
  const tickets = useTickets();
  const { readOnly } = useSeller();
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState(params.get('ticket') || null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('open');

  useEffect(() => { if (params.get('ticket')) { setOpenId(params.get('ticket')); setParams({}, { replace: true }); } }, [params, setParams]);
  useEffect(() => { loadTickets().catch(() => {}); }, []);

  const shown = tickets.filter((t) => (filter === 'open' ? ['OPEN', 'IN_PROGRESS'].includes(t.status) : filter === 'done' ? ['RESOLVED', 'CLOSED'].includes(t.status) : true));
  const count = (s) => tickets.filter((t) => s.includes(t.status)).length;

  return (
    <div className="space-y-5">
      <AdminPageHead title="Support" note="Raise a ticket and the Nivora team replies here — you also get a notification and an email.">
        {!readOnly && LIVE && <Button size="sm" icon="plus" onClick={() => setCreating(true)}>New ticket</Button>}
      </AdminPageHead>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open" value={count(['OPEN'])} note="Waiting for Nivora" icon="ticket" />
        <Kpi label="In progress" value={count(['IN_PROGRESS'])} note="Being worked on" icon="clock" />
        <Kpi label="Resolved" value={count(['RESOLVED'])} note="Reply to re-open" icon="check" />
        <Kpi label="Closed" value={count(['CLOSED'])} note="All done" icon="lock" />
      </div>

      {!LIVE ? (
        <EmptyNote icon="ticket" title="Support tickets need the live API" body="Connect the store to nasou-api to raise and track tickets." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
            <div className="flex gap-1 border-b border-line-soft p-2">
              {[['open', 'Active'], ['done', 'Resolved'], ['all', 'All']].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} className={cx('flex-1 rounded-[10px] px-3 py-2 text-[12.5px] font-bold', filter === k ? 'bg-forest text-white' : 'text-ink-50 hover:bg-sunk')}>{l}</button>
              ))}
            </div>
            <ul className="max-h-[560px] divide-y divide-line-soft overflow-y-auto">
              {shown.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setOpenId(t.id)} className={cx('w-full px-4 py-3 text-left transition', openId === t.id ? 'bg-emerald-50/60' : 'hover:bg-sunk/50')}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-ink-50">{t.number}</span>
                      <PriorityPill priority={t.priority} />
                      {t.unreadStore > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">{t.unreadStore}</span>}
                    </span>
                    <span className="mt-1 block truncate text-[13.5px] font-bold text-ink">{t.subject}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-[11.5px] text-ink-50">
                      <span className="truncate">{categoryLabel(t.category)} · {ago(t.updatedAt)}</span>
                      <StatusPill status={t.status.toLowerCase()} label={ticketStatusLabel(t.status)} />
                    </span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-ink-50">No tickets here.</li>}
            </ul>
          </section>
          <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
            {openId ? <TicketThread id={openId} side="store" onChanged={() => loadTickets()} />
              : <div className="grid h-full min-h-[360px] place-items-center p-8"><EmptyNote icon="ticket" title="Pick a ticket" body="Or raise a new one — the Nivora team usually replies within a working day." /></div>}
          </section>
        </div>
      )}

      <NewTicket open={creating} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); }} />
    </div>
  );
}
