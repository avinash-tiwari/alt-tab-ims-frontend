import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createPublicOrder, listItems } from '../api';
import { formatCurrency } from '../utils/orderUtils';
import { getItemLabel, getItemUnitPrice } from '../utils/itemUtils';

const DEFAULT_NOTES = 'Order from customer portal';

export default function PublicOrderPage() {
  const { customerIdentifier } = useParams();
  const identifierLabel = customerIdentifier?.trim();
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      setLoadingItems(true);
      setItemsError('');
      try {
        const response = await listItems();
        setItems(Array.isArray(response) ? response : []);
      } catch (err) {
        setItemsError(err.message);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    if (!term) {
      return items;
    }
    return items.filter((item) => {
      const label = getItemLabel(item).toLowerCase();
      const identifier = (item?.id ?? '').toLowerCase();
      return label.includes(term) || identifier.includes(term);
    });
  }, [items, itemSearch]);

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

    const item = items.find((entry) => entry.id === selectedItemId);
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
    setItemSearch('');
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

      const response = await createPublicOrder(payload);
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

  const isSubmitDisabled = submitting || !lineItems.length || !identifierLabel;

  return (
    <main className="page" style={{ minHeight: '100vh', paddingTop: '1rem' }}>
      <article className="card stack-form" style={{ gap: '1rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Place an order</h2>
          <p className="helper-text">
            Public ordering for{' '}
            <strong>{identifierLabel || 'the provided customer identifier'}</strong>.
          </p>
        </div>

        {!identifierLabel && (
          <p className="form-error">Customer identifier missing from the URL.</p>
        )}
        {itemsError && <p className="form-error">{itemsError}</p>}
        {submitError && <p className="form-error">{submitError}</p>}
        {successMessage && <p className="success-text">{successMessage}</p>}

        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="orders-form-section">
            <div className="orders-form-row">
              <label htmlFor="public-order-identifier">Customer identifier</label>
              <input
                id="public-order-identifier"
                type="text"
                value={identifierLabel || ''}
                readOnly
                placeholder="Set via URL"
              />
            </div>

            <div className="orders-form-row">
              <label htmlFor="public-order-search">Search items</label>
              <input
                id="public-order-search"
                type="search"
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                placeholder="Search by name or identifier"
                disabled={loadingItems || !items.length}
              />
              {loadingItems && <p className="helper-text">Loading items…</p>}
              {!loadingItems && !items.length && !itemsError && (
                <p className="helper-text">No items available right now.</p>
              )}
            </div>

            <div className="orders-form-row split-2">
              <div className="form-group">
                <label htmlFor="public-order-item">Select item</label>
                <select
                  id="public-order-item"
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                  disabled={loadingItems || !items.length}
                >
                  <option value="">Select an item</option>
                  {filteredItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getItemLabel(item)} — {formatCurrency(getItemUnitPrice(item))}
                    </option>
                  ))}
                </select>
              </div>

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
              disabled={loadingItems || submitting}
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
