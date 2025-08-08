import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Ionicons } from 'react-native-vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { CardStyles } from '../../constants/CardStyles';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';

/**
 * Component for displaying favorited events in the Favorites screen
 */
const EventFavoriteCard = ({ 
  item, 
  onPress, 
  onRemoveFavorite,
  testID,
  displayAs = 'grid',
  onSharePress
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const formattedDate = item.event_start_time 
    ? format(new Date(item.event_start_time), 'E, MMM d • h:mm a')
    : 'Date TBD';
    
  // Get appropriate icon for event category
  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'social': return 'people';
      case 'education': return 'school';
      case 'sport': return 'basketball';
      case 'entertainment': return 'musical-notes';
      case 'community': return 'home';
      case 'online': return 'desktop';
      case 'other': return 'calendar';
      default: return 'calendar';
    }
  };

  const handleRemove = () => {
    onRemoveFavorite(item.favorite_id, item.item_id);
  };

  const imageSource = useMemo(() => {
    const rawImageUrl = item.media_urls?.[0] || item.item_image_url;
    const imageUrl = getValidImageUrl(rawImageUrl, 'eventimages');
    const thumbUrl = imageUrl ? getOptimizedImageUrl(imageUrl, 400, 70) : null;
    return thumbUrl ? { uri: thumbUrl } : require('../../assets/images/placeholder.png');
  }, [item.media_urls, item.item_image_url]);

  // List View
  if (displayAs === 'list') {
    return (
      <TouchableOpacity 
        style={CardStyles.listCardContainer}
        onPress={onPress}
        activeOpacity={0.8}
        testID={testID}
      >
        <View style={CardStyles.listCardInner}>
          <View style={CardStyles.listImageContainer}>
            {!imageLoaded && (
              <View style={CardStyles.loaderContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
            <Image 
              source={imageSource}
              style={CardStyles.listImage}
              contentFit="cover"
              cachePolicy="immutable"
              onLoad={() => setImageLoaded(true)}
              onError={() => console.log('Event Card Image Error')}
            />
            <TouchableOpacity 
              style={CardStyles.iconContainer}
              onPress={handleRemove}
            >
              <View style={CardStyles.iconCircleActive}>
                <Ionicons name="heart" size={16} style={CardStyles.favoriteIconActive} />
              </View>
            </TouchableOpacity>
            {onSharePress && (
              <TouchableOpacity 
                style={[CardStyles.iconContainer, { top: 40 }]}
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
              <Text style={[CardStyles.title, {flex: 1, paddingRight: 5}]} numberOfLines={1}>
                {item.item_type === 'group_event' ? item.item_title : 'Unknown Title'}
              </Text>
              <View style={CardStyles.ratingContainer}>
                <Ionicons name={getCategoryIcon(item.event_category)} size={16} color={COLORS.primary} />
              </View>
            </View>
            
            <Text style={[CardStyles.subtitle, {marginVertical: 4}]} numberOfLines={2}>
              {item.description || 'No description available.'}
            </Text> 
            
            <View style={CardStyles.bottomSection}>
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 5}}>
                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                <Text style={[CardStyles.subtitle, {marginLeft: 4}]} numberOfLines={1}>
                  {formattedDate}
                </Text>
              </View>
            </View>
            
            {item.event_location && (
              <View style={[CardStyles.bottomSection, {marginTop: 4}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                  <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={[CardStyles.subtitle, {marginLeft: 4}]} numberOfLines={1}>
                    {item.event_location?.address || 'Location TBD'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  // Grid View
  return (
    <View style={CardStyles.gridCardWrapper}>
      <TouchableOpacity 
        style={CardStyles.gridCardContainer}
        onPress={onPress}
        activeOpacity={0.8}
        testID={testID}
      >
        <View style={CardStyles.gridCardInner}>
          <View style={CardStyles.gridImageContainer}>
            {!imageLoaded && (
              <View style={CardStyles.loaderContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
            <Image 
              source={imageSource}
              style={CardStyles.gridImage}
              contentFit="cover"
              cachePolicy="immutable"
              onLoad={() => setImageLoaded(true)}
              onError={() => console.log('Event Card Image Error')}
            />
            <TouchableOpacity 
              style={CardStyles.iconContainer}
              onPress={handleRemove}
            >
              <View style={CardStyles.iconCircleActive}>
                <Ionicons name="heart" size={16} style={CardStyles.favoriteIconActive} />
              </View>
            </TouchableOpacity>
            {onSharePress && (
              <TouchableOpacity 
                style={[CardStyles.iconContainer, { top: 44 }]}
                onPress={() => onSharePress(item)}
              >
                <View style={CardStyles.iconCircle}>
                  <Ionicons name="share-social-outline" size={16} style={CardStyles.favoriteIcon} />
                </View>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={{padding: 12}}>
            <Text style={[CardStyles.title, {marginBottom: 4}]} numberOfLines={2}>
              {item.item_type === 'group_event' ? item.item_title : 'Unknown Title'}
            </Text>
            
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
              <Ionicons 
                name={getCategoryIcon(item.event_category)} 
                size={14} 
                color={COLORS.primary} 
                style={{marginRight: 4}}
              />
              <Text style={[CardStyles.subtitle, {flex: 1}]} numberOfLines={1}>
                {item.event_category || 'Event'}
              </Text>
            </View>
            
            <Text style={[CardStyles.subtitle, {marginBottom: 4}]} numberOfLines={1}>
              <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} /> {formattedDate}
            </Text>
            
            {item.event_location && (
              <Text style={[CardStyles.subtitle, {marginBottom: 4}]} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} /> 
                {item.event_location?.address?.split(',')[0] || 'Location TBD'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default EventFavoriteCard;
