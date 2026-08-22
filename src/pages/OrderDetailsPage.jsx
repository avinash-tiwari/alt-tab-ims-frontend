import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Edit3, FileText, Plus, Minus, RefreshCw, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addOrderItem,
  deleteOrder,
  deleteOrderItem,
  getCustomerPrices,
  getOrder,
  getOrderInvoiceData,
  listItems,
  updateOrder,
  updateOrderItem,
  updateOrderStatus
} from '../api';
import {
  STATUS_OPTIONS,
  formatCurrency,
  getDisplayCustomerName,
  getStatusLabel,
  formatOrderDate,
  formatOnlyDate
} from '../utils/orderUtils';
import { getItemLabel, getItemUnitPrice } from '../utils/itemUtils';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import Input from '../components/ui/Input';
import SearchableSelect from '../components/ui/SearchableSelect';

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
  const [newItemPrice, setNewItemPrice] = useState('0');
  const [modalError, setModalError] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState({});
  const [priceInputs, setPriceInputs] = useState({});
  const [updatingOrderItemId, setUpdatingOrderItemId] = useState('');
  const [deletingOrderItemId, setDeletingOrderItemId] = useState('');
  const [showPaymentSplitModal, setShowPaymentSplitModal] = useState(false);
  const [paymentOnline, setPaymentOnline] = useState('');
  const [paymentCash, setPaymentCash] = useState('');
  const [paymentSplitError, setPaymentSplitError] = useState('');
  const [paymentSplitSubmitting, setPaymentSplitSubmitting] = useState(false);
  const [previousStatusBeforeSplit, setPreviousStatusBeforeSplit] = useState('');
  const [snackbar, setSnackbar] = useState({ show: false, message: '' });
  const [customerPrices, setCustomerPrices] = useState([]);

  const showSnackbar = (message) => {
    setSnackbar({ show: true, message });
    setTimeout(() => setSnackbar({ show: false, message: '' }), 3000);
  };

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

  useEffect(() => {
    const fetchPrices = async () => {
      const cId = orderDetail?.customerId || orderDetail?.customer?.id;
      if (token && cId) {
        try {
          const prices = await getCustomerPrices(token, cId);
          setCustomerPrices(Array.isArray(prices) ? prices : []);
        } catch (err) {
          console.error('Failed to load customer prices', err);
        }
      }
    };
    fetchPrices();
  }, [token, orderDetail?.customerId, orderDetail?.customer?.id]);

  const orderItems = useMemo(() => orderDetail?.items ?? [], [orderDetail]);
  
  const orderSummary = useMemo(() => {
    return orderItems.reduce((acc, item, index) => {
      const orderItemId = item.id ?? item.itemId ?? `order-item-${index}`;
      const q = Number(quantityInputs[orderItemId] ?? item.quantity ?? 0);
      const p = Number(priceInputs[orderItemId] ?? item.unitPrice ?? 0);
      acc.totalQuantity += q;
      acc.totalAmount += (p * q);
      return acc;
    }, { totalItems: orderItems.length, totalQuantity: 0, totalAmount: 0 });
  }, [orderItems, quantityInputs, priceInputs]);

  const calculatedTotal = orderSummary.totalAmount;

  useEffect(() => {
    const nextQty = {};
    const nextPrice = {};
    orderItems.forEach((item, index) => {
      const orderItemId = item.id ?? item.itemId ?? `order-item-${index}`;
      nextQty[orderItemId] = String(item.quantity ?? '');
      nextPrice[orderItemId] = String(item.unitPrice ? Math.round(item.unitPrice) : '');
    });
    setQuantityInputs(nextQty);
    setPriceInputs(nextPrice);
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
      showSnackbar('Notes saved');
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
    const defaultCash =
      totalAmount !== undefined && totalAmount !== null && !Number.isNaN(Number(totalAmount))
        ? String(Math.trunc(Number(totalAmount)))
        : '';

    setPaymentOnline('0');
    setPaymentCash(defaultCash);
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
        online: parsedOnline,
        cash: parsedCash
      });
      setOrderDetail((prev) =>
        prev ? { ...prev, ...updated, items: prev.items } : prev
      );
      setStatusInput(updated.status ?? statusInput);
      closePaymentSplitModal(false);
      showSnackbar('Status & payment updated');
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
      showSnackbar(`Status updated to ${getStatusLabel(statusInput)}`);
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
      const data = await getOrderInvoiceData(token, orderDetail.id);
      const fileName = `order-${orderDetail.id}.pdf`;
      const blob = await generateInvoicePDF(data, fileName);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
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
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const closeAddItemModal = () => {
    setAddItemModalOpen(false);
    setSelectedItemId('');
    setNewItemQuantity('1');
    setNewItemPrice('0');
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

    const parsedPrice = Number(newItemPrice);
    if (newItemPrice === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setModalError('Unit price must be a non-negative number.');
      return;
    }

    setModalError('');
    setAddingItem(true);
    
    const selectedItem = availableItems.find(i => String(i.id) === String(selectedItemId));
    const effectiveUnitPrice = parsedPrice;
    
    try {
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = {
        id: tempId,
        itemId: selectedItemId,
        quantity: parsedQuantity,
        unitPrice: effectiveUnitPrice,
        item: selectedItem,
        lineTotal: effectiveUnitPrice * parsedQuantity
      };

      setOrderDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: [...(prev.items || []), optimisticItem]
        };
      });
      
      setQuantityInputs(prev => ({ ...prev, [tempId]: String(parsedQuantity) }));
      setPriceInputs(prev => ({ ...prev, [tempId]: String(effectiveUnitPrice) }));
      closeAddItemModal();

      const { orderItem, order } = await addOrderItem(token, orderDetail.id, {
        itemId: selectedItemId,
        quantity: parsedQuantity,
        unitPrice: effectiveUnitPrice
      });

      setOrderDetail((prev) => {
        if (!prev) return prev;
        const items = (prev.items || []).map(item => item.id === tempId ? orderItem : item);
        return { ...prev, ...(order || {}), items };
      });
      
      if (orderItem.id) {
        setQuantityInputs(prev => {
          const next = { ...prev, [orderItem.id]: String(orderItem.quantity) };
          delete next[tempId];
          return next;
        });
        setPriceInputs(prev => {
          const next = { ...prev, [orderItem.id]: String(orderItem.unitPrice) };
          delete next[tempId];
          return next;
        });
      }
      showSnackbar('Item added to order');
    } catch (err) {
      setError(err.message);
      loadDetail();
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

  const handleLineItemPriceChange = (orderItemId, value) => {
    setPriceInputs((prev) => ({
      ...prev,
      [orderItemId]: value
    }));
  };

  const handleUpdateOrderItem = async (orderItemId, newQty, newPrice) => {
    if (!orderDetail || !orderItemId) {
      return;
    }

    const rawQty = newQty !== undefined ? newQty : quantityInputs[orderItemId];
    const parsedQuantity = Number(rawQty);
    if (!rawQty || Number.isNaN(parsedQuantity) || parsedQuantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    const rawPrice = newPrice !== undefined ? newPrice : priceInputs[orderItemId];
    const parsedPrice = Number(rawPrice);
    if (rawPrice === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Unit price must be a non-negative number.');
      return;
    }

    setUpdatingOrderItemId(orderItemId);
    setError('');
    try {
      const { order, orderItem } = await updateOrderItem(
        token,
        orderDetail.id,
        orderItemId,
        { 
          quantity: parsedQuantity,
          unitPrice: parsedPrice
        }
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
      setPriceInputs((prev) => ({
        ...prev,
        [orderItem.id]: String(orderItem.unitPrice)
      }));
      showSnackbar('Item updated');
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
      setOrderDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((item) => (item.id ?? item.itemId) !== orderItemId)
        };
      });
      showSnackbar('Item removed');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingOrderItemId('');
    }
  };

  const customerName = getDisplayCustomerName(orderDetail);
  const orderIdLabel = String(orderDetail?.id ?? '');

  const getEffectivePrice = (item) => {
    if (!item) return 0;
    const custom = customerPrices.find(cp => String(cp.itemId) === String(item.id));
    if (custom) {
      const val = custom.customPrice ?? custom.price;
      if (val !== undefined && val !== null) {
        return Number(val);
      }
    }
    return getItemUnitPrice(item);
  };

  return (
    <section className="page" style={{ padding: 0 }}>
      <div className="sticky-header" style={{ paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => navigate('/orders')}
            style={{ padding: '0.25rem', marginLeft: '-0.25rem' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
               {orderDetail ? (
                 <>
                   {customerName} <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.7, marginLeft: '0.25rem' }}>
                     {formatOnlyDate(orderDetail.orderDate || orderDetail.createdAt)}
                   </span>
                 </>
               ) : 'Order details'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="primary"
              onClick={openAddItemModal}
              title="Add Item"
              style={{ 
                width: '2rem', 
                height: '2rem', 
                padding: 0, 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px hsl(var(--primary) / 0.3)'
              }}
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              className="danger"
              onClick={handleDeleteOrder}
              disabled={deleting}
              title="Delete Order"
              style={{ 
                width: '2rem', 
                height: '2rem', 
                padding: 0, 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px hsl(var(--destructive) / 0.3)',
                color: 'white',
                border: 'none'
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {!loading && orderDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <select
                id="order-status"
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value)}
                style={{ 
                  flex: 1, 
                  height: '2.25rem', 
                  fontSize: '0.8125rem', 
                  padding: '0 0.5rem',
                  minWidth: 0
                }}
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
                style={{ 
                  height: '2.25rem', 
                  padding: '0 0.75rem', 
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}
              >
                {updatingStatus ? <RefreshCw size={14} className="animate-spin" /> : 'Update'}
              </button>
            </div>
            
            <div 
              className="customer-stats-bar"
              style={{ 
                background: 'hsl(var(--primary) / 0.1)',
                borderColor: 'hsl(var(--primary) / 0.1)',
                borderWidth: '1px',
                borderStyle: 'solid',
                marginTop: '0.25rem',
                flexShrink: 0
              }}
            >
               <div className="stat-pill" style={{ textAlign: 'left' }}>
                  <span className="stat-label" style={{ color: 'hsl(var(--primary))', fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>Items</span>
                  <span className="stat-value" style={{ color: 'hsl(var(--primary))', fontSize: '1rem', fontWeight: 800 }}>{orderSummary.totalItems}</span>
               </div>
               <div className="stat-pill" style={{ textAlign: 'center' }}>
                  <span className="stat-label" style={{ color: 'hsl(var(--primary))', fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>Total Qty</span>
                  <span className="stat-value" style={{ color: 'hsl(var(--primary))', fontSize: '1rem', fontWeight: 800 }}>{orderSummary.totalQuantity}</span>
               </div>
               <div className="stat-pill" style={{ textAlign: 'right' }}>
                  <span className="stat-label" style={{ color: 'hsl(var(--primary))', fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>Amount</span>
                  <span className="stat-value" style={{ color: 'hsl(var(--primary))', fontSize: '1.1rem', fontWeight: 900 }}>{formatCurrency(orderSummary.totalAmount)}</span>
               </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ paddingTop: '1rem', paddingBottom: '5rem' }}>
        {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
        {loading && !orderDetail && <p className="helper-text">Loading order…</p>}

        {!loading && !orderDetail && (
          <p className="helper-text">Select an order to see its details.</p>
        )}

        {!loading && orderDetail && (
          <>
            <section className="orders-items-section" style={{ 
              background: 'transparent', 
              padding: 0, 
              borderRadius: 'var(--radius)', 
              border: 'none'
            }}>
              {orderItems.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {orderItems.map((item, index) => {
                    const orderItemId = item.id ?? item.itemId ?? `order-item-${index}`;
                    const quantityValue = quantityInputs[orderItemId] ?? '';
                    const priceValue = priceInputs[orderItemId] ?? '';
                    
                    const displayId = item.itemId ?? orderItemId;
                    const itemLabel = getItemLabel({ ...item, id: displayId });
                    const currentQuantity = String(item.quantity ?? '');
                    const currentPrice = String(item.unitPrice ?? '');
                    const changed = Boolean((quantityValue && quantityValue !== currentQuantity) || (priceValue && priceValue !== currentPrice));
                    const isUpdatingItem = updatingOrderItemId === orderItemId;
                    const isDeletingItem = deletingOrderItemId === orderItemId;
                    
                    return (
                      <div key={`${orderItemId}-${itemLabel}-${index}`} className="card" style={{ 
                        padding: '1rem', 
                        margin: 0, 
                        position: 'relative', 
                        background: 'hsl(var(--primary) / 0.05)',
                        border: '1px solid hsl(var(--border) / 0.5)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>{itemLabel}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
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

                        <div className="split-2" style={{ alignItems: 'flex-start', gap: '1rem' }}>
                          <div className="form-group" style={{ marginBottom: '0.5rem', flex: 1 }}>
                            <label style={{ fontWeight: 800, color: 'hsl(var(--primary))', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>QTY</label>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              background: 'white',
                              border: '1px solid hsl(var(--primary) / 0.2)',
                              borderRadius: '8px',
                              height: '42px',
                              padding: '0 6px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newVal = Math.max(1, (Number(quantityValue) || 1) - 1);
                                  handleLineItemQuantityChange(orderItemId, String(newVal));
                                  if (newVal !== Number(currentQuantity)) handleUpdateOrderItem(orderItemId, String(newVal), priceValue);
                                }}
                                disabled={isUpdatingItem || (Number(quantityValue) || 1) <= 1}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  background: 'hsl(var(--primary))',
                                  cursor: (Number(quantityValue) || 1) <= 1 ? 'not-allowed' : 'pointer',
                                  opacity: (Number(quantityValue) || 1) <= 1 ? 0.3 : 1,
                                  border: 'none',
                                  padding: 0,
                                  flexShrink: 0
                                }}
                              >
                                <Minus size={16} stroke="white" strokeWidth={4} />
                              </button>
                              <span style={{ 
                                fontWeight: 800, 
                                fontSize: '1rem', 
                                color: 'hsl(var(--primary))',
                                flex: 1,
                                textAlign: 'center',
                                userSelect: 'none'
                              }}>
                                {quantityValue}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newVal = (Number(quantityValue) || 0) + 1;
                                  handleLineItemQuantityChange(orderItemId, String(newVal));
                                  if (newVal !== Number(currentQuantity)) handleUpdateOrderItem(orderItemId, String(newVal), priceValue);
                                }}
                                disabled={isUpdatingItem}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  background: 'hsl(var(--primary))',
                                  cursor: 'pointer',
                                  border: 'none',
                                  padding: 0,
                                  flexShrink: 0
                                }}
                              >
                                <Plus size={16} stroke="white" strokeWidth={4} />
                              </button>
                            </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: '0.5rem', flex: 1 }}>
                            <label style={{ fontWeight: 800, color: 'hsl(var(--primary))', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>PRICE</label>
                            <Input
                              type="number"
                              min={0}
                              value={priceValue}
                              onChange={(event) =>
                                handleLineItemPriceChange(orderItemId, event.target.value)
                              }
                              onBlur={() => changed && handleUpdateOrderItem(orderItemId)}
                              disabled={isUpdatingItem}
                              style={{ height: '42px', marginTop: 0 }}
                              className="no-floating-label"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="helper-text">No items in this order.</p>
              )}

              {addItemModalOpen && (
                <div className="card" style={{ padding: '1rem', border: '1px solid hsl(var(--primary))', background: 'hsl(var(--primary) / 0.03)', marginTop: '1rem' }}>
                  {(() => {
                    return (
                      <>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                          <SearchableSelect
                            value={selectedItemId}
                            onChange={(event) => {
                              const val = event.target.value;
                              setSelectedItemId(val);
                              const item = availableItems.find(i => String(i.id) === String(val));
                              if (item) {
                                setNewItemPrice(String(Math.round(getEffectivePrice(item))));
                              } else {
                                setNewItemPrice('0');
                              }
                            }}
                            options={availableItems.map((item) => ({
                              value: item.id,
                              label: getItemLabel(item)
                            }))}
                            placeholder="Search item..."
                            disabled={addingItem}
                          />
                        </div>
                        <div className="split-2" style={{ marginBottom: '1rem', gap: '1rem', alignItems: 'flex-start' }}>
                          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label style={{ fontWeight: 800, color: 'hsl(var(--primary))', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>QTY</label>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              background: 'white',
                              border: '1px solid hsl(var(--primary) / 0.2)',
                              borderRadius: '8px',
                              height: '42px',
                              padding: '0 6px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNewItemQuantity(prev => String(Math.max(1, (Number(prev) || 1) - 1)));
                                }}
                                disabled={addingItem || (Number(newItemQuantity) || 1) <= 1}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  background: 'hsl(var(--primary))',
                                  cursor: (Number(newItemQuantity) || 1) <= 1 ? 'not-allowed' : 'pointer',
                                  opacity: (Number(newItemQuantity) || 1) <= 1 ? 0.3 : 1,
                                  border: 'none',
                                  padding: 0,
                                  flexShrink: 0
                                }}
                              >
                                <Minus size={16} stroke="white" strokeWidth={4} />
                              </button>
                              <span style={{ 
                                fontWeight: 800, 
                                fontSize: '1rem', 
                                color: 'hsl(var(--primary))',
                                flex: 1,
                                textAlign: 'center',
                                userSelect: 'none'
                              }}>
                                {newItemQuantity}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNewItemQuantity(prev => String((Number(prev) || 0) + 1));
                                }}
                                disabled={addingItem}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  background: 'hsl(var(--primary))',
                                  cursor: 'pointer',
                                  border: 'none',
                                  padding: 0,
                                  flexShrink: 0
                                }}
                              >
                                <Plus size={16} stroke="white" strokeWidth={4} />
                              </button>
                            </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label style={{ fontWeight: 800, color: 'hsl(var(--primary))', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>PRICE</label>
                            <Input
                              type="number"
                              min={0}
                              step="1"
                              value={newItemPrice}
                              onChange={(event) => setNewItemPrice(event.target.value)}
                              disabled={addingItem}
                              style={{ height: '42px', marginTop: 0 }}
                              className="no-floating-label"
                            />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  {modalError && <p className="form-error" style={{ marginBottom: '1rem' }}>{modalError}</p>}
                  <div className="split-2" style={{ gap: '0.75rem' }}>
                    <button 
                      type="button" 
                      className="ghost-btn" 
                      onClick={closeAddItemModal} 
                      disabled={addingItem}
                      style={{ height: '34px', border: '1px solid hsl(var(--border))', fontWeight: 800, width: '100%', backgroundColor: 'white' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="primary" 
                      onClick={handleAddItemToOrder} 
                      disabled={addingItem || !selectedItemId} 
                      style={{ height: '34px', fontWeight: 800, width: '100%' }}
                    >
                      {addingItem ? 'Adding...' : 'Add Item'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>


      {/* PaymentSplitModal  */}
      {showPaymentSplitModal && (
        <div className="orders-payment-split-modal-overlay">
          <div className="orders-payment-split-modal" role="dialog" aria-modal="true">
            <header className="orders-payment-split-modal-header">
              <h3 style={{ margin: 0}}>Payment Received</h3>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => closePaymentSplitModal()}
                aria-label="Close payment split dialog"
              >
              <X size={24} />
              </button>
            </header>
            <div className="orders-payment-split-modal-body">
              <Input
                id="payment-online"
                label="Online amount"
                type="number"
                min="0"
                step="1"
                value={paymentOnline}
                onChange={(event) => setPaymentOnline(event.target.value)}
              />
              <Input
                id="payment-cash"
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
                onClick={() => closePaymentSplitModal()}
                style={{ height: '34px', fontWeight: 800 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmPaymentSplit}
                disabled={paymentSplitSubmitting}
                style={{ height: '34px', fontWeight: 800 }}
              >
                {paymentSplitSubmitting ? 'Saving…' : 'Confirm split'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {snackbar.show && (
        <div style={{
          position: 'fixed',
          bottom: '5.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'hsl(var(--foreground))',
          color: 'hsl(var(--background))',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          fontWeight: 600,
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {snackbar.message}
        </div>
      )}
    </section>
  );
}
