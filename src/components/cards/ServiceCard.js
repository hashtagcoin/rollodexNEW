import React, { useState, memo, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, ImageBackground } from 'react-native'; 
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window'); 

const ServiceCard = ({ item, onPress, displayAs = 'grid' }) => { 
  console.log(`[ServiceCard] Rendering. Item ID: ${item?.id}, Display: ${displayAs}, Media: ${item?.media_urls?.[0]}`);
  const [imageLoading, setImageLoading] = useState(true); 
  const [isFavorited, setIsFavorited] = useState(item.is_favourited || false); // Add state for favorite

  useEffect(() => {
    setImageLoading(true);
    setIsFavorited(item.is_favourited || false);
  }, [item]);

  let categoryIconName = 'miscellaneous-services';
  switch (item.category?.toLowerCase()) {
    case 'therapy':
      categoryIconName = 'psychology';
      break;
    case 'transport':
      categoryIconName = 'directions-car';
      break;
    case 'support':
      categoryIconName = 'support-agent';
      break;
    case 'tech':
      categoryIconName = 'computer';
      break;
    case 'personal':
      categoryIconName = 'person';
      break;
    case 'social':
      categoryIconName = 'people';
      break;
  }

  if (displayAs === 'swipe') {
    const imageUrl = item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null;
    const displayUri = item.cachedUri || imageUrl;
    console.log(`[ServiceCard] Swipe Image URL: ${displayUri}, Item ID: ${item?.id}`);
    
    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => onPress(item)}
        style={styles.swipeItemContainer}
      >
        <ImageBackground 
          source={displayUri ? { uri: displayUri } : require('../../assets/images/placeholder.png')}
          style={styles.swipeImageBackground}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => {
            setImageLoading(false);
            if (typeof onImageLoaded === 'function') onImageLoaded(displayUri);
          }}
          onError={(e) => {
            console.log(`[ServiceCard] ${displayAs} Image onError. URI: ${displayUri}, Error: ${e.nativeEvent.error}, Item ID: ${item?.id}`);
            setImageLoading(false);
          }}
        >
          {imageLoading && (
            <ActivityIndicator size="large" color={COLORS.primary} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']}
            style={styles.gradientOverlay}
          />
          <View style={styles.swipeTextContainer}>
            <Text style={styles.swipeTitle} numberOfLines={2}>{item.title || 'Service'}</Text>
            {item.subcategory && <Text style={styles.swipeCategory} numberOfLines={1}>{item.subcategory}</Text>}
            <View style={styles.swipeRow}>
              <MaterialIcons name="star-rate" size={SIZES.h3} color={COLORS.white} />
              <Text style={styles.swipeRatingText}>{item.rating ? parseFloat(item.rating).toFixed(1) : 'New'}</Text>
              {item.location_text && (
                <Text style={styles.swipeLocationText} numberOfLines={1}> • {item.location_text}</Text>
              )}
            </View>
            {item.pricing_details && (
              <Text style={styles.swipePriceText}>
                ${item.pricing_details}
              </Text>
            )}
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  const cardStyle = displayAs === 'list' ? styles.listCardContainer : styles.gridCardContainer;
  const imageStyle = displayAs === 'list' ? styles.listImage : styles.gridImage;
  const imageContainerStyle = displayAs === 'list' ? styles.listImageContainer : styles.gridHeroImageContainer; 
  const contentStyle = displayAs === 'list' ? styles.listContentContainer : styles.gridContentContainer;
  const titleStyle = displayAs === 'list' ? styles.listTitle : styles.gridTitle;
  const detailRowStyle = displayAs === 'list' ? styles.listDetailRow : styles.gridDetailRow;

  const imageUrl = item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null;
  const safeImageUrl = imageUrl ? encodeURI(imageUrl) : null;
const imageSource = React.useMemo(() => safeImageUrl ? { uri: safeImageUrl } : require('../../assets/images/placeholder.png'), [safeImageUrl]);
  console.log(`[ServiceCard] ${displayAs} Image URL: ${imageUrl}, Item ID: ${item?.id}`);

  const handleFavoritePress = () => {
    // TODO: Implement actual favorite logic (e.g., API call)
    setIsFavorited(!isFavorited);
    console.log('Favorite pressed for item:', item.id, !isFavorited);
  };

  return (
    <TouchableOpacity style={cardStyle} onPress={() => onPress(item)} activeOpacity={0.8}>
      <View style={imageContainerStyle}> 
        <Image 
          key={`${displayAs}-img-${item.id}`}
          source={imageSource}
          style={imageStyle}
          onLoadStart={() => {
            console.log(`[ServiceCard] ${displayAs} Image onLoadStart. URI: ${imageUrl}, Item ID: ${item?.id}`);
            setImageLoading(true); // Ensure loading starts
          }}
          onLoadEnd={() => {
            console.log(`[ServiceCard] ${displayAs} Image onLoadEnd. URI: ${imageUrl}, Item ID: ${item?.id}`);
            setImageLoading(false);
          }}
          onError={(e) => {
            console.log(`[ServiceCard] ${displayAs} Image onError. URI: ${imageUrl}, Error: ${e.nativeEvent.error}, Item ID: ${item?.id}`);
            setImageLoading(false);
          }}
          resizeMode="cover"
        />
        {imageLoading && (
          <ActivityIndicator 
            style={styles.imageLoader}
            size={displayAs === 'list' ? "medium" : "small"} 
            color="#3A5E49" 
          />
        )}
        {/* Favorite Icon for List and Grid View - overlaid on image */}
        <TouchableOpacity 
          style={displayAs === 'list' ? styles.listFavoriteIconContainer : styles.gridFavoriteIconContainer} 
          onPress={handleFavoritePress}
        >
          <AntDesign name={isFavorited ? "heart" : "hearto"} size={displayAs === 'list' ? 20 : 22} color={isFavorited ? COLORS.error : (displayAs === 'list' ? COLORS.text : COLORS.white)} />
        </TouchableOpacity>
      </View>
      <View style={contentStyle}>
        <Text style={titleStyle} numberOfLines={displayAs === 'list' ? 1 : 2}>{item.title || 'Service Title'}</Text>
        
        {displayAs === 'grid' && (
          <View style={styles.gridAdditionalInfoContainer}>
            {item.subcategory && <Text style={styles.gridDetailText}><MaterialIcons name="category" size={14} color="#555" /> {item.subcategory}</Text>}
            {item.location_text && <Text style={styles.gridDetailText}><MaterialIcons name="location-on" size={14} color="#555" /> {item.location_text}</Text>}
            {item.service_area_type && <Text style={styles.gridDetailText}><MaterialIcons name="public" size={14} color="#555" /> {item.service_area_type}</Text>}
            <View style={styles.gridRatingRow}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <AntDesign name="star" size={14} color="#FFC107" />
                <Text style={[styles.gridDetailText, {marginLeft: 4}]}>{item.rating || 'N/A'} ({item.rating_count || '0'})</Text>
              </View>
              <TouchableOpacity 
                onPress={() => alert('Share pressed for ' + item.title)}
                style={styles.iconButton}
              >
                <Feather name="share-2" size={16} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {displayAs === 'list' && (
          <>
            <View style={detailRowStyle}>
              <MaterialIcons name={categoryIconName} size={16} color="#555" />
              <Text style={styles.detailText}>{item.category || 'Category'}</Text>
              {item.subcategory && <Text style={styles.detailTextMuted}> ({item.subcategory})</Text>}
            </View>
            {item.location_text && (
              <View style={detailRowStyle}>
                <MaterialIcons name="location-on" size={16} color="#555" />
                <Text style={styles.detailText}>{item.location_text}</Text>
              </View>
            )}
            <View style={detailRowStyle}>
              <AntDesign name="star" size={16} color="#FFC107" />
              <Text style={styles.detailText}>{item.rating || '4.5'} ({item.rating_count || item.review_count || '0'} reviews)</Text>
            </View>
            {item.pricing_details && (
              <View style={detailRowStyle}>
                <MaterialIcons name="attach-money" size={16} color="#555" />
                <Text style={styles.detailText}>{item.pricing_details}</Text>
              </View>
            )}
            {item.service_area_type && (
              <View style={detailRowStyle}>
                <MaterialIcons name="public" size={16} color="#555" />
                <Text style={styles.detailText}>{item.service_area_type}</Text>
              </View>
            )}
            {/* Description for list view - slightly different styling */}
            <View style={styles.descriptionContainerList}>
              <Text style={styles.descriptionTextList} numberOfLines={2}>{item.description || 'No description available.'}</Text>
            </View>
          </>
        )}

      </View>
      {/* Share button - For list view, positioned absolutely on the card. For grid, it's with ratings. */}
      {displayAs === 'list' && (
         <TouchableOpacity style={styles.listShareIconContainer} onPress={() => alert('Share pressed for ' + item.title)}>
            <Feather name="share-2" size={18} color={COLORS.text} />
          </TouchableOpacity>
      )}
      {/* Grid View: Favorite icon is on image, Share button is with ratings */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  swipeItemContainer: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    ...SHADOWS.medium,
    backgroundColor: COLORS.lightGray, // Fallback color
  },
  swipeImageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', // Align text container to bottom
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  swipeTextContainer: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 120, // Increased padding to avoid overlap with action buttons
    paddingTop: SIZES.padding, // Keep some top padding as well
  },
  swipeTitle: {
    ...FONTS.h2,
    color: COLORS.white,
    fontWeight: 'bold',
    marginBottom: SIZES.base / 2,
  },
  swipeCategory: {
    ...FONTS.body4,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SIZES.base,
  },
  swipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  swipeRatingText: {
    ...FONTS.body3,
    color: COLORS.white,
    marginLeft: SIZES.base / 2,
  },
  swipeLocationText: {
    ...FONTS.body4,
    color: COLORS.white,
    opacity: 0.9,
    flexShrink: 1, // Allow text to shrink if needed
  },
  swipePriceText: {
    ...FONTS.h3,
    color: COLORS.white,
    fontWeight: 'bold',
    marginTop: SIZES.base / 2,
  },

  gridCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    // padding: 12, // Padding will be handled by content container if image is full width top
    margin: 8,
    // alignItems: 'center', // Content below image will handle its own alignment
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: width / 2 - 24, 
    position: 'relative', // For absolute positioning of favorite icon
  },
  gridHeroImageContainer: { // Renamed and restyled from gridImageContainer
    width: '100%', // Full width of the card
    height: 120,    // Aspect ratio for hero image, adjust as needed
    borderTopLeftRadius: 12, // Match card's border radius
    borderTopRightRadius: 12,
    marginBottom: 10,
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#E0E0E0', 
    overflow: 'hidden', // Ensures image respects border radius
    position: 'relative', // Needed for absolute positioned favorite icon
  },
  gridImage: {
    width: '100%', // Takes full width of gridHeroImageContainer
    height: '100%', // Takes full height of gridHeroImageContainer
    // borderRadius: 40, // Removed: no longer circular
    // marginBottom: 10, // Handled by gridHeroImageContainer
    backgroundColor: '#E0E0E0', // Kept for placeholder look
  },
  gridContentContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12, 
    paddingBottom: 36, 
    paddingTop: 8,     
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 40, 
  },
  gridDetailText: { 
    fontSize: 12,
    color: '#555',
    marginLeft: 5,
    textAlign: 'center',
    marginBottom: 3, // Space between lines of detail
  },
  gridDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    // alignSelf: 'center', // Already centered by gridContentContainer
  },
  gridFavoriteIconContainer: { // Style for favorite icon on grid image
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 5,
    // backgroundColor: 'rgba(0,0,0,0.3)', // Optional for better visibility
    // borderRadius: 15,
  },
  gridRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  gridShareButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  listCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: SIZES.radius, // Consistent radius with HousingCard
    marginVertical: 8,
    marginHorizontal: SIZES.padding, // Consistent padding
    flexDirection: 'row',
    padding: SIZES.base, // Slightly reduced padding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Consistent shadow
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Consistent elevation
    position: 'relative', // For share icon
  },
  listImageContainer: { 
    width: 100, // Adjusted size for ServiceCard list image
    height: 100, // Square image
    borderRadius: SIZES.radiusSml, // Consistent image border radius
    marginRight: SIZES.paddingSml, // Space between image and text
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0', 
    overflow: 'hidden', // Important for image border radius
    position: 'relative', // For favorite icon overlay
  },
  listImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  listFavoriteIconContainer: { // Style for favorite icon on list image
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // Slight background for visibility
    borderRadius: 15, // Circular background
  },
  listContentContainer: {
    flex: 1, 
    justifyContent: 'space-between', // Changed to space-between for better vertical distribution
    paddingVertical: SIZES.base / 4, // Minimal vertical padding
  },
  listTitle: {
    fontSize: SIZES.font * 1.05, // Slightly adjusted size
    fontWeight: '600', // Semibold
    color: COLORS.text, // Use theme color
    marginBottom: SIZES.base / 2,
  },
  listDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base / 2, // Consistent spacing
  },
  descriptionContainerList: {
    marginTop: SIZES.base / 2, // Add a little space before description
  },
  descriptionTextList: {
    fontSize: SIZES.font * 0.85, // Slightly smaller description text
    color: COLORS.gray, // Lighter color for description
  },
  detailText: { 
    fontSize: SIZES.font * 0.9, // Consistent detail text size
    color: COLORS.textSecondary, // Use secondary text color
    marginLeft: SIZES.base / 2, // Space from icon
    flexShrink: 1, // Allow text to shrink
  },
  detailTextMuted: {
    fontSize: SIZES.font * 0.9,
    color: COLORS.gray, // Muted color for less important details
    marginLeft: SIZES.base / 4,
  },
  listShareIconContainer: { // For share icon on the card itself
    position: 'absolute',
    top: SIZES.base,
    right: SIZES.base,
    padding: 4,
    // backgroundColor: 'rgba(0, 0, 0, 0.05)', // Optional subtle background
    // borderRadius: 15,
  },
  iconButton: { // General icon button style (can be removed if not used elsewhere)
    padding: 8,
  },
  imageLoader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});

const arePropsEqual = (prevProps, nextProps) => {
  const itemContentBasicallySame = 
    prevProps.item?.id === nextProps.item?.id && 
    prevProps.item?.title === nextProps.item?.title &&
    prevProps.item?.media_urls?.[0] === nextProps.item?.media_urls?.[0];
  // Note: For objects/arrays like 'item', true stability means same reference or deep equality.
  // React.memo by default does shallow (reference) comparison for object props.

  const itemRefChanged = prevProps.item !== nextProps.item;
  const onPressChanged = prevProps.onPress !== nextProps.onPress;
  const displayAsChanged = prevProps.displayAs !== nextProps.displayAs;

  if (!itemContentBasicallySame || onPressChanged || displayAsChanged) {
    console.log(`[ServiceCard.arePropsEqual] Props changed for ID ${nextProps.item?.id}. Re-rendering.`);
    if (itemRefChanged) console.log(`  - Item reference changed: ${!itemContentBasicallySame ? 'Content also diff' : 'Content same, ref diff'}`);
    if (prevProps.item?.id === nextProps.item?.id && prevProps.item?.media_urls?.[0] !== nextProps.item?.media_urls?.[0]) {
        console.log(`  - Item media_urls changed: ${prevProps.item?.media_urls?.[0]} vs ${nextProps.item?.media_urls?.[0]}`);
    }
    if (onPressChanged) console.log('  - onPress function reference changed.');
    if (displayAsChanged) console.log('  - displayAs changed.');
    return false; // Props are not equal, re-render
  }
  // console.log(`[ServiceCard.arePropsEqual] Props ARE equal for ID ${nextProps.item?.id}. Skipping render.`);
  return true; // Props are equal, skip re-render
};

export default React.memo(ServiceCard, arePropsEqual);
