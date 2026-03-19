export const colors = {
  // Backgrounds — from Figma: #292F3F base
  bg: '#292F3F',
  bgSurface: '#373E4E',
  bgCard: '#373E4E',
  bgInput: '#000000',
  bgElevated: '#414756',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#7A8194',
  textMuted: '#596787',
  textDim: '#4A5568',

  // Brand — from Figma accents
  purple: '#B347EA',
  purpleLight: '#C77EF0',
  purpleDark: '#8B2FC4',
  blue: '#03A9F1',
  green: '#00AC83',

  // Bubbles — from Figma: sent=#272A35, received=#373E4E
  bubbleOut: '#272A35',
  bubbleIn: '#373E4E',
  bubbleInText: '#FFFFFF',
  bubbleOutText: '#FFFFFF',

  // Status
  online: '#00AC83',
  danger: '#FF3B30',
  dangerBg: 'rgba(255,59,48,0.1)',
  warning: '#F59E0B',
  shield: '#00AC83',

  // Borders
  border: '#414756',
  borderMid: 'rgba(255,255,255,0.08)',

  // Sheet (dark — matching app theme, not white)
  sheetBg: '#292F3F',
  sheetText: '#FFFFFF',
  sheetMuted: '#7A8194',
  sheetInput: '#000000',

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
  md: 10,
  lg: 20,
  xl: 22,
  pill: 30,
  full: 9999,
};

export const font = {
  sizes: {
    xs: 12,
    sm: 13,
    md: 14,
    lg: 15,
    xl: 20,
    xxl: 32,
    hero: 36,
  },
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
