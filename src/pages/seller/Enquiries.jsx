import { Link } from 'react-router-dom';
import { AdminPageHead, EmptyNote, Panel, StatusPill } from '../../components/admin/AdminUI';
import Icon from '../../components/Icon';
import { useEnquiries } from '../../store/support';
import { findProduct } from '../../data/catalog';
import { LIVE } from '../../lib/config';
import { formatOrderDate } from '../../data/orders';

/* Seller › Enquiries (client review 6, customer item 14: "will the retailer
   get an email or anything?"). When a shopper asks for a price on one of this
   store's products, the store gets a bell notification, an email to its
   address, and the enquiry here. Nivora's trade desk calls the shopper back;
   the store sees who asked, for what, and how it was handled. */

export default function SellerEnquiries() {
  const list = useEnquiries();
  return (
    <div className="space-y-5">
      <AdminPageHead title="Enquiries" note="Shoppers asking for a price on your products. Nivora’s trade desk calls them back within a working day; you get a notification and an email for each one." />
      <Panel pad={false}>
        {!LIVE ? (
          <div className="p-6"><EmptyNote icon="inbox" title="Enquiries arrive from the live store" body="Connect the API to see price requests about your products." /></div>
        ) : list.length === 0 ? (
          <div className="p-6"><EmptyNote icon="inbox" title="No enquiries yet" body="When a shopper taps “Ask for a price” on one of your products, it shows up here." /></div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {list.map((e) => {
              const p = e.productSku ? findProduct(e.productSku) : null;
              return (
                <li key={e.id} className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-sunk text-forest"><Icon name="inbox" size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-ink">{e.name}{e.company ? ` · ${e.company}` : ''}</p>
                    <p className="text-[12px] text-ink-50">
                      {formatOrderDate(new Date(e.createdAt).getTime())} · {e.productSku ? <Link to={`/product/${e.productSku}`} className="font-semibold text-forest hover:underline">{p ? `${p.name}${p.size ? ` · ${p.size}` : ''}` : e.productSku}</Link> : 'General enquiry'}
                      {e.qty ? ` · ${e.qty} pcs` : ''}
                    </p>
                    <p className="mt-1.5 rounded-[12px] bg-[#f6f3ed] px-3 py-2 text-[13px] text-ink-70">{e.message}</p>
                  </div>
                  <StatusPill status={(e.status || 'NEW').toLowerCase()} label={e.status === 'CONTACTED' ? 'Called back' : e.status === 'CLOSED' ? 'Closed' : 'New'} />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
