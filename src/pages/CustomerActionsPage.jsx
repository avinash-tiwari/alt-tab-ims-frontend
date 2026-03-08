import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  createCustomer,
  listCustomers,
  listItems,
  setCustomerPrices
} from '../api';

const emptyCustomer = {
  name: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: '',
  postalCode: ''
};

export default function CustomerActionsPage({ token }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('add');
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [itemId, setItemId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [priceEntries, setPriceEntries] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, itemsData] = await Promise.all([listCustomers(token), listItems(token)]);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setItems(Array.isArray(itemsData) ? itemsData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onCustomerChange = (event) => {
    const { name, value } = event.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await createCustomer(token, customerForm);
      setCustomerForm(emptyCustomer);
      navigate('/customers');
    } catch (err) {
      setError(err.message);
    }
  };

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
    if (!selectedCustomerId || priceEntries.length === 0) return;
    setError('');
    try {
      await setCustomerPrices(token, selectedCustomerId, priceEntries);
      setPriceEntries([]);
      navigate(`/customer/${selectedCustomerId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0 }}>Actions</h2>
        </div>

        <div className="page-tabs">
          <button
            type="button"
            className={activeTab === 'add' ? 'page-tab-btn active' : 'page-tab-btn'}
            onClick={() => setActiveTab('add')}
          >
            Add Customer
          </button>
          <button
            type="button"
            className={activeTab === 'price' ? 'page-tab-btn active' : 'page-tab-btn'}
            onClick={() => setActiveTab('price')}
          >
            Customer Price List
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {error && <p className="error-text">{error}</p>}
        {activeTab === 'add' ? (
          <form className="card stack-form" onSubmit={saveCustomer}>
            <h3 className="items-heading">Add New Customer</h3>
            <input name="name" placeholder="Name" required value={customerForm.name} onChange={onCustomerChange} />
            <input name="phone" placeholder="Phone" value={customerForm.phone} onChange={onCustomerChange} />
            <input name="email" placeholder="Email" type="email" value={customerForm.email} onChange={onCustomerChange} />
            <input
              name="addressLine1"
              placeholder="Address Line 1"
              value={customerForm.addressLine1}
              onChange={onCustomerChange}
            />
            <div className="split-2">
              <input name="city" placeholder="City" value={customerForm.city} onChange={onCustomerChange} />
              <input name="state" placeholder="State" value={customerForm.state} onChange={onCustomerChange} />
            </div>
            <div className="split-2">
              <input name="country" placeholder="Country" value={customerForm.country} onChange={onCustomerChange} />
              <input
                name="postalCode"
                placeholder="Postal Code"
                value={customerForm.postalCode}
                onChange={onCustomerChange}
              />
            </div>
            <button type="submit" className="primary">Create Customer</button>
          </form>
        ) : (
          <article className="card stack-form">
            <h3 className="items-heading">Manage Prices</h3>
            <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

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
              <div className="items-data-container">
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
        )}
      </div>
    </section>
  );
}
