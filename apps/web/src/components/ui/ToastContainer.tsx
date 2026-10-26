import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ToastItem, ToastType } from '../../context/ToastContext';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    stripeColor: string;
    borderColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    stripeColor: 'bg-emerald-500',
    borderColor: 'border-emerald-200/90',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-600',
    stripeColor: 'bg-rose-500',
    borderColor: 'border-rose-200/90',
  },
  info: {
    icon: Info,
    iconColor: 'text-[#7138E8]',
    stripeColor: 'bg-[#7138E8]',
    borderColor: 'border-[#7138E8]/35',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    stripeColor: 'bg-amber-500',
    borderColor: 'border-amber-200/90',
  },
};

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
  const config = typeStyles[toast.type] || typeStyles.info;
  const Icon = config.icon;
  const duration = toast.duration ?? 4500;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto relative flex w-full items-start gap-3 rounded-md bg-white border ${config.borderColor} pl-4 pr-3.5 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] transition-all animate-slideInRight select-none text-left overflow-hidden`}
    >
      {/* Colorized Left Vertical Stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.stripeColor}`} />

      {/* Inline Status Icon */}
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.iconColor}`} />

      {/* Text Area */}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs sm:text-sm font-semibold text-[#111827] leading-snug">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="mt-0.5 text-xs text-[#6B7280] leading-normal break-words font-normal">
            {toast.message}
          </p>
        )}
      </div>

      {/* Understated Close Button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 text-[#9CA3AF] hover:text-[#4B5563] transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-80 max-w-[calc(100vw-32px)]"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </aside>
  );
};
