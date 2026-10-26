import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'akufada_mobile_access_token';
const REFRESH_TOKEN_KEY = 'akufada_mobile_refresh_token';

// In-memory fallback for test runners or environments where SecureStore native bridge is mocked/unavailable
const memoryStore = new Map<string, string>();

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export const secureSession = {
  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    const hasSecureStore = await isSecureStoreAvailable();
    if (hasSecureStore) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      }
    } else {
      memoryStore.set(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        memoryStore.set(REFRESH_TOKEN_KEY, refreshToken);
      }
    }
  },

  async getAccessToken(): Promise<string | null> {
    const hasSecureStore = await isSecureStoreAvailable();
    if (hasSecureStore) {
      try {
        return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      } catch {
        return memoryStore.get(ACCESS_TOKEN_KEY) || null;
      }
    }
    return memoryStore.get(ACCESS_TOKEN_KEY) || null;
  },

  async getRefreshToken(): Promise<string | null> {
    const hasSecureStore = await isSecureStoreAvailable();
    if (hasSecureStore) {
      try {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      } catch {
        return memoryStore.get(REFRESH_TOKEN_KEY) || null;
      }
    }
    return memoryStore.get(REFRESH_TOKEN_KEY) || null;
  },

  async clearTokens(): Promise<void> {
    const hasSecureStore = await isSecureStoreAvailable();
    if (hasSecureStore) {
      try {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      } catch {
        // ignore deletion errors
      }
    }
    memoryStore.delete(ACCESS_TOKEN_KEY);
    memoryStore.delete(REFRESH_TOKEN_KEY);
  },
};
