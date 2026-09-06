import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import AdminCatalogImport from './pages/AdminCatalogImport';
import Login from './pages/auth/Login';
import OtpLogin from './pages/auth/OtpLogin';
import ForgotPassword from './pages/auth/ForgotPassword';
import ForgotEmail from './pages/auth/ForgotEmail';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminUsers from './pages/admin/Users';
import AdminOrders from './pages/admin/Orders';
import AuthLayout from './layouts/AuthLayout';
import PublicLayout from './layouts/PublicLayout';
import ProtectedLayout from './layouts/ProtectedLayout';
import AdminLayout from './layouts/AdminLayout';

/* Route changes should land at the top â€” an ecommerce site that keeps
   your old scroll position on a new product feels broken. */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname, search]);
  return null;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <main className="flex-1">
        <Routes>
          {/* Public routes (with header/footer) */}
          <Route path="/" element={
            <PublicLayout>
              <Home />
            </PublicLayout>
          } />
          <Route path="/shop" element={
            <PublicLayout>
              <Shop />
            </PublicLayout>
          } />
          <Route path="/product/:id" element={
            <PublicLayout>
              <ProductDetail />
            </PublicLayout>
          } />
          <Route path="/cart" element={
            <PublicLayout>
              <Cart />
            </PublicLayout>
          } />
          <Route path="/checkout" element={
            <PublicLayout>
              <Checkout />
            </PublicLayout>
          } />
          <Route path="/order-confirmed" element={
            <PublicLayout>
              <OrderConfirmed />
            </PublicLayout>
          } />

          {/* Auth routes (NO header/footer) */}
          <Route element={<AuthLayout />}>
           <Route path="/login" element={<Login />} />
           <Route path="/login/otp" element={<OtpLogin />} />
           <Route path="/register" element={<Register />} />
           <Route path="/forgot-password" element={<ForgotPassword />} />
           <Route path="/reset-password/:token" element={<ResetPassword />} />
           <Route path="/forgot-email" element={<ForgotEmail />} />
         </Route>

          {/* Protected customer routes (with header/footer) */}
          <Route element={
            <ProtectedLayout>
              <Outlet />
            </ProtectedLayout>
          }>
            <Route index element={<Navigate to="/shop" replace />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmed" element={<OrderConfirmed />} />
          </Route>

          {/* Admin routes (with header/footer) */}
          <Route element={
            <AdminLayout>
              <Outlet />
            </AdminLayout>
          }>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/catalog/import" element={<AdminCatalogImport />} />
          </Route>

          {/* Unauthorized route (with header/footer) */}
          <Route path="/unauthorized" element={
            <PublicLayout>
              <Unauthorized />
            </PublicLayout>
          } />

          {/* Catch-all (with header/footer) */}
          <Route path="*" element={
            <PublicLayout>
              <Navigate to="/" replace />
            </PublicLayout>
          } />
        </Routes>
      </main>
      <CartDrawer />
    </div>
  );
}
