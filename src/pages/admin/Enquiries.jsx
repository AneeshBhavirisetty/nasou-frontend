import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/Modal';
import Icon from '../../components/Icon';
import { Button } from '../../components/ui';
import { findProduct } from '../../data/catalog';
import { whatsappLink } from '../../data/site';
import { itemCode } from '../../lib/format';
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
const LABEL = { NEW: 'Not called', CONTACTED: 'Called back', CLOSED: 'Closed' };
const when = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/* One enquiry, opened from the list (client review 7, Super Admin 15: "the
   enquiry is not opening when I click it"): the full message, ways to reach
   the shopper, the product and its retailer, a note, and the status. */
function EnquiryDetail({ e, storeName, canEdit, onClose, onSave }) {
  const [note, setNote] = useState(e.note || '');
  const [busy, setBusy] = useState('');
  const p = e.productSku ? findProduct(e.productSku) : null;
  const save = async (status) => { setBusy(status); await onSave(e, status, note); setBusy(''); };
  const Row = ({ k, children }) => <div className="flex gap-3 border-b border-line-soft py-2.5 text-[13px] last:border-0"><span className="w-28 shrink-0 text-ink-50">{k}</span><span className="min-w-0 flex-1 text-ink">{children}</span></div>;
  return (
    <Modal open onClose={onClose} title={`Enquiry from ${e.name}`} size="md">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={(e.status || 'NEW').toLowerCase()} label={LABEL[e.status] || e.status} />
          <span className="text-[12px] text-ink-50">Received {when(e.createdAt)}{e.updatedAt && e.updatedAt !== e.createdAt ? ` · updated ${when(e.updatedAt)}` : ''}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:+91${e.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-[12.5px] font-bold text-white shadow-btn"><Icon name="phone" size={14} /> Call +91 {e.phone}</a>
          <a href={whatsappLink(`Hi ${e.name.split(' ')[0]}, this is Nivorva about your enquiry.`, `91${e.phone}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-[12.5px] font-bold text-forest"><Icon name="whatsapp" size={14} /> WhatsApp</a>
          {e.email && <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-[12.5px] font-bold text-forest"><Icon name="mail" size={14} /> Email</a>}
        </div>
        <div className="rounded-[16px] border border-line bg-white px-4">
          <Row k="Name">{e.name}{e.company ? ` · ${e.company}` : ''}</Row>
          <Row k="Mobile">+91 {e.phone}</Row>
          {e.email && <Row k="Email">{e.email}</Row>}
          <Row k="About">{PURPOSE[e.purpose] || e.purpose || 'General'}{e.category ? ` · ${e.category}` : ''}{e.qty ? ` · ${e.qty} pcs` : ''}</Row>
          {e.productSku && (
            <Row k="Product">
              <Link to={`/product/${e.productSku}`} className="font-semibold text-forest hover:underline">{p ? `${p.name}${p.size ? ` · ${p.size}` : ''} (${itemCode(p)})` : e.productSku}</Link>
              <span className="block text-[12px] text-ink-50">Sold by {storeName(e.retailerId) || 'a retailer'} — they were notified and emailed</span>
            </Row>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-50">Message</p>
          <p className="whitespace-pre-wrap rounded-[16px] bg-sand-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink">{e.message}</p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-50">Note for the team</span>
          <textarea value={note} onChange={(ev) => setNote(ev.target.value)} disabled={!canEdit} rows={3} placeholder="e.g. Called — wants 500 pcs by Friday, sent quote" className="w-full rounded-[14px] border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-forest" />
        </label>
        {canEdit && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" loading={busy === e.status} onClick={() => save(e.status || 'NEW')}>Save note</Button>
            {e.status !== 'NEW' && <Button size="sm" variant="outline" icon="arrowLeft" loading={busy === 'NEW'} onClick={() => save('NEW')}>Not called</Button>}
            {e.status !== 'CONTACTED' && <Button size="sm" icon="phone" loading={busy === 'CONTACTED'} onClick={() => save('CONTACTED')}>Mark called back</Button>}
            {e.status !== 'CLOSED' && <Button size="sm" variant="outline" icon="check" loading={busy === 'CLOSED'} onClick={() => save('CLOSED')}>Close</Button>}
          </div>
        )}
      </div>
    </Modal>
  );
}

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
  const [openId, setOpenId] = useState(null);
  const open = rows.find((e) => e.id === openId);
  const saveDetail = (e, status, note) => setEnquiryStatus(e.id, status, note)
    .then(() => toast.success(status === e.status ? 'Note saved' : `Marked ${LABEL[status].toLowerCase()}`))
    .catch((x) => toast.error(x.message));

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
        onRowClick={(e) => setOpenId(e.id)}
        columns={[
          { key: 'name', label: 'From', always: true, render: (e) => <span className="block min-w-[160px]"><b className="text-ink">{e.name}</b>{e.company && <span className="text-ink-50"> · {e.company}</span>}<span className="block text-[11.5px] text-ink-50">+91 {e.phone}{e.email ? ` · ${e.email}` : ''}</span></span> },
          { key: 'purpose', label: 'About', render: (e) => (e.productSku
            ? <span><Link to={`/product/${e.productSku}`} onClick={(ev) => ev.stopPropagation()} className="font-semibold text-forest hover:underline">{e.productSku}</Link><span className="block text-[11.5px] text-ink-50">{storeName(e.retailerId) || 'Nivorva'}</span></span>
            : PURPOSE[e.purpose] || e.purpose) },
          { key: 'message', label: 'Message', render: (e) => <span className="line-clamp-2 block max-w-[340px] text-[12.5px] text-ink-70">{e.message}{e.qty ? ` (${e.qty} pcs)` : ''}</span> },
          { key: 'at', label: 'Received', render: (e) => new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) },
          { key: 'status', label: 'Status', render: (e) => <StatusPill status={(e.status || 'NEW').toLowerCase()} label={LABEL[e.status] || e.status} /> },
          ...(canEdit ? [{ key: 'act', label: '', render: (e) => (
            <span className="flex justify-end gap-1.5">
              {e.status !== 'NEW' && <button onClick={(ev) => { ev.stopPropagation(); mark(e, 'NEW'); }} className="whitespace-nowrap rounded-full border border-line px-2.5 py-1 text-[11.5px] font-bold text-ink-50 hover:border-ink-35">Not called</button>}
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
      {open && <EnquiryDetail key={open.id} e={open} storeName={storeName} canEdit={canEdit} onClose={() => setOpenId(null)} onSave={saveDetail} />}
    </div>
  );
}
