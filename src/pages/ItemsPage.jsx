import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Filter, X, Package } from 'lucide-react';
import { deleteItem, listItems, listLowStockItems, updateBulkStock } from '../api';
import EmptyState from '../components/EmptyState';

const ItemSkeleton = () => (
  <div className="card customer-card" style={{ cursor: 'default' }}>
    <div className="customer-card-main">
      <div className="customer-content">
        <div className="customer-card-header">
          <div className="skeleton skeleton-title" style={{ width: '40%' }}></div>
          <div className="col-actions">
            <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
          </div>
        </div>
        <div className="customer-details">
          <div className="skeleton skeleton-text" style={{ width: '30%', height: '12px' }}></div>
        </div>
      </div>
    </div>
    <div className="customer-stats-bar">
      <div className="stat-pill" style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div>
        <div className="skeleton" style={{ width: '60%', height: '16px' }}></div>
      </div>
      <div className="stat-pill" style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div>
        <div className="skeleton" style={{ width: '60%', height: '16px' }}></div>
      </div>
      <div className="stat-pill" style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div>
        <div className="skeleton" style={{ width: '60%', height: '16px' }}></div>
      </div>
    </div>
  </div>
);

export default function ItemsPage({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('listing');
  const [stockInputs, setStockInputs] = useState({});
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkUpdateError, setBulkUpdateError] = useState('');
  const [bulkUpdateSuccess, setBulkUpdateSuccess] = useState('');
  const [filters, setFilters] = useState({ q: '', minStock: '', maxStock: '', lowStock: false });
  const [tempFilters, setTempFilters] = useState({ q: '', minStock: '', maxStock: '', lowStock: false });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'lowStock') return value === true;
      return value !== '';
    }).length;
  }, [filters]);

  const loadItems = async (appliedFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      let data;
      if (appliedFilters.lowStock) {
        data = await listLowStockItems(token);
      } else {
        data = await listItems(token, appliedFilters);
      }
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

  useEffect(() => {
    setStockInputs((prev) => {
      const next = {};
      items.forEach((item) => {
        next[item.id] = prev[item.id] ?? String(item.stock ?? '');
      });
      return next;
    });
  }, [items]);

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
    const reset = { q: '', minStock: '', maxStock: '', lowStock: false };
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

  const handleStockChange = (itemId, value) => {
    setStockInputs((prev) => ({
      ...prev,
      [itemId]: value
    }));
  };

  const prepareBulkUpdates = () => {
    return items.map((item) => {
      const rawValue = stockInputs[item.id];
      const candidate = rawValue === undefined || rawValue === '' ? item.stock : rawValue;
      const parsed = Number(candidate);
      return {
        id: item.id,
        stock: Number.isFinite(parsed) ? parsed : Number(item.stock ?? 0)
      };
    });
  };

  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    setBulkUpdateError('');
    setBulkUpdateSuccess('');
    try {
      await updateBulkStock(token, { updates: prepareBulkUpdates() });
      setBulkUpdateSuccess('Stocks updated successfully.');
      await loadItems(filters);
    } catch (err) {
      setBulkUpdateError(err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  useEffect(() => {
    setBulkUpdateError('');
    setBulkUpdateSuccess('');
  }, [activeTab]);

  return (
    <section className="page" style={{ position: 'relative', minHeight: 'calc(100vh - 8rem)' }}>
      {!loading && items.length === 0 && activeFiltersCount === 0 ? (
        <EmptyState
          icon={Package}
          title="No items yet"
          description="Manage your inventory by adding products, setting prices, and tracking stock levels."
          actionLabel="Add Item"
          onAction={() => navigate('/items/add')}
        />
      ) : (
        <div className="items-page-content" style={{ marginTop: '1rem' }}>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '1rem'
            }}
          >
              {['listing', 'stock'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="card"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    border: tab === activeTab ? '1px solid hsl(var(--primary))' : '1px solid transparent',
                    background: tab === activeTab ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))'
                  }}
                >
                  <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    {tab === 'listing' ? 'Items Listing' : 'Stock Update'}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === 'listing' && (
              <>
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
                      textAlign: 'left',
                      marginBottom: 0
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
                      {filters.lowStock && (
                        <div 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '2rem',
                            background: 'hsl(var(--destructive) / 0.1)',
                            border: '1px dashed black',
                            fontSize: '0.875rem',
                            color: 'hsl(var(--destructive))'
                          }}
                        >
                          <span>Low Stock Only</span>
                          <button 
                            type="button" 
                            onClick={() => clearFilter('lowStock')}
                            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'inherit' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="items-list-container">
                  {error ? <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p> : null}
                  
                  {loading ? (
                    <>
                      <ItemSkeleton />
                      <ItemSkeleton />
                      <ItemSkeleton />
                    </>
                  ) : (
                    <>
                    {items.length === 0 && activeFiltersCount > 0 && (
                      <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No items match your filters.</p>
                    )}
                    {items.map((item) => (
                      <article 
                        key={item.id} 
                        className="card customer-card"
                      >
                        <div className="customer-card-main">
                          <div className="customer-content">
                            <header className="customer-card-header">
                              <h3 className="customer-name-heading">{item.name}</h3>
                              <div className="col-actions">
                                <button 
                                  type="button" 
                                  className="ghost-btn" 
                                  onClick={() => editItem(item)}
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  type="button" 
                                  className="ghost-btn delete-action" 
                                  onClick={() => removeItem(item.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </header>
                          </div>
                        </div>

                        <div className="customer-stats-bar">
                          <div className="stat-pill">
                            <span className="stat-label">Cost</span>
                            <span className="stat-value">₹{item.costPrice}</span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-label">Base</span>
                            <span className="stat-value">₹{item.basePrice}</span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-label">Stock</span>
                            <span className={`stat-value ${Number(item.stock) <= Number(item.threshold) ? 'destructive' : ''}`}>
                              {item.stock}
                            </span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-label">Threshold</span>
                            <span className="stat-value">{item.threshold}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                    </>
                  )}
                </div>
              </>
            )}

            {activeTab === 'stock' && (
              <div className="stock-update-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bulkUpdateError && <p className="error-text">{bulkUpdateError}</p>}
                {bulkUpdateSuccess && <p className="success-text">{bulkUpdateSuccess}</p>}
                {!loading && items.length === 0 && <p className="muted">No items to update.</p>}
                {items.map((item) => (
                  <div
                    key={`stock-${item.id}`}
                    className="card"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.name}</h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                        Threshold: {item.threshold}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label htmlFor={`stock-input-${item.id}`} style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>Stock</label>
                      <input
                        id={`stock-input-${item.id}`}
                        type="number"
                        value={stockInputs[item.id] ?? String(item.stock ?? '')}
                        onChange={(e) => handleStockChange(item.id, e.target.value)}
                        style={{ width: '6rem' }}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleBulkUpdate}
                    disabled={bulkUpdating || items.length === 0}
                  >
                    {bulkUpdating ? 'Updating...' : 'Update All Stocks'}
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* FILTER MODAL  */}
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
                placeholder="Search by name"
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

            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexDirection: 'row' }}>
              <input
                id="lowStock"
                name="lowStock"
                type="checkbox"
                checked={tempFilters.lowStock}
                onChange={(e) => setTempFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                style={{ width: 'auto' }}
              />
              <label htmlFor="lowStock" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Show Low Stock Only</label>
            </div>
          </div>

          <footer className="split-2" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
            <button type="button" onClick={resetFilters} style={{ width: '100%' }}>Reset All</button>
            <button type="button" className="primary" onClick={applyFilters} style={{ width: '100%' }}>Apply Filters</button>
          </footer>
        </div>
      )}

      {items.length > 0 && (
        <button 
          type="button" 
          className="floating-action-btn"
          onClick={() => navigate('/items/add')}
          title="Add Item"
        >
          <Plus size={24} />
        </button>
      )}
    </section>
  );
}
