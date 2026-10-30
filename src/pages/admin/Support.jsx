import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminPageHead, EmptyNote, Kpi, SearchInput, StatusPill, Tabs } from '../../components/admin/AdminUI';
import TicketThread, { PriorityPill } from '../../components/support/TicketThread';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { categoryLabel, loadTickets, TICKET_PRIORITIES, TICKET_STATUSES, ticketStatusLabel, updateTicket, useTickets } from '../../store/support';
import { LIVE } from '../../lib/config';
import { cx } from '../../lib/format';

/* Super Admin › Support tickets (client review 6, section 15) — what the
   support inbox chat used to carry for retailers, now a proper queue: every
   store's tickets, newest activity first, urgent ones on top of each status.
   The first reply takes a ticket and moves it to In progress; the team sets
   priority, status and who has it. The owner is told of every change.
   Retailers' and customers' tickets are kept on separate tabs, and both apart
   from general enquiries (client review 8). */

const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 60 ? `${Math.max(1, m)}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};
const RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function AdminSupport() {
  const tickets = useTickets();
  const { user } = useAuth();
  const { can } = useIam();
  const toast = useToast();
  const canEdit = can('retailers', 'edit');
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState(params.get('ticket') || null);
  const [status, setStatus] = useState('active');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('retailers');

  useEffect(() => { if (params.get('ticket')) { setOpenId(params.get('ticket')); setParams({}, { replace: true }); } }, [params, setParams]);
  useEffect(() => { loadTickets().catch(() => {}); }, []);
  /* a link to one ticket opens the tab it is on */
  useEffect(() => {
    const t = tickets.find((x) => x.id === openId);
    if (t) setKind(t.customerId ? 'customers' : 'retailers');
  }, [openId, tickets]);

  const ofKind = (list, k) => list.filter((t) => (k === 'customers' ? !!t.customerId : !t.customerId));
  const queue = ofKind(tickets, kind);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return queue
      .filter((t) => (status === 'active' ? ['OPEN', 'IN_PROGRESS'].includes(t.status) : status === 'all' ? true : t.status === status))
      .filter((t) => !n || `${t.number} ${t.subject} ${t.retailerName || ''} ${t.customerName || ''} ${t.customerPhone || ''} ${t.category}`.toLowerCase().includes(n))
      .sort((a, b) => (RANK[a.priority] ?? 9) - (RANK[b.priority] ?? 9) || b.updatedAt - a.updatedAt);
  }, [queue, status, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (s) => queue.filter((t) => t.status === s).length;

  const actions = (t, setT) => canEdit && (
    <div className="flex flex-wrap items-center gap-2">
      <select value={t.status} onChange={async (e) => { try { setT(await updateTicket(t.id, { status: e.target.value })); toast.success('Status updated — they have been told'); } catch (x) { toast.error(x.message); } }} aria-label="Status" className="h-9 rounded-full border border-line px-3 text-[12.5px] font-bold text-forest">
        {TICKET_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <select value={t.priority.toLowerCase()} onChange={async (e) => { try { setT(await updateTicket(t.id, { priority: e.target.value })); } catch (x) { toast.error(x.message); } }} aria-label="Priority" className="h-9 rounded-full border border-line px-3 text-[12.5px] font-bold text-forest">
        {TICKET_PRIORITIES.map(([k, l]) => <option key={k} value={k}>{l} priority</option>)}
      </select>
      {t.assignedTo !== user?.id && (
        <button onClick={async () => { try { setT(await updateTicket(t.id, { assignedTo: user.id })); toast.success('Assigned to you'); } catch (x) { toast.error(x.message); } }} className="h-9 rounded-full border border-forest/30 px-3 text-[12.5px] font-bold text-forest hover:bg-forest hover:text-white">
          Assign to me
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <AdminPageHead title="Support tickets" note="Raised by retailers from their console and by customers from their account. Reply, set the priority and status — they get a notification and an email each time." />
      <Tabs value={kind} onChange={(k) => { setKind(k); setOpenId(null); }} options={[
        { value: 'retailers', label: 'Retailers', icon: 'store', count: ofKind(tickets, 'retailers').length },
        { value: 'customers', label: 'Customers', icon: 'user', count: ofKind(tickets, 'customers').length },
      ]} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open" value={count('OPEN')} note="Nobody has replied yet" icon="ticket" tone={count('OPEN') ? 'amber' : 'forest'} />
        <Kpi label="In progress" value={count('IN_PROGRESS')} note="Being worked on" icon="clock" />
        <Kpi label="Urgent" value={queue.filter((t) => t.priority === 'URGENT' && !['RESOLVED', 'CLOSED'].includes(t.status)).length} note="Still active" icon="bolt" />
        <Kpi label="Resolved" value={count('RESOLVED') + count('CLOSED')} note="Resolved or closed" icon="check" />
      </div>

      {!LIVE ? (
        <EmptyNote icon="ticket" title="Support tickets need the live API" body="Connect nasou-api to see retailers’ tickets." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
          <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
            <div className="space-y-2 border-b border-line-soft p-3">
              <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={kind === 'customers' ? 'Search ticket, customer or subject' : 'Search ticket, store or subject'} />
              <div className="no-bar flex gap-1 overflow-x-auto">
                {[['active', 'Active'], ...TICKET_STATUSES, ['all', 'All']].map(([k, l]) => (
                  <button key={k} onClick={() => setStatus(k)} className={cx('shrink-0 rounded-[10px] px-3 py-1.5 text-[12px] font-bold', status === k ? 'bg-forest text-white' : 'text-ink-50 hover:bg-sunk')}>{l}</button>
                ))}
              </div>
            </div>
            <ul className="max-h-[620px] divide-y divide-line-soft overflow-y-auto">
              {shown.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setOpenId(t.id)} className={cx('w-full px-4 py-3 text-left transition', openId === t.id ? 'bg-emerald-50/60' : 'hover:bg-sunk/50')}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-ink-50">{t.number}</span>
                      <PriorityPill priority={t.priority} />
                      <span className="ml-auto text-[11px] text-ink-35">{ago(t.updatedAt)}</span>
                      {t.unreadTeam > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">{t.unreadTeam}</span>}
                    </span>
                    <span className="mt-1 block truncate text-[13.5px] font-bold text-ink">{t.subject}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-[11.5px] text-ink-50">
                      <span className="truncate">{t.retailerName || t.customerName} · {categoryLabel(t.category)}{t.assignee ? ` · ${t.assignee}` : ''}</span>
                      <StatusPill status={t.status.toLowerCase()} label={ticketStatusLabel(t.status)} />
                    </span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-ink-50">No tickets here.</li>}
            </ul>
          </section>
          <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
            {openId ? <TicketThread id={openId} side="team" actions={actions} onChanged={() => loadTickets()} />
              : <div className="grid h-full min-h-[360px] place-items-center p-8"><EmptyNote icon="ticket" title="Pick a ticket" body="Urgent and high-priority tickets are listed first." /></div>}
          </section>
        </div>
      )}
    </div>
  );
}
