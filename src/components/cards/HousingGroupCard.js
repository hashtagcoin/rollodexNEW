import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native'; 
import { Image } from 'expo-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
import { CardStyles, createResponsiveGridCardWrapper } from '../../constants/CardStyles';
import { COLORS, SIZES } from '../../constants/theme';

// Card label colors for consistent styling
const LABEL_COLORS = {
  background: '#E6F2FF', // Light blue
  border: '#0066CC',    // Dark blue
  text: '#003366',      // Dark blue text
};

// Main component
const HousingGroupCard = ({ item, onPress, onImageLoaded, displayAs = 'grid', isFavorited, onToggleFavorite, onSharePress }) => { 
  const [imageLoaded, setImageLoaded] = useState(false);

  // Process housing group information
  const groupName = item.name || 'Housing Group';
  const description = item.description || 'No description available';
  const memberCount = item.max_members ? `${item.current_members || 0}/${item.max_members}` : 'Open';
  const moveInDate = item.move_in_date ? format(new Date(item.move_in_date), 'MMM d') : 'Flexible';
  
  // Get location from housing listing if available
  const location = item.housing_listing_data?.suburb || 'Location N/A';
  
  // Handle images - try to get from different possible fields
  const listingImage = item.housing_listing_data?.media_urls && 
                       item.housing_listing_data.media_urls.length > 0 ? 
                       item.housing_listing_data.media_urls[0] : null;
  const rawImageUrl = listingImage || item.avatar_url || null;
  const imageUrl = getValidImageUrl(rawImageUrl, 'housingimages');
  const thumbUrl = useMemo(() => (
    imageUrl ? getOptimizedImageUrl(imageUrl, 400, 70) : null
  ), [imageUrl]);
  const imageSource = useMemo(() => {
    return thumbUrl ? { uri: thumbUrl } : { uri: 'https://via.placeholder.com/400x300/E6F2FF/003366?text=Housing' };
  }, [thumbUrl]);

  // Process housing group info tags
  const processInfoTags = () => {
    const infoTags = [];
    
    // Add move-in date as a tag
    infoTags.push({ name: `Move-in: ${moveInDate}`, color: COLORS.success });
    
    // Add support needs if available
    if (item.support_needs) {
      infoTags.push({ name: `Support: ${item.support_needs}`, color: COLORS.info });
    }
    
    // Add gender preference if available
    if (item.gender_preference) {
      infoTags.push({ name: item.gender_preference, color: COLORS.purple });
    }
    
    return infoTags;
  };
  
  const infoTags = processInfoTags();

  if (displayAs === 'list') {
    return (
      <TouchableOpacity 
        style={CardStyles.listCardContainer} 
        onPress={onPress ? () => onPress(item) : undefined} 
        activeOpacity={0.8}
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
              onLoad={() => {
                setImageLoaded(true);
                if (typeof onImageLoaded === 'function' && thumbUrl) onImageLoaded(thumbUrl);
              }}
              onError={(e) => console.log('Housing Group Card List Image Error:', e.nativeEvent.error)}
            />
            <TouchableOpacity 
              style={CardStyles.iconContainer} 
              onPress={onToggleFavorite}
            >
              <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}> 
                <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={16} style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} />
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
              <Text style={[CardStyles.title, {flex: 1, paddingRight: 5}]} numberOfLines={1}>{groupName}</Text>
            </View>

            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
              <Ionicons name="location-outline" size={13} color={LABEL_COLORS.text} style={{marginRight: 4}} />
              <Text style={CardStyles.subtitle} numberOfLines={1}>{location}</Text>
            </View>
            <Text style={[CardStyles.subtitle, {marginVertical: 4}]} numberOfLines={2}>{description}</Text>

            {/* Bottom labels row: move-in date (left), member count (right) */}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
              {/* Move-in date */}
              <View style={CardStyles.labelContainer}>
                <Ionicons name="calendar-outline" size={13} color={LABEL_COLORS.text} style={{marginRight: 2}} />
                <Text style={CardStyles.labelText}>{moveInDate}</Text>
              </View>
              {/* Member count */}
              <View style={CardStyles.labelContainer}>
                <Ionicons name="people" size={13} color={LABEL_COLORS.text} style={{marginRight: 2}} />
                <Text style={CardStyles.labelText}>{memberCount}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  } else {
    // Grid view layout
    const { width } = Dimensions.get('window');
    const responsiveWrapperStyle = createResponsiveGridCardWrapper(width);
    
    return (
      <View style={responsiveWrapperStyle}> 
        <TouchableOpacity 
          style={[CardStyles.gridCardContainer, { alignSelf: 'stretch' }]}  
          onPress={onPress ? () => onPress(item) : undefined} 
          activeOpacity={0.8}
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
                onLoad={() => {
                  setImageLoaded(true);
                  if (typeof onImageLoaded === 'function' && thumbUrl) onImageLoaded(thumbUrl);
                }}
                onError={(e) => console.log('Housing Group Card Image Error:', e.nativeEvent.error)}
              />
              <TouchableOpacity 
                style={CardStyles.iconContainer} 
                onPress={onToggleFavorite}
              >
                <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}> 
                  <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={20} style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} />
                </View>
              </TouchableOpacity>
              {onSharePress && (
                <TouchableOpacity 
                  style={[CardStyles.iconContainer, { top: 40 }]} 
                  onPress={() => onSharePress(item)}
                >
                  <View style={CardStyles.iconCircle}> 
                    <Ionicons name="share-social-outline" size={20} style={CardStyles.favoriteIcon} /> 
                  </View>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={{padding: 8, paddingBottom: 32}}> 
              <Text style={[CardStyles.title, {marginBottom: 4}]} numberOfLines={2}>{groupName}</Text> 
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}> 
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="location-outline" size={13} color={LABEL_COLORS.text} style={{marginRight: 4}} />
                  <Text style={CardStyles.subtitle} numberOfLines={1}>{location}</Text>
                </View> 
              </View>
              {/* Bottom labels row */}
              <View style={{position: 'absolute', left: 8, right: 8, bottom: 8, flexDirection: 'row', justifyContent: 'space-between'}}>
                {/* Move-in date bottom left */}
                <View style={CardStyles.labelContainer}>
                  <Ionicons name="calendar-outline" size={13} color={LABEL_COLORS.text} style={{marginRight: 2}} />
                  <Text style={CardStyles.labelText}>{moveInDate}</Text>
                </View>
                {/* Member count bottom right */}
                <View style={CardStyles.labelContainer}>
                  <Ionicons name="people" size={13} color={LABEL_COLORS.text} style={{marginRight: 2}} />
                  <Text style={CardStyles.labelText}>{memberCount}</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
};

const localStyles = {
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    zIndex: 1,
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionIconsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusLabelContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  compactLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  cardStatusLabel: {
    position: 'absolute',
    top: -4, // Move label up above the card content
    right: 8,
    zIndex: 10,
  },
  statusLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberLabel: {
    backgroundColor: '#4CAF50', // Green
  },
  pendingLabel: {
    backgroundColor: '#FF9800', // Orange
  },
  needsLabel: {
    backgroundColor: '#3F51B5', // Indigo blue for 'Need X' label
  },
  declinedLabel: {
    backgroundColor: '#F44336', // Red
  },
  cardContent: {
    flex: 1,
    padding: 12, // Reduced padding for more compact spacing
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: 16, // Slightly smaller title
    fontWeight: 'bold',
    marginBottom: 2, // Less space beneath title
    color: '#212121', // Darker for better contrast
    letterSpacing: 0.3, // Modern typography
  },
  locationText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4, // Reduced margin
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDescription: {
    fontSize: 13, // Slightly smaller font
    color: '#666',
    marginBottom: 4, // Reduced margin
    lineHeight: 18, // Tighter line height
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: 8,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  moveInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveInText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButton: {
    paddingVertical: 6, // Reduced vertical padding
    paddingHorizontal: 12, // Reduced horizontal padding
    borderRadius: 20, // More rounded button
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    minWidth: 70, // Reduced minimum width
  },
  imageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 12, // Reduced font size
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  leaveButtonText: {
    color: '#666',
    fontSize: 12, // Reduced font size
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: '#f8f9fe',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  pendingButtonText: {
    color: COLORS.primary,
    fontSize: 12, // Reduced font size
    fontWeight: '600',
  },
  declinedButton: {
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: '#ff6b6b40',
  },
  declinedButtonText: {
    color: '#ff6b6b',
    fontSize: 12, // Reduced font size
    fontWeight: '600',
  }
};

export default HousingGroupCard;
