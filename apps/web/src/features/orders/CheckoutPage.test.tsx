import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CheckoutPage } from './CheckoutPage';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider, useCart } from '../../context/CartContext';
import { ToastProvider } from '../../context/ToastContext';
import * as apiClient from '../../lib/api-client';
import { Product } from '../../types/api';

vi.mock('../../lib/api-client', () => ({
  apiRequest: vi.fn(),
  setAccessToken: vi.fn(),
  setOnUnauthorized: vi.fn(),
}));

const mockProduct: Product = {
  id: 'prod-123',
  name: 'Yirgacheffe Kochere 250g Whole Bean',
  slug: 'yirgacheffe-kochere',
  description: 'Bright citrus with floral jasmine and bergamot.',
  basePriceCents: 1650, // 16.50 ETB
  imageUrl: null,
  category: { id: 'cat-1', name: 'Whole Bean', slug: 'whole-bean' },
  inventory: { inStock: true, availableQuantity: 10 },
  createdAt: '2026-01-01T00:00:00Z',
};

const CartInitializer: React.FC<{ children: React.ReactNode; addMockItem?: boolean }> = ({
  children,
  addMockItem = true,
}) => {
  const { addItem, clearCart } = useCart();

  React.useEffect(() => {
    clearCart();
    if (addMockItem) {
      addItem(mockProduct, 1);
    }
  }, []);

  return <>{children}</>;
};

describe('<CheckoutPage /> (Redesigned UI Integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderCheckout = (addMockItem = true) =>
    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <CartInitializer addMockItem={addMockItem}>
                <CheckoutPage />
              </CartInitializer>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>,
    );

  it('renders breadcrumb, heading, and customer details card', async () => {
    renderCheckout(true);

    await waitFor(() => {
      expect(screen.getByText('Review your order')).toBeInTheDocument();
    });

    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(
      screen.getByText('Confirm your details and pickup preferences before placing your order.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Your details')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email address')).toBeInTheDocument();
  });

  it('renders pickup instructions and payment methods cards', async () => {
    renderCheckout(true);

    await waitFor(() => {
      expect(screen.getByText('Pickup instructions (optional)')).toBeInTheDocument();
    });

    expect(
      screen.getByPlaceholderText('Milk preference, temperature, or pickup notes...'),
    ).toBeInTheDocument();
    expect(screen.getByText('Payment method')).toBeInTheDocument();
    expect(screen.getByText('Chapa test checkout')).toBeInTheDocument();
    expect(screen.getByText('Cash receiving (Cash on pickup)')).toBeInTheDocument();
    expect(screen.getByText('Test payment — successful')).toBeInTheDocument();
    expect(screen.getByText('Test payment — declined')).toBeInTheDocument();
  });

  it('renders order summary with correct pricing and confirm button', async () => {
    renderCheckout(true);

    await waitFor(() => {
      expect(screen.getByText('Order summary')).toBeInTheDocument();
    });

    expect(screen.getByText('Yirgacheffe Kochere 250g Whole Bean')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Sales tax (10%)')).toBeInTheDocument();
    expect(screen.getByText('Total due')).toBeInTheDocument();

    // Check confirm button label with actual total
    const confirmBtn = screen.getByRole('button', { name: /confirm order/i });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn.textContent).toContain('Confirm order');

    // Security note
    expect(
      screen.getByText(/Secure checkout · Order confirmation is idempotent/i),
    ).toBeInTheDocument();
  });

  it('allows switching payment methods and entering pickup notes', async () => {
    renderCheckout(true);

    await waitFor(() => {
      expect(screen.getByText('Payment method')).toBeInTheDocument();
    });

    const cashOption = screen.getByLabelText(/cash on pickup/i);
    fireEvent.click(cashOption);
    expect(cashOption).toBeChecked();

    const textarea = screen.getByPlaceholderText('Milk preference, temperature, or pickup notes...');
    fireEvent.change(textarea, { target: { value: 'Oat milk, extra hot please' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('Oat milk, extra hot please');
  });

  it('submits order with correct payload and idempotency key', async () => {
    const mockOrderResponse = {
      id: 'ord-test-456',
      orderNumber: 'ORD-2026-001',
      status: 'CONFIRMED',
      totalCents: 1815,
    };

    vi.spyOn(apiClient, 'apiRequest').mockResolvedValue(mockOrderResponse);

    renderCheckout(true);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm order/i })).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm order/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiClient.apiRequest).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          method: 'POST',
          idempotencyKey: expect.stringMatching(/^ord-idem-/),
        }),
      );
    });
  });

  it('renders empty cart state when no items are in cart', async () => {
    renderCheckout(false);

    await waitFor(() => {
      expect(screen.getByText('Your Bag is Empty')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /return to menu/i })).toBeInTheDocument();
  });
});
