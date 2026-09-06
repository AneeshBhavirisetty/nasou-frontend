import { Outlet, Navigate, useLocation } from 'react-router-dom';

export default function AuthLayout() {
  const { pathname } = useLocation();
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/forgot-email'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  if (!isAuthRoute) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="flex min-h-screen flex-col">
      {/* No Header, no Footer */}
      <Outlet />
    </div>
  );
}
