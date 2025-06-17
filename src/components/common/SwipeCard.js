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

  // Handle image load error
  const handleImageError = useCallback(() => {
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
        {/* Always attempt to render the image */}
        <Image
          source={{ uri: imageUrl || 'https://via.placeholder.com/400x600?text=Loading...' }}
          style={styles.cardImage}
          onLoad={handleImageLoad}
          onError={handleImageError}
          resizeMode="cover"
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

        {/* Gradient overlay - starts from bottom of image */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.gradientOverlay}
        />
        
        {/* Back arrow button - replaces category badge */}
        {onBackPress && (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}

        {/* Bottom info overlay - Airbnb style */}
        <View style={styles.infoOverlay}>
          {/* Title */}
          <Text style={styles.overlayTitle} numberOfLines={2}>
            {item.title || item.name || 'Untitled'}
          </Text>

          {/* Location and Price Row */}
          <View style={styles.overlayDetailsRow}>
            {item.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.overlayLocation} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
            
            {(item.price || item.cost || item.rent) && (
              <Text style={styles.overlayPrice}>
                {formatPrice(item.price || item.cost || item.rent)}
                {isHousing && '/mo'}
              </Text>
            )}
          </View>

          {/* Housing specific details - organized in row */}
          {isHousing && (item.bedrooms || item.bathrooms || item.square_feet) && (
            <View style={styles.housingOverlayDetails}>
              {item.bedrooms && (
                <Text style={styles.housingDetailText}>{item.bedrooms} bed</Text>
              )}
              {item.bathrooms && (
                <Text style={styles.housingDetailText}>• {item.bathrooms} bath</Text>
              )}
              {item.square_feet && (
                <Text style={styles.housingDetailText}>• {item.square_feet} sq ft</Text>
              )}
            </View>
          )}
        </View>
      </View>

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

          {/* Description */}
          {item.description && (
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>
          )}

          {/* Housing Details Grid - organized better */}
          {isHousing && (
            <View style={styles.housingDetailsGrid}>
              {item.bedrooms && (
                <View style={styles.detailItem}>
                  <Ionicons name="bed-outline" size={18} color="#000000" />
                  <Text style={styles.detailText}>{item.bedrooms} Bedroom{item.bedrooms > 1 ? 's' : ''}</Text>
                </View>
              )}
              {item.bathrooms && (
                <View style={styles.detailItem}>
                  <Ionicons name="water-outline" size={18} color="#000000" />
                  <Text style={styles.detailText}>{item.bathrooms} Bathroom{item.bathrooms > 1 ? 's' : ''}</Text>
                </View>
              )}
              {item.square_feet && (
                <View style={styles.detailItem}>
                  <Ionicons name="resize-outline" size={18} color="#000000" />
                  <Text style={styles.detailText}>{item.square_feet} sq ft</Text>
                </View>
              )}
            </View>
          )}

          {/* Tags/Features - compact display */}
          {((item.tags && item.tags.length > 0) || (item.features && item.features.length > 0)) && (
            <View style={styles.tagsSection}>
              {(item.tags || item.features || []).slice(0, 4).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
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
            <Ionicons name="close" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Pass</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionItem}
          onPress={() => onLike && onLike(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, styles.likeIcon]}>
            <Ionicons name="heart" size={22} color="white" />
          </View>
          <Text style={styles.actionText}>Like</Text>
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
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: height * 0.65, // Adjusted to avoid bottom navigator overlap
    width: width - 20, // Force width
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  imageContainer: {
    height: height * 0.45, // Reduced from 0.55 to accommodate moved up overlay
    position: 'relative',
    width: '100%', // Ensure full width
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10, // Ensure button is on top
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 20, // Moved up from previous position
    left: 20,
    right: 20,
    zIndex: 10,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overlayDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  overlayLocation: {
    fontSize: 16,
    color: 'white',
    marginLeft: 4,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overlayPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  housingOverlayDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  housingDetailText: {
    fontSize: 14,
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginRight: 8,
  },
  contentContainer: {
    flex: 1,
    maxHeight: height * 0.18, // Reduced content area
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  housingDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#333',
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
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    color: '#333',
  },
  tagsSection: {
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  actionHint: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  passIcon: {
    backgroundColor: '#E74C3C',
  },
  likeIcon: {
    backgroundColor: '#27AE60',
  },
  actionText: {
    fontSize: 12,
    color: '#999',
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
});

SwipeCard.displayName = 'SwipeCard';

export default SwipeCard;
