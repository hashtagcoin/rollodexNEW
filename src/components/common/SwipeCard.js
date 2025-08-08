/**
 * SwipeCard Component
 * An optimized card component for use with SwipeCardDeck
 * Displays provider/service information in a Tinder-style card layout
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Constants for layout calculations
const BOTTOM_NAV_HEIGHT = 85; // Height of bottom navigation bar
const CARD_PADDING = 20; // Padding around card
const APP_HEADER_HEIGHT = 60; // Height of app header

/**
 * SwipeCard - A component that renders a single provider/service card with image and details
 * Optimized for smooth swiping animations and performance
 */
const SwipeCard = memo(({
  item,
  isHousing = false,
  onPress = null,
  onImageLoad = null,
  onLike = null,
  onDismiss = null,
  onBackPress = null // New prop for back button functionality
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get image URL with fallbacks
  const getImageUrl = useCallback(() => {
    if (!item) return null;

    // Try multiple possible image URL fields
    const url = item.media_urls?.[0] || 
           item.image_url || 
           item.images?.[0]?.url || 
           item.avatar_url ||
           item.cover_image_url ||
           item.imageurl ||
           (isHousing 
             ? 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=1200&fit=crop'
             : 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=1200&fit=crop');
    

    return url;
  }, [item, isHousing]);

  const imageUrl = getImageUrl();

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  // Handle image load error with comprehensive error handling
  const handleImageError = useCallback((error) => {
    console.warn('[SwipeCard] Image load error:', error?.nativeEvent || 'Unknown error');
    setImageError(true);
    setImageLoaded(false);
  }, []);

  // Handle card press
  const handleCardPress = useCallback(() => {
    if (onPress) {
      onPress(item);
    }
  }, [onPress, item]);

  // Format price for display
  const formatPrice = useCallback((price) => {
    if (!price) return 'Contact for pricing';
    if (typeof price === 'number') {
      return `$${price.toLocaleString()}`;
    }
    return price;
  }, []);

  // Get category color
  const getCategoryColor = useCallback((category) => {
    const colors = {
      'Therapy': '#000000',
      'Housing': '#000000',
      'Support': '#000000',
      'Transport': '#000000',
      'Tech': '#000000',
      'Personal': '#000000',
      'Social': '#000000'
    };
    return colors[category] || '#000000';
  }, []);
  
  // Get amenity icon based on amenity name
  const getAmenityIcon = useCallback((amenity) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return 'wifi-outline';
    if (amenityLower.includes('parking')) return 'car-outline';
    if (amenityLower.includes('laundry') || amenityLower.includes('washing')) return 'water-outline';
    if (amenityLower.includes('kitchen')) return 'restaurant-outline';
    if (amenityLower.includes('air') || amenityLower.includes('ac')) return 'snow-outline';
    if (amenityLower.includes('heat')) return 'flame-outline';
    if (amenityLower.includes('furnished')) return 'bed-outline';
    if (amenityLower.includes('pet')) return 'paw-outline';
    if (amenityLower.includes('accessible')) return 'accessibility-outline';
    if (amenityLower.includes('garden') || amenityLower.includes('outdoor')) return 'leaf-outline';
    if (amenityLower.includes('gym') || amenityLower.includes('fitness')) return 'fitness-outline';
    if (amenityLower.includes('pool')) return 'water-outline';
    return 'checkmark-circle-outline';
  }, []);

  if (!item) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  const CardContent = (
    <View style={styles.card}>
      {/* Image Section - Now takes full width */}
      <View style={styles.imageContainer}>
        {/* Always attempt to render the image with comprehensive error handling */}
        <Image
          source={{ 
            uri: imageUrl || 'https://via.placeholder.com/400x600?text=Loading...'
          }}
          style={styles.cardImage}
          onLoad={handleImageLoad}
          onError={handleImageError}
          resizeMode="cover"
          defaultSource={require('../../../assets/placeholder-image.png')}
          onLoadStart={() => {
            // Reset error state when starting new load
            setImageError(false);
          }}
          onPartialLoad={() => {
            // Handle partial loads to prevent crashes
            console.log('[SwipeCard] Image partially loaded');
          }}
          fadeDuration={0}
          progressiveRenderingEnabled={true}
          loadingIndicatorSource={require('../../../assets/placeholder-image.png')}
        />
        
        {/* Loading indicator overlay */}
        {!imageLoaded && !imageError && (
          <View style={styles.imageLoader}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        )}
        
        {/* Error fallback overlay */}
        {imageError && (
          <View style={styles.imageError}>
            <Ionicons name="image-outline" size={48} color="#ccc" />
            <Text style={styles.imageErrorText}>Image unavailable</Text>
          </View>
        )}

        {/* Group Match Badge - top right corner */}
        {isHousing && item.group_match && (
          <View style={styles.groupMatchBadgeRight}>
            <Ionicons name="people" size={14} color="#4A90E2" />
            <Text style={[styles.groupMatchText, {color: '#4A90E2'}]}>Group Match</Text>
          </View>
        )}
        
        {/* Other Badges - top left */}
        {isHousing && item.verified && (
          <View style={styles.verifiedBadgeLeft}>
            <Ionicons name="shield-checkmark" size={14} color="#27AE60" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
        
        {/* Gradient overlay - starts from bottom of image */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.gradientOverlay}
        />
        
        {/* Bottom info overlay - Airbnb style */}
        <View style={styles.infoOverlay}>
          {/* Title */}
          <Text style={styles.overlayTitle} numberOfLines={2}>
            {item.title || item.name || 'Untitled'}
          </Text>

          {/* Price Row - for non-housing items */}
          {!isHousing && (item.price || item.cost || item.rent) && (
            <View style={styles.overlayDetailsRow}>
              <Text style={styles.overlayPrice}>
                {formatPrice(item.price || item.cost || item.rent)}
              </Text>
            </View>
          )}

          {/* Housing specific details with location - Airbnb style */}
          {isHousing && (
            <View style={styles.housingOverlayDetails}>
              <View style={styles.housingDetailsLeft}>
                {item.bedrooms && (
                  <View style={styles.housingIconDetail}>
                    <Ionicons name="bed-outline" size={21} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.housingDetailText}>{item.bedrooms} bed{item.bedrooms > 1 ? 's' : ''}</Text>
                  </View>
                )}
                {item.bathrooms && (
                  <View style={styles.housingIconDetail}>
                    <MaterialCommunityIcons name="shower" size={21} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.housingDetailText}>{item.bathrooms} bath{item.bathrooms > 1 ? 's' : ''}</Text>
                  </View>
                )}
                {item.parking && (
                  <View style={styles.housingIconDetail}>
                    <Ionicons name="car-outline" size={21} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.housingDetailText}>{item.parking} parking</Text>
                  </View>
                )}
              </View>
              
              {item.location && (
                <View style={styles.locationContainerRight}>
                  <Ionicons name="location" size={23} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.overlayLocationRight} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              )}
            </View>
          )}
          
        </View>
      </View>

      {/* Housing Info Cards - Airbnb style */}
      {isHousing && (
        <View style={styles.housingInfoWrapper}>
          <View style={styles.housingInfoRow}>
            <View style={styles.housingInfoCard}>
              <View style={styles.housingInfoHeader}>
                <Ionicons name="calendar-outline" size={16} color="#B0B0B0" />
                <Text style={styles.housingInfoTitle}>Available</Text>
              </View>
              <Text style={styles.housingInfoText}>
                {item.available_date || item.availability_date 
                  ? new Date(item.available_date || item.availability_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Now'}
              </Text>
            </View>
            
            <View style={styles.housingInfoCard}>
              <View style={styles.housingInfoHeader}>
                <Ionicons name="cash-outline" size={16} color="#B0B0B0" />
                <Text style={styles.housingInfoTitle}>Rent</Text>
              </View>
              <Text style={styles.housingInfoText}>
                ${item.weekly_rent || Math.round((item.rent || item.price || item.cost || 0) / 4.33)}/week
              </Text>
            </View>
          </View>
          
          {(item.bond || item.minimum_stay) && (
            <View style={styles.housingInfoRow}>
              {item.bond && (
                <View style={styles.housingInfoCard}>
                  <View style={styles.housingInfoHeader}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#B0B0B0" />
                    <Text style={styles.housingInfoTitle}>Bond</Text>
                  </View>
                  <Text style={styles.housingInfoText}>
                    ${item.bond}
                  </Text>
                </View>
              )}
              
              {item.minimum_stay && (
                <View style={styles.housingInfoCard}>
                  <View style={styles.housingInfoHeader}>
                    <Ionicons name="time-outline" size={16} color="#B0B0B0" />
                    <Text style={styles.housingInfoTitle}>Min Stay</Text>
                  </View>
                  <Text style={styles.housingInfoText}>
                    {item.minimum_stay} months
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Content Section - Airbnb style layout */}
      <View style={styles.contentContainer}>
        <View style={styles.content}>
          {/* Service Provider Info - moved to top for better visibility */}
          {!isHousing && item.provider_name && (
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{item.provider_name}</Text>
              {item.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              )}
            </View>
          )}

          {/* Description - Airbnb style */}
          {item.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.description} numberOfLines={isHousing ? 2 : 3}>
                {item.description}
              </Text>
            </View>
          )}
          
          {/* Housing Amenities - New section */}
          {isHousing && (item.amenities || item.features) && (
            <View style={styles.amenitiesContainer}>
              <Text style={styles.amenitiesTitle}>What this place offers</Text>
              <View style={styles.amenitiesGrid}>
                {(item.amenities || item.features || []).slice(0, 6).map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Ionicons 
                      name={getAmenityIcon(amenity)} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Service Tags/Features - compact display */}
          {!isHousing && ((item.tags && item.tags.length > 0) || (item.features && item.features.length > 0)) && (
            <View style={styles.tagsSection}>
              {(item.tags || item.features || []).slice(0, 4).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Housing Location Details */}
          {isHousing && item.suburb && (
            <View style={styles.locationDetails}>
              <Ionicons name="location-sharp" size={16} color="#B0B0B0" />
              <Text style={styles.locationDetailText}>
                {item.suburb}{item.state ? `, ${item.state}` : ''} {item.postcode || ''}
              </Text>
            </View>
          )}
          
          {/* Housing Additional Info */}
          {isHousing && (
            <View style={styles.additionalInfo}>
              {item.ndis_compliant && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>NDIS Compliant</Text>
                </View>
              )}
              {item.sda_registered && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>SDA Registered</Text>
                </View>
              )}
              {item.wheelchair_accessible && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>Wheelchair Accessible</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Action buttons at bottom */}
      <View style={styles.actionHint}>
        <TouchableOpacity 
          style={styles.actionItem} 
          onPress={() => onDismiss && onDismiss(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, styles.passIcon]}>
            <Ionicons name="close" size={36} color="white" />
          </View>
          <Text style={styles.actionText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionItem}
          onPress={() => onLike && onLike(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, styles.likeIcon]}>
            <Ionicons name="heart" size={33} color="white" />
          </View>
          <Text style={styles.actionText}>Favourite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // If onPress is provided, wrap in TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.95} onPress={handleCardPress}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    minHeight: height * 0.64, // Reduced by 15% from 0.75
    width: width - 20, // Force width
    overflow: 'hidden', // This ensures content respects the border radius
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  imageContainer: {
    height: height * 0.38, // Reduced proportionally
    position: 'relative',
    width: '100%', // Ensure full width
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  imageError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  imageErrorText: {
    marginTop: 8,
    color: '#ccc',
    fontSize: 14,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0, // Moved up
    left: 0,
    right: 0,
    height: '40%', // Adjusted for better visibility
    zIndex: 5, // Ensure overlay is on top
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  housingPriceRow: {
    marginTop: 6,
  },
  locationContainerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    maxWidth: '40%',
  },
  overlayLocationRight: {
    fontSize: 21,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  housingOverlayDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  housingDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  housingIconDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  housingDetailText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  groupMatchBadgeRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  groupMatchText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#2a2a2a',
  },
  content: {
    padding: 16,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
  },
  amenitiesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  amenitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  amenityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  housingInfoWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  housingInfoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  housingInfoCard: {
    backgroundColor: 'rgba(51, 51, 51, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
  },
  housingInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  housingInfoTitle: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  housingInfoText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  providerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    color: '#FFD700',
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  tag: {
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actionHint: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passIcon: {
    backgroundColor: '#E74C3C',
  },
  likeIcon: {
    backgroundColor: '#27AE60',
  },
  actionText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  verifiedBadgeLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  verifiedText: {
    color: '#27AE60',
    fontSize: 12,
    fontWeight: '600',
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  locationDetailText: {
    fontSize: 14,
    color: '#B0B0B0',
    flex: 1,
  },
  additionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  infoChip: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  infoChipText: {
    fontSize: 11,
    color: '#B0B0B0',
    fontWeight: '500',
  },
});

SwipeCard.displayName = 'SwipeCard';

export default SwipeCard;
