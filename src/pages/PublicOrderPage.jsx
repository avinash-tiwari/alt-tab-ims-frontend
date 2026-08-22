import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { createPublicOrder, listItems, listPublicCustomerOrders } from '../api';
import { formatCurrency } from '../utils/orderUtils';
import { getItemLabel, getItemUnitPrice } from '../utils/itemUtils';
import Input from '../components/ui/Input';
import SearchableSelect from '../components/ui/SearchableSelect';

const DEFAULT_NOTES = 'Order from customer portal';

export default function PublicOrderPage() {
  const { customerIdentifier } = useParams();
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'new-order';
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
  const tenantToken = (searchParams.get('tenantToken') || '').trim();

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

  const orderSummary = useMemo(() => {
    return lineItems.reduce((acc, line) => {
      acc.totalItems += 1;
      acc.totalQuantity += line.quantity;
      acc.totalAmount += line.unitPrice * line.quantity;
      return acc;
    }, { totalItems: 0, totalQuantity: 0, totalAmount: 0 });
  }, [lineItems]);

  const orderTotal = orderSummary.totalAmount;

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();

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
    <main className="page" style={{ 
      height: '100dvh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: 0, 
      overflow: 'hidden',
      background: 'hsl(var(--background))'
    }}>
      <div 
        className="page-tabs" 
        style={{ 
          zIndex: 100,
          background: 'hsl(var(--background))',
          padding: '1rem',
          whiteSpace: 'nowrap', 
          display: 'flex', 
          gap: '0.5rem',
          borderBottom: '1px solid hsl(var(--border) / 0.5)',
          flexShrink: 0
        }}
      >
        {['new-order', 'processing-orders'].map((tab) => (
          <button
            key={tab}
            type="button"
            className="card"
            style={{
              flex: 1,
              padding: '0.75rem 0.25rem',
              cursor: 'pointer',
              margin: 0,
              border: tab === activeTab ? '1px solid hsl(var(--primary))' : '1px solid transparent',
              background: tab === activeTab ? 'hsl(var(--primary))' : 'white',
              color: tab === activeTab ? 'white' : 'inherit',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveTab(tab)}
          >
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
              {tab === 'new-order' ? 'New Order' : 'Past Orders'}
            </span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 10rem 1rem' }}>
        {activeTab === 'new-order' && (
          <article className="card stack-form" style={{ 
            gap: '1rem', 
            background: 'hsl(var(--primary) / 0.05)',
            borderColor: 'hsl(var(--primary) / 0.1)',
            margin: '0.5rem 0'
          }}>
            <div>
              <h2 style={{ marginBottom: '0.25rem', color: 'hsl(var(--primary))', fontWeight: 800, fontSize: '1.25rem' }}>Place Order</h2>
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

            <form className="stack-form">
              <div className="orders-form-section">
                <div className="orders-form-row">
                  <label style={{ fontWeight: 800, color: 'hsl(var(--primary))' }}>Select item</label>
                  <SearchableSelect
                    value={selectedItemId}
                    onChange={(event) => setSelectedItemId(event.target.value)}
                    options={items.map((item) => ({
                      value: item.id,
                      label: `${getItemLabel(item)} — ${formatCurrency(getItemUnitPrice(item))}`
                    }))}
                    placeholder="Search item..."
                    disabled={!tenantToken || loadingItems}
                  />
                </div>

                <div className="orders-form-row">
                  <Input
                    id="public-order-quantity"
                    label="Quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={selectedQuantity}
                    onChange={(event) => setSelectedQuantity(event.target.value)}
                    labelStyle={{ fontWeight: 800, color: 'hsl(var(--primary))' }}
                  />
                </div>

                <button
                  type="button"
                  className="primary"
                  onClick={handleAddLineItem}
                  disabled={loadingItems || submitting || !selectedItemId}
                  style={{ height: '38px', fontWeight: 800 }}
                >
                  Add Item
                </button>
              </div>

              {lineItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {lineItems.map((line, index) => (
                    <div key={`${line.itemId}-${index}`} className="card" style={{ 
                      padding: '0.75rem 1rem', 
                      margin: 0, 
                      position: 'relative', 
                      background: 'white',
                      border: '1px solid hsl(var(--border) / 0.5)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block' }}>{line.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                            {line.quantity} × {formatCurrency(line.unitPrice)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{formatCurrency(line.unitPrice * line.quantity)}</strong>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => handleRemoveLineItem(index)}
                            style={{ color: 'hsl(var(--destructive))', fontWeight: 700, fontSize: '0.75rem', padding: 0 }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </article>
        )}

        {activeTab === 'processing-orders' && (
          <article className="card stack-form" style={{ 
            gap: '1rem', 
            background: 'hsl(var(--primary) / 0.05)',
            borderColor: 'hsl(var(--primary) / 0.1)',
            margin: '0.5rem 0'
          }}>
            <div>
              <h2 style={{ marginBottom: '0.25rem', color: 'hsl(var(--primary))', fontWeight: 800, fontSize: '1.25rem' }}>Past Orders</h2>
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
                <p className="helper-text">No past orders found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {processingOrders.map((order) => {
                  const isExpanded = expandedOrderIds.includes(order.id);
                  const orderTotalItems = Array.isArray(order.items) ? order.items.length : 0;
                  const orderTotalQty = Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
                  
                  return (
                    <div
                      key={order.id}
                      className="card"
                      style={{ 
                        padding: '1rem', 
                        margin: 0, 
                        cursor: 'pointer',
                        background: 'white',
                        border: '1px solid hsl(var(--border) / 0.5)'
                      }}
                      onClick={() => toggleOrderExpand(order.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              color: 'hsl(var(--primary))',
                              background: 'hsl(var(--primary) / 0.08)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px'
                            }}>
                              #{String(order.id).slice(-6).toUpperCase()}
                            </span>
                            <div style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              background: order.status === 'NEW'
                                ? 'hsl(var(--primary) / 0.1)'
                                : 'hsl(var(--muted))',
                              color: order.status === 'NEW'
                                ? 'hsl(var(--primary))'
                                : 'hsl(var(--muted-foreground))',
                            }}>
                              {statusLabel(order.status)}
                            </div>
                          </div>
                          <p className="helper-text" style={{ marginTop: '0.4rem', marginBottom: 0, fontSize: '0.8rem', fontWeight: 600 }}>
                            {(() => {
                              let displayDate = order.orderDate || order.createdAt;
                              if (order.status === 'DELIVERED' && order.deliveredAt) {
                                displayDate = order.deliveredAt;
                              } else if (order.status === 'PAID' && order.paidAt) {
                                displayDate = order.paidAt;
                              }
                              return formatOrderDate(displayDate);
                            })()}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ fontSize: '1rem', color: 'hsl(var(--primary))' }}>{formatCurrency(order.totalAmount)}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem', fontWeight: 600 }}>
                            {orderTotalItems} Items · {orderTotalQty} Qty
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ 
                          marginTop: '1rem', 
                          paddingTop: '0.75rem', 
                          borderTop: '1px dashed hsl(var(--border))'
                        }}>
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {order.items.map((item) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                  <span style={{ fontWeight: 600 }}>{item.item?.name || `Item #${item.itemId}`}</span>
                                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    {item.quantity} × {formatCurrency(item.unitPrice)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {order.notes && (
                            <div style={{ 
                              marginTop: '0.75rem', 
                              padding: '0.5rem', 
                              background: 'hsl(var(--muted) / 0.3)', 
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontStyle: 'italic',
                              color: 'hsl(var(--muted-foreground))'
                            }}>
                              {order.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        )}
      </div>

      {activeTab === 'new-order' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'hsl(var(--background))',
          borderTop: '1px solid hsl(var(--border))',
          padding: '0.75rem 1rem',
          zIndex: 100,
          flexShrink: 0
        }}>
          <div 
            className="customer-stats-bar"
            style={{ 
              background: 'hsl(var(--primary) / 0.08)',
              borderColor: 'hsl(var(--primary) / 0.1)',
              borderWidth: '1px',
              borderStyle: 'solid',
              marginBottom: '0.75rem',
              display: 'flex',
              borderRadius: 'var(--radius)',
              overflow: 'hidden'
            }}
          >
            <div className="stat-pill" style={{ flex: 1, padding: '0.5rem', textAlign: 'center', borderRight: '1px solid hsl(var(--primary) / 0.1)' }}>
              <span className="stat-label" style={{ color: 'hsl(var(--primary))', fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Items</span>
              <span className="stat-value" style={{ color: 'hsl(var(--primary))', fontSize: '0.9rem', fontWeight: 800 }}>{orderSummary.totalItems}</span>
            </div>
            <div className="stat-pill" style={{ flex: 1, padding: '0.5rem', textAlign: 'center', borderRight: '1px solid hsl(var(--primary) / 0.1)' }}>
              <span className="stat-label" style={{ color: 'hsl(var(--primary))', fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Qty</span>
              <span className="stat-value" style={{ color: 'hsl(var(--primary))', fontSize: '0.9rem', fontWeight: 800 }}>{orderSummary.totalQuantity}</span>
            </div>
            <div className="stat-pill" style={{ flex: 1, padding: '0.5rem', textAlign: 'center' }}>
              <span className="stat-label" style={{ color: 'hsl(var(--primary))', fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Amount</span>
              <span className="stat-value" style={{ color: 'hsl(var(--primary))', fontSize: '1rem', fontWeight: 900 }}>{formatCurrency(orderSummary.totalAmount)}</span>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            type="button"
            className="primary" 
            disabled={isSubmitDisabled} 
            style={{ width: '100%', height: '44px', fontWeight: 800, fontSize: '1rem' }}
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      )}
    </main>
  );
}
