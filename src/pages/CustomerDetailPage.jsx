import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Download, Pencil, Plus, Share2, Phone, MapPin, ExternalLink } from 'lucide-react';
import {
  getCustomer,
  listItems,
  downloadCustomerDeliveredOrdersPDF,
  getCustomerPrices
} from '../api';
import { formatCurrency } from '../utils/orderUtils';

const CustomerDetailSkeleton = () => (
  <div className="page">
    <div className="sticky-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-title" style={{ width: '50%', marginBottom: '4px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '30%', height: '12px' }}></div>
        </div>
      </div>
    </div>
    <div className="customers-list-container" style={{ paddingTop: '1rem' }}>
      <div className="card" style={{ padding: '1rem' }}>
        <div className="customer-stats-bar">
          <div className="stat-pill" style={{ flex: 1 }}><div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div><div className="skeleton" style={{ width: '60%', height: '16px' }}></div></div>
          <div className="stat-pill" style={{ flex: 1 }}><div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div><div className="skeleton" style={{ width: '60%', height: '16px' }}></div></div>
          <div className="stat-pill" style={{ flex: 1 }}><div className="skeleton" style={{ width: '40%', height: '8px', marginBottom: '4px' }}></div><div className="skeleton" style={{ width: '60%', height: '16px' }}></div></div>
        </div>
      </div>
      <div className="skeleton" style={{ height: '100px', width: '100%', borderRadius: 'var(--radius)', marginTop: '1rem' }}></div>
      <div className="skeleton" style={{ height: '200px', width: '100%', borderRadius: 'var(--radius)', marginTop: '1rem' }}></div>
    </div>
  </div>
);

export default function CustomerDetailPage({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [priceList, setPriceList] = useState([]);
  const [shareProcessing, setShareProcessing] = useState(false);
  const copyTimeoutRef = useRef(null);

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
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setPriceList(Array.isArray(pricesData) ? pricesData : []);
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

  if (loading && !customer) return <CustomerDetailSkeleton />;
  if (!customer && !loading) return <div className="page"><p className="muted">Customer not found.</p></div>;

  const rawIdentifier = customer ? (customer.identifier ?? customer.customerIdentifier ?? customer.id) : '';
  const customerIdentifier = String(rawIdentifier || '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const querySuffix = token ? `?tenantToken=${encodeURIComponent(token)}` : '';
  const publicOrderLink = customerIdentifier
    ? `${origin}/public/orders/${encodeURIComponent(customerIdentifier)}${querySuffix}`
    : '';
  const statsData = [
    {
      label: 'Spent',
      value: `₹ ${formatCurrency(customer?.totalSpent ?? '0')}`
    },
    {
      label: 'Credits',
      value: `₹ ${formatCurrency(customer?.totalCredits ?? '0')}`
    },
    {
      label: 'Total Due',
      value: `₹ ${formatCurrency(customer?.totalDue ?? '0')}`
    },
    {
      label: 'Total Orders',
      value: String(customer?.totalOrders ?? 0)
    },
    {
      label: 'Active Orders',
      value: String(customer?.activeOrders ?? customer?.activeOrdersCount ?? 0)
    }
  ];

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

  const shareSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShareDeliveredOrdersInvoice = async () => {
    const customerId = customer?.id ?? id;
    if (!customerId) {
      return;
    }

    if (!shareSupported) {
      setError('Your device does not support sharing PDFs.');
      return;
    }

    setShareProcessing(true);
    setError('');
    try {
      const { blob, fileName } = await downloadCustomerDeliveredOrdersPDF(token, customerId);
      const pdfBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' });
      const pdfFile = typeof File === 'function'
        ? new File([pdfBlob], fileName, { type: 'application/pdf' })
        : pdfBlob;

      if (navigator.canShare && typeof navigator.canShare === 'function' && !navigator.canShare({ files: [pdfFile] })) {
        throw new Error('Sharing PDFs is not supported by your browser.');
      }

      await navigator.share({
        title: `${customer?.name || 'Customer'} delivered orders`,
        text: `Delivered orders invoice for ${customer?.name || 'your customer'}.`,
        files: [pdfFile]
      });
    } catch (err) {
      setError(err?.message || 'Unable to share the PDF.');
    } finally {
      setShareProcessing(false);
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
      const { blob, fileName } = await downloadCustomerDeliveredOrdersPDF(token, customerId);
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
      setInvoiceDownloading(false);
    }
  };

  return (
    <section className="page">
      <div className="sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)} style={{ padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <h3 className="customer-name-heading" style={{ fontSize: '1.25rem' }}>{customer?.name}</h3>
            <div className="customer-details" style={{ marginTop: '0.25rem' }}>
               {customer?.phone && (
                 <div className="detail-item">
                   <Phone size={12} className="detail-icon" />
                   <a href={`tel:${customer.phone}`} className="detail-link" onClick={(e) => e.stopPropagation()}>{customer.phone}</a>
                 </div>
               )}
               <div className="detail-item">
                 <MapPin size={12} className="detail-icon" />
                 <a 
                   href={customer?.locationLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([customer?.addressLine1, customer?.city, customer?.postalCode].filter(Boolean).join(', '))}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="detail-link"
                   onClick={(e) => e.stopPropagation()}
                 >
                   {[customer?.city, customer?.postalCode].filter(Boolean).join(', ') || 'No location'}
                 </a>
               </div>
            </div>
          </div>
          <div className="col-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={handleDownloadDeliveredOrdersInvoice}
              disabled={invoiceDownloading}
              title="Download Invoice"
            >
              <Download size={18} />
            </button>
            {shareSupported && (
              <button
                type="button"
                className="ghost-btn"
                onClick={handleShareDeliveredOrdersInvoice}
                disabled={shareProcessing}
                title="Share Invoice"
              >
                <Share2 size={18} />
              </button>
            )}
            <button
              type="button"
              className="ghost-btn"
              onClick={() => navigate(`/customers/actions/${id}`)}
              title="Edit Customer"
            >
              <Pencil size={18} />
            </button>
          </div>
        </div>
      </div>
      {error ? (
        <p className="error-text" style={{ margin: '1rem 0 0' }}>
          {error}
        </p>
      ) : null}

        <div className="card public-link-card" style={{ marginTop: '1rem' }}>
          <div className="public-link-row">
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '20px', fontWeight: 700, textTransform: 'capitalize', placeItems: 'center' }}>{customer?.name} - Link</h4>
            </div>
            {customerIdentifier && (
              <div className="col-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => window.open(publicOrderLink, '_blank')}
                  title="Open Link"
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleCopyLink}
                  title="Copy Link"
                >
                  <Copy size={16} />
                </button>
              </div>
            )}
          </div>
          {!customerIdentifier && (
            <p className="error-text" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>
              Assign an identifier to generate a link.
            </p>
          )}
          {copyStatus && <p className="success-text" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>{copyStatus}</p>}
        </div>
        
      <div className="customer-detail-content">
        <div className="card" style={{ padding: '1rem' }}>
          <div className="customer-stats-bar">
            <div className="stat-pill">
              <span className="stat-label">Spent</span>
              <span className="stat-value">₹{formatCurrency(customer?.totalSpent ?? '0')}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Credits</span>
              <span className="stat-value warning">₹{formatCurrency(customer?.totalCredits ?? '0')}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Due</span>
              <span className="stat-value destructive">₹{formatCurrency(customer?.totalDue ?? '0')}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Orders</span>
              <span className="stat-value">{customer?.totalOrders ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>CUSTOM PRICES</h4>
          </div>
          <div className="items-data-container">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th style={{ textAlign: 'right' }}>Base / Custom</th>
                </tr>
              </thead>
              <tbody>
                {priceList.length > 0 ? (
                  priceList.map((price) => {
                    const item = price.item || items.find((it) => it.id === price.itemId);
                    return (
                      <tr key={price.itemId}>
                        <td style={{ fontWeight: 500 }}>{item?.name || price.itemId}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="muted" style={{ fontSize: '0.8rem' }}>₹{item?.basePrice || 0}</span>
                          <span style={{ margin: '0 0.4rem', opacity: 0.3 }}>/</span>
                          <strong style={{ color: 'hsl(var(--primary))' }}>₹{price.customPrice}</strong>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
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
