import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { AdminPageHead, Panel, LABEL_CLS, SELECT_CLS } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { proposeChanges, updateRetailer } from '../../store/retailers';
import { useSettings } from '../../store/settings';
import { useSeller } from '../../layouts/SellerLayout';
import { money, cx } from '../../lib/format';

/* Store profile (requirement 14). Contact details change straight away;
   legal name, business type, GSTIN, PAN and bank account go to the Nivora
   team for approval first (requirement 17). */

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function SellerProfile() {
  const toast = useToast();
  const { user } = useAuth();
  const { retailer: r, readOnly } = useSeller();
  const plans = useSettings((s) => s.plans);
  const [c, setC] = useState({ name: r.name, contact: r.contact, phone: r.phone, email: r.email, address: r.address, city: r.city, pin: r.pin });
  const [s, setS] = useState({ legalName: r.legalName, type: r.type, gstin: r.gstin, pan: r.pan, holder: r.bank?.holder || '', account: r.bank?.account || '', ifsc: r.bank?.ifsc || '' });
  const pending = r.pendingChanges?.fields;
  const lock = readOnly;

  const saveContact = (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(c.phone) || !/^\d{6}$/.test(c.pin)) return toast.error('Mobile needs 10 digits and PIN 6.');
    updateRetailer(r.id, c, `Store details edited by ${user.fullName}`);
    toast.success('Store details saved');
  };
  const proposeSensitive = (e) => {
    e.preventDefault();
    if (!GSTIN.test(s.gstin)) return toast.error('That GSTIN does not look right (15 characters).');
    if (!PAN.test(s.pan)) return toast.error('That PAN does not look right (e.g. ABCDE1234F).');
    if (!IFSC.test(s.ifsc)) return toast.error('That IFSC does not look right (e.g. HDFC0001234).');
    if (!/^\d{9,18}$/.test(s.account)) return toast.error('Account number should be 9–18 digits.');
    const fields = {};
    if (s.legalName !== r.legalName) fields.legalName = s.legalName;
    if (s.type !== r.type) fields.type = s.type;
    if (s.gstin !== r.gstin) fields.gstin = s.gstin;
    if (s.pan !== r.pan) fields.pan = s.pan;
    if (s.holder !== r.bank?.holder || s.account !== r.bank?.account || s.ifsc !== r.bank?.ifsc) fields.bank = { holder: s.holder, account: s.account, ifsc: s.ifsc };
    if (!Object.keys(fields).length) return toast.info('Nothing changed.');
    proposeChanges(r.id, fields, user.fullName);
    toast.success('Sent to Nivora for approval — the current details stay in use until then');
  };
  const field = (state, set, k, label, extra = {}) => (
    <label className={extra.wide ? 'sm:col-span-2' : ''}>
      <span className={LABEL_CLS}>{label}</span>
      <input disabled={lock} value={state[k]} onChange={(e) => set((x) => ({ ...x, [k]: extra.upper ? e.target.value.toUpperCase() : extra.digits ? e.target.value.replace(/\D/g, '').slice(0, extra.digits) : e.target.value }))} className={SELECT_CLS} />
    </label>
  );

  return (
    <div className="space-y-5">
      <AdminPageHead title="Store profile" note="How your store appears on Nivora, and where your money goes." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Store & contact" note="Changes apply straight away.">
          <form onSubmit={saveContact} className="grid gap-3 sm:grid-cols-2">
            {field(c, setC, 'name', 'Store name', { wide: true })}
            {field(c, setC, 'contact', 'Contact person')}
            {field(c, setC, 'phone', 'Mobile', { digits: 10 })}
            {field(c, setC, 'email', 'Email', { wide: true })}
            {field(c, setC, 'address', 'Address', { wide: true })}
            {field(c, setC, 'city', 'City')}
            {field(c, setC, 'pin', 'PIN code', { digits: 6 })}
            {!lock && <div className="sm:col-span-2"><Button type="submit" icon="check">Save</Button></div>}
          </form>
        </Panel>
        <Panel title="Legal, tax & bank" note="These need Nivora’s approval before they take effect.">
          {pending && (
            <p className="mb-4 flex items-start gap-2 rounded-[12px] bg-amber-50 px-3 py-2.5 text-[12.5px] font-semibold text-amber"><Icon name="clock" size={14} className="mt-0.5 shrink-0" /> Waiting for approval: {Object.keys(pending).join(', ')}. You will get a notification when it is decided.</p>
          )}
          <form onSubmit={proposeSensitive} className="grid gap-3 sm:grid-cols-2">
            {field(s, setS, 'legalName', 'Legal name', { wide: true })}
            <label><span className={LABEL_CLS}>Business type</span><select disabled={lock} value={s.type} onChange={(e) => setS((x) => ({ ...x, type: e.target.value }))} className={SELECT_CLS}>{['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited'].map((t) => <option key={t}>{t}</option>)}</select></label>
            {field(s, setS, 'gstin', 'GSTIN', { upper: true })}
            {field(s, setS, 'pan', 'PAN', { upper: true })}
            {field(s, setS, 'holder', 'Account holder')}
            {field(s, setS, 'account', 'Account number', { digits: 18 })}
            {field(s, setS, 'ifsc', 'IFSC', { upper: true })}
            {!lock && <div className="sm:col-span-2"><Button type="submit" variant="outline" icon="send">Send for approval</Button></div>}
          </form>
        </Panel>
      </div>
      <Panel title="Plan & commission">
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={cx('rounded-[16px] border p-4', p.id === r.plan ? 'border-forest bg-emerald-50/50' : 'border-line')}>
              <p className="flex justify-between text-[15px] font-bold text-ink">{p.name}{p.id === r.plan && <span className="rounded-full bg-forest px-2 py-0.5 text-[10.5px] text-white">Your plan</span>}</p>
              <p className="tnum mt-1 text-[18px] font-semibold text-forest">{p.monthly ? `${money(p.monthly)}/mo` : 'Free'}</p>
              <p className="mt-1 text-[12px] text-ink-50">{p.perks}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-ink-50">To change plan, write to sellers@nivora.in. Commission on your orders: {r.commission?.rate ?? 10}%. <Link to="/seller/team" className="font-bold text-forest">Manage your team →</Link></p>
      </Panel>
    </div>
  );
}
