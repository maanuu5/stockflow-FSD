export function formatCurrency(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  // SQLite datetime('now') produces 'YYYY-MM-DD HH:MM:SS' in UTC
  const normalized = isoString.includes('T') ? isoString : `${isoString.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  const normalized = isoString.includes('T') ? isoString : `${isoString.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getStockStatusMeta(quantity, minStockLevel) {
  if (quantity <= 0) {
    return {
      key: 'OUT_OF_STOCK',
      label: 'Out of Stock',
      badgeClass:
        'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/25',
      dotClass: 'bg-rose-500',
    };
  }
  if (quantity <= minStockLevel) {
    return {
      key: 'LOW_STOCK',
      label: 'Low Stock',
      badgeClass:
        'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25',
      dotClass: 'bg-amber-500',
    };
  }
  return {
    key: 'IN_STOCK',
    label: 'In Stock',
    badgeClass:
      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25',
    dotClass: 'bg-emerald-500',
  };
}

