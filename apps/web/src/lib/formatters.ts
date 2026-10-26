import { OrderStatus } from '../types/api';

/**
 * Formats integer cents into Ethiopian Birr currency string (X.XX ETB).
 */
export function formatCurrency(cents: number): string {
  const amount = (cents / 100).toFixed(2);
  return `${amount} ETB`;
}

/**
 * Formats an ISO date string into a localized readable date.
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

/**
 * Formats an ISO date string into a localized readable date and time.
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export interface StatusBadgeConfig {
  label: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

/**
 * Returns Tailwind badge configuration for OrderStatus variants.
 */
export function getOrderStatusBadge(status: OrderStatus): StatusBadgeConfig {
  switch (status) {
    case OrderStatus.PENDING:
      return {
        label: 'Pending',
        bgClass: 'bg-amber-50 border-amber-200',
        textClass: 'text-amber-700',
        dotClass: 'bg-amber-400',
      };
    case OrderStatus.CONFIRMED:
      return {
        label: 'Confirmed',
        bgClass: 'bg-brand-50 border-brand-200',
        textClass: 'text-brand-700',
        dotClass: 'bg-brand-500',
      };
    case OrderStatus.IN_PREPARATION:
      return {
        label: 'In Preparation',
        bgClass: 'bg-blue-50 border-blue-200',
        textClass: 'text-blue-700',
        dotClass: 'bg-blue-500',
      };
    case OrderStatus.READY_FOR_PICKUP:
      return {
        label: 'Ready for Pickup',
        bgClass: 'bg-purple-50 border-purple-200',
        textClass: 'text-purple-700',
        dotClass: 'bg-purple-600',
      };
    case OrderStatus.COMPLETED:
      return {
        label: 'Completed',
        bgClass: 'bg-emerald-50 border-emerald-200',
        textClass: 'text-emerald-700',
        dotClass: 'bg-emerald-500',
      };
    case OrderStatus.CANCELLED:
      return {
        label: 'Cancelled',
        bgClass: 'bg-rose-50 border-rose-200',
        textClass: 'text-rose-700',
        dotClass: 'bg-rose-500',
      };
    default:
      return {
        label: status,
        bgClass: 'bg-slate-50 border-slate-200',
        textClass: 'text-slate-700',
        dotClass: 'bg-slate-400',
      };
  }
}
