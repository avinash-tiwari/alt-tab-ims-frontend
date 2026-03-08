import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { createItem, deleteItem, listItems, updateItem } from '../api';

const emptyForm = {
  name: '',
  sku: '',
  description: '',
  stock: '',
  threshold: '',
  basePrice: ''
};

export default function ItemsPage({ token }) {
  const [activeTab, setActiveTab] = useState('list');
  const [expandedItem, setExpandedItem] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', minStock: '', maxStock: '' });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');

  const thresholdItems = useMemo(
    () => items.filter((item) => Number(item.stock) <= Number(item.threshold)),
    [items]
  );

  const loadItems = async (query) => {
    setLoading(true);
    setError('');
    try {
      const data = await listItems(token, query);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    loadItems(filters);
  };

  const resetFilters = () => {
    const reset = { q: '', minStock: '', maxStock: '' };
    setFilters(reset);
    loadItems(reset);
  };

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveItem = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description,
      stock: Number(form.stock),
      threshold: Number(form.threshold),
      basePrice: Number(form.basePrice)
    };

    setError('');
    try {
      if (editingId) {
        await updateItem(token, editingId, payload);
      } else {
        await createItem(token, payload);
      }
      setForm(emptyForm);
      setEditingId('');
      await loadItems(filters);
    } catch (err) {
      setError(err.message);
    }
  };

  const editItem = (item) => {
    setActiveTab('action');
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      sku: item.sku || '',
      description: item.description || '',
      stock: String(item.stock ?? ''),
      threshold: String(item.threshold ?? ''),
      basePrice: String(item.basePrice ?? '')
    });
  };

  const removeItem = async (itemId) => {
    setError('');
    try {
      await deleteItem(token, itemId);
      await loadItems(filters);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page">
      <div className="sticky-header">
        <h2>Inventory Items</h2>

        <div className="page-tabs">
          <button
            type="button"
            className={activeTab === 'list' ? 'page-tab-btn active' : 'page-tab-btn'}
            onClick={() => setActiveTab('list')}
          >
            Item List
          </button>
          <button
            type="button"
            className={activeTab === 'action' ? 'page-tab-btn active' : 'page-tab-btn'}
            onClick={() => setActiveTab('action')}
          >
            Actions
          </button>
        </div>
      </div>

      {activeTab === 'action' ? (
        <>
          <form className="card stack-form" onSubmit={applyFilters}>
            <h3>Search & Filter</h3>
            <input
              name="q"
              type="text"
              placeholder="Search by name or SKU"
              value={filters.q}
              onChange={onFilterChange}
            />
            <div className="split-2">
              <input
                name="minStock"
                type="number"
                placeholder="Min stock"
                value={filters.minStock}
                onChange={onFilterChange}
              />
              <input
                name="maxStock"
                type="number"
                placeholder="Max stock"
                value={filters.maxStock}
                onChange={onFilterChange}
              />
            </div>
            <div className="row-actions">
              <button type="submit" className="primary">Apply</button>
              <button type="button" onClick={resetFilters}>Reset</button>
            </div>
          </form>

          <form className="card stack-form" onSubmit={saveItem}>
            <h3>{editingId ? 'Edit Item' : 'Add Item'}</h3>
            <input name="name" placeholder="Name" value={form.name} onChange={onFormChange} required />
            <input name="sku" placeholder="SKU" value={form.sku} onChange={onFormChange} required />
            <input name="description" placeholder="Description" value={form.description} onChange={onFormChange} />
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
            <div className="row-actions">
              <button type="submit" className="primary">{editingId ? 'Update' : 'Create'}</button>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId('');
                    setForm(emptyForm);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <article className="card">
            <h3>Low Stock Alerts</h3>
            {thresholdItems.length === 0 ? (
              <p className="muted">No items currently at or below threshold.</p>
            ) : (
              thresholdItems.map((item) => (
                <p key={item.id} className="list-line">
                  {item.name}: <strong>{item.stock}</strong> left (threshold {item.threshold})
                </p>
              ))
            )}
          </article>
        </>
      ) : (
        <div className="items-list-container">
          {loading ? <p className="muted">Loading...</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
          {!loading && items.length === 0 ? <p className="muted">No items found.</p> : null}
          
          {items.map((item) => (
            <article 
              key={item.id} 
              className="card customer-card"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <header className="customer-card-header">
                <h3 className="customer-name-heading" style={{marginBottom: 0}}>{item.name}</h3>
                <div className="col-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button" 
                    className="ghost-btn" 
                    style={{ padding: '0.4rem', border: 'none' }}
                    onClick={() => editItem(item)}
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    type="button" 
                    className="ghost-btn" 
                    style={{ padding: '0.4rem', border: 'none', color: 'hsl(var(--destructive))' }}
                    onClick={() => removeItem(item.id)}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    type="button" 
                    className="ghost-btn" 
                    style={{ padding: '0.4rem', border: 'none' }}
                    onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  >
                    {expandedItem === item.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </header>

              <div className="customer-stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Current Stock</span>
                  <span className={`stat-value ${Number(item.stock) <= Number(item.threshold) ? 'text-destructive' : ''}`}>
                    {item.stock}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Threshold</span>
                  <span className="stat-value">{item.threshold}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Base Price</span>
                  <span className="stat-value">Rs. {item.basePrice}</span>
                </div>
              </div>

              {expandedItem === item.id && (
                <div className="customer-items-section">
                  <h4 className="items-heading">Description</h4>
                  <div className="items-data-container">
                    <p className="muted" style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(195 85% 20%)' }}>
                      {item.description || 'No description available for this item.'}
                    </p>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
