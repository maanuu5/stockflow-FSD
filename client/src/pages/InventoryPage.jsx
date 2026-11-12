import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Search, Boxes } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatNumber } from '../utils/formatters';

export default function InventoryPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState(() => searchParams.get('status') || 'all');

  const debouncedSearch = useDebounce(search, 250);

  const [modalOpen, setModalOpen] = useState(false);
  const [opType, setOpType] = useState('IN');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [opError, setOpError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== status) {
      setStatus(urlStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data.categories || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (categoryId !== 'all') params.categoryId = categoryId;
      if (status !== 'all') params.status = status;

      const res = await api.get('/inventory', { params });
      setItems(res.data.data.items || []);
      setSummary(res.data.data.summary || null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load inventory.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId, status, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const openStockModal = (type, product = null) => {
    setOpType(type);
    setSelectedProductId(product ? String(product.id) : items[0]?.id ? String(items[0].id) : '');
    setQuantity('1');
    setNote('');
    setOpError('');
    setModalOpen(true);
  };

  const selectedProduct = items.find((i) => String(i.id) === String(selectedProductId));
  const parsedQty = Number(quantity);
  const isValidQty = Number.isInteger(parsedQty) && parsedQty > 0;
  const exceedsStock =
    opType === 'OUT' && selectedProduct && isValidQty && parsedQty > selectedProduct.quantity;
  const projectedStock = selectedProduct
    ? opType === 'IN'
      ? selectedProduct.quantity + (isValidQty ? parsedQty : 0)
      : selectedProduct.quantity - (isValidQty ? parsedQty : 0)
    : 0;

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setOpError('');

    if (!selectedProductId) return setOpError('Please select a product.');
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      return setOpError('Enter a whole number greater than 0.');
    }
    if (exceedsStock) {
      return setOpError(`Only ${selectedProduct.quantity} units available to remove.`);
    }

    setSubmitting(true);
    try {
      const endpoint = opType === 'IN' ? '/inventory/stock-in' : '/inventory/stock-out';
      const res = await api.post(endpoint, {
        product_id: Number(selectedProductId),
        quantity: parsedQty,
        note: note.trim(),
      });

      const updated = res.data.data.product;
      toast.success(`Updated "${updated.name}". Current stock: ${updated.quantity}.`);
      setModalOpen(false);
      fetchInventory();
    } catch (err) {
      setOpError(getErrorMessage(err, 'Failed to update stock.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Inventory
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Add incoming stock (Stock IN) or record outgoing items (Stock OUT).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openStockModal('IN')}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            Add Stock (IN)
          </button>
          <button
            type="button"
            onClick={() => openStockModal('OUT')}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-900"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Remove Stock (OUT)
          </button>
        </div>
      </div>

      {/* Quick Filter Pills + Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `All (${summary?.totalProducts ?? 0})` },
            { id: 'in_stock', label: `In Stock (${summary?.inStockCount ?? 0})` },
            { id: 'low_stock', label: `Low Stock (${summary?.lowStockCount ?? 0})` },
            { id: 'out_of_stock', label: `Out of Stock (${summary?.outOfStockCount ?? 0})` },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setStatus(pill.id);
                if (pill.id === 'all') setSearchParams({}, { replace: true });
                else setSearchParams({ status: pill.id }, { replace: true });
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                status === pill.id
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or SKU..."
              className="w-48 rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading stock levels..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No inventory items found"
          description="Try selecting a different status filter or clearing your search."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3 text-right">Stock Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Quick Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-medium text-neutral-950 dark:text-white">
                        {item.name}
                      </p>
                      <p className="font-mono text-[11px] text-neutral-400">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-neutral-600 dark:text-neutral-300">
                      {item.category_name}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs">
                      <span className="font-semibold text-neutral-950 dark:text-white">
                        {formatNumber(item.quantity)}
                      </span>
                      <span className="ml-1 text-[11px] text-neutral-400">
                        / min {item.min_stock_level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-medium text-neutral-800 dark:text-neutral-200">
                      {formatCurrency(item.stock_value)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge quantity={item.quantity} minStockLevel={item.min_stock_level} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openStockModal('IN', item)}
                          className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-black dark:text-white dark:hover:bg-neutral-900"
                        >
                          + Add
                        </button>
                        <button
                          type="button"
                          disabled={item.quantity <= 0}
                          onClick={() => openStockModal('OUT', item)}
                          className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-35 dark:border-neutral-800 dark:bg-black dark:text-neutral-300 dark:hover:bg-neutral-900"
                        >
                          - Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={opType === 'IN' ? 'Add Stock (Stock IN)' : 'Remove Stock (Stock OUT)'}
        subtitle="Every stock change is saved automatically to your transaction history."
      >
        {opError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {opError}
          </div>
        )}

        <form onSubmit={handleStockSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => {
                setOpType('IN');
                setOpError('');
              }}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                opType === 'IN'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400'
              }`}
            >
              Add Stock (IN)
            </button>
            <button
              type="button"
              onClick={() => {
                setOpType('OUT');
                setOpError('');
              }}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                opType === 'OUT'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400'
              }`}
            >
              Remove Stock (OUT)
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setOpError('');
              }}
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
            >
              <option value="">Choose a product...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) — {item.quantity} available
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs dark:border-neutral-800 dark:bg-neutral-900/50">
              <div>
                <p className="text-neutral-500">Current Stock</p>
                <p className="mt-0.5 text-base font-semibold text-neutral-950 dark:text-white">
                  {selectedProduct.quantity} units
                </p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500">After Update</p>
                <p
                  className={`mt-0.5 text-base font-semibold ${
                    exceedsStock
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-neutral-950 dark:text-white'
                  }`}
                >
                  {exceedsStock ? 'Not enough stock' : `${projectedStock} units`}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setOpError('');
              }}
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Note (Optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                opType === 'IN'
                  ? 'e.g. Received from supplier'
                  : 'e.g. Sold to customer / dispatched'
              }
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || exceedsStock || !isValidQty || !selectedProductId}
              className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {submitting
                ? 'Saving...'
                : opType === 'IN'
                ? 'Confirm Stock IN'
                : 'Confirm Stock OUT'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
