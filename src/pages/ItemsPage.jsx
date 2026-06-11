import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, X, Package, Search, ChevronDown } from 'lucide-react';
import {
  bulkMarkSpendsStatusTrue,
  deleteItem,
  listItems,
  listLowStockItems,
  listSpends,
  listSuppliers,
  createSupplier,
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
  const [snackbar, setSnackbar] = useState({ show: false, message: '' });
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const supplierDropdownRef = useRef(null);

  useEffect(() => {
    if (!showSupplierDropdown) return;
    function handleClick(e) {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        setShowSupplierDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSupplierDropdown]);

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
  }, [filters]);

  useEffect(() => {
    setStockInputs((prev) => {
      const next = {};
      items.forEach((item) => {
        next[item.id] = prev[item.id] ?? String(item.stock ?? '');
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!showSupplierDropdown) return;
    const timer = setTimeout(async () => {
      setSuppliersLoading(true);
      try {
        const data = await listSuppliers(token, { q: supplierSearchTerm, limit: 10 });
        setSuppliers(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setSuppliers([]);
      } finally {
        setSuppliersLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [supplierSearchTerm, showSupplierDropdown, token]);

  const onFilterChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFilters((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const clearFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: key === 'lowStock' ? false : '' }));
  };

  const resetFilters = () => {
    setFilters({ q: '', minStock: '', maxStock: '', lowStock: false });
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
      await bulkMarkSpendsStatusTrue(token, { ids, ...(selectedSupplierId ? { supplierId: selectedSupplierId } : {}) });
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

  useEffect(() => {
    if (spendsModalOpen) {
      setSelectedSupplierId(null);
      setShowSupplierDropdown(false);
      setShowCreateSupplier(false);
    }
  }, [spendsModalOpen]);

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
          <div className="sticky-header" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginBottom: activeTab === 'listing' ? '1.25rem' : '0'
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
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      name="q"
                      placeholder="Search"
                      value={filters.q}
                      onChange={onFilterChange}
                      className="compact-input"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input
                      name="minStock"
                      type="number"
                      placeholder="Min stock"
                      value={filters.minStock}
                      onChange={onFilterChange}
                      className="compact-input"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      name="maxStock"
                      type="number"
                      placeholder="Max stock"
                      value={filters.maxStock}
                      onChange={onFilterChange}
                      className="compact-input"
                    />
                  </div>
                  <div style={{ 
                    flex: 1,
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    whiteSpace: 'nowrap', 
                    height: '38px' 
                  }}>
                    <input
                      id="lowStock"
                      name="lowStock"
                      type="checkbox"
                      checked={filters.lowStock}
                      onChange={onFilterChange}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    <label htmlFor="lowStock" style={{ fontSize: '0.75rem', fontWeight: 600 }}>LOW STOCK</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '0' }}>
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
                  {items.map((item) => {
                    const originalStock = String(item.stock ?? '');
                    const isChanged = stockInputs[item.id] !== originalStock;
                    return (
                      <div
                        key={`stock-${item.id}`}
                        className="card"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: 0,
                          ...(isChanged ? { background: 'hsl(var(--primary) / 0.15)' } : {})
                        }}
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
                    );
                  })}
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

          <div ref={supplierDropdownRef} style={{ marginBottom: '1rem', position: 'relative', zIndex: 60 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Supplier
            </label>
            <div
              onClick={() => { setShowSupplierDropdown(prev => !prev); if (!showSupplierDropdown) setSupplierSearchTerm(''); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)', cursor: 'pointer', minHeight: '38px',
                background: 'hsl(var(--background))'
              }}
            >
              <span style={{ color: selectedSupplierId ? 'inherit' : 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                {selectedSupplierId
                  ? suppliers.find(s => s.id === selectedSupplierId)?.name || 'Unknown'
                  : 'Select supplier'}
              </span>
              <ChevronDown size={18} />
            </div>

            {showSupplierDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)', zIndex: 70, marginTop: '0.25rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden'
              }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Search size={16} style={{ flexShrink: 0, color: 'hsl(var(--muted-foreground))' }} />
                  <input
                    type="text"
                    placeholder="Search suppliers..."
                    value={supplierSearchTerm}
                    onChange={(e) => setSupplierSearchTerm(e.target.value)}
                    autoFocus
                    style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '0.875rem' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {supplierSearchTerm && (
                    <X size={16} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setSupplierSearchTerm(''); }} />
                  )}
                </div>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {suppliersLoading ? (
                    <div style={{ padding: '0.75rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>Loading...</div>
                  ) : suppliers.length > 0 ? (
                    suppliers.map(supplier => (
                      <div
                        key={supplier.id}
                        onClick={() => { setSelectedSupplierId(supplier.id); setShowSupplierDropdown(false); setSupplierSearchTerm(''); }}
                        style={{
                          padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                          background: selectedSupplierId === supplier.id ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                          fontWeight: selectedSupplierId === supplier.id ? 600 : 400
                        }}
                        onMouseEnter={(e) => { if (selectedSupplierId !== supplier.id) e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'; }}
                        onMouseLeave={(e) => { if (selectedSupplierId !== supplier.id) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {supplier.name}
                        {supplier.phone && <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginLeft: '0.5rem' }}>{supplier.phone}</span>}
                      </div>
                    ))
                  ) : null}
                  {supplierSearchTerm && !suppliersLoading && (suppliers.length === 0 || !suppliers.some(s => s.name.toLowerCase() === supplierSearchTerm.toLowerCase())) && (
                    <div
                      onClick={() => {
                        setNewSupplierName(supplierSearchTerm);
                        setNewSupplierPhone('');
                        setShowCreateSupplier(true);
                        setShowSupplierDropdown(false);
                        setSupplierSearchTerm('');
                      }}
                      style={{
                        padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                        borderTop: '1px solid hsl(var(--border))',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        color: 'hsl(var(--primary))', fontWeight: 600
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Plus size={16} /> Create "{supplierSearchTerm}"
                    </div>
                  )}
                  {!supplierSearchTerm && !suppliersLoading && suppliers.length === 0 && (
                    <div style={{ padding: '0.75rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>No suppliers found</div>
                  )}
                  <div
                    onClick={() => {
                      setNewSupplierName(supplierSearchTerm);
                      setNewSupplierPhone('');
                      setShowCreateSupplier(true);
                      setShowSupplierDropdown(false);
                      setSupplierSearchTerm('');
                    }}
                    style={{
                      padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                      borderTop: '1px solid hsl(var(--border))',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      color: 'hsl(var(--primary))', fontWeight: 600
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Plus size={16} /> Add new supplier
                  </div>
                </div>
              </div>
            )}
          </div>

          {showCreateSupplier && (
            <div style={{
              padding: '1rem', background: 'hsl(var(--muted) / 0.3)',
              borderRadius: 'var(--radius)', marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Create Supplier</h4>
                <Input
                  label="Name"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                />
                <Input
                  label="Phone"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setShowCreateSupplier(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={creatingSupplier || !newSupplierName.trim()}
                    onClick={async () => {
                      setCreatingSupplier(true);
                      try {
                        const newSupplier = await createSupplier(token, { name: newSupplierName.trim(), phone: newSupplierPhone.trim() });
                        setSelectedSupplierId(newSupplier.id);
                        setShowCreateSupplier(false);
                        const data = await listSuppliers(token, { limit: 10 });
                        setSuppliers(Array.isArray(data?.data) ? data.data : []);
                      } catch (err) {
                        // creation error handled silently
                      } finally {
                        setCreatingSupplier(false);
                      }
                    }}
                  >
                    {creatingSupplier ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                          {spend.itemName || 'Spend'}
                        </h3>
                        {spend.supplier?.name && (
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                            {spend.supplier.name}
                          </p>
                        )}
                      </div>
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
