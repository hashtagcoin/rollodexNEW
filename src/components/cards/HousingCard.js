import React, { useState, memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, ImageBackground } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window'); 

// Calculate width for grid dynamically
const numColumnsGrid = 2;
const gridMarginHorizontal = 8;
const gridCardWidth = (width - (gridMarginHorizontal * (numColumnsGrid + 1)) * 1.2 ) / numColumnsGrid; // Adjusted for better spacing

const DARK_GREEN = '#3A5E49';
const LIGHT_GREEN_ICON = '#C8E6C9';
const ICON_COLOR_DARK = '#555';
const FAVORITE_RED = '#FF6B6B';
const FAVORITE_WHITE_OUTLINE = '#FFFFFF';

const HousingCard = ({ item, onPress, displayAs = 'grid' }) => {
  console.log(`[HousingCard] Rendering. Item ID: ${item?.id}, Display: ${displayAs}, Media: ${item?.media_urls?.[0]}`);
  const [imageLoading, setImageLoading] = useState(true); // State for image loading

  const isList = displayAs === 'list';
  const isSwipe = displayAs === 'swipe';

  if (isSwipe) {
    const imageUrl = item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null;
    console.log(`[HousingCard] Swipe Image URL: ${imageUrl}, Item ID: ${item?.id}`);
    
    return (
      <TouchableOpacity style={[styles.swipeItemContainer]} onPress={() => onPress(item)} activeOpacity={0.9}>
        <ImageBackground 
          source={imageUrl ? { uri: imageUrl } : require('../../assets/images/default-housing.png')}
          style={styles.swipeImageBackground}
          resizeMode="cover"
          onLoadStart={() => {
            setImageLoading(true);
            console.log(`[SwipeTiming] Image load START for item ${item?.id} at ${performance.now()}`);
          }}
          onLoadEnd={() => {
            setImageLoading(false);
            console.log(`[SwipeTiming] Image load END for item ${item?.id} at ${performance.now()}`);
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
            <Text style={styles.swipeTitle} numberOfLines={2}>{item.property_name || 'Beautiful Home'}</Text>
            <Text style={styles.swipeAddress} numberOfLines={1}>{item.address_street}, {item.address_city}</Text>
            <View style={styles.swipeRow}>
              <Ionicons name="bed-outline" size={SIZES.h3} color={COLORS.white} />
              <Text style={styles.swipeDetailText}>{item.bedrooms} beds</Text>
              <Ionicons name="water-outline" size={SIZES.h3} color={COLORS.white} style={{ marginLeft: SIZES.padding }} />
              <Text style={styles.swipeDetailText}>{item.bathrooms} baths</Text>
            </View>
            <Text style={styles.swipePriceText}>
              ${item.rent_amount ? item.rent_amount.toLocaleString() : 'N/A'} / {item.rent_frequency || 'month'}
            </Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  // Grid/List Logic
  const imageContainerStyle = isList ? styles.listImageContainer : styles.gridImageContainer;
  const imageUrl = item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null;
  console.log(`[HousingCard] ${displayAs} Image URL: ${imageUrl}, Item ID: ${item?.id}`);

  return (
    <TouchableOpacity 
      style={[isList ? styles.listCardContainer : styles.gridCardContainer, isList && styles.fullWidthCard]} 
      onPress={() => onPress(item)}
    >
      <View style={imageContainerStyle}>
        <Image 
          key={`${isList ? 'list' : 'grid'}-img-${item.id}`}
          source={imageUrl ? { uri: imageUrl } : require('../../assets/images/default-housing.png')} 
          style={isList ? styles.listImage : styles.gridImage}
          onLoadStart={() => {
            console.log(`[HousingCard] ${displayAs} Image onLoadStart. URI: ${imageUrl}, Item ID: ${item?.id}`);
            setImageLoading(true);
          }}
          onLoadEnd={() => {
            console.log(`[HousingCard] ${displayAs} Image onLoadEnd. URI: ${imageUrl}, Item ID: ${item?.id}`);
            setImageLoading(false);
          }}
          onError={(e) => {
            console.log(`[HousingCard] ${displayAs} Image onError. URI: ${imageUrl}, Error: ${e.nativeEvent.error}, Item ID: ${item?.id}`);
            setImageLoading(false);
          }}
          resizeMode="cover"
        />
        {imageLoading && (
          <ActivityIndicator 
            style={styles.imageLoader} 
            size={isList ? "medium" : "small"} 
            color={DARK_GREEN} 
          />
        )}
        {!isList && item.has_group_match && (
          <View style={styles.gridGroupIconContainer}>
            <Ionicons name="people-outline" size={18} color={LIGHT_GREEN_ICON} />
          </View>
        )}
        {/* Favorite icon for Grid view - top right of image */}
        {!isList && (
          <TouchableOpacity 
            style={styles.gridFavoriteIconContainer} 
            onPress={() => alert('Favourite pressed for ' + item.title)} 
          >
            <AntDesign name={item.is_favourited ? "heart" : "hearto"} size={22} color={item.is_favourited ? FAVORITE_RED : FAVORITE_WHITE_OUTLINE} />
          </TouchableOpacity>
        )}
        {/* Favorite icon for List view - top right of image */}
        {isList && (
          <TouchableOpacity 
            style={styles.listFavoriteIconContainer} 
            onPress={() => alert('Favourite pressed for ' + item.title)} 
          >
            <AntDesign name={item.is_favourited ? "heart" : "hearto"} size={20} color={item.is_favourited ? FAVORITE_RED : ICON_COLOR_DARK} />
          </TouchableOpacity>
        )}
      </View>

      {/* Share Icon for List View - Placed at top right of card */} 
      {isList && (
        <View style={styles.listShareIconContainer}> 
          <TouchableOpacity style={styles.iconButtonSmall} onPress={() => alert('Share pressed for ' + item.title)}>
            <Feather name="share-2" size={18} color={ICON_COLOR_DARK} />
          </TouchableOpacity>
        </View>
      )}

      <View style={isList ? styles.listInfoContainer : styles.gridInfoContainer}>
        <Text style={isList ? styles.listTitle : styles.gridTitle} numberOfLines={isList ? 1 : 2}>
          {item.title || 'Housing Title'}
        </Text>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={ICON_COLOR_DARK} style={styles.detailIcon} />
          <Text style={isList ? styles.listDetails : styles.gridDetails} numberOfLines={1}>
            {item.suburb || 'Location N/A'} 
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="bed-outline" size={16} color={ICON_COLOR_DARK} style={styles.detailIcon} />
          <Text style={isList ? styles.listDetails : styles.gridDetails} numberOfLines={1}>
            {item.bedrooms || 'N/A'} beds, {item.bathrooms || 'N/A'} baths
          </Text>
        </View>
        
        {/* Price and Share Icon Row for Grid View */} 
        {!isList ? (
          <View style={styles.gridPriceShareRow}>
            <Text style={styles.gridPrice}>
              ${item.weekly_rent || 'N/A'}/week
            </Text>
            <TouchableOpacity style={styles.gridShareButton} onPress={() => alert('Share pressed for ' + item.title)}>
              <Feather name="share-2" size={20} color={DARK_GREEN} />
            </TouchableOpacity>
          </View>
        ) : ( // Price for List view (on its own line)
          <Text style={styles.listPrice}>
            ${item.weekly_rent || 'N/A'}/week
          </Text>
        )}
        
        {/* Old gridIconBottomRow removed as favorite is moved and share is with price */}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Grid Styles
  gridCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: gridMarginHorizontal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    width: gridCardWidth,
    position: 'relative', 
  },
  gridImageContainer: { 
    width: '100%',
    height: 120, 
    borderTopLeftRadius: 8, // Keep rounded corners for image container top
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    overflow: 'hidden', 
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  gridGroupIconContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 4,
  },
  gridFavoriteIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 5, 
  },
  gridInfoContainer: {
    padding: 10, 
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  gridDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    flexShrink: 1, 
  },
  gridPriceShareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4, 
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: DARK_GREEN,
  },
  gridShareButton: {
    padding: 6, 
  },
  // List Styles
  listCardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: SIZES.radius, 
    marginVertical: 8,
    marginHorizontal: SIZES.padding, 
    padding: SIZES.base, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listImageContainer: { 
    width: 110, 
    height: 110, 
    borderRadius: SIZES.radiusSml, 
    marginRight: SIZES.base, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    overflow: 'hidden', 
    position: 'relative', 
  },
  listImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  listFavoriteIconContainer: { 
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
    borderRadius: 15, 
  },
  listShareIconContainer: { 
    position: 'absolute',
    top: SIZES.base,
    right: SIZES.base,
    flexDirection: 'row', 
    zIndex: 1, 
  },
  iconButtonSmall: { 
    padding: 4, 
  },
  listInfoContainer: {
    flex: 1,
    justifyContent: 'space-around', 
    paddingVertical: SIZES.base / 2, 
  },
  listTitle: {
    fontSize: SIZES.font * 1.1, 
    fontWeight: '600',
    color: COLORS.text, 
    marginBottom: SIZES.base / 2, 
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base / 2, 
  },
  detailIcon: {
    marginRight: SIZES.base / 2,
  },
  listDetails: {
    fontSize: SIZES.font * 0.9, 
    color: COLORS.gray, 
    flexShrink: 1, 
  },
  listPrice: {
    fontSize: SIZES.font * 1.1, 
    fontWeight: 'bold',
    color: DARK_GREEN, 
    marginTop: SIZES.base / 2, 
  },
  fullWidthCard: { 
    // width: width - (SIZES.padding * 2), 
    // alignSelf: 'center',
  },
  imageLoader: { 
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  // Swipe Styles
  swipeItemContainer: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    ...SHADOWS.medium,
    backgroundColor: COLORS.lightGray, 
  },
  swipeImageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', 
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  swipeTextContainer: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 120, 
    paddingTop: SIZES.padding,
  },
  swipeTitle: {
    ...FONTS.h2,
    color: COLORS.white,
    fontWeight: 'bold',
    marginBottom: SIZES.base / 2,
  },
  swipeAddress: {
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
  swipeDetailText: {
    ...FONTS.body3,
    color: COLORS.white,
    marginLeft: SIZES.base / 2,
  },
  swipePriceText: {
    ...FONTS.h3,
    color: COLORS.white,
    fontWeight: 'bold',
    marginTop: SIZES.base / 2,
  },
});

export default React.memo(HousingCard);
