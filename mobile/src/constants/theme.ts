/**
 * Theme / Design tokens for Chaad Baad (चाडबाड)
 */

export const COLORS = {
  // Primary — warm saffron/vermilion inspired by Hindu festivals
  primary: '#E8543E',
  primaryDark: '#C73E2A',
  primaryLight: '#FF7A63',

  // Secondary — deep maroon/burgundy
  secondary: '#8B1A4A',
  secondaryLight: '#B44272',

  // Accent — gold / mustard (festive)
  accent: '#F5A623',
  accentLight: '#FFD076',

  // Background
  background: '#FFF8F2',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF3EB',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#5A5A72',
  textMuted: '#9A9AB0',
  textOnPrimary: '#FFFFFF',

  // Utility
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  info: '#17A2B8',

  // Borders & Dividers
  border: '#F0E0D6',
  divider: '#F5E6DC',

  // Status chips
  statusPlaced: '#6C757D',
  statusConfirmed: '#007BFF',
  statusPacked: '#FD7E14',
  statusDelivery: '#6F42C1',
  statusDelivered: '#28A745',
  statusCancelled: '#DC3545',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  caption: 12,
  body: 14,
  bodyLarge: 16,
  subtitle: 18,
  title: 22,
  heading: 28,
  hero: 36,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};
