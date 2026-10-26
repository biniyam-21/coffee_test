import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getOrderStatusBadgeConfig,
} from './formatters';
import { OrderStatus } from '../types/api';
import { colors } from '../theme';

describe('Mobile Formatters & Badge Styles', () => {
  describe('formatCurrency', () => {
    it('formats cents correctly into USD string with two decimals', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(375)).toBe('$3.75');
      expect(formatCurrency(550)).toBe('$5.50');
      expect(formatCurrency(1200)).toBe('$12.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });
  });

  describe('formatDate and formatDateTime', () => {
    it('handles empty dates gracefully', () => {
      expect(formatDate('')).toBe('—');
      expect(formatDateTime('')).toBe('—');
    });

    it('formats standard ISO timestamps', () => {
      const iso = '2026-10-27T08:30:00.000Z';
      expect(formatDate(iso)).toBeTruthy();
      expect(formatDate(iso)).not.toBe('—');
      expect(formatDateTime(iso)).toBeTruthy();
    });
  });

  describe('getOrderStatusBadgeConfig', () => {
    it('returns brand purple styling for CONFIRMED', () => {
      const config = getOrderStatusBadgeConfig(OrderStatus.CONFIRMED);
      expect(config.label).toBe('Confirmed');
      expect(config.textColor).toBe(colors.primary);
      expect(config.backgroundColor).toBe(colors.primaryBackground);
    });

    it('returns info blue styling for IN_PREPARATION', () => {
      const config = getOrderStatusBadgeConfig(OrderStatus.IN_PREPARATION);
      expect(config.label).toBe('In Prep');
      expect(config.textColor).toBe(colors.info);
    });

    it('returns brand purple styling for READY_FOR_PICKUP', () => {
      const config = getOrderStatusBadgeConfig(OrderStatus.READY_FOR_PICKUP);
      expect(config.label).toBe('Ready for Pickup');
      expect(config.textColor).toBe(colors.primary);
    });

    it('returns success emerald styling for COMPLETED', () => {
      const config = getOrderStatusBadgeConfig(OrderStatus.COMPLETED);
      expect(config.label).toBe('Completed');
      expect(config.textColor).toBe(colors.success);
    });

    it('returns error styling for CANCELLED', () => {
      const config = getOrderStatusBadgeConfig(OrderStatus.CANCELLED);
      expect(config.label).toBe('Cancelled');
      expect(config.textColor).toBe(colors.error);
    });
  });
});
