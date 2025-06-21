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
    } else if (item.category) {
      credentialButtons.push({ name: `${item.category} Provider`, color: COLORS.primary });
    }
    return credentialButtons;
  };
  const credentials = processCredentials();

  if (displayAs === 'list') {
    return (
      <TouchableOpacity 
        style={CardStyles.listCardContainer} 
        onPress={onPress ? () => onPress(item) : undefined} 
        activeOpacity={0.8}
      >
        <View style={CardStyles.listCardInner}> 
          <View style={[CardStyles.listImageContainer, {overflow: 'hidden'}]}> 
            {!imageLoaded && <View style={CardStyles.loaderContainer} />}
            <Image 
              source={{ uri: imageError ? 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png' : thumbUrl }}
              style={[CardStyles.listImage, {resizeMode: 'cover'}]} 
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
            <TouchableOpacity 
              style={CardStyles.iconContainer} 
              onPress={onToggleFavorite}
            >
              <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}> 
                <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={16} style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} />
              </View>
            </TouchableOpacity>
            {/* Share button for List View - Placed near favorite icon for consistency */}
            {onSharePress && (
              <TouchableOpacity 
                style={[CardStyles.iconContainer, { top: 40 }]} // Adjust position as needed
                onPress={() => onSharePress(item)}
              >
                <View style={CardStyles.iconCircle}> 
                  <Ionicons name="share-social-outline" size={16} style={CardStyles.favoriteIcon} />
                </View>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={CardStyles.listContentContainer}> 
            <View style={CardStyles.topSection}> 
              <Text style={[CardStyles.title, {flex: 1, paddingRight: 5}]} numberOfLines={1}>{item.title || 'Service Title'}</Text> 
              {renderModernRating()}
            </View>
            <Text style={CardStyles.subtitle} numberOfLines={1}>{category}</Text> 
            <Text style={[CardStyles.subtitle, {marginVertical: 4}]} numberOfLines={2}>{description}</Text> 
            <View style={CardStyles.bottomSection}> 
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 5}}> 
                <Ionicons name="location-outline" size={16} color={COLORS.black} />
                <Text style={[CardStyles.subtitle, {marginLeft: 4}]} numberOfLines={1}>{suburb}</Text> 
              </View>
              <Text style={CardStyles.price}>{price}<Text style={{fontSize: CardStyles.subtitle.fontSize, color: COLORS.textSecondary}}> /hr</Text></Text> 
            </View>
            <View style={localStyles.listCredentialsContainer}>
              {credentials.slice(0, 2).map((credential, index) => (
                <View key={`${credential.name}-${index}`} style={[localStyles.listCredentialButton, {backgroundColor: credential.color || COLORS.lightGray}]}>
                  <Text style={localStyles.listCredentialText}>{credential.name}</Text>
                </View>
              ))}
              {credentials.length > 2 && (
                <View style={[localStyles.listCredentialButton, {backgroundColor: COLORS.lightGray}]}>
                  <Text style={localStyles.listCredentialText}>+{credentials.length - 2} more</Text>
                </View>
              )}
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
              <TouchableOpacity 
                style={CardStyles.iconContainer} 
                onPress={onToggleFavorite}
              >
                <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}> 
                  <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={20} style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} />
                </View>
              </TouchableOpacity>
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
            </View>
            
            <View style={{padding: 8}}> 
              <Text style={[CardStyles.title, {marginBottom: 4}]} numberOfLines={2}>{item.title || 'Service Title'}</Text> 
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}> 
                <Text style={CardStyles.subtitle} numberOfLines={1}>{category}</Text> 
                {renderModernRating()}
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}> 
                <Ionicons name="location-outline" size={16} color={COLORS.black} />
                <Text style={[CardStyles.subtitle, {marginLeft: 4}]} numberOfLines={1}>{suburb}</Text> 
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
});

// Memoize to prevent unnecessary re-renders when unrelated props/state change
export default React.memo(ServiceCard);