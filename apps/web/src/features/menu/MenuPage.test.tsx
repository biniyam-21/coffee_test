import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MenuPage } from './MenuPage';
import { CartProvider } from '../../context/CartContext';
import * as apiClient from '../../lib/api-client';
import { Product, Category, PaginatedResult } from '../../types/api';

vi.mock('../../lib/api-client', () => ({
  apiRequest: vi.fn(),
  setAccessToken: vi.fn(),
  setOnUnauthorized: vi.fn(),
}));

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Espresso Romano',
    slug: 'espresso-romano',
    description: 'Double shot with lemon twist.',
    basePriceCents: 400,
    imageUrl: null,
    category: { id: 'cat-1', name: 'Hot Coffee', slug: 'hot-coffee' },
    inventory: { inStock: true, availableQuantity: 12 },
    createdAt: '2026-10-27T00:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Cold Brew Nitro',
    slug: 'cold-brew-nitro',
    description: 'Velvety nitrogen-infused chilled brew.',
    basePriceCents: 550,
    imageUrl: null,
    category: { id: 'cat-2', name: 'Cold Brew', slug: 'cold-brew' },
    inventory: { inStock: false, availableQuantity: 0 },
    createdAt: '2026-10-27T00:00:00.000Z',
  },
];

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Hot Coffee', slug: 'hot-coffee', displayOrder: 1 },
  { id: 'cat-2', name: 'Cold Brew', slug: 'cold-brew', displayOrder: 2 },
];

describe('<MenuPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderMenu = () =>
    render(
      <CartProvider>
        <MenuPage />
      </CartProvider>,
    );

  it('renders products, categories, prices, and stock statuses from API', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockImplementation((endpoint: string) => {
      if (endpoint.includes('/products')) {
        return Promise.resolve({
          data: mockProducts,
          meta: {
            total: 2,
            page: 1,
            limit: 50,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        } as PaginatedResult<Product>);
      }
      if (endpoint.includes('/categories')) {
        return Promise.resolve(mockCategories);
      }
      return Promise.reject(new Error('not found'));
    });

    renderMenu();

    await waitFor(() => {
      expect(screen.getByText('Espresso Romano')).toBeInTheDocument();
      expect(screen.getByText('Cold Brew Nitro')).toBeInTheDocument();
    });

    expect(screen.getByText('4.00 ETB')).toBeInTheDocument();
    expect(screen.getByText('5.50 ETB')).toBeInTheDocument();
    expect(screen.getByText('12 left')).toBeInTheDocument();
    expect(screen.getAllByText('Sold Out').length).toBeGreaterThan(0);
  });

  it('filters products by text search', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockImplementation((endpoint: string) => {
      if (endpoint.includes('/products')) {
        return Promise.resolve({
          data: mockProducts,
          meta: {
            total: 2,
            page: 1,
            limit: 50,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        } as PaginatedResult<Product>);
      }
      return Promise.resolve(mockCategories);
    });

    renderMenu();

    await waitFor(() => {
      expect(screen.getByText('Espresso Romano')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search coffee/i);
    fireEvent.change(searchInput, { target: { value: 'nitro' } });

    expect(screen.queryByText('Espresso Romano')).not.toBeInTheDocument();
    expect(screen.getByText('Cold Brew Nitro')).toBeInTheDocument();
  });

  it('renders skeleton loading while fetching data and shows pagination when loaded', async () => {
    // Generate 10 mock items to trigger multi-page pagination with pageSize = 8
    const tenProducts: Product[] = Array.from({ length: 10 }, (_, i) => ({
      id: `prod-${i + 1}`,
      name: `Specialty Roast ${i + 1}`,
      slug: `specialty-roast-${i + 1}`,
      description: `Delicious brew ${i + 1}`,
      basePriceCents: 450 + i * 25,
      imageUrl: `https://images.unsplash.com/photo-${i}`,
      category: { id: 'cat-1', name: 'Hot Coffee', slug: 'hot-coffee' },
      inventory: { inStock: true, availableQuantity: 15 },
      createdAt: '2026-10-27T00:00:00.000Z',
    }));

    vi.spyOn(apiClient, 'apiRequest').mockImplementation((endpoint: string) => {
      if (endpoint.includes('/products')) {
        return Promise.resolve({
          data: tenProducts,
          meta: {
            total: 10,
            page: 1,
            limit: 50,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        } as PaginatedResult<Product>);
      }
      return Promise.resolve(mockCategories);
    });

    renderMenu();

    // Skeletons should be present initially
    expect(screen.getByTestId('product-card-skeletons')).toBeInTheDocument();

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Specialty Roast 1')).toBeInTheDocument();
    });

    // Skeletons should now be removed
    expect(screen.queryByTestId('product-card-skeletons')).not.toBeInTheDocument();

    // Pagination controls should be rendered
    expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    expect(screen.getByText('Total items:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();

    // Page 1 should only display first 8 products
    expect(screen.getByText('Specialty Roast 8')).toBeInTheDocument();
    expect(screen.queryByText('Specialty Roast 9')).not.toBeInTheDocument();

    // Click next / Page 2
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

    // Now page 2 items should be visible
    expect(screen.getByText('Specialty Roast 9')).toBeInTheDocument();
    expect(screen.getByText('Specialty Roast 10')).toBeInTheDocument();
    expect(screen.queryByText('Specialty Roast 1')).not.toBeInTheDocument();
  });
});
