import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import ExcelExportButton from '../../components/ExcelExportButton';
import { Badge, Button, Field } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { deliveryBy } from '../../lib/format';

const ROLE_TONE = { ADMIN: 'dark', RETAILER: 'slate', CUSTOMER: 'neutral' };
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-serif text-[clamp(1.5rem,4vw,2rem)]">Users</h1>
          <p className="text-[13px] text-ink-50">{filtered.length} accounts · demo data</p>
        </div>
        <ExcelExportButton
          filename="nasou-users"
          label="Export"
          headers={['Name', 'Email', 'Phone', 'Role', 'Joined']}
          rows={filtered.map((u) => [u.fullName, u.email, u.phone, u.role, u.joined])}
        />
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-line bg-white p-3">
        <div className="min-w-[200px] flex-1"><Field placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-[13px] font-semibold outline-none">
          <option value="">All roles</option>
          <option>CUSTOMER</option><option>RETAILER</option><option>ADMIN</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        {filtered.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-0"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-600">
              {u.fullName[0]}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold">{u.fullName}</p>
              <p className="truncate text-[11.5px] text-ink-50">{u.email} · {u.phone}</p>
            </div>
            <span className="ml-auto text-[11.5px] text-ink-35">Joined {u.joined}</span>
            <button onClick={() => cycleRole(u.id)} title="Cycle role">
              <Badge tone={ROLE_TONE[u.role]} className="cursor-pointer">{u.role}</Badge>
            </button>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-ink-50">No users match.</p>}
      </div>
    </div>
  );
}
