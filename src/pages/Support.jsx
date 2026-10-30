import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import TicketThread from '../components/support/TicketThread';
import { StatusPill, LABEL_CLS, SELECT_CLS, TEXTAREA_CLS } from '../components/admin/AdminUI';
import { Breadcrumbs, Button, Container } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useOrders } from '../store/orders';
import { categoryLabel, CUSTOMER_TICKET_CATEGORIES, loadTickets, openTicket, ticketStatusLabel, useTickets } from '../store/support';
import { LIVE } from '../lib/config';
import { cx } from '../lib/format';

/* Support tickets for shoppers (client review 8, customer 19): raise a problem
   with an order, a payment or anything else, with a screenshot if it helps,
   and follow it Open → In progress → Resolved → Closed while the Nivorva team
   replies here. Each reply also rings the bell and sends an email. On a phone
   the list and the open ticket take turns; on a large screen they sit side by
   side. */

const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
const BLANK = { category: 'orders', subject: '', description: '', orderRef: '' };

function NewTicket({ open, onClose, onCreated }) {
  const toast = useToast();
  const orders = useOrders();
  const [f, setF] = useState(BLANK);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (f.subject.trim().length < 4) return toast.error('Give the ticket a short subject.');
    if (f.description.trim().length < 5) return toast.error('Tell us what happened.');
    setBusy(true);
    try {
      const t = await openTicket({ ...f, subject: f.subject.trim(), description: f.description.trim(), file });
      toast.success(`${t.number} raised — the Nivorva team will reply here`);
      setF(BLANK);
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CUSTOMER_TICKET_CATEGORIES.map(([k, l]) => (
              <button key={k} type="button" onClick={() => setF((s) => ({ ...s, category: k }))} className={cx('min-h-[44px] rounded-[12px] border px-3 py-2 text-left text-[13px] font-bold', f.category === k ? 'border-forest bg-forest text-white' : 'border-line text-ink-70 hover:border-forest/40')}>{l}</button>
            ))}
          </div>
        </div>
        {(f.category === 'orders' || f.category === 'payments') && orders.length > 0 && (
          <label className="block"><span className={LABEL_CLS}>Which order? (optional)</span>
            <select value={f.orderRef} onChange={set('orderRef')} className={SELECT_CLS}>
              <option value="">Not about one order</option>
              {orders.slice(0, 60).map((o) => <option key={o.id} value={o.id}>{o.id} · {o.status}</option>)}
            </select>
          </label>
        )}
        <label className="block"><span className={LABEL_CLS}>Subject</span><input value={f.subject} onChange={set('subject')} maxLength={160} placeholder="e.g. My order has not arrived" className={SELECT_CLS} /></label>
        <label className="block"><span className={LABEL_CLS}>What happened?</span><textarea value={f.description} onChange={set('description')} rows={5} placeholder="Tell us what happened and what you expected." className={TEXTAREA_CLS} /></label>
        <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border-2 border-dashed border-line p-3 hover:border-forest/40">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sunk text-forest"><Icon name={file ? 'check' : 'upload'} size={15} /></span>
          <span className="min-w-0 text-[13px]"><b className="block truncate text-ink">{file ? file.name : 'Attach a photo or document'}</b><span className="text-[11.5px] text-ink-50">PDF, JPG, PNG or WebP, up to 5 MB · optional</span></span>
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

export default function Support() {
  const tickets = useTickets();
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState(params.get('ticket') || null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (params.get('ticket')) { setOpenId(params.get('ticket')); setParams({}, { replace: true }); } }, [params, setParams]);
  useEffect(() => { loadTickets().catch(() => {}); }, []);

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/home' }, { label: 'Support tickets' }]} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Help</p>
          <h1 className="font-hero mt-2 text-[clamp(1.7rem,4.5vw,2.3rem)] font-semibold">Support tickets</h1>
          <p className="mt-1 text-[13.5px] text-ink-50">The Nivorva team replies here — you also get a notification and an email.</p>
        </div>
        {LIVE && <Button icon="plus" onClick={() => setCreating(true)}>New ticket</Button>}
      </div>

      {!LIVE ? (
        <p className="rounded-[18px] bg-white p-6 text-[13.5px] text-ink-50 shadow-card">Support tickets need the live store.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className={cx('overflow-hidden rounded-[20px] border border-line bg-white shadow-card', openId && 'hidden lg:block')}>
            <ul className="divide-y divide-line-soft lg:max-h-[620px] lg:overflow-y-auto">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setOpenId(t.id)} className={cx('w-full px-4 py-3.5 text-left transition', openId === t.id ? 'bg-emerald-50/60' : 'hover:bg-sunk/50')}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-ink-50">{t.number}</span>
                      {t.unreadStore > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">{t.unreadStore}</span>}
                    </span>
                    <span className="mt-1 block truncate text-[14px] font-bold text-ink">{t.subject}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-[12px] text-ink-50">
                      <span className="truncate">{categoryLabel(t.category)} · {ago(t.updatedAt)}</span>
                      <StatusPill status={t.status.toLowerCase()} label={ticketStatusLabel(t.status)} />
                    </span>
                  </button>
                </li>
              ))}
              {tickets.length === 0 && (
                <li className="px-5 py-12 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-forest"><Icon name="ticket" size={20} /></span>
                  <p className="mt-3 text-[14px] font-bold text-ink">No tickets yet</p>
                  <p className="mt-1 text-[12.5px] text-ink-50">Something wrong with an order or payment? Raise a ticket.</p>
                  <p className="mt-2 text-[12.5px] text-ink-50">For bulk prices, send an <Link to="/enquiry" className="font-bold text-forest hover:underline">enquiry</Link>.</p>
                </li>
              )}
            </ul>
          </section>
          <section className={cx('overflow-hidden rounded-[20px] border border-line bg-white shadow-card', !openId && 'hidden lg:block')}>
            {openId ? (
              <>
                <button type="button" onClick={() => setOpenId(null)} className="flex h-11 w-full items-center gap-1.5 border-b border-line-soft px-4 text-[13px] font-bold text-forest lg:hidden"><Icon name="arrowLeft" size={14} /> All tickets</button>
                <TicketThread id={openId} side="customer" onChanged={() => loadTickets()} />
              </>
            ) : (
              <div className="grid h-full min-h-[320px] place-items-center p-8 text-center text-[13.5px] text-ink-50">Pick a ticket to read it.</div>
            )}
          </section>
        </div>
      )}

      <NewTicket open={creating} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); }} />
    </Container>
  );
}
