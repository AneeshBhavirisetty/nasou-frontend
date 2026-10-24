import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import { AdminPageHead, EmptyNote, Kpi, StatusPill } from '../../components/admin/AdminUI';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useRetailers } from '../../store/retailers';
import { loadEnquiries, setEnquiryStatus, useEnquiries } from '../../store/support';
import { LIVE } from '../../lib/config';

/* Super Admin › Enquiries (client review 6, customer item 14): every "Enquire
   now" and "Ask for a price" from the storefront. The team gets a bell
   notification (and an email when ENQUIRY_NOTIFY_EMAIL is set) for each new
   one; enquiries about a retailer's product also reach that retailer. Mark
   them Called back / Closed as the trade desk works through them. */

const PURPOSE = { bulk: 'Bulk / project order', dealer: 'Dealer tie-up', quote: 'Price quote', other: 'General' };
const LABEL = { NEW: 'New', CONTACTED: 'Called back', CLOSED: 'Closed' };

export default function AdminEnquiries() {
  const list = useEnquiries();
  const retailers = useRetailers();
  const { can } = useIam();
  const toast = useToast();
  const canEdit = can('orders', 'edit');
  useEffect(() => { loadEnquiries().catch(() => {}); }, []);
  const storeName = (id) => retailers.find((r) => r.id === id)?.name;
  const rows = list.map((e) => ({ ...e, at: new Date(e.createdAt).getTime() }));
  const mark = (e, status) => setEnquiryStatus(e.id, status).then(() => toast.success(`Marked ${LABEL[status].toLowerCase()}`)).catch((x) => toast.error(x.message));

  if (!LIVE) return <EmptyNote icon="inbox" title="Enquiries need the live API" body="They are saved by nasou-api when shoppers send the Enquire now form." />;

  return (
    <div className="space-y-5">
      <AdminPageHead title="Enquiries" note="Leads from Enquire now and Ask for a price. Call each one back within a working day." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="New" value={rows.filter((e) => e.status === 'NEW').length} note="Not called yet" icon="inbox" tone={rows.some((e) => e.status === 'NEW') ? 'amber' : 'forest'} />
        <Kpi label="Called back" value={rows.filter((e) => e.status === 'CONTACTED').length} note="In conversation" icon="phone" />
        <Kpi label="About a product" value={rows.filter((e) => e.productSku).length} note="Its retailer was told too" icon="package" />
        <Kpi label="Bulk orders" value={rows.filter((e) => e.purpose === 'bulk').length} note="Project / slab pricing" icon="layers" />
      </div>
      <DataTable
        id="admin-enquiries"
        rows={rows}
        columns={[
          { key: 'name', label: 'From', always: true, render: (e) => <span className="block min-w-[160px]"><b className="text-ink">{e.name}</b>{e.company && <span className="text-ink-50"> · {e.company}</span>}<span className="block text-[11.5px] text-ink-50">+91 {e.phone}{e.email ? ` · ${e.email}` : ''}</span></span> },
          { key: 'purpose', label: 'About', render: (e) => (e.productSku
            ? <span><Link to={`/product/${e.productSku}`} className="font-semibold text-forest hover:underline">{e.productSku}</Link><span className="block text-[11.5px] text-ink-50">{storeName(e.retailerId) || 'Nivora'}</span></span>
            : PURPOSE[e.purpose] || e.purpose) },
          { key: 'message', label: 'Message', render: (e) => <span className="line-clamp-2 block max-w-[340px] text-[12.5px] text-ink-70">{e.message}{e.qty ? ` (${e.qty} pcs)` : ''}</span> },
          { key: 'at', label: 'Received', render: (e) => new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) },
          { key: 'status', label: 'Status', render: (e) => <StatusPill status={(e.status || 'NEW').toLowerCase()} label={LABEL[e.status] || e.status} /> },
          ...(canEdit ? [{ key: 'act', label: '', render: (e) => (
            <span className="flex justify-end gap-1.5">
              {e.status !== 'CONTACTED' && <button onClick={(ev) => { ev.stopPropagation(); mark(e, 'CONTACTED'); }} className="rounded-full border border-forest/30 px-2.5 py-1 text-[11.5px] font-bold text-forest hover:bg-forest hover:text-white">Called</button>}
              {e.status !== 'CLOSED' && <button onClick={(ev) => { ev.stopPropagation(); mark(e, 'CLOSED'); }} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] font-bold text-ink-50 hover:border-ink-35">Close</button>}
            </span>
          ) }] : []),
        ]}
        searchText={(e) => `${e.name} ${e.company || ''} ${e.phone} ${e.email || ''} ${e.message} ${e.productSku || ''}`}
        searchPlaceholder="Search name, mobile, product or message"
        filters={[
          { key: 'status', label: 'Status', options: Object.entries(LABEL).map(([value, label]) => ({ value, label })), test: (e, v) => e.status === v },
          { key: 'purpose', label: 'Kind', options: Object.entries(PURPOSE).map(([value, label]) => ({ value, label })), test: (e, v) => e.purpose === v },
        ]}
        date={(e) => e.at}
        initialSort={{ key: 'at', dir: 'desc' }}
        exportName="enquiries"
        empty="No enquiries match."
      />
    </div>
  );
}
