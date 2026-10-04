import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import DataTable from '../../components/admin/DataTable';
import { AdminPageHead } from '../../components/admin/AdminUI';
import { useIam } from '../../context/IamStore';
import { useAuditLog, verifyChain } from '../../lib/auditLog';
import { teamRoleLabel } from '../../lib/access';
import { cx } from '../../lib/format';

/* Audit log (requirement 4): every create, edit, delete, approval, login,
   export, permission change, scope bypass and "view as retailer" session —
   who, old → new, when, from where. Searchable and exportable; nobody can
   edit it (there is no write path other than appending). */

const GROUPS = [
  ['auth', 'Sign-in & sessions'], ['permission', 'Permissions'], ['retailer', 'Retailers'], ['order', 'Orders'], ['refund', 'Refunds'],
  ['payout', 'Payouts'], ['product', 'Products & stock'], ['discount', 'Discounts'], ['account', 'Accounts'], ['customer', 'Customers'],
  ['export', 'Exports'], ['scope', 'Scope bypass'], ['impersonate', 'View as retailer'], ['settings', 'Settings'], ['request', 'Owner requests'], ['staff', 'Retailer staff'],
];
const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const compact = (v) => (v == null ? '' : typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${typeof x === 'object' && x ? JSON.stringify(x) : x}`).join(', ') : String(v));

export default function AdminAudit() {
  const [params] = useSearchParams();
  const log = useAuditLog();
  const { can } = useIam();
  const chain = useMemo(() => verifyChain(log), [log]);
  const rows = useMemo(() => [...log].reverse(), [log]);
  const actors = useMemo(() => [...new Set(log.map((e) => e.actorName))].filter(Boolean).sort(), [log]);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Audit log" note={`${log.length.toLocaleString('en-IN')} entries. Read-only for everyone, including the Owner.`} />

      <div className={cx('flex items-start gap-3 rounded-[18px] border px-4 py-3 text-[13px]', chain.ok ? 'border-emerald/20 bg-emerald-50 text-emerald-700' : 'border-clay/20 bg-clay-50 text-clay-600')}>
        <Icon name={chain.ok ? 'shieldCheck' : 'shield'} size={18} className="mt-0.5 shrink-0" />
        <p>
          <b>{chain.ok ? 'Chain intact.' : `Chain broken at entry ${chain.at + 1}.`}</b>{' '}
          Each entry carries a hash of the one before it, so an edited or removed entry shows up here. The server keeps its own copy with the real client IP.
        </p>
      </div>

      <DataTable
        id="audit"
        rows={rows}
        initialQuery={params.get('q') || ''}
        columns={[
          { key: 'at', label: 'When', always: true, render: (e) => <span className="whitespace-nowrap text-[12px]">{when(e.at)}</span>, csv: (e) => new Date(e.at).toISOString() },
          { key: 'actorName', label: 'Who', render: (e) => <span className="block min-w-[120px]"><span className="block font-bold text-ink">{e.actorName}</span><span className="text-[11.5px] text-ink-50">{teamRoleLabel(e.actorRole) !== 'Team member' ? teamRoleLabel(e.actorRole) : e.actorRole}</span></span> },
          { key: 'action', label: 'Action', render: (e) => <span className="whitespace-nowrap rounded-full bg-sunk px-2 py-0.5 font-mono text-[11.5px] font-bold text-forest">{e.action}</span> },
          { key: 'summary', label: 'What happened', render: (e) => <span className="block min-w-[260px] text-ink">{e.summary}</span> },
          { key: 'before', label: 'Old value', value: (e) => compact(e.before), render: (e) => <span className="block max-w-[200px] truncate text-[12px] text-ink-50" title={compact(e.before)}>{compact(e.before) || '—'}</span> },
          { key: 'after', label: 'New value', value: (e) => compact(e.after), render: (e) => <span className="block max-w-[200px] truncate text-[12px] text-ink-70" title={compact(e.after)}>{compact(e.after) || '—'}</span> },
          { key: 'entity', label: 'Record', hidden: true, value: (e) => `${e.entity}${e.entityId ? ` ${e.entityId}` : ''}` },
          { key: 'ip', label: 'IP', render: (e) => <span className="font-mono text-[11.5px]">{e.ip}</span> },
          { key: 'hash', label: 'Hash', hidden: true, render: (e) => <span className="font-mono text-[11px] text-ink-50">{e.hash}</span> },
        ]}
        rowKey={(e) => e.id}
        searchText={(e) => `${e.actorName} ${e.action} ${e.summary} ${e.entity} ${e.entityId} ${compact(e.before)} ${compact(e.after)}`}
        searchPlaceholder="Search person, action, record or value"
        filters={[
          { key: 'group', label: 'Type', options: GROUPS.map(([value, label]) => ({ value, label })), test: (e, v) => e.action.startsWith(`${v}.`) || (v === 'product' && e.action === 'catalog.reset') },
          { key: 'actor', label: 'Person', options: actors.map((a) => ({ value: a, label: a })), test: (e, v) => e.actorName === v },
        ]}
        date={(e) => e.at}
        exportName="audit-log"
        canExport={can('audit')}
        pageSize={50}
      />
    </div>
  );
}
