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
import './index.css';

/* Everything re-mounts if the catalogue only arrives after the first render. */
function Root({ children }) {
  return <React.Fragment key={String(useCatalogLoaded())}>{children}</React.Fragment>;
}

/* With an API configured, the catalogue, public settings and seller list
   come from GET /storefront/snapshot before the first render. */
bootstrap().finally(() => ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>
));
