import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let nextToastId = 1;

const VARIANT_STYLES = {
  success: {
    container: 'border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white',
    icon: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
  },
  error: {
    container: 'border-red-200 bg-white text-neutral-950 dark:border-red-900/50 dark:bg-neutral-950 dark:text-white',
    icon: <AlertCircle className="h-4.5 w-4.5 text-red-600 dark:text-red-400 shrink-0" />,
  },
  warning: {
    container: 'border-amber-200 bg-white text-neutral-950 dark:border-amber-900/50 dark:bg-neutral-950 dark:text-white',
    icon: <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0" />,
  },
  info: {
    container: 'border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white',
    icon: <Info className="h-4.5 w-4.5 text-neutral-900 dark:text-white shrink-0" />,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant = 'success', duration = 4000) => {
      const id = nextToastId++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error', 5000),
    warning: (msg) => showToast(msg, 'warning'),
    info: (msg) => showToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const style = VARIANT_STYLES[item.variant] || VARIANT_STYLES.info;
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg transition-all ${style.container}`}
            >
              {style.icon}
              <p className="flex-1 text-xs font-medium leading-5">{item.message}</p>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="rounded-md p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return ctx;
}
