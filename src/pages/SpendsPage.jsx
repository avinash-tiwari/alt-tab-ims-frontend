import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { Activity, Check, ChevronDown, Pencil, Plus, Search, Trash2, TrendingDown, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { listSpends, createSpend, createBulkSpends, bulkMarkSpendsStatusTrue, listSuppliers, createSupplier, updateSpend, deleteSpend, listItems, createItem, deleteSupplier } from '../api';
import { formatCurrency } from '../utils/orderUtils';
import Input from '../components/ui/Input';

function StatCard({ icon: Icon, label, value, color, bgColor }) {
  const iconStyle = {
    padding: '0.5rem',
    background: bgColor || 'hsl(var(--primary) / 0.1)',
    borderRadius: '0.5rem',
    color: color || 'hsl(var(--primary))'
  };

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={iconStyle}>
          <Icon size={20} />
        </div>
        <div>
          <p className="helper-text" style={{ margin: 0, fontSize: '0.75rem' }}>{label}</p>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{value}</div>
          </div>
        </div>
      </div>
  );
}

function ItemSelect({ token, value, onChange, placeholder = 'Select item' }) {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCostPrice, setCreateCostPrice] = useState('');
  const [createBasePrice, setCreateBasePrice] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowCreate(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown || showCreate) return;
    setItemsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await listItems(token, { q: searchTerm, limit: 10 });
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setItemsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, showDropdown, showCreate, token]);

  const handleSelect = (item) => {
    onChange({ id: item.id, name: item.name, costPrice: item.costPrice || 0 });
    setShowDropdown(false);
    setSearchTerm('');
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const newItem = await createItem(token, {
        name: createName.trim(),
        costPrice: parseFloat(createCostPrice) || 0,
        basePrice: parseFloat(createBasePrice) || 0
      });
      onChange({ id: newItem.id, name: newItem.name, costPrice: newItem.costPrice || 0 });
      setShowDropdown(false);
      setShowCreate(false);
      setSearchTerm('');
    } catch {
    } finally {
      setCreating(false);
    }
  };

  const displayName = value
    ? (items.find(i => i.id === value)?.name || 'Unknown')
    : '';

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => { setShowDropdown(prev => !prev); if (!showDropdown) { setSearchTerm(''); setShowCreate(false); } }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.5rem 0.75rem', border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)', cursor: 'pointer', minHeight: '38px',
          background: 'hsl(var(--background))'
        }}
      >
        <span style={{ color: value ? 'inherit' : 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
          {value ? displayName : placeholder}
        </span>
        <ChevronDown size={18} />
      </div>
      {showDropdown && !showCreate && (
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
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '0.875rem' }}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <X size={16} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }} />
            )}
          </div>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {itemsLoading ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>Loading...</div>
            ) : items.length > 0 ? (
              items.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                    background: value === item.id ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                    fontWeight: value === item.id ? 600 : 400
                  }}
                  onMouseEnter={(e) => { if (value !== item.id) e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'; }}
                  onMouseLeave={(e) => { if (value !== item.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.name}
                </div>
              ))
            ) : null}
            {searchTerm && !itemsLoading && (items.length === 0 || !items.some(i => i.name.toLowerCase() === searchTerm.trim().toLowerCase())) && (
              <div
                onClick={() => { setCreateName(searchTerm.trim()); setShowCreate(true); }}
                style={{
                  padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                  borderTop: '1px solid hsl(var(--border))',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  color: 'hsl(var(--primary))', fontWeight: 600
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={16} /> Create &ldquo;{searchTerm.trim()}&rdquo;
              </div>
            )}
            {!searchTerm && !itemsLoading && items.length === 0 && (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>No items found</div>
            )}
          </div>
        </div>
      )}
      {showDropdown && showCreate && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)', zIndex: 70, marginTop: '0.25rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', padding: '1rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Create Item</h4>
            <Input label="Name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            <Input label="Cost Price" type="number" value={createCostPrice} onChange={(e) => setCreateCostPrice(e.target.value)} />
            <Input label="Base Price" type="number" value={createBasePrice} onChange={(e) => setCreateBasePrice(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="ghost-btn" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button type="button" className="primary" onClick={handleCreate} disabled={creating || !createName.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateSpendModal({ token, onClose, onSuccess }) {
  const [mode, setMode] = useState('single');
  const [formData, setFormData] = useState({ 
    itemName: '', 
    price: '', 
    quantity: '',
    spendDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateStock, setUpdateStock] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);

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

  const [bulkSpendDate, setBulkSpendDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkRows, setBulkRows] = useState([{ itemName: '', price: '', quantity: '', selectedItemId: null }]);

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

  const handleItemSelect = (item) => {
    setSelectedItemId(item.id);
    setFormData(prev => ({ ...prev, itemName: item.name, price: item.costPrice || '' }));
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        itemName: formData.itemName,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        spendDate: formData.spendDate,
        status: true,
        updateStock
      };
      if (selectedSupplierId) payload.supplierId = selectedSupplierId;
      await createSpend(token, payload);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const validRows = bulkRows.filter(r => r.itemName.trim());
    if (validRows.length === 0) {
      setError('Add at least one item');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const spends = validRows.map(r => ({
        itemName: r.itemName,
        price: parseFloat(r.price),
        quantity: parseInt(r.quantity),
        spendDate: bulkSpendDate,
        updateStock,
        ...(selectedSupplierId ? { supplierId: selectedSupplierId } : {})
      }));
      await createBulkSpends(token, { spends });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateBulkRow = (index, updates) => {
    setBulkRows(prev => prev.map((row, i) => i === index ? { ...row, ...updates } : row));
  };

  const addBulkRow = () => {
    setBulkRows(prev => [...prev, { itemName: '', price: '', quantity: '', selectedItemId: null }]);
  };

  const removeBulkRow = (index) => {
    setBulkRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkItemSelect = (index, item) => {
    updateBulkRow(index, { selectedItemId: item.id, itemName: item.name, price: item.costPrice || '' });
  };

  const renderBulkRows = () => (
    <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginBottom: '0.5rem' }}>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
        Items ({bulkRows.length})
      </p>
      {bulkRows.map((row, index) => (
        <div key={index} style={{
          padding: '0.75rem', background: 'hsl(var(--muted) / 0.15)',
          borderRadius: 'var(--radius)', marginBottom: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
              Item #{index + 1}
            </span>
            {bulkRows.length > 1 && (
              <button type="button" className="ghost-btn" onClick={() => removeBulkRow(index)} title="Remove item" style={{ padding: '0.25rem', color: 'hsl(var(--destructive))' }}>
                <X size={16} />
              </button>
            )}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <ItemSelect
              token={token}
              value={row.selectedItemId}
              onChange={(item) => handleBulkItemSelect(index, item)}
              placeholder="Search item..."
            />
          </div>
          <div className="split-2">
            <Input
              label="Price"
              type="number"
              value={row.price}
              onChange={(e) => updateBulkRow(index, { price: e.target.value })}
              required
              step="0.01"
            />
            <Input
              label="Quantity"
              type="number"
              value={row.quantity}
              onChange={(e) => updateBulkRow(index, { quantity: e.target.value })}
              required
            />
          </div>
        </div>
      ))}
      <button type="button" className="secondary" onClick={addBulkRow} style={{ width: '100%', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Plus size={16} /> Add Item
      </button>
    </div>
  );

  const supplierDropdown = (
    <div style={{ marginBottom: '0.5rem' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Supplier</label>
      <div ref={supplierDropdownRef} style={{ position: 'relative' }}>
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
            {selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId)?.name || 'Unknown' : 'Select supplier'}
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
              <input type="text" placeholder="Search suppliers..." value={supplierSearchTerm}
                onChange={(e) => setSupplierSearchTerm(e.target.value)} autoFocus
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
                  <div key={supplier.id}
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
                <div onClick={() => { setNewSupplierName(supplierSearchTerm); setNewSupplierPhone(''); setShowCreateSupplier(true); setShowSupplierDropdown(false); setSupplierSearchTerm(''); }}
                  style={{
                    padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                    borderTop: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: 'hsl(var(--primary))', fontWeight: 600
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={16} /> Create &ldquo;{supplierSearchTerm}&rdquo;
                </div>
              )}
              {!supplierSearchTerm && !suppliersLoading && suppliers.length === 0 && (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>No suppliers found</div>
              )}
              <div onClick={() => { setNewSupplierName(''); setNewSupplierPhone(''); setShowCreateSupplier(true); setShowSupplierDropdown(false); setSupplierSearchTerm(''); }}
                style={{
                  padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                  borderTop: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: '0.5rem',
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
    </div>
  );

  const supplierCreateOverlay = showCreateSupplier && (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
      zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '400px', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        background: 'hsl(var(--background))', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Create Supplier</h4>
          <button type="button" className="ghost-btn" onClick={() => setShowCreateSupplier(false)} style={{ padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Input label="Name" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} autoFocus />
          <Input label="Phone" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="secondary" onClick={() => setShowCreateSupplier(false)}>Cancel</button>
            <button type="button" className="primary"
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
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'hsl(var(--background))', zIndex: 1000, padding: '1rem',
      display: 'flex', flexDirection: 'column'
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: '0.5rem', borderBottom: '1px solid hsl(var(--border))', marginBottom: '1rem'
      }}>
        <h3 style={{ margin: 0 }}>Create Spend</h3>
        <button type="button" className="ghost-btn" onClick={onClose} aria-label="Close" disabled={loading} style={{ padding: '0.25rem' }}>
          <X size={24} />
        </button>
      </header>

      {supplierCreateOverlay}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button type="button" onClick={() => { setMode('single'); setError(''); }}
          style={{
            flex: 1, padding: '0.5rem', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            fontWeight: mode === 'single' ? 600 : 400,
            background: mode === 'single' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
            color: mode === 'single' ? 'hsl(var(--primary-foreground))' : 'inherit'
          }}
        >
          Single Add
        </button>
        <button type="button" onClick={() => { setMode('bulk'); setError(''); }}
          style={{
            flex: 1, padding: '0.5rem', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            fontWeight: mode === 'bulk' ? 600 : 400,
            background: mode === 'bulk' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
            color: mode === 'bulk' ? 'hsl(var(--primary-foreground))' : 'inherit'
          }}
        >
          Bulk Add
        </button>
      </div>

      <form
        onSubmit={mode === 'single' ? handleSingleSubmit : handleBulkSubmit}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
          <div className="stack-form">
            {mode === 'single' ? (
              <>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Item</label>
                  <ItemSelect
                    token={token}
                    value={selectedItemId}
                    onChange={handleItemSelect}
                    placeholder="Select item"
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <Input label="Date" type="date" value={formData.spendDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, spendDate: e.target.value }))} required />
                </div>
                <div className="split-2">
                  <Input label="Price" type="number" value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} required step="0.01" />
                  <Input label="Quantity" type="number" value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))} required />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Date</label>
                  <input type="date" value={bulkSpendDate} onChange={(e) => setBulkSpendDate(e.target.value)}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem',
                      border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)',
                      fontSize: '0.875rem', background: 'hsl(var(--background))', outline: 'none'
                    }}
                  />
                </div>
                {supplierDropdown}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={updateStock}
                    onChange={(e) => setUpdateStock(e.target.checked)}
                    style={{ margin: 0, padding: 0, width: 'auto' }}
                  />
                  <label 
                    onClick={() => setUpdateStock(!updateStock)}
                    style={{ fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', margin: 0, padding: 0 }}
                  >
                    Update stock automatically
                  </label>
                </div>
                {renderBulkRows()}
              </>
            )}
            {mode === 'single' && supplierDropdown}
            {mode === 'single' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={updateStock}
                  onChange={(e) => setUpdateStock(e.target.checked)}
                  style={{ margin: 0, padding: 0, width: 'auto' }}
                />
                <label 
                  onClick={() => setUpdateStock(!updateStock)}
                  style={{ fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', margin: 0, padding: 0 }}
                >
                  Update stock automatically
                </label>
              </div>
            )}
          </div>
        </div>

        <footer style={{
          marginTop: 'auto', paddingTop: '1rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
          borderTop: '1px solid hsl(var(--border) / 0.5)'
        }}>
          <button type="button" className="secondary" onClick={onClose} disabled={loading} style={{ width: '100%', height: '2.75rem' }}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={loading} style={{ width: '100%', height: '2.75rem' }}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function EditSpendModal({ token, spend, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ itemName: spend.itemName || '', price: spend.price?.toString() || '', quantity: spend.quantity?.toString() || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateStock, setUpdateStock] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(spend.supplierId || spend.Supplier?.id || null);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const supplierDropdownRef = useRef(null);

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(spend.itemId || null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [newItemCostPrice, setNewItemCostPrice] = useState('');
  const [newItemBasePrice, setNewItemBasePrice] = useState('');
  const [creatingItem, setCreatingItem] = useState(false);
  const itemDropdownRef = useRef(null);

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

  useEffect(() => {
    if (!showItemDropdown) return;
    function handleClick(e) {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target)) {
        setShowItemDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showItemDropdown]);

  useEffect(() => {
    if (!showItemDropdown) return;
    const timer = setTimeout(async () => {
      setItemsLoading(true);
      try {
        const data = await listItems(token, { q: itemSearchTerm, limit: 10 });
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setItemsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearchTerm, showItemDropdown, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        itemName: formData.itemName,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        updateStock
      };
      if (selectedSupplierId) {
        payload.supplierId = selectedSupplierId;
      } else {
        payload.supplierId = null;
      }
      await updateSpend(token, spend.id, payload);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
        paddingBottom: '0.5rem',
        borderBottom: '1px solid hsl(var(--border))',
        marginBottom: '1rem'
      }}>
        <h3 style={{ margin: 0 }}>Edit Spend</h3>
        <button
          type="button"
          className="ghost-btn"
          onClick={onClose}
          aria-label="Close"
          disabled={loading}
          style={{ padding: '0.25rem' }}
        >
          <X size={24} />
        </button>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
          <div className="stack-form">
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Item
              </label>
              <div ref={itemDropdownRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => { setShowItemDropdown(prev => !prev); if (!showItemDropdown) setItemSearchTerm(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem', border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)', cursor: 'pointer', minHeight: '38px',
                    background: 'hsl(var(--background))'
                  }}
                >
                  <span style={{ color: selectedItemId ? 'inherit' : 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                    {selectedItemId
                      ? items.find(i => i.id === selectedItemId)?.name || formData.itemName || 'Unknown'
                      : formData.itemName || 'Select item'}
                  </span>
                  <ChevronDown size={18} />
                </div>
                {showItemDropdown && (
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
                        placeholder="Search items..."
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                        autoFocus
                        style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '0.875rem' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {itemSearchTerm && (
                        <X size={16} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setItemSearchTerm(''); }} />
                      )}
                    </div>
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      {itemsLoading ? (
                        <div style={{ padding: '0.75rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>Loading...</div>
                      ) : items.length > 0 ? (
                        items.map(item => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setFormData(prev => ({ ...prev, itemName: item.name, price: item.costPrice || '' }));
                              setShowItemDropdown(false);
                              setItemSearchTerm('');
                            }}
                            style={{
                              padding: '0.6rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem',
                              background: selectedItemId === item.id ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                              fontWeight: selectedItemId === item.id ? 600 : 400
                            }}
                            onMouseEnter={(e) => { if (selectedItemId !== item.id) e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'; }}
                            onMouseLeave={(e) => { if (selectedItemId !== item.id) e.currentTarget.style.background = 'transparent'; }}
                          >
                            {item.name}
                          </div>
                        ))
                      ) : null}
                      {itemSearchTerm && !itemsLoading && (items.length === 0 || !items.some(i => i.name.toLowerCase() === itemSearchTerm.toLowerCase())) && (
                        <div
                          onClick={() => {
                            setSelectedItemId(null);
                            setFormData(prev => ({ ...prev, itemName: itemSearchTerm }));
                            setNewItemCostPrice('');
                            setNewItemBasePrice('');
                            setShowCreateItem(true);
                            setShowItemDropdown(false);
                            setItemSearchTerm('');
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
                          <Plus size={16} /> Create "{itemSearchTerm}"
                        </div>
                      )}
                      {!itemSearchTerm && !itemsLoading && items.length === 0 && (
                        <div style={{ padding: '0.75rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>No items found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {showCreateItem && (
              <div style={{
                padding: '1rem', background: 'hsl(var(--muted) / 0.3)',
                borderRadius: 'var(--radius)', marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>Create Item</h4>
                  <Input
                    label="Name"
                    value={formData.itemName}
                    onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                  />
                  <Input
                    label="Cost Price"
                    type="number"
                    value={newItemCostPrice}
                    onChange={(e) => setNewItemCostPrice(e.target.value)}
                  />
                  <Input
                    label="Base Price"
                    type="number"
                    value={newItemBasePrice}
                    onChange={(e) => setNewItemBasePrice(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setShowCreateItem(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={creatingItem || !formData.itemName.trim()}
                      onClick={async () => {
                        setCreatingItem(true);
                        try {
                          const newItem = await createItem(token, {
                            name: formData.itemName.trim(),
                            costPrice: parseFloat(newItemCostPrice) || 0,
                            basePrice: parseFloat(newItemBasePrice) || 0
                          });
                          setSelectedItemId(newItem.id);
                          setFormData(prev => ({ ...prev, price: newItem.costPrice || newItemCostPrice || '' }));
                          setShowCreateItem(false);
                          const data = await listItems(token, { limit: 10 });
                          setItems(Array.isArray(data) ? data : []);
                        } catch (err) {
                        } finally {
                          setCreatingItem(false);
                        }
                      }}
                    >
                      {creatingItem ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Supplier
              </label>
              <div ref={supplierDropdownRef} style={{ position: 'relative' }}>
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
                      ? suppliers.find(s => s.id === selectedSupplierId)?.name || spend.Supplier?.name || 'Unknown'
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
            <div className="split-2">
              <Input
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                required
                step="0.01"
              />
              <Input
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={updateStock}
                onChange={(e) => setUpdateStock(e.target.checked)}
                style={{ margin: 0, padding: 0, width: 'auto' }}
              />
              <label 
                onClick={() => setUpdateStock(!updateStock)}
                style={{ fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', margin: 0, padding: 0 }}
              >
                Update stock automatically
              </label>
            </div>
          </div>
        </div>

        <footer style={{
          marginTop: 'auto',
          paddingTop: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          borderTop: '1px solid hsl(var(--border) / 0.5)'
        }}>
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={loading}
            style={{ width: '100%', height: '2.75rem' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={loading}
            style={{ width: '100%', height: '2.75rem' }}
          >
            {loading ? 'Updating...' : 'Update'}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default function SpendsPage({ token }) {
  const [spends, setSpends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'spends';
  const setActiveTab = (tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // useEffect(() => {
  //   window.scrollTo(0, 0);
  // }, [activeTab]);

  const [selectedSupplierForView, setSelectedSupplierForView] = useState(null);
  const [supplierSpends, setSupplierSpends] = useState([]);
  const [supplierSpendsLoading, setSupplierSpendsLoading] = useState(false);
  const [supplierSpendsFilters, setSupplierSpendsFilters] = useState({ q: '', limit: 10, offset: 0 });
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [allSuppliersLoading, setAllSuppliersLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierSpendsHasNext, setSupplierSpendsHasNext] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', status: 'verified' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierFilterId, setSupplierFilterId] = useState(null);
  const [editingSpend, setEditingSpend] = useState(null);
  const supplierDropdownRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'suppliers' || selectedSupplierForView) return;
    const timer = setTimeout(async () => {
      setAllSuppliersLoading(true);
      try {
        const data = await listSuppliers(token, { q: supplierSearch, limit: 100 });
        setAllSuppliers(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setAllSuppliers([]);
      } finally {
        setAllSuppliersLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [supplierSearch, activeTab, selectedSupplierForView, token]);

  const fetchSupplierSpends = async () => {
    if (!selectedSupplierForView) return;
    setSupplierSpendsLoading(true);
    try {
      const query = {
        supplierId: selectedSupplierForView.id,
        q: supplierSpendsFilters.q,
        limit: supplierSpendsFilters.limit,
        offset: supplierSpendsFilters.offset
      };
      const data = await listSpends(token, query);
      const spendsData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setSupplierSpends(spendsData);
      setSupplierSpendsHasNext(data?.hasNext || spendsData.length === supplierSpendsFilters.limit);
    } catch (err) {
      setError(err.message);
    } finally {
      setSupplierSpendsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierSpends();
  }, [selectedSupplierForView, supplierSpendsFilters, token]);

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

  const fetchSpends = async () => {
    setLoading(true);
    setError('');
    setSelectedIds([]);
    try {
      const query = {
        q: filters.q,
        limit: 200
      };
      if (filters.status !== 'all') {
        query.status = filters.status === 'verified';
      }
      if (supplierFilterId) query.supplierId = supplierFilterId;
      const data = await listSpends(token, query);
      const spendsData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setSpends(spendsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpends();
  }, [filters, supplierFilterId, token]);

  const stats = useMemo(() => {
    const total = spends.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    return {
      total,
      count: spends.length,
      verifiedCount: spends.filter(s => s.status).length,
      pendingCount: spends.filter(s => !s.status).length
    };
  }, [spends]);

  const groupedSpendsByDate = useMemo(() => {
    const sorted = [...spends].sort((a, b) => {
      const dateDiff = new Date(b.spendDate) - new Date(a.spendDate);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const groups = [];
    let currentGroup = null;

    sorted.forEach(spend => {
      const dateStr = new Date(spend.spendDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });

      if (!currentGroup || currentGroup.date !== dateStr) {
        currentGroup = {
          date: dateStr,
          spends: [],
          total: 0
        };
        groups.push(currentGroup);
      }

      currentGroup.spends.push(spend);
      currentGroup.total += Number(spend.total || 0);
    });

    return groups;
  }, [spends]);

  const groupedSupplierSpendsByDate = useMemo(() => {
    const sorted = [...supplierSpends].sort((a, b) => {
      const dateDiff = new Date(b.spendDate) - new Date(a.spendDate);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const groups = [];
    let currentGroup = null;

    sorted.forEach(spend => {
      const dateStr = new Date(spend.spendDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });

      if (!currentGroup || currentGroup.date !== dateStr) {
        currentGroup = {
          date: dateStr,
          spends: [],
          total: 0
        };
        groups.push(currentGroup);
      }

      currentGroup.spends.push(spend);
      currentGroup.total += Number(spend.total || 0);
    });

    return groups;
  }, [supplierSpends]);

  const groupedColors = useMemo(() => {
    const sorted = [...spends].sort((a, b) => {
      const aDate = new Date(a.spendDate);
      const bDate = new Date(b.spendDate);
      if (bDate - aDate !== 0) return bDate - aDate;
      const aCreatedAt = new Date(a.createdAt);
      const bCreatedAt = new Date(b.createdAt);
      if (bCreatedAt - aCreatedAt !== 0) return bCreatedAt - aCreatedAt;
      const aName = (a.Supplier?.name || '')?.toLowerCase();
      const bName = (b.Supplier?.name || '')?.toLowerCase();
      if (aName < bName) return -1;
      if (aName > bName) return 1;
      return 0;
    });
    const colors = {};
    let groupIndex = 0;
    let prevKey = null;
    const palette = ['hsl(var(--secondary))', 'transparent'];
    for (const s of sorted) {
      const dateStr = new Date(s.spendDate).toLocaleDateString('en-GB');
      const key = `${dateStr}|${s.supplierId || ''}`;
      if (prevKey !== null && key !== prevKey) {
        groupIndex++;
      }
      prevKey = key;
      colors[s.id] = palette[groupIndex % palette.length];
    }
    return colors;
  }, [spends]);

  const toggleSelectAll = () => {
    if (selectedIds.length === spends.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(spends.map(s => s.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    setVerifying(true);
    setError('');
    try {
      await bulkMarkSpendsStatusTrue(token, { ids: selectedIds });
      fetchSpends();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteSpend = async (id) => {
    if (!window.confirm('Delete this spend record?')) return;
    setDeletingId(id);
    setError('');
    try {
      await deleteSpend(token, id);
      fetchSpends();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSupplier = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"? This will not affect existing spend records.`)) return;
    setDeletingId(id);
    setError('');
    try {
      await deleteSupplier(token, id);
      if (selectedSupplierForView && selectedSupplierForView.id === id) {
        setSelectedSupplierForView(null);
      }
      // Refresh suppliers list
      const data = await listSuppliers(token, { q: supplierSearch, limit: 100 });
      setAllSuppliers(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="page" style={{ position: 'relative', minHeight: 'calc(100vh - 8rem)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {isModalOpen && (
          <CreateSpendModal
            token={token}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              fetchSpends();
            }}
          />
        )}
        {editingSpend && (
          <EditSpendModal
            token={token}
            spend={editingSpend}
            onClose={() => setEditingSpend(null)}
            onSuccess={() => {
              setEditingSpend(null);
              fetchSpends();
            }}
          />
        )}
        {error && <p className="form-error" style={{ margin: '0.5rem 0' }}>{error}</p>}
        
        <div className="sticky-header" style={{ paddingTop: '0.75rem', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['spends', 'suppliers'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'suppliers') setSelectedSupplierForView(null);
                }}
                className="card"
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  margin: 0,
                  border: tab === activeTab ? '1px solid hsl(var(--primary))' : '1px solid transparent',
                  background: tab === activeTab ? 'hsl(var(--primary))' : 'white',
                  color: tab === activeTab ? 'white' : 'inherit'
                }}
              >
                <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                  {tab === 'spends' ? 'Spends' : 'Suppliers'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'spends' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <StatCard
                icon={TrendingDown}
                label="Total Spent"
                value={formatCurrency(stats.total)}
              />
              <StatCard
                icon={Activity}
                label="Total Spends"
                value={stats.count}
              />
            </div>
            <div>
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                alignItems: 'center',
                flexWrap: 'wrap',
                paddingBottom: '1rem'
              }}>
            <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'hsl(var(--muted-foreground))',
                  zIndex: 1
                }} 
              />
              <input
                placeholder="Search items..."
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                style={{ 
                  width: '100%',
                  height: '40px',
                  paddingLeft: '2.5rem',
                  paddingRight: '0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid hsl(var(--border))',
                  fontSize: '0.875rem',
                  background: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'hsl(var(--primary))'}
                onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  height: '40px',
                  padding: '0 1rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid hsl(var(--border))',
                  fontSize: '0.875rem',
                  background: 'white',
                  minWidth: '110px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>

              <div ref={supplierDropdownRef} style={{ position: 'relative', minWidth: '160px' }}>
                <div
                  onClick={() => { setShowSupplierDropdown(prev => !prev); if (!showSupplierDropdown) setSupplierSearchTerm(''); }}
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: '0.5rem',
                    height: '40px',
                    padding: '0 1rem', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)', 
                    cursor: 'pointer', 
                    fontSize: '0.875rem',
                    background: 'white', 
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ 
                    color: supplierFilterId ? 'inherit' : 'hsl(var(--muted-foreground))',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {supplierFilterId
                      ? suppliers.find(s => s.id === supplierFilterId)?.name || 'Supplier'
                      : 'All Suppliers'}
                  </span>
                  <ChevronDown size={16} style={{ flexShrink: 0 }} />
                </div>
                {showSupplierDropdown && (
                  <div style={{
                    position: 'absolute', 
                    top: 'calc(100% + 4px)', 
                    right: 0,
                    width: '240px',
                    background: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)', 
                    zIndex: 100,
                    boxShadow: 'var(--shadow-lg)', 
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Search size={14} style={{ flexShrink: 0, color: 'hsl(var(--muted-foreground))' }} />
                      <input
                        type="text"
                        placeholder="Search supplier..."
                        value={supplierSearchTerm}
                        onChange={(e) => setSupplierSearchTerm(e.target.value)}
                        autoFocus
                        style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '0.875rem' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {supplierSearchTerm && (
                        <X size={14} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setSupplierSearchTerm(''); }} />
                      )}
                    </div>
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      <div
                        onClick={() => { setSupplierFilterId(null); setShowSupplierDropdown(false); setSupplierSearchTerm(''); }}
                        style={{
                          padding: '0.625rem 0.75rem', 
                          cursor: 'pointer', 
                          fontSize: '0.875rem',
                          background: !supplierFilterId ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                          fontWeight: !supplierFilterId ? 600 : 400,
                          borderBottom: '1px solid hsl(var(--border) / 0.3)'
                        }}
                        onMouseEnter={(e) => { if (supplierFilterId) e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'; }}
                        onMouseLeave={(e) => { if (supplierFilterId) e.currentTarget.style.background = 'transparent'; }}
                      >
                        All Suppliers
                      </div>
                      {suppliersLoading ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Loading...</div>
                      ) : (
                        suppliers.map(supplier => (
                          <div
                            key={supplier.id}
                            onClick={() => { setSupplierFilterId(supplier.id); setShowSupplierDropdown(false); setSupplierSearchTerm(''); }}
                            style={{
                              padding: '0.625rem 0.75rem', 
                              cursor: 'pointer', 
                              fontSize: '0.875rem',
                              background: supplierFilterId === supplier.id ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                              fontWeight: supplierFilterId === supplier.id ? 600 : 400
                            }}
                            onMouseEnter={(e) => { if (supplierFilterId !== supplier.id) e.currentTarget.style.background = 'hsl(var(--muted) / 0.3)'; }}
                            onMouseLeave={(e) => { if (supplierFilterId !== supplier.id) e.currentTarget.style.background = 'transparent'; }}
                          >
                            {supplier.name}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedIds.length > 0 && filters.status === 'pending' && (
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="primary"
                onClick={handleBulkVerify}
                disabled={verifying}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
              >
                <Check size={16} />
                {verifying ? 'Verifying...' : `Verify ${selectedIds.length} Selected`}
              </button>
            </div>
          )}

            {loading ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="helper-text">Loading spends...</p>
              </div>
            ) : spends.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="helper-text">No spends found</p>
              </div>
            ) : (
              groupedSpendsByDate.map((group) => (
                <div key={group.date} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem', border: '1px solid hsl(var(--border) / 0.5)' }}>
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    background: 'hsl(var(--muted) / 0.3)', 
                    borderBottom: '1px solid hsl(var(--border) / 0.5)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))' }}>
                      {group.date}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'hsl(var(--primary))' }}>
                      {formatCurrency(group.total)}
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="chart-table" style={{ margin: 0, border: 'none' }}>
                      <thead style={{ backgroundColor: 'hsl(var(--primary))', color: 'white' }}>
                        <tr>
                          {filters.status === 'pending' && <th style={{ width: '40px', color: 'white' }}>
                            <input
                              type="checkbox"
                              checked={group.spends.every(s => selectedIds.includes(s.id))}
                              onChange={() => {
                                const groupIds = group.spends.map(s => s.id);
                                if (groupIds.every(id => selectedIds.includes(id))) {
                                  setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
                                } else {
                                  setSelectedIds(prev => [...new Set([...prev, ...groupIds])]);
                                }
                              }}
                            />
                          </th>}
                          <th style={{ color: 'white' }}>Item</th>
                          <th style={{ color: 'white' }}>Supplier</th>
                          <th className="text-right" style={{ color: 'white' }}>Qty</th>
                          <th className="text-right" style={{ color: 'white' }}>Total</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.spends.map((spend) => (
                          <tr key={spend.id} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                            {filters.status === 'pending' && (
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(spend.id)}
                                  onChange={() => toggleSelect(spend.id)}
                                />
                              </td>
                            )}
                            <td>
                              <div style={{ fontWeight: 600 }}>{spend.itemName}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                                {spend.Supplier?.name || '—'}
                              </div>
                            </td>
                            <td className="text-right">{spend.quantity}</td>
                            <td className="text-right">{formatCurrency(spend.total)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() => setEditingSpend(spend)}
                                  title="Edit"
                                  style={{ padding: '0.25rem' }}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() => handleDeleteSpend(spend.id)}
                                  disabled={deletingId === spend.id}
                                  title="Delete"
                                  style={{ padding: '0.25rem', color: 'hsl(var(--destructive))' }}
                                >
                                  {deletingId === spend.id ? <span style={{ fontSize: '0.75rem' }}>...</span> : <Trash2 size={16} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
        </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedSupplierForView ? (
              <div 
                className="card" 
                style={{ 
                  padding: '1.25rem',
                  background: 'hsl(var(--primary) / 0.05)',
                  borderColor: 'hsl(var(--primary) / 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button 
                    className="ghost-btn" 
                    onClick={() => setSelectedSupplierForView(null)} 
                    style={{ padding: '0.25rem', color: 'hsl(var(--primary))' }}
                  >
                    <ChevronDown size={24} style={{ transform: 'rotate(90deg)' }} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: 'hsl(var(--primary))', fontWeight: 700 }}>{selectedSupplierForView.name}</h3>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => handleDeleteSupplier(selectedSupplierForView.id, selectedSupplierForView.name)}
                        disabled={deletingId === selectedSupplierForView.id}
                        style={{ padding: '0.25rem', color: 'hsl(var(--destructive))' }}
                        title="Delete Supplier"
                      >
                        {deletingId === selectedSupplierForView.id ? <span style={{ fontSize: '0.75rem' }}>...</span> : <Trash2 size={18} />}
                      </button>
                    </div>
                    {selectedSupplierForView.phone && (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(var(--primary))', opacity: 0.8 }}>
                        {selectedSupplierForView.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                  <Search 
                    size={18} 
                    style={{ 
                      position: 'absolute', 
                      left: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'hsl(var(--muted-foreground))'
                    }} 
                  />
                  <input
                    placeholder="Search spends..."
                    value={supplierSpendsFilters.q}
                    onChange={(e) => setSupplierSpendsFilters(prev => ({ ...prev, q: e.target.value, offset: 0 }))}
                    style={{ 
                      width: '100%',
                      paddingLeft: '2.5rem',
                      height: '40px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))'
                    }}
                  />
                </div>

                {supplierSpendsLoading ? (
                  <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p className="helper-text">Loading spends...</p>
                  </div>
                ) : supplierSpends.length === 0 ? (
                  <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p className="helper-text">No spends found</p>
                  </div>
                ) : (
                  groupedSupplierSpendsByDate.map((group) => (
                    <div key={group.date} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem', border: '1px solid hsl(var(--border) / 0.5)' }}>
                      <div style={{ 
                        padding: '0.6rem 1rem', 
                        background: 'hsl(var(--muted) / 0.3)', 
                        borderBottom: '1px solid hsl(var(--border) / 0.5)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))' }}>
                          {group.date}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'hsl(var(--primary))' }}>
                          {formatCurrency(group.total)}
                        </span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="chart-table" style={{ margin: 0, border: 'none', width: '100%' }}>
                          <thead style={{ backgroundColor: '#1976D2', color: 'white' }}>
                            <tr>
                              <th style={{ color: 'white' }}>Item</th>
                              <th className="text-right" style={{ color: 'white' }}>Qty</th>
                              <th className="text-right" style={{ color: 'white' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.spends.map((spend) => (
                              <tr key={spend.id} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                                <td>{spend.itemName}</td>
                                <td className="text-right">{spend.quantity}</td>
                                <td className="text-right">{formatCurrency(spend.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', alignItems: 'center', gap: '1rem' }}>
                  <button 
                    className="primary" 
                    disabled={supplierSpendsFilters.offset === 0}
                    onClick={() => setSupplierSpendsFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                    style={{ flex: 1, height: '2.5rem', fontWeight: 700 }}
                  >
                    PREVIOUS
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--primary))' }}>
                    Page {Math.floor(supplierSpendsFilters.offset / supplierSpendsFilters.limit) + 1}
                  </span>
                  <button 
                    className="primary" 
                    disabled={!supplierSpendsHasNext}
                    onClick={() => setSupplierSpendsFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                    style={{ flex: 1, height: '2.5rem', fontWeight: 700 }}
                  >
                    NEXT
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack-form">
                <div style={{ position: 'relative' }}>
                  <Search 
                    size={18} 
                    style={{ 
                      position: 'absolute', 
                      left: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'hsl(var(--muted-foreground))'
                    }} 
                  />
                  <input
                    placeholder="Search suppliers..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    style={{ 
                      width: '100%',
                      paddingLeft: '2.5rem',
                      height: '40px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))'
                    }}
                  />
                </div>

                {allSuppliersLoading ? (
                  <div className="text-center" style={{ padding: '2rem' }}>Loading suppliers...</div>
                ) : allSuppliers.length === 0 ? (
                  <div className="text-center" style={{ padding: '2rem' }}>No suppliers found</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                    {allSuppliers.map(supplier => (
                      <div 
                        key={supplier.id} 
                        className="card" 
                        onClick={() => setSelectedSupplierForView(supplier)}
                        style={{ 
                          padding: '1.25rem', 
                          cursor: 'pointer', 
                          transition: 'transform 0.2s', 
                          background: 'hsl(var(--primary) / 0.05)',
                          borderColor: 'hsl(var(--primary) / 0.1)',
                          margin: 0 
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ margin: 0, color: 'hsl(var(--primary))', fontWeight: 700 }}>{supplier.name}</h4>
                            {supplier.phone && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'hsl(var(--primary))', opacity: 0.8 }}>{supplier.phone}</p>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSupplier(supplier.id, supplier.name);
                              }}
                              disabled={deletingId === supplier.id}
                              style={{ padding: '0.25rem', color: 'hsl(var(--destructive))' }}
                              title="Delete Supplier"
                            >
                              {deletingId === supplier.id ? <span style={{ fontSize: '0.75rem' }}>...</span> : <Trash2 size={18} />}
                            </button>
                            <ChevronDown size={20} style={{ transform: 'rotate(-90deg)', color: 'hsl(var(--primary))', opacity: 0.6 }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className="floating-action-btn"
          onClick={() => setIsModalOpen(true)}
          title="Add Spend"
          style={{ bottom: '5rem' }}
        >
          <Plus size={24} />
        </button>
      </div>
    </section>
  );
}
