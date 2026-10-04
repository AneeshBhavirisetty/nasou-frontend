import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import ReasonDialog from '../../components/admin/ReasonDialog';
import Modal from '../../components/Modal';
import { Avatar, BackLinkInline, DetailList, EmptyNote, Kpi, Panel, StatusPill, TEXTAREA_CLS } from '../../components/admin/AdminUI';
import { Button, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { addAccountNote, updateAccount } from '../../store/accounts';
import { notify } from '../../store/notifications';
import { audit } from '../../lib/auditLog';
import { useCustomers } from './Users';
import { useOrders } from '../../store/orders';
import { formatOrderDate } from '../../data/orders';
import { money, isMobile10 } from '../../lib/format';

/* Customer support control (requirement 12): edit details, block or unblock,
   send a password reset, internal notes; opened from the Customers list. */

const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const readProfile = (id) => { try { return JSON.parse(localStorage.getItem(`nasou_profile_${id}`) || 'null') || {}; } catch { return {}; } };

function EditDetails({ account, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ fullName: account.fullName, email: account.email, phone: account.phone || '', city: account.city || '' });
  const save = (e) => {
    e.preventDefault();
    if (!f.fullName.trim()) return toast.error('Enter a name.');
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return toast.error('Enter a valid email.');
    if (f.phone && !isMobile10(f.phone)) return toast.error('Mobile must be 10 digits.');
    updateAccount(account.id, { ...f, email: f.email.trim().toLowerCase() }, 'Customer details edited by support');
    notify({ userId: account.id, icon: 'user', kind: 'account', title: 'Nivora support updated your details', body: 'If you did not ask for this, reply in chat.', to: '/account' });
    toast.success('Details saved');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Edit customer details" size="md">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" value={f.fullName} onChange={(e) => setF((s) => ({ ...s, fullName: e.target.value }))} />
        <Field label="Email" value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} />
        <Field label="Mobile" inputMode="numeric" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
        <Field label="City" value={f.city} onChange={(e) => setF((s) => ({ ...s, city: e.target.value }))} />
        <div className="flex justify-end sm:col-span-2"><Button type="submit" icon="check">Save</Button></div>
      </form>
    </Modal>
  );
}

export default function AdminCustomerDetail() {
  const { id: raw } = useParams();
  const id = decodeURIComponent(raw);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { can } = useIam();
  const customers = useCustomers();
  const orders = useOrders();
  const c = customers.find((x) => x.id === id);
  const [dialog, setDialog] = useState(null);
  const [note, setNote] = useState('');
  const canEdit = can('customers', 'edit');
  const mine = useMemo(() => (c ? orders.filter((o) => (c.account && o.userId === c.account.id) || (c.email && o.email === c.email) || (!c.email && o.phone === c.phone)) : []), [orders, c]);

  if (!c) return <EmptyNote icon="user" title="Customer not found" />;
  const a = c.account;
  const addresses = a ? readProfile(a.id).addresses || [] : [];

  return (
    <div className="space-y-5">
      <BackLinkInline to="/admin/users?tab=customers">All customers</BackLinkInline>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={c.fullName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-[20px] font-semibold text-forest">{c.fullName}</h2>{a ? <StatusPill status={c.status} /> : <StatusPill status="guest" label="Ordered without an account" tone="neutral" />}</div>
              <p className="mt-0.5 text-[13px] text-ink-50">{c.email || 'no email'} · {c.phone ? `+91 ${c.phone}` : 'no mobile'} · {c.city}</p>
            </div>
          </div>
          {a && canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon="pencil" onClick={() => setDialog('edit')}>Edit details</Button>
              <Button size="sm" variant="outline" icon="key" onClick={() => {
                audit({ action: 'customer.password_reset', entity: 'account', entityId: a.id, summary: `Sent a password reset link to ${a.email || a.phone}` });
                notify({ userId: a.id, icon: 'lock', kind: 'account', title: 'Password reset requested by support', body: 'Use the link we emailed you to choose a new password.', to: '/account' });
                toast.success(`Reset link sent to ${a.email || `+91 ${a.phone}`}`);
              }}>Send password reset</Button>
              {c.status === 'blocked'
                ? <Button size="sm" icon="check" onClick={() => { updateAccount(a.id, { status: 'active', blockedReason: null }, 'Customer unblocked'); toast.success('Unblocked'); }}>Unblock</Button>
                : <Button size="sm" icon="lock" className="!border-clay !bg-clay" onClick={() => setDialog('block')}>Block</Button>}
            </div>
          )}
        </div>
        {a?.status === 'blocked' && a.blockedReason && <p className="mt-3 rounded-[12px] bg-clay-50 px-3 py-2 text-[12.5px] text-clay-600">Blocked: {a.blockedReason}</p>}
        {a?.status === 'deactivated' && <p className="mt-3 rounded-[12px] bg-sunk px-3 py-2 text-[12.5px] text-ink-70">The customer deactivated this account{a.deactivationReason ? ` (“${a.deactivationReason}”)` : ''}. It re-activates when they sign in.</p>}
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Orders" value={c.orders} icon="package" />
        <Kpi label="Spent" value={money(c.spent)} icon="rupee" />
        <Kpi label="Last order" value={c.last ? formatOrderDate(c.last) : '—'} icon="calendar" />
        <Kpi label="Customer since" value={formatOrderDate(c.joined)} icon="user" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <DataTable
          id="customer-orders"
          rows={mine}
          columns={[
            { key: 'id', label: 'Order', always: true, render: (o) => <span className="font-mono text-[12.5px] font-bold text-ink">{o.id}</span> },
            { key: 'createdAt', label: 'Placed', render: (o) => formatOrderDate(o.createdAt) },
            { key: 'sellers', label: 'Sellers', value: (o) => o.parts.map((p) => p.retailerName).join(', ') },
            { key: 'status', label: 'Status', render: (o) => <StatusPill status={o.status} /> },
            { key: 'total', label: 'Total', align: 'right', render: (o) => money(o.total) },
          ]}
          searchText={(o) => `${o.id} ${o.parts.map((p) => p.retailerName).join(' ')}`}
          initialSort={{ key: 'createdAt', dir: 'desc' }}
          onRowClick={(o) => navigate(`/admin/orders/${o.id}`)}
          exportName={`orders-${c.fullName.replace(/\s+/g, '-').toLowerCase()}`}
          pageSize={10}
        />
        <div className="space-y-4">
          {a && (
            <Panel title="Saved addresses">
              {addresses.length ? <ul className="space-y-2 text-[12.5px]">{addresses.map((ad) => <li key={ad.id} className="rounded-[12px] bg-[#f6f3ed] p-2.5"><b className="text-ink">{ad.label}</b>{ad.isDefault && ' · default'}<br />{ad.line1}, {ad.city} {ad.pin}</li>)}</ul> : <DetailList rows={[['Address book', 'Nothing saved yet']]} />}
            </Panel>
          )}
          {a && (
            <Panel title="Internal notes" note="Team only.">
              {canEdit && (
                <form onSubmit={(e) => { e.preventDefault(); if (note.trim().length < 3) return; addAccountNote(a.id, note.trim(), user?.fullName); setNote(''); }} className="mb-3 space-y-2">
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} className={TEXTAREA_CLS} placeholder="e.g. Prefers delivery after 6 pm; site contact is his foreman." />
                  <Button size="sm" type="submit" icon="plus">Add note</Button>
                </form>
              )}
              <ul className="space-y-2">
                {(a.notes || []).map((n) => <li key={n.id} className="rounded-[12px] bg-[#f6f3ed] p-2.5 text-[12.5px]"><p className="text-ink">{n.text}</p><p className="mt-0.5 text-[11px] text-ink-50">{n.by} · {when(n.at)}</p></li>)}
                {!a.notes?.length && <li className="text-[12.5px] text-ink-50">No notes.</li>}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {dialog === 'edit' && <EditDetails account={a} onClose={() => setDialog(null)} />}
      <ReasonDialog open={dialog === 'block'} onClose={() => setDialog(null)} title={`Block ${c.fullName}?`} confirm="Block customer" tone="danger" label="Reason (team only)"
        intro="They are signed out and cannot sign in or place orders until unblocked. Their order history stays."
        onConfirm={(why) => { updateAccount(a.id, { status: 'blocked', blockedReason: why }, 'Customer blocked'); toast.success('Customer blocked'); }} />
    </div>
  );
}
