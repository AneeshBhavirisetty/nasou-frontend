/* Single frontend boundary for the Spring API. Components should not call
   fetch directly; this keeps backend errors and auth handling consistent. */

import { getToken } from './auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
// Flag to enable mock mode when backend is not available
const MOCK_MODE = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';

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

/* Mock implementations for auth endpoints */
function mockAuthEndpoint(path, options) {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      try {
        if (path === '/auth/login' && options.method === 'POST') {
          const body = JSON.parse(options.body);
          const { identifier, password } = body;

          // Mock credentials:
          // Mobile: 9876543210 / password123
          // Email: test@example.com / password123
          if ((identifier === '9876543210' || identifier === 'test@example.com') && password === 'password123') {
            const mockUser = {
              id: 'user_123',
              fullName: 'Test User',
              role: 'CUSTOMER'
            };

            const mockSession = {
              accessToken: 'mock-jwt-token-' + Date.now(),
              userId: mockUser.id,
              fullName: mockUser.fullName,
              role: mockUser.role
            };

            resolve(mockSession);
          } else {
            reject(new Error('Invalid credentials. Please try again.'));
          }
        } else if (path === '/auth/register' && options.method === 'POST') {
          // Mock successful registration
          const body = JSON.parse(options.body);
          const mockUser = {
            id: 'user_' + Date.now(),
            fullName: body.fullName,
            role: 'CUSTOMER'
          };

          const mockSession = {
            accessToken: 'mock-jwt-token-' + Date.now(),
            userId: mockUser.id,
            fullName: mockUser.fullName,
            role: mockUser.role
          };

          resolve(mockSession);
        } else if (path === '/auth/otp/send' && options.method === 'POST') {
          // Mock OTP send - always success
          resolve({ message: 'OTP sent successfully' });
        } else if (path === '/auth/otp/verify' && options.method === 'POST') {
          // Mock OTP verify
          const body = JSON.parse(options.body);
          const { phone, otp } = body;

          // Accept any OTP for mock - in real app this would be validated
          if (phone && otp) {
            // Mock returning session for existing user
            const mockSession = {
              accessToken: 'mock-jwt-token-' + Date.now(),
              userId: 'user_123',
              fullName: 'Existing User',
              role: 'CUSTOMER'
            };

            // Return session data to indicate user exists
            resolve({
              accessToken: mockSession.accessToken,
              userId: mockSession.userId,
              fullName: mockSession.fullName,
              role: mockSession.role,
              isNewUser: false
            });
          } else {
            reject(new Error('Invalid OTP or phone number'));
          }
        } else if (path === '/auth/forgot-password' && options.method === 'POST') {
          // Mock forgot password
          resolve({ message: 'Password reset link sent to your email' });
        } else if (path === '/auth/reset-password' && options.method === 'POST') {
          // Mock reset password
          resolve({ message: 'Password reset successfully' });
        } else {
          reject(new Error(`Mock not implemented for ${path}`));
        }
      } catch (error) {
        reject(error);
      }
    }, 500); // Simulate 500ms network delay
  });
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
  create: (items, idempotencyKey) =>
    api('/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ items }),
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

/* ─── Retailer ─────────────────────────────────────────────── */
export const retailerApi = {
  dashboard: () => api('/retailer/dashboard'),
  products: (params = {}) => api(`/retailer/products?${new URLSearchParams(params)}`),
  createProduct: (data) => api('/retailer/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) =>
    api(`/retailer/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  orders: (params = {}) => api(`/retailer/orders?${new URLSearchParams(params)}`),
};

/* Kept for backwards compat with AdminCatalogImport that used the old shape */
export const adminCatalogApi = {
  importWorkbook: (file) => adminApi.importWorkbook(file),
  updateInventory: (sku, values) => adminApi.updateInventory(sku, values),
};
