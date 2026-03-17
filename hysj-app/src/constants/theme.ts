export const colors = {
  // Backgrounds
  bg: '#2D2D3A',
  bgSurface: '#353545',
  bgCard: '#3D3D4A',
  bgInput: '#454555',
  bgElevated: '#4A4A5A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9AB0',
  textMuted: '#6B6B80',
  textDim: '#50505F',

  // Brand
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  purpleDark: '#5B21B6',

  // Bubbles — incoming: light/white, outgoing: dark gray
  bubbleOut: '#3D3D4A',
  bubbleIn: '#F0F0F5',
  bubbleInText: '#1A1A2E',
  bubbleOutText: '#FFFFFF',

  // Status
  online: '#34C759',
  danger: '#FF3B30',
  dangerBg: 'rgba(255,59,48,0.1)',
  warning: '#F59E0B',
  shield: '#10B981',

  // Borders
  border: '#4A4A5A',
  borderMid: 'rgba(255,255,255,0.10)',

  // Sheet (light background)
  sheetBg: '#FFFFFF',
  sheetText: '#1A1A2E',
  sheetMuted: '#9A9AB0',
  sheetInput: '#F0F0F5',

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
