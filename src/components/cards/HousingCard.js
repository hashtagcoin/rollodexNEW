import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'; 
import { Image } from 'expo-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
import { COLORS, SIZES } from '../../constants/theme';
import { CardStyles } from '../../constants/CardStyles';
import { getImageProps } from '../../config/imageConfig';

// Pre-load the placeholder image once
const placeholderImage = { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png' }; 

// Pre-calculate all styles to avoid inline calculations
const styles = StyleSheet.create({
  // Grid styles
  gridCardWrapper: {
    flex: 1,
    padding: 5,
  },
  gridCardContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#f5f5f5',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridContent: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  gridContentTop: {
    flex: 1,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  gridLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  gridDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  gridDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  gridPriceBottom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
    marginTop: 8,
  },
  
  // List styles
  listCardContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listCardInner: {
    flexDirection: 'row',
  },
  listImageContainer: {
    width: 120,
    height: 100,
    backgroundColor: '#f5f5f5',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  listDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  listDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  listPriceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  listPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  
  // Common styles
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  listFavoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    zIndex: 1,
  },
  groupBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Swipe styles
  swipeContainer: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  swipeImage: {
    width: '100%',
    height: '100%',
  },
  swipeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  swipeContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  swipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  swipeLocation: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  swipeDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  swipeDetailText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 5,
    marginRight: 15,
  },
  swipePrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
});

// Memoized component - only re-renders when props actually change
const HousingCard = memo(({ 
  item, 
  onPress, 
  displayAs = 'grid', 
  isFavorited, 
  onToggleFavorite,
  onSharePress 
}) => {
  // Extract all data at once
  const {
    id,
    title = 'Beautiful Home',
    suburb = 'Location N/A',
    bedrooms = 0,
    bathrooms = 0,
    weekly_rent,
    has_group_match = false,
    media_urls = []
  } = item;

  // Memoize image URL to prevent recalculation
  const imageUrl = useMemo(() => {
    if (!media_urls || media_urls.length === 0) {
      return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop';
    }
    
    const url = getValidImageUrl(media_urls[0], 'housingimages');
    // Use smaller images for grid view to improve performance
    const width = displayAs === 'grid' ? 300 : displayAs === 'list' ? 240 : 600;
    return getOptimizedImageUrl(url, width, 85);
  }, [media_urls, displayAs]);

  // Create a stable recycling key that doesn't include query parameters
  const recyclingKey = useMemo(() => {
    if (!media_urls || media_urls.length === 0) return 'placeholder';
    // Extract the base URL without query parameters for stable recycling
    const baseUrl = getValidImageUrl(media_urls[0], 'housingimages').split('?')[0];
    return `housing_${id}_${baseUrl}`;
  }, [id, media_urls]);

  const price = weekly_rent ? `$${weekly_rent}/wk` : 'Contact for price';

  // Grid View
  if (displayAs === 'grid') {
    return (
      <View style={CardStyles.gridCardWrapper}>
        <TouchableOpacity 
          style={CardStyles.gridCardContainer}
          onPress={() => onPress(item)}
          activeOpacity={0.8}
        >
          <View style={CardStyles.gridCardInner}>
            <View style={CardStyles.gridImageContainer}>
              <Image 
                source={{ uri: imageUrl }}
                style={CardStyles.gridImage}
                placeholder={placeholderImage}
                placeholderContentFit="cover"
                {...getImageProps('grid', recyclingKey)}
              />
              {has_group_match && (
                <View style={styles.groupBadge}>
                  <Ionicons name="people" size={12} color="white" />
                  <Text style={styles.groupBadgeText}>Group Match</Text>
                </View>
              )}
              <TouchableOpacity 
                style={CardStyles.iconContainer}
                onPress={onToggleFavorite}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={CardStyles.iconCircleActive}>
                  <Ionicons 
                    name={isFavorited ? "heart" : "heart-outline"} 
                    size={18} 
                    color={isFavorited ? "red" : "#666"} 
                  />
                </View>
              </TouchableOpacity>
            </View>
            <View style={{padding: 12}}>
              <Text style={[CardStyles.title, {marginBottom: 4}]} numberOfLines={2}>{title}</Text>
              <Text style={[CardStyles.subtitle, {marginBottom: 4}]} numberOfLines={1}>{suburb}</Text>
              <View style={styles.gridDetailsRow}>
                <View style={styles.gridDetailItem}>
                  <Ionicons name="bed-outline" size={14} color="#666" />
                  <Text style={styles.gridDetailText}>{bedrooms}</Text>
                </View>
                <View style={styles.gridDetailItem}>
                  <MaterialCommunityIcons name="shower" size={14} color="#666" />
                  <Text style={styles.gridDetailText}>{bathrooms}</Text>
                </View>
              </View>
              <Text style={CardStyles.price}>{price}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // List View
  if (displayAs === 'list') {
    return (
      <TouchableOpacity 
        style={styles.listCardContainer}
        onPress={() => onPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.listCardInner}>
          <View style={styles.listImageContainer}>
            <Image 
              source={{ uri: imageUrl }}
              style={styles.listImage}
              placeholder={placeholderImage}
              placeholderContentFit="cover"
              {...getImageProps('list', recyclingKey)}
            />
            {has_group_match && (
              <View style={styles.groupBadge}>
                <Ionicons name="people" size={12} color="white" />
                <Text style={styles.groupBadgeText}>Match</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.listFavoriteButton}
              onPress={onToggleFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={isFavorited ? "heart" : "heart-outline"} 
                size={20} 
                color={isFavorited ? "red" : "#666"} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.listContent}>
            <View>
              <Text style={styles.listTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.listLocation} numberOfLines={1}>{suburb}</Text>
              <View style={styles.listDetailsRow}>
                <View style={styles.listDetailItem}>
                  <Ionicons name="bed-outline" size={14} color="#666" />
                  <Text style={styles.listDetailText}>{bedrooms} bed</Text>
                </View>
                <View style={styles.listDetailItem}>
                  <MaterialCommunityIcons name="shower" size={14} color="#666" />
                  <Text style={styles.listDetailText}>{bathrooms} bath</Text>
                </View>
              </View>
            </View>
            <View style={styles.listPriceRow}>
              <Text style={styles.listPrice}>{price}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Swipe View
  return (
    <TouchableOpacity 
      style={styles.swipeContainer}
      onPress={() => onPress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.swipeImage}
        {...getImageProps('swipe', recyclingKey)}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']}
        style={styles.swipeGradient}
      />
      <TouchableOpacity 
        style={[styles.favoriteButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        onPress={onToggleFavorite}
      >
        <Ionicons 
          name={isFavorited ? "heart" : "heart-outline"} 
          size={20} 
          color="white"
        />
      </TouchableOpacity>
      <View style={styles.swipeContent}>
        <Text style={styles.swipeTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.swipeLocation} numberOfLines={1}>{suburb}</Text>
        <View style={styles.swipeDetailsRow}>
          <Ionicons name="bed-outline" size={18} color="white" />
          <Text style={styles.swipeDetailText}>{bedrooms} beds</Text>
          <Ionicons name="water-outline" size={18} color="white" />
          <Text style={styles.swipeDetailText}>{bathrooms} baths</Text>
        </View>
        <Text style={styles.swipePrice}>{price}</Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.suburb === nextProps.item.suburb &&
    prevProps.item.bedrooms === nextProps.item.bedrooms &&
    prevProps.item.bathrooms === nextProps.item.bathrooms &&
    prevProps.item.weekly_rent === nextProps.item.weekly_rent &&
    prevProps.item.has_group_match === nextProps.item.has_group_match &&
    JSON.stringify(prevProps.item.media_urls) === JSON.stringify(nextProps.item.media_urls) &&
    prevProps.isFavorited === nextProps.isFavorited &&
    prevProps.displayAs === nextProps.displayAs
  );
});

HousingCard.displayName = 'HousingCard';

export default HousingCard;