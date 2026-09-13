import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import { useAuth } from '../../context/AuthContext';
import { cx } from '../../lib/format';
import { EASE } from '../../lib/motion';
import { ROLE_LABEL } from '../../lib/roles';
import { whatsappLink } from '../../data/site';

/* ============================================================================
 * ChatWidget — floating support chat, bottom-right.
 *
 *   Customer : one thread with the Nasou support desk.
 *   Admin               : an inbox of every customer thread, with replies.
 *
 * UI ONLY. Threads live in localStorage behind the tiny store below so the
 * widget is demoable end-to-end in one browser. Swap `useChatStore` for the
 * real socket/REST backend — the component API does not change.
 * ==========================================================================*/

const KEY = 'nasou_chat_v1';
const AGENT = { name: 'Nasou support', sub: 'Replies in a few minutes' };
const QUICK = ['Is this size in stock?', 'Bulk price for 500 pcs?', 'Where is my order?', 'GST invoice copy'];

const now = () => Date.now();
const readAll = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return Array.isArray(v?.threads) ? v.threads : [];
  } catch {
    return [];
  }
};
const writeAll = (threads) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ threads }));
  } catch { /* quota — non-fatal */ }
  window.dispatchEvent(new Event('nasou:chat'));
};

function seedThreads() {
  const t = now();
  return [
    {
      id: 'demo-ravi', name: 'Ravi Kumar', role: 'CUSTOMER', unreadAdmin: 1, unreadUser: 0, lastAt: t - 1000 * 60 * 8,
      messages: [
        { id: 'm1', from: 'user', text: 'Do you have 2 inch cPVC elbows in stock?', at: t - 1000 * 60 * 9 },
        { id: 'm2', from: 'agent', text: 'Checking that for you now.', at: t - 1000 * 60 * 8.5 },
        { id: 'm3', from: 'user', text: 'Need about 120 pieces by Friday.', at: t - 1000 * 60 * 8 },
      ],
    },
    {
      id: 'demo-sana', name: 'Sana Fatima', role: 'CUSTOMER', unreadAdmin: 0, unreadUser: 0, lastAt: t - 1000 * 60 * 90,
      messages: [
        { id: 'm1', from: 'user', text: 'Can I get the dealer price list?', at: t - 1000 * 60 * 95 },
        { id: 'm2', from: 'agent', text: 'Sent to your registered email just now.', at: t - 1000 * 60 * 90 },
      ],
    },
  ];
}

/* Shared store hook — re-reads on any window-level chat event. */
function useChatStore() {
  const [threads, setThreads] = useState(() => {
    const t = readAll();
    if (t.length) return t;
    const seeded = seedThreads();
    writeAll(seeded);
    return seeded;
  });

  useEffect(() => {
    const sync = () => setThreads(readAll());
    window.addEventListener('nasou:chat', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('nasou:chat', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const send = useCallback((threadId, from, text, who) => {
    const list = readAll();
    const i = list.findIndex((t) => t.id === threadId);
    const msg = { id: `m${now()}`, from, text, at: now() };
    if (i === -1) {
      list.unshift({
        id: threadId, name: who?.name || 'Guest', role: who?.role || 'CUSTOMER',
        unreadAdmin: from === 'user' ? 1 : 0, unreadUser: from === 'agent' ? 1 : 0,
        lastAt: msg.at, messages: [msg],
      });
    } else {
      const t = list[i];
      t.messages = [...t.messages, msg];
      t.lastAt = msg.at;
      if (from === 'user') t.unreadAdmin = (t.unreadAdmin || 0) + 1;
      else t.unreadUser = (t.unreadUser || 0) + 1;
      list.splice(i, 1);
      list.unshift(t);
    }
    writeAll(list);
  }, []);

  const markRead = useCallback((threadId, side) => {
    const list = readAll();
    const t = list.find((x) => x.id === threadId);
    if (!t) return;
    if (side === 'admin') t.unreadAdmin = 0; else t.unreadUser = 0;
    writeAll(list);
  }, []);

  return { threads, send, markRead };
}

const clock = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

function Bubble({ m, mine }) {
  return (
    <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-snug',
          mine ? 'rounded-br-[4px] bg-forest text-white' : 'rounded-bl-[4px] bg-white text-ink shadow-sm'
        )}
      >
        {m.text}
        <span className={cx('mt-1 block text-[10.5px]', mine ? 'text-white/50' : 'text-ink-35')}>{clock(m.at)}</span>
      </div>
    </div>
  );
}

function Composer({ onSend, placeholder = 'Type a message…' }) {
  const [v, setV] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const t = v.trim();
    if (!t) return;
    onSend(t);
    setV('');
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-[#e1e8e5] bg-white/80 p-3">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        aria-label="Message"
        className="h-10 min-w-0 flex-1 rounded-[12px] border border-[#dce5e1] bg-white px-4 text-[13px] text-ink outline-none transition placeholder:text-ink-35 focus:border-forest/50"
      />
      <button
        type="submit"
        disabled={!v.trim()}
        aria-label="Send message"
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-forest px-4 text-[13px] font-bold text-white transition hover:bg-forest-800 disabled:opacity-40"
      >
        <Icon name="send" size={14} /> Send
      </button>
    </form>
  );
}

/* ── customer view ─────────────────────────────────────────────────────── */
function CustomerChat({ store, threadId, who }) {
  const thread = store.threads.find((t) => t.id === threadId);
  const endRef = useRef(null);
  const msgs = thread?.messages ?? [];

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  useEffect(() => { if (thread?.unreadUser) store.markRead(threadId, 'user'); }, [thread?.unreadUser, threadId, store]);

  const send = (text) => {
    store.send(threadId, 'user', text, who);
    /* Placeholder auto-ack so the demo feels alive — the real backend replaces this. */
    setTimeout(() => store.send(threadId, 'agent', 'Thanks! A Nasou agent is on this and will reply here shortly.', who), 1100);
  };

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f7f9f8] p-4">
        {msgs.length === 0 && (
          <div className="rounded-[14px] bg-white p-3.5 text-[13px] leading-relaxed text-ink-70 shadow-sm">
            Hi{who?.name ? ` ${who.name.split(' ')[0]}` : ''} — ask us about stock, sizes, bulk pricing or an order.
          </div>
        )}
        {msgs.map((m) => <Bubble key={m.id} m={m} mine={m.from === 'user'} />)}
        <div ref={endRef} />
      </div>
      {msgs.length === 0 && (
        <div className="no-bar flex gap-2 overflow-x-auto border-t border-[#e1e8e5] bg-[#f7f9f8] px-3 py-2.5">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="shrink-0 rounded-full bg-sunk px-3 py-1.5 text-[11px] font-bold text-forest transition hover:bg-forest hover:text-white"
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <Composer onSend={send} />
    </>
  );
}

/* ── admin view ────────────────────────────────────────────────────────── */
function AdminChat({ store }) {
  const [openId, setOpenId] = useState(null);
  const thread = store.threads.find((t) => t.id === openId);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages.length]);
  useEffect(() => { if (thread?.unreadAdmin) store.markRead(thread.id, 'admin'); }, [thread?.unreadAdmin, thread?.id, store]);

  if (!thread) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#f7f9f8]">
        {store.threads.length === 0 && (
          <p className="p-5 text-center text-[13px] text-ink-50">No conversations yet.</p>
        )}
        {store.threads.map((t) => (
          <button
            key={t.id}
            onClick={() => setOpenId(t.id)}
            className="flex w-full items-center gap-3 border-b border-[#e1e8e5] bg-white px-3.5 py-3 text-left transition hover:bg-[#f4f7f5]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-600">
              {t.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-bold">{t.name}</span>
                <span className="shrink-0 rounded-full bg-sunk px-1.5 text-[9.5px] font-bold text-forest">{ROLE_LABEL[t.role] || t.role}</span>
              </span>
              <span className="block truncate text-[12px] text-ink-50">
                {t.messages[t.messages.length - 1]?.text}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[10.5px] text-ink-35">{clock(t.lastAt)}</span>
              {t.unreadAdmin > 0 && (
                <span className="tnum mt-0.5 inline-grid h-4 min-w-4 place-items-center rounded-full bg-forest px-1 text-[10px] font-bold text-white">
                  {t.unreadAdmin}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpenId(null)}
        className="flex items-center gap-1.5 border-b border-[#e1e8e5] bg-white px-3.5 py-2.5 text-[12px] font-bold text-forest transition hover:bg-[#f4f7f5]"
      >
        <Icon name="arrowLeft" size={13} /> All conversations
      </button>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f7f9f8] p-4">
        {thread.messages.map((m) => <Bubble key={m.id} m={m} mine={m.from === 'agent'} />)}
        <div ref={endRef} />
      </div>
      <Composer onSend={(text) => store.send(thread.id, 'agent', text)} placeholder={`Reply to ${thread.name.split(' ')[0]}…`} />
    </>
  );
}

/* ── widget shell ──────────────────────────────────────────────────────── */
export default function ChatWidget() {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const store = useChatStore();
  const [open, setOpen] = useState(false);

  const threadId = useMemo(
    () => (isAuthenticated ? `u-${user?.id ?? 'me'}` : 'guest'),
    [isAuthenticated, user?.id]
  );
  const who = { name: user?.fullName || 'Guest', role: user?.role || 'CUSTOMER' };

  const unread = isAdmin
    ? store.threads.reduce((n, t) => n + (t.unreadAdmin || 0), 0)
    : store.threads.find((t) => t.id === threadId)?.unreadUser || 0;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="fixed bottom-[calc(var(--tabbar-h,0px)+5rem)] right-4 z-[190] flex h-[min(70dvh,480px)] w-[calc(100vw-2rem)] max-w-[384px] flex-col overflow-hidden rounded-[20px] border border-white/70 bg-[#f7f9f8]/95 shadow-[0_28px_80px_rgba(31,59,52,0.24)] backdrop-blur-2xl sm:bottom-[calc(var(--tabbar-h,0px)+6rem)] sm:right-6"
            role="dialog"
            aria-label={isAdmin ? 'Support inbox' : 'Chat with Nasou support'}
          >
            <header className="flex items-center gap-2.5 bg-ink px-4 py-3.5 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-forest">
                <Icon name={isAdmin ? 'headset' : 'chat'} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold">
                  {isAdmin ? 'Support inbox' : AGENT.name}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/60">
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#8fd3b5]" />
                  <span className="truncate">{isAdmin ? `${store.threads.length} conversation${store.threads.length === 1 ? '' : 's'}` : AGENT.sub}</span>
                </span>
              </span>
              {!isAdmin && (
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp us"
                  aria-label="WhatsApp us"
                  className="flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-[11.5px] font-bold text-white transition hover:bg-white/20"
                >
                  <Icon name="whatsapp" size={15} /> <span className="hidden min-[380px]:inline">WhatsApp</span>
                </a>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-8 w-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white">
                <Icon name="close" size={16} />
              </button>
            </header>

            {isAdmin
              ? <AdminChat store={store} />
              : <CustomerChat store={store} threadId={threadId} who={who} />}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed bottom-[calc(var(--tabbar-h,0px)+0.75rem)] right-3 z-[190] grid h-12 w-12 place-items-center sm:h-14 sm:w-14 rounded-full bg-forest text-white shadow-[0_18px_40px_rgba(31,92,74,0.35)] ring-4 ring-white/70 transition hover:-translate-y-0.5 hover:bg-forest-800 sm:bottom-[calc(var(--tabbar-h,0px)+1.5rem)] sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'x' : 'c'}
            initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
            transition={{ duration: 0.16 }}
          >
            <Icon name={open ? 'close' : isAdmin ? 'headset' : 'chat'} size={22} />
          </motion.span>
        </AnimatePresence>
        {!open && unread > 0 && (
          <span className="tnum absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-forest bg-white px-1 text-[10.5px] font-bold text-forest">
            {unread}
          </span>
        )}
      </motion.button>
    </>
  );
}
