import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

const formatOrderDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};


export default function OrdersPage({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createOrderError, setCreateOrderError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [itemSearch, setItemSearch] = useState('');
  const navigate = useNavigate();
  const searchTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

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
    setLineItems([]);
    setSelectedItemId('');
    setSelectedQuantity(1);
    setItemSearch('');
  };

  const openCreateModal = () => {
    resetCreateOrderForm();
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateOrderForm();
  };

  const filteredItems = useMemo(() => {
    const term = String(itemSearch ?? '').trim().toLowerCase();
    if (!term) {
      return items;
    }
    return items.filter((item) => {
      const label = String(getItemLabel(item) ?? '').toLowerCase();
      const identifier = String(item?.id ?? '').toLowerCase();
      return label.includes(term) || identifier.includes(term);
    });
  }, [items, itemSearch]);

  const handleSelectKeyDown = (event) => {
    const { key } = event;
    const isCharacterKey = key.length === 1 && !event.ctrlKey && !event.metaKey;
    if (key === 'Backspace') {
      setItemSearch((prev) => prev.slice(0, -1));
    } else if (key === 'Escape') {
      setItemSearch('');
    } else if (isCharacterKey) {
      setItemSearch((prev) => prev + key);
    } else {
      return;
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setItemSearch('');
    }, 1500);

    event.preventDefault();
  };

  const handleAddLineItem = () => {
    if (!selectedItemId) {
      setCreateOrderError('Select an item before adding.');
      return;
    }

    const quantity = Number(selectedQuantity);
    if (!quantity || quantity < 1) {
      setCreateOrderError('Quantity must be at least 1.');
      return;
    }

    const item = items.find((entry) => entry.id === selectedItemId);
    if (!item) {
      setCreateOrderError('Selected item is not available.');
      return;
    }

    const unitPrice = getItemUnitPrice(item);
    setLineItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        name: getItemLabel(item),
        unitPrice,
        quantity
      }
    ]);
    setSelectedItemId('');
    setSelectedQuantity(1);
    setItemSearch('');
    setCreateOrderError('');
  };

  const handleRemoveLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const orderTotal = useMemo(() => {
    return lineItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  }, [lineItems]);

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
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

    if (!lineItems.length) {
      setCreateOrderError('Add at least one item to the order.');
      setCreatingOrder(false);
      return;
    }

    const payload = {
      customerId,
      customerName: customerLabel,
      totalAmount: orderTotal,
      items: lineItems.map(({ itemId, quantity, unitPrice }) => ({
        itemId,
        quantity,
        unitPrice
      })),
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

  return (
    <section className="page">
      <div className="sticky-header">
        <h2>Orders</h2>
      </div>

      <article className="card orders-list-panel">
        <div className="orders-list-header">
          <span className="small-label">Recent orders</span>
          <button
            type="button"
            className="ghost-btn icon-button"
            onClick={loadOrders}
            aria-label="Refresh orders"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {loading && <p className="helper-text">Loading orders…</p>}
        {!loading && !orders.length && (
          <p className="helper-text">No orders available yet.</p>
        )}

        <div className="orders-list">
          {orders.map((order) => {
            const customerName = getDisplayCustomerName(order);
            const orderIdLabel = String(order.id ?? '');
            const clickableLabel = `${customerName} (${orderIdLabel})`;
            const orderDateLabel = formatOrderDateTime(order.orderDate ?? order.createdAt);
            const totalItems = Array.isArray(order.items) ? order.items.length : 0;
            const statusClass = order.status?.toLowerCase() ?? 'unknown';
            const shortOrderId = orderIdLabel.slice(0, 8);
            return (
              <button
                key={order.id}
                type="button"
                className="order-card"
                onClick={() => navigate(`/orders/${order.id}`)}
                aria-label={`View ${clickableLabel}`}
              >
                <div className="order-card-layout">
                  <div className="order-card-left">
                    <p className="order-customer order-customer--card">{customerName}</p>
                    <p className="order-card-date">{orderDateLabel}</p>
                    <p className="order-card-id">Order #{shortOrderId}</p>
                    <p className="small-label order-card-total-label">Total</p>
                  </div>
                  <div className={`order-card-right order-card-right--${statusClass}`}>
                    <div className={`order-card-status order-card-status--${statusClass}`}>
                      <span
                        className={`order-card-status-indicator order-card-status-indicator--${statusClass}`}
                      />
                      <span className={`status-pill status-pill--${statusClass}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="order-card-meta">
                      <p className="small-label">Items</p>
                      <strong>{totalItems}</strong>
                    </div>
                    <div className="order-card-meta">
                      <p className="small-label">Value</p>
                      <strong>{formatCurrency(order.totalAmount)}</strong>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </article>

      <button
        type="button"
        className="floating-action-btn"
        onClick={openCreateModal}
        aria-label="Create a new order"
      >
        <Plus size={20} />
      </button>

      {isCreateModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <form className="create-order-modal" onSubmit={handleCreateOrderSubmit}>
            <header className="modal-header">
              <div>
                <h2>Create order</h2>
                <p className="muted" style={{ marginTop: '0.25rem' }}>
                  Pick a customer and add items below.
                </p>
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={closeCreateModal}
                aria-label="Close create order form"
                disabled={creatingOrder}
              >
                X
              </button>
            </header>

            {createOrderError && <p className="form-error">{createOrderError}</p>}

            <div className="stack-form">
              <div className="form-group">
                <label htmlFor="order-customer">Customer</label>
                <select
                  id="order-customer"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
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

              <div className="stack-form">
                <div className="form-group">
                  <label htmlFor="order-item-select">Select item</label>
                  <p className="muted" style={{ marginTop: '0', marginBottom: '0.25rem' }}>
                    Focus the dropdown and type to filter the catalog in place.
                  </p>
                  <select
                    id="order-item-select"
                    value={selectedItemId}
                    onChange={(event) => setSelectedItemId(event.target.value)}
                    onKeyDown={handleSelectKeyDown}
                    disabled={creatingOrder}
                  >
                    <option value="">Select an item</option>
                    {filteredItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getItemLabel(item)} — {formatCurrency(getItemUnitPrice(item))}
                      </option>
                    ))}
                  </select>
                  {itemSearch && (
                    <p className="helper-text" style={{ marginTop: '0.25rem' }}>
                      Filtering by &ldquo;{itemSearch}&rdquo;
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="order-item-quantity">Quantity</label>
                  <input
                    id="order-item-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={selectedQuantity}
                    onChange={(event) => setSelectedQuantity(event.target.value)}
                    disabled={creatingOrder}
                  />
                </div>

                <button
                  type="button"
                  className="primary"
                  onClick={handleAddLineItem}
                  disabled={creatingOrder}
                >
                  Add item
                </button>
              </div>

              {lineItems.length ? (
                <>
                  <table className="orders-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit price</th>
                        <th>Line total</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((line, index) => (
                        <tr key={`${line.itemId}-${index}`}>
                          <td>{line.name}</td>
                          <td>{line.quantity}</td>
                          <td>{formatCurrency(line.unitPrice)}</td>
                          <td>{formatCurrency(line.unitPrice * line.quantity)}</td>
                          <td>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => handleRemoveLineItem(index)}
                              disabled={creatingOrder}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem'
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <strong>Total: {formatCurrency(orderTotal)}</strong>
                  </div>
                </>
              ) : (
                <p className="helper-text">Add at least one item to calculate the total.</p>
              )}

              <div className="form-group">
                <label htmlFor="order-notes">Notes</label>
                <textarea
                  id="order-notes"
                  name="notes"
                  rows="3"
                  placeholder="Optional notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={creatingOrder}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={closeCreateModal}
                disabled={creatingOrder}
              >
                Cancel
              </button>
              <button type="submit" className="primary" disabled={creatingOrder}>
                {creatingOrder ? 'Creating…' : 'Create order'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
