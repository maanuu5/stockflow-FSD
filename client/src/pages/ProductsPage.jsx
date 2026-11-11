import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Package,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const INITIAL_FORM = {
  name: '',
  sku: '',
  description: '',
  category_id: '',
  purchase_price: '',
  selling_price: '',
  quantity: '0',
  min_stock_level: '5',
};

export default function ProductsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== search) {
      setSearch(urlSearch);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data.categories || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load categories.'));
    }
  }, [toast]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        sortBy,
        sortOrder,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (categoryId !== 'all') params.categoryId = categoryId;
      if (stockStatus !== 'all') params.stockStatus = stockStatus;

      const res = await api.get('/products', { params });
      setProducts(res.data.data.products || []);
      setPagination(res.data.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, debouncedSearch, categoryId, stockStatus, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
    if (value.trim()) {
      setSearchParams({ search: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({
      ...INITIAL_FORM,
      category_id: categories[0]?.id ? String(categories[0].id) : '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      category_id: String(product.category_id),
      purchase_price: String(product.purchase_price),
      selling_price: String(product.selling_price),
      quantity: String(product.quantity),
      min_stock_level: String(product.min_stock_level),
    });
    setFormError('');
    setFormOpen(true);
  };

  const openDetailModal = async (productId) => {
    setDetailLoading(true);
    setDetailData({ product: null, transactions: [] });
    try {
      const res = await api.get(`/products/${productId}`);
      setDetailData(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch product details.'));
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) return setFormError('Product name is required.');
    if (!form.sku.trim()) return setFormError('Unique SKU is required.');
    if (!form.category_id) return setFormError('Please select a category.');

    const purchasePrice = Number(form.purchase_price);
    const sellingPrice = Number(form.selling_price);
    const quantity = Number(form.quantity);
    const minStock = Number(form.min_stock_level);

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      return setFormError('Purchase price must be ₹0 or greater.');
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      return setFormError('Selling price must be ₹0 or greater.');
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      return setFormError('Current stock must be 0 or greater.');
    }
    if (!Number.isInteger(minStock) || minStock < 0) {
      return setFormError('Minimum alert threshold must be 0 or greater.');
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      description: form.description.trim(),
      category_id: Number(form.category_id),
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      quantity,
      min_stock_level: minStock,
    };

    setSaving(true);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success(`Updated "${payload.name}".`);
      } else {
        await api.post('/products', payload);
        toast.success(`Added "${payload.name}".`);
      }
      setFormOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save product.'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      toast.success(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      if (products.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchProducts();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete product.'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Products
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Add, edit, or search items in your product catalog.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-950">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
            aria-label="Filter by stock status"
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [col, ord] = e.target.value.split(':');
              setSortBy(col);
              setSortOrder(ord);
              setPage(1);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
            aria-label="Sort products"
          >
            <option value="created_at:desc">Newest First</option>
            <option value="selling_price:asc">Price: Low to High</option>
            <option value="selling_price:desc">Price: High to Low</option>
            <option value="quantity:asc">Stock: Low to High</option>
            <option value="quantity:desc">Stock: High to Low</option>
            <option value="name:asc">Name: A–Z</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner label="Loading products..." />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Try clearing your filters or add a new product to get started."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-black"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                <tr>
                  <th className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-neutral-950 dark:hover:text-white"
                    >
                      Product <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('selling_price')}
                      className="inline-flex items-center gap-1 hover:text-neutral-950 dark:hover:text-white"
                    >
                      Selling Price <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('quantity')}
                      className="inline-flex items-center gap-1 hover:text-neutral-950 dark:hover:text-white"
                    >
                      Stock <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-medium text-neutral-950 dark:text-white">
                        {product.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-neutral-500">
                        {product.sku}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-neutral-600 dark:text-neutral-300">
                      {product.category_name}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-medium text-neutral-950 dark:text-white">
                      {formatCurrency(product.selling_price)}
                      <span className="block text-[10px] font-normal text-neutral-400">
                        Cost {formatCurrency(product.purchase_price)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs">
                      <span className="font-semibold text-neutral-950 dark:text-white">
                        {product.quantity}
                      </span>
                      <span className="ml-1 text-[11px] text-neutral-400">
                        (min {product.min_stock_level})
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        quantity={product.quantity}
                        minStockLevel={product.min_stock_level}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openDetailModal(product.id)}
                          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-white"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-white"
                          title="Edit product"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          title="Delete product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
              items)
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle={
          editingProduct
            ? `Editing ${editingProduct.sku}`
            : 'Enter product details, price in ₹, and minimum stock alert threshold.'
        }
        maxWidth="max-w-xl"
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Product Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Logitech MX Master 3S"
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                SKU Code *
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. ACC-MSE-001"
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-950 uppercase focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Category *
            </label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description of this item..."
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Cost Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                placeholder="0.00"
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                placeholder="0.00"
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Starting Stock *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Low Alert At *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.min_stock_level}
                onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={Boolean(detailData)}
        onClose={() => setDetailData(null)}
        title={detailData?.product?.name || 'Product Details'}
        subtitle={detailData?.product ? `SKU: ${detailData.product.sku}` : ''}
        maxWidth="max-w-lg"
      >
        {detailLoading || !detailData?.product ? (
          <LoadingSpinner label="Loading details..." />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-800 dark:bg-neutral-900/50">
              <div>
                <p className="text-neutral-500">Category</p>
                <p className="mt-0.5 font-medium text-neutral-950 dark:text-white">
                  {detailData.product.category_name}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Status</p>
                <div className="mt-0.5">
                  <StatusBadge
                    quantity={detailData.product.quantity}
                    minStockLevel={detailData.product.min_stock_level}
                  />
                </div>
              </div>
              <div>
                <p className="text-neutral-500">Cost / Selling Price</p>
                <p className="mt-0.5 font-medium text-neutral-950 dark:text-white">
                  {formatCurrency(detailData.product.purchase_price)} /{' '}
                  {formatCurrency(detailData.product.selling_price)}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Current Stock</p>
                <p className="mt-0.5 font-medium text-neutral-950 dark:text-white">
                  {detailData.product.quantity} units (min {detailData.product.min_stock_level})
                </p>
              </div>
            </div>

            {detailData.product.description && (
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                {detailData.product.description}
              </p>
            )}

            <div>
              <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Recent Movements
              </h3>
              {detailData.transactions?.length === 0 ? (
                <p className="mt-2 text-xs text-neutral-500">No stock history yet.</p>
              ) : (
                <div className="mt-2 max-h-48 divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200 dark:divide-neutral-900 dark:border-neutral-800">
                  {detailData.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                      <div>
                        <span
                          className={`font-semibold ${
                            tx.type === 'IN' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {tx.type === 'IN' ? `+${tx.quantity}` : `-${tx.quantity}`}
                        </span>{' '}
                        <span className="text-neutral-500">
                          ({tx.previous_stock} → {tx.new_stock})
                        </span>
                        {tx.note && (
                          <p className="mt-0.5 text-[11px] text-neutral-500">{tx.note}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        {formatDateTime(tx.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}" (${deleteTarget?.sku})? Its movement history will also be removed.`}
        confirmLabel="Delete Product"
        loading={deleting}
      />
    </div>
  );
}
