import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  deleteCustomer,
  listCustomers
} from '../api';
import { formatCurrency } from '../utils/orderUtils';

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
    <section className="page" style={{ position: 'relative', minHeight: 'calc(100vh - 8rem)' }}>
      <div className="customers-list-container">
        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && customers.length === 0 ? <p className="muted">No customers found.</p> : null}
        
        {customers.map((customer) => (
          <article 
            key={customer.id} 
            className="card customer-card"
            onClick={() => navigate(`/customer/${customer.id}`)}
          >
            <header className="customer-card-header">
              <h3 className="customer-name-heading" style={{marginBottom: 0}}>{customer.name}</h3>
              <div className="col-actions" onClick={(e) => e.stopPropagation()}>
                <button 
                  type="button" 
                  className="ghost-btn" 
                  style={{ padding: '0.4rem', border: 'none' }}
                  onClick={() => navigate(`/customers/actions/${customer.id}`)}
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  type="button" 
                  className="ghost-btn" 
                  style={{ padding: '0.4rem', border: 'none', color: 'hsl(var(--destructive))' }}
                  onClick={(e) => removeCustomer(customer.id, e)}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </header>

            <div className="customer-address-box">
              <p>
                {[customer.addressLine1, customer.city, customer.state, customer.postalCode].filter(Boolean).join(', ')}
              </p>
              <p>{customer.phone}</p>
            </div>

            <div className="customer-stats-grid">
              {[
                {
                  label: 'Total Spent',
                  value: `₹ ${formatCurrency(customer?.totalSpent ?? '0')}`
                },
                {
                  label: 'Credits',
                  value: `₹ ${formatCurrency(customer?.totalCredits ?? '0')}`
                },
                {
                  label: 'Total Due',
                  value: `₹ ${formatCurrency(customer?.totalDue ?? '0')}`
                },
                {
                  label: 'Total Orders',
                  value: String(customer?.totalOrders ?? 0)
                },
                {
                  label: 'Active Orders',
                  value: String(customer?.activeOrders ?? customer?.activeOrdersCount ?? 0)
                }
              ].map((stat) => (
                <div className="stat-item" key={stat.label}>
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <button 
        type="button" 
        className="floating-action-btn"
        onClick={() => navigate('/customers/actions')}
        title="Add Customer"
      >
        <Plus size={24} />
      </button>
    </section>
  );
}
