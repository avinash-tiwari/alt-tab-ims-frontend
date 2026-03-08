import { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import BottomTabs from './components/BottomTabs';
import {
  clearSession,
  getStoredTenant,
  getStoredToken,
  login,
  storeSession
} from './api';
import ItemsPage from './pages/ItemsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import CustomerActionsPage from './pages/CustomerActionsPage';
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';

function AppContent({ token, tenant, logout }) {
  const initials = useMemo(() => {
    if (!tenant?.name) return 'IMS';
    return tenant.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
  }, [tenant?.name]);

  return (
    <div className="mobile-app">
      <header className="app-header">
        <div className="header-logo-container">
          <div className="tenant-logo">{initials}</div>
          <h1 className="tenant-name-header">{tenant?.name || 'IMS Admin'}</h1>
        </div>
        <button type="button" onClick={logout} className="ghost-btn">Logout</button>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/orders" element={<OrdersPage token={token} />} />
          <Route path="/items" element={<ItemsPage token={token} />} />
          <Route path="/customers" element={<CustomersPage token={token} />} />
          <Route path="/customers/actions" element={<CustomerActionsPage token={token} />} />
          <Route path="/customer/:id" element={<CustomerDetailPage token={token} />} />
          <Route path="/dashboard" element={<DashboardPage />} />
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

  if (!token) {
    return <LoginScreen onSubmit={handleLogin} loading={loading} error={loginError} />;
  }

  return (
    <BrowserRouter>
      <AppContent token={token} tenant={tenant} logout={logout} />
    </BrowserRouter>
  );
}
