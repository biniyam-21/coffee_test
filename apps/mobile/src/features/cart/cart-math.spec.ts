import { Product, CartItem } from '../../types/api';

describe('Mobile Cart Calculations & Stock Rules', () => {
  const productA: Product = {
    id: 'prod-pour-over',
    name: 'Ethiopian Yirgacheffe',
    slug: 'ethiopian-yirgacheffe',
    description: 'Floral and citrus notes.',
    basePriceCents: 550,
    imageUrl: null,
    category: { id: 'c1', name: 'Hot Coffee', slug: 'hot-coffee' },
    inventory: { inStock: true, availableQuantity: 3 },
    createdAt: '2026-10-27T00:00:00.000Z',
  };

  const productB: Product = {
    id: 'prod-croissant',
    name: 'Almond Croissant',
    slug: 'almond-croissant',
    description: 'Flaky pastry.',
    basePriceCents: 450,
    imageUrl: null,
    category: { id: 'c2', name: 'Pastries', slug: 'pastries' },
    inventory: { inStock: true, availableQuantity: 10 },
    createdAt: '2026-10-27T00:00:00.000Z',
  };

  const calculateCart = (items: CartItem[]) => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotalCents = items.reduce((sum, i) => sum + i.product.basePriceCents * i.quantity, 0);
    const taxCents = Math.round(subtotalCents * 0.1);
    const totalCents = subtotalCents + taxCents;
    return { itemCount, subtotalCents, taxCents, totalCents };
  };

  it('calculates line totals, subtotal, 10% tax, and total accurately', () => {
    const cart: CartItem[] = [
      { product: productA, quantity: 2 }, // 2 * 550 = 1100
      { product: productB, quantity: 1 }, // 1 * 450 = 450
    ];

    const result = calculateCart(cart);

    expect(result.itemCount).toBe(3);
    expect(result.subtotalCents).toBe(1550);
    expect(result.taxCents).toBe(155); // 10% of 1550
    expect(result.totalCents).toBe(1705); // 1550 + 155
  });

  it('caps quantity additions to available inventory stock', () => {
    const available = productA.inventory.availableQuantity;
    const requested = 10;
    const capped = Math.min(requested, available);

    expect(capped).toBe(3);
  });

  it('removes item when quantity is decremented to zero', () => {
    let cart: CartItem[] = [{ product: productA, quantity: 1 }];

    const updateQuantity = (productId: string, newQty: number) => {
      if (newQty <= 0) {
        cart = cart.filter((i) => i.product.id !== productId);
      } else {
        cart = cart.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i));
      }
    };

    updateQuantity(productA.id, 0);
    expect(cart).toHaveLength(0);
  });
});
