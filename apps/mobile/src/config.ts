/**
 * Mobile Configuration Module
 *
 * NOTE FOR PHYSICAL DEVICE DEMONSTRATION:
 * When testing on a physical smartphone over local Wi-Fi, the app MUST NOT connect
 * to 'localhost' or '127.0.0.1' because those resolve to the phone's loopback interface.
 * The app must connect to the host computer's LAN IP address (e.g., http://192.168.1.150:80/api/v1).
 */

export interface MobileConfig {
  apiBaseUrl: string;
  theme: {
    primaryColor: string;
    primaryDark: string;
    backgroundColor: string;
    textColor: string;
    cardBackground: string;
  };
}

export const getMobileConfig = (): MobileConfig => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  // Default to LAN IP convention rather than localhost to avoid physical device connection failures
  const apiBaseUrl = (envApiUrl || 'http://192.168.1.150:80/api/v1').replace(/\/+$/, '');

  return {
    apiBaseUrl,
    theme: {
      primaryColor: '#58259A',
      primaryDark: '#321447',
      backgroundColor: '#FAF8F5',
      textColor: '#242126',
      cardBackground: '#FFFFFF',
    },
  };
};

export const config = getMobileConfig();
