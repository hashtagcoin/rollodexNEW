/**
 * SwipeCard Component
 * An optimized card component for use with SwipeCardDeck
 * Handles proper image loading and prevents flicker
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getValidImageUrl, getDefaultImage } from '../../utils/imageHelper';

// Colors
const DARK_GREEN = '#006400';
const LIGHT_GRAY = '#f0f0f0';

const { width, height } = Dimensions.get('window');

/**
 * SwipeCard - A component that renders a single card with image and details
 * Uses optimized rendering to prevent flicker and unnecessary re-renders
 */
const SwipeCard = React.memo(({
  item,
  isHousing = false,
  displayAs = 'current', // 'current' or 'next'
  cardId = null,
  debugMode = false
}) => {
  const mountTimestamp = useRef(Date.now()).current;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const componentId = useRef(`card-${mountTimestamp}-${Math.floor(Math.random() * 1000)}`).current;
  
  // Helper for consistent debug logging
  const logCardEvent = useCallback((event, details = {}) => {
    if (debugMode) {
      console.log(`[CARD-DEBUG][${new Date().toISOString()}][${event}]`, {
        componentId,
        cardId: cardId || item?.id,
        displayAs,
        mountTimestamp,
        ...details
      });
    }
  }, [componentId, item?.id, cardId, displayAs, mountTimestamp, debugMode]);
  
  // Log mount and unmount events
  useEffect(() => {
    logCardEvent('CARD_MOUNTED', {
      imageUrl: getMainImageUrl(),
      isPreCached: imagePreloader.isImageCached(getMainImageUrl())
    });
    
    return () => {
      const unmountTime = Date.now();
      logCardEvent('CARD_UNMOUNTED', {
        timeOnScreenMs: unmountTime - mountTimestamp,
        imageLoaded,
        imageError
      });
    };
  }, []);
  
  // Extract main image URL from item
  const getMainImageUrl = useCallback(() => {
    if (!item) return null;
    
    // Get the raw URL from the item
    let rawUrl = item.media_urls?.[0] || // Primary approach - direct access to first media URL
                item.image_url || 
                item.images?.[0]?.url || 
                item.avatar_url;
    
    // Use our helper to get a properly formatted URL for the appropriate bucket
    if (rawUrl) {
      // Determine which bucket to use based on the item properties
      const bucket = isHousing ? 'housingimages' : 'providerimages';
      const validUrl = getValidImageUrl(rawUrl, bucket);
      console.log(`[SwipeCard] Using validated image URL: ${validUrl}`);
      return validUrl;
    }
    
    // Return a default fallback URL if no image is found
    return 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/therapy/1.png';
  }, [item, isHousing]);
  
  // Get the source for the image, properly memoized
  const imageSource = React.useMemo(() => {
    const url = getMainImageUrl();
    return url ? { uri: url } : getDefaultImage(isHousing ? 'housing' : 'service');
  }, [getMainImageUrl, isHousing]);
  
  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    logCardEvent('IMAGE_LOADED', {
      loadTimeMs: Date.now() - mountTimestamp,
      imageUrl: getMainImageUrl()
    });
  }, [mountTimestamp, logCardEvent, getMainImageUrl]);
  
  // Handle image load error
  const handleImageError = useCallback((error) => {
    setImageLoaded(false);
    setImageError(true);
    logCardEvent('IMAGE_ERROR', {
      error: error?.message || 'Unknown error',
      imageUrl: getMainImageUrl()
    });
  }, [logCardEvent, getMainImageUrl]);
  
  // Early return if no item
  if (!item) {
    return null;
  }
  
  // Determine main content based on whether it's housing or service
  const title = isHousing ? item.property_name || 'Housing' : item.name || 'Provider';
  const subtitle = isHousing ? `${item.bedrooms || '?'} BR • ${item.bathrooms || '?'} BA` : item.specialty || 'Professional';
  const location = isHousing ? item.neighborhood || item.address : item.location;
  
  // Main card render
  return (
    <View style={styles.card}>
      {/* Card Image */}
      <View style={styles.imageContainer}>
        {!imageLoaded && !imageError && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={DARK_GREEN} />
          </View>
        )}
        <Image
          source={imageSource}
          style={styles.cardImage}
          resizeMode="cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          testID={`card-image-${item.id}`}
        />
        
        {/* Price or Rate Tag (Airbnb-style card) */}
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>
            {isHousing 
              ? `$${item.price || '??'}/night` 
              : `$${item.rate || '??'}/hr`}
          </Text>
        </View>
      </View>
      
      {/* Card Content */}
      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={DARK_GREEN} />
            <Text style={styles.rating}>{item.rating || '4.5'}</Text>
          </View>
        </View>
        
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        
        <Text style={styles.location} numberOfLines={1}>
          {location || 'Location not specified'}
        </Text>
        
        {/* Additional features (Airbnb-style) */}
        {isHousing && (
          <View style={styles.features}>
            {item.amenities?.slice(0, 3).map((amenity, index) => (
              <View key={index} style={styles.feature}>
                <Ionicons name="checkmark-circle" size={14} color={DARK_GREEN} />
                <Text style={styles.featureText}>{amenity}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: 'white',
    overflow: 'hidden',
    // Airbnb-style shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    height: '70%',
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.7)',
  },
  cardContent: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  features: {
    marginTop: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  priceTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'white',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  priceText: {
    fontWeight: 'bold',
    color: DARK_GREEN,
  }
});

export default SwipeCard;
