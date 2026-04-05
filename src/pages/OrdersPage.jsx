import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw, ShoppingBag, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import {
  createOrder,
  listCustomers,
  listItems,
  listOrders
} from '../api';
import { formatCurrency, getDisplayCustomerName, getStatusLabel } from '../utils/orderUtils';
import { getItemLabel, getItemUnitPrice } from '../utils/itemUtils';

const getCustomerLabel = (customer) =>
  customer?.name ||
  customer?.displayName ||
  customer?.companyName ||
  customer?.firstName ||
  customer?.lastName ||
  customer?.email ||
  customer?.id ||
  'Customer';

const formatOrderDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
};


export default function OrdersPage({ token }) {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('NEW');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createOrderError, setCreateOrderError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([{ itemId: '', quantity: 1 }]);
  const navigate = useNavigate();

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listOrders(token);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await listCustomers(token);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  const loadItems = async () => {
    try {
      const data = await listItems(token);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load items', err);
    }
  };

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadItems();
  }, [token]);

  const resetCreateOrderForm = () => {
    setCreateOrderError('');
    setCustomerId('');
    setNotes('');
    setLineItems([{ itemId: '', quantity: 1 }]);
  };

  const openCreateModal = () => {
    resetCreateOrderForm();
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateOrderForm();
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { itemId: '', quantity: 1 }]);
  };

  const handleRemoveLineItem = (index) => {
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleLineItemChange = (index, field, value) => {
    const next = [...lineItems];
    next[index] = { ...next[index], [field]: value };
    setLineItems(next);
  };

  const getLineTotal = (line) => {
    if (!line.itemId) return 0;
    const item = items.find((it) => String(it.id) === String(line.itemId));
    if (!item) return 0;
    return getItemUnitPrice(item) * (Number(line.quantity) || 0);
  };

  const orderTotal = useMemo(() => {
    return lineItems.reduce((sum, line) => sum + getLineTotal(line), 0);
  }, [lineItems, items]);

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId));
  const customerLabel = getCustomerLabel(selectedCustomer);

  const handleCreateOrderSubmit = async (event) => {
    event.preventDefault();
    setCreatingOrder(true);
    setCreateOrderError('');

    if (!customerId) {
      setCreateOrderError('Select a customer to continue.');
      setCreatingOrder(false);
      return;
    }

    const validItems = lineItems.filter(line => line.itemId && Number(line.quantity) > 0);

    if (!validItems.length) {
      setCreateOrderError('Add at least one valid item to the order.');
      setCreatingOrder(false);
      return;
    }

    const payload = {
      customerId,
      customerName: customerLabel,
      totalAmount: orderTotal,
      items: validItems.map(({ itemId, quantity }) => {
        const item = items.find(it => String(it.id) === String(itemId));
        return {
          itemId,
          quantity: Number(quantity),
          unitPrice: getItemUnitPrice(item)
        };
      }),
      notes: notes.trim() || undefined
    };

    try {
      await createOrder(token, payload);
      await loadOrders();
      closeCreateModal();
    } catch (err) {
      setCreateOrderError(err.message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = order.status?.toUpperCase();
      if (activeTab === 'NEW') return status === 'NEW' || !status;
      return status === activeTab;
    });
  }, [orders, activeTab]);

  return (
    <section className="page">
      <div className="page-tabs" style={{ marginBottom: '1rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {['NEW', 'DELIVERED', 'OVERDUE', 'PAID'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`page-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {orders.length > 0 && (
        <div className="orders-list-panel">
          {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
          {loading && !orders.length && <p className="helper-text">Loading orders…</p>}

          <div className="orders-list">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const customerName = getDisplayCustomerName(order);
                const orderIdLabel = String(order.id ?? '');
                const clickableLabel = `${customerName} (${orderIdLabel})`;
                const orderDateLabel = formatOrderDate(order.orderDate ?? order.createdAt);
                const totalItems = Array.isArray(order.items) ? order.items.length : 0;
                const statusClass = order.status?.toLowerCase() ?? 'unknown';
                const shortOrderId = orderIdLabel.slice(0, 8);
                return (
                  <button
                    key={order.id}
                    type="button"
                    className={`order-card order-card--${statusClass}`}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    aria-label={`View ${clickableLabel}`}
                    style={{ marginBottom: '0.75rem' }}
                  >
                    <div className="order-card-layout">
                      <div className="order-card-left">
                        <p className="order-customer--card">{customerName}</p>
                        <p className="order-card-date">
                          {orderDateLabel}
                        </p>
                      </div>
                      <div className="order-card-right">
                        <p className="order-card-amount">{formatCurrency(order.totalAmount)}</p>
                        <p className="small-label" style={{ fontSize: '0.65rem', opacity: 0.8 }}>{totalItems} items</p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div style={{ 
                padding: '4rem 1rem', 
                textAlign: 'center', 
                background: 'hsl(var(--card))', 
                borderRadius: 'var(--radius)', 
                border: '1px dashed hsl(var(--border))',
                opacity: 0.8 
              }}>
                <ShoppingBag size={32} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>No {activeTab.toLowerCase()} orders</h3>
                <p className="muted" style={{ marginTop: '0.25rem' }}>Try switching tabs or creating a new order.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !orders.length && (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="When you start creating orders, they will appear here. Manage your sales and fulfillment in one place."
          actionLabel="Create First Order"
          onAction={openCreateModal}
        />
      )}

      {orders.length > 0 && (
        <button
          type="button"
          className="floating-action-btn"
          onClick={openCreateModal}
          aria-label="Create a new order"
        >
          <Plus size={20} />
        </button>
      )}

      {/* CREATE ORDER MODAL  */}
      {isCreateModalOpen && (
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
            <h2 style={{ margin: 0 }}>Add Order Items</h2>
            <button
              type="button"
              className="ghost-btn"
              onClick={closeCreateModal}
              aria-label="Close"
              disabled={creatingOrder}
            >
              <X size={24} />
            </button>
          </header>

          <form 
            onSubmit={handleCreateOrderSubmit}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              overflow: 'hidden'
            }}
          >
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              paddingRight: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              paddingBottom: '1rem'
            }}>
              {createOrderError && <p className="form-error">{createOrderError}</p>}

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>Select Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={creatingOrder}
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {getCustomerLabel(customer)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {lineItems.map((line, index) => (
                  <div key={index} className="card" style={{ padding: '1rem', margin: 0, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Item {index + 1}</span>
                      {lineItems.length > 1 && (
                        <button 
                          type="button" 
                          className="ghost-btn" 
                          onClick={() => handleRemoveLineItem(index)}
                          style={{ padding: '4px', color: 'hsl(var(--muted-foreground))' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Select Item</label>
                      <select
                        value={line.itemId}
                        onChange={(e) => handleLineItemChange(index, 'itemId', e.target.value)}
                        disabled={creatingOrder}
                      >
                        <option value="">Search item...</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {getItemLabel(item)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="split-2">
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                          disabled={creatingOrder}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Line Total</label>
                        <div style={{ 
                          padding: '0.6rem 0.75rem', 
                          background: 'hsl(var(--muted) / 0.3)', 
                          borderRadius: 'var(--radius)',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          border: '1px solid hsl(var(--border))'
                        }}>
                          ₹{getLineTotal(line)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddLineItem}
                className="ghost-btn"
                style={{ 
                  width: '100%', 
                  border: '1px solid hsl(var(--border))', 
                  background: 'hsl(var(--card))',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 600
                }}
              >
                <Plus size={18} /> Add Another Item
              </button>
            </div>

            <div style={{ 
              marginTop: 'auto',
              borderTop: '2px solid hsl(var(--border))',
              background: 'hsl(var(--background))',
              paddingTop: '1rem',
              zIndex: 10
            }}>
              <div style={{ 
                padding: '0 0 1rem', 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>Total Amount</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>₹{orderTotal}</span>
              </div>

              <footer className="split-2" style={{ gap: '1rem' }}>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creatingOrder}
                  style={{ width: '100%', height: '3rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="primary" 
                  disabled={creatingOrder} 
                  style={{ width: '100%', height: '3rem', fontSize: '1rem' }}
                >
                  {creatingOrder ? 'Saving...' : 'Save Order'}
                </button>
              </footer>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
