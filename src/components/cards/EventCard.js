  import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator  } from 'react-native';
import { Alert } from '../../utils/alert';

import { Image } from 'expo-image';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
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
  const [imageLoaded, setImageLoaded] = useState(false);
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

  // Prepare image URLs (thumb via helper)
  const rawImage = event.image_url || null;
  const validUrl = getValidImageUrl(rawImage, 'eventimages');
  const thumbUrl = validUrl ? getOptimizedImageUrl(validUrl, listView ? 400 : 400, 70) : null;
  const imageSource = useMemo(() => (
    thumbUrl ? { uri: thumbUrl } : { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/eventimages/default-event.png' }
  ), [thumbUrl]);

  // Conditionally render card based on view mode
  if (listView) {
    return (
      <TouchableOpacity 
        style={[CardStyles.listCardContainer, {backgroundColor: '#ffffff'}]}
        onPress={onPress ? () => onPress(event) : undefined}
        activeOpacity={0.8}
        testID={testID}
      >
        <View style={[CardStyles.listCardInner, {height: 140, backgroundColor: '#ffffff'}]}>
          <View style={CardStyles.listImageContainer}>
            {!imageLoaded && <View style={CardStyles.loaderContainer} />}
            <Image
              source={imageSource}
              style={CardStyles.listImage}
              contentFit="cover"
              cachePolicy="immutable"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
            
            {/* Joined indicator */}
            {isJoined && (
              <View style={styles.joinedBadge}>
                <Feather name="check-circle" size={12} color={COLORS.white} />
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            )}
          </View>
          
          {/* Favorite button - moved to top right */}
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={toggleFavorite}
            testID={`favorite-button-${event.id}`}
          >
            <View style={isFavorited ? CardStyles.iconCircleActive : CardStyles.iconCircle}>
              <Ionicons 
                name={isFavorited ? "heart" : "heart-outline"} 
                size={18} 
                style={isFavorited ? CardStyles.favoriteIconActive : CardStyles.favoriteIcon} 
              />
            </View>
          </TouchableOpacity>
          
          {/* Event details */}
          <View style={styles.contentList}>
            <View style={styles.categoryContainer}>
              <Feather name={getCategoryIcon(event.category)} size={14} color={COLORS.black} />
              <Text style={styles.category}>{event.category || 'Event'}</Text>
            </View>
            
            <Text style={[styles.title, {fontWeight: 'bold'}]} numberOfLines={2}>{event.title}</Text>
            
            <View style={styles.dateContainer}>
              <Feather name="clock" size={14} color={COLORS.black} />
              <Text style={styles.date}>{formatEventDate(event.start_time)}</Text>
            </View>
            
            <View style={styles.locationContainer}>
              <Feather name="map-pin" size={14} color={COLORS.black} />
              <Text style={styles.location} numberOfLines={1}>
                {event.location?.address || 'Location TBD'}
              </Text>
            </View>
            
            {/* Participants info */}
            <View style={styles.participantsContainer}>
              <Feather name="users" size={14} color={COLORS.black} />
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
      <View style={CardStyles.gridCardWrapper}>
        <TouchableOpacity
          style={CardStyles.gridCardContainer}
          onPress={onPress ? () => onPress(event) : undefined}
          activeOpacity={0.8}
          testID={testID}
        >
          <View style={[CardStyles.gridCardInner, {height: 286}]}>
            <View style={CardStyles.gridImageContainer}>
              {!imageLoaded && <View style={CardStyles.loaderContainer} />}
              <Image
                source={imageSource}
                style={CardStyles.gridImage}
                contentFit="cover"
                cachePolicy="immutable"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
              
              {/* Joined indicator */}
              {isJoined && (
                <View style={styles.joinedBadge}>
                  <Feather name="check-circle" size={12} color={COLORS.white} />
                  <Text style={styles.joinedText}>Joined</Text>
                </View>
              )}
            </View>
            
            <View style={{padding: 12}}>
              <View style={styles.categoryContainer}>
                <Feather name={getCategoryIcon(event.category)} size={14} color={COLORS.black} />
                <Text style={styles.category}>{event.category || 'Event'}</Text>
              </View>
              <Text style={[CardStyles.title, {marginBottom:6}]} numberOfLines={2}>{event.title}</Text>
              <View style={styles.dateContainer}>
                <Feather name="clock" size={13} color={COLORS.black} />
                <Text style={styles.date}>{formatEventDate(event.start_time)}</Text>
              </View>
              <View style={styles.locationContainer}>
                <Feather name="map-pin" size={13} color={COLORS.black} />
                <Text style={styles.location} numberOfLines={1}>{event.location?.address || 'Location TBD'}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  // Common Styles
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    marginBottom: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    color: COLORS.black,
    marginLeft: 4,
    fontFamily: FONTS.regular,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  location: {
    fontSize: 11,
    color: COLORS.black,
    marginLeft: 4,
    fontFamily: FONTS.regular,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participants: {
    fontSize: 11,
    color: COLORS.black,
    marginLeft: 4,
    fontFamily: FONTS.regular,
  },
  category: {
    fontSize: 12,
    color: COLORS.black,
    marginLeft: 4,
    fontFamily: FONTS.medium,
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
  contentList: {
    flex: 1,
    paddingTop: 4,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    justifyContent: 'space-between',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
});

export default EventCard;
