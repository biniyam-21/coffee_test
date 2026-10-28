import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart } from './CartContext';
import { AuthContext } from './AuthContext';
import { Product } from '../types/api';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Ethiopian Yirgacheffe Pour-over',
  slug: 'ethiopian-yirgacheffe',
  description: 'Bright floral and bergamot notes.',
  basePriceCents: 550,
  imageUrl: null,
  category: {
    id: 'cat-1',
    name: 'Hot Coffee',
    slug: 'hot-coffee',
  },
  inventory: {
    inStock: true,
    availableQuantity: 5,
  },
  createdAt: '2026-10-27T00:00:00.000Z',
};

const mockProduct2: Product = {
  id: 'prod-2',
  name: 'Almond Croissant',
  slug: 'almond-croissant',
  description: 'Buttery French pastry.',
  basePriceCents: 450,
  imageUrl: null,
  category: {
    id: 'cat-2',
    name: 'Pastries',
    slug: 'pastries',
  },
  inventory: {
    inStock: true,
    availableQuantity: 10,
  },
  createdAt: '2026-10-27T00:00:00.000Z',
};

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  it('initializes with empty cart and zero counts', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.subtotalCents).toBe(0);
    expect(result.current.taxCents).toBe(0);
    expect(result.current.totalCents).toBe(0);
  });

  it('adds items and correctly computes subtotal, 10% tax, and total', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.itemCount).toBe(2);
    // 2 * 550 = 1100
    expect(result.current.subtotalCents).toBe(1100);
    // 10% of 1100 = 110
    expect(result.current.taxCents).toBe(110);
    // 1100 + 110 = 1210
    expect(result.current.totalCents).toBe(1210);

    act(() => {
      result.current.addItem(mockProduct2, 1);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.itemCount).toBe(3);
    // 1100 + 450 = 1550
    expect(result.current.subtotalCents).toBe(1550);
    // 10% of 1550 = 155
    expect(result.current.taxCents).toBe(155);
    // 1550 + 155 = 1705
    expect(result.current.totalCents).toBe(1705);
  });

  it('caps quantity to available product inventory stock', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct, 10); // available is 5
    });

    expect(result.current.items[0].quantity).toBe(5);
  });

  it('updates quantity and removes items when reduced to 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct, 2);
    });

    act(() => {
      result.current.updateQuantity(mockProduct.id, 4);
    });
    expect(result.current.items[0].quantity).toBe(4);

    act(() => {
      result.current.updateQuantity(mockProduct.id, 0);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it('clears cart completely', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct, 2);
      result.current.addItem(mockProduct2, 1);
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalCents).toBe(0);
  });

  it('isolates cart items per user and clears cart upon logout', () => {
    const userA = {
      id: 'user-a',
      email: 'a@akufada.com',
      fullName: 'User A',
      roles: ['customer' as any],
      createdAt: '2026-10-27T00:00:00.000Z',
    };

    let currentUser: any = userA;
    const authWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider
        value={{
          user: currentUser,
          token: 'token',
          isLoading: false,
          isAuthenticated: !!currentUser,
          hasRole: () => true,
          login: async () => currentUser,
          register: async () => currentUser,
          logout: async () => {},
          refreshSession: async () => {},
        }}
      >
        <CartProvider>{children}</CartProvider>
      </AuthContext.Provider>
    );

    const { result, rerender } = renderHook(() => useCart(), { wrapper: authWrapper });

    // User A adds an item
    act(() => {
      result.current.addItem(mockProduct, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(localStorage.getItem('akufada_cart_user-a')).toContain('Ethiopian Yirgacheffe');

    // Simulate User Logout (currentUser becomes null)
    currentUser = null;
    act(() => {
      rerender();
    });

    // Cart items must be cleared and local storage for user-a must be removed
    expect(result.current.items).toHaveLength(0);
    expect(localStorage.getItem('akufada_cart_user-a')).toBeNull();
  });
});
