import { useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import { AdminPageHead, Avatar, Panel, StatusPill, SELECT_CLS, LABEL_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { inviteStaff, revokeInvite, updateAccount, useAccounts, useInvites } from '../../store/accounts';
import { STAFF_ROLES, staffRole } from '../../lib/access';
import { useSeller } from '../../layouts/SellerLayout';
import { timeAgo } from '../../context/NotificationStore';
import { cx } from '../../lib/format';
import { act } from '../../lib/act';

/* Retailer team accounts (requirement 21): the store owner invites staff by
   email with a limited role; the invitee sets their password on the invite
   page (/invite/:token). */
export default function SellerTeam() {
  const toast = useToast();
  const { user } = useAuth();
  const { retailer, retailerId, readOnly } = useSeller();
  const accounts = useAccounts();
  const invites = useInvites();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('fulfilment');
  const team = useMemo(() => accounts.filter((a) => a.role === 'RETAILER' && a.retailerId === retailerId && a.status !== 'deleted'), [accounts, retailerId]);
  const pending = invites.filter((i) => i.retailerId === retailerId && i.status === 'pending');
  const isOwner = user.staffRole === 'owner' && !readOnly;

  const invite = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email.');
    try {
      const inv = await inviteStaff({ email, retailerId, staffRole: role, invitedBy: user.fullName, retailerName: retailer.name });
      navigator.clipboard?.writeText(inv.link || `${window.location.origin}/invite/${inv.token}`);
      toast.success(inv.link ? `Invite emailed to ${inv.email} — link copied too.` : 'Invite created — link copied. In production it is emailed.');
      setEmail('');
    } catch (x) {
      toast.error(x.message);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHead title="Team" note="Everyone who works on your store gets their own login — no shared passwords." />
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
            <Panel title="Invite someone">
              <form onSubmit={invite} className="space-y-3">
                <label className="block"><span className={LABEL_CLS}>Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@yourstore.in" className={SELECT_CLS} /></label>
                <div>
                  <span className={LABEL_CLS}>Role</span>
                  <div className="grid gap-2">
                    {STAFF_ROLES.filter((r) => r.key !== 'owner').map((r) => (
                      <label key={r.key} className={cx('flex cursor-pointer items-start gap-2.5 rounded-[12px] border p-2.5', role === r.key ? 'border-forest bg-emerald-50/50' : 'border-line')}>
                        <input type="radio" checked={role === r.key} onChange={() => setRole(r.key)} className="mt-1 accent-[#1f5c4a]" />
                        <span><b className="text-[13px] text-ink">{r.label}</b><span className="block text-[11.5px] text-ink-50">Can use: {r.sections.join(', ')}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" icon="userPlus" full>Send invite</Button>
              </form>
            </Panel>
          )}
          <Panel title="Pending invites">
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
              {!pending.length && <li className="text-ink-50">No pending invites.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
