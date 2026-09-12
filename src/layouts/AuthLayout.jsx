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
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-forest-800 transition hover:-translate-x-1 hover:text-forest"
            >
              <span aria-hidden="true">&lt;</span>
              <span>Back to shop</span>
            </Link>
            <Link to="/" aria-label="Nasou Hive home">
              <Logo variant="tile" className="[&>span:first-child]:h-9 [&>span:first-child]:w-9 [&>span:first-child]:rounded-[12px] [&>span:last-child]:text-[15px]" />
            </Link>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
