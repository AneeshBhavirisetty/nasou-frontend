import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';

export default function ProtectedLayout({ children }) {
  return (
    <>
      <ProtectedRoute>
        <>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </>
      </ProtectedRoute>
    </>
  );
}