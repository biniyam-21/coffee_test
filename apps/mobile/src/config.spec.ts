import { getMobileConfig } from './config';

describe('Mobile Configuration & Network Conventions', () => {
  it('should use Akufada purple (#58259A) as the primary accent color', () => {
    const config = getMobileConfig();
    expect(config.theme.primaryColor).toBe('#58259A');
    expect(config.theme.primaryDark).toBe('#321447');
  });

  it('should default to host LAN IP rather than localhost for physical device accessibility', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    const config = getMobileConfig();
    expect(config.apiBaseUrl).not.toContain('localhost');
    expect(config.apiBaseUrl).not.toContain('127.0.0.1');
    expect(config.apiBaseUrl).toMatch(/^http:\/\/192\.168\.\d+\.\d+/);
  });

  it('should allow overriding via EXPO_PUBLIC_API_URL environment variable', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.0.50:80/api/v1';
    const config = getMobileConfig();
    expect(config.apiBaseUrl).toBe('http://10.0.0.50:80/api/v1');
    delete process.env.EXPO_PUBLIC_API_URL;
  });
});
