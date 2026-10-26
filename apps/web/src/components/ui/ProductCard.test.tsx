import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { Product } from '../../types/api';

const mockProduct: Product = {
  id: 'prod-test-1',
  name: 'Sidama Geisha Honey',
  slug: 'sidama-geisha-honey',
  description: 'Jasmine and wild peach notes with sweet honey finish.',
  basePriceCents: 650,
  imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd',
  category: { id: 'cat-1', name: 'Specialty Roast', slug: 'specialty-roast' },
  inventory: { inStock: true, availableQuantity: 8 },
  createdAt: '2026-10-27T00:00:00.000Z',
};

describe('<ProductCard />', () => {
  it('renders skeleton loading when isLoading prop is true', () => {
    render(<ProductCard isLoading />);

    expect(screen.getByTestId('product-card-skeleton-item')).toBeInTheDocument();
    expect(screen.queryByText('Sidama Geisha Honey')).not.toBeInTheDocument();
  });

  it('renders product details and lazy loaded image container when loaded', () => {
    const handleAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={handleAddToCart} />);

    expect(screen.getByText('Sidama Geisha Honey')).toBeInTheDocument();
    expect(screen.getByText('6.50 ETB')).toBeInTheDocument();
    expect(screen.getByText('8 left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();

    // Verify optimized image with lazy loading
    const img = screen.getByRole('img', { name: 'Sidama Geisha Honey' });
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');

    // Add to cart interaction
    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));
    expect(handleAddToCart).toHaveBeenCalledTimes(1);
    expect(handleAddToCart).toHaveBeenCalledWith(mockProduct);
  });
});
