import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import ExcelExportButton from '../../components/ExcelExportButton';
import { AdminPageHead, FilterTabs, SearchInput, ViewOnlyBanner } from '../../components/admin/AdminUI';
import { Badge, Button, Field } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useIam, MODULES, FULL_ACCESS } from '../../context/IamStore';
import { useOrderStore } from '../../context/OrderStore';
import { allOrders, formatOrderDate } from '../../data/orders';
import { money, cx, isMobile10 } from '../../lib/format';

/* Users & access (client review 2, admin items 5 & 6). Two roles only:
   - Admins: people who use this console. Each admin's access can be narrowed
     per module (IAM); the owner always keeps full access.
   - Customers: everyone who shops, with their order count and spend. */

const LEVEL_LABEL = { none: 'No access', view: 'View', edit: 'Edit' };
const LEVEL_TONE = { view: 'slate', edit: 'ok' };

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
}

/* ── add / edit an admin ────────────────────────────────────────────────── */
function InternalUserForm({ user, users, onClose, onSave }) {
  const isNew = !user;
  const [f, setF] = useState(() => ({
    fullName: '', email: '', phone: '', title: '', status: 'active', permissions: FULL_ACCESS,
    ...(user || {}),
  }));
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const locked = Boolean(user?.owner); // the owner always keeps full access
  const perms = locked ? FULL_ACCESS : f.permissions;

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!f.fullName.trim()) return setErr('Enter the person’s name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('Enter a valid work email.');
    if (users.some((u) => u.email.toLowerCase() === f.email.trim().toLowerCase() && u.id !== user?.id)) return setErr('Someone already uses that email.');
    if (f.phone && !isMobile10(f.phone)) return setErr('Mobile must be 10 digits.');
    onSave({
      ...f,
      id: user?.id || `iu_${Date.now().toString(36)}`,
      fullName: f.fullName.trim(),
      email: f.email.trim().toLowerCase(),
      title: f.title.trim(),
      permissions: locked ? FULL_ACCESS : f.permissions,
      createdAt: user?.createdAt || Date.now(),
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'Add admin' : `Access · ${user.fullName}`} size="lg">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="e.g. Anita Rao" />
          <Field label="Work email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@nasouhive.com" hint={isNew ? 'They get an invite to set a password' : undefined} />
          <Field label="Mobile" inputMode="numeric" value={f.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" />
          <Field label="Job title" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Dispatch lead" />
        </div>

        {/* IAM permission matrix */}
        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800">Permissions</p>
            {!locked && (
              <button type="button" onClick={() => set('permissions', FULL_ACCESS)} className="text-[12px] font-bold text-forest hover:underline">
                Give full access
              </button>
            )}
          </div>
          {locked
            ? <p className="mb-2 rounded-[12px] bg-sunk px-3 py-2 text-[12px] font-semibold text-forest">The owner always has full access to every module.</p>
            : <p className="mb-2 text-[12px] text-ink-50">New admins start with full access — narrow any module to View or None.</p>}
          <div className="divide-y divide-line-soft overflow-hidden rounded-[16px] border border-line-soft">
            {MODULES.map((m) => (
              <div key={m.key} className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2.5 sm:px-4">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-ink">{m.label}</p>
                  <p className="text-[11.5px] text-ink-50">{m.note}</p>
                </div>
                <div role="radiogroup" aria-label={`${m.label} access`} className="flex rounded-[12px] bg-[#f0f4f2] p-1">
                  {['none', 'view', 'edit'].map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={perms[m.key] === l}
                      disabled={locked}
                      onClick={() => set('permissions', { ...f.permissions, [m.key]: l })}
                      className={cx(
                        'rounded-[9px] px-3 py-1.5 text-[12px] font-bold transition disabled:cursor-not-allowed',
                        perms[m.key] === l ? (l === 'none' ? 'bg-white text-clay-600 shadow-sm' : 'bg-forest text-white shadow-sm') : 'text-ink-50 hover:text-forest'
                      )}
                    >
                      {l === 'none' ? 'None' : LEVEL_LABEL[l]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">Cancel</button>
          <Button type="submit" icon={isNew ? 'userPlus' : 'check'}>{isNew ? 'Add admin & send invite' : 'Save access'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */
export default function AdminUsers() {
  const toast = useToast();
  const { user: signedIn } = useAuth();
  const { users, saveUser, removeUser, me, can } = useIam();
  const { placed } = useOrderStore();
  const canEdit = can('users', 'edit');
  const [tab, setTab] = useState('admins');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined closed · null new · object edit

  /* customers = everyone in the order book (seeded + placed), with totals */
  const customers = useMemo(() => {
    const m = new Map();
    for (const o of allOrders(placed)) {
      const key = (o.email || o.customer).toLowerCase();
      const c = m.get(key) || { id: key, fullName: o.customer, email: o.email || '—', phone: o.phone, city: o.city, orders: 0, spent: 0, last: 0 };
      c.orders += 1;
      c.spent += o.status === 'Cancelled' ? 0 : o.total;
      c.last = Math.max(c.last, o.createdAt || 0);
      m.set(key, c);
    }
    return [...m.values()].sort((a, b) => b.last - a.last);
  }, [placed]);

  const needle = q.trim().toLowerCase();
  const admins = users.filter((u) => !needle || `${u.fullName} ${u.email} ${u.title}`.toLowerCase().includes(needle));
  const shoppers = customers.filter((c) => !needle || `${c.fullName} ${c.email} ${c.city}`.toLowerCase().includes(needle));

  const isMe = (u) => me?.id === u.id;
  const protectedUser = (u) => u.owner || isMe(u); // owner and yourself can't be suspended or removed

  const toggleStatus = (u) => {
    const next = u.status === 'active' ? 'suspended' : 'active';
    saveUser({ ...u, status: next });
    toast.success(`${u.fullName} ${next === 'active' ? 're-activated' : 'suspended'}`);
  };

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Users & access"
        note={tab === 'admins'
          ? `${users.length} admins · ${users.filter((u) => u.status === 'active').length} active`
          : `${customers.length} customers from the order book`}
      >
        {tab === 'admins' && canEdit && <Button size="sm" icon="userPlus" onClick={() => setEditing(null)}>Add admin</Button>}
        {tab === 'admins' ? (
          <ExcelExportButton
            filename="nasou-admins"
            label="Export"
            headers={['Name', 'Email', 'Phone', 'Title', 'Status', ...MODULES.map((m) => m.label)]}
            rows={admins.map((u) => [u.fullName, u.email, u.phone, u.title, u.status, ...MODULES.map((m) => LEVEL_LABEL[(u.owner ? FULL_ACCESS : u.permissions)[m.key] || 'none'])])}
          />
        ) : (
          <ExcelExportButton
            filename="nasou-customers"
            label="Export"
            headers={['Name', 'Email', 'Phone', 'City', 'Orders', 'Total spent', 'Last order']}
            rows={shoppers.map((c) => [c.fullName, c.email, c.phone, c.city, c.orders, c.spent, c.last ? formatOrderDate(c.last) : ''])}
          />
        )}
      </AdminPageHead>

      {!canEdit && <ViewOnlyBanner what="users" />}

      <FilterTabs
        label="User type"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'admins', label: 'Admins', count: users.length },
          { value: 'customers', label: 'Customers', count: customers.length },
        ]}
      />

      <div className="space-y-3 rounded-[20px] border border-line bg-white/86 p-3 shadow-card">
        <SearchInput placeholder={tab === 'admins' ? 'Search name, email or title' : 'Search name, email or city'} value={q} onChange={(e) => setQ(e.target.value)} />

      </div>

      {tab === 'admins' ? (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {admins.map((u) => {
              const p = u.owner ? FULL_ACCESS : u.permissions;
              const granted = MODULES.filter((m) => (p[m.key] || 'none') !== 'none');
              return (
                <motion.article
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  className={cx('flex flex-col rounded-[18px] border border-line bg-white p-4 shadow-card', u.status === 'suspended' && 'opacity-70')}
                >
                  <div className="flex items-start gap-3">
                    <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-full text-[13px] font-black', u.owner ? 'bg-forest text-white' : 'bg-sunk text-forest')}>
                      {initials(u.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[14.5px] font-bold text-ink">
                        {u.fullName}{isMe(u) && <span className="rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700">You</span>}
                      </p>
                      <p className="truncate text-[12px] text-ink-50">{u.title || 'Admin'}</p>
                    </div>
                    <Badge tone={u.owner ? 'dark' : 'neutral'} className="shrink-0">{u.owner ? 'Owner' : 'Admin'}</Badge>
                  </div>

                  <div className="mt-3 space-y-1 text-[12.5px] text-ink-70">
                    <p className="flex items-center gap-2 truncate"><Icon name="mail" size={13} className="shrink-0 text-ink-35" /> {u.email}</p>
                    {u.phone && <p className="tnum flex items-center gap-2"><Icon name="phone" size={13} className="shrink-0 text-ink-35" /> +91 {u.phone}</p>}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {granted.length === 0 && <span className="text-[12px] text-ink-35">No modules granted</span>}
                    {granted.length === MODULES.length && MODULES.every((m) => p[m.key] === 'edit')
                      ? <Badge tone="ok" className="!py-0.5">Full access</Badge>
                      : granted.map((m) => (
                      <Badge key={m.key} tone={LEVEL_TONE[p[m.key]]} className="!py-0.5">{m.label.split(' ')[0]} · {LEVEL_LABEL[p[m.key]]}</Badge>
                      ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft pt-3">
                    <span className={cx('flex items-center gap-1.5 text-[12px] font-bold', u.status === 'active' ? 'text-emerald-700' : 'text-amber')}>
                      <span className={cx('h-2 w-2 rounded-full', u.status === 'active' ? 'bg-emerald' : 'bg-amber')} />
                      {u.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                    {canEdit && (
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditing(u)} className="flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-[12px] font-bold text-forest transition hover:border-forest" aria-label={`Edit access for ${u.fullName}`}>
                          <Icon name="key" size={13} /> Access
                        </button>
                        {!protectedUser(u) && (
                          <>
                            <button onClick={() => toggleStatus(u)} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 transition hover:text-ink" aria-label={u.status === 'active' ? `Suspend ${u.fullName}` : `Activate ${u.fullName}`} title={u.status === 'active' ? 'Suspend' : 'Activate'}>
                              <Icon name={u.status === 'active' ? 'lock' : 'check'} size={14} />
                            </button>
                            <button onClick={() => { if (window.confirm(`Remove ${u.fullName} from the console?`)) { removeUser(u.id); toast.success(`${u.fullName} removed`); } }} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 transition hover:border-clay/40 hover:text-clay" aria-label={`Remove ${u.fullName}`}>
                              <Icon name="trash" size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
          {admins.length === 0 && <p className="rounded-[18px] border border-dashed border-line bg-white/60 px-4 py-12 text-center text-[13px] text-ink-50 md:col-span-2 xl:col-span-3">No admins match.</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shoppers.map((c) => (
            <article key={c.id} className="flex flex-col rounded-[18px] border border-line bg-white p-4 shadow-card">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-[13px] font-black text-emerald-700">{initials(c.fullName)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-ink">{c.fullName}</p>
                  <p className="truncate text-[12px] text-ink-50">{c.city}{c.last ? ` · last order ${formatOrderDate(c.last)}` : ''}</p>
                </div>
                <Badge tone="neutral" className="shrink-0">Customer</Badge>
              </div>
              <div className="mt-3 space-y-1 text-[12.5px] text-ink-70">
                <p className="flex items-center gap-2 truncate"><Icon name="mail" size={13} className="shrink-0 text-ink-35" /> {c.email}</p>
                {c.phone && <p className="tnum flex items-center gap-2"><Icon name="phone" size={13} className="shrink-0 text-ink-35" /> +91 {c.phone}</p>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line-soft pt-3">
                <div><p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-35">Orders</p><p className="tnum text-[16px] font-bold text-forest">{c.orders}</p></div>
                <div><p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-35">Spent</p><p className="tnum text-[16px] font-bold text-forest">{money(c.spent)}</p></div>
              </div>
            </article>
          ))}
          {shoppers.length === 0 && <p className="rounded-[18px] border border-dashed border-line bg-white/60 px-4 py-12 text-center text-[13px] text-ink-50 md:col-span-2 xl:col-span-3">No customers match.</p>}
        </div>
      )}

      {editing !== undefined && (
        <InternalUserForm
          key={editing?.id ?? 'new'}
          user={editing}
          users={users}
          onClose={() => setEditing(undefined)}
          onSave={(u) => {
            saveUser(u);
            toast.success(editing ? `Access updated for ${u.fullName}` : `${u.fullName} added — invite sent to ${u.email}`);
          }}
        />
      )}

      <p className="flex items-start gap-2 text-[12px] text-ink-35">
        <Icon name="shieldCheck" size={13} className="mt-0.5 shrink-0" />
        Each admin only sees the modules you allow; “View” opens a module read-only. The owner always has full access. Signed in as {signedIn?.fullName}.
      </p>
    </div>
  );
}
