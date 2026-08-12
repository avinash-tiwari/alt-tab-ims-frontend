import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  createCustomer,
  updateCustomer,
  getCustomer
} from '../api';
import Input from '../components/ui/Input';

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
    <section 
      className="page"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'hsl(var(--background))',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem'
      }}
    >
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        borderBottom: '1px solid hsl(var(--primary) / 0.1)',
        marginBottom: '1rem',
        background: 'hsl(var(--primary) / 0.05)',
        margin: '-1rem -1rem 1rem -1rem'
      }}>
        <h2 style={{ margin: 0, color: 'hsl(var(--primary))', fontWeight: 800 }}>{id ? 'EDIT CUSTOMER' : 'ADD CUSTOMER'}</h2>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => navigate(-1)}
          aria-label="Close"
          style={{ color: 'hsl(var(--primary))' }}
        >
          <X size={24} />
        </button>
      </header>

      <div>
        {error && <p className="error-text">{error}</p>}
        <form className="card stack-form" onSubmit={saveCustomer}>
          <Input name="name" placeholder="Name *" required value={customerForm.name} onChange={onCustomerChange} />
          <Input name="phone" placeholder="Phone" value={customerForm.phone} onChange={onCustomerChange} />
          <Input name="email" placeholder="Email" type="email" value={customerForm.email} onChange={onCustomerChange} />
          <Input
            name="addressLine1"
            placeholder="Address Line 1"
            value={customerForm.addressLine1}
            onChange={onCustomerChange}
          />
          <div className="split-2">
            <Input name="city" placeholder="City" value={customerForm.city} onChange={onCustomerChange} />
            <Input
              name="postalCode"
              placeholder="Postal Code"
              value={customerForm.postalCode}
              onChange={onCustomerChange}
            />
          </div>
          <Input
            name="locationLink"
            placeholder="Google Maps Link"
            value={customerForm.locationLink}
            onChange={onCustomerChange}
          />
          <button type="submit" className="primary" style={{ marginTop: '0.5rem' }}>{id ? 'Update Customer' : 'Create Customer'}</button>
        </form>
      </div>
    </section>
  );
}
