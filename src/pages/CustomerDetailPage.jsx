import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Download, Pencil, Plus } from 'lucide-react';
import {
  getCustomer,
  listItems,
  downloadCustomerDeliveredOrdersPDF
} from '../api';

export default function CustomerDetailPage({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const copyTimeoutRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [customerData, itemsData] = await Promise.all([
        getCustomer(token, id),
        listItems(token)
      ]);
      setCustomer(customerData);
      setItems(Array.isArray(itemsData) ? itemsData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  if (loading && !customer) return <div className="page"><p className="muted">Loading...</p></div>;
  if (!customer && !loading) return <div className="page"><p className="muted">Customer not found.</p></div>;

  const rawIdentifier = customer ? (customer.identifier ?? customer.customerIdentifier ?? customer.id) : '';
  const customerIdentifier = String(rawIdentifier || '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const querySuffix = token ? `?tenantToken=${encodeURIComponent(token)}` : '';
  const publicOrderLink = customerIdentifier
    ? `${origin}/public/orders/${encodeURIComponent(customerIdentifier)}${querySuffix}`
    : '';
  const priceList = customer?.priceList || [];

  const showCopyMessage = (message) => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    setCopyStatus(message);
    copyTimeoutRef.current = setTimeout(() => {
      setCopyStatus('');
      copyTimeoutRef.current = null;
    }, 3000);
  };

  const handleCopyLink = async () => {
    if (!publicOrderLink) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicOrderLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = publicOrderLink;
        textarea.readOnly = true;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showCopyMessage('Link copied successfully.');
    } catch (copyError) {
      showCopyMessage('Unable to copy the link. Try again.');
    }
  };

  const handleDownloadDeliveredOrdersInvoice = async () => {
    const customerId = customer?.id ?? id;
    if (!customerId) {
      return;
    }

    setInvoiceDownloading(true);
    setError('');
    try {
      const blob = await downloadCustomerDeliveredOrdersPDF(token, customerId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customer-${customerId}-delivered-orders.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setInvoiceDownloading(false);
    }
  };

  return (
    <section className="page">
      <div className="sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
              <ChevronLeft size={24} />
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0 }}>{customer?.name}</h2>
              <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>{customer?.phone} • {customer?.city}</p>
            </div>
            <button
              type="button"
              className="ghost-btn"
              onClick={handleDownloadDeliveredOrdersInvoice}
              disabled={invoiceDownloading}
              style={{
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="Generate delivered orders invoice"
            >
              <Download size={16} />
              <span style={{ fontSize: '0.85rem' }}>
                {invoiceDownloading ? 'Generating…' : 'Invoice'}
              </span>
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => navigate(`/customers/actions/${id}`)}
              style={{ padding: '0.5rem' }}
            >
              <Pencil size={20} />
            </button>
        </div>
      </div>

      <div className="customer-detail-content" style={{ marginTop: '1rem' }}>
        <div className="customer-stats-grid card">
          <div className="stat-item">
            <span className="stat-label">Total Spent</span>
            <span className="stat-value">₹ 0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Credits</span>
            <span className="stat-value">₹ 0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Orders</span>
            <span className="stat-value">0</span>
          </div>
        </div>

        <div className="card public-link-card">
          <div className="public-link-row">
            <div>
              <p className="stat-label" style={{ margin: 0 }}>Public order link</p>
              <p className="helper-text" style={{ margin: 0 }}>
                Share this URL with the customer so they can place orders directly.
              </p>
            </div>
            {customerIdentifier ? (
              <button
                type="button"
                className="ghost-btn icon-button public-link-copy-btn"
                onClick={handleCopyLink}
              >
                <Copy size={16} />
                <span>Copy link</span>
              </button>
            ) : null}
          </div>
          {!customerIdentifier ? (
            <p className="helper-text" style={{ marginBottom: 0 }}>
              Assign an identifier to the customer record to generate a public order link.
            </p>
          ) : null}
          {copyStatus ? <p className="success-text">{copyStatus}</p> : null}
        </div>

        <div className="customer-items-section card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="items-heading" style={{ margin: 0 }}>CUSTOM PRICES</h3>
          </div>
          <div className="items-data-container">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th style={{ textAlign: 'right' }}>Prices (Base / Custom)</th>
                </tr>
              </thead>
              <tbody>
                {priceList.length > 0 ? (
                  priceList.map((price) => {
                    const item = price.item || items.find((it) => it.id === price.itemId);
                    return (
                      <tr key={price.itemId}>
                        <td>{item?.name || price.itemId}</td>
                        <td style={{ textAlign: 'right' }}>
                          Rs. {item?.basePrice || 0} / <strong>Rs. {price.customPrice}</strong>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '1rem', color: 'hsl(195 85% 30%)' }}>
                      No custom prices defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="floating-action-btn"
        onClick={() => navigate(`/customer/${id}/add`)}
        title="Add Custom Price"
      >
        <Plus size={24} />
      </button>
    </section>
  );
}
