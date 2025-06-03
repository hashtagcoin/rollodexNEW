import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, FONTS, SHADOWS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getValidImageUrl } from '../../utils/imageHelper';
import { supabase } from '../../lib/supabaseClient';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 10;
const CARD_WIDTH = width - (CARD_MARGIN * 4);

const HousingGroupCard = ({ 
  item, 
  onPress, 
  onActionPress,
  gridMode = false,
  onSharePress,
  onFavoritePress
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Check favorite status when component mounts
  useEffect(() => {
    checkFavoriteStatus();
  }, [item]);

  // Check if housing group is favorited
  const checkFavoriteStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !item.id) return;
      
      const { data } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', item.id)
        .eq('item_type', 'housing_group')
        .single();
        
      setIsFavorite(!!data);
    } catch (error) {
      // Ignore errors to avoid UI disruption
    }
  };
  
  // Handle favorite button press
  const handleFavoritePress = async (e) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', item.id)
          .eq('item_type', 'housing_group');
          
        setIsFavorite(false);
      } else {
        // Add to favorites
        await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            item_id: item.id,
            item_type: 'housing_group',
            created_at: new Date().toISOString()
          });
          
        setIsFavorite(true);
      }
      
      // Call external handler if provided
      if (onFavoritePress) {
        onFavoritePress(item, !isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };
  
  // Handle share button press
  const handleSharePress = (e) => {
    e.stopPropagation();
    if (onSharePress) {
      onSharePress(item);
    } else {
      // Default share handling
      Share.share({
        message: `Check out this housing group: ${item.name}`,
        title: item.name,
      });
    }
  };
  
  // Determine button text and style based on membership status
  let buttonText = 'Join';
  let buttonStyle = styles.joinButton;
  let buttonTextStyle = styles.joinButtonText;
  let disabled = false;
  let statusLabel = null;
  let statusLabelStyle = null;

  if (item.membershipStatus === 'approved') {
    buttonText = 'Leave';
    buttonStyle = styles.leaveButton;
    buttonTextStyle = styles.leaveButtonText;
    statusLabel = 'Member';
    statusLabelStyle = styles.memberLabel;
  } else if (item.membershipStatus === 'pending') {
    buttonText = 'Leave'; // Changed from 'Pending' to 'Leave'
    buttonStyle = styles.leaveButton; // Changed to use leaveButton style instead of pendingButton
    buttonTextStyle = styles.leaveButtonText;
    statusLabel = 'Pending';
    statusLabelStyle = styles.pendingLabel;
    disabled = false; // Allow users to cancel their pending request
  } else if (item.applicationStatus === 'pending') {
    buttonText = 'Application Pending';
    buttonStyle = styles.pendingButton;
    buttonTextStyle = styles.pendingButtonText;
    statusLabel = 'Application Pending';
    statusLabelStyle = styles.pendingLabel;
    disabled = true;
  } else if (item.applicationStatus === 'declined' || item.membershipStatus === 'declined') {
    buttonText = 'Application Declined';
    buttonStyle = styles.declinedButton;
    buttonTextStyle = styles.declinedButtonText;
    statusLabel = 'Declined';
    statusLabelStyle = styles.declinedLabel;
    disabled = true;
  } else if (item.needsLabel) {
    // Show the 'Need X' label when provided
    statusLabel = item.needsLabel;
    statusLabelStyle = styles.needsLabel;
  }
  
  // Format move-in date if available
  const moveInDateText = item.move_in_date ? format(new Date(item.move_in_date), 'MMM d, yyyy') : 'Flexible';
  
  // Get image from housing listing if available
  const listingImage = item.housing_listing_data?.media_urls && 
                       item.housing_listing_data.media_urls.length > 0 ? 
                       item.housing_listing_data.media_urls[0] : null;
                       
  const rawImageUrl = listingImage || (item.avatar_url || null);
  const imageUrl = getValidImageUrl(rawImageUrl, 'housingimages');
  
  const imageSource = useMemo(() => {
    return imageUrl ? 
      { uri: imageUrl } : 
      { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.png' };
  }, [imageUrl]);

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        gridMode ? styles.gridCard : styles.listCard
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Status label for list view - outside of image container */}
      {!gridMode && statusLabel && (
        <View style={[styles.cardStatusLabel]}>
          <View style={[statusLabelStyle, styles.compactLabel]}>
            <Text style={styles.statusLabelText}>{statusLabel}</Text>
          </View>
        </View>
      )}
      
      <View style={gridMode ? styles.gridImageContainer : styles.listImageContainer}>
        {!imageLoaded && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
        <Image 
          source={imageSource}
          style={gridMode ? styles.gridImage : styles.listImage}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
        
        {/* Card action icons */}
        <View style={styles.actionIconsContainer}>
          <TouchableOpacity 
            style={styles.actionIcon}
            onPress={handleFavoritePress}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={22} 
              color={isFavorite ? COLORS.error : "#fff"}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionIcon}
            onPress={handleSharePress}
          >
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* NDIS labels removed as requested */}
        
        {/* Membership status label for grid view only */}
        {gridMode && statusLabel && (
          <View style={[styles.statusLabelContainer, statusLabelStyle]}>
            <Text style={styles.statusLabelText}>{statusLabel}</Text>
          </View>
        )}
        
        {/* Join/Leave button positioned at bottom right of image */}
        <TouchableOpacity 
          style={[styles.actionButton, buttonStyle, styles.imageButton]} 
          onPress={() => !disabled && onActionPress()}
          disabled={disabled}
        >
          <Text style={buttonTextStyle}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardContent}>
        <Text 
          style={styles.cardTitle} 
          numberOfLines={1} 
          ellipsizeMode="tail"
        >
          {item.name}
        </Text>
        
        {/* Location from housing listing if available */}
        <Text style={styles.locationText} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} color="#888" style={{marginRight: 4}} />
          {item.housing_listing_data?.suburb || 'Location N/A'}
        </Text>
        
        <Text 
          style={styles.cardDescription} 
          numberOfLines={gridMode ? 3 : 2} 
          ellipsizeMode="tail"
        >
          {item.description || 'No description available.'}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <View style={styles.memberCountContainer}>
              <Ionicons name="people" size={14} color="#666" />
              <Text style={styles.memberCount}>
                {item.current_members || 0}/{item.max_members || 0}
              </Text>
            </View>
            
            <View style={styles.moveInContainer}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.moveInText}>
                {moveInDateText}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Join/Leave button moved inside image container */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // More rounded corners like Airbnb
    marginBottom: 20, // More space between cards
    overflow: 'hidden',
    ...SHADOWS.medium,
    elevation: 4, // Add more depth on Android
  },
  listCard: {
    flexDirection: 'row',
    width: '100%',
    height: 160, // Slightly taller
    position: 'relative',
  },
  gridCard: {
    width: CARD_WIDTH / 2 - 8,
    height: 320, // Taller to accommodate modern layout and button
    marginHorizontal: 4,
    position: 'relative',
  },
  listImageContainer: {
    width: 140, // Wider image container
    height: '100%',
    position: 'relative',
  },
  gridImageContainer: {
    width: '100%',
    height: 160, // Taller images like Airbnb
    position: 'relative',
  },
  loaderContainer: {
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
    padding: 16, // More padding for better content spacing
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: 17, // Slightly larger title
    fontWeight: 'bold',
    marginBottom: 4, // More space beneath title
    color: '#212121', // Darker for better contrast
    letterSpacing: 0.3, // Modern typography
  },
  locationText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
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
  },
});

export default HousingGroupCard;
