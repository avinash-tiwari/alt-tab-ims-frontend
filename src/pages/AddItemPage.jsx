import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { createItem, updateItem, getItem } from '../api';

const emptyForm = {
  name: '',
  stock: '',
  threshold: '',
  costPrice: '',
  basePrice: ''
};

export default function AddItemPage({ token }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadItem = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const item = await getItem(token, id);
      if (item) {
        setForm({
          name: item.name || '',
          stock: String(item.stock ?? ''),
          threshold: String(item.threshold ?? ''),
          costPrice: String(item.costPrice ?? ''),
          basePrice: String(item.basePrice ?? '')
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [id]);

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveItem = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      stock: Number(form.stock),
      threshold: Number(form.threshold),
      costPrice: Number(form.costPrice),
      basePrice: Number(form.basePrice)
    };

    setError('');
    try {
      if (id) {
        await updateItem(token, id, payload);
      } else {
        await createItem(token, payload);
      }
      navigate('/items');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page"><p className="muted">Loading...</p></div>;

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0 }}>{id ? 'EDIT ITEM' : 'ADD ITEM'}</h2>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {error && <p className="error-text">{error}</p>}
        <form className="card stack-form" onSubmit={saveItem}>
          <h3 className="items-heading">{id ? 'Update Item Details' : 'New Item Details'}</h3>
          <input name="name" placeholder="Name" value={form.name} onChange={onFormChange} required />
          <input
            name="costPrice"
            type="number"
            step="0.01"
            placeholder="Cost Price"
            value={form.costPrice}
            onChange={onFormChange}
            required
          />
          <div className="split-2">
            <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={onFormChange} required />
            <input
              name="threshold"
              type="number"
              placeholder="Threshold"
              value={form.threshold}
              onChange={onFormChange}
              required
            />
          </div>
          <input
            name="basePrice"
            type="number"
            step="0.01"
            placeholder="Base Price"
            value={form.basePrice}
            onChange={onFormChange}
            required
          />
          <button type="submit" className="primary">{id ? 'Update Item' : 'Create Item'}</button>
        </form>
      </div>
    </section>
  );
}
