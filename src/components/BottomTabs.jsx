const TABS = [
  { id: 'orders', label: 'Orders' },
  { id: 'items', label: 'Items' },
  { id: 'customers', label: 'Customers' },
  { id: 'dashboard', label: 'Dashboard' }
];

export default function BottomTabs({ active, onChange }) {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === active ? 'tab-btn active' : 'tab-btn'}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
