import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw, ShoppingBag, X, Trash2, CheckCircle2, Circle, Store, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import {
  createOrder,
  listCustomers,
  listItems,
  listOrders,
  getCustomerPrices,
  updateOrderStatus
} from '../api';
import { formatCurrency, getDisplayCustomerName, getStatusLabel } from '../utils/orderUtils';
import { getItemLabel, getItemUnitPrice } from '../utils/itemUtils';
import Input from '../components/ui/Input';
import SearchableSelect from '../components/ui/SearchableSelect';

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
  const [customerPrices, setCustomerPrices] = useState([]);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([{ itemId: '', quantity: 1 }]);
  const [orderDate, setOrderDate] = useState('');
  const [isBulkActionActive, setIsBulkActionActive] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [moveToTab, setMoveToTab] = useState('');
  const [snackbar, setSnackbar] = useState({ show: false, message: '' });
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [showPaymentSplitModal, setShowPaymentSplitModal] = useState(false);
  const [paymentOnline, setPaymentOnline] = useState('');
  const [paymentCash, setPaymentCash] = useState('');
  const [paymentSplitError, setPaymentSplitError] = useState('');
  const [paymentSplitSubmitting, setPaymentSplitSubmitting] = useState(false);
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

  useEffect(() => {
    const fetchPrices = async () => {
      if (token && customerId) {
        try {
          const prices = await getCustomerPrices(token, customerId);
          setCustomerPrices(Array.isArray(prices) ? prices : []);
        } catch (err) {
          console.error('Failed to load customer prices', err);
        }
      } else {
        setCustomerPrices([]);
      }
    };
    fetchPrices();
  }, [token, customerId]);

  const resetCreateOrderForm = () => {
    setCreateOrderError('');
    setCustomerId('');
    setCustomerPrices([]);
    setNotes('');
    setLineItems([{ itemId: '', quantity: 1 }]);
    setOrderDate('');
  };

  const openCreateModal = () => {
    resetCreateOrderForm();
    // default order date to today (YYYY-MM-DD) when opening the create modal
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    setOrderDate(todayStr);
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

  const getEffectivePrice = (itemId) => {
    const custom = customerPrices.find(p => String(p.itemId) === String(itemId));
    if (custom) return custom.customPrice;

    const item = items.find(it => String(it.id) === String(itemId));
    return item ? getItemUnitPrice(item) : 0;
  };

  const getLineTotal = (line) => {
    if (!line.itemId) return 0;
    return getEffectivePrice(line.itemId) * (Number(line.quantity) || 0);
  };

  const orderTotal = useMemo(() => {
    return lineItems.reduce((sum, line) => sum + getLineTotal(line), 0);
  }, [lineItems, items, customerPrices]);

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
      // Keep date at local midnight without converting to UTC (avoid 18:30:00Z shifts)
      orderDate: orderDate ? `${orderDate}T00:00:00` : undefined,
      items: validItems.map(({ itemId, quantity }) => {
        return {
          itemId,
          quantity: Number(quantity),
          unitPrice: getEffectivePrice(itemId)
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

  const handleToggleBulkAction = () => {
    setIsBulkActionActive(!isBulkActionActive);
    setSelectedOrderIds([]);
    setMoveToTab('');
  };

  const handleToggleOrderSelection = (orderId) => {
    const orderToSelect = orders.find(o => o.id === orderId);
    if (!orderToSelect) return;
    const customerToSelect = getDisplayCustomerName(orderToSelect);

    if (currentSelectedCustomer && currentSelectedCustomer !== customerToSelect && !selectedOrderIds.includes(orderId)) {
      showSnackbar(`Unselect orders from ${currentSelectedCustomer} first`);
      return;
    }

    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const showSnackbar = (message) => {
    setSnackbar({ show: true, message });
    setTimeout(() => setSnackbar({ show: false, message: '' }), 3000);
  };

  const handleBulkMove = async () => {
    if (!moveToTab || selectedOrderIds.length === 0) return;

    if (moveToTab === 'PAID') {
      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
      const totalToPay = selectedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      setPaymentOnline(String(Math.trunc(totalToPay)));
      setPaymentCash('0');
      setPaymentSplitError('');
      setShowPaymentSplitModal(true);
      return;
    }

    setIsProcessingBulk(true);
    try {
      // Serial execution to prevent race conditions on stock level updates
      for (const id of selectedOrderIds) {
        await updateOrderStatus(token, id, moveToTab);
      }
      await loadOrders();
      const count = selectedOrderIds.length;
      setIsBulkActionActive(false);
      setSelectedOrderIds([]);
      setActiveTab(moveToTab);
      setMoveToTab('');
      showSnackbar(`${count} order${count > 1 ? 's' : ''} moved to ${moveToTab}`);
    } catch (err) {
      setError(`Failed to move orders: ${err.message}`);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleConfirmBulkPaymentSplit = async () => {
    const parsedOnline = Number(paymentOnline);
    const parsedCash = Number(paymentCash);

    if (
      paymentOnline === '' ||
      paymentCash === '' ||
      Number.isNaN(parsedOnline) ||
      Number.isNaN(parsedCash) ||
      parsedOnline < 0 ||
      parsedCash < 0
    ) {
      setPaymentSplitError('Enter valid non-negative amounts for both online and cash.');
      return;
    }

    setPaymentSplitError('');
    setIsProcessingBulk(true);
    setPaymentSplitSubmitting(true);

    try {
      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
      const totalAmount = selectedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      // Serial execution to prevent race conditions on stock level updates
      for (const order of selectedOrders) {
        const orderAmount = Number(order.totalAmount) || 0;
        const ratio = totalAmount > 0 ? orderAmount / totalAmount : 1 / selectedOrders.length;

        // Distribute payment proportionally
        await updateOrderStatus(token, order.id, 'PAID', {
          online: Math.round(parsedOnline * ratio),
          cash: Math.round(parsedCash * ratio)
        });
      }

      await loadOrders();
      const count = selectedOrderIds.length;
      setIsBulkActionActive(false);
      setSelectedOrderIds([]);
      setActiveTab('PAID');
      setMoveToTab('');
      setShowPaymentSplitModal(false);
      showSnackbar(`${count} order${count > 1 ? 's' : ''} moved to PAID`);
    } catch (err) {
      setPaymentSplitError(err.message);
    } finally {
      setPaymentSplitSubmitting(false);
      setIsProcessingBulk(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = order.status?.toUpperCase();
      if (activeTab === 'NEW') return status === 'NEW' || !status;
      return status === activeTab;
    });
  }, [orders, activeTab]);

  const groupedOrders = useMemo(() => {
    const groups = {};
    filteredOrders.forEach((order) => {
      const customerName = getDisplayCustomerName(order);
      if (!groups[customerName]) {
        groups[customerName] = [];
      }
      groups[customerName].push(order);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredOrders]);

  const currentSelectedCustomer = useMemo(() => {
    if (selectedOrderIds.length === 0) return null;
    const firstOrder = orders.find(o => o.id === selectedOrderIds[0]);
    return firstOrder ? getDisplayCustomerName(firstOrder) : null;
  }, [selectedOrderIds, orders]);

  const handleToggleCustomerSelection = (ordersInGroup) => {
    if (ordersInGroup.length === 0) return;
    const customerNameInGroup = getDisplayCustomerName(ordersInGroup[0]);

    const orderIdsInGroup = ordersInGroup.map(o => o.id);
    const selectedInGroup = orderIdsInGroup.filter(id => selectedOrderIds.includes(id));
    const allSelected = selectedInGroup.length === orderIdsInGroup.length;

    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !orderIdsInGroup.includes(id)));
    } else {
      if (currentSelectedCustomer && currentSelectedCustomer !== customerNameInGroup) {
        showSnackbar(`Unselect orders from ${currentSelectedCustomer} first`);
        return;
      }
      setSelectedOrderIds(prev => [...new Set([...prev, ...orderIdsInGroup])]);
    }
  };

  return (
    <section className="page" style={{ paddingBottom: orders.length > 0 ? '12rem' : '8rem' }}>
      <div className="sticky-header" style={{ paddingTop: '0.5rem' }}>
        <div className="page-tabs" style={{ marginBottom: '0.5rem', whiteSpace: 'nowrap', marginTop: '0' }}>
          {['NEW', 'DELIVERED', 'PAID'].map((tab) => (
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
      </div>

      {orders.length > 0 && (
        <div className="orders-list-panel">
          {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
          {loading && !orders.length && <p className="helper-text">Loading orders…</p>}

          <div className="orders-list">
            {groupedOrders.length > 0 ? (
              groupedOrders.map(([customerName, ordersInGroup]) => {
                const orderIdsInGroup = ordersInGroup.map(o => o.id);
                const selectedInGroup = orderIdsInGroup.filter(id => selectedOrderIds.includes(id));
                const allSelected = selectedInGroup.length === orderIdsInGroup.length && orderIdsInGroup.length > 0;
                const isOtherCustomer = currentSelectedCustomer && currentSelectedCustomer !== customerName;

                return (
                  <div key={customerName} style={{ marginBottom: '1rem', opacity: isOtherCustomer ? 0.5 : 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        marginBottom: '0.75rem',
                        cursor: isBulkActionActive ? 'pointer' : 'default',
                        background: 'hsl(var(--primary) / 0.05)',
                        borderRadius: 'var(--radius)',
                        borderLeft: '4px solid hsl(var(--primary))',
                        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)'
                      }}
                      onClick={() => isBulkActionActive && handleToggleCustomerSelection(ordersInGroup)}
                    >
                      {isBulkActionActive ? (
                        <div>
                          {allSelected ? (
                            <CheckCircle2 size={22} style={{ color: 'hsl(var(--primary))' }} />
                          ) : (
                            <Circle size={22} style={{ color: 'hsl(var(--muted-foreground))' }} />
                          )}
                        </div>
                      ) : (
                        null
                      )}
                      <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: 'hsl(var(--foreground))',
                        letterSpacing: '0.01em'
                      }}>
                        {customerName}
                      </h3>
                      <div style={{ marginLeft: 'auto', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.1rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                        {ordersInGroup.length}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '0.5rem' }}>
                      {ordersInGroup.map((order) => {
                        const orderIdLabel = String(order.id ?? '');
                        const clickableLabel = `${customerName} (${orderIdLabel})`;
                        const orderDateLabel = formatOrderDate(order.orderDate ?? order.createdAt);
                        const totalItems = Array.isArray(order.items) ? order.items.length : 0;
                        const statusClass = order.status?.toLowerCase() ?? 'unknown';
                        const isSelected = selectedOrderIds.includes(order.id);
                        return (
                          <button
                            key={order.id}
                            type="button"
                            className={`order-card order-card--${statusClass} ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              if (isBulkActionActive) {
                                handleToggleOrderSelection(order.id);
                              } else {
                                navigate(`/orders/${order.id}`);
                              }
                            }}
                            aria-label={isBulkActionActive ? `Select ${clickableLabel}` : `View ${clickableLabel}`}
                            style={{
                              marginBottom: 0,
                              border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                              position: 'relative',
                              padding: '1rem',
                              background: 'hsl(var(--card))',
                              display: 'block',
                              width: '100%',
                              textAlign: 'left'
                            }}
                          >
                            <div className="order-card-layout">
                              {isBulkActionActive && (
                                <div style={{ marginRight: '1rem', display: 'flex', alignItems: 'center' }}>
                                  {isSelected ? (
                                    <CheckCircle2 size={24} className="text-primary" style={{ color: 'hsl(var(--primary))' }} />
                                  ) : (
                                    <Circle size={24} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                  )}
                                </div>
                              )}
                              <div className="order-card-left" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                  <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: 'hsl(var(--primary))',
                                    background: 'hsl(var(--primary) / 0.08)',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px'
                                  }}>
                                    Order #{orderIdLabel.slice(-6).toUpperCase()}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>
                                  <Clock size={14} />
                                  <span>{orderDateLabel}</span>
                                </div>
                              </div>
                              <div className="order-card-right" style={{ textAlign: 'right' }}>
                                <p className="order-card-amount" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</p>
                                <p className="small-label" style={{ fontSize: '0.7rem', opacity: 0.8, margin: '0.2rem 0 0' }}>{totalItems} items</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                <p className="muted" style={{ marginTop: '0.25rem' }}>Dusri tab par jaakar dekhein ya naya order banayein.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !orders.length && (
        <>
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="When you start creating orders, they will appear here. Manage your sales and fulfillment in one place."
            actionLabel="Create First Order"
            onAction={openCreateModal}
          />
          <footer style={{
            position: 'fixed',
            bottom: '4rem',
            left: 0,
            right: 0,
            background: 'hsl(var(--background))',
            borderTop: '1px solid hsl(var(--border))',
            padding: '1rem',
            zIndex: 100,
            display: 'flex',
            gap: '1rem'
          }}>
            <button
              type="button"
              className="primary"
              style={{ height: '2.5rem', width: '100%' }}
              onClick={openCreateModal}
            >
              CREATE ORDER
            </button>
          </footer>
        </>
      )}

      {orders.length > 0 && (
        <footer style={{
          position: 'fixed',
          bottom: '4rem',
          left: 0,
          right: 0,
          background: 'hsl(var(--background))',
          borderTop: '1px solid hsl(var(--border))',
          padding: '1rem',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {isBulkActionActive ? (
            <>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedOrderIds.length} Selected</span>
                 <SearchableSelect 
                   value={moveToTab} 
                   onChange={(e) => setMoveToTab(e.target.value)}
                   options={['NEW', 'DELIVERED', 'PAID']
                     .filter(t => t !== activeTab)
                     .map(t => ({ value: t, label: t }))
                   }
                   placeholder="Move to..."
                   className="flex-1"
                   style={{ height: '2.5rem' }}
                 />
              </div>
              <div className="split-2" style={{ gap: '1rem' }}>
                <button type="button" style={{ height: '2.5rem' }} onClick={handleToggleBulkAction}>Cancel</button>
                <button
                  type="button"
                  className="primary"
                  style={{ height: '2.5rem' }}
                  disabled={!moveToTab || selectedOrderIds.length === 0 || isProcessingBulk}
                  onClick={handleBulkMove}
                >
                  {isProcessingBulk ? 'Moving...' : 'Move Orders'}
                </button>
              </div>
            </>
          ) : (
            <div className={(activeTab === 'PAID' || filteredOrders.length === 0) ? "" : "split-2"} style={{ gap: '1rem', display: (activeTab === 'PAID' || filteredOrders.length === 0) ? 'block' : 'grid' }}>
              {(activeTab !== 'PAID' && filteredOrders.length > 0) && (
                <button type="button" style={{ height: '2.5rem' }} onClick={handleToggleBulkAction}>BULK ACTION</button>
              )}
              <button type="button" className="primary" style={{ height: '2.5rem', width: '100%' }} onClick={openCreateModal}>CREATE ORDER</button>
            </div>
          )}
        </footer>
      )}

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
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap'
        }}>
          {snackbar.message}
        </div>
      )}

      {/* PaymentSplitModal for Bulk Action */}
      {showPaymentSplitModal && (
        <div className="orders-payment-split-modal-overlay">
          <div className="orders-payment-split-modal" role="dialog" aria-modal="true">
            <header className="orders-payment-split-modal-header">
              <h3 style={{ margin: 0 }}>Bulk Payment Received</h3>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowPaymentSplitModal(false)}
                aria-label="Close payment split dialog"
              >
                <X size={24} />
              </button>
            </header>
            <div className="orders-payment-split-modal-body">
              <Input
                id="bulk-payment-online"
                label="Online amount"
                type="number"
                min="0"
                step="1"
                value={paymentOnline}
                onChange={(event) => setPaymentOnline(event.target.value)}
              />
              <Input
                id="bulk-payment-cash"
                label="Cash amount"
                type="number"
                min="0"
                step="1"
                value={paymentCash}
                onChange={(event) => setPaymentCash(event.target.value)}
              />
              {paymentSplitError && <p className="form-error">{paymentSplitError}</p>}
            </div>
            <footer className="orders-payment-split-modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowPaymentSplitModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmBulkPaymentSplit}
                disabled={paymentSplitSubmitting}
              >
                {paymentSplitSubmitting ? 'Saving…' : 'Confirm split'}
              </button>
            </footer>
          </div>
        </div>
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
            paddingBottom: '0.5rem',
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
            <div style={{ paddingBottom: '1rem', background: 'hsl(var(--background))', zIndex: 10 }}>
              {createOrderError && <p className="form-error" style={{ marginBottom: '1rem' }}>{createOrderError}</p>}
              <div className="form-group">
                <SearchableSelect
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={customers.map((customer) => ({
                    value: customer.id,
                    label: getCustomerLabel(customer)
                  }))}
                  placeholder="Select a customer"
                  disabled={creatingOrder}
                  required
                />
              </div>
              <div className="form-group">
                <Input
                  id="order-date"
                  label="Order date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  disabled={creatingOrder}
                />
              </div>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              paddingBottom: '1rem'
            }}>

              {/* ITEM LIST  */}
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

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <SearchableSelect
                        value={line.itemId}
                        onChange={(e) => handleLineItemChange(index, 'itemId', e.target.value)}
                        options={items.map((item) => ({
                          value: item.id,
                          label: getItemLabel(item)
                        }))}
                        placeholder="Search item..."
                        disabled={creatingOrder}
                      />
                    </div>

                    <div className="split-2">
                      <Input
                        type="number"
                        label="Quantity"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                        disabled={creatingOrder}
                      />
                      <Input
                        label="Line Total"
                        value={formatCurrency(getLineTotal(line))}
                        readOnly
                        disabled={creatingOrder}
                      />
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
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>{formatCurrency(orderTotal)}</span>
              </div>

              <footer className="split-2" style={{ gap: '1rem' }}>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creatingOrder}
                  style={{ width: '100%', height: '2.5rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={creatingOrder}
                  style={{ width: '100%', height: '2.5rem', fontSize: '1rem' }}
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
