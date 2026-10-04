/* Single frontend boundary for the Spring API. Components should not call
   fetch directly; this keeps backend errors and auth handling consistent. */

import { getToken } from './auth';
import { createAccount, DEMO_2FA_CODE, findAccount, getAccount, passwordMatches, updateAccount } from '../store/accounts';
import { getRetailer } from '../store/retailers';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
// Flag to enable mock mode when backend is not available
const MOCK_MODE = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';
/* true while the app runs on the built-in demo backend (no VITE_API_BASE_URL) */
export const IS_MOCK = MOCK_MODE;

export async function api(path, options = {}) {
  // Mock auth endpoints for development/testing
  if (MOCK_MODE && path.startsWith('/auth/')) {
    return mockAuthEndpoint(path, options);
  }

  const token = getToken();
  const headers = {
    Accept: 'application/json',
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Unable to reach the server. Check your connection.');
  }

  if (response.status === 401) {
    /* Broadcast so AuthContext can clear the session and show the dialog */
    window.dispatchEvent(new Event('auth:expired'));
    throw new Error('Your session has expired. Please log in again.');
  }

  if (response.status === 403) {
    throw new Error('You do not have permission to perform this action.');
  }

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message ?? 'We could not complete that request.');
  }

  return body;
}

/* ── Mock auth ──────────────────────────────────────────────────────────────
 * Runs only in demo mode (no backend). Accounts live in store/accounts.js;
 * every seeded account uses the password `nivora123` (the old `nasou123`
 * still works). Nasou Hive team accounts need a second factor after the
 * password — the demo code is 123456. See DEMO_ACCOUNTS for the list.
 * ────────────────────────────────────────────────────────────────────────── */

/* Shown on the sign-in page in demo mode, grouped by portal. */
export const DEMO_ACCOUNTS = [
  { group: 'Super Admin (Nasou Hive team)', email: 'owner@nivora.test', label: 'Owner · IAM admin' },
  { group: 'Super Admin (Nasou Hive team)', email: 'ops@nivora.test', label: 'Operations' },
  { group: 'Super Admin (Nasou Hive team)', email: 'support@nivora.test', label: 'Support' },
  { group: 'Super Admin (Nasou Hive team)', email: 'finance@nivora.test', label: 'Finance' },
  { group: 'Super Admin (Nasou Hive team)', email: 'management@nivora.test', label: 'Management' },
  { group: 'Retailers', email: 'retailer@nivora.test', label: 'Sri Sai Pipes · owner' },
  { group: 'Retailers', email: 'staff@nivora.test', label: 'Sri Sai Pipes · fulfilment staff' },
  { group: 'Retailers', email: 'retailer2@nivora.test', label: 'Deccan Hardware · owner' },
  { group: 'Retailers', email: 'pending@nivora.test', label: 'Balaji Electricals · awaiting approval' },
  { group: 'Retailers', email: 'retailer5@nivora.test', label: 'Coastal Paints · corrections asked' },
  { group: 'Customers', email: 'customer@nivora.test', label: 'Aarav Reddy · customer' },
];

/* An unsigned but structurally-valid JWT so parseJwt / isTokenExpired work and
   the session survives a page refresh in mock mode. */
function b64url(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function mockJwt(claims) {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ ...claims, iat: now, exp: now + 60 * 60 * 24 * 7 })}.mock`;
}
export function sessionFor(a, extra = {}) {
  const claims = { sub: a.id, role: a.role, fullName: a.fullName, teamRole: a.teamRole, retailerId: a.retailerId, staffRole: a.staffRole };
  return {
    accessToken: mockJwt(claims),
    userId: a.id,
    fullName: a.fullName,
    role: a.role,
    teamRole: a.teamRole || null,
    retailerId: a.retailerId || null,
    staffRole: a.staffRole || null,
    email: a.email,
    phone: a.phone,
    ...extra,
  };
}

const challenges = new Map();
const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

/* account → error message if it may not sign in, else null */
function loginBlock(a) {
  if (a.status === 'blocked') return 'This account is blocked. Contact Nivora support to restore it.';
  if (a.status === 'suspended') return 'This team account is suspended. Ask the Owner to re-activate it.';
  if (a.role === 'RETAILER') {
    const r = getRetailer(a.retailerId);
    if (!r || r.status === 'deleted') return 'This store has been closed.';
    if (r.status === 'deactivated') return 'This store is deactivated, so sign-in is disabled. Contact Nivora to restore it.';
  }
  return null;
}

/* finish a successful first factor: team accounts get a 2FA challenge */
function afterPassword(a) {
  const block = loginBlock(a);
  if (block) throw new Error(block);
  if (a.role === 'ADMIN') {
    const challengeId = `ch_${Math.random().toString(36).slice(2)}`;
    challenges.set(challengeId, { accountId: a.id, at: Date.now(), tries: 0 });
    return { twoFactorRequired: true, challengeId, maskedPhone: `+91 ••••• ••${String(a.phone).slice(-3)}` };
  }
  const reactivated = a.status === 'deactivated';
  updateAccount(a.id, { lastLoginAt: Date.now(), ...(reactivated ? { status: 'active', deactivatedAt: null } : {}) }, 'Signed in');
  return sessionFor(a, reactivated ? { reactivated: true } : {});
}

async function mockAuthEndpoint(path, options) {
  await delay();
  const body = options.body ? JSON.parse(options.body) : {};
  if (path === '/auth/login') {
    const a = findAccount(body.identifier);
    if (!a || !(await passwordMatches(a, body.password))) throw new Error('That email / mobile and password do not match.');
    return afterPassword(a);
  }
  if (path === '/auth/2fa/verify') {
    const ch = challenges.get(body.challengeId);
    if (!ch || Date.now() - ch.at > 5 * 60000) throw new Error('This sign-in expired. Start again.');
    ch.tries += 1;
    if (ch.tries > 5) { challenges.delete(body.challengeId); throw new Error('Too many wrong codes. Start again.'); }
    if (String(body.code) !== DEMO_2FA_CODE) throw new Error('That code is not right.');
    challenges.delete(body.challengeId);
    const a = getAccount(ch.accountId);
    updateAccount(a.id, { lastLoginAt: Date.now() }, 'Signed in');
    return sessionFor(a, { twoFactor: true });
  }
  if (path === '/auth/register') {
    const a = await createAccount({ fullName: body.fullName || 'New Customer', email: body.email || '', phone: body.phone, role: 'CUSTOMER' }, { password: body.password });
    return sessionFor(a);
  }
  if (path === '/auth/otp/send') return { message: 'OTP sent successfully' };
  if (path === '/auth/otp/verify') {
    if (!body.phone || !body.otp) throw new Error('Invalid OTP or phone number');
    const a = findAccount(String(body.phone).replace(/\D/g, '').slice(-10));
    if (!a) return { isNewUser: true };
    if (a.role === 'ADMIN') throw new Error('Team accounts sign in with password and a two-factor code.');
    return { ...afterPassword(a), isNewUser: false };
  }
  if (path === '/auth/forgot-password') return { message: 'Password reset link sent to your email' };
  if (path === '/auth/reset-password') return { message: 'Password reset successfully' };
  if (path === '/auth/logout' || path === '/auth/logout-all') return null;
  throw new Error(`Mock not implemented for ${path}`);
}

/* ─── Catalog ──────────────────────────────────────────────── */
export const catalogApi = {
  list: (params = {}) => api(`/products?${new URLSearchParams(params)}`),
  bySlug: (slug) => api(`/products/${slug}`),
  byId: (id) => api(`/products/${id}`),
};

/* ─── Categories ───────────────────────────────────────────── */
export const categoriesApi = {
  list: () => api('/categories'),
};

/* ─── Auth ─────────────────────────────────────────────────── */
export const authApi = {
  login: (identifier, password) =>
    api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  register: (payload) =>
    api('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  sendOtp: (phone) =>
    api('/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone, otp) =>
    api('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
  verify2fa: (challengeId, code) =>
    api('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ challengeId, code }) }),
  forgotPassword: (identifier) =>
    api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) }),
  resetPassword: (token, password) =>
    api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};

/* ─── User / Profile ───────────────────────────────────────── */
export const profileApi = {
  me: () => api('/users/me'),
  update: (data) => api('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (currentPassword, newPassword) =>
    api('/users/me/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  addresses: () => api('/users/me/addresses'),
  addAddress: (data) => api('/users/me/addresses', { method: 'POST', body: JSON.stringify(data) }),
  updateAddress: (id, data) =>
    api(`/users/me/addresses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAddress: (id) => api(`/users/me/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id) =>
    api(`/users/me/addresses/${id}/default`, { method: 'PATCH' }),
};

/* ─── Wishlist ─────────────────────────────────────────────── */
export const wishlistApi = {
  get: () => api('/users/me/wishlist'),
  add: (productId) => api('/users/me/wishlist', { method: 'POST', body: JSON.stringify({ productId }) }),
  remove: (productId) => api(`/users/me/wishlist/${productId}`, { method: 'DELETE' }),
};

/* ─── Orders ───────────────────────────────────────────────── */
export const ordersApi = {
  list: (params = {}) => api(`/orders?${new URLSearchParams(params)}`),
  get: (id) => api(`/orders/${id}`),
};

/* ─── Checkout ─────────────────────────────────────────────── */
export const checkoutApi = {
  /* nasou-api POST /checkout — prices, coupon and stock are re-checked and
     stock is decremented server-side in the same transaction.
     body: { items: [{ sku, qty }], coupon, delivery, payment, address } */
  create: (body, idempotencyKey) =>
    api('/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    }),
  verifyPayment: (orderId, payload) =>
    api(`/payments/orders/${orderId}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

/* ─── Admin ────────────────────────────────────────────────── */
export const adminApi = {
  /* Dashboard */
  dashboard: () => api('/admin/dashboard'),

  /* Users */
  users: (params = {}) => api(`/admin/users?${new URLSearchParams(params)}`),
  updateUser: (id, data) => api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  /* Products */
  products: (params = {}) => api(`/admin/products?${new URLSearchParams(params)}`),
  createProduct: (data) => api('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => api(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => api(`/admin/products/${id}`, { method: 'DELETE' }),
  updateInventory: (sku, values) =>
    api(`/admin/catalog/products/${encodeURIComponent(sku)}/inventory`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    }),

  /* Catalog import */
  importWorkbook: (file) => {
    const data = new FormData();
    data.append('file', file);
    return api('/admin/catalog/import', { method: 'POST', body: data });
  },

  /* Orders */
  orders: (params = {}) => api(`/admin/orders?${new URLSearchParams(params)}`),
  updateOrderStatus: (id, status) =>
    api(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  /* Categories */
  categories: () => api('/admin/categories'),
  createCategory: (data) => api('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) =>
    api(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => api(`/admin/categories/${id}`, { method: 'DELETE' }),

  /* Coupons */
  coupons: () => api('/admin/coupons'),
  createCoupon: (data) => api('/admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
  deleteCoupon: (id) => api(`/admin/coupons/${id}`, { method: 'DELETE' }),
};


/* Kept for backwards compat with AdminCatalogImport that used the old shape */
export const adminCatalogApi = {
  importWorkbook: (file) => adminApi.importWorkbook(file),
  updateInventory: (sku, values) => adminApi.updateInventory(sku, values),
};
