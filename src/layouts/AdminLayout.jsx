import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminSidebar from '../components/admin/AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
          <AdminSidebar />
          <main className="min-w-0 flex-1">{children ?? <Outlet />}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
