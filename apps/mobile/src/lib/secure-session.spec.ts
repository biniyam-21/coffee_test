import { secureSession } from './secure-session';

describe('Secure Session Manager', () => {
  beforeEach(async () => {
    await secureSession.clearTokens();
  });

  afterEach(async () => {
    await secureSession.clearTokens();
  });

  it('stores and retrieves access and refresh tokens safely', async () => {
    expect(await secureSession.getAccessToken()).toBeNull();
    expect(await secureSession.getRefreshToken()).toBeNull();

    await secureSession.setTokens('access-token-abc', 'refresh-token-xyz');

    expect(await secureSession.getAccessToken()).toBe('access-token-abc');
    expect(await secureSession.getRefreshToken()).toBe('refresh-token-xyz');
  });

  it('clears all credentials upon logout', async () => {
    await secureSession.setTokens('temp-access-token', 'temp-refresh-token');
    expect(await secureSession.getAccessToken()).toBe('temp-access-token');

    await secureSession.clearTokens();

    expect(await secureSession.getAccessToken()).toBeNull();
    expect(await secureSession.getRefreshToken()).toBeNull();
  });
});
