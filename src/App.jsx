import { useMemo, useState } from 'react';
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
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';

function PageSwitch({ tab, token }) {
  if (tab === 'items') {
    return <ItemsPage token={token} />;
  }
  if (tab === 'customers') {
    return <CustomersPage token={token} />;
  }
  if (tab === 'dashboard') {
    return <DashboardPage />;
  }
  return <OrdersPage />;
}

export default function App() {
  const [token, setToken] = useState(getStoredToken());
  const [tenant, setTenant] = useState(getStoredTenant());
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const title = useMemo(() => {
    if (activeTab === 'items') return 'Items';
    if (activeTab === 'customers') return 'Customers';
    if (activeTab === 'dashboard') return 'Dashboard';
    return 'Orders';
  }, [activeTab]);

  const handleLogin = async ({ loginId, password }) => {
    setLoading(true);
    setLoginError('');
    try {
      const response = await login({ loginId, password });
      storeSession(response.token, response.tenant);
      setToken(response.token);
      setTenant(response.tenant || null);
      setActiveTab('orders');
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
    setActiveTab('orders');
  };

  if (!token) {
    return <LoginScreen onSubmit={handleLogin} loading={loading} error={loginError} />;
  }

  return (
    <div className="mobile-app">
      <header className="app-header">
        <div>
          <p className="small-label">Tenant</p>
          <h1>{tenant?.name || 'IMS Admin'}</h1>
          <p className="muted">{title}</p>
        </div>
        <button type="button" onClick={logout}>Logout</button>
      </header>

      <main className="app-content">
        <PageSwitch tab={activeTab} token={token} />
      </main>

      <BottomTabs active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
