import { useState } from 'react';
import Icon from './Icon';
import { Field } from './ui';
import { INDIAN_STATES, locate, lookupPin } from '../lib/geo';
import { cx } from '../lib/format';

/* One address, with "Use my current location" and PIN-code autofill.
   Controlled: value + onChange(next). Used by checkout and My profile. */

const LABELS = ['Home', 'Work', 'Site', 'Other'];
const SELECT = 'h-12 w-full rounded-md border border-line bg-white/80 px-4 text-[14px] text-ink outline-none transition focus:border-forest focus:shadow-[0_0_0_2px_rgba(31,92,74,0.18)]';

export const blankAddress = { label: 'Home', name: '', phone: '', line1: '', landmark: '', city: '', state: 'Telangana', pin: '', lat: null, lng: null };

export function addressProblem(a) {
  if (!a.name?.trim()) return 'Enter the name for delivery.';
  if (!/^\d{10}$/.test(a.phone || '')) return 'Enter a 10-digit mobile number.';
  if ((a.line1 || '').trim().length < 6) return 'Enter the flat / building and street.';
  if (!a.city?.trim()) return 'Enter the city.';
  if (!a.state) return 'Choose the state.';
  if (!/^\d{6}$/.test(a.pin || '')) return 'Enter a 6-digit PIN code.';
  return '';
}

export default function AddressForm({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [areas, setAreas] = useState([]);
  const set = (k, v) => onChange({ ...value, [k]: v });

  const useLocation = async () => {
    setBusy(true);
    setNote('');
    try {
      const got = await locate();
      onChange({ ...value, ...Object.fromEntries(Object.entries(got).filter(([, v]) => v !== '' && v != null)) });
      setNote(got.partial ? 'Pinned your location — we could not read the street, so please type it in.' : 'Filled from your location — check the flat or building number.');
    } catch (x) {
      setNote(x.message);
    } finally {
      setBusy(false);
    }
  };

  const onPin = async (pin) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    onChange({ ...value, pin: clean });
    if (clean.length === 6) {
      const hit = await lookupPin(clean);
      if (hit) {
        onChange({ ...value, pin: clean, city: value.city || hit.city, state: hit.state });
        setAreas(hit.areas);
      }
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={useLocation}
        disabled={busy}
        className="group flex w-full items-center gap-3 rounded-[18px] border border-dashed border-forest/30 bg-emerald-50/50 px-4 py-3.5 text-left transition hover:border-forest hover:bg-emerald-50 disabled:opacity-60"
      >
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-white shadow-btn', busy && 'animate-pulse')}><Icon name={busy ? 'spinner' : 'pin'} size={18} className={busy ? 'animate-spin' : ''} /></span>
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-forest">{busy ? 'Finding you…' : 'Use my current location'}</span>
          <span className="block text-[12px] text-ink-50">Fills the street, city, state and PIN — you add the flat number.</span>
        </span>
        <Icon name="arrowRight" size={16} className="ml-auto text-forest transition group-hover:translate-x-0.5" />
      </button>
      {note && <p className="text-[12.5px] font-semibold text-forest-800">{note}</p>}
      {value.lat && <p className="flex items-center gap-1.5 text-[11.5px] text-ink-50"><Icon name="pin" size={12} /> Pinned at {value.lat}, {value.lng} — the delivery partner gets this location too.</p>}

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Address type">
        {LABELS.map((l) => (
          <button key={l} type="button" role="radio" aria-checked={value.label === l} onClick={() => set('label', l)} className={cx('rounded-full border px-4 py-1.5 text-[12.5px] font-bold transition', value.label === l ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-70 hover:border-forest/40')}>{l}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" value={value.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
        <Field label="Mobile" type="tel" inputMode="numeric" value={value.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} autoComplete="tel-national" placeholder="10-digit mobile" />
        <Field label="Flat, building, street" className="sm:col-span-2" value={value.line1} onChange={(e) => set('line1', e.target.value)} autoComplete="street-address" placeholder="e.g. Flat 402, Lake View Residency, Road 3" />
        <Field label="Landmark / area (optional)" value={value.landmark} onChange={(e) => set('landmark', e.target.value)} list="pin-areas" placeholder="e.g. Near Kondapur bus stop" />
        <datalist id="pin-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
        <Field label="PIN code" inputMode="numeric" value={value.pin} onChange={(e) => onPin(e.target.value)} autoComplete="postal-code" placeholder="6 digits — fills city & state" />
        <Field label="City" value={value.city} onChange={(e) => set('city', e.target.value)} autoComplete="address-level2" />
        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800">State</span>
          <select value={value.state} onChange={(e) => set('state', e.target.value)} className={SELECT} autoComplete="address-level1">
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
