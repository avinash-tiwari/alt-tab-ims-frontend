import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Users, Phone, MapPin, Search, Filter } from 'lucide-react';
import {
  deleteCustomer,
  listCustomers
} from '../api';
import EmptyState from '../components/EmptyState';
import { formatCurrency } from '../utils/orderUtils';

const CustomerSkeleton = () => (
  <div className="card customer-card" style={{ cursor: 'default' }}>
    <div className="customer-card-main">
      <div className="customer-content">
        <div className="customer-card-header">
          <div className="skeleton skeleton-title" style={{ width: '40%' }}></div>
          <div className="col-actions">
            <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
          </div>
        </div>
        <div className="customer-details">
          <div className="skeleton skeleton-text" style={{ width: '30%', height: '12px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '50%', height: '12px' }}></div>
        </div>
      </div>
    </div>
    <div className="customer-stats-bar">
      <div className="stat-pill" style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div>
        <div className="skeleton" style={{ width: '60%', height: '16px' }}></div>
      </div>
      <div className="stat-pill" style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div>
        <div className="skeleton" style={{ width: '60%', height: '16px' }}></div>
      </div>
      <div className="stat-pill" style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div>
        <div className="skeleton" style={{ width: '60%', height: '16px' }}></div>
      </div>
    </div>
  </div>
);

export default function CustomersPage({ token }) {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [sortBy, setSortBy] = useState('spent_desc');

  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(c => 
        (c.name || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term) ||
        (c.addressLine1 || '').toLowerCase().includes(term) ||
        (c.city || '').toLowerCase().includes(term)
      );
    }

    // Unpaid filter
    if (showOnlyUnpaid) {
      result = result.filter(c => Number(c.unSpentAmount || 0) > 0);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'spent_desc':
          return Number(b.totalSpent || 0) - Number(a.totalSpent || 0);
        case 'spent_asc':
          return Number(a.totalSpent || 0) - Number(b.totalSpent || 0);
        case 'unpaid_desc':
          return Number(b.unSpentAmount || 0) - Number(a.unSpentAmount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [customers, searchTerm, showOnlyUnpaid, sortBy]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listCustomers(token);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const removeCustomer = async (customerId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    setError('');
    try {
      await deleteCustomer(token, customerId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page">
      {!loading && customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Keep track of your clients and their purchase history. Start by adding your first customer."
          actionLabel="Add Customer"
          onAction={() => navigate('/customers/actions')}
        />
      ) : (
        <>
        <div className="sticky-header" style={{ paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="input-group" style={{ position: 'relative' }}>
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'hsl(var(--muted-foreground))'
                }} 
              />
              <input
                type="text"
                placeholder="Search by name, phone or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ flex: 1, height: '2.25rem', fontSize: '0.875rem' }}
              >
                <option value="spent_desc">Highest Spent</option>
                <option value="spent_asc">Lowest Spent</option>
                <option value="unpaid_desc">Highest Unpaid</option>
              </select>

              <button
                type="button"
                className={`ghost-btn ${showOnlyUnpaid ? 'primary' : ''}`}
                onClick={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
                style={{ 
                  height: '2.25rem', 
                  padding: '0 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.875rem',
                  border: showOnlyUnpaid ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                  background: showOnlyUnpaid ? 'hsl(var(--primary) / 0.1)' : 'white',
                  color: showOnlyUnpaid ? 'hsl(var(--primary))' : 'inherit'
                }}
              >
                <Filter size={14} />
                Not Paid
              </button>
            </div>
          </div>
        </div>

        <div className="customers-list-container">
          {error ? <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p> : null}
          
          {loading ? (
            <>
              <CustomerSkeleton />
              <CustomerSkeleton />
              <CustomerSkeleton />
            </>
          ) : filteredAndSortedCustomers.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', opacity: 0.6 }}>
              <p>No customers found matching your filters.</p>
              <button 
                type="button" 
                className="ghost-btn" 
                onClick={() => { setSearchTerm(''); setShowOnlyUnpaid(false); setSortBy('spent_desc'); }}
                style={{ marginTop: '0.5rem', color: 'hsl(var(--primary))' }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredAndSortedCustomers.map((customer) => (
              <article 
                key={customer.id} 
                className="card customer-card"
                onClick={() => navigate(`/customer/${customer.id}`)}
                style={{
                  background: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive) / 0.05)' : 'hsl(var(--primary) / 0.05)',
                  borderColor: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive) / 0.2)' : 'hsl(var(--primary) / 0.1)'
                }}
              >
                <div className="customer-card-main">
                  <div className="customer-content">
                    <header className="customer-card-header">
                      <h3 
                        className="customer-name-heading"
                        style={{ color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
                      >
                        {customer.name}
                      </h3>
                      <div className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button" 
                          className="ghost-btn" 
                          onClick={() => navigate(`/customers/actions/${customer.id}`)}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          type="button" 
                          className="ghost-btn delete-action" 
                          onClick={(e) => removeCustomer(customer.id, e)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </header>

                    <div className="customer-details">
                      {customer.phone && (
                        <div className="detail-item">
                          <Phone 
                            size={14} 
                            className="detail-icon" 
                            style={{ color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
                          />
                          <a 
                            href={`tel:${customer.phone}`} 
                            className="detail-link"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))', opacity: 0.9 }}
                          >
                            {customer.phone}
                          </a>
                        </div>
                      )}
                      <div className="detail-item">
                        <MapPin 
                          size={14} 
                          className="detail-icon" 
                          style={{ color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
                        />
                        <a 
                          href={customer.locationLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([customer.addressLine1, customer.city, customer.postalCode].filter(Boolean).join(', '))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="detail-link truncate"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))', opacity: 0.9 }}
                        >
                          {[customer.addressLine1, customer.city, customer.postalCode].filter(Boolean).join(', ') || 'No address provided'}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  className="customer-stats-bar"
                  style={{
                    background: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--primary) / 0.1)'
                  }}
                >
                  <div className="stat-pill">
                    <span 
                      className="stat-label"
                      style={{ 
                        color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                        fontSize: '0.75rem',
                        opacity: 0.8
                      }}
                    >
                      Spent
                    </span>
                    <span 
                      className="stat-value"
                      style={{ 
                        fontSize: '1.1rem',
                        color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'
                      }}
                    >
                      {formatCurrency(customer?.totalSpent ?? '0')}
                    </span>
                  </div>
                  <div className="stat-pill">
                    <span 
                      className="stat-label"
                      style={{ 
                        color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                        fontSize: '0.75rem',
                        opacity: 0.8
                      }}
                    >
                      NOT PAID
                    </span>
                    <span 
                      className="stat-value"
                      style={{ 
                        fontSize: '1.1rem',
                        color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                        fontWeight: 800
                      }}
                    >
                      {formatCurrency(customer?.unSpentAmount ?? '0')}
                    </span>
                  </div>
                  <div className="stat-pill">
                    <span 
                      className="stat-label"
                      style={{ 
                        color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                        fontSize: '0.75rem',
                        opacity: 0.8
                      }}
                    >
                      Orders
                    </span>
                    <span 
                      className="stat-value"
                      style={{ 
                        fontSize: '1.1rem',
                        color: Number(customer.unSpentAmount || 0) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'
                      }}
                    >
                      {customer?.totalOrders ?? 0}
                    </span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

      {customers.length > 0 && (
        <button 
          type="button" 
          className="floating-action-btn"
          onClick={() => navigate('/customers/actions')}
          title="Add Customer"
        >
          <Plus size={24} />
        </button>
      )}
      </> )}
    </section>
  );
}
