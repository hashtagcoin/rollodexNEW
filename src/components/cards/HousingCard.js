import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window'); 

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
  const [imageLoading, setImageLoading] = useState(true); // State for image loading

  const isList = displayAs === 'list';
  const isSwipe = displayAs === 'swipe';

  if (isSwipe) {
    // Swipe Card Layout for Housing (remains unchanged from previous step)
    return (
      <View style={styles.swipeCardContainer}>
        <Image 
          source={item.media_urls && item.media_urls.length > 0 ? { uri: item.media_urls[0] } : require('../../assets/images/placeholder.png')} 
          style={styles.swipeImage}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
        {imageLoading && (
          <ActivityIndicator 
            style={styles.imageLoader}
            size="large" 
            color={FAVORITE_WHITE_OUTLINE}
          />
        )}
        {!imageLoading && (
            <TouchableOpacity 
                style={styles.swipeFavoriteButton} 
                onPress={() => alert('Favourite toggled for ' + item.title)} 
            >
            <AntDesign name={item.is_favourited ? "heart" : "hearto"} size={28} color={item.is_favourited ? FAVORITE_RED : FAVORITE_WHITE_OUTLINE} />
            </TouchableOpacity>
        )}
        <View style={styles.swipeOverlay}>
            <Text style={styles.swipeTitle} numberOfLines={2}>{item.title || 'Housing Title'}</Text>
            <View style={styles.swipeRowContent}>
              <Ionicons name="location-outline" size={18} color={FAVORITE_WHITE_OUTLINE} style={styles.swipeIcon} />
              <Text style={styles.swipeDetailText} numberOfLines={1}>
                {item.suburb || 'Location N/A'}
              </Text>
            </View>
            <View style={styles.swipeRowContent}>
              <Ionicons name="bed-outline" size={18} color={FAVORITE_WHITE_OUTLINE} style={styles.swipeIcon} />
              <Text style={styles.swipeDetailText} numberOfLines={1}>
                {item.bedrooms || 'N/A'} beds, {item.bathrooms || 'N/A'} baths
              </Text>
            </View>
            <Text style={styles.swipePriceText}>
                ${item.weekly_rent || 'N/A'}/week
            </Text>
        </View>
      </View>
    );
  }

  // Grid/List Logic
  const imageContainerStyle = isList ? styles.listImageContainer : styles.gridImageContainer;

  return (
    <TouchableOpacity 
      style={[isList ? styles.listCardContainer : styles.gridCardContainer, isList && styles.fullWidthCard]} 
      onPress={onPress}
    >
      <View style={imageContainerStyle}>
        <Image 
          source={item.media_urls && item.media_urls.length > 0 ? { uri: item.media_urls[0] } : require('../../assets/images/placeholder.png')} 
          style={isList ? styles.listImage : styles.gridImage} 
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
        {imageLoading && (
          <ActivityIndicator 
            style={styles.imageLoader} 
            size="small" 
            color={DARK_GREEN} 
          />
        )}
        {!isList && item.has_group_match && (
          <View style={styles.gridGroupIconContainer}>
            <Ionicons name="people-outline" size={18} color={LIGHT_GREEN_ICON} />
          </View>
        )}
        {!isList && ( // Favorite icon for Grid view - top right of image
          <TouchableOpacity 
            style={styles.gridFavoriteIconContainer} 
            onPress={() => alert('Favourite pressed for ' + item.title)}
          >
            <AntDesign name={item.is_favourited ? "heart" : "hearto"} size={22} color={item.is_favourited ? FAVORITE_RED : FAVORITE_WHITE_OUTLINE} />
          </TouchableOpacity>
        )}
      </View>

      {/* Icons for List View - Placed differently than grid */} 
      {isList && (
        <View style={styles.listIconTopRow}>
          <TouchableOpacity style={styles.iconButtonSmall} onPress={() => alert('Share pressed for ' + item.title)}>
            <Feather name="share-2" size={18} color={ICON_COLOR_DARK} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButtonSmall} onPress={() => alert('Favourite pressed for ' + item.title)}>
            <AntDesign name={item.is_favourited ? "heart" : "hearto"} size={18} color={item.is_favourited ? FAVORITE_RED : ICON_COLOR_DARK} />
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
    backgroundColor: DARK_GREEN,
    borderRadius: 15, 
    padding: 5,
    zIndex: 1, 
  },
  gridFavoriteIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)', // Slight dark background for white icon
    borderRadius: 15,
    padding: 4, // Slightly smaller padding for a tighter look
    zIndex: 1,
  },
  gridInfoContainer: {
    padding: 10,
    // paddingBottom: 40, // Removed as bottom icons are gone
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
    marginTop: 4, // Add some margin top
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: DARK_GREEN,
    // marginTop: 2, // Removed as part of a row now
  },
  gridShareButton: {
    padding: 6, // Add padding for touch target
  },
  // gridIconBottomRow: { // This style is no longer used for grid view
  //   position: 'absolute',
  //   bottom: 8,
  //   right: 8,
  //   flexDirection: 'row',
  // },
  // gridBottomIcon: { // This style is no longer used
  //   marginLeft: 8, 
  // },

  // List Styles
  listCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2.5,
    elevation: 3,
    overflow: 'hidden', 
    position: 'relative', 
  },
  listImageContainer: { 
    width: 100,
    height: '100%', 
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listInfoContainer: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 10, 
    justifyContent: 'space-between', 
  },
  listTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  listDetails: {
    fontSize: 14,
    color: ICON_COLOR_DARK,
    marginBottom: 3,
    flexShrink: 1, 
  },
  listPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DARK_GREEN,
    marginTop: 5,
  },
  listIconTopRow: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row', 
    zIndex: 1, 
  },
  iconButtonSmall: { 
    padding: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    width: '100%', 
  },
  detailIcon: {
    marginRight: 5,
  },

  // Swipe Styles (remain unchanged)
  swipeCardContainer: {
    width: width * 0.85, 
    height: height * 0.6, 
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 5, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    justifyContent: 'flex-end',
  },
  swipeImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  imageLoader: { 
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  swipeFavoriteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1, 
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  swipeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 12, 
    borderBottomRightRadius: 12,
  },
  swipeTitle: {
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  swipeDetailText: {
    fontSize: 15, 
    color: '#FFFFFF',
    marginLeft: 5, 
    flexShrink: 1,
  },
  swipePriceText: {
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8, 
    textAlign: 'right',
  },
  swipeRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  swipeIcon: {
    marginRight: 6,
  },
});

export default HousingCard;
