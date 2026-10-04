import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import PartCard from '../../components/admin/PartCard';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { BackLinkInline, DetailList, EmptyNote, Panel, StatusPill, TEXTAREA_CLS, SELECT_CLS, LABEL_CLS } from '../../components/admin/AdminUI';
import Modal from '../../components/Modal';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { addOrderNote, setOrderFlag, updateOrderContact, useRefunds } from '../../store/orders';
import { useAccounts } from '../../store/accounts';
import { useScopedOrders } from '../../lib/useScoped';
import { formatOrderDate } from '../../data/orders';
import { money } from '../../lib/format';
import { act } from '../../lib/act';

/* One customer order (requirement 12): every seller's part with its own
   status, cancel and refund; order flag, internal notes, delivery details. */

const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function ContactEditor({ order, by, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ customer: order.customer, phone: order.phone, address: order.address || '', city: order.city, pin: order.pin });
  const save = (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(f.phone) || !/^\d{6}$/.test(f.pin)) return toast.error('Mobile needs 10 digits and PIN 6.');
    act(toast, () => updateOrderContact(order.id, f, by), 'Delivery details updated');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Edit delivery details" size="md">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        {[['customer', 'Name'], ['phone', 'Mobile'], ['address', 'Address'], ['city', 'City'], ['pin', 'PIN code']].map(([k, label]) => (
          <label key={k} className={k === 'address' ? 'sm:col-span-2' : ''}>
            <span className={LABEL_CLS}>{label}</span>
            <input value={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))} className={SELECT_CLS} />
          </label>
        ))}
        <div className="flex justify-end sm:col-span-2"><Button type="submit" icon="check">Save</Button></div>
      </form>
    </Modal>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const { can } = useIam();
  const orders = useScopedOrders();
  const refunds = useRefunds();
  const accounts = useAccounts();
  const o = orders.find((x) => x.id === id);
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState(null);
  const by = user?.fullName;
  const canEdit = can('orders', 'edit');
  const mine = useMemo(() => refunds.filter((r) => r.orderId === id), [refunds, id]);
  if (!o) return <EmptyNote icon="truck" title="Order not found" body="Check the order number, or it belongs to another browser’s demo data." />;
  const account = o.userId && accounts.find((a) => a.id === o.userId);

  return (
    <div className="space-y-5">
      <BackLinkInline to="/admin/orders">All orders</BackLinkInline>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-[clamp(1.4rem,3vw,1.8rem)] font-bold text-forest">{o.id}</h2>
            <StatusPill status={o.status} />
            <StatusPill status={o.paymentStatus} />
          </div>
          <p className="mt-1 text-[13px] text-ink-50">Placed {when(o.createdAt)} · {o.items} units · {o.parts.length} seller{o.parts.length > 1 ? 's' : ''} · {o.payment}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon="fileText" to={`/invoice/${o.id}`}>Invoice</Button>
          {canEdit && (o.flagged
            ? <Button size="sm" variant="outline" icon="check" onClick={() => { act(toast, () => setOrderFlag(o.id, null, by), 'Flag cleared'); }}>Clear flag</Button>
            : <Button size="sm" variant="outline" icon="bell" onClick={() => setDialog('flag')}>Flag</Button>)}
        </div>
      </div>

      {o.flagged && (
        <p className="flex items-start gap-2 rounded-[16px] border border-clay/20 bg-clay-50 px-4 py-3 text-[13px] text-clay-600">
          <Icon name="bell" size={15} className="mt-0.5 shrink-0" /> <span><b>Flagged by {o.flagged.by}</b> · {when(o.flagged.at)} — {o.flagged.reason}</span>
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {o.parts.map((p) => (
            <PartCard key={p.id} order={o} part={p} by={by} canAdvance={canEdit} canCancel={canEdit} canRefund={can('refunds', 'start')} />
          ))}
        </div>

        <aside className="space-y-4">
          <Panel title="Customer" action={canEdit && <button onClick={() => setDialog('contact')} className="text-[12.5px] font-bold text-forest hover:underline">Edit</button>}>
            <DetailList rows={[
              ['Name', account ? <Link to={`/admin/customers/${account.id}`} className="text-forest hover:underline">{o.customer}</Link> : o.customer],
              ['Mobile', `+91 ${o.phone}`],
              ['Email', o.email || '—'],
              ['Deliver to', `${o.address || ''} ${o.city} ${o.pin}`.trim()],
            ]} />
          </Panel>

          <Panel title="Money">
            <DetailList rows={[
              ['Items', money(o.subtotal)],
              o.discount > 0 && ['Discounts', `− ${money(o.discount)}`],
              ['GST', money(o.gst)],
              ['Delivery', money(o.shipping)],
              ['Order total', <b>{money(o.total)}</b>],
              ['Commission (all parts)', money(o.parts.filter((p) => p.status !== 'Cancelled').reduce((s, p) => s + p.commission, 0))],
              o.coupon && ['Code', o.coupon],
              o.razorpay && ['Razorpay order', <span className="font-mono text-[12px]">{o.razorpay.orderRef}</span>],
              o.razorpay && ['Payment', <span className="font-mono text-[12px]">{o.razorpay.paymentId}</span>],
            ]} />
          </Panel>

          {mine.length > 0 && (
            <Panel title="Refunds">
              <ul className="space-y-2">
                {mine.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2 rounded-[12px] bg-[#f6f3ed] p-2.5 text-[12.5px]">
                    <span className="min-w-0"><b className="text-ink">{money(r.amount)}</b> on {r.partId}<span className="block text-ink-50">{r.reason} · {r.requestedBy}</span></span>
                    <StatusPill status={r.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Internal notes" note="Team only — never shown to the customer or seller.">
            {canEdit && (
              <form onSubmit={(e) => { e.preventDefault(); if (note.trim().length < 3) return; act(toast, () => addOrderNote(o.id, note.trim(), by)); setNote(''); }} className="mb-3 space-y-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className={TEXTAREA_CLS} placeholder="e.g. Called customer — happy to wait for the cPVC part." />
                <Button size="sm" type="submit" icon="plus">Add note</Button>
              </form>
            )}
            <ul className="space-y-2">
              {(o.notes || []).map((n) => <li key={n.id} className="rounded-[12px] bg-[#f6f3ed] p-2.5 text-[12.5px]"><p className="text-ink">{n.text}</p><p className="mt-0.5 text-[11px] text-ink-50">{n.by} · {when(n.at)}</p></li>)}
              {!o.notes?.length && <li className="text-[12.5px] text-ink-50">No notes.</li>}
            </ul>
          </Panel>
          <p className="text-[11.5px] text-ink-35">Placed {formatOrderDate(o.createdAt)}. Every change here is written to the audit log.</p>
        </aside>
      </div>

      <ReasonDialog open={dialog === 'flag'} onClose={() => setDialog(null)} title={`Flag ${o.id}`} confirm="Flag order" label="What needs attention?" onConfirm={(why) => { act(toast, () => setOrderFlag(o.id, why, by), 'Order flagged'); }} />
      {dialog === 'contact' && <ContactEditor order={o} by={by} onClose={() => setDialog(null)} />}
    </div>
  );
}
