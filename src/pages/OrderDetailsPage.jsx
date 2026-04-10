import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Edit3, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addOrderItem,
  deleteOrder,
  deleteOrderItem,
  downloadOrderPDF,
  getOrder,
  listItems,
  updateOrder,
  updateOrderItemQuantity,
  updateOrderStatus
} from '../api';
import {
  STATUS_OPTIONS,
  formatCurrency,
  getDisplayCustomerName,
  getStatusLabel
} from '../utils/orderUtils';
import { getItemLabel } from '../utils/itemUtils';

export default function OrderDetailsPage({ token }) {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [statusInput, setStatusInput] = useState(STATUS_OPTIONS[0].value);
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [loadingAvailableItems, setLoadingAvailableItems] = useState(false);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [modalError, setModalError] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState({});
  const [updatingOrderItemId, setUpdatingOrderItemId] = useState('');
  const [deletingOrderItemId, setDeletingOrderItemId] = useState('');
  const [showPaymentSplitModal, setShowPaymentSplitModal] = useState(false);
  const [paymentOnline, setPaymentOnline] = useState('');
  const [paymentCash, setPaymentCash] = useState('');
  const [paymentSplitError, setPaymentSplitError] = useState('');
  const [paymentSplitSubmitting, setPaymentSplitSubmitting] = useState(false);
  const [previousStatusBeforeSplit, setPreviousStatusBeforeSplit] = useState('');

  const loadDetail = async () => {
    if (!orderId) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await getOrder(token, orderId);
      setOrderDetail(data);
      setNotesInput(data.notes || '');
      setStatusInput(data.status || STATUS_OPTIONS[0].value);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [orderId, token]);

  const loadAvailableItems = async () => {
    if (!token) {
      return;
    }

    setLoadingAvailableItems(true);
    try {
      const data = await listItems(token);
      setAvailableItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load items for selection', err);
    } finally {
      setLoadingAvailableItems(false);
    }
  };

  useEffect(() => {
    loadAvailableItems();
  }, [token]);

  const orderItems = useMemo(() => orderDetail?.items ?? [], [orderDetail]);
  useEffect(() => {
    const next = {};
    orderItems.forEach((item, index) => {
      const orderItemId = item.id ?? item.itemId ?? `order-item-${index}`;
      next[orderItemId] = String(item.quantity ?? '');
    });
    setQuantityInputs(next);
  }, [orderItems]);
  const hasNotesChanges = orderDetail && (orderDetail.notes || '') !== notesInput;
  const statusChanged = orderDetail && orderDetail.status !== statusInput;

  const handleSaveNotes = async () => {
    if (!orderDetail) {
      return;
    }

    setSavingNotes(true);
    setError('');
    try {
      const updated = await updateOrder(token, orderDetail.id, { notes: notesInput.trim() });
      setOrderDetail((prev) =>
        prev ? { ...prev, ...updated, items: prev.items } : prev
      );
      setNotesInput(updated.notes ?? notesInput);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const openPaymentSplitModal = () => {
    if (!orderDetail) {
      return;
    }

    const totalAmount = orderDetail.totalAmount;
    const defaultOnline =
      totalAmount !== undefined && totalAmount !== null && !Number.isNaN(Number(totalAmount))
        ? Number(totalAmount).toFixed(2)
        : '';

    setPaymentOnline(defaultOnline);
    setPaymentCash('0.00');
    setPaymentSplitError('');
    setPreviousStatusBeforeSplit(orderDetail.status ?? '');
    setShowPaymentSplitModal(true);
  };

  const closePaymentSplitModal = (revertStatus = true) => {
    setShowPaymentSplitModal(false);
    setPaymentSplitError('');
    if (revertStatus) {
      setStatusInput(
        previousStatusBeforeSplit || orderDetail?.status || STATUS_OPTIONS[0].value
      );
    }
  };

  const handleConfirmPaymentSplit = async () => {
    if (!orderDetail) {
      return;
    }

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
    setUpdatingStatus(true);
    setPaymentSplitSubmitting(true);

    try {
      const updated = await updateOrderStatus(token, orderDetail.id, statusInput, {
        online: parsedOnline.toFixed(2),
        cash: parsedCash.toFixed(2)
      });
      setOrderDetail((prev) =>
        prev ? { ...prev, ...updated, items: prev.items } : prev
      );
      setStatusInput(updated.status ?? statusInput);
      closePaymentSplitModal(false);
    } catch (err) {
      setPaymentSplitError(err.message);
    } finally {
      setPaymentSplitSubmitting(false);
      setUpdatingStatus(false);
    }
  };

  const handleStatusSave = async () => {
    if (!orderDetail) {
      return;
    }

    if (orderDetail.status !== 'PAID' && statusInput === 'PAID') {
      openPaymentSplitModal();
      return;
    }

    setUpdatingStatus(true);
    setError('');
    try {
      const updated = await updateOrderStatus(token, orderDetail.id, statusInput);
      setOrderDetail((prev) =>
        prev ? { ...prev, ...updated, items: prev.items } : prev
      );
      setStatusInput(updated.status ?? statusInput);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderDetail) {
      return;
    }

    if (!window.confirm('Delete this order? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await deleteOrder(token, orderDetail.id);
      navigate('/orders', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!orderDetail) {
      return;
    }

    setDownloading(true);
    setError('');
    try {
      const blob = await downloadOrderPDF(token, orderDetail.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-${orderDetail.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const openAddItemModal = () => {
    setModalError('');
    setAddItemModalOpen(true);
  };

  const closeAddItemModal = () => {
    setAddItemModalOpen(false);
    setSelectedItemId('');
    setNewItemQuantity('1');
    setModalError('');
  };

  const handleAddItemToOrder = async () => {
    if (!orderDetail) {
      return;
    }

    if (!selectedItemId) {
      setModalError('Select an item from the list.');
      return;
    }
    const parsedQuantity = Number(newItemQuantity);
    if (!newItemQuantity || Number.isNaN(parsedQuantity) || parsedQuantity < 1) {
      setModalError('Quantity must be at least 1.');
      return;
    }

    setModalError('');
    setAddingItem(true);
    try {
      await addOrderItem(token, orderDetail.id, {
        itemId: selectedItemId,
        quantity: parsedQuantity
      });
      closeAddItemModal();
      await loadDetail();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setAddingItem(false);
    }
  };

  const handleLineItemQuantityChange = (orderItemId, value) => {
    setQuantityInputs((prev) => ({
      ...prev,
      [orderItemId]: value
    }));
  };

  const handleUpdateOrderItemQuantity = async (orderItemId) => {
    if (!orderDetail || !orderItemId) {
      return;
    }

    const rawValue = quantityInputs[orderItemId];
    const parsedQuantity = Number(rawValue);
    if (!rawValue || Number.isNaN(parsedQuantity) || parsedQuantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    setUpdatingOrderItemId(orderItemId);
    setError('');
    try {
      const { order, orderItem } = await updateOrderItemQuantity(
        token,
        orderDetail.id,
        orderItemId,
        { quantity: parsedQuantity }
      );
      setOrderDetail((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedItems = prev.items
          ? prev.items.map((existing) =>
              existing.id === orderItem.id ? { ...existing, ...orderItem } : existing
            )
          : prev.items;
        return { ...prev, ...order, items: updatedItems };
      });
      if (order?.status) {
        setStatusInput(order.status);
      }
      setQuantityInputs((prev) => ({
        ...prev,
        [orderItem.id]: String(orderItem.quantity)
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingOrderItemId('');
    }
  };

  const handleDeleteOrderItem = async (orderItemId) => {
    if (!orderDetail || !orderItemId) {
      return;
    }

    if (!window.confirm('Remove this item from the order?')) {
      return;
    }

    setDeletingOrderItemId(orderItemId);
    setError('');
    try {
      await deleteOrderItem(token, orderDetail.id, orderItemId);
      await loadDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingOrderItemId('');
    }
  };

  const customerName = getDisplayCustomerName(orderDetail);
  const orderIdLabel = String(orderDetail?.id ?? '');

  return (
    <section className="page" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
      <div style={{ 
        paddingTop: '1rem', 
        background: 'hsl(var(--background))',
        zIndex: 30
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => navigate('/orders')}
            style={{ padding: '0.5rem', marginLeft: '-0.5rem' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Order details{orderDetail ? ` - ${customerName}` : ''}</h2>
        </div>

        {!loading && orderDetail && (
          <div style={{ 
            background: 'hsl(var(--card))', 
            padding: '1rem', 
            borderRadius: 'var(--radius)', 
            border: '1px solid hsl(var(--border))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="small-label" style={{ fontWeight: 600 }}>Status</span>
              <span className={`status-pill status-pill--${orderDetail.status?.toLowerCase()}`}>
                {getStatusLabel(orderDetail.status)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select
                id="order-status"
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value)}
                style={{ width: '100%' }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="primary"
                onClick={handleStatusSave}
                disabled={!statusChanged || updatingStatus || showPaymentSplitModal}
                style={{ width: '100%', padding: '0.6rem', fontSize: '0.875rem' }}
              >
                {updatingStatus ? 'Saving…' : 'Update Status'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '1rem' }}>
        {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
        {loading && !orderDetail && <p className="helper-text">Loading order…</p>}

        {!loading && !orderDetail && (
          <p className="helper-text">Select an order to see its details.</p>
        )}

        {!loading && orderDetail && (
          <>
            <section className="orders-items-section" style={{ 
              background: 'hsl(var(--card))', 
              padding: '1rem', 
              borderRadius: 'var(--radius)', 
              border: '1px solid hsl(var(--border))' 
            }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>Line items</h3>
              {orderItems.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orderItems.map((item, index) => {
                    const lineTotal = item.lineTotal
                      ? item.lineTotal
                      : item.unitPrice && item.quantity
                      ? Number(item.unitPrice) * Number(item.quantity)
                      : undefined;
                    const orderItemId = item.id ?? item.itemId ?? `order-item-${index}`;
                    const displayId = item.itemId ?? orderItemId;
                    const itemLabel = getItemLabel({ ...item, id: displayId });
                    const showProductId = Boolean(item.itemId && itemLabel !== item.itemId);
                    const quantityValue = quantityInputs[orderItemId] ?? '';
                    const currentQuantity = String(item.quantity ?? '');
                    const quantityChanged = Boolean(quantityValue && quantityValue !== currentQuantity);
                    const isUpdatingItem = updatingOrderItemId === orderItemId;
                    const isDeletingItem = deletingOrderItemId === orderItemId;
                    
                    return (
                      <div key={`${orderItemId}-${itemLabel}-${index}`} className="card" style={{ padding: '1rem', margin: 0, position: 'relative', background: 'hsl(var(--background) / 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>{itemLabel}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {quantityChanged && (
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => handleUpdateOrderItemQuantity(orderItemId)}
                                disabled={isUpdatingItem}
                                style={{ padding: '4px', color: 'hsl(var(--primary))' }}
                              >
                                <Edit3 size={18} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => handleDeleteOrderItem(orderItemId)}
                              disabled={isDeletingItem}
                              style={{ padding: '4px', color: 'hsl(var(--destructive))' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="split-2">
                          <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>QTY</label>
                            <input
                              type="number"
                              min={1}
                              value={quantityValue}
                              onChange={(event) =>
                                handleLineItemQuantityChange(orderItemId, event.target.value)
                              }
                              style={{ padding: '0.4rem 0.5rem' }}
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>TOTAL</label>
                            <div style={{ 
                              padding: '0.4rem 0.5rem', 
                              background: 'hsl(var(--muted) / 0.2)', 
                              borderRadius: 'var(--radius)',
                              fontSize: '0.875rem',
                              fontWeight: 700,
                              border: '1px solid hsl(var(--border))',
                              height: '2.25rem',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              {formatCurrency(lineTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="helper-text">No items in this order.</p>
              )}

              {addItemModalOpen ? (
                <div className="card" style={{ padding: '1rem', border: '1px solid hsl(var(--primary))', background: 'hsl(var(--primary) / 0.03)', marginTop: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Select Item</label>
                    <select
                      value={selectedItemId}
                      onChange={(event) => setSelectedItemId(event.target.value)}
                      disabled={addingItem}
                      style={{ width: '100%', height: '2.5rem' }}
                    >
                      <option value="">Search item...</option>
                      {availableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getItemLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="split-2" style={{ marginBottom: '1rem', gap: '1rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={newItemQuantity}
                        onChange={(event) => setNewItemQuantity(event.target.value)}
                        disabled={addingItem}
                        style={{ height: '2.5rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>TOTAL</label>
                      <div style={{ 
                        padding: '0.4rem 0.5rem', 
                        background: 'hsl(var(--muted) / 0.2)', 
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        border: '1px solid hsl(var(--border))',
                        height: '2.5rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {selectedItemId && availableItems.find(i => i.id === selectedItemId) 
                          ? formatCurrency(Number(availableItems.find(i => i.id === selectedItemId).price || 0) * Number(newItemQuantity))
                          : formatCurrency(0)}
                      </div>
                    </div>
                  </div>
                  {modalError && <p className="form-error" style={{ marginBottom: '1rem' }}>{modalError}</p>}
                  <div className="split-2" style={{ gap: '0.75rem' }}>
                    <button 
                      type="button" 
                      className="ghost-btn" 
                      onClick={closeAddItemModal} 
                      style={{ width: '100%', height: '2.5rem', border: '1px solid hsl(var(--border))' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="primary" 
                      onClick={handleAddItemToOrder} 
                      disabled={addingItem || !selectedItemId} 
                      style={{ width: '100%', height: '2.5rem' }}
                    >
                      {addingItem ? 'Adding...' : 'Add Item'}
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  type="button" 
                  className="ghost-btn" 
                  onClick={openAddItemModal}
                  style={{ 
                    width: '100%', 
                    border: '1px dashed hsl(var(--border))', 
                    background: 'hsl(var(--card))',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: 600,
                    marginTop: '1rem'
                  }}
                >
                  <Plus size={18} /> Add Another Item
                </button>
              )}
            </section>
          </>
        )}
      </div>

      {!loading && orderDetail && (
        <div style={{ 
          padding: '1rem',
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            padding: '0 0.25rem'
          }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>Total Amount</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>₹{orderDetail.totalAmount}</span>
          </div>

          <div className="split-2" style={{ gap: '0.75rem' }}>
            <button
              type="button"
              className="icon-button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              style={{ width: '100%', height: '3rem', gap: '0.5rem', fontSize: '0.875rem' }}
            >
              <Download size={18} />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              className="danger icon-button"
              onClick={handleDeleteOrder}
              disabled={deleting}
              style={{ width: '100%', height: '3rem', gap: '0.5rem', fontSize: '0.875rem' }}
            >
              <Trash2 size={18} />
              <span>Delete order</span>
            </button>
          </div>
        </div>
      )}

      {showPaymentSplitModal && (
        <div className="orders-payment-split-modal-overlay">
          <div className="orders-payment-split-modal" role="dialog" aria-modal="true">
            <header className="orders-payment-split-modal-header">
              <h3>Payment received</h3>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => closePaymentSplitModal()}
                aria-label="Close payment split dialog"
              >
                Close
              </button>
            </header>
            <div className="orders-payment-split-modal-body">
              <p className="helper-text">
                Confirm how the total amount was split between online and cash before marking the order as paid.
              </p>
              <label htmlFor="payment-online">Online amount</label>
              <input
                id="payment-online"
                type="number"
                min="0"
                step="0.01"
                value={paymentOnline}
                onChange={(event) => setPaymentOnline(event.target.value)}
              />
              <label htmlFor="payment-cash">Cash amount</label>
              <input
                id="payment-cash"
                type="number"
                min="0"
                step="0.01"
                value={paymentCash}
                onChange={(event) => setPaymentCash(event.target.value)}
              />
              {paymentSplitError && <p className="form-error">{paymentSplitError}</p>}
            </div>
            <footer className="orders-payment-split-modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => closePaymentSplitModal()}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmPaymentSplit}
                disabled={paymentSplitSubmitting}
              >
                {paymentSplitSubmitting ? 'Saving…' : 'Confirm split'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
