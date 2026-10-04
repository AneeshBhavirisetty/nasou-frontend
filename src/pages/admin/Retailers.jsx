import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/Modal';
import { AdminPageHead, Avatar, Kpi, StatusPill, TEXTAREA_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAdminStore } from '../../context/AdminStore';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useRetailers } from '../../store/retailers';
import { useOrders } from '../../store/orders';
import { useSettings } from '../../store/settings';
import { notify } from '../../store/notifications';
import { audit } from '../../lib/auditLog';
import { RETAILER_STATUS } from '../../lib/marketplace';
import { rupeesCompact } from '../../lib/analytics';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';

/* Retailers — the global list view (requirement 7). Opening a row shows the
   retailer's full page (RetailerDetail). */
export default function AdminRetailers() {
  const navigate = useNavigate();
  const toast = useToast();
  const retailers = useRetailers();
  const { products } = useAdminStore();
  const orders = useOrders();
  const plans = useSettings((s) => s.plans);
  const commissionDefault = useSettings((s) => s.commission.default);
  const { can } = useIam();
  const [messaging, setMessaging] = useState(null);
  const [msg, setMsg] = useState('');

  const rows = useMemo(() => {
    const prod = new Map();
    products.forEach((p) => prod.set(p.retailerId, (prod.get(p.retailerId) || 0) + 1));
    const sales = new Map();
    const parts = new Map();
    orders.forEach((o) => o.parts.forEach((p) => {
      parts.set(p.retailerId, (parts.get(p.retailerId) || 0) + 1);
      if (p.status !== 'Cancelled') sales.set(p.retailerId, (sales.get(p.retailerId) || 0) + p.total);
    }));
    return retailers.map((r) => ({
      ...r,
      products: prod.get(r.id) || 0,
      orders: parts.get(r.id) || 0,
      sales: sales.get(r.id) || 0,
      rate: r.commission?.rate ?? commissionDefault,
      planName: plans.find((p) => p.id === r.plan)?.name || r.plan,
    }));
  }, [retailers, products, orders, plans, commissionDefault]);

  const live = rows.filter((r) => r.status === 'approved');
  const queue = rows.filter((r) => r.status === 'pending' || r.status === 'needs_changes').length;

  const columns = [
    { key: 'name', label: 'Retailer', always: true, render: (r) => (
      <span className="flex min-w-[220px] items-center gap-3">
        <Avatar name={r.name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-bold text-ink">{r.name}</span>
          <span className="block truncate text-[11.5px] text-ink-50">{r.city}, {r.state}</span>
        </span>
      </span>
    ) },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
    { key: 'planName', label: 'Plan' },
    { key: 'rate', label: 'Commission', align: 'right', render: (r) => `${r.rate}%` },
    { key: 'products', label: 'Products', align: 'right' },
    { key: 'orders', label: 'Sub-orders', align: 'right' },
    { key: 'sales', label: 'Sales', align: 'right', render: (r) => money(r.sales) },
    { key: 'joinedAt', label: 'Joined', render: (r) => formatOrderDate(r.joinedAt), csv: (r) => new Date(r.joinedAt).toISOString().slice(0, 10) },
    { key: 'contact', label: 'Contact', render: (r) => <span className="whitespace-nowrap">{r.contact}</span> },
    { key: 'phone', label: 'Phone', hidden: true },
    { key: 'email', label: 'Email', hidden: true },
    { key: 'gstin', label: 'GSTIN', hidden: true, render: (r) => <span className="font-mono text-[12px]">{r.gstin}</span> },
    { key: 'razorpayAccount', label: 'Razorpay account', hidden: true, render: (r) => r.razorpayAccount ? <span className="font-mono text-[12px]">{r.razorpayAccount}</span> : <span className="text-ink-35">Not linked</span> },
  ];

  const send = (e) => {
    e.preventDefault();
    if (msg.trim().length < 5) return;
    messaging.forEach((r) => notify({ userId: `retailer:${r.id}`, icon: 'mail', title: 'Message from Nivora', body: msg.trim(), to: '/seller' }));
    audit({ action: 'retailer.message', entity: 'retailer', summary: `Messaged ${messaging.length} retailer(s): ${msg.trim().slice(0, 80)}` });
    toast.success(`Sent to ${messaging.length} retailer${messaging.length > 1 ? 's' : ''}`);
    setMessaging(null);
    setMsg('');
  };

  return (
    <div className="space-y-5">
      <AdminPageHead title="Retailers" note="Every store on Nivora. Open one for documents, commission, status and its orders.">
        <Button size="sm" variant="outline" icon="external" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/sell`); toast.success('Signup link copied — send it to the retailer'); }}>Copy signup link</Button>
        {queue > 0 && <Button size="sm" icon="shieldCheck" to="/admin/approvals">{queue} waiting for review</Button>}
      </AdminPageHead>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Active retailers" value={live.length} note={`${rows.length} on record`} icon="store" />
        <Kpi label="In the approval queue" value={queue} note="Pending or corrections asked" icon="shieldCheck" tone={queue ? 'amber' : 'forest'} onClick={() => navigate('/admin/approvals')} />
        <Kpi label="Suspended / deactivated" value={rows.filter((r) => r.status === 'suspended' || r.status === 'deactivated').length} note="Products hidden" icon="lock" />
        <Kpi label="Marketplace sales" value={rupeesCompact(rows.reduce((s, r) => s + r.sales, 0))} note="All live sub-orders" icon="rupee" />
      </div>

      <DataTable
        id="retailers"
        rows={rows}
        columns={columns}
        searchText={(r) => `${r.name} ${r.legalName} ${r.city} ${r.contact} ${r.email} ${r.gstin} ${r.phone}`}
        searchPlaceholder="Search name, city, GSTIN, contact"
        filters={[
          { key: 'status', label: 'Status', options: Object.entries(RETAILER_STATUS).map(([value, v]) => ({ value, label: v.label })), test: (r, v) => r.status === v },
          { key: 'plan', label: 'Plan', options: plans.map((p) => ({ value: p.id, label: p.name })), test: (r, v) => r.plan === v },
          { key: 'state', label: 'State', options: [...new Set(rows.map((r) => r.state))].map((s) => ({ value: s, label: s })), test: (r, v) => r.state === v },
        ]}
        date={(r) => r.joinedAt}
        initialSort={{ key: 'sales', dir: 'desc' }}
        onRowClick={(r) => navigate(`/admin/retailers/${r.id}`)}
        bulkActions={can('retailers', 'edit') ? [{ label: 'Send a message', icon: 'mail', run: (sel) => setMessaging(sel) }] : []}
        exportName="retailers"
        rowClass={(r) => (r.status === 'deleted' ? 'opacity-55' : '')}
      />

      {messaging && (
        <Modal open onClose={() => setMessaging(null)} title={`Message ${messaging.length} retailer${messaging.length > 1 ? 's' : ''}`} size="md">
          <form onSubmit={send} className="space-y-4">
            <p className="text-[13px] text-ink-50">Lands in their seller console bell. {messaging.map((r) => r.name).join(', ')}.</p>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} className={TEXTAREA_CLS} placeholder="e.g. Settlement for this week will be one day late because of the bank holiday." autoFocus />
            <div className="flex justify-end gap-3"><Button type="submit" icon="send">Send</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
