import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { Button } from '../ui';
import { StatusPill } from '../admin/AdminUI';
import { useToast } from '../../context/ToastContext';
import { categoryLabel, getTicket, openAttachment, replyTicket, ticketStatusLabel, updateTicket } from '../../store/support';
import { cx } from '../../lib/format';

/* One support ticket: its header, the conversation (store, Nivora, status
   changes), and a reply box with an optional attachment. `side` is 'store'
   (seller console) or 'team' (Super Admin); each side sees the other's
   messages on the left. */

const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const PRIORITY_TONE = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warn', URGENT: 'bad' };

export function PriorityPill({ priority }) {
  const p = String(priority || '').toUpperCase();
  const cls = { LOW: 'bg-sunk text-ink-50', MEDIUM: 'bg-slate-50 text-slate', HIGH: 'bg-amber-50 text-amber', URGENT: 'bg-clay-50 text-clay-600' }[p] || 'bg-sunk text-ink-50';
  return <span className={cx('rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em]', cls)}>{p.toLowerCase()}</span>;
}

export default function TicketThread({ id, side, actions, onChanged }) {
  const toast = useToast();
  const [t, setT] = useState(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    let live = true;
    setT(null);
    getTicket(id).then((x) => live && setT(x)).catch((e) => toast.error(e.message));
    return () => { live = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [t?.thread?.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      setT(await replyTicket(id, text.trim(), file));
      setText('');
      setFile(null);
      onChanged?.();
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy(false);
    }
  };
  const setStatus = async (status) => {
    try { setT(await updateTicket(id, { status })); onChanged?.(); } catch (x) { toast.error(x.message); }
  };

  if (!t) return <div className="grid h-60 place-items-center text-[13px] text-ink-50"><Icon name="spinner" size={18} className="animate-spin" /></div>;
  const mine = side === 'store' ? 'STORE' : 'TEAM';
  const closed = t.status === 'CLOSED';

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <div className="border-b border-line-soft p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] font-bold text-ink-50">{t.number}</span>
          <StatusPill status={t.status.toLowerCase()} label={ticketStatusLabel(t.status)} />
          <PriorityPill priority={t.priority} />
          <span className="rounded-full bg-sunk px-2 py-0.5 text-[10.5px] font-bold text-forest">{categoryLabel(t.category)}</span>
        </div>
        <h2 className="mt-2 text-[18px] font-semibold text-ink">{t.subject}</h2>
        <p className="mt-0.5 text-[12px] text-ink-50">
          {side === 'team' ? <><b className="text-ink-70">{t.retailerName}</b> · </> : null}
          Opened by {t.openedBy} · {when(t.createdAt)}{t.orderRef ? ` · order ${t.orderRef}` : ''}{t.assignee ? ` · with ${t.assignee}` : ''}
        </p>
        {actions && <div className="mt-3">{actions(t, setT)}</div>}
      </div>

      <div className="thin-bar flex-1 space-y-3 overflow-y-auto bg-chat p-4 sm:p-5">
        {t.thread.map((m) => m.side === 'SYSTEM' ? (
          <p key={m.id} className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-center text-[11.5px] text-ink-50 shadow-sm">{m.body} · {when(m.at)}</p>
        ) : (
          <div key={m.id} className={cx('flex', m.side === mine ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[82%] rounded-[16px] px-4 py-3 text-[13.5px] leading-relaxed', m.side === mine ? 'rounded-br-[4px] bg-forest text-white' : 'rounded-bl-[4px] border border-line-soft bg-white text-ink')}>
              <p className={cx('mb-1 text-[11px] font-bold', m.side === mine ? 'text-emerald-100' : 'text-forest')}>{m.author}{m.side === 'TEAM' ? ' · Nivora' : ''}</p>
              <p className="whitespace-pre-wrap">{m.body}</p>
              {m.attachment && (
                <button type="button" onClick={() => openAttachment(t.id, m.id).catch((e) => toast.error(e.message))} className={cx('mt-2 flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[12px] font-bold', m.side === mine ? 'bg-white/15 text-white' : 'bg-sunk text-forest')}>
                  <Icon name="fileText" size={13} /> {m.attachment.name}
                </button>
              )}
              <p className={cx('mt-1 text-[10.5px]', m.side === mine ? 'text-white/50' : 'text-ink-35')}>{when(m.at)}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-line-soft bg-chat p-3 sm:p-4">
        {closed && side === 'store' && <p className="mb-2 text-[12px] text-ink-50">This ticket is closed. Writing here opens it again.</p>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={side === 'store' ? 'Write to the Nivora team…' : `Reply to ${t.retailerName}…`} className="w-full resize-none rounded-[14px] border border-line bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-forest" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] font-bold text-forest">
            <Icon name="upload" size={14} /> {file ? file.name : 'Attach a file'}
            <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <span className="flex gap-2">
            {side === 'store' && !['RESOLVED', 'CLOSED'].includes(t.status) && <Button size="sm" variant="outline" onClick={() => setStatus('resolved')} type="button">Mark resolved</Button>}
            <Button size="sm" type="submit" loading={busy} icon="send" disabled={!text.trim()}>Send</Button>
          </span>
        </div>
      </form>
    </div>
  );
}
