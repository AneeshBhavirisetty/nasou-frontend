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
import { act } from '../../lib/act';

/* Commission (requirement 10): Nivorva's cut of each sub-order — the platform
   default and each retailer's own rate. Retailers pay commission only; there
   are no subscription plans (plan fees are off, decisions.subscriptionBilling). */

export default function AdminCommission() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useIam();
  const canEdit = can('commission', 'edit');
  const settings = useSettings();
  const retailers = useRetailers();
  const [rate, setRate] = useState(String(settings.commission.default));

  const live = retailers.filter((r) => r.status !== 'deleted' && r.status !== 'rejected');

  return (
    <div className="space-y-5">
      <AdminPageHead title="Commission" note="Nivorva’s cut of each sub-order. Set a retailer’s own rate from their page." />
      {!canEdit && <ViewOnlyBanner what="commission" />}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Panel title="Platform default" note="Applies to any retailer without their own rate.">
          <div className="flex items-end gap-2">
            <label className="flex-1"><span className={LABEL_CLS}>Commission (%)</span><input disabled={!canEdit} value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} className={SELECT_CLS} /></label>
            {canEdit && <Button onClick={() => { const n = Math.max(0, Math.min(50, Number(rate) || 0)); act(toast, () => saveSetting('commission', { default: n }, `Default commission ${settings.commission.default}% → ${n}%`), 'Default commission saved'); }} icon="check">Save</Button>}
          </div>
          <div className="mt-5 rounded-[16px] bg-[#f6f3ed] p-4 text-[12.5px] text-ink-70">
            <p className="font-bold text-forest">Example — ₹10,000 cart at 10%</p>
            <p className="mt-1">Retailer A ₹6,000 → ₹5,400 to them, ₹600 to Nivorva.<br />Retailer B ₹4,000 → ₹3,600 to them, ₹400 to Nivorva.</p>
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
          ]}
          searchText={(r) => r.name}
          searchPlaceholder="Search retailer"
          onRowClick={(r) => navigate(`/admin/retailers/${r.id}`)}
          exportName="commission"
          pageSize={10}
        />
      </div>
    </div>
  );
}
