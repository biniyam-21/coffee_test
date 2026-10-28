import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContextModule from '../../context/AuthContext';
import { RoleType } from '../../types/api';

describe('<ProtectedRoute />', () => {
  it('renders CoffeeLoadingOverlay while session verification is loading', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      hasRole: () => false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('coffee-loading-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('coffee-loading-animation')).toBeInTheDocument();
    expect(screen.getByText('Verifying session...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated with valid permissions', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-1',
        email: 'admin@akufada.com',
        fullName: 'Sara Haile',
        roles: [RoleType.ADMIN],
        createdAt: '2026-10-27T00:00:00.000Z',
      },
      token: 'valid-token',
      isLoading: false,
      isAuthenticated: true,
      hasRole: (role: RoleType) => role === RoleType.ADMIN,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={[RoleType.ADMIN]}>
          <div>Admin Operational Workspace</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin Operational Workspace')).toBeInTheDocument();
  });
});
