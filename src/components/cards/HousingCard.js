import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, ActivityIndicator } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { getValidImageUrl } from '../../utils/imageHelper';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window'); 

// Calculate width for grid dynamically
const numColumnsGrid = 2;
const gridMarginHorizontal = 4; // Reduced from 8 to 4 (half the original value)
// Calculate exactly half the screen width with just enough margin to fit two cards side by side
const gridCardWidth = (width / numColumnsGrid) - (gridMarginHorizontal * 2);

const HousingCard = ({ item, onPress, displayAs = 'grid', onImageLoaded }) => {
  // State for image loading and favorite status
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(item.is_favourited || false);

  // Update favorite status when item changes
  useEffect(() => {
    setIsFavorited(item.is_favourited || false);
  }, [item]);

  // Extract and process data from the housing item
  const title = item.title || item.property_name || 'Beautiful Home';
  const location = item.suburb || item.address_suburb || 'Location N/A';
  const price = item.rent_amount ? `$${item.rent_amount.toLocaleString()}` : '$N/A';
  const rentFrequency = item.rent_frequency || 'month';
  // Only show formatted price if there's a valid rent amount
  const formattedPrice = item.rent_amount ? `${price}/${rentFrequency}` : null;
  
  // Weekly rent amount for grid view bottom corner
  const weeklyRent = item.weekly_rent ? `$${item.weekly_rent}/wk` : null;
  const bedrooms = item.bedrooms || 'N/A';
  const bathrooms = item.bathrooms || 'N/A';
  const hasGroupMatch = item.has_group_match || false;
  
  // Extract and process image URL
  const rawImageUrl = item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null;
  const imageUrl = getValidImageUrl(rawImageUrl, 'housingimages');
  
  // Create a memoized image source for better performance
  const imageSource = useMemo(() => {
    return imageUrl ? { uri: imageUrl } : { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.png' };
  }, [imageUrl]);

  // Handle swipe view layout (matching the SwipeCard component)
  if (displayAs === 'swipe') {
    return (
      <TouchableOpacity style={styles.swipeItemContainer} onPress={() => onPress(item)} activeOpacity={0.9}>
        <View style={styles.swipeImageBackground}>
          {!imageLoaded && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          )}
          <Image
            source={imageSource}
            style={styles.swipeImageBackground}
            resizeMode="cover"
            onLoad={() => {
              setImageLoaded(true);
              if (typeof onImageLoaded === 'function' && imageUrl) {
                onImageLoaded(imageUrl);
              }
            }}
            onError={(e) => console.log('Housing Card Swipe Image Error:', e.nativeEvent.error)}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']}
            style={styles.gradientOverlay}
          />
          <View style={styles.swipeTextContainer}>
            <Text style={styles.swipeTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.swipeAddress} numberOfLines={1}>{location}</Text>
            <View style={styles.swipeRow}>
              <Ionicons name="bed-outline" size={SIZES.h3} color={COLORS.white} />
              <Text style={styles.swipeDetailText}>{bedrooms} beds</Text>
              <Ionicons name="water-outline" size={SIZES.h3} color={COLORS.white} style={{ marginLeft: SIZES.padding }} />
              <Text style={styles.swipeDetailText}>{bathrooms} baths</Text>
            </View>
            <Text style={styles.swipePriceText}>{formattedPrice}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  // Modern LIST VIEW
  if (displayAs === 'list') {
    return (
      <TouchableOpacity 
        style={styles.listCardContainer}
        onPress={() => onPress(item)} 
        activeOpacity={0.8}
      >
        <View style={styles.listCardInner}>
          {/* Left side - Image */}
          <View style={styles.listImageContainer}>
            {!imageLoaded && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            )}
            <Image 
              source={imageSource}
              style={styles.listImage}
              onLoad={() => {
                setImageLoaded(true);
                if (typeof onImageLoaded === 'function' && imageUrl) {
                  onImageLoaded(imageUrl);
                }
              }}
              onError={(e) => console.log('Housing Card List Image Error:', e.nativeEvent.error)}
            />
            {/* Heart icon overlay */}
            <TouchableOpacity 
              style={styles.listHeartIconContainer}
              onPress={() => setIsFavorited(!isFavorited)}
            >
              <View style={styles.listHeartIconCircle}>
                <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={16} color={isFavorited ? "#FF6B6B" : "white"} />
              </View>
            </TouchableOpacity>
            {hasGroupMatch && (
              <View style={styles.listGroupIconContainer}>
                <Ionicons name="people-outline" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          {/* Right side - Content */}
          <View style={styles.listContentContainer}>
            {/* Top Section - Title */}
            <View style={styles.listTopSection}>
              <Text style={styles.listTitle} numberOfLines={1}>{title}</Text>
            </View>
            
            {/* Location */}
            <View style={styles.listLocationRow}>
              <Ionicons name="location-outline" size={16} color="#555" />
              <Text style={styles.listLocationText} numberOfLines={1}>{location}</Text>
            </View>
            
            {/* Beds & Baths */}
            <View style={styles.listDetailRow}>
              <Ionicons name="bed-outline" size={16} color="#555" style={styles.detailIcon} />
              <Text style={styles.listDetailText}>{bedrooms} beds</Text>
              <Ionicons name="water-outline" size={16} color="#555" style={[styles.detailIcon, {marginLeft: 12}]} />
              <Text style={styles.listDetailText}>{bathrooms} baths</Text>
            </View>
            
            {/* Price on its own row */}
            <View style={styles.listPriceRow}>
              <Text style={styles.listPriceValue}>{weeklyRent || formattedPrice}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  // GRID VIEW
  return (
    <View style={styles.gridCardWrapper}>
      <TouchableOpacity 
        style={styles.gridCardContainer} 
        onPress={() => onPress(item)} 
        activeOpacity={0.8}
      >
        {/* Card container with rounded corners */}
        <View style={styles.gridCardInner}>
          {/* Image Container */}
          <View style={styles.imageContainer}>
            {!imageLoaded && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            )}
            <Image 
              source={imageSource}
              style={styles.image}
              onLoad={() => {
                setImageLoaded(true);
                if (typeof onImageLoaded === 'function' && imageUrl) {
                  onImageLoaded(imageUrl);
                }
              }}
              onError={(e) => console.log('Housing Card Image Error:', e.nativeEvent.error)}
            />
            {/* Heart icon overlay */}
            <TouchableOpacity 
              style={styles.heartIconContainer}
              onPress={() => setIsFavorited(!isFavorited)}
            >
              <View style={styles.heartIconCircle}>
                <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={20} color={isFavorited ? "#FF6B6B" : "white"} />
              </View>
            </TouchableOpacity>
            
            {/* Group match indicator */}
            {hasGroupMatch && (
              <View style={styles.groupIconContainer}>
                <Ionicons name="people-outline" size={18} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          {/* Content Area */}
          <View style={styles.contentContainer}>
            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            
            {/* Location */}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color="#555" />
              <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            </View>
            
            {/* Beds & Baths */}
            <View style={styles.bedsAndBathsRow}>
              <Ionicons name="bed-outline" size={18} color="#555" />
              <Text style={styles.detailText}>{bedrooms} beds</Text>
              <Ionicons name="water-outline" size={18} color="#555" style={{marginLeft: 16}} />
              <Text style={styles.detailText}>{bathrooms} baths</Text>
            </View>
            
            {/* Price Row positioned at bottom right */}
            <View style={styles.priceRow}>
              <View style={{flex: 1}} />
              <Text style={styles.priceValue}>{weeklyRent || formattedPrice}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Loader style
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 1
  },

  // GRID VIEW STYLES
  gridCardWrapper: {
    flex: 1, // Take up exactly half the space in the row
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8, // Reduced vertical spacing between cards
    paddingHorizontal: 1, // Minimal horizontal padding (reduced from 4 to 1)
  },
  gridCardContainer: {
    width: gridCardWidth,
    borderRadius: 12,
    backgroundColor: '#fff',
    // Match ServiceCard shadow exactly
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridCardInner: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  image: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  heartIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  heartIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIconContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    padding: 6,
    zIndex: 2,
  },
  contentContainer: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
    flex: 1,
  },
  bedsAndBathsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  bottomContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000', // Changed to black as requested
    textAlign: 'right',
  },
  weeklyRentValue: {
    fontSize: 14,
    fontWeight: 'bold', // Changed to bold as requested
    color: '#000',
    marginLeft: 8,
  },

  // LIST VIEW STYLES - Matching ServiceCard list view styles
  listCardContainer: {
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 2, // Reduced from 4px to 2px for tighter spacing
    marginBottom: 4, // Reduced from 8px to 4px for tighter spacing
    backgroundColor: '#fff',
    borderRadius: 8, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  listCardInner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    overflow: 'hidden',
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 6, // Reduced from 8px to 6px for less bottom padding
    paddingLeft: 12,
    borderRadius: 8,
  },
  listImageContainer: {
    width: 100, // Matching ServiceCard image size
    height: 100, // Matching ServiceCard image size
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listHeartIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  listHeartIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listGroupIconContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    padding: 5,
    zIndex: 2,
  },
  listContentContainer: {
    flex: 1,
    paddingTop: 0,
    paddingRight: 12,
    paddingBottom: 6, // Reduced from 12px to 6px for less bottom padding
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  listTopSection: {
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  listLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  listLocationText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  listDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  detailIcon: {
    marginRight: 4,
  },
  listDetailText: {
    fontSize: 14,
    color: '#555',
  },
  listPriceRow: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  listPriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 'auto', // Push to right
  },

  // SWIPE VIEW STYLES
  swipeItemContainer: {
    width: width - 40,
    height: 400,
    marginHorizontal: 4,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  swipeImageBackground: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  swipeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  swipeAddress: {
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 8,
    opacity: 0.9,
  },
  swipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  swipeDetailText: {
    fontSize: 16,
    color: COLORS.white,
    marginLeft: 4,
    marginRight: 12,
  },
  swipePriceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default HousingCard;
