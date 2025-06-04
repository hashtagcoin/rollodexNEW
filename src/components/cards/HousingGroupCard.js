import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { getValidImageUrl } from '../../utils/imageHelper';
import { CardStyles } from '../../constants/CardStyles';
import { COLORS, SIZES } from '../../constants/theme';

// Main component
const HousingGroupCard = ({ item, onPress, onImageLoaded, displayAs = 'grid', isFavorited, onToggleFavorite, onSharePress }) => { 
  const [imageLoaded, setImageLoaded] = useState(false);

  // Process housing group information
  const groupName = item.name || 'Housing Group';
  const description = item.description || 'No description available';
  const memberCount = item.max_members ? `${item.current_members || 0}/${item.max_members} Members` : 'Open Group';
  const moveInDate = item.move_in_date ? format(new Date(item.move_in_date), 'MMM d, yyyy') : 'Flexible';
  
  // Get location from housing listing if available
  const location = item.housing_listing_data?.suburb || 'Location N/A';
  
  // Handle images - try to get from different possible fields
  const listingImage = item.housing_listing_data?.media_urls && 
                       item.housing_listing_data.media_urls.length > 0 ? 
                       item.housing_listing_data.media_urls[0] : null;
  const rawImageUrl = listingImage || item.avatar_url || null;
  const imageUrl = getValidImageUrl(rawImageUrl, 'housingimages');
  const imageSource = useMemo(() => {
    return imageUrl ? { uri: imageUrl } : { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.png' };
  }, [imageUrl]);

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
              onLoad={() => {
                setImageLoaded(true);
                if (typeof onImageLoaded === 'function' && imageUrl) onImageLoaded(imageUrl);
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
                style={[CardStyles.iconContainer, { top: 48 }]}
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
              <View style={localStyles.memberBadge}>
                <Ionicons name="people" size={14} color={COLORS.primary} />
                <Text style={localStyles.memberText}>{memberCount}</Text>
              </View>
            </View>

            <Text style={CardStyles.subtitle} numberOfLines={1}>{location}</Text> 
            <Text style={[CardStyles.subtitle, {marginVertical: 4}]} numberOfLines={2}>{description}</Text> 
            <View style={localStyles.listTagsContainer}>
              {infoTags.slice(0, 2).map((tag, index) => (
                <View key={`${tag.name}-${index}`} style={[localStyles.listTagButton, {backgroundColor: tag.color || COLORS.lightGray}]}>
                  <Text style={localStyles.listTagText}>{tag.name}</Text>
                </View>
              ))}
              {infoTags.length > 2 && (
                <View style={[localStyles.listTagButton, {backgroundColor: COLORS.lightGray}]}>
                  <Text style={localStyles.listTagText}>+{infoTags.length - 2} more</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  } else {
    // Grid view layout
    return (
      <View style={CardStyles.gridCardWrapper}> 
        <TouchableOpacity 
          style={CardStyles.gridCardContainer}  
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
                onLoad={() => {
                  setImageLoaded(true);
                  if (typeof onImageLoaded === 'function' && imageUrl) onImageLoaded(imageUrl);
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
                  style={[CardStyles.iconContainer, { top: 48 }]} 
                  onPress={() => onSharePress(item)}
                >
                  <View style={CardStyles.iconCircle}> 
                    <Ionicons name="share-social-outline" size={20} style={CardStyles.favoriteIcon} /> 
                  </View>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={{padding: 8}}> 
              <Text style={[CardStyles.title, {marginBottom: 4}]} numberOfLines={2}>{groupName}</Text> 
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}> 
                <Text style={CardStyles.subtitle} numberOfLines={1}>{location}</Text> 
                <View style={localStyles.memberBadge}>
                  <Ionicons name="people" size={14} color={COLORS.primary} />
                  <Text style={localStyles.memberText}>{memberCount}</Text>
                </View>
              </View>
              <Text style={[CardStyles.subtitle, {marginTop: 4}]} numberOfLines={1}>{moveInDate}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
};

const localStyles = {
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 5,
  },
  memberText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 3,
    fontWeight: '600',
  },
  listTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  listTagButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 5,
    backgroundColor: COLORS.lightGray,
  },
  listTagText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
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
