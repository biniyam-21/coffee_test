import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import * as apiClient from './lib/api-client';

vi.mock('./lib/api-client', () => ({
  apiRequest: vi.fn(),
  setAccessToken: vi.fn(),
  setOnUnauthorized: vi.fn(),
}));

describe('Integrated Web Application (<App />)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(apiClient, 'apiRequest').mockImplementation((endpoint: string) => {
      if (endpoint.includes('/products')) {
        return Promise.resolve({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 50,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
      }
      if (endpoint.includes('/categories')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });
  });

  it('renders application navigation with Akufada brand identity', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Akufada')).toBeInTheDocument();
    });
    expect(screen.getByText('Coffee Artisans')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /menu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('renders shopping cart trigger and streamlined footer', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByLabelText(/open shopping cart/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Handcrafted with/i)).toBeInTheDocument();
    expect(screen.getByText(/Bole, Addis Ababa/i)).toBeInTheDocument();
  });
});
