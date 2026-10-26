import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse, RoleType } from '../types/api';
import { apiRequest, setAccessToken, setOnUnauthorized } from '../lib/api-client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: RoleType) => boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phoneNumber?: string,
  ) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'akufada_access_token';
const REFRESH_TOKEN_KEY = 'akufada_refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applyAuth = useCallback(
    (newUser: User, newAccessToken: string, newRefreshToken?: string) => {
      setUser(newUser);
      setTokenState(newAccessToken);
      setAccessToken(newAccessToken);
      try {
        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }
      } catch {
        // ignore storage failures in restricted environments
      }
    },
    [],
  );

  const clearAuth = useCallback(() => {
    setUser(null);
    setTokenState(null);
    setAccessToken(null);
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // ignore logout API failure, proceed with local cleanup
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  // Handle automatic logout when receiving 401 Unauthorized from API
  useEffect(() => {
    setOnUnauthorized(() => {
      clearAuth();
    });
  }, [clearAuth]);

  const refreshSession = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (!storedRefreshToken && !storedAccessToken) {
      setIsLoading(false);
      return;
    }

    // Attempt restoring session via access token or refresh token
    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
      try {
        const me = await apiRequest<User>('/auth/me');
        setUser(me);
        setTokenState(storedAccessToken);
        setIsLoading(false);
        return;
      } catch {
        // Access token might be expired, attempt refresh next
      }
    }

    if (storedRefreshToken) {
      try {
        const res = await apiRequest<{ accessToken: string; expiresIn: number }>('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
        setAccessToken(res.accessToken);
        setTokenState(res.accessToken);
        localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
        const me = await apiRequest<User>('/auth/me');
        setUser(me);
      } catch {
        clearAuth();
      }
    } else {
      clearAuth();
    }

    setIsLoading(false);
  }, [clearAuth]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    applyAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    return res.user;
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    phoneNumber?: string,
  ): Promise<User> => {
    const res = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        fullName,
        phoneNumber: phoneNumber || undefined,
      }),
    });

    applyAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    return res.user;
  };

  const hasRole = (role: RoleType): boolean => {
    return user ? user.roles.includes(role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        hasRole,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
