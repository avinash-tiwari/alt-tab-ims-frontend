import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Users, Phone, MapPin } from 'lucide-react';
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
        <div className="customers-list-container" style={{paddingTop: '1rem'}}>
          {error ? <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p> : null}
          
          {loading ? (
            <>
              <CustomerSkeleton />
              <CustomerSkeleton />
              <CustomerSkeleton />
            </>
          ) : (
            customers.map((customer) => (
              <article 
                key={customer.id} 
                className="card customer-card"
                onClick={() => navigate(`/customer/${customer.id}`)}
              >
                <div className="customer-card-main">
                  <div className="customer-content">
                    <header className="customer-card-header">
                      <h3 className="customer-name-heading">{customer.name}</h3>
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
                          <Phone size={14} className="detail-icon" />
                          <a 
                            href={`tel:${customer.phone}`} 
                            className="detail-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {customer.phone}
                          </a>
                        </div>
                      )}
                      <div className="detail-item">
                        <MapPin size={14} className="detail-icon" />
                        <a 
                          href={customer.locationLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([customer.addressLine1, customer.city, customer.postalCode].filter(Boolean).join(', '))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="detail-link truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {[customer.addressLine1, customer.city, customer.postalCode].filter(Boolean).join(', ') || 'No address provided'}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="customer-stats-bar">
                  <div className="stat-pill">
                    <span className="stat-label">Spent</span>
                    <span className="stat-value">₹{formatCurrency(customer?.totalSpent ?? '0')}</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-label">Credits</span>
                    <span className="stat-value warning">₹{formatCurrency(customer?.totalCredits ?? '0')}</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-label">Due</span>
                    <span className="stat-value destructive">₹{formatCurrency(customer?.totalDue ?? '0')}</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-label">Orders</span>
                    <span className="stat-value">{customer?.totalOrders ?? 0}</span>
                  </div>
                </div>
              </article>
        )))}
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
