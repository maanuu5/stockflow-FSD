import { useEffect, useState, useCallback } from 'react';
import { Download, PackageCheck } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api, { getErrorMessage } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatDateTime, formatNumber } from '../utils/formatters';

const TABS = [
  { id: 'inventory', label: 'Stock & Valuation' },
  { id: 'low-stock', label: 'Low Stock' },
  { id: 'transactions', label: 'Movements' },
];

export default function ReportsPage() {
  const { theme } = useTheme();
  const toast = useToast();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('all');
  const [lowStockType, setLowStockType] = useState('all');
  const [txType, setTxType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [inventoryReport, setInventoryReport] = useState({ items: [], summary: null });
  const [lowStockReport, setLowStockReport] = useState({ items: [], summary: null });
  const [txReport, setTxReport] = useState({ items: [], summary: null });

  useEffect(() => {
    localStorage.setItem('stockflow_visited_reports', 'true');
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get('/categories');
        setCategories(res.data.data.categories || []);
      } catch {
        // silent
      }
    }
    loadCategories();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const params = {};
        if (categoryId !== 'all') params.categoryId = categoryId;
        const res = await api.get('/reports/inventory', { params });
        setInventoryReport(res.data.data);
      } else if (activeTab === 'low-stock') {
        const params = { type: lowStockType };
        const res = await api.get('/reports/low-stock', { params });
        setLowStockReport(res.data.data);
      } else {
        const params = {};
        if (txType !== 'all') params.type = txType;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const res = await api.get('/reports/transactions', { params });
        setTxReport(res.data.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load report.'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, categoryId, lowStockType, txType, startDate, endDate, toast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      let url = '';
      let filename = '';
      const params = { format: 'csv' };

      if (activeTab === 'inventory') {
        url = '/reports/inventory';
        filename = 'stockflow-inventory-report.csv';
        if (categoryId !== 'all') params.categoryId = categoryId;
      } else if (activeTab === 'low-stock') {
        url = '/reports/low-stock';
        filename = `stockflow-${lowStockType}-report.csv`;
        params.type = lowStockType;
      } else {
        url = '/reports/transactions';
        filename = 'stockflow-movement-report.csv';
        if (txType !== 'all') params.type = txType;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await api.get(url, { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to export CSV.'));
    } finally {
      setExporting(false);
    }
  };

  const categoryValuationChart = Object.values(
    inventoryReport.items.reduce((acc, item) => {
      if (!acc[item.category_name]) {
        acc[item.category_name] = { category: item.category_name, valuation: 0 };
      }
      acc[item.category_name].valuation =
        Math.round((acc[item.category_name].valuation + item.purchase_valuation) * 100) / 100;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Reports
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            View stock valuation in ₹, restock needs, or download a CSV spreadsheet.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? 'Downloading...' : 'Download CSV'}
        </button>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === 'inventory' && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {activeTab === 'low-stock' && (
            <select
              value={lowStockType}
              onChange={(e) => setLowStockType(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
            >
              <option value="all">Low & Out of Stock</option>
              <option value="low_stock">Low Stock Only</option>
              <option value="out_of_stock">Out of Stock Only</option>
            </select>
          )}

          {activeTab === 'transactions' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
              >
                <option value="all">All Movements</option>
                <option value="IN">Stock IN</option>
                <option value="OUT">Stock OUT</option>
              </select>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Generating report..." />
      ) : (
        <>
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {inventoryReport.summary && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Total Units</p>
                    <p className="mt-1.5 text-2xl font-semibold text-neutral-950 dark:text-white">
                      {formatNumber(inventoryReport.summary.totalUnits)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Across {formatNumber(inventoryReport.summary.totalProducts)} products
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Total Cost Value</p>
                    <p className="mt-1.5 text-2xl font-semibold text-neutral-950 dark:text-white">
                      {formatCurrency(inventoryReport.summary.totalPurchaseValuation)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">Based on purchase price</p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Total Retail Value</p>
                    <p className="mt-1.5 text-2xl font-semibold text-neutral-950 dark:text-white">
                      {formatCurrency(inventoryReport.summary.totalRetailValuation)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Margin: {formatCurrency(inventoryReport.summary.totalPotentialProfit)}
                    </p>
                  </div>
                </div>
              )}

              {categoryValuationChart.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                  <h2 className="mb-4 text-sm font-medium text-neutral-950 dark:text-white">
                    Cost Valuation by Category (₹)
                  </h2>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryValuationChart}
                        margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? '#262626' : '#e5e5e5'}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11, fill: '#737373' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#737373' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => [formatCurrency(v), 'Cost Value']}
                          contentStyle={{
                            borderRadius: '8px',
                            border: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`,
                            backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                            color: isDark ? '#ffffff' : '#0a0a0a',
                            fontSize: '12px',
                          }}
                        />
                        <Bar
                          dataKey="valuation"
                          fill={isDark ? '#ffffff' : '#171717'}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                      <tr>
                        <th className="px-5 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3 text-right">Cost Value</th>
                        <th className="px-4 py-3 text-right">Retail Value</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                      {inventoryReport.items.map((row) => (
                        <tr key={row.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50">
                          <td className="px-5 py-3">
                            <p className="text-xs font-medium text-neutral-950 dark:text-white">
                              {row.name}
                            </p>
                            <p className="font-mono text-[11px] text-neutral-400">{row.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                            {row.category_name}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-semibold text-neutral-950 dark:text-white">
                            {row.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-medium text-neutral-950 dark:text-white">
                            {formatCurrency(row.purchase_valuation)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-neutral-600 dark:text-neutral-300">
                            {formatCurrency(row.retail_valuation)}
                          </td>
                          <td className="px-5 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                            {row.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'low-stock' && (
            <div className="space-y-6">
              {lowStockReport.summary && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Items Needing Attention</p>
                    <p className="mt-1.5 text-2xl font-semibold text-neutral-950 dark:text-white">
                      {lowStockReport.summary.totalFlagged}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Out of Stock</p>
                    <p className="mt-1.5 text-2xl font-semibold text-red-600 dark:text-red-400">
                      {lowStockReport.summary.outOfStockCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Estimated Restock Cost</p>
                    <p className="mt-1.5 text-2xl font-semibold text-neutral-950 dark:text-white">
                      {formatCurrency(lowStockReport.summary.totalEstimatedRestockCost)}
                    </p>
                  </div>
                </div>
              )}

              {lowStockReport.items.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title="All stock levels look good"
                  description="No items are below their minimum stock threshold."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                        <tr>
                          <th className="px-5 py-3">Product</th>
                          <th className="px-4 py-3 text-right">Current</th>
                          <th className="px-4 py-3 text-right">Min Level</th>
                          <th className="px-4 py-3 text-right">Units Needed</th>
                          <th className="px-5 py-3 text-right">Est. Restock Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                        {lowStockReport.items.map((item) => (
                          <tr key={item.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50">
                            <td className="px-5 py-3">
                              <p className="text-xs font-medium text-neutral-950 dark:text-white">
                                {item.name}
                              </p>
                              <p className="font-mono text-[11px] text-neutral-400">{item.sku}</p>
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-red-600 dark:text-red-400">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-neutral-600 dark:text-neutral-300">
                              {item.min_stock_level}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-medium text-neutral-950 dark:text-white">
                              +{item.shortage_units}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-medium text-neutral-950 dark:text-white">
                              {formatCurrency(item.estimated_restock_cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {txReport.summary && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Total Movements</p>
                    <p className="mt-1.5 text-2xl font-semibold text-neutral-950 dark:text-white">
                      {formatNumber(txReport.summary.transactionCount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Units Added (IN)</p>
                    <p className="mt-1.5 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatNumber(txReport.summary.totalIn)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs text-neutral-500">Units Removed (OUT)</p>
                    <p className="mt-1.5 text-2xl font-semibold text-red-600 dark:text-red-400">
                      -{formatNumber(txReport.summary.totalOut)}
                    </p>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                      <tr>
                        <th className="px-5 py-3">Product</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-5 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                      {txReport.items.map((tx) => (
                        <tr key={tx.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50">
                          <td className="px-5 py-3">
                            <p className="text-xs font-medium text-neutral-950 dark:text-white">
                              {tx.product_name}
                            </p>
                            <p className="font-mono text-[11px] text-neutral-400">{tx.product_sku}</p>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium">{tx.type}</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold text-neutral-950 dark:text-white">
                            {tx.type === 'IN' ? `+${tx.quantity}` : `-${tx.quantity}`}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-neutral-500">
                            {tx.previous_stock} → {tx.new_stock}
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                            {tx.note || '—'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-xs text-neutral-500">
                            {formatDateTime(tx.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
