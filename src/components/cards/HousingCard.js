import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native'; 
import { Image } from 'expo-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
import { COLORS, SIZES } from '../../constants/theme'; 
import { CardStyles } from '../../constants/CardStyles'; 

const HousingCard = ({ item, onPress, displayAs = 'grid', onImageLoaded, isFavorited, onToggleFavorite, onSharePress }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const title = item.title || item.property_name || 'Beautiful Home';
  const location = item.suburb || item.address_suburb || 'Location N/A';
  const price = item.rent_amount ? `$${item.rent_amount.toLocaleString()}` : '$N/A';
  const rentFrequency = item.rent_frequency || 'month';
  const formattedPrice = item.rent_amount ? `${price}/${rentFrequency}` : null;
  const weeklyRent = item.weekly_rent ? `$${item.weekly_rent}/wk` : null;
  const bedrooms = item.bedrooms || 'N/A';
  const bathrooms = item.bathrooms || 'N/A';
  const hasGroupMatch = item.has_group_match || false;
  
  const rawImageUrl = item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null;
  const imageUrl = getValidImageUrl(rawImageUrl, 'housingimages');
  // Optimise thumbnail size – larger for swipe view
  const thumbUrl = getOptimizedImageUrl(
    imageUrl,
    displayAs === 'swipe' ? 800 : 400,
    70
  );

  const imageSource = useMemo(() => {
    return thumbUrl ? { uri: thumbUrl } : { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.png' };
  }, [thumbUrl]);

  if (displayAs === 'swipe') {
    return (
      <TouchableOpacity style={localStyles.swipeItemContainer} onPress={() => onPress(item)} activeOpacity={0.9}>
        <View style={localStyles.swipeImageBackground}>
          {!imageLoaded && <View style={localStyles.loaderContainerSwipe} />}
          <Image
            source={{uri: thumbUrl}}
            style={localStyles.swipeImageBackground}
            contentFit="cover"
            cachePolicy="immutable"
            onLoad={() => {
              setImageLoaded(true);
              if (typeof onImageLoaded === 'function' && imageUrl) onImageLoaded(imageUrl);
            }}
            onError={(e) => console.log('Housing Card Swipe Image Error:', e.nativeEvent.error)}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']}
            style={localStyles.gradientOverlay}
          />
          {/* Favorite Icon for Swipe View */}
          <TouchableOpacity 
            style={[CardStyles.iconContainer, { top: SIZES.padding, right: SIZES.padding }]} 
            onPress={onToggleFavorite}
          >
            <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}> 
              <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={20} style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} />
            </View>
          </TouchableOpacity>
          {/* Share Icon for Swipe View */}
          {onSharePress && (
            <TouchableOpacity 
              style={[CardStyles.iconContainer, { top: SIZES.padding + 36, right: SIZES.padding }]} // Position below favorite
              onPress={() => onSharePress(item)}
            >
              <View style={CardStyles.iconCircle}> 
                <Ionicons name="share-social-outline" size={20} style={CardStyles.favoriteIcon} />
              </View>
            </TouchableOpacity>
          )}
          <View style={localStyles.swipeTextContainer}>
            <Text style={localStyles.swipeTitle} numberOfLines={2}>{title}</Text>
            <Text style={localStyles.swipeAddress} numberOfLines={1}>{location}</Text>
            <View style={localStyles.swipeRow}>
              <Ionicons name="bed-outline" size={SIZES.h3} color={COLORS.white} />
              <Text style={localStyles.swipeDetailText}>{bedrooms} beds</Text>
              <Ionicons name="water-outline" size={SIZES.h3} color={COLORS.white} style={{ marginLeft: SIZES.padding }} />
              <Text style={localStyles.swipeDetailText}>{bathrooms} baths</Text>
            </View>
            <Text style={localStyles.swipePriceText}>{formattedPrice}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  if (displayAs === 'list') {
    return (
      <TouchableOpacity 
        style={CardStyles.listCardContainer}
        onPress={() => onPress(item)} 
        activeOpacity={0.8}
      >
        <View style={CardStyles.listCardInner}>
          <View style={CardStyles.listImageContainer}>
            {!imageLoaded && <View style={CardStyles.loaderContainer} />}
            <Image 
              source={{uri: thumbUrl}}
              style={CardStyles.listImage}
              contentFit="cover"
              cachePolicy="immutable"
              onLoad={() => {
                setImageLoaded(true);
                if (typeof onImageLoaded === 'function' && imageUrl) onImageLoaded(imageUrl);
              }}
              onError={(e) => console.log('Housing Card List Image Error:', e.nativeEvent.error)}
            />
            <TouchableOpacity 
              style={CardStyles.iconContainer} 
              onPress={onToggleFavorite}
            >
              <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}>
                <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={16} style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} />
              </View>
            </TouchableOpacity>
            {/* Share button for List View */}
            {onSharePress && (
              <TouchableOpacity 
                style={[CardStyles.iconContainer, { top: 48 }]} // Adjust position
                onPress={() => onSharePress(item)}
              >
                <View style={CardStyles.iconCircle}> 
                  <Ionicons name="share-social-outline" size={16} style={CardStyles.favoriteIcon} />
                </View>
              </TouchableOpacity>
            )}
            {hasGroupMatch && (
              <View style={[CardStyles.badgeContainer || {}, localStyles.listGroupIconContainer, localStyles.groupIconBackground]}>
                <Ionicons name="people-outline" size={16} color={COLORS.DARK_GREEN} />
              </View>
            )}
          </View>
          
          <View style={CardStyles.listContentContainer}>
            <Text style={CardStyles.title} numberOfLines={1}>{title}</Text>
            <View style={localStyles.listDetailRowShared}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[CardStyles.subtitle, {marginLeft: 4}]} numberOfLines={1}>{location}</Text>
            </View>
            <View style={localStyles.listDetailRowShared}>
              <Ionicons name="bed-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[CardStyles.subtitle, {marginLeft: 4}]}>{bedrooms} beds</Text>
              <Ionicons name="water-outline" size={16} color={COLORS.textSecondary} style={{marginLeft: 12}} />
              <Text style={[CardStyles.subtitle, {marginLeft: 4}]}>{bathrooms} baths</Text>
            </View>
            <Text style={[CardStyles.price, {marginTop: 4}]}>{weeklyRent || formattedPrice}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={CardStyles.gridCardWrapper}>
      <TouchableOpacity 
        style={CardStyles.gridCardContainer} 
        onPress={() => onPress(item)} 
        activeOpacity={0.8}
      >
        <View style={CardStyles.gridCardInner}>
          <View style={CardStyles.gridImageContainer}>
            {!imageLoaded && <View style={CardStyles.loaderContainer} />}
            <Image 
              source={{uri: thumbUrl}}
              style={CardStyles.gridImage}
              contentFit="cover"
              cachePolicy="immutable"
              onLoad={() => {
                setImageLoaded(true);
                if (typeof onImageLoaded === 'function' && imageUrl) onImageLoaded(imageUrl);
              }}
              onError={(e) => console.log('Housing Card Grid Image Error:', e.nativeEvent.error)}
            />
            <TouchableOpacity 
              style={CardStyles.iconContainer} 
              onPress={onToggleFavorite}
            >
              <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}>
                <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={20} style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} />
              </View>
            </TouchableOpacity>
            {/* Share button for Grid View */}
            {onSharePress && (
              <TouchableOpacity 
                style={[CardStyles.iconContainer, { top: 48 }]} // Adjust position
                onPress={() => onSharePress(item)}
              >
                <View style={CardStyles.iconCircle}> 
                  <Ionicons name="share-social-outline" size={20} style={CardStyles.favoriteIcon} />
                </View>
              </TouchableOpacity>
            )}
            {hasGroupMatch && (
              <View style={[CardStyles.badgeContainer || {}, localStyles.gridGroupIconContainer, localStyles.groupIconBackground]}>
                <Ionicons name="people-outline" size={18} color={COLORS.DARK_GREEN} />
              </View>
            )}
          </View>
          
          <View style={{padding: CardStyles.gridContentPadding !== undefined ? CardStyles.gridContentPadding : 8}}> 
            <Text style={CardStyles.title} numberOfLines={2}>{title}</Text>
            <View style={localStyles.gridDetailRowShared}> 
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[CardStyles.subtitle, {marginLeft: 4, flex: 1}]} numberOfLines={1}>{location}</Text>
            </View>
            <View style={localStyles.gridDetailRowShared}> 
              <Ionicons name="bed-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[CardStyles.subtitle, {marginLeft: 4}]}>{bedrooms} beds</Text>
              <Ionicons name="water-outline" size={16} color={COLORS.textSecondary} style={{marginLeft: 12}} />
              <Text style={[CardStyles.subtitle, {marginLeft: 4}]}>{bathrooms} baths</Text>
            </View>
            <View style={{alignItems: 'flex-end', marginTop: 2}}> 
                <Text style={CardStyles.price}>{weeklyRent || formattedPrice}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const localStyles = {
  swipeItemContainer: {
    width: '100%',
    height: '100%',
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray, 
  },
  swipeImageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  loaderContainerSwipe: { 
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%', 
  },
  swipeTextContainer: {
    position: 'absolute',
    bottom: SIZES.padding * 2,
    left: SIZES.padding,
    right: SIZES.padding,
  },
  swipeTitle: {
    fontSize: SIZES.h2, fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SIZES.base,
  },
  swipeAddress: {
    fontSize: SIZES.body3,
    color: COLORS.white,
    marginBottom: SIZES.base,
  },
  swipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  swipeDetailText: {
    fontSize: SIZES.body3,
    color: COLORS.white,
    marginLeft: SIZES.base / 2,
  },
  swipePriceText: {
    fontSize: SIZES.h3, fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SIZES.base,
  },
  listGroupIconContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  gridGroupIconContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  listDetailRowShared: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gridDetailRowShared: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base / 2,
  },
  groupIconBackground: {
    backgroundColor: 'rgba(144, 238, 144, 0.7)', // Semi-transparent bright green
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default React.memo(HousingCard);
