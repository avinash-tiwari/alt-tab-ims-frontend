import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, IndianRupee, Activity, TrendingDown, Users, TrendingUp, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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

const COLORS = ['#6366F1', '#EF4444', '#F59E0B', '#10B981', '#3B82F6'];

function LowStockModal({ items, onClose }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-destructive" style={{ margin: 0 }}>Low Stock Alert!</h3>
          <button className="ghost-btn" onClick={onClose} style={{ padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p className="helper-text" style={{ marginBottom: '1rem' }}>The following items are below their minimum limit:</p>
          {items.map((item) => (
            <div key={item.id ?? item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'hsl(var(--destructive))' }}>{item.name || 'Item'}</div>
                <div className="helper-text" style={{ color: 'hsl(var(--destructive) / 0.8)' }}>Minimum Limit: {item.threshold ?? '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'hsl(var(--destructive))' }}>{item.stock ?? '—'} left</div>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="primary danger" onClick={onClose} style={{ width: '100%' }}>
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, data, type, currency = false }) {
  const [view, setView] = useState('chart');

  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="label">{item.name}</p>
          <p className="value">Revenue: {currency ? formatCurrency(item.value) : item.value}</p>
          {item.quantity !== undefined && <p className="value">Quantity: {item.quantity} units</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{title}</h3>
        <div className="chart-toggle">
          <button
            className={`chart-toggle-btn ${view === 'chart' ? 'active' : ''}`}
            onClick={() => setView('chart')}
          >
            Chart
          </button>
          <button
            className={`chart-toggle-btn ${view === 'table' ? 'active' : ''}`}
            onClick={() => setView('table')}
          >
            Table
          </button>
        </div>
      </div>

      {view === 'chart' ? (
        <>
          <div className="legend-container">
            {data.map((item, index) => (
              <div key={item.name} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RechartsTooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${((value / total) * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="chart-table">
            <thead>
              <tr>
                <th>{type === 'category' ? 'Category' : 'Method'}</th>
                <th className="text-right">Revenue</th>
                {type === 'category' && <th className="text-right">Units</th>}
                <th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td className="text-right">{formatCurrency(item.value)}</td>
                  {type === 'category' && <td className="text-right">{item.quantity}</td>}
                  <td className="text-right">{((item.value / total) * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnalyticsCharts({ analytics, activeTab }) {
  const categoryData = useMemo(() => {
    // Try to use categoryWiseSalesData, fallback to topSellingItems for visualization if needed
    const raw = analytics?.categoryWiseSalesData || analytics?.topSellingItems || [];
    return raw.slice(0, 5).map(c => ({
      name: c.categoryName || c.itemName || 'Unknown',
      value: parseFloat(c.totalEarnings || (c.quantity * (c.unitPrice || 0)) || 0),
      quantity: c.totalUnitsSold || c.quantity || 0
    }));
  }, [analytics]);

  const categorySpendsData = useMemo(() => {
    // Try to use categoryWiseSpendsData, fallback to topSpentItems
    const raw = analytics?.categoryWiseSpendsData || analytics?.topSpentItems || [];
    return raw.slice(0, 5).map(c => ({
      name: c.categoryName || c.itemName || 'Unknown',
      value: parseFloat(c.totalEarnings || c.totalSpent || (c.quantity * (c.unitPrice || 0)) || 0),
      quantity: c.totalUnitsSold || c.quantity || 0
    }));
  }, [analytics]);

  const paymentData = useMemo(() => {
    const raw = analytics?.paymentBreakdown || [];
    return raw.map(p => ({
      name: p.paymentMethod,
      value: parseFloat(p.totalAmount || 0),
      count: p.count || 0
    }));
  }, [analytics]);

  return (
    <>
      <ChartCard
        title="Sales"
        data={categoryData}
        type="category"
        currency
      />
      <ChartCard
        title="Spends"
        data={categorySpendsData}
        type="category"
        currency
      />
      <ChartCard
        title="Payment Method Distribution"
        data={paymentData}
        type="payment"
        currency
      />
    </>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card" style={{ padding: '1rem', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ padding: '0.5rem', background: 'hsl(var(--primary) / 0.1)', borderRadius: '0.5rem', color: 'hsl(var(--primary))' }}>
          <Icon size={20} />
        </div>
        <div>
          <p className="helper-text" style={{ margin: 0, fontSize: '0.75rem' }}>{label}</p>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function EarningsChart({ data }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    amount: parseFloat(day.earnings || 0),
  }));

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Last 7 Days Earnings</h3>
      </div>
      <div className="chart-container" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `₹${value}`}
            />
            <RechartsTooltip 
              cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
            />
            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AnalyticsTotals({ totals }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
      <StatCard 
        icon={Activity} 
        label="Total Orders" 
        value={totals?.totalOrders ?? '—'} 
      />
      <StatCard 
        icon={IndianRupee} 
        label="Total Amount" 
        value={formatCurrency(totals?.totalOrderAmount)} 
      />
      <StatCard 
        icon={TrendingUp} 
        label="Amount Received" 
        value={formatCurrency(totals?.amountReceived)} 
      />
      <StatCard 
        icon={Users} 
        label="Total Udhaari" 
        value={formatCurrency(totals?.totalCredits)} 
      />
      <StatCard 
        icon={Activity} 
        label="Total Bakaya" 
        value={formatCurrency(totals?.totalBakaya)} 
      />
      <StatCard 
        icon={TrendingDown} 
        label="Total Spends" 
        value={formatCurrency(totals?.totalSpends)} 
      />
    </div>
  );
}

function LowStockList({ analytics }) {
  const items = Array.isArray(analytics?.lowStockItems) ? analytics.lowStockItems : [];
  if (items.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>Low Stock Items</h3>
      {items.map((item) => (
        <div key={item.id ?? item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{item.name || 'Item'}</div>
            <div className="helper-text">Minimum Limit: {item.threshold ?? '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: 'hsl(var(--destructive))' }}>{item.stock ?? '—'} in stock</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopPaidCustomersList({ analytics }) {
  const items = Array.isArray(analytics?.topPaidCustomers) ? analytics.topPaidCustomers : [];
  if (items.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>Top Paid Customers</h3>
      {items.map((customer) => (
        <div key={customer.customerId ?? `${customer.customerName}-${customer.customerIdentifier}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{customer.customerName || 'Customer'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>{formatCurrency(customer.amountPaid)}</div>
          </div>
        </div>
      ))}
    </div>
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

  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);

  const monthLabel = useMemo(() => {
    const date = toMonthDate(selectedMonth);
    return date.toLocaleString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  }, [selectedMonth]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'lifetime') return;

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

  const analytics = activeTab === 'lifetime' ? lifetimeAnalytics : monthAnalytics;
  const loading = activeTab === 'lifetime' ? lifetimeLoading : monthLoading;
  const error = activeTab === 'lifetime' ? lifetimeError : monthError;

  useEffect(() => {
    if (analytics?.lowStockItems?.length > 0 && !hasShownModal && !loading) {
      setShowLowStockModal(true);
      setHasShownModal(true);
      const timer = setTimeout(() => {
        setShowLowStockModal(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [analytics, hasShownModal, loading]);

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

  return (
    <section className="page">
      {showLowStockModal && (
        <LowStockModal 
          items={analytics?.lowStockItems} 
          onClose={() => setShowLowStockModal(false)} 
        />
      )}
      <div 
        className="sticky-header" 
        style={{ 
          top: '3.5rem', 
          zIndex: 45, 
          paddingBottom: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div 
          style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            background: 'hsl(var(--muted) / 0.5)', 
            padding: '0.25rem', 
            borderRadius: 'var(--radius)' 
          }}
        >
          <button
            type="button"
            className="chart-toggle-btn"
            style={{ 
              flex: 1, 
              padding: '0.5rem',
              background: activeTab === 'month' ? 'hsl(var(--primary) / 0.15)' : 'transparent',
              color: activeTab === 'month' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              fontWeight: activeTab === 'month' ? 700 : 500,
              boxShadow: activeTab === 'month' ? 'none' : 'none'
            }}
            onClick={() => setActiveTab('month')}
          >
            Month
          </button>
          <button
            type="button"
            className="chart-toggle-btn"
            style={{ 
              flex: 1, 
              padding: '0.5rem',
              background: activeTab === 'lifetime' ? 'hsl(var(--primary) / 0.15)' : 'transparent',
              color: activeTab === 'lifetime' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              fontWeight: activeTab === 'lifetime' ? 700 : 500,
              boxShadow: activeTab === 'lifetime' ? 'none' : 'none'
            }}
            onClick={() => setActiveTab('lifetime')}
          >
            Lifetime
          </button>
        </div>

        {activeTab === 'month' && (
          <div
            style={{
              padding: '0.4rem 0.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
            }}
          >
            <button
              type="button"
              className="ghost-btn"
              style={{ padding: '0.25rem' }}
              aria-label="Previous month"
              onClick={() => setSelectedMonth((prev) => addMonths(prev, -1))}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ fontWeight: 700, fontSize: '0.9rem' }} className="truncate">
              {monthLabel}
            </div>

            <button
              type="button"
              className="ghost-btn"
              style={{ padding: '0.25rem' }}
              aria-label="Next month"
              onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '0.5rem' }}>
        {error ? (
          <p className="form-error" style={{ marginBottom: '1rem' }}>
            {error}
          </p>
        ) : null}

        {loading && !analytics ? <p className="helper-text">Loading analytics…</p> : null}

        {analytics?.totals ? (
          <>
            <AnalyticsTotals totals={analytics.totals} />
            <LowStockList analytics={analytics} />
            <EarningsChart data={analytics.last7DaysEarnings} />
            <AnalyticsCharts analytics={analytics} activeTab={activeTab} />
            <TopPaidCustomersList analytics={analytics} />
          </>
        ) : !loading ? (
          <EmptyState
            icon={LayoutDashboard}
            title="No analytics yet"
            description={activeTab === 'lifetime' ? 'No lifetime metrics found yet.' : 'No metrics found for this period.'}
          />
        ) : null}
      </div>
    </section>
  );
}
