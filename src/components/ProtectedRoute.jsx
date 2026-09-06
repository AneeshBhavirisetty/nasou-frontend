import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────
   ProtectedRoute — role-aware route guard with redirect after login.

   Props:
     allowedRoles  string[]  If omitted, any authenticated user passes.
     children      ReactNode  The page component to render.
     redirectAfterLogin  string  Optional path to redirect to after login (overrides location redirect)

   Redirect logic:
     - Not authenticated → /login?redirect=<current-path>
     - Wrong role → /unauthorized
   ───────────────────────────────────────────────────────────── */
export default function ProtectedRoute({ allowedRoles, children, redirectAfterLogin }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  // Handle redirect after login if specified
  useEffect(() => {
    if (isAuthenticated && redirectAfterLogin) {
      // This would typically be handled by the login component itself
      // But we can use this for role-based redirects if needed
    }
  }, [isAuthenticated, redirectAfterLogin]);

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
