import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { createItem, updateItem, deleteItem, getItem, getItemBatches } from '../api';
import { formatCurrency } from '../utils/orderUtils';
import Input from '../components/ui/Input';

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
  const [batches, setBatches] = useState([]);

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
          costPrice: String(item.costPrice ? Math.trunc(item.costPrice) : ''),
          basePrice: String(item.basePrice ? Math.trunc(item.basePrice) : '')
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    if (!id) return;
    try {
      const data = await getItemBatches(token, id);
      setBatches(data?.batches || []);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    loadItem();
    loadBatches();
  }, [id]);

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    setError('');
    try {
      await deleteItem(token, id);
      navigate('/items');
    } catch (err) {
      setError(err.message);
    }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0 }}>{id ? 'EDIT ITEM' : 'ADD ITEM'}</h2>
        </div>
      </div>

      <div>
        {error && <p className="error-text">{error}</p>}
        <form 
          className="card stack-form" 
          onSubmit={saveItem}
          style={{
            background: 'hsl(var(--primary) / 0.05)',
            borderColor: 'hsl(var(--primary) / 0.1)',
            padding: '1.25rem'
          }}
        >
          <Input name="name" placeholder="Name" value={form.name} onChange={onFormChange} required />
          <Input
            name="costPrice"
            type="number"
            step="1"
            placeholder="Cost Price"
            value={form.costPrice}
            onChange={onFormChange}
            required
          />
          <div className="split-2">
            <Input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={onFormChange} required />
            <Input
              name="threshold"
              type="number"
              placeholder="Minimum Limit"
              value={form.threshold}
              onChange={onFormChange}
              required
            />
          </div>
          <Input
            name="basePrice"
            type="number"
            step="1"
            placeholder="Base Price"
            value={form.basePrice}
            onChange={onFormChange}
            required
          />
          <button 
            type="submit" 
            className="primary"
            style={{ width: '100%', height: '2.5rem', fontSize: '0.9rem', fontWeight: 700 }}
          >
            {id ? 'UPDATE ITEM' : 'CREATE ITEM'}
          </button>
          {id && (
            <button 
              type="button" 
              className="danger" 
              onClick={handleDelete} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                width: '100%',
                height: '2.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'white',
                background: 'hsl(var(--destructive))',
                borderColor: 'hsl(var(--destructive))'
              }}
            >
              <Trash2 size={16} /> DELETE ITEM
            </button>
          )}
        </form>
      </div>

      {id && (
        <div 
          className="card" 
          style={{ 
            padding: '0', 
            marginTop: '1.5rem',
            background: 'hsl(var(--primary) / 0.05)',
            borderColor: 'hsl(var(--primary) / 0.1)',
            overflow: 'hidden'
          }}
        >
          <h3 style={{ padding: '1rem', margin: 0, color: 'hsl(var(--primary))' }}>Past Batches</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="chart-table" style={{ background: 'white', margin: 0, width: '100%' }}>
              <thead style={{ backgroundColor: 'hsl(var(--primary))', color: 'white' }}>
                <tr>
                  <th style={{ color: 'white' }}>#</th>
                  <th style={{ color: 'white' }}>Quantity</th>
                  <th className="text-right" style={{ color: 'white' }}>Cost Price</th>
                  <th className="text-right" style={{ color: 'white' }}>Received At</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center helper-text">No batches found</td>
                  </tr>
                ) : (
                  batches.map((batch, idx) => (
                    <tr key={batch.id}>
                      <td>{idx + 1}</td>
                      <td>{batch.quantity}</td>
                      <td className="text-right">{formatCurrency(batch.costPrice)}</td>
                      <td className="text-right">
                        <div style={{ fontSize: '0.875rem' }}>
                          {new Date(batch.receivedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
