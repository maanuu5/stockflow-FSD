import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet',
  description = 'Try clearing your filters or create your first entry.',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-neutral-950 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
