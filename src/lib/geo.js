/* ============================================================================
 * geo.js — "Locate me" and PIN-code lookup for addresses (customer review 5,
 * item 3).
 *
 * locate()      browser geolocation → reverse geocode with OpenStreetMap
 *               Nominatim (free, no key; light use only — swap for Google /
 *               MapmyIndia via the API in production).
 * lookupPin()   India Post PIN directory → city (district) and state.
 * Both fail soft: the form stays editable and says what went wrong.
 * ==========================================================================*/

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);

function position() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This browser cannot share your location.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (e) => reject(new Error(e.code === 1 ? 'Location permission was declined — type the address instead.' : 'Could not find your location. Try again outdoors or type it in.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

/* → { line1, landmark, city, state, pin, lat, lng } */
export async function locate() {
  const c = await position();
  const lat = Number(c.latitude.toFixed(6));
  const lng = Number(c.longitude.toFixed(6));
  try {
    const res = await withTimeout(
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en-IN' } }),
      9000,
      'Address lookup timed out.'
    );
    const j = await res.json();
    const a = j.address || {};
    const line1 = [a.house_number, a.building, a.road, a.neighbourhood || a.residential, a.suburb].filter(Boolean).join(', ');
    return {
      line1: line1 || (j.display_name || '').split(',').slice(0, 3).join(',').trim(),
      landmark: a.amenity || a.shop || '',
      city: a.city || a.town || a.village || a.county || a.state_district || '',
      state: a.state || '',
      pin: (a.postcode || '').replace(/\D/g, '').slice(0, 6),
      lat,
      lng,
    };
  } catch {
    return { lat, lng, line1: '', city: '', state: '', pin: '', partial: true };
  }
}

/* → { city, state, areas[] } or null */
export async function lookupPin(pin) {
  if (!/^\d{6}$/.test(pin)) return null;
  try {
    const res = await withTimeout(fetch(`https://api.postalpincode.in/pincode/${pin}`), 7000, 'timeout');
    const [j] = await res.json();
    if (j?.Status !== 'Success' || !j.PostOffice?.length) return null;
    const po = j.PostOffice;
    return { city: po[0].District, state: po[0].State, areas: [...new Set(po.map((p) => p.Name))].slice(0, 8) };
  } catch {
    return null;
  }
}

/* The address book lives on the profile. Older profiles kept one address in
   address / city / pin — fold that in as the default entry. */
export function addressBook(profile = {}) {
  if (Array.isArray(profile.addresses)) return profile.addresses;
  if (profile.address) {
    return [{ id: 'legacy', label: 'Home', name: profile.fullName || '', phone: profile.phone || '', line1: profile.address, landmark: '', city: profile.city || '', state: profile.state || 'Telangana', pin: profile.pin || '', isDefault: true }];
  }
  return [];
}
export const formatAddress = (a) => [a.line1, a.landmark, `${a.city}${a.state ? `, ${a.state}` : ''} ${a.pin}`].filter(Boolean).join(', ');
