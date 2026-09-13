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
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <AdminStoreProvider>
          <OrderStoreProvider>
            <CartProvider>
              <WishlistProvider>
                <App />
              </WishlistProvider>
            </CartProvider>
          </OrderStoreProvider>
        </AdminStoreProvider>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
