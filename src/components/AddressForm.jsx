import { useState } from 'react';
import Icon from './Icon';
import { Field } from './ui';
import { OUTSIDE_AREA, SERVICE_AREA, inServiceArea, inTirupati, locate, lookupPin } from '../lib/geo';
import { cx } from '../lib/format';

/* One address, with "Use my current location" and PIN-code autofill.
   Controlled: value + onChange(next). Used by checkout and My profile.
   Tirupati only: city and state are fixed; the PIN must be a Tirupati one. */

const LABELS = ['Home', 'Work', 'Site', 'Other'];

export const blankAddress = { label: 'Home', name: '', phone: '', line1: '', landmark: '', city: SERVICE_AREA.city, state: SERVICE_AREA.state, pin: '', lat: null, lng: null };

export function addressProblem(a) {
  if (!a.name?.trim()) return 'Enter the name for delivery.';
  if (!/^\d{10}$/.test(a.phone || '')) return 'Enter a 10-digit mobile number.';
  if ((a.line1 || '').trim().length < 6) return 'Enter the flat / building and street.';
  if (!/^\d{6}$/.test(a.pin || '')) return 'Enter a 6-digit PIN code.';
  if (!inServiceArea(a.pin)) return OUTSIDE_AREA;
  return '';
}

export default function AddressForm({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [areas, setAreas] = useState([]);
  const update = (next) => onChange(inTirupati(next));
  const set = (k, v) => update({ ...value, [k]: v });

  const useLocation = async () => {
    setBusy(true);
    setNote('');
    try {
      const got = await locate();
      const outside = got.pin && !inServiceArea(got.pin);
      const keep = Object.fromEntries(Object.entries(got).filter(([k, v]) => v !== '' && v != null && k !== 'city' && k !== 'state' && !(k === 'pin' && outside)));
      update({ ...value, ...keep });
      setNote(outside ? 'You seem to be outside Tirupati — we deliver only in Tirupati, so enter the delivery address there.'
        : got.partial ? 'Pinned your location — we could not read the street, so please type it in.' : 'Filled from your location — check the flat or building number.');
    } catch (x) {
      setNote(x.message);
    } finally {
      setBusy(false);
    }
  };

  const onPin = async (pin) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    update({ ...value, pin: clean });
    setAreas([]);
    if (inServiceArea(clean)) {
      const hit = await lookupPin(clean);
      if (hit) setAreas(hit.areas);
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
          <span className="block text-[12px] text-ink-50">Fills the street and PIN — you add the flat number.</span>
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
        <Field label="Flat, building, street" className="sm:col-span-2" value={value.line1} onChange={(e) => set('line1', e.target.value)} autoComplete="street-address" placeholder="e.g. Flat 402, Lake View Residency, Balaji Colony" />
        <Field label="Landmark / area (optional)" value={value.landmark} onChange={(e) => set('landmark', e.target.value)} list="pin-areas" placeholder="e.g. Near Leela Mahal circle" />
        <datalist id="pin-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
        <Field label="PIN code" inputMode="numeric" value={value.pin} onChange={(e) => onPin(e.target.value)} autoComplete="postal-code" placeholder="Tirupati PIN, e.g. 517501" error={value.pin?.length === 6 && !inServiceArea(value.pin) ? OUTSIDE_AREA : undefined} />
        <Field label="City" value={SERVICE_AREA.city} disabled hint="We deliver only in Tirupati" />
        <Field label="State" value={SERVICE_AREA.state} disabled />
      </div>
    </div>
  );
}
