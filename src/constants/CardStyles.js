import { COLORS, SIZES, SHADOWS } from './theme';
import { Dimensions, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

// Calculate card dimensions
const GRID_CARD_WIDTH = '100%'; // Full width of its container
const LIST_CARD_WIDTH = width; // Full width for list view

// Utility function to determine if title is likely single line based on length
export const isSingleLineTitle = (title) => {
  // Approximate calculation based on average character width
  const avgCharWidth = 9; // Approximate width in pixels of average character
  const maxChars = 25; // Approximate characters that fit on one line for grid view
  return !title || title.length < maxChars;
};

// Component to render a title with consistent height regardless of line count
export const ConsistentHeightTitle = ({ title, style, numberOfLines = 2 }) => {
  const singleLine = isSingleLineTitle(title);
  
  return (
    <View>
      <Text style={style} numberOfLines={numberOfLines}>{title}</Text>
      {singleLine && <Text style={{ height: 18 }}>{"\u200B"}</Text>}
    </View>
  );
};

// Card label colors for consistent styling
const LABEL_COLORS = {
  background: '#E6F2FF', // Light blue
  border: '#0066CC',    // Dark blue
  text: '#003366',      // Dark blue text
};

export const CardStyles = {
  // ===== GRID VIEW STYLES =====
  gridCardWrapper: {
    width: '50%',
    marginBottom: 12,
    paddingHorizontal: 3.5, // Halved from 7 to reduce gap between cards
  },
  
  gridCardContainer: {
    width: GRID_CARD_WIDTH,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    ...SHADOWS.medium,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  
  gridCardInner: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    height: 260,
  },
  
  gridImageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  
  gridImage: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  
  // ===== LIST VIEW STYLES =====
  listCardContainer: {
    width: '100%',
    minHeight: 120,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    ...SHADOWS.medium,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  
  listCardInner: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 14,
    borderRadius: 8,
    minHeight: 120,
    alignItems: 'flex-start',
  },
  
  listImageContainer: {
    width: 110,
    height: 110,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  listImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  
  listContentContainer: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'space-between',
  },
  
  // ===== CARD ELEMENTS =====
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  
  title: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 0,
  },
  
  subtitle: {
    fontSize: SIZES.body4,
    color: COLORS.black,
    marginBottom: 0,
  },
  
  price: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  
  // ===== CARD LABELS =====
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LABEL_COLORS.background,
    borderWidth: 1,
    borderColor: LABEL_COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  
  labelText: {
    fontSize: SIZES.body5,
    fontWeight: '600',
    color: COLORS.black,
  },
  
  labelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 2,
  },

  // ===== RATING =====
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  ratingText: {
    fontSize: SIZES.body4,
    fontWeight: 'bold',
    color: COLORS.black,
    marginLeft: 4,
  },
  
  ratingStarIcon: {
    color: COLORS.black,
  },
  
  // ===== ICON CONTAINERS =====
  iconContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
  },
  
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  iconCircleActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  favoriteIcon: {
    color: COLORS.white,
    fontSize: 18, // Explicitly set size for consistency
  },
  
  favoriteIconActive: {
    color: 'red', // Using direct red color for consistency
    fontSize: 18, // Explicitly set size for consistency
  },
  
  // ===== LOADING =====
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e0e0e0', // Light grey placeholder
  },
};

// Export all utilities and styles
export default {
  ...CardStyles,
  isSingleLineTitle,
  ConsistentHeightTitle
};
