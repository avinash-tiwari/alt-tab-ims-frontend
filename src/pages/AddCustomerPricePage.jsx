import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  getCustomer,
  listItems,
  setCustomerPrices
} from '../api';

export default function AddCustomerPricePage({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [itemId, setItemId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [priceEntries, setPriceEntries] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [customerData, itemsData] = await Promise.all([
        getCustomer(token, id),
        listItems(token)
      ]);
      setCustomer(customerData);
      const itemsList = Array.isArray(itemsData) ? itemsData : [];
      setItems(itemsList);
      
      // Initialize priceEntries with existing custom prices
      if (customerData?.priceList) {
        setPriceEntries(customerData.priceList.map(p => ({
          itemId: p.itemId,
          customPrice: Number(p.customPrice)
        })));
      }

      if (itemsList.length > 0) {
        setItemId(itemsList[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const addPriceEntry = () => {
    const trimmedPrice = customPrice.trim();
    if (!itemId) {
      setError('Select an item before adding a custom price.');
      return;
    }
    if (!trimmedPrice) {
      setError('Enter a custom price before adding.');
      return;
    }
    const parsedPrice = Number(trimmedPrice);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Provide a valid custom price (0 or higher).');
      return;
    }

    setError('');
    setPriceEntries((prev) => {
      const filtered = prev.filter((entry) => entry.itemId !== itemId);
      return [...filtered, { itemId, customPrice: parsedPrice }];
    });
    setCustomPrice('');
  };

  const savePriceList = async () => {
    if (!id) return;
    if (priceEntries.length === 0) {
      setError('Add at least one custom price before saving.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const formattedPayload = priceEntries.map((entry) => ({
        itemId: entry.itemId,
        customPrice: Number(entry.customPrice).toFixed(2)
      }));
      await setCustomerPrices(token, id, formattedPayload);
      setSaving(false);
      setPriceEntries([]);
      navigate(`/customer/${id}`);
    } catch (err) {
      setSaving(false);
      setError(err.message || 'Unable to save custom prices.');
    }
  };

  const isAddDisabled = saving || !itemId || !customPrice.trim();
  const isSaveDisabled = saving || priceEntries.length === 0;

  if (loading && !customer) return <div className="page"><p className="muted">Loading...</p></div>;

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h3 style={{ margin: 0 }}>ADD CUSTOM PRICE</h3>
        </div>
      </div>

      <div>
        {error && <p className="error-text">{error}</p>}
        <article className="card stack-form">
          <h3 className="items-heading">For {customer?.name}</h3>
          
          <select value={itemId} onChange={(event) => setItemId(event.target.value)} disabled={!items.length}>
            {items.length === 0 ? (
              <option value="">No items available</option>
            ) : (
              items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (Rs. {item.basePrice})
                </option>
              ))
            )}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Custom price"
            value={customPrice}
            onChange={(event) => setCustomPrice(event.target.value)}
          />

          <div className="split-2">
            <button type="button" onClick={addPriceEntry} disabled={isAddDisabled}>Add Entry</button>
            <button type="button" className="primary" onClick={savePriceList} disabled={isSaveDisabled}>
              {saving ? 'Saving...' : 'Save Price List'}
            </button>
          </div>

          {priceEntries.length > 0 && (
            <div className="items-data-container" style={{ marginTop: '1rem' }}>
              {priceEntries.map((entry) => {
                const item = items.find((it) => it.id === entry.itemId);
                return (
                  <p key={entry.itemId} className="list-line">
                    {item?.name || entry.itemId}: Rs. {Number(entry.customPrice).toFixed(2)}
                  </p>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
