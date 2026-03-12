import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Filter, X } from 'lucide-react';
import { deleteItem, listItems } from '../api';

export default function ItemsPage({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', minStock: '', maxStock: '' });
  const [tempFilters, setTempFilters] = useState({ q: '', minStock: '', maxStock: '' });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const thresholdItems = useMemo(
    () => items.filter((item) => Number(item.stock) <= Number(item.threshold)),
    [items]
  );

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== '').length;
  }, [filters]);

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

  const onTempFilterChange = (event) => {
    const { name, value } = event.target;
    setTempFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    loadItems(tempFilters);
    setIsFilterModalOpen(false);
  };

  const clearFilter = (key) => {
    const newFilters = { ...filters, [key]: '' };
    setFilters(newFilters);
    setTempFilters(newFilters);
    loadItems(newFilters);
  };

  const resetFilters = () => {
    const reset = { q: '', minStock: '', maxStock: '' };
    setFilters(reset);
    setTempFilters(reset);
    loadItems(reset);
    setIsFilterModalOpen(false);
  };

  const editItem = (item) => {
    navigate(`/items/edit/${item.id}`);
  };

  const removeItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    setError('');
    try {
      await deleteItem(token, itemId);
      await loadItems(filters);
    } catch (err) {
      setError(err.message);
    }
  };

  const openFilterModal = () => {
    setTempFilters(filters);
    setIsFilterModalOpen(true);
  };

  return (
    <section className="page" style={{ position: 'relative', minHeight: 'calc(100vh - 8rem)' }}>
      <div className="items-page-content" style={{ marginTop: '1rem' }}>
        
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button 
            type="button" 
            className="card" 
            onClick={openFilterModal}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '1rem', 
              width: '100%',
              border: '1px dashed hsl(var(--border))',
              background: 'hsl(var(--card))',
              cursor: 'pointer',
              color: 'hsl(var(--foreground))',
              textAlign: 'left'
            }}
          >
            <Filter size={20} style={{ color: 'hsl(var(--primary))' }} />
            <span style={{ fontWeight: 500, flex: 1 }}>ADD FILTER</span>
            {activeFiltersCount > 0 && (
              <div
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetFilters();
                }}
                style={{
                  background: 'hsl(var(--destructive) / 0.1)',
                  color: 'hsl(var(--destructive))',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Clear all filters"
              >
                <X size={16} />
              </div>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {filters.q && (
                <div 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '2rem',
                    background: 'hsl(var(--primary) / 0.1)',
                    border: '1px dashed black',
                    fontSize: '0.875rem',
                    color: 'hsl(var(--primary))'
                  }}
                >
                  <span>Search: <strong>{filters.q}</strong></span>
                  <button 
                    type="button" 
                    onClick={() => clearFilter('q')}
                    style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'inherit' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {filters.minStock && (
                <div 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '2rem',
                    background: 'hsl(var(--primary) / 0.1)',
                    border: '1px dashed black',
                    fontSize: '0.875rem',
                    color: 'hsl(var(--primary))'
                  }}
                >
                  <span>Min Stock: <strong>{filters.minStock}</strong></span>
                  <button 
                    type="button" 
                    onClick={() => clearFilter('minStock')}
                    style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'inherit' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {filters.maxStock && (
                <div 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '2rem',
                    background: 'hsl(var(--primary) / 0.1)',
                    border: '1px dashed black',
                    fontSize: '0.875rem',
                    color: 'hsl(var(--primary))'
                  }}
                >
                  <span>Max Stock: <strong>{filters.maxStock}</strong></span>
                  <button 
                    type="button" 
                    onClick={() => clearFilter('maxStock')}
                    style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'inherit' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isFilterModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'hsl(var(--background))',
            zIndex: 1000,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <header style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              paddingBottom: '1rem',
              borderBottom: '1px solid hsl(var(--border))',
              marginBottom: '1rem' 
            }}>
              <h2 style={{ margin: 0 }}>Filters</h2>
              <button type="button" className="ghost-btn" onClick={() => setIsFilterModalOpen(false)}>
                <X size={24} />
              </button>
            </header>

            <div className="stack-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Search</label>
                <input
                  name="q"
                  type="text"
                  placeholder="Search by name or SKU"
                  value={tempFilters.q}
                  onChange={onTempFilterChange}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Stock Range</label>
                <div className="split-2">
                  <input
                    name="minStock"
                    type="number"
                    placeholder="Min stock"
                    value={tempFilters.minStock}
                    onChange={onTempFilterChange}
                  />
                  <input
                    name="maxStock"
                    type="number"
                    placeholder="Max stock"
                    value={tempFilters.maxStock}
                    onChange={onTempFilterChange}
                  />
                </div>
              </div>
            </div>

            <footer className="split-2" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
              <button type="button" onClick={resetFilters} style={{ width: '100%' }}>Reset All</button>
              <button type="button" className="primary" onClick={applyFilters} style={{ width: '100%' }}>Apply Filters</button>
            </footer>
          </div>
        )}

        <div className="items-list-container">
          {loading ? <p className="muted">Loading...</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
          {!loading && items.length === 0 ? <p className="muted">No items found.</p> : null}
          
          {items.map((item) => (
            <article 
              key={item.id} 
              className="card customer-card"
            >
              <header className="customer-card-header">
                <h3 className="customer-name-heading" style={{marginBottom: 0}}>{item.name}</h3>
                <div className="col-actions">
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
            </article>
          ))}
        </div>
      </div>

      <button 
        type="button" 
        className="floating-action-btn"
        onClick={() => navigate('/items/add')}
        title="Add Item"
      >
        <Plus size={24} />
      </button>
    </section>
  );
}
