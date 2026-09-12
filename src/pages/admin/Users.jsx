import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import ExcelExportButton from '../../components/ExcelExportButton';
import { AdminPageHead, FilterTabs, SearchInput } from '../../components/admin/AdminUI';
import { Badge } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { deliveryBy } from '../../lib/format';

const ROLE_TONE = { ADMIN: 'dark', RETAILER: 'slate', CUSTOMER: 'neutral' };
const ROLE_AVATAR = { ADMIN: 'bg-forest text-white', RETAILER: 'bg-slate-50 text-slate', CUSTOMER: 'bg-emerald-50 text-emerald-600' };
const SEED = [
  ['Priya Sharma', 'priya@example.com', 'ADMIN'],
  ['Rahul Kumar', 'rahul@trade.in', 'RETAILER'],
  ['Amit Patel', 'amit@example.com', 'CUSTOMER'],
  ['Kavya Reddy', 'kavya@example.com', 'CUSTOMER'],
  ['Imran Sheikh', 'imran@mepworks.in', 'RETAILER'],
  ['Naveen Rao', 'naveen@example.com', 'CUSTOMER'],
  ['Sana Fatima', 'sana@example.com', 'CUSTOMER'],
  ['Vikram Das', 'vikram@buildpro.in', 'RETAILER'],
  ['Test User', 'test@example.com', 'CUSTOMER'],
];

export default function AdminUsers() {
  const toast = useToast();
  const [rows, setRows] = useState(() =>
    SEED.map(([fullName, email, role], i) => ({
      id: i + 1, fullName, email,
      phone: `+91 9${String(700000000 + i * 111111).slice(0, 9)}`,
      role, joined: deliveryBy(-(20 + i * 13)),
    }))
  );
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');

  const filtered = useMemo(
    () => rows.filter((u) => (!role || u.role === role) && (!q || `${u.fullName} ${u.email}`.toLowerCase().includes(q.toLowerCase()))),
    [rows, q, role]
  );

  const counts = useMemo(() => {
    const n = q.toLowerCase();
    const hit = rows.filter((u) => !n || `${u.fullName} ${u.email}`.toLowerCase().includes(n));
    return { all: hit.length, by: (r) => hit.filter((u) => u.role === r).length };
  }, [rows, q]);

  const cycleRole = (id) =>
    setRows((r) => r.map((u) => {
      if (u.id !== id) return u;
      const order = ['CUSTOMER', 'RETAILER', 'ADMIN'];
      const next = order[(order.indexOf(u.role) + 1) % order.length];
      toast.success(`${u.fullName} → ${next}`);
      return { ...u, role: next };
    }));

  return (
    <div className="space-y-5">
      <AdminPageHead title="Users" note={`${filtered.length} accounts · demo data`}>
        <ExcelExportButton
          filename="nasou-users"
          label="Export"
          headers={['Name', 'Email', 'Phone', 'Role', 'Joined']}
          rows={filtered.map((u) => [u.fullName, u.email, u.phone, u.role, u.joined])}
        />
      </AdminPageHead>

      <div className="space-y-3 rounded-[20px] border border-line bg-white/86 p-3 shadow-[0_18px_40px_rgba(37,88,73,0.08)]">
        <SearchInput placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <FilterTabs
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: '', label: 'All roles', count: counts.all },
            ...['CUSTOMER', 'RETAILER', 'ADMIN'].map((r) => ({ value: r, label: r, count: counts.by(r) })),
          ]}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((u, i) => (
            <motion.article
              key={u.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}
              className="flex flex-col rounded-[20px] border border-line bg-white p-4 shadow-[0_18px_40px_rgba(37,88,73,0.08)] transition hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-lift sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[14px] font-bold ${ROLE_AVATAR[u.role]}`}>
                  {u.fullName[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">{u.fullName}</p>
                  <p className="text-[11.5px] text-ink-35">Joined {u.joined}</p>
                </div>
                <button onClick={() => cycleRole(u.id)} title="Cycle role" aria-label={`Change role for ${u.fullName}`} className="-m-2 p-2">
                  <Badge tone={ROLE_TONE[u.role]} className="cursor-pointer">{u.role}</Badge>
                </button>
              </div>
              <dl className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[12.5px]">
                <div className="flex items-center gap-2 text-ink-70">
                  <Icon name="mail" size={13} className="shrink-0 text-ink-35" />
                  <dt className="sr-only">Email</dt>
                  <dd className="truncate">{u.email}</dd>
                </div>
                <div className="flex items-center gap-2 text-ink-70">
                  <Icon name="phone" size={13} className="shrink-0 text-ink-35" />
                  <dt className="sr-only">Phone</dt>
                  <dd className="tnum">{u.phone}</dd>
                </div>
              </dl>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-[#cad8d2] bg-[#f4f7f5] px-4 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="search" size={20} /></span>
          <p className="mt-3 text-[13px] text-ink-50">No users match.</p>
        </div>
      )}
    </div>
  );
}
