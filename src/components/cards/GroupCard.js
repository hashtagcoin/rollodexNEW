import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getValidImageUrl } from '../../utils/imageHelper';
import { CardStyles } from '../../constants/CardStyles';
import { COLORS, SIZES } from '../../constants/theme';

// Main component
const GroupCard = ({ item, onPress, onImageLoaded, displayAs = 'grid', isFavorited, onToggleFavorite, onSharePress }) => { 
  const [imageLoaded, setImageLoaded] = useState(false);

  // Process group information - different fields from services
  const groupName = item.name || 'Group Name';
  const category = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Community';
  const description = item.description || 'No description available';
  const memberCount = item.max_members ? `${item.current_members || 0}/${item.max_members} Members` : 'Open Group';
  
  // Handle image URL (using both avatar_url and imageurl fields)
  const rawImageUrl = item.avatar_url || item.imageurl || null;
  const imageUrl = getValidImageUrl(rawImageUrl, 'group-avatars');
  const imageSource = useMemo(() => {
    return imageUrl ? { uri: imageUrl } : { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/group-avatars/default-group.png' };
  }, [imageUrl]);

  // Process group type badges (similar to credentials in ServiceCard)
  const processGroupTags = () => {
    const tagButtons = [];
    
    // Add group type as a tag
    if (item.type) {
      let color = COLORS.primary;
      if (item.type.toLowerCase() === 'community') color = COLORS.success;
      else if (item.type.toLowerCase() === 'event') color = COLORS.danger;
      else if (item.type.toLowerCase() === 'interest') color = COLORS.info;
      
      tagButtons.push({ name: `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Group`, color });
    }
    
    // Add visibility tag
    if (item.is_public !== undefined) {
      tagButtons.push({ 
        name: item.is_public ? 'Public' : 'Private', 
        color: item.is_public ? COLORS.tertiary : COLORS.darkGray 
      });
    }
    
    // If there are no tags yet, add the category
    if (tagButtons.length === 0 && item.category) {
      tagButtons.push({ name: category, color: COLORS.primary });
    }
    
    return tagButtons;
  };
  
  const groupTags = processGroupTags();

  // List view layout
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
              onError={(e) => console.log('Group Card List Image Error:', e.nativeEvent.error)}
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
              <View style={CardStyles.memberBadge}>
                <Ionicons name="people" size={14} color={COLORS.primary} />
                <Text style={CardStyles.memberText}>{memberCount}</Text>
              </View>
            </View>
            <Text style={CardStyles.subtitle} numberOfLines={1}>{category}</Text> 
            <Text style={[CardStyles.subtitle, {marginVertical: 4}]} numberOfLines={2}>{description}</Text> 
            <View style={localStyles.listTagsContainer}>
              {groupTags.slice(0, 2).map((tag, index) => (
                <View key={`${tag.name}-${index}`} style={[localStyles.listTagButton, {backgroundColor: tag.color || COLORS.lightGray}]}>
                  <Text style={localStyles.listTagText}>{tag.name}</Text>
                </View>
              ))}
              {groupTags.length > 2 && (
                <View style={[localStyles.listTagButton, {backgroundColor: COLORS.lightGray}]}>
                  <Text style={localStyles.listTagText}>+{groupTags.length - 2} more</Text>
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
                onError={(e) => console.log('Group Card Image Error:', e.nativeEvent.error)}
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
            
            <View style={{padding: 8}}> 
              <Text style={[CardStyles.title, {marginBottom: 4}]} numberOfLines={2}>{groupName}</Text> 
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}> 
                <Text style={CardStyles.subtitle} numberOfLines={1}>{category}</Text>
                <View style={CardStyles.memberBadge}>
                  <Ionicons name="people" size={14} color={COLORS.primary} />
                  <Text style={CardStyles.memberText}>{memberCount}</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
};

// Add additional local styles needed for GroupCard
const localStyles = {
  listTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  listTagButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  listTagText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  memberText: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginLeft: 4,
    fontWeight: '600',
  }
};

export default GroupCard;
