  import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import { CardStyles } from '../../constants/CardStyles'; // Import shared card styles

/**
 * EventCard component that displays event information in an Airbnb-style card format
 * Used in both grid and list views
 */
const EventCard = ({ event, onPress, listView = true, testID, onFavoriteUpdate }) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const { user } = useUser();
  
  useEffect(() => {
    if (user?.id && event?.id) {
      checkFavoriteStatus();
      checkParticipationStatus();
    }
  }, [user?.id, event?.id]);
  
  // Check if the event is favorited by current user
  const checkFavoriteStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', event.id)
        .eq('item_type', 'group_event')
        .maybeSingle();
        
      if (error) throw error;
      setIsFavorited(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };
  
  // Check if user is participating in this event
  const checkParticipationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('group_event_participants')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (error) throw error;
      setIsJoined(!!data);
    } catch (error) {
      console.error('Error checking participation status:', error);
    }
  };
  
  // Toggle favorite status
  const toggleFavorite = async (e) => {
    e.stopPropagation(); // Prevent triggering the card onPress
    
    if (!user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to favorite events');
      return;
    }
    
    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', event.id)
          .eq('item_type', 'group_event');
          
        if (error) throw error;
        setIsFavorited(false);
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            item_id: event.id,
            item_type: 'group_event'
          });
          
        if (error) throw error;
        setIsFavorited(true);
      }
      
      // Notify parent component if needed
      if (onFavoriteUpdate) {
        onFavoriteUpdate(event.id, !isFavorited);
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      Alert.alert('Error', 'Could not update favorite status');
    }
  };
  
  // Share event
  const handleShare = async (e) => {
    e.stopPropagation(); // Prevent triggering the card onPress
    
    try {
      await Share.share({
        message: `Check out this event: ${event.title}\n${event.description}\nDate: ${format(new Date(event.start_time), 'PPP')}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };
  
  // Format the event date/time
  const formatEventDate = (startTime) => {
    if (!startTime) return 'Date TBD';
    const date = new Date(startTime);
    return format(date, 'EEE, MMM d, yyyy • h:mm a');
  };

  // Determine category icon
  const getCategoryIcon = (category) => {
    switch(category) {
      case 'social': return 'users';
      case 'educational': return 'book';
      case 'sports': return 'activity';
      case 'art': return 'edit-3';
      case 'health': return 'heart';
      default: return 'calendar';
    }
  };

  // Conditionally render card based on list or grid view
  if (listView) {
    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={onPress}
        testID={testID}
        style={styles.cardContainer}
      >
        <View style={styles.listCard}>
          {/* Event image with status indicators */}
          <View style={styles.imageContainerList}>
            <Image 
              source={event.image_url ? { uri: event.image_url } : require('../../assets/images/placeholder.png')} 
              style={styles.imageList} 
              resizeMode="cover"
            />
            
            {/* Joined indicator */}
            {isJoined && (
              <View style={styles.joinedBadge}>
                <Feather name="check-circle" size={12} color={COLORS.white} />
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            )}
          </View>
          
          {/* Action buttons row */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={toggleFavorite}
              testID={`favorite-button-${event.id}`}
            >
              <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}>
  <Ionicons 
    name={isFavorited ? "heart" : "heart-outline"} 
    size={16} 
    style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} 
  />
</View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleShare}
              testID={`share-button-${event.id}`}
            >
              <Feather name="share-2" size={18} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>
          
          {/* Event details */}
          <View style={styles.contentList}>
            <View style={styles.categoryContainer}>
              <Feather name={getCategoryIcon(event.category)} size={14} color={COLORS.primary} />
              <Text style={styles.category}>{event.category || 'Event'}</Text>
            </View>
            
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            
            <View style={styles.dateContainer}>
              <Feather name="clock" size={14} color={COLORS.darkGray} />
              <Text style={styles.date}>{formatEventDate(event.start_time)}</Text>
            </View>
            
            <View style={styles.locationContainer}>
              <Feather name="map-pin" size={14} color={COLORS.darkGray} />
              <Text style={styles.location} numberOfLines={1}>
                {event.location?.address || 'Location TBD'}
              </Text>
            </View>
            
            {/* Participants info */}
            <View style={styles.participantsContainer}>
              <Feather name="users" size={14} color={COLORS.darkGray} />
              <Text style={styles.participants}>
                {event.participant_count || 0} joined
                {event.max_participants ? ` · ${event.max_participants} max` : ''}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  } else {
    // Grid view card
    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={onPress} 
        style={styles.gridCardContainer}
        testID={testID}
      >
        <View style={styles.gridCard}>
          <Image 
            source={event.image_url ? { uri: event.image_url } : require('../../assets/images/placeholder.png')} 
            style={styles.imageGrid} 
            resizeMode="cover"
          />
          
          {/* Joined indicator */}
          {isJoined && (
            <View style={styles.joinedBadge}>
              <Feather name="check-circle" size={12} color={COLORS.white} />
              <Text style={styles.joinedText}>Joined</Text>
            </View>
          )}
          
          {/* Action buttons row */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={toggleFavorite}
              testID={`favorite-button-${event.id}`}
            >
              <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}>
  <Ionicons 
    name={isFavorited ? "heart" : "heart-outline"} 
    size={16} 
    style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} 
  />
</View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleShare}
              testID={`share-button-${event.id}`}
            >
              <Feather name="share-2" size={18} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>
          
          {/* Event details */}
          <View style={styles.contentGrid}>
            <View style={styles.categoryContainer}>
              <Feather name={getCategoryIcon(event.category)} size={14} color={COLORS.primary} />
              <Text style={styles.category}>{event.category || 'Event'}</Text>
            </View>
            
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            
            <View style={styles.dateContainer}>
              <Feather name="clock" size={14} color={COLORS.darkGray} />
              <Text style={styles.date}>{formatEventDate(event.start_time)}</Text>
            </View>
            
            <View style={styles.locationContainer}>
              <Feather name="map-pin" size={14} color={COLORS.darkGray} />
              <Text style={styles.location} numberOfLines={1}>
                {event.location?.address || 'Location TBD'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  // List View Styles
  cardContainer: {
    marginVertical: 8, 
    marginHorizontal: 16,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 150, // Fixed height for consistency
  },
  imageContainerList: {
    width: 120,
    position: 'relative',
  },
  imageList: {
    width: 120,
    height: '100%',
  },
  contentList: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  
  // Grid View Styles
  gridCardContainer: {
    margin: 8,
    width: '45%', // slightly less than half to account for margins
  },
  gridCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 240, // Taller for better proportions
  },
  imageGrid: {
    width: '100%',
    height: 140,
  },
  contentGrid: {
    padding: 12,
    height: 100,
    justifyContent: 'space-between',
  },
  
  // Common Styles
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginLeft: 6,
    fontFamily: FONTS.regular,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  location: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginLeft: 6,
    fontFamily: FONTS.regular,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participants: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginLeft: 6,
    fontFamily: FONTS.regular,
  },
  category: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
    fontFamily: FONTS.medium,
  },
  
  // Action buttons
  actionRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
  },
  actionButton: {
    marginHorizontal: 2,
  },
  
  // Joined indicator
  joinedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.primary + 'E6', // Adding transparency
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinedText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },
});

export default EventCard;
