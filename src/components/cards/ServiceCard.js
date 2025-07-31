import React, { useState, useMemo } from 'react';
// Corrected import: Added StyleSheet, removed unused useEffect and SIZES
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
import { CardStyles } from '../../constants/CardStyles'; // Import CardStyles
import { COLORS } from '../../constants/theme'; // Removed SIZES as it was unused

// Main component
// Pre-load placeholder image
const placeholderImage = { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png' };

const ServiceCard = ({ item, onPress, onImageLoaded, displayAs = 'grid', isFavorited, onToggleFavorite, onSharePress }) => { 
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle image errors to prevent app crashes
  const handleImageError = () => {
    console.log('[IMAGE_DEBUG][ServiceCard] Failed to load image:', imageUrl);
    setImageError(true);
    setImageLoaded(true); // Mark as loaded even though it failed
  };

  const renderModernRating = () => {
    const rating = item.rating || 0;
    return (
      <View style={CardStyles.ratingContainer}> 
        <Ionicons name="star" size={16} style={CardStyles.ratingStarIcon} /> 
        <Text style={CardStyles.ratingText}>{rating.toFixed(1)}</Text> 
      </View>
    );
  };

  const price = item.price ? `$${item.price}` : '$0';
  const category = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Uncategorized';
  const rawImageUrl = item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null;
  const imageUrl = getValidImageUrl(rawImageUrl, 'providerimages');
  // Request CDN-optimised thumbnail for list/grid; swipe gets a larger width
  const thumbUrl = getOptimizedImageUrl(
    imageUrl,
    displayAs === 'swipe' ? 800 : 400,
    70
  );

  const imageSource = useMemo(() => {
    return thumbUrl ? { uri: thumbUrl } : { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png' };
  }, [thumbUrl]);
  const suburb = item.address_suburb || 'Suburb';
  const description = item.description || 'No description available';

  const processCredentials = () => {
    const credentialButtons = [];
    if (item.credentials && Array.isArray(item.credentials) && item.credentials.length > 0) {
      item.credentials.forEach((credential) => {
        let color = COLORS.primary; 
        if (credential.toLowerCase().includes('ndis')) color = COLORS.success; 
        else if (credential.toLowerCase().includes('safety') || credential.toLowerCase().includes('certified')) color = COLORS.danger; 
        else if (credential.toLowerCase().includes('license') || credential.toLowerCase().includes('licence')) color = COLORS.info;
        else if (credential.toLowerCase().includes('therapy')) color = COLORS.purple; 
        else if (credential.toLowerCase().includes('education') || credential.toLowerCase().includes('teacher')) color = COLORS.tertiary;
        credentialButtons.push({ name: credential, color: color });
      });
    }
    return credentialButtons;
  };
  const credentials = processCredentials();

  if (displayAs === 'list') {
    return (
      <TouchableOpacity 
        style={localStyles.listCardContainer}
        onPress={onPress ? () => onPress(item) : undefined} 
        activeOpacity={0.8}
      >
        <View style={localStyles.listCardInner}>
          <View style={localStyles.listImageContainer}>
            {!imageLoaded && <View style={localStyles.loaderContainer} />}
            <Image 
              source={{ uri: imageError ? 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png' : thumbUrl }}
              style={localStyles.listImage}
              onLoad={() => {
                setImageLoaded(true);
                if (typeof onImageLoaded === 'function' && imageUrl && !imageError) onImageLoaded(imageUrl);
              }}
              onError={handleImageError}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={placeholderImage}
              placeholderContentFit="cover"
            />
            {credentials.length > 0 && credentials[0].name.toLowerCase().includes('ndis') && (
              <View style={localStyles.ndisBadge}>
                <Text style={localStyles.ndisBadgeText}>NDIS</Text>
              </View>
            )}
            <TouchableOpacity 
              style={localStyles.listFavoriteButton}
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
          
          <View style={localStyles.listContent}>
            <View>
              <Text style={localStyles.listTitle} numberOfLines={1}>{item.title || 'Service Title'}</Text>
              <Text style={localStyles.listCategory} numberOfLines={1}>{category}</Text>
              <View style={localStyles.listDetailsRow}>
                <View style={localStyles.listDetailItem}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={localStyles.listDetailText}>{suburb}</Text>
                </View>
                {item.rating && (
                  <View style={localStyles.listDetailItem}>
                    <Ionicons name="star" size={14} color="#666" />
                    <Text style={localStyles.listDetailText}>{item.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={localStyles.listPriceRow}>
              <Text style={localStyles.listPrice}>{price}/hr</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  } else {
    return (
      <View style={CardStyles.gridCardWrapper}> 
        <TouchableOpacity 
          style={CardStyles.gridCardContainer}  
          onPress={onPress ? () => onPress(item) : undefined} 
          activeOpacity={0.8}
        >
          <View style={CardStyles.gridCardInner}> 
            <View style={[CardStyles.gridImageContainer, {overflow: 'hidden'}]}> 
              {!imageLoaded && <View style={CardStyles.loaderContainer} />}
              <Image 
                source={{ uri: imageError ? 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png' : thumbUrl }}
                style={[CardStyles.gridImage, {resizeMode: 'cover'}]} 
                onLoad={() => {
                  setImageLoaded(true);
                  if (typeof onImageLoaded === 'function' && imageUrl && !imageError) onImageLoaded(imageUrl);
                }}
                onError={handleImageError}
                contentFit="cover"
                cachePolicy="immutable"
              />
              {/* Share button for Grid View - Placed near favorite icon */}
              {onSharePress && (
                <TouchableOpacity 
                  style={[CardStyles.iconContainer, { top: 40 }]} // Adjust position as needed
                  onPress={() => onSharePress(item)}
                >
                  <View style={CardStyles.iconCircle}> 
                    <Ionicons name="share-social-outline" size={20} style={CardStyles.favoriteIcon} /> 
                  </View>
                </TouchableOpacity>
              )}
              
              {/* Credentials labels at top left of image */}
              <View style={localStyles.gridCredentialsContainer}>
                {credentials.slice(0, 1).map((credential, index) => (
                  <View key={`${credential.name}-${index}`} style={[localStyles.gridCredentialButton, {backgroundColor: credential.color || COLORS.lightGray}]}>
                    <Text style={localStyles.gridCredentialText}>{credential.name}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={{padding: 12}}> 
              <Text style={[CardStyles.title, {marginBottom: 3, fontWeight: 'bold'}]} numberOfLines={2}>{item.title || 'Service Title'}</Text> 
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3}}> 
                <Text style={CardStyles.subtitle} numberOfLines={1}>{category}</Text> 
                <TouchableOpacity 
                  onPress={onToggleFavorite}
                  style={{ padding: 2 }}
                >
                  <Ionicons 
                    name={isFavorited ? "heart" : "heart-outline"} 
                    size={18} 
                    color={isFavorited ? "#FF3B30" : "#666"} 
                  />
                </TouchableOpacity>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 3}}> 
                <Ionicons name="location-outline" size={16} color={COLORS.black} />
                <Text style={[CardStyles.subtitle, {marginLeft: 4, flex: 1}]} numberOfLines={1}>{suburb}</Text> 
                <Text style={[CardStyles.price, {marginLeft: 8}]}>{price}<Text style={{fontSize: CardStyles.subtitle.fontSize, color: COLORS.textSecondary}}> /hr</Text></Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                {renderModernRating()}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
};

// FIX: Wrapped the plain object in StyleSheet.create() for performance and correctness.
const localStyles = StyleSheet.create({
  // List view styles - matching HousingCard
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
    position: 'relative',
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
  listCategory: {
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
  ndisBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ndisBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e0e0e0',
  },
  // Credential styles
  listCredentialsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  listCredentialButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  listCredentialText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '500',
  },
  gridCredentialsContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCredentialButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  gridCredentialText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '500',
  },
});

// Memoize to prevent unnecessary re-renders when unrelated props/state change
export default React.memo(ServiceCard);