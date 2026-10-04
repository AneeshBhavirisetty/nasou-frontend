import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/admin/DataTable';
import { AdminPageHead, Panel, StatusPill, ViewOnlyBanner, SELECT_CLS, LABEL_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { useRetailers } from '../../store/retailers';
import { saveSetting, useSettings } from '../../store/settings';
import { categoryName } from '../../data/catalog';
import { money, cx } from '../../lib/format';

/* Commission settings (requirement 10), subscriptions (18) and the finance
   decisions left open in section 5 of the requirements. */

function Choice({ label, value, onChange, options, disabled, note }) {
  return (
    <div>
      <span className={LABEL_CLS}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button key={v} type="button" disabled={disabled} onClick={() => onChange(v)} className={cx('rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition disabled:cursor-not-allowed', value === v ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-70 hover:border-forest/40')}>{l}</button>
        ))}
      </div>
      {note && <p className="mt-1.5 text-[11.5px] text-ink-50">{note}</p>}
    </div>
  );
}

const nextRenewal = () => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };

export default function AdminCommission() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useIam();
  const canEdit = can('commission', 'edit');
  const settings = useSettings();
  const retailers = useRetailers();
  const [rate, setRate] = useState(String(settings.commission.default));
  const [plans, setPlans] = useState(settings.plans);
  const [dec, setDec] = useState(settings.decisions);

  const live = retailers.filter((r) => r.status !== 'deleted' && r.status !== 'rejected');
  const mrr = live.filter((r) => r.status === 'approved').reduce((s, r) => s + (settings.plans.find((p) => p.id === r.plan)?.monthly || 0), 0);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Commission & plans" note="Nivora’s cut of each sub-order, subscription plans, and how money moves." />
      {!canEdit && <ViewOnlyBanner what="commission and plans" />}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Panel title="Platform default" note="Applies to any retailer without their own rate.">
          <div className="flex items-end gap-2">
            <label className="flex-1"><span className={LABEL_CLS}>Commission (%)</span><input disabled={!canEdit} value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} className={SELECT_CLS} /></label>
            {canEdit && <Button onClick={() => { const n = Math.max(0, Math.min(50, Number(rate) || 0)); saveSetting('commission', { default: n }, `Default commission ${settings.commission.default}% → ${n}%`); toast.success('Default commission saved'); }} icon="check">Save</Button>}
          </div>
          <div className="mt-5 rounded-[16px] bg-[#f6f3ed] p-4 text-[12.5px] text-ink-70">
            <p className="font-bold text-forest">Example from the brief — ₹10,000 cart at 10%</p>
            <p className="mt-1">Retailer A ₹6,000 → ₹5,400 to them, ₹600 to Nivora.<br />Retailer B ₹4,000 → ₹3,600 to them, ₹400 to Nivora.</p>
          </div>
        </Panel>

        <DataTable
          id="commission"
          rows={live}
          columns={[
            { key: 'name', label: 'Retailer', always: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
            { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
            { key: 'rate', label: 'Rate', align: 'right', value: (r) => r.commission?.rate ?? settings.commission.default, render: (r) => (r.commission?.rate != null ? `${r.commission.rate}%` : <span className="text-ink-50">{settings.commission.default}% (default)</span>) },
            { key: 'over', label: 'Category rates', sortable: false, value: (r) => Object.entries(r.commission?.byCategory || {}).map(([c, v]) => `${categoryName(c)} ${v}%`).join('; '), render: (r) => Object.entries(r.commission?.byCategory || {}).map(([c, v]) => <span key={c} className="mr-1 inline-block rounded-full bg-sunk px-2 py-0.5 text-[11.5px] font-bold text-forest">{categoryName(c)} {v}%</span>) },
            { key: 'plan', label: 'Plan', value: (r) => settings.plans.find((p) => p.id === r.plan)?.name },
          ]}
          searchText={(r) => r.name}
          searchPlaceholder="Search retailer"
          onRowClick={(r) => navigate(`/admin/retailers/${r.id}`)}
          exportName="commission"
          pageSize={10}
        />
      </div>

      <Panel title="Subscription plans" note={`Monthly recurring revenue from active retailers: ${money(mrr)}. Assign a plan from the retailer’s page.`}
        action={canEdit && <Button size="sm" icon="check" onClick={() => { saveSetting('plans', plans.map((p) => ({ ...p, monthly: Math.max(0, Number(p.monthly) || 0) })), 'Updated subscription plans'); toast.success('Plans saved'); }}>Save plans</Button>}>
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((p, i) => (
            <div key={p.id} className="rounded-[18px] border border-line bg-[#fbfaf7] p-4">
              <input disabled={!canEdit} value={p.name} onChange={(e) => setPlans((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="w-full bg-transparent text-[16px] font-bold text-forest outline-none" aria-label="Plan name" />
              <label className="mt-2 flex items-center gap-1 text-[13px] text-ink-50">₹<input disabled={!canEdit} value={p.monthly} onChange={(e) => setPlans((l) => l.map((x, j) => (j === i ? { ...x, monthly: e.target.value.replace(/\D/g, '') } : x)))} className="tnum w-20 rounded-md border border-line bg-white px-2 py-1 text-[15px] font-bold text-ink" aria-label="Monthly fee" /> / month</label>
              <textarea disabled={!canEdit} value={p.perks} onChange={(e) => setPlans((l) => l.map((x, j) => (j === i ? { ...x, perks: e.target.value } : x)))} className="mt-2 h-16 w-full resize-none rounded-md border border-line bg-white p-2 text-[12.5px] text-ink-70" aria-label="Perks" />
              <p className="mt-2 text-[12px] font-bold text-ink-50">{live.filter((r) => r.plan === p.id).length} retailers</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-line-soft text-[13px]">
          {live.filter((r) => r.status === 'approved').map((r) => {
            const p = settings.plans.find((x) => x.id === r.plan);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-semibold text-ink">{r.name}</span>
                <span className="text-ink-50">{p?.name} · {p?.monthly ? `${money(p.monthly)} · renews ${nextRenewal()} · ${dec.subscriptionBilling === 'deduct' ? 'deducted from payout' : 'invoiced separately'}` : 'free'}</span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Money rules" note="The open decisions from the requirements, set to the recommended defaults. Change them here — no code needed."
        action={canEdit && <Button size="sm" icon="check" onClick={() => { saveSetting('decisions', { ...dec, refundApprovalAbove: Math.max(0, Number(dec.refundApprovalAbove) || 0) }, 'Updated money rules'); toast.success('Rules saved'); }}>Save rules</Button>}>
        <div className="grid gap-5 md:grid-cols-2">
          <Choice label="Settlement cycle" value={dec.settlementCycle} disabled={!canEdit} onChange={(v) => setDec((d) => ({ ...d, settlementCycle: v }))} options={[['weekly', 'Weekly'], ['fortnightly', 'Fortnightly']]} note="Payout screens group by week today; fortnightly is recorded for the API." />
          <Choice label="Release held money" value={dec.releaseOn} disabled={!canEdit} onChange={(v) => setDec((d) => ({ ...d, releaseOn: v }))} options={[['delivery', 'On delivery'], ['cycle', 'On settlement']]} note="When a retailer’s Razorpay transfer is released from hold." />
          <Choice label="Subscription fees" value={dec.subscriptionBilling} disabled={!canEdit} onChange={(v) => setDec((d) => ({ ...d, subscriptionBilling: v }))} options={[['deduct', 'Deduct from payouts'], ['separate', 'Bill separately']]} />
          <Choice label="Deleting a retailer" value={dec.retailerDelete} disabled={!canEdit} onChange={(v) => setDec((d) => ({ ...d, retailerDelete: v }))} options={[['soft', 'Soft delete (recommended)'], ['hard', 'Permanent']]} note="Soft delete keeps old orders and payouts linked." />
          <label>
            <span className={LABEL_CLS}>Refunds Finance must approve</span>
            <div className="flex items-center gap-2 text-[13px] text-ink-70">Above ₹<input disabled={!canEdit} value={dec.refundApprovalAbove} onChange={(e) => setDec((d) => ({ ...d, refundApprovalAbove: e.target.value.replace(/\D/g, '') }))} className={cx(SELECT_CLS, '!w-28')} /></div>
            <p className="mt-1.5 text-[11.5px] text-ink-50">0 = every refund needs approval.</p>
          </label>
        </div>
      </Panel>
    </div>
  );
}
