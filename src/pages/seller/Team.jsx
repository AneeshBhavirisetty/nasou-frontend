import { useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import { AdminPageHead, Avatar, Panel, StatusPill, SELECT_CLS, LABEL_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { addStaff, revokeInvite, updateAccount, useAccounts, useInvites } from '../../store/accounts';
import { STAFF_ROLES, staffRole } from '../../lib/access';
import { useSeller } from '../../layouts/SellerLayout';
import { timeAgo } from '../../context/NotificationStore';
import { cx, digits10, isMobile10 } from '../../lib/format';
import { act } from '../../lib/act';

/* Retailer team accounts (requirement 21): the store owner adds employees
   under their store — name, mobile, email, a starting password and a role —
   and each one signs in with their own login. Invites sent earlier (by email
   link, /invite/:token) still show under Pending invites until used. */
const BLANK = { fullName: '', phone: '', email: '', password: '' };
export default function SellerTeam() {
  const toast = useToast();
  const { user } = useAuth();
  const { retailer, retailerId, readOnly } = useSeller();
  const accounts = useAccounts();
  const invites = useInvites();
  const [form, setForm] = useState(BLANK);
  const [role, setRole] = useState('fulfilment');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'phone' ? digits10(e.target.value) : e.target.value }));
  const team = useMemo(() => accounts.filter((a) => a.role === 'RETAILER' && a.retailerId === retailerId && a.status !== 'deleted'), [accounts, retailerId]);
  const pending = invites.filter((i) => i.retailerId === retailerId && i.status === 'pending');
  const isOwner = user.staffRole === 'owner' && !readOnly;

  const add = async (e) => {
    e.preventDefault();
    if (form.fullName.trim().length < 2) return toast.error('Enter their full name.');
    if (!isMobile10(form.phone)) return toast.error('Enter their 10-digit mobile number.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error('Enter a valid email.');
    if (form.password.length < 8) return toast.error('The starting password needs at least 8 characters.');
    setBusy(true);
    try {
      await addStaff({ ...form, fullName: form.fullName.trim(), email: form.email.trim(), staffRole: role, retailerId, addedBy: user.fullName, retailerName: retailer.name });
      toast.success(`${form.fullName.trim()} added — they can sign in with ${form.email.trim()} and the password you set.`);
      setForm(BLANK);
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHead title="Users & access" note="Everyone who works on your store gets their own login and a role that decides what they can open — no shared passwords." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Panel title="People" pad={false}>
          <ul className="divide-y divide-line-soft">
            {team.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={a.fullName} size="sm" tone={a.staffRole === 'owner' ? 'dark' : 'sunk'} />
                <div className="min-w-0 flex-1"><p className="font-bold text-ink">{a.fullName}{a.id === user.id && <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 text-[10px] text-emerald-700">You</span>}</p><p className="truncate text-[12px] text-ink-50">{a.email}</p></div>
                {isOwner && a.staffRole !== 'owner' ? (
                  <select value={a.staffRole} onChange={(e) => { act(toast, () => updateAccount(a.id, { staffRole: e.target.value }, `Staff role changed by ${user.fullName}`), 'Role updated'); }} className="h-9 rounded-full border border-line px-3 text-[12.5px] font-bold text-forest">
                    {STAFF_ROLES.filter((r) => r.key !== 'owner').map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                ) : <span className="rounded-full bg-sunk px-2.5 py-1 text-[12px] font-bold text-forest">{staffRole(a.staffRole).label}</span>}
                <StatusPill status={a.status} />
                {isOwner && a.staffRole !== 'owner' && (
                  <button onClick={() => { act(toast, () => updateAccount(a.id, { status: a.status === 'suspended' ? 'active' : 'suspended' }, a.status === 'suspended' ? 'Staff re-activated' : 'Staff access removed')); }} className="text-[12px] font-bold text-clay-600 hover:underline">{a.status === 'suspended' ? 'Restore' : 'Remove access'}</button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-4">
          {isOwner && (
            <Panel title="Add employee" note="They sign in with this email and password. Ask them to change the password from Account after signing in.">
              <form onSubmit={add} className="space-y-3">
                <label className="block"><span className={LABEL_CLS}>Full name</span><input value={form.fullName} onChange={set('fullName')} autoComplete="off" className={SELECT_CLS} /></label>
                <label className="block"><span className={LABEL_CLS}>Mobile</span><input value={form.phone} onChange={set('phone')} inputMode="numeric" placeholder="10 digits" autoComplete="off" className={SELECT_CLS} /></label>
                <label className="block"><span className={LABEL_CLS}>Email</span><input type="email" value={form.email} onChange={set('email')} placeholder="name@yourstore.in" autoComplete="off" className={SELECT_CLS} /></label>
                <label className="block"><span className={LABEL_CLS}>Starting password</span><input type="text" value={form.password} onChange={set('password')} placeholder="At least 8 characters" autoComplete="new-password" className={SELECT_CLS} /></label>
                <div>
                  <span className={LABEL_CLS}>Role</span>
                  <div className="grid gap-2">
                    {STAFF_ROLES.filter((r) => r.key !== 'owner').map((r) => (
                      <label key={r.key} className={cx('flex cursor-pointer items-start gap-2.5 rounded-[12px] border p-2.5', role === r.key ? 'border-forest bg-emerald-50/50' : 'border-line')}>
                        <input type="radio" checked={role === r.key} onChange={() => setRole(r.key)} className="mt-1 accent-[#095143]" />
                        <span><b className="text-[13px] text-ink">{r.label}</b><span className="block text-[11.5px] text-ink-50">Can use: {r.sections.join(', ')}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" icon="userPlus" full loading={busy}>Add employee</Button>
              </form>
            </Panel>
          )}
          {pending.length > 0 && <Panel title="Pending invites">
            <ul className="space-y-2 text-[12.5px]">
              {pending.map((i) => (
                <li key={i.token} className="flex items-center justify-between gap-2 rounded-[12px] bg-[#f6f3ed] p-2.5">
                  <span className="min-w-0"><b className="block truncate text-ink">{i.email}</b><span className="text-ink-50">{staffRole(i.staffRole).label} · {timeAgo(i.at)}</span></span>
                  <span className="flex shrink-0 gap-2">
                    <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/invite/${i.token}`); toast.success('Invite link copied'); }} className="text-forest" aria-label="Copy invite link"><Icon name="external" size={15} /></button>
                    {isOwner && <button onClick={() => revokeInvite(i.token)} className="text-ink-50 hover:text-clay" aria-label="Revoke invite"><Icon name="close" size={15} /></button>}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>}
        </div>
      </div>
    </div>
  );
}
