import { getStockStatusMeta } from '../utils/formatters';

export default function StatusBadge({ quantity, minStockLevel }) {
  const meta = getStockStatusMeta(quantity, minStockLevel);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}
