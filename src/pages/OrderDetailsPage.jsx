import { useEffect, useMemo, useState } from 'react';
import { Download, Edit3, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
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

  const handleStatusSave = async () => {
    if (!orderDetail) {
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
    <section className="page">
      <div className="sticky-header">
        <div>
          <h2>Order details</h2>
          {orderDetail && (
            <p className="order-customer">
              {customerName} • #{orderIdLabel.slice(0, 8)}
            </p>
          )}
        </div>
        <div className="orders-detail-header-bar">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => navigate('/orders')}
          >
            Back to orders
          </button>
          <button
            type="button"
            className="ghost-btn icon-button"
            onClick={loadDetail}
            disabled={loading}
          >
            <RefreshCw size={16} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <article className="card orders-detail-panel">
        {error && <p className="form-error">{error}</p>}
        {loading && !orderDetail && <p className="helper-text">Loading order…</p>}

        {!loading && !orderDetail && (
          <p className="helper-text">Select an order to see its details.</p>
        )}

        {!loading && orderDetail && (
          <>
            <div className="orders-detail-header">
              <div>
                <p className="small-label">Status</p>
                <span
                  className={`status-pill status-pill--${orderDetail.status?.toLowerCase()}`}
                >
                  {getStatusLabel(orderDetail.status)}
                </span>
              </div>
              <div>
                <p className="small-label">Total</p>
                <strong>{formatCurrency(orderDetail.totalAmount)}</strong>
              </div>
            </div>

            <section className="orders-items-section">
              <h3>Line items</h3>
              {orderItems.length ? (
                <div className="orders-items-table-wrap">
                  <table className="orders-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit price</th>
                        <th>Line total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
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
                          <tr key={`${orderItemId}-${itemLabel}-${index}`}>
                            <td>
                              <div>
                                {itemLabel}
                                {showProductId && (
                                  <p className="helper-text">
                                    {item.itemId}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                min={1}
                                className="orders-item-quantity-input"
                                value={quantityValue}
                                onChange={(event) =>
                                  handleLineItemQuantityChange(orderItemId, event.target.value)
                                }
                              />
                            </td>
                            <td>{formatCurrency(item.unitPrice)}</td>
                            <td>{formatCurrency(lineTotal)}</td>
                            <td className="orders-item-actions-cell">
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => handleUpdateOrderItemQuantity(orderItemId)}
                                disabled={!quantityChanged || isUpdatingItem}
                                aria-label={`Update quantity for ${itemLabel}`}
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                type="button"
                                className="icon-button danger"
                                onClick={() => handleDeleteOrderItem(orderItemId)}
                                disabled={isDeletingItem}
                                aria-label={`Delete ${itemLabel}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="helper-text">This order does not list any line items yet.</p>
              )}
            </section>

            <section className="orders-form-section">
              <div className="orders-form-row">
                <label htmlFor="order-status">Status</label>
                <div className="orders-status-actions">
                  <select
                    id="order-status"
                    value={statusInput}
                    onChange={(event) => setStatusInput(event.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="primary icon-button"
                    onClick={handleStatusSave}
                    disabled={!statusChanged || updatingStatus}
                  >
                    <FileText size={16} />
                    <span>{updatingStatus ? 'Saving…' : 'Update status'}</span>
                  </button>
                </div>
              </div>

              <div className="orders-form-row">
                <label htmlFor="order-notes">Delivery notes</label>
                <textarea
                  id="order-notes"
                  rows={3}
                  value={notesInput}
                  onChange={(event) => setNotesInput(event.target.value)}
                  placeholder="Add any delivery or follow-up instructions..."
                />
                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveNotes}
                  disabled={!hasNotesChanges || savingNotes}
                >
                  {savingNotes ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </section>

            <div className="orders-detail-actions">
              <button
                type="button"
                className="icon-button"
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                <Download size={16} />
                <span>{downloading ? 'Downloading…' : 'Download PDF'}</span>
              </button>
              <button
                type="button"
                className="danger icon-button"
                onClick={handleDeleteOrder}
                disabled={deleting}
              >
                <Trash2 size={16} />
                <span>{deleting ? 'Deleting…' : 'Delete order'}</span>
              </button>
            </div>
          </>
        )}
      </article>

      {addItemModalOpen && (
        <div className="orders-item-modal-overlay">
          <div className="orders-item-modal" role="dialog" aria-modal="true">
            <header className="orders-item-modal-header">
              <h3>Add order item</h3>
              <button
                type="button"
                className="ghost-btn"
                onClick={closeAddItemModal}
                aria-label="Close add item dialog"
              >
                Close
              </button>
            </header>
            <div className="orders-item-modal-body">
              <label htmlFor="add-order-item-select">Item</label>
              {loadingAvailableItems ? (
                <p className="helper-text">Loading items…</p>
              ) : (
                <select
                  id="add-order-item-select"
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                >
                  <option value="">Select an item</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getItemLabel(item)}
                    </option>
                  ))}
                </select>
              )}
              <label htmlFor="add-order-item-quantity">Quantity</label>
              <input
                id="add-order-item-quantity"
                type="number"
                min={1}
                value={newItemQuantity}
                onChange={(event) => setNewItemQuantity(event.target.value)}
              />
              {modalError && <p className="form-error">{modalError}</p>}
            </div>
            <footer className="orders-item-modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={closeAddItemModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleAddItemToOrder}
                disabled={addingItem}
              >
                {addingItem ? 'Adding…' : 'Add to order'}
              </button>
            </footer>
          </div>
        </div>
      )}

      <button
        type="button"
        className="floating-action-btn"
        onClick={openAddItemModal}
        aria-label="Add order item"
      >
        <Plus size={20} />
      </button>
    </section>
  );
}
