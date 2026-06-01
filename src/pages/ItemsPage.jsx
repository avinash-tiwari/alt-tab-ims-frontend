import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Filter, X, Package } from 'lucide-react';
import {
  bulkMarkSpendsStatusTrue,
  deleteItem,
  listItems,
  listLowStockItems,
  listSpends,
  updateBulkStock
} from '../api';
import EmptyState from '../components/EmptyState';
import { formatCurrency } from '../utils/orderUtils';
import Input from '../components/ui/Input';

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
  const [spendsModalOpen, setSpendsModalOpen] = useState(false);
  const [spendsLoading, setSpendsLoading] = useState(false);
  const [spendsVerifying, setSpendsVerifying] = useState(false);
  const [spendsError, setSpendsError] = useState('');
  const [spendsSuccess, setSpendsSuccess] = useState('');
  const [spends, setSpends] = useState([]);
  const [filters, setFilters] = useState({ q: '', minStock: '', maxStock: '', lowStock: false });
  const [tempFilters, setTempFilters] = useState({ q: '', minStock: '', maxStock: '', lowStock: false });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ show: false, message: '' });

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'lowStock') return value === true;
      return value !== '';
    }).length;
  }, [filters]);

  const totalSpendMoney = useMemo(() => {
    return spends.reduce((sum, spend) => sum + (Number(spend.total) || 0), 0);
  }, [spends]);

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
      const currentStockRaw = Number(item.stock ?? 0);
      const currentStock = Number.isFinite(currentStockRaw) ? currentStockRaw : 0;
      const nextStock = Number.isFinite(parsed) ? parsed : currentStock;
      return {
        id: item.id,
        diff: nextStock - currentStock
      };
    }).filter((update) => update.diff !== 0);
  };

  const fetchPendingSpends = async () => {
    setSpendsLoading(true);
    setSpendsError('');
    setSpendsSuccess('');
    try {
      const data = await listSpends(token, { status: false });
      setSpends(Array.isArray(data) ? data : []);
    } catch (err) {
      setSpendsError(err.message);
      setSpends([]);
    } finally {
      setSpendsLoading(false);
    }
  };

  const handleVerifyAllSpends = async () => {
    setSpendsVerifying(true);
    setSpendsError('');
    setSpendsSuccess('');
    try {
      const ids = spends.map((spend) => spend?.id).filter((id) => id !== undefined && id !== null);
      if (ids.length === 0) {
        setSpendsSuccess('No pending spends to verify.');
        setSpendsModalOpen(false);
        setActiveTab('listing');
        return;
      }
      await bulkMarkSpendsStatusTrue(token, { ids });
      setSpendsModalOpen(false);
      setActiveTab('listing');
      await loadItems(filters);
      setSnackbar({ show: true, message: 'Verified successfully' });
      setTimeout(() => setSnackbar({ show: false, message: '' }), 3000);
    } catch (err) {
      setSpendsError(err.message);
    } finally {
      setSpendsVerifying(false);
    }
  };

  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    setBulkUpdateError('');
    setBulkUpdateSuccess('');
    try {
      const updates = prepareBulkUpdates();
      if (updates.length === 0) {
        setBulkUpdateSuccess('No stock changes to apply.');
        return;
      }
      await updateBulkStock(token, { updates });
      setBulkUpdateSuccess('Stocks updated successfully.');
      await loadItems(filters);
      setSpendsModalOpen(true);
      await fetchPendingSpends();
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
        <div className="items-page-content">
          <div className="sticky-header" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginBottom: activeTab === 'listing' ? '0.75rem' : '0'
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
                    margin: 0,
                    border: tab === activeTab ? '1px solid hsl(var(--primary))' : '1px solid transparent',
                    background: tab === activeTab ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))'
                  }}
                >
                  <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    {tab === 'listing' ? 'Items List' : 'Stock Update'}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === 'listing' && (
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
                  margin: 0
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
            )}
          </div>

          <div style={{ padding: '0' }}>
            {activeTab === 'listing' && activeFiltersCount > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
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

            {activeTab === 'listing' && (
              <div className="items-list-container">
                {error ? (
                  <div className="error-text" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{error}</span>
                    <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : null}
                {loading ? (
                  <>
                    <ItemSkeleton />
                    <ItemSkeleton />
                    <ItemSkeleton />
                  </>
                ) : (
                  <>
                    {items.length === 0 && activeFiltersCount > 0 && (
                      <p className="muted card" style={{ textAlign: 'center', padding: '2rem' }}>No items match your filters.</p>
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
                            <span className="stat-label">COST</span>
                            <span className="stat-value">{formatCurrency(item.costPrice)}</span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-label">Base</span>
                            <span className="stat-value">{formatCurrency(item.basePrice)}</span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-label">Stock</span>
                            <span className={`stat-value ${Number(item.stock) <= Number(item.threshold) ? 'destructive' : ''}`}>
                              {item.stock}
                            </span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-label">Minimum Limit</span>
                            <span className="stat-value">{item.threshold}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </>
                )}
              </div>
            )}

            {activeTab === 'stock' && (
              <div className="stock-update-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '5rem' }}>
                  {bulkUpdateError && (
                    <div className="error-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{bulkUpdateError}</span>
                      <button type="button" onClick={() => setBulkUpdateError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {bulkUpdateSuccess && (
                    <div className="success-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{bulkUpdateSuccess}</span>
                      <button type="button" onClick={() => setBulkUpdateSuccess('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {!loading && items.length === 0 && <p className="muted card" style={{ textAlign: 'center', padding: '2rem' }}>No items to update.</p>}
                  {items.map((item) => (
                    <div
                      key={`stock-${item.id}`}
                      className="card"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: 0 }}
                    >
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.name}</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                          Minimum Limit: {item.threshold}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <Input
                          id={`stock-input-${item.id}`}
                          label="Stock"
                          type="number"
                          value={stockInputs[item.id] ?? String(item.stock ?? '')}
                          onChange={(e) => handleStockChange(item.id, e.target.value)}
                          style={{ width: '6rem' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ 
                  position: 'fixed', 
                  bottom: '4rem', 
                  left: 0, 
                  right: 0, 
                  padding: '1rem', 
                  background: 'hsl(var(--background))', 
                  borderTop: '1px solid hsl(var(--border))',
                  zIndex: 40
                }}>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleBulkUpdate}
                    disabled={bulkUpdating || items.length === 0}
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
                  >
                    {bulkUpdating ? 'Updating...' : 'Update All Stocks'}
                  </button>
                </div>
              </div>
            )}
          </div>
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
            <Input
              name="q"
              label="Search"
              type="text"
              placeholder="Search by name"
              value={tempFilters.q}
              onChange={onTempFilterChange}
              style={{ width: '100%' }}
            />

            <div className="split-2">
              <Input
                name="minStock"
                label="Min stock"
                type="number"
                placeholder="Min stock"
                value={tempFilters.minStock}
                onChange={onTempFilterChange}
              />
              <Input
                name="maxStock"
                label="Max stock"
                type="number"
                placeholder="Max stock"
                value={tempFilters.maxStock}
                onChange={onTempFilterChange}
              />
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

      {spendsModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'hsl(var(--background))',
            zIndex: 1100,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid hsl(var(--border))',
              marginBottom: '1rem'
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Pending Spends</h2>
            </div>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setSpendsModalOpen(false)}
              disabled={spendsLoading || spendsVerifying}
              title="Close"
            >
              <X size={24} />
            </button>
          </header>

          {spendsError && (
            <div className="error-text" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{spendsError}</span>
              <button type="button" onClick={() => setSpendsError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
          )}
          {spendsSuccess && (
            <div className="success-text" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{spendsSuccess}</span>
              <button type="button" onClick={() => setSpendsSuccess('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {spendsLoading ? (
              <p className="muted card" style={{ textAlign: 'center', padding: '2rem' }}>Loading spends...</p>
            ) : spends.length === 0 ? (
              <p className="muted card" style={{ textAlign: 'center', padding: '2rem' }}>No pending spends.</p>
            ) : (
              spends.map((spend, index) => (
                <div key={`spend-${spend?.id ?? index}`} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        {spend.itemName || 'Spend'}
                      </h3>
                      {spend.updatedAt && (
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                          {new Date(spend.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                    
                    <div className="customer-stats-bar">
                      <div className="stat-pill">
                        <span className="stat-label">Price</span>
                        <span className="stat-value">{formatCurrency(spend.price)}</span>
                      </div>
                      <div className="stat-pill">
                        <span className="stat-label">Qty</span>
                        <span className="stat-value">{spend.quantity}</span>
                      </div>
                      <div className="stat-pill">
                        <span className="stat-label" style={{ fontWeight: 600 }}>Total</span>
                        <span className="stat-value" style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>
                          {formatCurrency(spend.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <footer style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid hsl(var(--border))' }}>
            {spends.length > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'hsl(var(--muted) / 0.3)',
                borderRadius: 'var(--radius)'
              }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Total Spent</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>{formatCurrency(totalSpendMoney)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setSpendsModalOpen(false)}
                disabled={spendsLoading || spendsVerifying}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleVerifyAllSpends}
                disabled={spendsLoading || spendsVerifying || spends.length === 0}
              >
                {spendsVerifying ? 'Verifying...' : 'Verified'}
              </button>
            </div>
          </footer>
        </div>
      )}

      {
        items.length > 0 && activeTab === 'listing' && (
          <button
            type="button"
            className="floating-action-btn"
            onClick={() => navigate('/items/add')}
            title="Add Item"
          >
            <Plus size={24} />
          </button>
        )
      }

      {snackbar.show && (
        <div style={{
          position: 'fixed',
          bottom: '5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          padding: '0.75rem 1.5rem',
          borderRadius: 'var(--radius)',
          zIndex: 1200,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          {snackbar.message}
        </div>
      )}
    </section>
  );
}
