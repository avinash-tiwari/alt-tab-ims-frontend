import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, ChevronLeft } from 'lucide-react';
import {
  getCustomer,
  listItems,
  setCustomerPrices
} from '../api';

export default function CustomerDetailPage({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [customerData, itemsData] = await Promise.all([
        getCustomer(token, id),
        listItems(token)
      ]);
      setCustomer(customerData);
      setItems(Array.isArray(itemsData) ? itemsData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading && !customer) return <div className="page"><p className="muted">Loading...</p></div>;
  if (!customer && !loading) return <div className="page"><p className="muted">Customer not found.</p></div>;

  const priceList = customer?.priceList || [];

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{customer?.name}</h2>
            <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>{customer?.phone} • {customer?.city}</p>
          </div>
          <button 
            type="button" 
            className="ghost-btn" 
            onClick={() => navigate(`/customers/actions/${id}`)}
            style={{ padding: '0.5rem' }}
          >
            <Pencil size={20} />
          </button>
        </div>
      </div>

      <div className="customer-detail-content" style={{ marginTop: '1rem' }}>
        <div className="customer-stats-grid card">
          <div className="stat-item">
            <span className="stat-label">Total Spent</span>
            <span className="stat-value">₹ 0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Credits</span>
            <span className="stat-value">₹ 0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Orders</span>
            <span className="stat-value">0</span>
          </div>
        </div>

        <div className="customer-items-section card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="items-heading" style={{ margin: 0 }}>CUSTOM PRICES</h3>
          </div>
          <div className="items-data-container">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th style={{ textAlign: 'right' }}>Prices (Base / Custom)</th>
                </tr>
              </thead>
              <tbody>
                {priceList.length > 0 ? (
                   priceList.map((price) => {
                     const item = price.item || items.find((it) => it.id === price.itemId);
                     return (
                       <tr key={price.itemId}>
                         <td>{item?.name || price.itemId}</td>
                         <td style={{ textAlign: 'right' }}>
                           Rs. {item?.basePrice || 0} / <strong>Rs. {price.customPrice}</strong>
                         </td>
                       </tr>
                     );
                   })
                ) : (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '1rem', color: 'hsl(195 85% 30%)' }}>
                      No custom prices defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <button 
        type="button" 
        className="floating-action-btn"
        onClick={() => navigate(`/customer/${id}/add`)}
        title="Add Custom Price"
      >
        <Plus size={24} />
      </button>
    </section>
  );
}
