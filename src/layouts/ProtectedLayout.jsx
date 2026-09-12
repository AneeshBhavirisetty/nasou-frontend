import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import ProtectedRoute from '../components/ProtectedRoute';

export default function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-dvh flex-col pb-[var(--tabbar-h,0px)]">
        <Header />
        <main className="flex-1">{children ?? <Outlet />}</main>
        <Footer />
        <MobileTabBar />
      </div>
    </ProtectedRoute>
  );
}
