import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, ChevronLeft } from 'lucide-react';
import {
  listCustomers,
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
  
  const [lastSavedPrices, setLastSavedPrices] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [customersData, itemsData] = await Promise.all([listCustomers(token), listItems(token)]);
      const customersList = Array.isArray(customersData) ? customersData : [];
      const found = customersList.find(c => c.id === id);
      setCustomer(found);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      
      // Need to load current customer prices too if we want to show them
      // Assuming setCustomerPrices or similar API can be used to fetch or they are in customer object
      // For now, let's keep it consistent with what was there
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

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0 }}>{customer?.name}</h2>
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
          <h3 className="items-heading">ITEMS</h3>
          <div className="items-data-container">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th style={{ textAlign: 'right' }}>Prices (Base / Custom)</th>
                </tr>
              </thead>
              <tbody>
                {lastSavedPrices.length > 0 ? (
                   lastSavedPrices.map((price) => {
                     const item = items.find((it) => it.id === price.itemId);
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
