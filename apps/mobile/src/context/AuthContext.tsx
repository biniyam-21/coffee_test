import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse, RoleType } from '../types/api';
import { apiRequest, setAccessToken, setOnUnauthorized } from '../lib/api-client';
import { secureSession } from '../lib/secure-session';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applyAuth = useCallback(
    async (newUser: User, newAccessToken: string, newRefreshToken?: string) => {
      setUser(newUser);
      setTokenState(newAccessToken);
      setAccessToken(newAccessToken);
      await secureSession.setTokens(newAccessToken, newRefreshToken);
    },
    [],
  );

  const clearAuth = useCallback(async () => {
    setUser(null);
    setTokenState(null);
    setAccessToken(null);
    await secureSession.clearTokens();
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await secureSession.getRefreshToken();
    try {
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // ignore network logout failure, always clean local tokens
    } finally {
      await clearAuth();
    }
  }, [clearAuth]);

  // Handle centralized 401 Unauthorized API responses
  useEffect(() => {
    setOnUnauthorized(() => {
      clearAuth();
    });
  }, [clearAuth]);

  const refreshSession = useCallback(async () => {
    try {
      const storedAccessToken = await secureSession.getAccessToken();
      const storedRefreshToken = await secureSession.getRefreshToken();

      if (!storedAccessToken && !storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      // Try current access token first
      if (storedAccessToken) {
        setAccessToken(storedAccessToken);
        try {
          const me = await apiRequest<User>('/auth/me');
          setUser(me);
          setTokenState(storedAccessToken);
          setIsLoading(false);
          return;
        } catch {
          // Token might be expired, proceed to refresh token
        }
      }

      // Try refresh token
      if (storedRefreshToken) {
        try {
          const res = await apiRequest<{ accessToken: string; expiresIn: number }>(
            '/auth/refresh',
            {
              method: 'POST',
              body: JSON.stringify({ refreshToken: storedRefreshToken }),
            },
          );
          setAccessToken(res.accessToken);
          setTokenState(res.accessToken);
          await secureSession.setTokens(res.accessToken, storedRefreshToken);
          const me = await apiRequest<User>('/auth/me');
          setUser(me);
        } catch {
          await clearAuth();
        }
      } else {
        await clearAuth();
      }
    } catch {
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await applyAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
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

    await applyAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
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
