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
  onDismiss = null
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get image URL with fallbacks
  const getImageUrl = useCallback(() => {
    if (!item) return null;
    
    // Debug log to see what we're getting
    console.log('SwipeCard item:', item);
    console.log('SwipeCard item properties:', Object.keys(item));
    
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
    
    console.log('Using image URL:', url);
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
      'Therapy': '#3498DB',
      'Housing': '#E74C3C',
      'Support': '#27AE60',
      'Transport': '#F39C12',
      'Tech': '#9B59B6',
      'Personal': '#1ABC9C',
      'Social': '#E67E22'
    };
    return colors[category] || COLORS.DARK_GREEN;
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
      {/* Image Section */}
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
            <ActivityIndicator size="large" color={COLORS.DARK_GREEN} />
          </View>
        )}
        
        {/* Error fallback overlay */}
        {imageError && (
          <View style={styles.imageError}>
            <Ionicons name="image-outline" size={48} color="#ccc" />
            <Text style={styles.imageErrorText}>Image unavailable</Text>
          </View>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
          style={styles.gradientOverlay}
        />
        
        {/* Category badge */}
        {item.category && (
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}

        {/* Bottom info overlay */}
        <View style={styles.infoOverlay}>
          {/* Title */}
          <Text style={styles.overlayTitle} numberOfLines={2}>
            {item.title || item.name || 'Untitled'}
          </Text>

          {/* Location and Price */}
          <View style={styles.overlayDetails}>
            {item.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={16} color="white" />
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

          {/* Tags or Quick Info */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.overlayTags}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.overlayTag}>
                  <Text style={styles.overlayTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Expandable Content Section */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Description */}
          {item.description && (
            <Text style={styles.description} numberOfLines={4}>
              {item.description}
            </Text>
          )}

          {/* Additional Info for Housing */}
          {isHousing && (
            <View style={styles.housingDetails}>
              {item.bedrooms && (
                <View style={styles.detailItem}>
                  <Ionicons name="bed-outline" size={20} color={COLORS.DARK_GREEN} />
                  <Text style={styles.detailText}>{item.bedrooms} bed</Text>
                </View>
              )}
              {item.bathrooms && (
                <View style={styles.detailItem}>
                  <Ionicons name="water-outline" size={20} color={COLORS.DARK_GREEN} />
                  <Text style={styles.detailText}>{item.bathrooms} bath</Text>
                </View>
              )}
              {item.square_feet && (
                <View style={styles.detailItem}>
                  <Ionicons name="resize-outline" size={20} color={COLORS.DARK_GREEN} />
                  <Text style={styles.detailText}>{item.square_feet} sq ft</Text>
                </View>
              )}
            </View>
          )}

          {/* Service Provider Info */}
          {!isHousing && item.provider_name && (
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>By {item.provider_name}</Text>
              {item.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              )}
            </View>
          )}

          {/* Features/Amenities */}
          {item.features && item.features.length > 0 && (
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featuresGrid}>
                {item.features.slice(0, 6).map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.DARK_GREEN} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

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
          onPress={() => onPress && onPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, styles.superLikeIcon]}>
            <Ionicons name="star" size={20} color="white" />
          </View>
          <Text style={styles.actionText}>Super</Text>
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
    minHeight: height * 0.7, // Force minimum height
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
    height: height * 0.55,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
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
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%', // Increased for better visibility
    zIndex: 5, // Ensure overlay is on top
  },
  categoryBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 15,
    zIndex: 10, // Ensure info is on top of gradient
    backgroundColor: 'rgba(0,0,0,0.3)', // Add slight background for better text contrast
  },
  overlayTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  overlayLocation: {
    fontSize: 14,
    color: 'white',
    marginLeft: 4,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  overlayTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  overlayTagText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    minHeight: height * 0.15,
    maxHeight: height * 0.2,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    paddingTop: 15,
    backgroundColor: '#ffffff',
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 16,
  },
  housingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  providerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  providerName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  featuresSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  actionHint: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionItem: {
    alignItems: 'center',
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
  superLikeIcon: {
    backgroundColor: '#3498DB',
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
