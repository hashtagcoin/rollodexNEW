import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Base colors
  primary: '#1E90FF', // Example: Dodger Blue
  secondary: '#FF6347', // Example: Tomato

  // Specific App Colors
  DARK_GREEN: '#009966', // Updated to a vibrant green for selected buttons
  LIGHT_GREEN: '#90EE90',
  RED: '#FF0000',
  TEXT_INPUT_GRAY: '#D3D3D3',
  ICON_COLOR_DARK: '#333333',
  ICON_COLOR_LIGHT: '#FFFFFF',
  LIKE_GREEN: '#34C759', // For like buttons
  DISLIKE_RED: '#FF3B30', // For dislike buttons

  // Neutral Colors
  black: '#000000',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  darkGray: '#A9A9A9',
  gray: '#808080',
};

// Export DARK_GREEN as a constant for consistent use
export const DARK_GREEN = COLORS.DARK_GREEN;


export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 12,
  padding: 24,

  // Font sizes
  h1: 30,
  h2: 22,
  h3: 16,
  h4: 14,
  body1: 30,
  body2: 22,
  body3: 16,
  body4: 14,
  body5: 12,

  // App dimensions
  width,
  height,
};

export const FONTS = {
  h1: { fontFamily: 'System', fontSize: SIZES.h1, lineHeight: 36 },
  h2: { fontFamily: 'System', fontSize: SIZES.h2, lineHeight: 30 },
  h3: { fontFamily: 'System', fontSize: SIZES.h3, lineHeight: 22 },
  h4: { fontFamily: 'System', fontSize: SIZES.h4, lineHeight: 22 },
  body1: { fontFamily: 'System', fontSize: SIZES.body1, lineHeight: 36 },
  body2: { fontFamily: 'System', fontSize: SIZES.body2, lineHeight: 30 },
  body3: { fontFamily: 'System', fontSize: SIZES.body3, lineHeight: 22 },
  body4: { fontFamily: 'System', fontSize: SIZES.body4, lineHeight: 22 },
  body5: { fontFamily: 'System', fontSize: SIZES.body5, lineHeight: 22 },
};

export const SHADOWS = {
  light: {
    shadowColor: COLORS.darkGray,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: COLORS.darkGray,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.29,
    shadowRadius: 4.65,
    elevation: 7,
  },
  dark: {
    shadowColor: COLORS.darkGray,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.41,
    shadowRadius: 9.11,
    elevation: 14,
  },
};

export default { COLORS, SIZES, FONTS, SHADOWS };
