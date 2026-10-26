/**
 * Akufada Mobile Design System & Tokens
 *
 * Akufada visual identity: Purple (#58259A) with warm cream surfaces.
 * Accessible contrast, warm neutral surfaces, tactile card elevations.
 */

export const colors = {
  // Brand Purple
  primary: '#58259A',
  primaryDark: '#321447',
  primaryLight: '#DCC9EE',
  primaryBackground: '#F0E7FA',
  primaryHover: '#472078',

  // Surfaces & Backgrounds
  background: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceSubtle: '#F5F1F7',

  // Typography
  textPrimary: '#242126',
  textSecondary: '#625D66',
  textMuted: '#77717B',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E9E3EB',
  borderLight: '#F1EDF2',
  borderFocus: '#58259A',

  // Status & Semantics
  success: '#059669',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',

  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',

  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',

  info: '#2563EB',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // Order status specific
  statusPending: '#D97706',
  statusConfirmed: '#58259A',
  statusInPrep: '#2563EB',
  statusReady: '#58259A',
  statusCompleted: '#059669',
  statusCancelled: '#DC2626',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  price: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: colors.primary,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#58259A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};
