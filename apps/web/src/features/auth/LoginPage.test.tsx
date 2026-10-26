import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../../context/AuthContext';
import * as apiClient from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiRequest: vi.fn(),
  setAccessToken: vi.fn(),
  setOnUnauthorized: vi.fn(),
}));

describe('<LoginPage />', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderLogin = () =>
    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>,
    );

  it('renders login form with fields and demo shortcuts', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /sign in to akufada coffee/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /staff/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /customer/i })).toBeInTheDocument();
  });

  it('validates required fields on submission', async () => {
    renderLogin();
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('populates fields when clicking demo account shortcuts', () => {
    renderLogin();
    const adminDemoBtn = screen.getByRole('button', { name: /admin/i });
    fireEvent.click(adminDemoBtn);

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const passInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;

    expect(emailInput.value).toBe('admin@akufada.com');
    expect(passInput.value).toBe('AdminSecret123!');
  });

  it('displays animated coffee loading overlay while authentication request is in progress', async () => {
    // Return an unresolved promise to keep loading state active
    vi.spyOn(apiClient, 'apiRequest').mockImplementation(() => new Promise(() => {}));

    renderLogin();
    const adminDemoBtn = screen.getByRole('button', { name: /admin/i });
    fireEvent.click(adminDemoBtn);

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('coffee-loading-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('coffee-loading-animation')).toBeInTheDocument();
      expect(screen.getByText('Signing you in...')).toBeInTheDocument();
    });
  });
});
