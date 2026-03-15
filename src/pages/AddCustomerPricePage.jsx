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
    if (!itemId || !customPrice) return;
    setPriceEntries((prev) => {
      const filtered = prev.filter((entry) => entry.itemId !== itemId);
      return [...filtered, { itemId, customPrice: Number(customPrice) }];
    });
    setItemId('');
    setCustomPrice('');
  };

  const savePriceList = async () => {
    if (!id || priceEntries.length === 0) return;
    setError('');
    try {
      await setCustomerPrices(token, id, priceEntries);
      setPriceEntries([]);
      navigate(`/customer/${id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && !customer) return <div className="page"><p className="muted">Loading...</p></div>;

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h3 style={{ margin: 0 }}>ADD CUSTOM PRICE</h3>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {error && <p className="error-text">{error}</p>}
        <article className="card stack-form">
          <h3 className="items-heading">For {customer?.name}</h3>
          
          <select value={itemId} onChange={(event) => setItemId(event.target.value)}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (Rs. {item.basePrice})
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Custom price"
            value={customPrice}
            onChange={(event) => setCustomPrice(event.target.value)}
          />

          <div className="split-2">
            <button type="button" onClick={addPriceEntry}>Add Entry</button>
            <button type="button" className="primary" onClick={savePriceList}>Save Price List</button>
          </div>

          {priceEntries.length > 0 && (
            <div className="items-data-container" style={{ marginTop: '1rem' }}>
              {priceEntries.map((entry) => {
                const item = items.find((it) => it.id === entry.itemId);
                return (
                  <p key={entry.itemId} className="list-line">
                    {item?.name || entry.itemId}: Rs. {entry.customPrice}
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
