import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import CartDrawer from './components/CartDrawer';
import DemoSwitch from './components/admin/RoleSwitch';
import ChatWidget from './components/chat/ChatWidget';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import Deals from './pages/Deals';
import Enquiry from './pages/Enquiry';
import Invoice from './pages/Invoice';
import Wishlist from './pages/Wishlist';
import Orders from './pages/Orders';
import Account from './pages/Account';
import Info from './pages/Info';
import NotFound from './pages/NotFound';
import AdminCatalogImport from './pages/AdminCatalogImport';
import Sell from './pages/Sell';
import InviteAccept from './pages/InviteAccept';
import SellerRegister from './pages/seller/Register';
import SellerLayout from './layouts/SellerLayout';
import SellerDashboard from './pages/seller/Dashboard';
import SellerOrders, { SellerOrderDetail } from './pages/seller/Orders';
import SellerProducts from './pages/seller/Products';
import SellerPayouts from './pages/seller/Payouts';
import SellerProfile from './pages/seller/Profile';
import SellerTeam from './pages/seller/Team';
import AdminRetailers from './pages/admin/Retailers';
import AdminRetailerDetail from './pages/admin/RetailerDetail';
import AdminApprovals from './pages/admin/Approvals';
import AdminCommission from './pages/admin/Commission';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminRefunds from './pages/admin/Refunds';
import AdminPayouts from './pages/admin/Payouts';
import AdminReconciliation from './pages/admin/Reconciliation';
import AdminAudit from './pages/admin/Audit';
import AdminSettings from './pages/admin/Settings';
import AdminMasterCatalog from './pages/admin/MasterCatalog';
import AdminCustomerDetail from './pages/admin/CustomerDetail';
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
import AdminDiscounts from './pages/admin/Discounts';
import AdminBilling from './pages/admin/Billing';
import AdminReports from './pages/admin/Reports';
import AuthLayout from './layouts/AuthLayout';
import PublicLayout from './layouts/PublicLayout';
import ProtectedLayout from './layouts/ProtectedLayout';
import AdminLayout from './layouts/AdminLayout';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmed" element={<OrderConfirmed />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/about" element={<Info slug="about" />} />
          <Route path="/contact" element={<Info slug="contact" />} />
          <Route path="/enquiry" element={<Enquiry />} />
          <Route path="/invoice/:id" element={<Invoice />} />
          <Route path="/returns" element={<Info slug="returns" />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/sell/register" element={<SellerRegister />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<ProtectedLayout />}>
          <Route path="/orders" element={<Orders />} />
          <Route path="/account" element={<Account />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/login/otp" element={<OtpLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/forgot-email" element={<ForgotEmail />} />
          <Route path="/invite/:token" element={<InviteAccept />} />
        </Route>

        <Route element={<SellerLayout />}>
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/seller/orders/:id" element={<SellerOrderDetail />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/payouts" element={<SellerPayouts />} />
          <Route path="/seller/profile" element={<SellerProfile />} />
          <Route path="/seller/team" element={<SellerTeam />} />
        </Route>

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/discounts" element={<AdminDiscounts />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
          <Route path="/admin/retailers" element={<AdminRetailers />} />
          <Route path="/admin/retailers/:id" element={<AdminRetailerDetail />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/commission" element={<AdminCommission />} />
          <Route path="/admin/refunds" element={<AdminRefunds />} />
          <Route path="/admin/payouts" element={<AdminPayouts />} />
          <Route path="/admin/reconciliation" element={<AdminReconciliation />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/catalog" element={<AdminMasterCatalog />} />
          <Route path="/admin/customers/:id" element={<AdminCustomerDetail />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/catalog/import" element={<AdminCatalogImport />} />
        </Route>
      </Routes>
      <CartDrawer />
      <ChatWidget />
      <DemoSwitch />
    </>
  );
}
