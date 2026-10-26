import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { AuthProvider } from '../../context/AuthContext';
import * as apiClient from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiRequest: vi.fn(),
  setAccessToken: vi.fn(),
  setOnUnauthorized: vi.fn(),
}));

describe('<RegisterPage />', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderRegister = () =>
    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </BrowserRouter>,
    );

  it('renders registration form fields and heading', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('validates required fields before submitting', async () => {
    renderRegister();
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
    });
  });

  it('displays animated coffee loading overlay while registration request is in flight', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockImplementation(() => new Promise(() => {}));

    renderRegister();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Abebe Bikila' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'abebe@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'ValidPassword123!' } });

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('coffee-loading-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('coffee-loading-animation')).toBeInTheDocument();
      expect(screen.getByText('Creating your account...')).toBeInTheDocument();
    });
  });
});
