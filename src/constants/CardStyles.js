import { COLORS, SIZES, SHADOWS } from './theme';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Calculate card dimensions
const GRID_CARD_WIDTH = (width / 2) - 10; // Half width for 2-column grid, with smaller margins
const LIST_CARD_WIDTH = width; // Full width for list view

export const CardStyles = {
  // ===== GRID VIEW STYLES =====
  gridCardWrapper: {
    width: '50%',
    marginBottom: 8,
    paddingHorizontal: 1,
  },
  
  gridCardContainer: {
    width: GRID_CARD_WIDTH,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    ...SHADOWS.medium,
    alignSelf: 'center',
  },
  
  gridCardInner: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    height: 240,
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
    marginTop: 2,
    marginBottom: 4,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  
  listCardInner: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 6,
    paddingLeft: 12,
    borderRadius: 8,
  },
  
  listImageContainer: {
    width: 100,
    height: 100,
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
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  
  subtitle: {
    fontSize: SIZES.body4,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  
  price: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.black,
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
    color: COLORS.darkGray,
    marginLeft: 4,
  },
  
  // ===== ICON CONTAINERS =====
  iconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // ===== LOADING =====
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 1,
  },
};

export default CardStyles;
