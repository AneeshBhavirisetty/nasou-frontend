import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import { useAuth } from '../../context/AuthContext';
import { cx } from '../../lib/format';
import { EASE } from '../../lib/motion';
import { ROLE_LABEL } from '../../lib/roles';
import { whatsappLink } from '../../data/site';
import { getOrders } from '../../store/orders';
import { adminStore } from '../../context/AdminStore';
import { describeBulk } from '../../lib/pricing';
import { LIVE } from '../../lib/config';
import { api } from '../../lib/api';

/* ============================================================================
 * ChatWidget — floating support chat, bottom-right.
 *
 *   Customer : one thread with the Nivora support desk. With the client's AI
 *              service connected (nasou-api AI_SERVICE_URL) its first answers
 *              come from the AI; otherwise from built-in rules.
 *   Retailer : the Nivora AI assistant (review 6) — POST /assistant/chat,
 *              answered from the store's own live data. Support requests go
 *              through Support tickets instead.
 *   Admin    : an inbox of every customer thread, with replies.
 *
 * Anything can open the panel with window.dispatchEvent(new Event(OPEN_CHAT)).
 *
 * Review 5: restyled to the reference (cream thread, forest header, sand
 * chips) and the quick questions answer from live data — your latest order's
 * parts, active bulk offers, invoices — before a person picks the thread up.
 *
 * UI ONLY. Threads live in localStorage behind the tiny store below so the
 * widget is demoable end-to-end in one browser. Swap `useChatStore` for the
 * real socket/REST backend — the component API does not change.
 * ==========================================================================*/

const KEY = 'nasou_chat_v1';
export const OPEN_CHAT = 'nivora:open-chat';
const AGENT = { name: 'Nivora support', sub: 'Replies in a few minutes' };
const TEASER_KEY = 'nivora_chat_teaser';
const QUICK = ['Where is my order?', 'Bulk price for 500 pcs?', 'GST invoice copy', 'Is this size in stock?'];
const SHOW = { Pending: 'placed', Processing: 'being packed', Shipped: 'on the way', Delivered: 'delivered', Cancelled: 'cancelled' };

/* Instant answers for the quick questions; anything else gets an
   acknowledgement until an agent replies. */
function autoReply(text, userId) {
  const t = text.toLowerCase();
  if (t.includes('where is my order') || t.includes('track')) {
    const o = getOrders().filter((x) => x.userId === userId).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!o) return 'I could not find an order on this account yet. Once you order, every seller’s part shows up under Orders.';
    const parts = o.parts.map((p) => `${p.retailerName}: ${SHOW[p.status]}`).join(' · ');
    return `Your latest order ${o.id} — ${parts}. Full tracking is under Orders.`;
  }
  if (t.includes('bulk')) {
    const rules = (adminStore.get().bulkRules || []).filter((r) => r.active).slice(0, 3);
    return rules.length
      ? `Bulk prices apply by themselves in the cart: ${rules.map((r) => `${r.name} — ${describeBulk(r)} from ${r.minQty} units`).join('; ')}. For 500+ pieces, send an enquiry and we will quote.`
      : 'Bulk prices apply by themselves in the cart once you reach the quantity. For 500+ pieces, send an enquiry and we will quote.';
  }
  if (t.includes('invoice') || t.includes('gst')) return 'Every order has a GST invoice — open Orders, pick the order and tap Invoice. Trade customers can ask us to add their GSTIN.';
  return 'Thanks! A Nivora agent is on this and will reply here shortly.';
}

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
    if (t.length || LIVE) return t;
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

/* LIVE: threads live on nasou-api (GET /chat, /admin/chat). The customer's
   one thread is keyed 'mine' here; quick questions are answered by the
   server, which knows the orders. Polls every 15 s while mounted. */
function useLiveChatStore(enabled, isAdmin) {
  const [threads, setThreads] = useState([]);
  const mineOf = (t) => (t?.id ? [{ ...t, serverId: t.id, id: 'mine' }] : [{ id: 'mine', messages: [], unreadUser: 0 }]);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      if (isAdmin) setThreads((await api('/admin/chat')).map((t) => ({ ...t, serverId: t.id })));
      else setThreads(mineOf(await api('/chat')));
    } catch { /* offline — keep what we have */ }
  }, [enabled, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    if (!enabled) return undefined;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load, enabled]);

  const send = useCallback(async (threadId, from, text) => {
    try {
      if (isAdmin) {
        const t = threads.find((x) => x.id === threadId);
        await api(`/admin/chat/${t.serverId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
        await load();
      } else {
        setThreads(mineOf(await api('/chat/messages', { method: 'POST', body: JSON.stringify({ text }) })));
      }
    } catch (e) { window.alert(e.message); }
  }, [isAdmin, threads, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback((threadId) => {
    const t = threads.find((x) => x.id === threadId);
    setThreads((list) => list.map((x) => (x.id === threadId ? { ...x, unreadAdmin: isAdmin ? 0 : x.unreadAdmin, unreadUser: isAdmin ? x.unreadUser : 0 } : x)));
    api(isAdmin ? `/admin/chat/${t?.serverId}/read` : '/chat/read', { method: 'POST' }).catch(() => {});
  }, [isAdmin, threads]);

  return { threads, send, markRead, live: true };
}

const clock = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/* The assistant's face, from the NasouHive reference chatbot. */
function AssistantGlyph({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 10.5a3.5 3.5 0 1 1 7 0v3.5h-7v-3.5Z" />
      <circle cx="10.2" cy="11.2" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="11.2" r="0.8" fill="currentColor" stroke="none" />
      <path d="M9.5 15.8c.7.6 1.5.9 2.5.9s1.8-.3 2.5-.9" />
      <path d="M12 3v2.2" />
    </svg>
  );
}

function Typing() {
  return (
    <div className="flex justify-start">
      <span className="flex gap-1 rounded-[14px] rounded-bl-[4px] bg-white px-3.5 py-3 shadow-sm" aria-label="Typing">
        {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest/50" style={{ animationDelay: `${i * 0.12}s` }} />)}
      </span>
    </div>
  );
}

/* Quick questions — the reference's mint capability chips */
function Chips({ items, onPick }) {
  return (
    <div className="no-bar flex gap-2 overflow-x-auto border-t border-line bg-chat px-3 py-2.5">
      {items.map((q, i) => (
        <motion.button
          key={q}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.05, duration: 0.25, ease: EASE }}
          onClick={() => onPick(q)}
          className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-[11.5px] font-bold text-forest transition-colors hover:bg-forest hover:text-white"
        >
          {q}
        </motion.button>
      ))}
    </div>
  );
}

/* Opening card of an empty thread */
function Hello({ name, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="relative overflow-hidden rounded-[18px] border border-white bg-white p-4 text-[13px] leading-relaxed text-ink-70 shadow-[0_10px_26px_rgba(37,88,73,0.08)]"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1f5c4a,#7fd1ae,#e5d8c7)]" />
      <p className="font-hero relative text-[17px] font-medium tracking-[-0.03em] text-forest">Hi{name ? ` ${name}` : ''} 👋</p>
      <p className="relative mt-1">{children}</p>
    </motion.div>
  );
}

function Bubble({ m, mine }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={cx('flex', mine ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cx(
          'max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-snug',
          mine ? 'button-primary rounded-br-[4px] shadow-[0_8px_20px_rgba(37,88,73,0.22)]' : 'rounded-bl-[4px] bg-white text-ink shadow-sm'
        )}
      >
        {m.text}
        <span className={cx('mt-1 block text-[10.5px]', mine ? 'text-white/55' : 'text-ink-35')}>{clock(m.at)}</span>
      </div>
    </motion.div>
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
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-line bg-chat p-3">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        aria-label="Message"
        className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-[13px] text-ink outline-none transition placeholder:text-ink-35 focus:border-forest/50 focus:shadow-[0_0_0_4px_rgba(31,92,74,0.08)]"
      />
      <button
        type="submit"
        disabled={!v.trim()}
        aria-label="Send message"
        className="button-primary grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-btn transition hover:-translate-y-0.5 disabled:opacity-40"
      >
        <Icon name="send" size={16} />
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

  const [typing, setTyping] = useState(false);
  useEffect(() => { if (typing) endRef.current?.scrollIntoView({ block: 'end' }); }, [typing]);
  const send = (text) => {
    store.send(threadId, 'user', text, who);
    /* instant answer from live data (LIVE: the server answers in the same call) */
    if (!store.live) {
      setTyping(true);
      setTimeout(() => { setTyping(false); store.send(threadId, 'agent', autoReply(text, who?.id), who); }, 900);
    }
  };

  return (
    <>
      <div className="thin-bar flex-1 space-y-3 overflow-y-auto bg-chat p-4">
        {msgs.length === 0 && (
          <Hello name={who?.name && who.name !== 'Guest' ? who.name.split(' ')[0] : ''}>
            Ask about stock, sizes, bulk pricing or an order — the quick questions below answer instantly.
          </Hello>
        )}
        {msgs.map((m) => <Bubble key={m.id} m={m} mine={m.from === 'user'} />)}
        {typing && <Typing />}
        <div ref={endRef} />
      </div>
      {msgs.length === 0 && <Chips items={QUICK} onPick={send} />}
      {store.live && !who?.id
        ? <p className="border-t border-line bg-chat p-3 text-center text-[12.5px] text-ink-50"><a href="/login" className="font-bold text-forest">Sign in</a> to chat with Nivora support.</p>
        : <Composer onSend={send} />}
    </>
  );
}

/* ── retailer: AI assistant ─────────────────────────────────────────────── */
const ASSIST_KEY = 'nivora_assistant_v1';
const ASSIST_QUICK = ['Which orders should I pack?', 'What is running low on stock?', 'How were sales this week?', 'How do I create a discount?'];
const readAssist = () => { try { return JSON.parse(sessionStorage.getItem(ASSIST_KEY) || '[]'); } catch { return []; } };

function AssistantChat({ who }) {
  const [msgs, setMsgs] = useState(readAssist);
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(() => {
    try { sessionStorage.setItem(ASSIST_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* private mode */ }
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, thinking]);

  const send = async (text) => {
    const mine = { id: `u${now()}`, from: 'user', text, at: now() };
    const history = msgs.slice(-12).map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', text: m.text }));
    setMsgs((l) => [...l, mine]);
    setThinking(true);
    let reply;
    try {
      reply = LIVE
        ? (await api('/assistant/chat', { method: 'POST', body: JSON.stringify({ message: text, history }) })).reply
        : 'In the live app I answer from your store’s orders, stock and sales. Try the Orders and Products pages meanwhile.';
    } catch (e) {
      reply = e.message || 'I could not answer just now. Try again in a moment.';
    }
    setThinking(false);
    setMsgs((l) => [...l, { id: `a${now()}`, from: 'agent', text: reply, at: now() }]);
  };

  return (
    <>
      <div className="thin-bar flex-1 space-y-3 overflow-y-auto bg-chat p-4">
        {msgs.length === 0 && (
          <Hello name={who?.name?.split(' ')[0] || 'there'}>
            I’m the Nivora assistant. Ask about orders to pack, stock, sales, discounts or support — I answer from your store’s live data.
          </Hello>
        )}
        {msgs.map((m) => <Bubble key={m.id} m={m} mine={m.from === 'user'} />)}
        {thinking && <Typing />}
        <div ref={endRef} />
      </div>
      {msgs.length === 0 && <Chips items={ASSIST_QUICK} onPick={send} />}
      <Composer onSend={send} placeholder="Ask the assistant…" />
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
      <div className="flex-1 overflow-y-auto bg-chat">
        {store.threads.length === 0 && (
          <p className="p-5 text-center text-[13px] text-ink-50">No conversations yet.</p>
        )}
        {store.threads.map((t) => (
          <button
            key={t.id}
            onClick={() => setOpenId(t.id)}
            className="flex w-full items-center gap-3 border-b border-line bg-chat px-3.5 py-3 text-left transition hover:bg-white"
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
        className="flex items-center gap-1.5 border-b border-line bg-chat px-3.5 py-2.5 text-[12px] font-bold text-forest transition hover:bg-white"
      >
        <Icon name="arrowLeft" size={13} /> All conversations
      </button>
      <div className="flex-1 space-y-3 overflow-y-auto bg-chat p-4">
        {thread.messages.map((m) => <Bubble key={m.id} m={m} mine={m.from === 'agent'} />)}
        <div ref={endRef} />
      </div>
      <Composer onSend={(text) => store.send(thread.id, 'agent', text)} placeholder={`Reply to ${thread.name.split(' ')[0]}…`} />
    </>
  );
}

/* ── widget shell ──────────────────────────────────────────────────────── */
export default function ChatWidget() {
  const { isAuthenticated, isAdmin, isRetailer, user } = useAuth();
  const assistant = isRetailer && !isAdmin;
  const local = useChatStore();
  const remote = useLiveChatStore(LIVE && isAuthenticated && !(isRetailer && !isAdmin), isAdmin);
  const store = LIVE ? remote : local;
  const [open, setOpen] = useState(false);
  /* a one-line hello beside the button, once per visit, until it's used */
  const [teaser, setTeaser] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(TEASER_KEY) === '1'; } catch { /* private mode */ }
    if (seen || isAdmin) return undefined;
    const on = setTimeout(() => setTeaser(true), 3500);
    const off = setTimeout(() => setTeaser(false), 11000);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [isAdmin]);
  useEffect(() => {
    if (!open) return;
    setTeaser(false);
    try { sessionStorage.setItem(TEASER_KEY, '1'); } catch { /* private mode */ }
  }, [open]);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_CHAT, show);
    return () => window.removeEventListener(OPEN_CHAT, show);
  }, []);

  const threadId = useMemo(
    () => (LIVE ? 'mine' : isAuthenticated ? `u-${user?.id ?? 'me'}` : 'guest'),
    [isAuthenticated, user?.id]
  );
  const who = { id: user?.id, name: user?.fullName || 'Guest', role: user?.role || 'CUSTOMER' };

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
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-[calc(var(--tabbar-h,0px)+5rem)] right-4 z-[190] flex h-[min(72dvh,520px)] w-[calc(100vw-2rem)] max-w-[392px] flex-col overflow-hidden rounded-[22px] border border-white/70 bg-chat/95 shadow-[0_28px_80px_rgba(31,59,52,0.24)] backdrop-blur-2xl sm:bottom-[calc(var(--tabbar-h,0px)+6rem)] sm:right-6"
            role="dialog"
            aria-label={isAdmin ? 'Support inbox' : assistant ? 'Nivora AI assistant' : 'Chat with Nivora support'}
          >
            {/* the reference's deep-ink header, mint light pooling top-right */}
            <header className="relative flex items-center gap-2.5 overflow-hidden bg-pine bg-[radial-gradient(60%_120%_at_100%_0%,rgba(110,168,145,0.35),transparent_60%),radial-gradient(40%_90%_at_0%_100%,rgba(229,216,199,0.14),transparent_60%)] px-4 py-4 text-white">
              <span className="field-dots-dark pointer-events-none absolute inset-0 opacity-25" />
              <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-forest shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                {isAdmin ? <Icon name="headset" size={16} /> : <AssistantGlyph size={20} />}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-pine bg-[#7fd1ae]" />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold">
                  {isAdmin ? 'Support inbox' : assistant ? 'Nivora AI assistant' : AGENT.name}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/60">
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#7fd1ae]" />
                  <span className="truncate">{isAdmin ? `${store.threads.length} conversation${store.threads.length === 1 ? '' : 's'}` : assistant ? 'Answers from your store’s live data' : AGENT.sub}</span>
                </span>
              </span>
              {!isAdmin && !assistant && (
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
              : assistant
                ? <AssistantChat who={who} />
                : <CustomerChat store={store} threadId={threadId} who={who} />}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {teaser && !open && (
          <motion.button
            initial={{ opacity: 0, x: 12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.95 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[calc(var(--tabbar-h,0px)+1.35rem)] right-[4.25rem] z-[190] rounded-full rounded-br-[6px] border border-white/80 bg-white/95 px-3.5 py-2 text-[12px] font-bold text-forest shadow-[0_12px_30px_rgba(37,88,73,0.16)] backdrop-blur sm:bottom-[calc(var(--tabbar-h,0px)+2.4rem)] sm:right-[5.5rem]"
          >
            {assistant ? 'Ask your store assistant' : 'Need a size or price? Ask us'}
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        aria-label={open ? 'Close chat' : 'Open chat'}
        title={assistant ? 'AI Assistant' : 'Chat with us'}
        className="button-primary fixed bottom-[calc(var(--tabbar-h,0px)+0.75rem)] right-3 z-[190] grid h-12 w-12 place-items-center rounded-full border border-white/30 shadow-glow sm:bottom-[calc(var(--tabbar-h,0px)+1.5rem)] sm:right-6 sm:h-14 sm:w-14"
      >
        {!open && <span className="animate-halo pointer-events-none absolute inset-0 rounded-full border-2 border-forest/40" />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'x' : 'c'}
            initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
            transition={{ duration: 0.16 }}
          >
            {open ? <Icon name="close" size={22} /> : isAdmin ? <Icon name="headset" size={22} /> : <AssistantGlyph size={24} />}
          </motion.span>
        </AnimatePresence>
        {!open && unread > 0 && (
          <span className="tnum absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-clay px-1 text-[10.5px] font-bold text-white">
            {unread}
          </span>
        )}
      </motion.button>
    </>
  );
}
