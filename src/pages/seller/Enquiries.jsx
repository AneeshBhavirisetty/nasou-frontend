import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHead, EmptyNote, Panel, StatusPill } from '../../components/admin/AdminUI';
import Icon from '../../components/Icon';
import { Button } from '../../components/ui';
import { setEnquiryStatus, useEnquiries } from '../../store/support';
import { findProduct } from '../../data/catalog';
import { LIVE } from '../../lib/config';
import { formatOrderDate } from '../../data/orders';
import { useToast } from '../../context/ToastContext';
import { useIam } from '../../context/IamStore';
import { useSeller } from '../../layouts/SellerLayout';
import { act } from '../../lib/act';

/* Seller › Enquiries (client review 6, customer item 14: "will the retailer
   get an email or anything?"). When a shopper asks for a price on one of this
   store's products, the store gets a bell notification, an email to its
   address, and the enquiry here. Since the final review the store can follow
   it up itself too: the shopper's phone and email, a note, and Called back /
   Closed / back to Not called. */

const LABEL = { NEW: 'Not called', CONTACTED: 'Called back', CLOSED: 'Closed' };

export default function SellerEnquiries() {
  const list = useEnquiries();
  const { readOnly } = useSeller();
  const { canSection } = useIam();
  const canEdit = !readOnly && canSection('orders');
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-5">
      <AdminPageHead title="Enquiries" note="Shoppers asking for a price on your products. Nivorva’s trade desk calls them back within a working day, or call them yourself and mark it here. You get a notification and an email for each one." />
      <Panel pad={false}>
        {!LIVE ? (
          <div className="p-6"><EmptyNote icon="inbox" title="Enquiries arrive from the live store" body="Connect the API to see price requests about your products." /></div>
        ) : list.length === 0 ? (
          <div className="p-6"><EmptyNote icon="inbox" title="No enquiries yet" body="When a shopper taps “Ask for a price” on one of your products, it shows up here." /></div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {list.map((e) => (
              <Enquiry key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} canEdit={canEdit} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Enquiry({ e, open, onToggle, canEdit }) {
  const toast = useToast();
  const [note, setNote] = useState(e.note || '');
  const [busy, setBusy] = useState(null);
  const p = e.productSku ? findProduct(e.productSku) : null;
  const status = e.status || 'NEW';
  const save = async (next) => {
    setBusy(next);
    await act(toast, () => setEnquiryStatus(e.id, next, note.trim() || null), next === status ? 'Note saved' : `Marked ${LABEL[next].toLowerCase()}`);
    setBusy(null);
  };
  return (
    <li className="px-4 py-4 sm:px-5">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-start gap-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-sunk text-forest"><Icon name="inbox" size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-ink">{e.name}{e.company ? ` · ${e.company}` : ''}</p>
          <p className="text-[12px] text-ink-50">
            {formatOrderDate(new Date(e.createdAt).getTime())} · {e.productSku ? (p ? `${p.name}${p.size ? ` · ${p.size}` : ''}` : e.productSku) : 'General enquiry'}
            {e.qty ? ` · ${e.qty} pcs` : ''}
          </p>
          <p className="mt-1.5 rounded-[12px] bg-[#f6f3ed] px-3 py-2 text-[13px] text-ink-70">{e.message}</p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <StatusPill status={status.toLowerCase()} label={LABEL[status] || 'Not called'} />
          <Icon name="chevronDown" size={16} className={open ? 'rotate-180 text-ink-50 transition' : 'text-ink-50 transition'} />
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 sm:pl-[52px]">
          <div className="flex flex-wrap gap-2 text-[13px]">
            {e.phone && <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3 py-1.5 font-bold text-white"><Icon name="phone" size={13} /> {e.phone}</a>}
            {e.email && <a href={`mailto:${e.email}`} className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-semibold text-forest"><Icon name="mail" size={13} /> <span className="truncate">{e.email}</span></a>}
            {e.productSku && <Link to={`/product/${e.productSku}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-semibold text-forest">View product</Link>}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-50">Note</span>
            <textarea value={note} onChange={(ev) => setNote(ev.target.value)} disabled={!canEdit} rows={2} maxLength={1000}
              placeholder="e.g. Called — wants 500 pcs by Friday, sent quote"
              className="w-full rounded-[14px] border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-forest" />
          </label>
          {canEdit ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" loading={busy === status} onClick={() => save(status)}>Save note</Button>
              {status !== 'NEW' && <Button size="sm" variant="outline" icon="arrowLeft" loading={busy === 'NEW'} onClick={() => save('NEW')}>Not called</Button>}
              {status !== 'CONTACTED' && <Button size="sm" icon="phone" loading={busy === 'CONTACTED'} onClick={() => save('CONTACTED')}>Mark called back</Button>}
              {status !== 'CLOSED' && <Button size="sm" variant="outline" icon="check" loading={busy === 'CLOSED'} onClick={() => save('CLOSED')}>Close</Button>}
            </div>
          ) : (
            <p className="text-[12px] text-ink-50">Your role in this store can view enquiries but not update them.</p>
          )}
        </div>
      )}
    </li>
  );
}
