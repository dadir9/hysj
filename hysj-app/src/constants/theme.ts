export const colors = {
  // Backgrounds
  bg: '#000000',
  bgSurface: '#0D0D0F',
  bgCard: '#1A1A1F',
  bgInput: '#1C1C1E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#48484A',
  textDim: '#333344',

  // Brand
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  purpleDark: '#5B21B6',

  // Bubbles
  bubbleOut: '#1C1C1E',
  bubbleIn: '#F2F2F7',
  bubbleInText: '#000000',
  bubbleOutText: '#FFFFFF',

  // Status
  online: '#34C759',
  danger: '#FF3B30',
  dangerBg: 'rgba(255,59,48,0.1)',
  warning: '#F59E0B',
  shield: '#10B981',

  // Borders
  border: '#2C2C2E',
  borderMid: 'rgba(255,255,255,0.16)',

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
