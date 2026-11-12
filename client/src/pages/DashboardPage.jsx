import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ArrowLeftRight,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import GettingStartedGuide from '../components/GettingStartedGuide';
import { formatCurrency, formatDateTime, formatNumber } from '../utils/formatters';

function MetricCard({ label, value, hint, to }) {
  const inner = (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [chartData, setChartData] = useState({
    stockByCategory: [],
    movementSeries: [],
  });
  const [guideDismissed, setGuideDismissed] = useState(
    () => localStorage.getItem('stockflow_hide_guide') === 'true'
  );

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, recentRes, chartRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-transactions?limit=6'),
        api.get('/dashboard/stock-chart'),
      ]);

      setStats(statsRes.data.data.stats);
      setLowStockAlerts(statsRes.data.data.lowStockAlerts || []);
      setRecentTransactions(recentRes.data.data.transactions || []);
      setChartData(chartRes.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleDismissGuide = () => {
    localStorage.setItem('stockflow_hide_guide', 'true');
    setGuideDismissed(true);
  };

  const handleShowGuide = () => {
    localStorage.removeItem('stockflow_hide_guide');
    setGuideDismissed(false);
  };

  if (loading) {
    return <LoadingSpinner size="lg" label="Loading overview..." />;
  }

  const isDark = theme === 'dark';
  const attentionCount = (stats?.lowStockCount || 0) + (stats?.outOfStockCount || 0);
  const firstName = (user?.name || 'there').split(' ')[0];
  const isFreshWorkspace = (stats?.totalProducts || 0) === 0 && (stats?.totalCategories || 0) === 0;
  const showGuide = !guideDismissed || isFreshWorkspace;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Track your products, stock levels, and inventory value in ₹ from one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {guideDismissed && !isFreshWorkspace && (
            <button
              type="button"
              onClick={handleShowGuide}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Show Guide
            </button>
          )}
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Link>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Update Stock
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Reports
          </Link>
        </div>
      </div>

      {/* Step-by-Step Interactive Onboarding Guide */}
      {showGuide && (
        <GettingStartedGuide stats={stats} onDismiss={handleDismissGuide} />
      )}

      {/* 4 Clean Key Metrics (starts at 0) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Products"
          value={formatNumber(stats?.totalProducts)}
          hint={`Across ${formatNumber(stats?.totalCategories)} categories`}
          to="/products"
        />
        <MetricCard
          label="Total Units in Stock"
          value={formatNumber(stats?.totalInventoryUnits)}
          hint={`${formatNumber(stats?.totalTransactions)} movements logged`}
          to="/inventory"
        />
        <MetricCard
          label="Inventory Value"
          value={formatCurrency(stats?.totalInventoryValuation)}
          hint={`Selling value: ${formatCurrency(stats?.totalRetailValuation)}`}
          to="/reports"
        />
        <MetricCard
          label="Needs Restocking"
          value={formatNumber(attentionCount)}
          hint={`${formatNumber(stats?.lowStockCount)} low · ${formatNumber(stats?.outOfStockCount)} out of stock`}
          to="/inventory?status=low_stock"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-neutral-950 dark:text-white">
                Stock Activity (Last 14 Days)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Units added vs units removed each day
              </p>
            </div>
            <Link
              to="/transactions"
              className="text-xs text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            >
              View all →
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.movementSeries}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#262626' : '#e5e5e5'}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#737373' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#737373' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`,
                    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                    color: isDark ? '#ffffff' : '#0a0a0a',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="stockIn"
                  name="Stock IN"
                  fill={isDark ? '#ffffff' : '#171717'}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="stockOut"
                  name="Stock OUT"
                  fill={isDark ? '#525252' : '#a3a3a3'}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock by Category */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-neutral-950 dark:text-white">
                Units by Category
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Breakdown across your categories
              </p>
            </div>
            <Link
              to="/categories"
              className="text-xs text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            >
              Manage →
            </Link>
          </div>

          {chartData.stockByCategory.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center text-center">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                No categories created yet.
              </p>
              <Link
                to="/categories?guide=1"
                className="mt-2.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-800 dark:text-white dark:hover:bg-neutral-900"
              >
                Create First Category
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {chartData.stockByCategory.map((cat) => {
                const maxUnits = Math.max(
                  1,
                  ...chartData.stockByCategory.map((c) => c.totalUnits)
                );
                const pct = Math.round((cat.totalUnits / maxUnits) * 100);
                return (
                  <div key={cat.id || cat.category}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                        {cat.category}
                      </span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {formatNumber(cat.totalUnits)} units
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
                      <div
                        className="h-full rounded-full bg-neutral-950 dark:bg-white"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity & Restock Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
            <h2 className="text-sm font-medium text-neutral-950 dark:text-white">
              Recent Stock Movements
            </h2>
            <Link
              to="/transactions"
              className="text-xs text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            >
              View ledger →
            </Link>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {recentTransactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-neutral-500">
                No stock movements yet. Every Stock IN or OUT you record will appear here.
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs ${
                        tx.type === 'IN'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400'
                      }`}
                    >
                      {tx.type === 'IN' ? (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-neutral-950 dark:text-white">
                        {tx.product_name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {tx.previous_stock} → {tx.new_stock} units · {formatDateTime(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-neutral-950 dark:text-white">
                    {tx.type === 'IN' ? `+${tx.quantity}` : `-${tx.quantity}`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
            <h2 className="text-sm font-medium text-neutral-950 dark:text-white">
              Items Needing Attention
            </h2>
            <Link
              to="/inventory"
              className="text-xs text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            >
              Restock →
            </Link>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {lowStockAlerts.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-neutral-500">
                No low-stock alerts yet. Products below their minimum stock threshold show up here.
              </div>
            ) : (
              lowStockAlerts.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-neutral-950 dark:text-white">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                      {item.quantity} left (min {item.min_stock_level})
                    </p>
                  </div>
                  <StatusBadge quantity={item.quantity} minStockLevel={item.min_stock_level} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
