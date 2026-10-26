import { OrderStatus } from '../types/api';
import { colors } from '../theme';

/**
 * Formats integer cents into standard USD string ($X.XX).
 */
export function formatCurrency(cents: number): string {
  if (isNaN(cents)) return '$0.00';
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

/**
 * Formats ISO date string to localized readable format.
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

/**
 * Formats ISO date and time string.
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export interface MobileStatusBadgeConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}

/**
 * Provides theme styling for order lifecycle badges.
 */
export function getOrderStatusBadgeConfig(status: OrderStatus): MobileStatusBadgeConfig {
  switch (status) {
    case OrderStatus.PENDING:
      return {
        label: 'Pending',
        backgroundColor: colors.warningBg,
        textColor: colors.warning,
        borderColor: colors.warningBorder,
        dotColor: colors.warning,
      };
    case OrderStatus.CONFIRMED:
      return {
        label: 'Confirmed',
        backgroundColor: colors.primaryBackground,
        textColor: colors.primary,
        borderColor: colors.primaryLight,
        dotColor: colors.primary,
      };
    case OrderStatus.IN_PREPARATION:
      return {
        label: 'In Prep',
        backgroundColor: colors.infoBg,
        textColor: colors.info,
        borderColor: colors.infoBorder,
        dotColor: colors.info,
      };
    case OrderStatus.READY_FOR_PICKUP:
      return {
        label: 'Ready for Pickup',
        backgroundColor: colors.primaryBackground,
        textColor: colors.primary,
        borderColor: colors.primaryLight,
        dotColor: colors.primary,
      };
    case OrderStatus.COMPLETED:
      return {
        label: 'Completed',
        backgroundColor: colors.successBg,
        textColor: colors.success,
        borderColor: colors.successBorder,
        dotColor: colors.success,
      };
    case OrderStatus.CANCELLED:
      return {
        label: 'Cancelled',
        backgroundColor: colors.errorBg,
        textColor: colors.error,
        borderColor: colors.errorBorder,
        dotColor: colors.error,
      };
    default:
      return {
        label: status,
        backgroundColor: colors.surfaceSubtle,
        textColor: colors.textSecondary,
        borderColor: colors.border,
        dotColor: colors.textMuted,
      };
  }
}
