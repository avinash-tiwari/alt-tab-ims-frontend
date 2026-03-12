import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  createCustomer
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
  const [error, setError] = useState('');
  const [customerForm, setCustomerForm] = useState(emptyCustomer);

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

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h3 style={{ margin: 0 }}>ADD CUSTOMER</h3>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {error && <p className="error-text">{error}</p>}
        <form className="card stack-form" onSubmit={saveCustomer}>
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
      </div>
    </section>
  );
}
