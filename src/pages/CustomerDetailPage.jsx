import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
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
  
  const [itemId, setItemId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [priceEntries, setPriceEntries] = useState([]);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const addPriceEntry = () => {
    if (!itemId || !customPrice) return;
    setPriceEntries((prev) => {
      const filtered = prev.filter((entry) => entry.itemId !== itemId);
      return [...filtered, { itemId, customPrice: Number(customPrice) }];
    });
    setItemId('');
    setCustomPrice('');
  };

  const savePriceList = async () => {
    if (!id || priceEntries.length === 0) return;
    setError('');
    try {
      const data = await setCustomerPrices(token, id, priceEntries);
      setLastSavedPrices(Array.isArray(data) ? data : []);
      setPriceEntries([]);
    } catch (err) {
      setError(err.message);
    }
  };

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
        <div className="customer-address-box card">
          <p style={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '0.25rem' }}>Address Details</p>
          <p>
            {[customer.addressLine1, customer.city, customer.state, customer.postalCode].filter(Boolean).join(', ')}
          </p>
          <p>{customer.phone}</p>
          {customer.email && <p>{customer.email}</p>}
        </div>

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

        <article className="card stack-form">
          <h3 className="items-heading">Add Custom Price</h3>
          <div className="split-2">
            <select value={itemId} onChange={(event) => setItemId(event.target.value)}>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (Rs. {item.basePrice})
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Custom price"
              value={customPrice}
              onChange={(event) => setCustomPrice(event.target.value)}
            />
          </div>

          <div className="row-actions">
            <button type="button" onClick={addPriceEntry}>Add Entry</button>
            <button type="button" className="primary" onClick={savePriceList}>Save Price List</button>
          </div>

          {priceEntries.length > 0 && (
            <div className="items-data-container" style={{ marginTop: '1rem' }}>
              {priceEntries.map((entry) => {
                const item = items.find((it) => it.id === entry.itemId);
                return (
                  <p key={entry.itemId} className="list-line">
                    {item?.name || entry.itemId}: Rs. {entry.customPrice}
                  </p>
                );
              })}
            </div>
          )}
        </article>

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
    </section>
  );
}
