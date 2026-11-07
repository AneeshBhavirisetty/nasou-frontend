import './lib/ist'; // first: every date the app shows is IST
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { WishlistProvider } from './context/WishlistContext';
import { AdminStoreProvider } from './context/AdminStore';
import { OrderStoreProvider } from './context/OrderStore';
import { NotificationProvider } from './context/NotificationStore';
import { IamProvider } from './context/IamStore';
import { bootstrap, useCatalogLoaded } from './lib/live';
import AppErrorBoundary from './components/AppErrorBoundary';
import './index.css';

/* A tab opened before a deploy asks for files that no longer exist: fetch the
   new version once instead of failing (at most once a minute, so never a loop). */
window.addEventListener('vite:preloadError', (e) => {
  let last = 0;
  try { last = Number(sessionStorage.getItem('nv-reloaded-at')) || 0; } catch { /* storage blocked */ }
  if (Date.now() - last < 60_000) return; // already tried: the error screen offers Reload
  e.preventDefault();
  try { sessionStorage.setItem('nv-reloaded-at', String(Date.now())); } catch { /* storage blocked */ }
  window.location.reload();
});

/* Everything re-mounts if the catalogue only arrives after the first render. */
function Root({ children }) {
  return <React.Fragment key={String(useCatalogLoaded())}>{children}</React.Fragment>;
}

/* With an API configured, the catalogue, public settings and seller list
   come from GET /storefront/snapshot before the first render. */
bootstrap().finally(() => ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
    <Root>
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <NotificationProvider>
          <IamProvider>
          <AdminStoreProvider>
            <OrderStoreProvider>
              <CartProvider>
                <WishlistProvider>
                  <App />
                </WishlistProvider>
              </CartProvider>
            </OrderStoreProvider>
          </AdminStoreProvider>
          </IamProvider>
        </NotificationProvider>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </Root>
    </AppErrorBoundary>
  </React.StrictMode>
));
