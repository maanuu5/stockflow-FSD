import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', label = 'Loading...' }) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  }[size] || 'h-5 w-5';

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-neutral-500 dark:text-neutral-400">
      <Loader2 className={`${sizeClass} animate-spin text-neutral-950 dark:text-white`} />
      {label && <span className="text-xs font-medium">{label}</span>}
    </div>
  );
}
