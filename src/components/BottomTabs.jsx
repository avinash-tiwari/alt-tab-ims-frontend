import { NavLink } from 'react-router-dom';
import { ClipboardList, Package, Users, Gauge } from 'lucide-react';

const TABS = [
  { id: 'orders', label: 'Orders', path: '/orders', icon: ClipboardList },
  { id: 'items', label: 'Items', path: '/items', icon: Package },
  { id: 'customers', label: 'Customers', path: '/customers', icon: Users },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: Gauge }
];

export default function BottomTabs() {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) => (isActive ? 'tab-btn active' : 'tab-btn')}
          >
            <Icon className="tab-icon" size={18} aria-hidden />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
