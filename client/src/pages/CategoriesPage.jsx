import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, FolderTree } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatNumber } from '../utils/formatters';

export default function CategoriesPage() {
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await api.get('/categories', { params });
      setCategories(res.data.data.categories || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load categories.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, {
          name: name.trim(),
          description: description.trim(),
        });
        toast.success(`Updated "${name.trim()}".`);
      } else {
        await api.post('/categories', {
          name: name.trim(),
          description: description.trim(),
        });
        toast.success(`Created "${name.trim()}".`);
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save category.'));
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (cat) => {
    setDeleteTarget(cat);
    const other = categories.find((c) => c.id !== cat.id);
    setReassignTo(other ? String(other.id) : '');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.product_count > 0 && !reassignTo) {
      toast.error('Create another category first before deleting this one.');
      return;
    }

    setDeleting(true);
    try {
      const query =
        deleteTarget.product_count > 0 && reassignTo
          ? `?reassignTo=${encodeURIComponent(reassignTo)}`
          : '';
      await api.delete(`/categories/${deleteTarget.id}${query}`);
      toast.success(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete category.'));
    } finally {
      setDeleting(false);
    }
  };

  const otherCategories = categories.filter((c) => c.id !== deleteTarget?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Categories
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Group your products into clean categories.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Category
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading categories..." />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Create your first category to start organizing your products."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-black"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Category
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-neutral-950 dark:text-white">
                    {cat.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-900 dark:hover:text-white"
                      title="Edit category"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(cat)}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      title="Delete category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {cat.description || 'No description'}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs dark:border-neutral-900">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {formatNumber(cat.product_count)} products
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {formatNumber(cat.total_units)} units
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Category' : 'New Category'}
        subtitle="Organize similar products together."
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics"
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What goes into this category?"
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
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
              disabled={saving}
              className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={
          deleteTarget?.product_count > 0
            ? `"${deleteTarget.name}" has ${deleteTarget.product_count} product(s). Pick another category to move them to before deleting.`
            : `Delete "${deleteTarget?.name}"?`
        }
        confirmLabel={
          deleteTarget?.product_count > 0 ? 'Move Products & Delete' : 'Delete Category'
        }
        loading={deleting}
      >
        {deleteTarget?.product_count > 0 && (
          <div>
            {otherCategories.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                Create another category first before deleting this one.
              </p>
            ) : (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Move products to:
                </label>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
                >
                  {otherCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.product_count} products)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
