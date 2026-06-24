import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Check, ChevronDown, Pencil, Plus, Search, Trash2, TrendingDown, X } from 'lucide-react';
import { listSpends, createSpend, bulkMarkSpendsStatusTrue, listSuppliers, createSupplier, updateSpend, deleteSpend, listItems, createItem } from '../api';
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

function CreateSpendModal({ token, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ 
    itemName: '', 
    price: '', 
    quantity: '',
    spendDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
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
        spendDate: formData.spendDate,
        status: true
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
        <h3 style={{ margin: 0 }}>Create Spend</h3>
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
                          // creation error handled silently
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
            </div>
            {showCreateSupplier && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 1100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
              }}>
                <div className="card" style={{ 
                  width: '100%', 
                  maxWidth: '400px', 
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: 'hsl(var(--background))',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Create Supplier</h4>
                    <button 
                      type="button" 
                      className="ghost-btn" 
                      onClick={() => setShowCreateSupplier(false)}
                      style={{ padding: '0.25rem' }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Input
                      label="Name"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      autoFocus
                    />
                    <Input
                      label="Phone"
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="secondary"
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
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <Input
                label="Date"
                type="date"
                value={formData.spendDate}
                onChange={(e) => setFormData(prev => ({ ...prev, spendDate: e.target.value }))}
                required
              />
            </div>
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
      setSpends(Array.isArray(data) ? data : []);
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

  const groupedColors = useMemo(() => {
    const sorted = [...spends].sort((a, b) => {
      const aDate = new Date(a.createdAt);
      const bDate = new Date(b.createdAt);
      if (aDate - bDate !== 0) return aDate - bDate;
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
      const dateStr = new Date(s.createdAt).toLocaleDateString('en-GB');
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

  return (
    <section className="page" style={{ position: 'relative', minHeight: 'calc(100vh - 8rem)', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
        {error && <p className="form-error">{error}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
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

        <div className="card" style={{ padding: '1.25rem', border: '1px solid hsl(var(--border) / 0.5)' }}>
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            marginBottom: '1.25rem', 
            alignItems: 'center',
            flexWrap: 'wrap'
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
                  background: 'hsl(var(--background))',
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
                  background: 'hsl(var(--background))',
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
                    background: 'hsl(var(--background))', 
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

          <div style={{ overflowX: 'auto' }}>
            <table className="chart-table">
              <thead>
                <tr>
                  {filters.status === 'pending' && (
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={spends.length > 0 && selectedIds.length === spends.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th>Item</th>
                  <th>Supplier</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Date</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={filters.status === 'pending' ? 7 : 6} className="text-center helper-text">Loading...</td>
                  </tr>
                ) : spends.length === 0 ? (
                  <tr>
                    <td colSpan={filters.status === 'pending' ? 7 : 6} className="text-center helper-text">No spends found</td>
                  </tr>
                ) : (
                  spends.map((spend) => (
                    <tr key={spend.id} style={{ backgroundColor: groupedColors[spend.id] }}>
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
                      <td className="text-right">
                        <div style={{ fontSize: '0.875rem' }}>
                          {new Date(spend.spendDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </div>
                      </td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
