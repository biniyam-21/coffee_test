import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime, getOrderStatusBadge } from './formatters';
import { OrderStatus } from '../types/api';

describe('Formatters Utility', () => {
  describe('formatCurrency', () => {
    it('formats cents correctly into ETB string', () => {
      expect(formatCurrency(0)).toBe('0.00 ETB');
      expect(formatCurrency(450)).toBe('4.50 ETB');
      expect(formatCurrency(1299)).toBe('12.99 ETB');
      expect(formatCurrency(100000)).toBe('1000.00 ETB');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date strings safely', () => {
      expect(formatDate('')).toBe('—');
      const iso = '2026-10-27T08:30:00.000Z';
      const formatted = formatDate(iso);
      expect(formatted).toBeTruthy();
      expect(formatted).not.toBe('—');
    });
  });

  describe('formatDateTime', () => {
    it('formats ISO date and time safely', () => {
      expect(formatDateTime('')).toBe('—');
      const iso = '2026-10-27T08:30:00.000Z';
      const formatted = formatDateTime(iso);
      expect(formatted).toBeTruthy();
    });
  });

  describe('getOrderStatusBadge', () => {
    it('returns brand styling for CONFIRMED', () => {
      const badge = getOrderStatusBadge(OrderStatus.CONFIRMED);
      expect(badge.label).toBe('Confirmed');
      expect(badge.bgClass).toContain('brand');
    });

    it('returns blue styling for IN_PREPARATION', () => {
      const badge = getOrderStatusBadge(OrderStatus.IN_PREPARATION);
      expect(badge.label).toBe('In Preparation');
      expect(badge.bgClass).toContain('blue');
    });

    it('returns purple styling for READY_FOR_PICKUP', () => {
      const badge = getOrderStatusBadge(OrderStatus.READY_FOR_PICKUP);
      expect(badge.label).toBe('Ready for Pickup');
      expect(badge.bgClass).toContain('purple');
    });

    it('returns emerald styling for COMPLETED', () => {
      const badge = getOrderStatusBadge(OrderStatus.COMPLETED);
      expect(badge.label).toBe('Completed');
      expect(badge.bgClass).toContain('emerald');
    });

    it('returns rose styling for CANCELLED', () => {
      const badge = getOrderStatusBadge(OrderStatus.CANCELLED);
      expect(badge.label).toBe('Cancelled');
      expect(badge.bgClass).toContain('rose');
    });
  });
});
