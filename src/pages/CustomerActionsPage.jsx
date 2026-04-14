import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  createCustomer,
  updateCustomer,
  getCustomer
} from '../api';

const emptyCustomer = {
  name: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  locationLink: ''
};

export default function CustomerActionsPage({ token }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);

  useEffect(() => {
    if (id) {
      const loadCustomer = async () => {
        setLoading(true);
        try {
          const data = await getCustomer(token, id);
          setCustomerForm({
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            addressLine1: data.addressLine1 || '',
            addressLine2: data.addressLine2 || '',
            city: data.city || '',
            postalCode: data.postalCode || '',
            locationLink: data.locationLink || ''
          });
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      loadCustomer();
    }
  }, [id, token]);

  const onCustomerChange = (event) => {
    const { name, value } = event.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (id) {
        await updateCustomer(token, id, customerForm);
      } else {
        await createCustomer(token, customerForm);
      }
      setCustomerForm(emptyCustomer);
      navigate('/customers');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page"><p className="muted">Loading...</p></div>;

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h3 style={{ margin: 0 }}>{id ? 'EDIT CUSTOMER' : 'ADD CUSTOMER'}</h3>
        </div>
      </div>

      <div>
        {error && <p className="error-text">{error}</p>}
        <form className="card stack-form" onSubmit={saveCustomer}>
          <div className="form-group">
            <input name="name" placeholder="Name *" required value={customerForm.name} onChange={onCustomerChange} />
          </div>
          <div className="form-group">
            <input name="phone" placeholder="Phone *" required value={customerForm.phone} onChange={onCustomerChange} />
          </div>
          <div className="form-group">
            <input name="email" placeholder="Email (Optional)" type="email" value={customerForm.email} onChange={onCustomerChange} />
          </div>
          <div className="form-group">
            <input
              name="addressLine1"
              placeholder="Address Line 1 *"
              required
              value={customerForm.addressLine1}
              onChange={onCustomerChange}
            />
          </div>
          <div className="split-2">
            <div className="form-group">
              <input name="city" placeholder="City *" required value={customerForm.city} onChange={onCustomerChange} />
            </div>
            <div className="form-group">
              <input
                name="postalCode"
                placeholder="Postal Code *"
                required
                value={customerForm.postalCode}
                onChange={onCustomerChange}
              />
            </div>
          </div>
          <div className="form-group">
            <input
              name="locationLink"
              placeholder="Google Maps Link (Optional)"
              value={customerForm.locationLink}
              onChange={onCustomerChange}
            />
          </div>
          <button type="submit" className="primary" style={{ marginTop: '0.5rem' }}>{id ? 'Update Customer' : 'Create Customer'}</button>
        </form>
      </div>
    </section>
  );
}
