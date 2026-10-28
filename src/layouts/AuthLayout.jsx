import { Link, Outlet } from 'react-router-dom';
import Logo from '../components/Logo';

/* NasouHive demo login screen: a single centred card on linen, with a quiet
   back link above it. */
export default function AuthLayout() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-canvas text-forest">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.7),transparent_32%),radial-gradient(circle_at_85%_8%,rgba(230,236,234,0.8),transparent_28%)]" />
      <div className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-6">
        <div className="flex w-full max-w-md flex-col items-stretch">
          <div className="mb-4 flex items-center gap-3">
            <Link
              to="/home"
              className="inline-flex items-center gap-2 text-sm font-semibold text-forest-800 transition hover:-translate-x-1 hover:text-forest"
            >
              <span aria-hidden="true">&lt;</span>
              <span>Back to shop</span>
            </Link>
          </div>
          <Link to="/home" aria-label="Nivora home" className="mx-auto mb-6">
            <Logo variant="stacked" size={148} />
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
