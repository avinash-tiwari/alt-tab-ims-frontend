import { NavLink } from 'react-router-dom';

const TABS = [
  { id: 'orders', label: 'Orders', path: '/orders' },
  { id: 'items', label: 'Items', path: '/items' },
  { id: 'customers', label: 'Customers', path: '/customers' },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' }
];

export default function BottomTabs() {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      {TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.path}
          className={({ isActive }) => (isActive ? 'tab-btn active' : 'tab-btn')}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
