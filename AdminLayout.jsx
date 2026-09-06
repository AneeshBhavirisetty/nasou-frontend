import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AdminLayout({ children }) {
  return (
    <>
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </>
      </ProtectedRoute>
    </>
  );
}