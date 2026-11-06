import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import { AdminPageHead, Kpi, StatusPill } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { IS_MOCK, get, post } from '../../lib/api';
import { istStamp } from '../../lib/ist';

/* Emails (client, 6 Nov 2026 — "mail integration for all things"): every
   email Nivorva sends — sign-in codes, order confirmations with the invoice,
   shipping / delivery / refund updates, retailer orders and payouts, team
   alerts. Waiting ones are sent within seconds; failed ones were retried for
   about five hours first, and can be sent again from here. Sign-in codes are
   logged without their content. */

const KIND = {
  'otp-signin': 'Sign-in code', 'otp-reset': 'Password-reset code', 'otp-2fa': 'Team sign-in code',
  welcome: 'Welcome', 'password-changed': 'Password changed', 'team-welcome': 'Team welcome',
  'order-confirmed': 'Order confirmed', 'order-shipped': 'Shipped', 'order-delivered': 'Delivered', 'order-cancelled': 'Part cancelled',
  'order-unpaid': 'Unpaid order cancelled', refund: 'Refund',
  'retailer-new-order': 'Retailer · new order', 'retailer-cancelled': 'Retailer · cancelled', 'retailer-refund': 'Retailer · refund',
  'payout-paid': 'Retailer · payout', 'retailer-applied': 'Retailer · applied', 'retailer-status': 'Retailer · status', 'retailer-change': 'Retailer · profile',
  'staff-invite': 'Staff invite', 'back-in-stock': 'Back in stock', support: 'Support ticket', enquiry: 'Enquiry',
};
const kindLabel = (k) => KIND[k] || (k?.startsWith('team-') ? `Team alert · ${k.slice(5).replace(/-/g, ' ')}` : k);
const TONE = { sent: 'ok', queued: 'amber', sending: 'slate', failed: 'clay' };
const LABEL = { sent: 'Sent', queued: 'Waiting', sending: 'Sending', failed: 'Failed' };
const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function AdminEmails() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    if (IS_MOCK) { setData({ live: false, emails: [], sentToday: 0, waiting: 0, failed: 0 }); return; }
    get('/admin/emails').then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message || 'Could not load the email log.'));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const retry = async (e) => {
    setBusy(e.id);
    try {
      const r = await post(`/admin/emails/${e.id}/retry`);
      if (r.status === 'sent') toast.success(`Sent to ${e.to}`);
      else toast.info(r.status === 'failed' ? `Still failing: ${r.error || 'the mail server refused it'}` : 'Queued — it goes out in a few seconds.');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not retry that email.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHead title="Emails" note="Everything Nivorva emailed customers, retailers and the team — refreshed every 30 seconds." />

      {data && !data.live && (
        <p className="rounded-[14px] border border-amber/20 bg-amber-50 px-4 py-2.5 text-[12.5px] leading-5 text-amber">
          Email is not connected on this server (SPRING_MAIL_HOST is not set), so emails and sign-in codes are written to the server log instead of being sent.
        </p>
      )}
      {error && <p className="rounded-[14px] bg-clay-50 px-4 py-2.5 text-[13px] text-clay-600">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Sent today" value={(data?.sentToday ?? 0).toLocaleString('en-IN')} icon="mail" />
        <Kpi label="Waiting" value={(data?.waiting ?? 0).toLocaleString('en-IN')} icon="clock" tone="amber" />
        <Kpi label="Failed" value={(data?.failed ?? 0).toLocaleString('en-IN')} icon="close" tone={data?.failed ? 'clay' : 'forest'} />
      </div>

      <DataTable
        id="emails"
        rows={data?.emails || []}
        initialQuery={params.get('q') || ''}
        columns={[
          { key: 'at', label: 'When', always: true, render: (e) => <span className="whitespace-nowrap text-[12px]">{when(e.at)}</span>, csv: (e) => istStamp(e.at) },
          { key: 'kind', label: 'Email', value: (e) => kindLabel(e.kind), render: (e) => <span className="whitespace-nowrap font-semibold text-ink">{kindLabel(e.kind)}</span> },
          { key: 'to', label: 'To', render: (e) => <span className="block max-w-[220px] truncate text-[12.5px]" title={e.to}>{e.to}</span> },
          { key: 'subject', label: 'Subject', render: (e) => <span className="block min-w-[220px] max-w-[360px] truncate text-[12.5px] text-ink-70" title={e.subject}>{e.subject}{e.attachment ? ' 📎' : ''}</span> },
          { key: 'ref', label: 'About', render: (e) => <span className="font-mono text-[11.5px] text-ink-50">{e.ref || '—'}</span> },
          {
            key: 'status', label: 'Status', value: (e) => LABEL[e.status] || e.status,
            render: (e) => (
              <span className="flex items-center gap-2">
                <StatusPill status={e.status} label={LABEL[e.status]} tone={TONE[e.status]} />
                {e.status === 'failed' && e.kind && !e.kind.startsWith('otp-') && (
                  <Button size="sm" variant="outline" loading={busy === e.id} onClick={() => retry(e)}>Retry</Button>
                )}
              </span>
            ),
          },
          { key: 'error', label: 'Problem', render: (e) => <span className="block max-w-[260px] truncate text-[12px] text-clay-600" title={e.error || ''}>{e.error || ''}</span> },
          { key: 'sentAt', label: 'Sent', hidden: true, render: (e) => <span className="whitespace-nowrap text-[12px]">{when(e.sentAt)}</span>, csv: (e) => (e.sentAt ? istStamp(e.sentAt) : '') },
        ]}
        rowKey={(e) => e.id}
        searchText={(e) => `${e.to} ${e.subject} ${e.ref || ''} ${kindLabel(e.kind)}`}
        searchPlaceholder="Search address, order number or subject"
        filters={[
          { key: 'status', label: 'Status', options: Object.entries(LABEL).map(([value, label]) => ({ value, label })), test: (e, v) => e.status === v },
          { key: 'who', label: 'For', options: [{ value: 'customer', label: 'Customers' }, { value: 'retailer', label: 'Retailers' }, { value: 'team', label: 'Team' }],
            test: (e, v) => (v === 'retailer' ? /^(retailer|payout|staff)/.test(e.kind) : v === 'team' ? /^(team|enquiry|otp-2fa)/.test(e.kind) : !/^(retailer|payout|staff|team|enquiry|otp-2fa)/.test(e.kind)) },
        ]}
        date={(e) => e.at}
        exportName="emails"
        pageSize={50}
      />
    </div>
  );
}
