export const colors = {
  // Backgrounds
  bg: '#0F0F1A',
  bgSurface: '#1A1A2E',
  bgCard: '#16213E',
  bgInput: '#1E2746',
  bgElevated: '#233156',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8FA3',
  textMuted: '#4A4E69',
  textDim: '#333344',

  // Brand
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  purpleDark: '#5B21B6',

  // Bubbles
  bubbleOut: '#7C3AED',
  bubbleIn: '#16213E',
  bubbleInText: '#FFFFFF',
  bubbleOutText: '#FFFFFF',

  // Status
  online: '#34C759',
  danger: '#FF3B30',
  dangerBg: 'rgba(255,59,48,0.1)',
  warning: '#F59E0B',
  shield: '#10B981',

  // Borders
  border: '#2A2F4A',
  borderMid: 'rgba(255,255,255,0.10)',

  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  pill: 28,
  full: 9999,
};

export const font = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 32,
    hero: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
