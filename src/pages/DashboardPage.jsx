import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, LayoutDashboard, IndianRupee, Activity, TrendingDown, Users, TrendingUp, X, Search, Plus, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import EmptyState from '../components/EmptyState';
import { getDashboardAnalyticsLifetime, getDashboardAnalyticsMonthly, listSpends, createSpend, bulkMarkSpendsStatusTrue } from '../api';
import { formatCurrency } from '../utils/orderUtils';
import Input from '../components/ui/Input';

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

function StatCard({ icon: Icon, label, value, color, bgColor, labelIcon: LabelIcon, onLabelIconClick, onClick }) {
  const iconStyle = {
    padding: '0.5rem',
    background: bgColor || 'hsl(var(--primary) / 0.1)',
    borderRadius: '0.5rem',
    color: color || 'hsl(var(--primary))'
  };

  return (
    <div 
      className="card" 
      onClick={onClick}
      style={{ 
        padding: '1rem', 
        marginBottom: 0, 
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'transform 0.1s ease, background-color 0.1s ease' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={iconStyle}>
          <Icon size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <p className="helper-text" style={{ margin: 0, fontSize: '0.75rem' }}>{label}</p>
            {LabelIcon && (
              <div style={{ color: 'hsl(var(--muted-foreground))', display: 'flex' }}>
                <LabelIcon size={12} />
              </div>
            )}
          </div>
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

function AnalyticsTotals({ totals, analytics, onShowLowStock }) {
  const profit = parseFloat(totals?.profit || 0);
  const lowStockCount = analytics?.lowStockItems?.length || 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
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
      {profit >= 0 ? (
        <StatCard
          icon={TrendingUp}
          label="PROFIT"
          value={formatCurrency(profit)}
          color="#15803d"
          bgColor="#dcfce7"
        />
      ) : (
        <StatCard
          icon={TrendingDown}
          label="LOSS"
          value={formatCurrency(Math.abs(profit))}
          color="#b91c1c"
          bgColor="#fee2e2"
        />
      )}
      {lowStockCount > 0 && (
        <StatCard
          icon={Activity}
          label="Low Stock"
          value={lowStockCount}
          color="#b91c1c"
          bgColor="#fee2e2"
          labelIcon={Info}
          onClick={onShowLowStock}
        />
      )}
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

function CreateSpendModal({ token, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ itemName: '', price: '', quantity: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createSpend(token, {
        itemName: formData.itemName,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        status: true
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'hsl(var(--background))',
      zIndex: 1000,
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid hsl(var(--border))',
        marginBottom: '1rem'
      }}>
        <h3 style={{ margin: 0 }}>Create Spend</h3>
        <button
          type="button"
          className="ghost-btn"
          onClick={onClose}
          aria-label="Close"
          disabled={loading}
          style={{ padding: '0.25rem' }}
        >
          <X size={24} />
        </button>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
          <div className="stack-form">
            <Input
              label="Item Name"
              value={formData.itemName}
              onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
              required
            />
            <div className="split-2">
              <Input
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                required
                step="0.01"
              />
              <Input
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
          </div>
        </div>

        <footer style={{
          marginTop: 'auto',
          paddingTop: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          borderTop: '1px solid hsl(var(--border) / 0.5)'
        }}>
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={loading}
            style={{ width: '100%', height: '2.75rem' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={loading}
            style={{ width: '100%', height: '2.75rem' }}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function SpendsTab({ token }) {
  const [spends, setSpends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', status: 'verified' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchSpends = async () => {
    setLoading(true);
    setError('');
    setSelectedIds([]);
    try {
      const query = {
        q: filters.q,
        limit: 200 // Max allowed by backend
      };
      if (filters.status !== 'all') {
        query.status = filters.status === 'verified';
      }
      const data = await listSpends(token, query);
      setSpends(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpends();
  }, [filters, token]);

  const stats = useMemo(() => {
    const total = spends.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    return {
      total,
      count: spends.length,
      verifiedCount: spends.filter(s => s.status).length,
      pendingCount: spends.filter(s => !s.status).length
    };
  }, [spends]);

  const toggleSelectAll = () => {
    if (selectedIds.length === spends.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(spends.map(s => s.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    setVerifying(true);
    setError('');
    try {
      await bulkMarkSpendsStatusTrue(token, { ids: selectedIds });
      fetchSpends();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {isModalOpen && (
        <CreateSpendModal
          token={token}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchSpends();
          }}
        />
      )}
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
        <StatCard
          icon={TrendingDown}
          label="Total Spent"
          value={formatCurrency(stats.total)}
        />
        <StatCard
          icon={Activity}
          label="Total Spends"
          value={stats.count}
        />
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Search items..."
              value={filters.q}
              onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{
              width: 'auto',
              padding: '0.5rem',
              borderRadius: 'var(--radius)',
              border: '1px solid hsl(var(--border))',
              fontSize: '0.875rem'
            }}
          >
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {selectedIds.length > 0 && filters.status === 'pending' && (
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="primary" 
              onClick={handleBulkVerify} 
              disabled={verifying}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
            >
              <Check size={16} />
              {verifying ? 'Verifying...' : `Verify ${selectedIds.length} Selected`}
            </button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="chart-table">
            <thead>
              <tr>
                {filters.status === 'pending' && (
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={spends.length > 0 && selectedIds.length === spends.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th>Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Total</th>
                <th className="text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={filters.status === 'pending' ? 5 : 4} className="text-center helper-text">Loading...</td>
                </tr>
              ) : spends.length === 0 ? (
                <tr>
                  <td colSpan={filters.status === 'pending' ? 5 : 4} className="text-center helper-text">No spends found</td>
                </tr>
              ) : (
                spends.map((spend) => (
                  <tr key={spend.id}>
                    {filters.status === 'pending' && (
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(spend.id)}
                          onChange={() => toggleSelect(spend.id)}
                        />
                      </td>
                    )}
                    <td>
                      <div style={{ fontWeight: 600 }}>{spend.itemName}</div>
                    </td>
                    <td className="text-right">{spend.quantity}</td>
                    <td className="text-right">{formatCurrency(spend.total)}</td>
                    <td className="text-right">
                      <div style={{ fontSize: '0.875rem' }}>
                        {new Date(spend.createdAt).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: '2-digit',
                          year: '2-digit'
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        className="floating-action-btn"
        onClick={() => setIsModalOpen(true)}
        title="Add Spend"
        style={{ bottom: '5rem' }}
      >
        <Plus size={24} />
      </button>
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

  const handleCloseLowStockModal = () => {
    setShowLowStockModal(false);
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('lowStockAlertShownDate', today);
    } catch (err) {
      console.error('Failed to save low stock alert state', err);
    }
  };

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
    if (activeTab === 'lifetime' || activeTab === 'spends') return;

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
      const today = new Date().toISOString().split('T')[0];
      const lastShownDate = localStorage.getItem('lowStockAlertShownDate');

      if (lastShownDate !== today) {
        setShowLowStockModal(true);
        setHasShownModal(true);
        const timer = setTimeout(() => {
          handleCloseLowStockModal();
        }, 5000);
        return () => clearTimeout(timer);
      }
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
          onClose={handleCloseLowStockModal}
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
          <button
            type="button"
            className="chart-toggle-btn"
            style={{
              flex: 1,
              padding: '0.5rem',
              background: activeTab === 'spends' ? 'hsl(var(--primary) / 0.15)' : 'transparent',
              color: activeTab === 'spends' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              fontWeight: activeTab === 'spends' ? 700 : 500,
              boxShadow: activeTab === 'spends' ? 'none' : 'none'
            }}
            onClick={() => setActiveTab('spends')}
          >
            Spends
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
        {error && activeTab !== 'spends' ? (
          <p className="form-error" style={{ marginBottom: '1rem' }}>
            {error}
          </p>
        ) : null}

        {activeTab === 'spends' ? (
          <SpendsTab token={token} />
        ) : (
          <>
            {loading && !analytics ? <p className="helper-text">Loading analytics…</p> : null}

            {analytics?.totals ? (
              <>
                <AnalyticsTotals 
                  totals={analytics.totals} 
                  analytics={analytics} 
                  onShowLowStock={() => setShowLowStockModal(true)}
                />
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
          </>
        )}
      </div>
    </section>
  );
}
