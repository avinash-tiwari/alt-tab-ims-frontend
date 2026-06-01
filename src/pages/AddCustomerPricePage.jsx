import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import {
  getCustomer,
  listItems,
  setCustomerPrices,
  getCustomerPrices
} from '../api';
import { formatCurrency } from '../utils/orderUtils';
import Input from '../components/ui/Input';

export default function AddCustomerPricePage({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showIncompleteError, setShowIncompleteError] = useState(false);
  
  const [priceEntries, setPriceEntries] = useState([{ itemId: '', customPrice: '' }]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [customerData, itemsData, pricesData] = await Promise.all([
        getCustomer(token, id),
        listItems(token),
        getCustomerPrices(token, id)
      ]);
      setCustomer(customerData);
      const itemsList = Array.isArray(itemsData) ? itemsData : [];
      setItems(itemsList);
      
      const priceList = Array.isArray(pricesData) ? pricesData : [];
      if (priceList.length > 0) {
        setPriceEntries(priceList.map(p => ({
          itemId: String(p.itemId),
          customPrice: String(Math.trunc(Number(p.customPrice)))
        })));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, token]);

  const handleAddEntry = () => {
    const incompleteEntry = priceEntries.find(entry => !entry.itemId || entry.customPrice === '');
    if (incompleteEntry) {
      setShowIncompleteError(true);
      return;
    }
    setShowIncompleteError(false);
    setError('');
    setPriceEntries([...priceEntries, { itemId: '', customPrice: '' }]);
  };

  const handleRemoveEntry = (index) => {
    setError('');
    setShowIncompleteError(false);
    setPriceEntries(priceEntries.filter((_, idx) => idx !== index));
  };

  const handleEntryChange = (index, field, value) => {
    setError('');
    if ((field === 'itemId' || field === 'customPrice') && value) {
      // Check if the other required field in this entry is also filled
      const entry = priceEntries[index];
      const otherField = field === 'itemId' ? 'customPrice' : 'itemId';
      if (entry[otherField]) {
        setShowIncompleteError(false);
      }
    }
    const next = [...priceEntries];
    next[index] = { ...next[index], [field]: value };
    setPriceEntries(next);
  };

  const savePriceList = async (e) => {
    e.preventDefault();
    if (!id) return;
    
    const validEntries = priceEntries.filter(entry => entry.itemId && entry.customPrice !== '');
    
    if (validEntries.length === 0) {
      setError('Add at least one valid custom price before saving.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const formattedPayload = validEntries.map((entry) => ({
        itemId: entry.itemId,
        customPrice: Number(entry.customPrice)
      }));
      await setCustomerPrices(token, id, formattedPayload);
      setSaving(false);
      navigate(`/customer/${id}`);
    } catch (err) {
      setSaving(false);
      setError(err.message || 'Unable to save custom prices.');
    }
  };

  if (loading && !customer) return <div className="page"><p className="muted">Loading...</p></div>;

  const allItemsSelected = priceEntries.length >= items.length && priceEntries.every(e => e.itemId);

  return (
    <section 
      className="page" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'hsl(var(--background))',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem'
      }}
    >
      <div className="add-customer-sticky-header" style={{ paddingBottom: '1rem', flexShrink: 0, position: 'relative', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>ADD CUSTOM PRICE</h3>
            <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>For {customer?.name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={savePriceList} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          flex: 1,
          overflowY: 'auto',
          paddingRight: '4px',
        }}>
          {error && <p className="error-text" style={{ margin: 0 }}>{error}</p>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {priceEntries.map((entry, index) => {
              // Filter items: exclude items already selected in OTHER entries
              const otherSelectedIds = priceEntries
                .filter((_, idx) => idx !== index)
                .map(e => e.itemId);
              
              const availableItems = items.filter(it => !otherSelectedIds.includes(String(it.id)));
              const selectedItem = items.find(it => String(it.id) === String(entry.itemId));

              return (
                <div key={index} className="card" style={{ padding: '1rem', margin: 0, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Entry {index + 1}</span>
                    {priceEntries.length > 1 && (
                      <button 
                        type="button" 
                        className="ghost-btn" 
                        onClick={() => handleRemoveEntry(index)}
                        style={{ padding: '4px', color: 'hsl(var(--destructive))' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <select
                      value={entry.itemId}
                      onChange={(e) => handleEntryChange(index, 'itemId', e.target.value)}
                      disabled={saving}
                      required
                    >
                      <option value="">Search item...</option>
                      {availableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({formatCurrency(item.basePrice)})
                        </option>
                      ))}
                    </select>
                    {showIncompleteError && !entry.itemId && (
                      <p className="error-text" style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.5rem', 
                        marginTop: '0.25rem',
                        background: 'transparent',
                        border: 'none'
                      }}>
                        Please select an item to continue.
                      </p>
                    )}
                  </div>

                  <div className="split-2">
                    <Input
                      label="Base Price"
                      value={selectedItem ? formatCurrency(selectedItem.basePrice) : '—'}
                      readOnly
                      disabled={saving}
                    />
                    <Input
                      type="number"
                      step="1"
                      label="Custom Price"
                      placeholder="Price"
                      value={entry.customPrice}
                      onChange={(e) => handleEntryChange(index, 'customPrice', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!allItemsSelected && (
            <button
              type="button"
              onClick={handleAddEntry}
              className="ghost-btn"
              style={{ 
                width: '100%', 
                border: '1px dashed hsl(var(--border))', 
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
          )}
        </div>

        <div className="add-customer-sticky-footer" style={{ position: 'relative', bottom: 0, paddingTop: '1rem' }}>
          <button 
            type="submit" 
            className="primary" 
            disabled={saving || priceEntries.length === 0} 
            style={{ width: '100%', height: '2.5rem', fontSize: '0.9rem', fontWeight: 700 }}
          >
            {saving ? 'Saving...' : 'SAVE PRICE LIST'}
          </button>
        </div>
      </form>
    </section>
  );
}
