import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { createPublicOrder, listItems } from '../api';
import { formatCurrency } from '../utils/orderUtils';
import { getItemLabel, getItemUnitPrice } from '../utils/itemUtils';

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
  const tenantToken = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('tenantToken') || '').trim();
  }, [location.search]);
  const searchTimerRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

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
    debugger;
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

  const handleSelectKeyDown = (event) => {
    const { key } = event;
    const isCharacterKey = key.length === 1 && !event.ctrlKey && !event.metaKey;
    if (key === 'Backspace') {
      setItemQuery((prev) => prev.slice(0, -1));
    } else if (key === 'Escape') {
      setItemQuery('');
    } else if (isCharacterKey) {
      setItemQuery((prev) => prev + key);
    } else {
      return;
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setItemQuery('');
    }, 1500);

    event.preventDefault();
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

  return (
    <main className="page" style={{ minHeight: '100vh', paddingTop: '1rem' }}>
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
              <select
                id="public-order-item-select"
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
                onKeyDown={handleSelectKeyDown}
                disabled={!tenantToken || loadingItems}
              >
                <option value="">Select an item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getItemLabel(item)} — {formatCurrency(getItemUnitPrice(item))}
                  </option>
                ))}
              </select>
              {itemQuery && (
                <p className="helper-text" style={{ marginTop: '0.25rem' }}>
                  Filtering by &ldquo;{itemQuery}&rdquo;
                </p>
              )}
            </div>

            <div className="orders-form-row split-2">
              <div className="form-group">
                <label htmlFor="public-order-quantity">Quantity</label>
                <input
                  id="public-order-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={selectedQuantity}
                  onChange={(event) => setSelectedQuantity(event.target.value)}
                />
              </div>
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

          <div className="form-group">
            <label htmlFor="public-order-notes">Order notes</label>
            <textarea
              id="public-order-notes"
              rows="3"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

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
    </main>
  );
}
