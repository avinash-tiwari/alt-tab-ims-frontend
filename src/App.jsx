import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import BottomTabs from './components/BottomTabs';
import Input from './components/ui/Input';
import {
  clearSession,
  changePassword,
  getStoredTenant,
  getStoredToken,
  login,
  storeSession
} from './api';
import ItemsPage from './pages/ItemsPage';
import AddItemPage from './pages/AddItemPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import CustomerActionsPage from './pages/CustomerActionsPage';
import AddCustomerPricePage from './pages/AddCustomerPricePage';
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';
import SpendsPage from './pages/SpendsPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import PublicOrderPage from './pages/PublicOrderPage';

function AppContent({ token, tenant, logout }) {
  const location = useLocation();

  const helpUrl = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/orders')) return import.meta.env.VITE_HELP_URL_ORDERS || 'https://www.youtube.com/';
    if (path.startsWith('/items')) return import.meta.env.VITE_HELP_URL_ITEMS || 'https://www.youtube.com/';
    if (path.startsWith('/customers') || path.startsWith('/customer')) return import.meta.env.VITE_HELP_URL_CUSTOMERS || 'https://www.youtube.com/';
    if (path.startsWith('/spends')) return import.meta.env.VITE_HELP_URL_SPENDS || 'https://www.youtube.com/';
    if (path.startsWith('/dashboard')) return import.meta.env.VITE_HELP_URL_DASHBOARD || 'https://www.youtube.com/';
    return 'https://www.youtube.com/';
  }, [location.pathname]);

  const initials = useMemo(() => {
    if (!tenant?.name) return 'IMS';
    return tenant.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
  }, [tenant?.name]);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const resetPasswordForm = () => {
    setPasswordError('');
    setPasswordForm({
      currentPassword: '',
      newPassword: ''
    });
  };

  const openPasswordModal = () => {
    resetPasswordForm();
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    resetPasswordForm();
    setPasswordModalOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (menuOpen && profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="mobile-app">
      <header className="app-header">
        <div className="header-logo-container">
          <div className="tenant-logo">{initials}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <h1 className="tenant-name-header" style={{ margin: 0, lineHeight: 1.2 }}>{tenant?.name || 'IMS Admin'}</h1>
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'hsl(var(--muted-foreground))',
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '999px',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              className="help-link-header"
              aria-label="Help"
            >
              <HelpCircle size={22} />
            </a>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="profile-menu" ref={profileMenuRef}>
          <button
            type="button"
            className="profile-menu-button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <span className="profile-icon">{initials}</span>
            <span className="sr-only">Open profile menu</span>
          </button>
          {menuOpen && (
            <div className="profile-menu-popup" role="menu">
              <button
                type="button"
                className="profile-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  openPasswordModal();
                }}
              >
                Change password
              </button>
              <button
                type="button"
                className="profile-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
      {passwordModalOpen && (
        <div
          className="modal-overlay change-password-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closePasswordModal}
        >
          <form
            className="change-password-modal"
            onClick={event => event.stopPropagation()}
            onSubmit={async event => {
              event.preventDefault();
              if (!token) {
                setPasswordError('You must be logged in to change your password.');
                return;
              }
              if (!passwordForm.currentPassword || !passwordForm.newPassword) {
                setPasswordError('Please fill in every field.');
                return;
              }
              setPasswordLoading(true);
              try {
                await changePassword(token, {
                  currentPassword: passwordForm.currentPassword,
                  newPassword: passwordForm.newPassword
                });
                window.alert('Password updated successfully.');
                closePasswordModal();
              } catch (error) {
                setPasswordError(error.message);
              } finally {
                setPasswordLoading(false);
              }
            }}
          >
            <header className="modal-header">
              <h2>Change password</h2>
              <button
                type="button"
                className="modal-close-button"
                onClick={closePasswordModal}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>
            <Input
              type="password"
              name="currentPassword"
              label="Current password"
              value={passwordForm.currentPassword}
              onChange={event => {
                setPasswordForm(prev => ({ ...prev, currentPassword: event.target.value }));
                setPasswordError('');
              }}
              autoComplete="current-password"
              required
            />
            <Input
              type="password"
              name="newPassword"
              label="New password"
              value={passwordForm.newPassword}
              onChange={event => {
                setPasswordForm(prev => ({ ...prev, newPassword: event.target.value }));
                setPasswordError('');
              }}
              autoComplete="new-password"
              required
            />
            {passwordError && (
              <p className="form-error" role="alert">
                {passwordError}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={closePasswordModal}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={passwordLoading}>
                {passwordLoading ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      )}

      <main className="app-content">
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailsPage token={token} />} />
          <Route path="/orders" element={<OrdersPage token={token} />} />
          <Route path="/items" element={<ItemsPage token={token} />} />
          <Route path="/items/add" element={<AddItemPage token={token} />} />
          <Route path="/items/edit/:id" element={<AddItemPage token={token} />} />
          <Route path="/customers" element={<CustomersPage token={token} />} />
          <Route path="/customers/actions" element={<CustomerActionsPage token={token} />} />
          <Route path="/customers/actions/:id" element={<CustomerActionsPage token={token} />} />
          <Route path="/customer/:id" element={<CustomerDetailPage token={token} />} />
          <Route path="/customer/:id/add" element={<AddCustomerPricePage token={token} />} />
          <Route path="/dashboard" element={<DashboardPage token={token} />} />
          <Route path="/spends" element={<SpendsPage token={token} />} />
          <Route path="/" element={<Navigate to="/orders" replace />} />
        </Routes>
      </main>

      <BottomTabs />
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(getStoredToken());
  const [tenant, setTenant] = useState(getStoredTenant());
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async ({ loginId, password }) => {
    setLoading(true);
    setLoginError('');
    try {
      const response = await login({ loginId, password });
      storeSession(response.token, response.tenant);
      setToken(response.token);
      setTenant(response.tenant || null);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setToken('');
    setTenant(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/public/orders/:customerIdentifier" element={<PublicOrderPage />} />
        <Route
          path="/*"
          element={
            token ? (
              <AppContent
                token={token}
                tenant={tenant}
                logout={logout}
              />
            ) : (
              <LoginScreen onSubmit={handleLogin} loading={loading} error={loginError} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
