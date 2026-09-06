import { Link } from 'react-router-dom';
import { Container } from '../components/ui';
import Logo from '../components/Logo';
import Icon from '../components/Icon';

export default function Unauthorized() {
  return (
    <Container className="flex min-h-[calc(100vh-200px)] items-center justify-center py-16">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 flex justify-center text-forest">
          <Logo />
        </div>

        <div className="rounded-xl border border-line bg-white p-8 shadow-card">
          <div className="text-center space-y-6">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name="lockClosed" size={32} />
            </div>
            <h1 className="mb-2 text-center text-[24px]">Unauthorized</h1>
            <p className="mb-4 text-center text-[14px] text-ink-50">
              You don't have permission to access this page. Please contact an administrator if you believe this is an error.
            </p>
            <Link
              to="/login"
              className="inline-block font-semibold text-emerald-600 hover:text-emerald-700 text-[13.5px]"
            >
              Sign in with a different account
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}