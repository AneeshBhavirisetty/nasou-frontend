/* One box for "mobile number or email" (sign in with a code, forgot password).
   contactOf turns what was typed into the API's shape — { email } or { phone } —
   or null when it is neither. */

export const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? '').trim());

export function contactOf(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return null;
  if (v.includes('@')) return looksLikeEmail(v) ? { email: v.toLowerCase() } : null;
  const d = v.replace(/\D/g, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? { phone: ten } : null;
}

/* "+91 98765 43210" or the email — for "Enter the code sent to …". */
export function describeContact(c) {
  if (!c) return '';
  return c.email || `+91 ${c.phone.slice(0, 5)} ${c.phone.slice(5)}`;
}
