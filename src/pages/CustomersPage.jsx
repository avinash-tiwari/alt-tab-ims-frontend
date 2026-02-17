import { useEffect, useState } from 'react';
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  listItems,
  setCustomerPrices,
  updateCustomer
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

export default function CustomersPage({ token }) {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [customerForm, setCustomerForm] = useState(emptyCustomer);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
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
      const itemsList = Array.isArray(itemsData) ? itemsData : [];
      setCustomers(customersList);
      setItems(itemsList);
      if (!selectedCustomerId && customersList[0]?.id) {
        setSelectedCustomerId(customersList[0].id);
      }
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
      if (editingId) {
        await updateCustomer(token, editingId, customerForm);
      } else {
        await createCustomer(token, customerForm);
      }
      setCustomerForm(emptyCustomer);
      setEditingId('');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const editCustomer = (customer) => {
    setEditingId(customer.id);
    setCustomerForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      addressLine1: customer.addressLine1 || '',
      addressLine2: customer.addressLine2 || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || '',
      postalCode: customer.postalCode || ''
    });
  };

  const removeCustomer = async (customerId) => {
    setError('');
    try {
      await deleteCustomer(token, customerId);
      if (selectedCustomerId === customerId) {
        setSelectedCustomerId('');
      }
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const addPriceEntry = () => {
    if (!itemId || !customPrice) {
      return;
    }
    setPriceEntries((prev) => {
      const filtered = prev.filter((entry) => entry.itemId !== itemId);
      return [...filtered, { itemId, customPrice: Number(customPrice) }];
    });
    setItemId('');
    setCustomPrice('');
  };

  const savePriceList = async () => {
    if (!selectedCustomerId || priceEntries.length === 0) {
      return;
    }
    setError('');
    try {
      const data = await setCustomerPrices(token, selectedCustomerId, priceEntries);
      setLastSavedPrices(Array.isArray(data) ? data : []);
      setPriceEntries([]);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page">
      <h2>Customers</h2>

      <form className="card stack-form" onSubmit={saveCustomer}>
        <h3>{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
        <input name="name" placeholder="Name" required value={customerForm.name} onChange={onCustomerChange} />
        <input name="phone" placeholder="Phone" value={customerForm.phone} onChange={onCustomerChange} />
        <input name="email" placeholder="Email" type="email" value={customerForm.email} onChange={onCustomerChange} />
        <input
          name="addressLine1"
          placeholder="Address Line 1"
          value={customerForm.addressLine1}
          onChange={onCustomerChange}
        />
        <input
          name="addressLine2"
          placeholder="Address Line 2"
          value={customerForm.addressLine2}
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

        <div className="row-actions">
          <button type="submit" className="primary">{editingId ? 'Update' : 'Create'}</button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId('');
                setCustomerForm(emptyCustomer);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <article className="card stack-form">
        <h3>Customer Price List</h3>
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

        {priceEntries.length > 0 ? (
          <div>
            {priceEntries.map((entry) => {
              const item = items.find((it) => it.id === entry.itemId);
              return (
                <p key={entry.itemId} className="list-line">
                  {item?.name || entry.itemId}: Rs. {entry.customPrice}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="muted">No pending price entries.</p>
        )}

        {lastSavedPrices.length > 0 ? (
          <div>
            <p className="muted">Last saved prices:</p>
            {lastSavedPrices.map((price) => {
              const item = items.find((it) => it.id === price.itemId);
              return (
                <p key={price.itemId} className="list-line">
                  {item?.name || price.itemId}: Rs. {price.customPrice}
                </p>
              );
            })}
          </div>
        ) : null}
      </article>

      <article className="card">
        <h3>Customers List</h3>
        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && customers.length === 0 ? <p className="muted">No customers found.</p> : null}
        {customers.map((customer) => (
          <div key={customer.id} className="entity-row">
            <div>
              <p className="entity-title">{customer.name}</p>
              <p className="muted">{customer.phone || '-'}</p>
              <p className="muted">{customer.city || '-'}, {customer.country || '-'}</p>
            </div>
            <div className="col-actions">
              <button type="button" onClick={() => editCustomer(customer)}>Edit</button>
              <button type="button" className="danger" onClick={() => removeCustomer(customer.id)}>Delete</button>
            </div>
          </div>
        ))}
      </article>
    </section>
  );
}
