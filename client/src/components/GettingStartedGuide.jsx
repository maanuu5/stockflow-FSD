import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, X, Sparkles } from 'lucide-react';

export default function GettingStartedGuide({ stats, onDismiss }) {
  const hasCategories = (stats?.totalCategories || 0) > 0;
  const hasProducts = (stats?.totalProducts || 0) > 0;
  const hasTransactions = (stats?.totalTransactions || 0) > 0;
  const visitedReports = localStorage.getItem('stockflow_visited_reports') === 'true';

  const steps = [
    {
      id: 'category',
      done: hasCategories,
      title: '1. Create a category',
      description: 'Group similar items together (for example: Electronics, Office Supplies).',
      cta: 'Go to Categories',
      to: '/categories?guide=1',
    },
    {
      id: 'product',
      done: hasProducts,
      title: '2. Add your first product',
      description: 'Enter product name, SKU, price in ₹, starting stock, and low-stock alert limit.',
      cta: hasCategories ? 'Add Product' : 'Create Category First',
      to: hasCategories ? '/products?guide=1' : '/categories?guide=1',
    },
    {
      id: 'inventory',
      done: hasTransactions,
      title: '3. Record a stock movement',
      description: 'Use Stock IN when new items arrive, or Stock OUT when items are sold or used.',
      cta: 'Update Stock',
      to: '/inventory',
    },
    {
      id: 'reports',
      done: visitedReports,
      title: '4. View reports & download CSV',
      description: 'Check total inventory value in ₹, low-stock items, and export spreadsheets.',
      cta: 'Open Reports',
      to: '/reports',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);
  const nextStepId = steps.find((s) => !s.done)?.id;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-950 dark:text-white">
                Getting Started Guide
              </h2>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                {completedCount} of {steps.length} done
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {completedCount === steps.length
                ? 'You are all set! All core workflows are completed.'
                : 'Your workspace starts at 0. Follow these 4 steps to set up and operate your inventory.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
          title="Hide guide"
          aria-label="Hide getting started guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
        <div
          className="h-full rounded-full bg-black transition-all duration-300 dark:bg-white"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 4 Step Cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => {
          const isCurrent = step.id === nextStepId;
          return (
            <div
              key={step.id}
              className={`flex flex-col justify-between rounded-lg border p-3.5 transition-colors ${
                step.done
                  ? 'border-neutral-200 bg-neutral-50/70 opacity-75 dark:border-neutral-800 dark:bg-neutral-900/40'
                  : isCurrent
                  ? 'border-neutral-950 bg-white dark:border-white dark:bg-neutral-950'
                  : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle
                      className={`h-4 w-4 shrink-0 ${
                        isCurrent
                          ? 'text-neutral-950 dark:text-white'
                          : 'text-neutral-300 dark:text-neutral-700'
                      }`}
                    />
                  )}
                  <h3
                    className={`text-xs font-semibold ${
                      step.done
                        ? 'line-through text-neutral-500 dark:text-neutral-400'
                        : 'text-neutral-950 dark:text-white'
                    }`}
                  >
                    {step.title}
                  </h3>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {step.description}
                </p>
              </div>

              <Link
                to={step.to}
                className={`mt-3 inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  step.done
                    ? 'border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900'
                    : isCurrent
                    ? 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                    : 'border border-neutral-200 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900'
                }`}
              >
                {step.done ? 'Revisit' : step.cta}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
