import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import DataTable from '../../components/admin/DataTable';
import { AdminPageHead, Avatar, StatusPill, Tabs, ViewOnlyBanner, SELECT_CLS, LABEL_CLS } from '../../components/admin/AdminUI';
import { Button, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { createAccount, updateAccount, useAccounts } from '../../store/accounts';
import { saveSetting } from '../../store/settings';
import { notify } from '../../store/notifications';
import { useOrders } from '../../store/orders';
import { ADMIN_MODULES, LEVEL_LABEL, TEAM_ROLES, levelOptions, teamRoleLabel } from '../../lib/access';
import { formatOrderDate } from '../../data/orders';
import { money, cx, isMobile10 } from '../../lib/format';

/* Team & customers (customer review admin item 1; requirements 3 and 7).
   Internal users: the Nasou Hive team. Exactly one Owner (the IAM admin);
   everyone else is a team member with a role preset — Operations, Support,
   Finance or Management. Customers: everyone who buys. Roles: the access
   matrix, editable by the Owner without code. */

/* customers: accounts + people in the order book without an account */
export function useCustomers() {
  const accounts = useAccounts();
  const orders = useOrders();
  return useMemo(() => {
    const m = new Map();
    for (const a of accounts) {
      if (a.role !== 'CUSTOMER') continue;
      m.set(a.id, { id: a.id, account: a, fullName: a.fullName, email: a.email, phone: a.phone, city: a.city || '', status: a.status, joined: a.createdAt, orders: 0, spent: 0, last: 0 });
    }
    const byEmail = new Map([...m.values()].filter((c) => c.email).map((c) => [c.email, c]));
    for (const o of orders) {
      const c = (o.userId && m.get(o.userId)) || byEmail.get(o.email) || (() => {
        const id = `e:${o.email || o.phone}`;
        if (!m.has(id)) m.set(id, { id, account: null, fullName: o.customer, email: o.email, phone: o.phone, city: o.city, status: 'guest', joined: o.createdAt, orders: 0, spent: 0, last: 0 });
        return m.get(id);
      })();
      c.orders += 1;
      if (o.status !== 'Cancelled') c.spent += o.total;
      c.last = Math.max(c.last, o.createdAt);
      if (!c.city) c.city = o.city;
    }
    return [...m.values()].filter((c) => c.status !== 'deleted');
  }, [accounts, orders]);
}

function MemberForm({ member, team, onClose }) {
  const toast = useToast();
  const { user } = useAuth();
  const isNew = !member;
  const [f, setF] = useState(() => ({ fullName: '', email: '', phone: '', title: '', teamRole: 'operations', ...(member || {}) }));
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const owner = member?.teamRole === 'owner';

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.fullName.trim()) return setErr('Enter the person’s name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('Enter a valid work email — one account per person, no shared logins.');
    if (f.phone && !isMobile10(f.phone)) return setErr('Mobile must be 10 digits (used for the two-factor code).');
    if (team.some((u) => u.email === f.email.trim().toLowerCase() && u.id !== member?.id)) return setErr('Someone on the team already uses that email.');
    try {
      if (isNew) {
        const a = await createAccount({ fullName: f.fullName.trim(), email: f.email, phone: f.phone, title: f.title.trim(), role: 'ADMIN', teamRole: f.teamRole }, { by: user?.fullName });
        notify({ userId: a.id, icon: 'users', title: 'Welcome to the Nivora team', body: `You joined as ${teamRoleLabel(f.teamRole)}. Two-factor sign-in is on for your account.`, to: '/admin/dashboard' });
        toast.success(`${a.fullName} added as ${teamRoleLabel(f.teamRole)} — invite sent to ${a.email}`);
      } else {
        updateAccount(member.id, { fullName: f.fullName.trim(), phone: f.phone, title: f.title.trim(), ...(owner ? {} : { teamRole: f.teamRole }) }, 'Team member updated');
        toast.success('Saved');
      }
      onClose();
    } catch (x) {
      setErr(x.message);
    }
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'Add an internal user' : `Edit · ${member.fullName}`} size="lg">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" value={f.fullName} onChange={set('fullName')} placeholder="e.g. Anita Rao" />
          <Field label="Work email" type="email" value={f.email} onChange={set('email')} disabled={!isNew} placeholder="name@nasouhive.com" hint={isNew ? 'One account per person — no shared logins' : 'Email is the login and cannot change'} />
          <Field label="Mobile (for 2FA)" inputMode="numeric" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10 digits" />
          <Field label="Job title" value={f.title} onChange={set('title')} placeholder="e.g. Settlements lead" />
        </div>
        <div>
          <span className={LABEL_CLS}>Role</span>
          {owner ? (
            <p className="rounded-[12px] bg-sunk px-3 py-2.5 text-[13px] font-semibold text-forest">Owner — the one IAM admin. Always full access; cannot be changed or suspended.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {TEAM_ROLES.filter((r) => r.key !== 'owner').map((r) => (
                <label key={r.key} className={cx('flex cursor-pointer items-start gap-3 rounded-[14px] border p-3 transition', f.teamRole === r.key ? 'border-forest bg-emerald-50/50' : 'border-line hover:border-forest/40')}>
                  <input type="radio" name="teamRole" checked={f.teamRole === r.key} onChange={() => setF((s) => ({ ...s, teamRole: r.key }))} className="mt-1 accent-[#1f5c4a]" />
                  <span><span className="block text-[14px] font-bold text-ink">{r.label}</span><span className="block text-[12px] text-ink-50">{r.blurb}</span></span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-2 text-[12px] text-ink-50">What each role can do is set in the Roles tab. There is only ever one Owner.</p>
        </div>
        {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70">Cancel</button>
          <Button type="submit" icon={isNew ? 'userPlus' : 'check'}>{isNew ? 'Add & send invite' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RolesMatrix({ presets, canEdit }) {
  const toast = useToast();
  const [draft, setDraft] = useState(presets);
  const dirty = JSON.stringify(draft) !== JSON.stringify(presets);
  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-4">
        <p className="text-[13px] text-ink-50">V = view · E = view and act · Request / Start / Approve are the special steps from the brief. Owner is always full access.</p>
        {canEdit && <Button size="sm" icon="check" disabled={!dirty} onClick={() => { saveSetting('presets', draft, 'Changed team role permissions'); toast.success('Role permissions saved — they apply on the next click'); }}>Save roles</Button>}
      </div>
      <div className="thin-bar overflow-x-auto">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="bg-[#f6f3ed]">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-forest-800">Module</th>
              {TEAM_ROLES.map((r) => <th key={r.key} className="px-2 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-forest-800">{r.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {ADMIN_MODULES.map((m) => (
              <tr key={m.key} className="border-t border-line-soft">
                <td className="px-4 py-2.5"><p className="font-bold text-ink">{m.label}</p><p className="text-[11.5px] text-ink-50">{m.note}</p></td>
                {TEAM_ROLES.map((r) => {
                  const v = r.key === 'owner' ? 'edit' : draft[r.key]?.[m.key] || 'none';
                  return (
                    <td key={r.key} className="px-2 py-2.5 text-center">
                      <select
                        value={v}
                        disabled={!canEdit || r.key === 'owner'}
                        onChange={(e) => setDraft((d) => ({ ...d, [r.key]: { ...d[r.key], [m.key]: e.target.value } }))}
                        className={cx('h-9 rounded-full border px-2 text-[12px] font-bold outline-none disabled:cursor-not-allowed', v === 'none' ? 'border-line bg-white text-ink-35' : v === 'view' ? 'border-slate/20 bg-slate-50 text-slate' : 'border-emerald/30 bg-emerald-50 text-emerald-700')}
                        aria-label={`${r.label} — ${m.label}`}
                      >
                        {levelOptions(m.key).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { users, can, presets } = useIam();
  const customers = useCustomers();
  const [editing, setEditing] = useState(undefined);
  const canTeam = can('team');
  const canTeamEdit = can('team', 'edit');
  const tab = params.get('tab') || (canTeam ? 'team' : 'customers');

  const tabs = [
    canTeam && { value: 'team', label: 'Internal users', count: users.length, icon: 'shieldCheck' },
    can('customers') && { value: 'customers', label: 'Customers', count: customers.length, icon: 'user' },
    canTeam && { value: 'roles', label: 'Roles & permissions', icon: 'key' },
  ].filter(Boolean);

  const toggle = (u) => {
    const next = u.status === 'suspended' ? 'active' : 'suspended';
    updateAccount(u.id, { status: next }, next === 'active' ? 'Team member re-activated' : 'Team member suspended');
    toast.success(`${u.fullName} ${next === 'active' ? 're-activated' : 'suspended'}`);
  };

  return (
    <div className="space-y-5">
      <AdminPageHead title="Team & customers" note="Internal users get access through their role; customers are everyone who buys on Nivora.">
        {tab === 'team' && canTeamEdit && <Button size="sm" icon="userPlus" onClick={() => setEditing(null)}>Add internal user</Button>}
      </AdminPageHead>

      <Tabs value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={tabs} />

      {tab === 'team' && (
        <>
          {!canTeamEdit && <ViewOnlyBanner what="the team" />}
          <DataTable
            id="team"
            rows={users}
            columns={[
              { key: 'fullName', label: 'Person', always: true, render: (u) => (
                <span className="flex min-w-[220px] items-center gap-3">
                  <Avatar name={u.fullName} size="sm" tone={u.teamRole === 'owner' ? 'dark' : 'sunk'} />
                  <span className="min-w-0"><span className="flex items-center gap-1.5 font-bold text-ink">{u.fullName}{u.id === user?.id && <span className="rounded-full bg-emerald-50 px-1.5 text-[10px] text-emerald-700">You</span>}</span><span className="block truncate text-[11.5px] text-ink-50">{u.email}</span></span>
                </span>
              ) },
              { key: 'teamRole', label: 'Role', value: (u) => teamRoleLabel(u.teamRole), render: (u) => <span className={cx('rounded-full px-2.5 py-1 text-[11.5px] font-bold', u.teamRole === 'owner' ? 'bg-forest text-white' : 'bg-sunk text-forest')}>{u.teamRole === 'owner' ? 'Owner · IAM admin' : teamRoleLabel(u.teamRole)}</span> },
              { key: 'title', label: 'Title' },
              { key: 'phone', label: 'Mobile', render: (u) => (u.phone ? `+91 ${u.phone}` : '—') },
              { key: 'twofa', label: '2FA', sortable: false, value: () => 'On', render: () => <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-700"><Icon name="shieldCheck" size={13} /> On</span> },
              { key: 'status', label: 'Status', render: (u) => <StatusPill status={u.status} /> },
              { key: 'lastLoginAt', label: 'Last sign-in', render: (u) => (u.lastLoginAt ? formatOrderDate(u.lastLoginAt) : '—') },
              ...(canTeamEdit ? [{ key: 'act', label: '', sortable: false, csv: false, always: true, render: (u) => (
                <span className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {u.teamRole !== 'owner' && u.id !== user?.id && (
                    <>
                      <button onClick={() => toggle(u)} className="h-8 rounded-full border border-line px-3 text-[12px] font-bold text-ink-70 hover:border-forest">{u.status === 'suspended' ? 'Re-activate' : 'Suspend'}</button>
                      <button onClick={() => { if (window.confirm(`Remove ${u.fullName} from the team? Their audit history stays.`)) { updateAccount(u.id, { status: 'deleted' }, 'Team member removed'); toast.success('Removed'); } }} className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-50 hover:text-clay" aria-label={`Remove ${u.fullName}`}><Icon name="trash" size={13} /></button>
                    </>
                  )}
                </span>
              ) }] : []),
            ]}
            searchText={(u) => `${u.fullName} ${u.email} ${u.title} ${teamRoleLabel(u.teamRole)}`}
            searchPlaceholder="Search name, email, role"
            filters={[
              { key: 'role', label: 'Role', options: TEAM_ROLES.map((r) => ({ value: r.key, label: r.label })), test: (u, v) => u.teamRole === v },
              { key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }], test: (u, v) => u.status === v },
            ]}
            onRowClick={canTeamEdit ? (u) => setEditing(u) : undefined}
            exportName="team"
          />
        </>
      )}

      {tab === 'customers' && (
        <DataTable
          id="customers"
          rows={customers}
          columns={[
            { key: 'fullName', label: 'Customer', always: true, render: (c) => (
              <span className="flex min-w-[200px] items-center gap-3"><Avatar name={c.fullName} size="sm" /><span className="min-w-0"><span className="block font-bold text-ink">{c.fullName}</span><span className="block truncate text-[11.5px] text-ink-50">{c.email || '—'}</span></span></span>
            ) },
            { key: 'phone', label: 'Mobile', render: (c) => (c.phone ? `+91 ${c.phone}` : '—') },
            { key: 'city', label: 'City' },
            { key: 'orders', label: 'Orders', align: 'right' },
            { key: 'spent', label: 'Spent', align: 'right', render: (c) => money(c.spent) },
            { key: 'last', label: 'Last order', render: (c) => (c.last ? formatOrderDate(c.last) : '—') },
            { key: 'status', label: 'Account', render: (c) => (c.status === 'guest' ? <StatusPill status="guest" label="No account" tone="neutral" /> : <StatusPill status={c.status} />) },
            { key: 'joined', label: 'Since', hidden: true, render: (c) => formatOrderDate(c.joined) },
          ]}
          searchText={(c) => `${c.fullName} ${c.email} ${c.phone} ${c.city}`}
          searchPlaceholder="Search name, email, mobile, city"
          filters={[
            { key: 'status', label: 'Account', options: [['active', 'Active'], ['blocked', 'Blocked'], ['deactivated', 'Deactivated'], ['guest', 'No account']].map(([value, label]) => ({ value, label })), test: (c, v) => c.status === v },
            { key: 'city', label: 'City', options: [...new Set(customers.map((c) => c.city).filter(Boolean))].sort().map((v) => ({ value: v, label: v })), test: (c, v) => c.city === v },
            { key: 'buyer', label: 'Buyer', options: [{ value: 'repeat', label: 'Returning (2+ orders)' }, { value: 'new', label: 'One order' }, { value: 'none', label: 'No orders yet' }], test: (c, v) => (v === 'repeat' ? c.orders > 1 : v === 'new' ? c.orders === 1 : c.orders === 0) },
          ]}
          date={(c) => c.last || c.joined}
          initialSort={{ key: 'last', dir: 'desc' }}
          onRowClick={(c) => navigate(`/admin/customers/${encodeURIComponent(c.id)}`)}
          exportName="customers"
          canExport={can('customers')}
        />
      )}

      {tab === 'roles' && <RolesMatrix key={JSON.stringify(presets)} presets={presets} canEdit={canTeamEdit} />}

      {editing !== undefined && <MemberForm key={editing?.id || 'new'} member={editing} team={users} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
