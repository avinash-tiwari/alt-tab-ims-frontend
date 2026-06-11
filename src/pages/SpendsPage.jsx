import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Check, ChevronDown, Plus, Search, TrendingDown, X } from 'lucide-react';
import { listSpends, createSpend, bulkMarkSpendsStatusTrue, listSuppliers, createSupplier } from '../api';
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
  const [formData, setFormData] = useState({ itemName: '', price: '', quantity: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createSpend(token, {
        itemName: formData.itemName,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        status: true
      });
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
            <Input
              label="Item Name"
              value={formData.itemName}
              onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
              required
            />
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

export default function SpendsPage({ token }) {
  const [spends, setSpends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', status: 'verified' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierFilterId, setSupplierFilterId] = useState(null);
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

  return (
    <section className="page" style={{ position: 'relative', minHeight: 'calc(100vh - 8rem)' }}>
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

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder="Search items..."
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              style={{
                width: 'auto',
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                border: '1px solid hsl(var(--border))',
                fontSize: '0.875rem'
              }}
            >
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
            <div ref={supplierDropdownRef} style={{ position: 'relative', width: 'auto', minWidth: '140px' }}>
              <div
                onClick={() => { setShowSupplierDropdown(prev => !prev); if (!showSupplierDropdown) setSupplierSearchTerm(''); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem',
                  padding: '0.5rem', border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.8rem',
                  background: 'hsl(var(--background))', whiteSpace: 'nowrap'
                }}
              >
                <span style={{ color: supplierFilterId ? 'inherit' : 'hsl(var(--muted-foreground))' }}>
                  {supplierFilterId
                    ? suppliers.find(s => s.id === supplierFilterId)?.name || 'Supplier'
                    : 'Supplier'}
                </span>
                <ChevronDown size={14} />
              </div>
              {showSupplierDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)', zIndex: 70, marginTop: '0.25rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: '200px'
                }}>
                  <div style={{ padding: '0.4rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <Search size={14} style={{ flexShrink: 0, color: 'hsl(var(--muted-foreground))' }} />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={supplierSearchTerm}
                      onChange={(e) => setSupplierSearchTerm(e.target.value)}
                      autoFocus
                      style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '0.8rem' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {supplierSearchTerm && (
                      <X size={14} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setSupplierSearchTerm(''); }} />
                    )}
                  </div>
                  <div style={{ maxHeight: '180px', overflow: 'auto' }}>
                    <div
                      onClick={() => { setSupplierFilterId(null); setShowSupplierDropdown(false); setSupplierSearchTerm(''); }}
                      style={{
                        padding: '0.5rem 0.65rem', cursor: 'pointer', fontSize: '0.8rem',
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
                      <div style={{ padding: '0.5rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>Loading...</div>
                    ) : (
                      suppliers.map(supplier => (
                        <div
                          key={supplier.id}
                          onClick={() => { setSupplierFilterId(supplier.id); setShowSupplierDropdown(false); setSupplierSearchTerm(''); }}
                          style={{
                            padding: '0.5rem 0.65rem', cursor: 'pointer', fontSize: '0.8rem',
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={filters.status === 'pending' ? 6 : 5} className="text-center helper-text">Loading...</td>
                  </tr>
                ) : spends.length === 0 ? (
                  <tr>
                    <td colSpan={filters.status === 'pending' ? 6 : 5} className="text-center helper-text">No spends found</td>
                  </tr>
                ) : (
                  spends.map((spend) => (
                    <tr key={spend.id}>
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
                          {new Date(spend.createdAt).toLocaleDateString('en-GB', {
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
