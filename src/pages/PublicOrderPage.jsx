import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { createPublicOrder, listItems, listPublicCustomerOrders } from '../api';
import { formatCurrency } from '../utils/orderUtils';
import { getItemLabel, getItemUnitPrice } from '../utils/itemUtils';
import Input from '../components/ui/Input';
import SearchableSelect from '../components/ui/SearchableSelect';

const DEFAULT_NOTES = 'Order from customer portal';

export default function PublicOrderPage() {
  const { customerIdentifier } = useParams();
  const location = useLocation();
  const identifierLabel = customerIdentifier?.trim();
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [itemQuery, setItemQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('new-order');
  const [processingOrders, setProcessingOrders] = useState([]);
  const [processingOrdersLoading, setProcessingOrdersLoading] = useState(false);
  const [processingOrdersError, setProcessingOrdersError] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);

  const toggleOrderExpand = (orderId) => {
    setExpandedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };
  const tenantToken = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('tenantToken') || '').trim();
  }, [location.search]);

  useEffect(() => {
    let isActive = true;
    setItemsError('');

    if (!tenantToken) {
      setItems([]);
      setLoadingItems(false);
      setItemsError('Tenant token missing from the URL.');
      return;
    }

    const trimmed = itemQuery.trim();
    setLoadingItems(true);
    const fetchTimeout = setTimeout(async () => {
      if (!isActive) {
        return;
      }

      try {
        const query = {
          ...(trimmed ? { q: trimmed } : {}),
          ...(identifierLabel ? { customerIdentifier: identifierLabel } : {})
        };
        const response = await listItems(tenantToken, query);
        if (isActive) {
          setItems(Array.isArray(response) ? response : []);
        }
      } catch (err) {
        if (isActive) {
          setItemsError(err.message);
        }
      } finally {
        if (isActive) {
          setLoadingItems(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(fetchTimeout);
    };
  }, [tenantToken, itemQuery]);

  const handleAddLineItem = () => {
    if (!selectedItemId) {
      setSubmitError('Select an item before adding.');
      setSuccessMessage('');
      return;
    }

    const quantity = Number(selectedQuantity);
    if (!quantity || quantity < 1) {
      setSubmitError('Quantity must be at least 1.');
      setSuccessMessage('');
      return;
    }
    const item = items.find((entry) => entry.id === +selectedItemId);
    if (!item) {
      setSubmitError('Selected item is not available.');
      setSuccessMessage('');
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
    setItemQuery('');
    setSubmitError('');
    setSuccessMessage('');
  };

  const handleRemoveLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const orderTotal = useMemo(() => {
    return lineItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  }, [lineItems]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!identifierLabel) {
      setSubmitError('Customer identifier missing from the URL.');
      setSuccessMessage('');
      return;
    }

    if (!tenantToken) {
      setSubmitError('Tenant token missing from the URL.');
      setSuccessMessage('');
      return;
    }

    if (!lineItems.length) {
      setSubmitError('Add at least one item to the order.');
      setSuccessMessage('');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        customerIdentifier: identifierLabel,
        notes: notes.trim() || DEFAULT_NOTES,
        items: lineItems.map(({ itemId, quantity }) => ({ itemId, quantity }))
      };

      const response = await createPublicOrder(payload, tenantToken);
      const orderId = response?.id;
      setSuccessMessage(
        orderId ? `Order placed successfully (ID ${orderId}).` : 'Order placed successfully.'
      );
      setLineItems([]);
      setNotes(DEFAULT_NOTES);
    } catch (err) {
      setSubmitError(err.message);
      setSuccessMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || !lineItems.length || !identifierLabel || !tenantToken;

  useEffect(() => {
    if (activeTab !== 'processing-orders' || !tenantToken || !identifierLabel) return;

    let alive = true;
    const load = async () => {
      setProcessingOrdersLoading(true);
      setProcessingOrdersError('');
      try {
        const data = await listPublicCustomerOrders(tenantToken, identifierLabel);
        if (alive) {
          setProcessingOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (alive) {
          setProcessingOrdersError(err.message);
          setProcessingOrders([]);
        }
      } finally {
        if (alive) {
          setProcessingOrdersLoading(false);
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [activeTab, tenantToken, identifierLabel]);

  const formatOrderDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });
  };

  const statusLabel = (status) => {
    if (!status) return 'NEW';
    return status.toUpperCase();
  };

  return (
    <main className="page" style={{ minHeight: '100vh', paddingTop: '1rem' }}>
      <div className="page-tabs" style={{ marginBottom: '1rem', whiteSpace: 'nowrap', marginTop: '0' }}>
        {['new-order', 'processing-orders'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`page-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'new-order' ? 'New Order' : 'Processing Orders'}
          </button>
        ))}
      </div>

      {activeTab === 'new-order' && (
        <article className="card stack-form" style={{ gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Place an order</h2>
            <p className="helper-text">
              Use the secure customer portal to submit an order.
            </p>
          </div>

          {!tenantToken && (
            <p className="form-error">Tenant token missing from the URL.</p>
          )}
          {!identifierLabel && (
            <p className="form-error">Customer identifier missing from the URL.</p>
          )}
          {itemsError && <p className="form-error">{itemsError}</p>}
          {submitError && <p className="form-error">{submitError}</p>}
          {successMessage && <p className="success-text">{successMessage}</p>}

          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="orders-form-section">
              <div className="orders-form-row">
                <label htmlFor="public-order-item-select">Select item</label>
                <p className="muted" style={{ marginTop: '0', marginBottom: '0.25rem' }}>
                  Focus the dropdown and type to filter the catalog in place.
                </p>
                <SearchableSelect
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                  options={items.map((item) => ({
                    value: item.id,
                    label: `${getItemLabel(item)} — ${formatCurrency(getItemUnitPrice(item))}`
                  }))}
                  placeholder="Select an item"
                  disabled={!tenantToken || loadingItems}
                />
              </div>

              <div className="orders-form-row split-2">
                <Input
                  id="public-order-quantity"
                  label="Quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={selectedQuantity}
                  onChange={(event) => setSelectedQuantity(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="primary"
                onClick={handleAddLineItem}
                disabled={loadingItems || submitting || !selectedItemId}
              >
                Add item
              </button>
            </div>

            {lineItems.length > 0 && (
              <div className="orders-items-table-wrap">
                <table className="orders-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Unit price</th>
                      <th>Line total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((line, index) => (
                      <tr key={`${line.itemId}-${index}`}>
                        <td>
                          <strong>{line.name}</strong>
                          <p className="helper-text">ID {line.itemId}</p>
                        </td>
                        <td>{line.quantity}</td>
                        <td>{formatCurrency(line.unitPrice)}</td>
                        <td>{formatCurrency(line.unitPrice * line.quantity)}</td>
                        <td>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => handleRemoveLineItem(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Input
              id="public-order-notes"
              label="Order notes"
              type="textarea"
              rows="3"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />

            <div
              className="row-actions"
              style={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <p className="small-label">Order total</p>
                <strong>{formatCurrency(orderTotal)}</strong>
              </div>
              <button type="submit" className="primary" disabled={isSubmitDisabled}>
                {submitting ? 'Placing order…' : 'Place order'}
              </button>
            </div>
          </form>
        </article>
      )}

      {activeTab === 'processing-orders' && (
        <article className="card stack-form" style={{ gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Processing Orders</h2>
            <p className="helper-text">
              Orders that are currently being processed.
            </p>
          </div>

          {!tenantToken && (
            <p className="form-error">Tenant token missing from the URL.</p>
          )}
          {!identifierLabel && (
            <p className="form-error">Customer identifier missing from the URL.</p>
          )}
          {processingOrdersError && <p className="form-error">{processingOrdersError}</p>}

          {processingOrdersLoading && !processingOrders.length ? (
            <p className="helper-text">Loading orders…</p>
          ) : processingOrders.length === 0 ? (
            <div style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              opacity: 0.7
            }}>
              <p className="helper-text">No processing orders found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {processingOrders.map((order) => {
                const isExpanded = expandedOrderIds.includes(order.id);
                return (
                  <div
                    key={order.id}
                    className="card"
                    style={{ padding: '1rem', margin: 0, cursor: 'pointer' }}
                    onClick={() => toggleOrderExpand(order.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'hsl(var(--primary))',
                          background: 'hsl(var(--primary) / 0.08)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          Order #{String(order.id).slice(-6).toUpperCase()}
                        </span>
                        <p className="helper-text" style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                          {formatOrderDate(order.orderDate)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(order.totalAmount)}</strong>
                      </div>
                    </div>

                    <div style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: order.status === 'NEW'
                        ? 'hsl(var(--primary) / 0.1)'
                        : 'hsl(var(--muted))',
                      color: order.status === 'NEW'
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--muted-foreground))',
                    }}>
                      {statusLabel(order.status)}
                    </div>

                    {isExpanded && (
                      <>
                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <p className="small-label" style={{ marginBottom: '0.25rem' }}>Items</p>
                            {order.items.map((item) => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9rem' }}>
                                <span>{item.item?.name || `Item #${item.itemId}`}</span>
                                <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                                  {item.quantity} × {formatCurrency(item.unitPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {order.notes && (
                          <p className="helper-text" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                            {order.notes}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </article>
      )}
    </main>
  );
}
