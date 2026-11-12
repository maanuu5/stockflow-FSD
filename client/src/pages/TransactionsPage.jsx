import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateTime } from '../utils/formatters';

export default function TransactionsPage() {
  const toast = useToast();

  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [productId, setProductId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await api.get('/products', { params: { limit: 'all', sortBy: 'name', sortOrder: 'asc' } });
        setProducts(res.data.data.products || []);
      } catch {
        // silent
      }
    }
    loadProducts();
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (type !== 'all') params.type = type;
      if (productId !== 'all') params.productId = productId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/transactions', { params });
      setTransactions(res.data.data.transactions || []);
      setPagination(res.data.data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load transactions.'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, type, productId, startDate, endDate, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const resetFilters = () => {
    setSearch('');
    setType('all');
    setProductId('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasFilters = search || type !== 'all' || productId !== 'all' || startDate || endDate;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
          Transactions
        </h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Complete history of every stock addition and removal.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-neutral-200 bg-white p-3.5 md:grid-cols-12 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="relative md:col-span-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search product, SKU, or note..."
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
          />
        </div>

        <div className="md:col-span-2">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
          >
            <option value="all">All Types</option>
            <option value="IN">Stock IN</option>
            <option value="OUT">Stock OUT</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 md:col-span-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
            aria-label="Start date"
          />
          <span className="text-xs text-neutral-400">–</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
            aria-label="End date"
          />
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="shrink-0 rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
              title="Reset filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading transactions..." />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No stock movements yet"
          description={
            hasFilters
              ? 'No stock movements match these filters.'
              : 'Whenever you add a product or update stock (IN / OUT) on the Inventory page, a record appears here automatically.'
          }
          action={
            hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
              >
                Reset Filters
              </button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Stock Change</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-400">#{tx.id}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-medium text-neutral-950 dark:text-white">
                        {tx.product_name}
                      </p>
                      <p className="font-mono text-[11px] text-neutral-400">{tx.product_sku}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          tx.type === 'IN'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                        }`}
                      >
                        {tx.type === 'IN' ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-neutral-950 dark:text-white">
                      {tx.type === 'IN' ? `+${tx.quantity}` : `-${tx.quantity}`}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-neutral-500 dark:text-neutral-400">
                      {tx.previous_stock} →{' '}
                      <strong className="text-neutral-950 dark:text-white">{tx.new_stock}</strong>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 text-xs text-neutral-600 dark:text-neutral-300">
                      {tx.note || <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDateTime(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <span>
              Page <strong className="text-neutral-950 dark:text-white">{pagination.page}</strong> of{' '}
              <strong className="text-neutral-950 dark:text-white">{pagination.totalPages}</strong> ({pagination.total}{' '}
              entries)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
