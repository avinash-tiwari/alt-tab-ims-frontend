import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { getDashboardAnalyticsLifetime, getDashboardAnalyticsMonthly } from '../api';
import { formatCurrency } from '../utils/orderUtils';

const formatYearMonth = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const toMonthDate = (yearMonth) => {
  if (!yearMonth || typeof yearMonth !== 'string') {
    return new Date();
  }

  const [rawYear, rawMonth] = yearMonth.split('-');
  const year = Number(rawYear);
  const monthIndex = Number(rawMonth) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return new Date();
  }

  return new Date(year, monthIndex, 1);
};

const addMonths = (yearMonth, delta) => {
  const base = toMonthDate(yearMonth);
  const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return formatYearMonth(next);
};

const formatRange = (range) => {
  if (!range?.start || !range?.end) return '';
  const start = new Date(range.start);
  const end = new Date(range.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  const startLabel = start.toLocaleDateString('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata'
  });
  const endLabel = end.toLocaleDateString('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata'
  });
  return `${startLabel} → ${endLabel}`;
};

function AnalyticsTotals({ totals }) {
  const totalOrders = totals?.totalOrders ?? '—';
  const totalOrderAmount = formatCurrency(totals?.totalOrderAmount);
  const amountReceived = formatCurrency(totals?.amountReceived);
  const totalCredits = formatCurrency(totals?.totalCredits);
  const totalSpends = formatCurrency(totals?.totalSpends);

  return (
    <div className="customer-stats-grid" style={{ marginBottom: '1rem' }}>
      <div className="stat-item">
        <div className="stat-pill">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{totalOrders}</div>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-pill">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value">{totalOrderAmount}</div>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-pill">
          <div className="stat-label">Amount Received</div>
          <div className="stat-value">{amountReceived}</div>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-pill">
          <div className="stat-label">Total Credits</div>
          <div className="stat-value">{totalCredits}</div>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-pill">
          <div className="stat-label">Total Spends</div>
          <div className="stat-value">{totalSpends}</div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsLists({ analytics }) {
  const topSellingItems = Array.isArray(analytics?.topSellingItems) ? analytics.topSellingItems : [];
  const topSpentItems = Array.isArray(analytics?.topSpentItems) ? analytics.topSpentItems : [];
  const lowStockItems = Array.isArray(analytics?.lowStockItems) ? analytics.lowStockItems : [];
  const topPaidCustomers = Array.isArray(analytics?.topPaidCustomers) ? analytics.topPaidCustomers : [];

  return (
    <>
      <div className="card">
        <h3>Top selling items</h3>
        {topSellingItems.length ? (
          topSellingItems.map((item) => (
            <p className="list-line" key={item.itemId ?? item.itemName}>
              <strong>{item.itemName || 'Item'}</strong> — Qty {item.quantity ?? '—'} @ {formatCurrency(item.unitPrice)}
            </p>
          ))
        ) : (
          <p className="muted">No top selling items found.</p>
        )}
      </div>

      <div className="card">
        <h3>Top spent items</h3>
        {topSpentItems.length ? (
          topSpentItems.map((item, index) => (
            <p className="list-line" key={`${item.itemName ?? 'item'}-${index}`}>
              <strong>{item.itemName || 'Item'}</strong> — Qty {item.quantity ?? '—'} @ {formatCurrency(item.unitPrice)} (
              Total {formatCurrency(item.totalSpent)})
            </p>
          ))
        ) : (
          <p className="muted">No spent items found.</p>
        )}
      </div>

      <div className="card">
        <h3>Low stock items</h3>
        {lowStockItems.length ? (
          lowStockItems.map((item) => (
            <p className="list-line" key={item.id ?? item.name}>
              <strong>{item.name || 'Item'}</strong> — Stock {item.stock ?? '—'} (Threshold {item.threshold ?? '—'})
            </p>
          ))
        ) : (
          <p className="muted">No low stock items found.</p>
        )}
      </div>

      <div className="card">
        <h3>Top paid customers</h3>
        {topPaidCustomers.length ? (
          topPaidCustomers.map((customer) => (
            <p
              className="list-line"
              key={customer.customerId ?? `${customer.customerName}-${customer.customerIdentifier}`}
            >
              <strong>{customer.customerName || 'Customer'}</strong>
              {customer.customerIdentifier ? ` (${customer.customerIdentifier})` : ''} — {formatCurrency(customer.amountPaid)}
            </p>
          ))
        ) : (
          <p className="muted">No paid customers found.</p>
        )}
      </div>
    </>
  );
}

export default function DashboardPage({ token }) {
  const [activeTab, setActiveTab] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(() => formatYearMonth(new Date()));

  const [monthAnalytics, setMonthAnalytics] = useState(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState('');

  const [lifetimeAnalytics, setLifetimeAnalytics] = useState(null);
  const [lifetimeLoading, setLifetimeLoading] = useState(false);
  const [lifetimeError, setLifetimeError] = useState('');

  const monthLabel = useMemo(() => {
    const date = toMonthDate(selectedMonth);
    return date.toLocaleString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  }, [selectedMonth]);

  const rangeLabel = useMemo(() => {
    if (activeTab !== 'month') return '';
    return formatRange(monthAnalytics?.range);
  }, [activeTab, monthAnalytics?.range]);

  useEffect(() => {
    if (!token) return;
    if (activeTab !== 'month') return;

    let alive = true;
    const load = async () => {
      setMonthLoading(true);
      setMonthError('');
      try {
        const data = await getDashboardAnalyticsMonthly(token, selectedMonth);
        if (alive) {
          setMonthAnalytics(data || null);
        }
      } catch (err) {
        if (alive) {
          setMonthError(err.message);
          setMonthAnalytics(null);
        }
      } finally {
        if (alive) {
          setMonthLoading(false);
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [activeTab, selectedMonth, token]);

  useEffect(() => {
    if (!token) return;
    if (activeTab !== 'lifetime') return;
    if (lifetimeAnalytics) return;

    let alive = true;
    const load = async () => {
      setLifetimeLoading(true);
      setLifetimeError('');
      try {
        const data = await getDashboardAnalyticsLifetime(token);
        if (alive) {
          setLifetimeAnalytics(data || null);
        }
      } catch (err) {
        if (alive) {
          setLifetimeError(err.message);
          setLifetimeAnalytics(null);
        }
      } finally {
        if (alive) {
          setLifetimeLoading(false);
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [activeTab, lifetimeAnalytics, token]);

  if (!token) {
    return (
      <section className="page">
        <EmptyState
          icon={LayoutDashboard}
          title="Dashboard"
          description="Login to view your analytics."
        />
      </section>
    );
  }

  const analytics = activeTab === 'month' ? monthAnalytics : lifetimeAnalytics;
  const loading = activeTab === 'month' ? monthLoading : lifetimeLoading;
  const error = activeTab === 'month' ? monthError : lifetimeError;

  return (
    <section className="page">
      <div className="page-tabs" style={{ marginBottom: '0.75rem', whiteSpace: 'nowrap', marginTop: '0.5rem' }}>
        <button
          type="button"
          className={`page-tab-btn ${activeTab === 'month' ? 'active' : ''}`}
          onClick={() => setActiveTab('month')}
        >
          Month
        </button>
        <button
          type="button"
          className={`page-tab-btn ${activeTab === 'lifetime' ? 'active' : ''}`}
          onClick={() => setActiveTab('lifetime')}
        >
          Lifetime
        </button>
      </div>

      {activeTab === 'month' && (
        <div
          className="card"
          style={{
            padding: '0.75rem 0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}
        >
          <button
            type="button"
            className="ghost-btn"
            aria-label="Previous month"
            onClick={() => setSelectedMonth((prev) => addMonths(prev, -1))}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontWeight: 800, letterSpacing: '-0.01em' }} className="truncate">
              {monthLabel}
            </div>
            {rangeLabel ? <p className="helper-text" style={{ margin: 0 }}>{rangeLabel}</p> : null}
          </div>

          <button
            type="button"
            className="ghost-btn"
            aria-label="Next month"
            onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {error ? (
        <p className="form-error" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}

      {loading && !analytics ? <p className="helper-text">Loading analytics…</p> : null}

      {analytics?.totals ? (
        <>
          <AnalyticsTotals totals={analytics.totals} />
          <AnalyticsLists analytics={analytics} />
        </>
      ) : !loading ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No analytics yet"
          description={activeTab === 'month' ? 'No metrics found for this month.' : 'No lifetime metrics found yet.'}
        />
      ) : null}
    </section>
  );
}
