import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Share, Alert } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params || {};
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const { user: authUser } = useAuth();
  const { user: userProfile, profile } = useUser();

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId && userProfile?.id) {
      checkParticipantStatus();
      checkFavoriteStatus();
    }
  }, [eventId, userProfile?.id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('id', eventId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setEvent(data);
        setParticipantCount(data.participant_count || 0);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      Alert.alert('Error', 'Could not load event details');
    } finally {
      setLoading(false);
    }
  };
  
  const checkParticipantStatus = async () => {
    // Use userProfile which comes from UserContext and contains the current user's profile
    if (!userProfile?.id || !eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('group_event_participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userProfile.id)
        .maybeSingle();
        
      if (error) throw error;
      
      setIsParticipant(!!data);
    } catch (error) {
      console.error('Error checking participant status:', error);
    }
  };
  
  const checkFavoriteStatus = async () => {
    // Use userProfile which comes from UserContext and contains the current user's profile
    if (!userProfile?.id || !eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('item_id', eventId)
        .eq('user_id', userProfile.id)
        .eq('item_type', 'group_event')
        .maybeSingle();
        
      if (error) throw error;
      
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };
  
  const handleJoinLeaveEvent = async () => {
    // Check if userProfile (from UserContext) exists
    if (!userProfile?.id) {
      Alert.alert('Sign In Required', 'Please sign in to join events');
      return;
    }
    
    try {
      setParticipantsLoading(true);
      
      if (isParticipant) {
        // Leave event
        const { error } = await supabase
          .from('group_event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userProfile.id);
          
        if (error) throw error;
        
        setIsParticipant(false);
        setParticipantCount(Math.max(0, participantCount - 1));
      } else {
        // Join event
        const { error } = await supabase
          .from('group_event_participants')
          .insert({
            event_id: eventId,
            user_id: userProfile.id
          });
          
        if (error) throw error;
        
        setIsParticipant(true);
        setParticipantCount(participantCount + 1);
      }
    } catch (error) {
      console.error('Error updating participant status:', error);
      Alert.alert('Error', isParticipant ? 'Could not leave event' : 'Could not join event');
    } finally {
      setParticipantsLoading(false);
    }
  };
  
  const toggleFavorite = async () => {
    // Check if userProfile (from UserContext) exists
    if (!userProfile?.id) {
      Alert.alert('Sign In Required', 'Please sign in to favorite events');
      return;
    }
    
    try {
      if (isFavorite) {
        // Unfavorite event
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('item_id', eventId)
          .eq('user_id', userProfile.id)
          .eq('item_type', 'group_event');
          
        if (error) throw error;
        
        setIsFavorite(false);
      } else {
        // Favorite event
        const { error } = await supabase
          .from('favorites')
          .insert({
            item_id: eventId,
            user_id: userProfile.id,
            item_type: 'group_event'
          });
          
        if (error) throw error;
        
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      Alert.alert('Error', isFavorite ? 'Could not unfavorite event' : 'Could not favorite event');
    }
  };
  
  const handleShareEvent = async () => {
    if (!event) return;
    
    try {
      await Share.share({
        message: `Join me at ${event.title}! ${event.description}\nDate: ${format(new Date(event.start_time), 'PPP')}\nLocation: ${event.location?.address || 'TBA'}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Event Details" navigation={navigation} canGoBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </View>
    );
  }
  
  if (!event) {
    return (
      <View style={styles.container}>
        <AppHeader title="Event Details" navigation={navigation} canGoBack={true} />
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back to Events</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <AppHeader 
        title={event.title} 
        navigation={navigation} 
        canGoBack={true} 
        rightElement={
          <TouchableOpacity onPress={handleShareEvent} style={{ padding: 5 }}>
            <Feather name="share-2" size={22} color={COLORS.darkGray} />
          </TouchableOpacity>
        }
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={event.image_url 
              ? { uri: event.image_url } 
              : require('../../assets/images/placeholder.png')} 
            style={styles.eventImage} 
            resizeMode="cover"
          />
        </View>
        
        {/* Title and Category */}
        <View style={styles.titleSection}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{event.category || 'Event'}</Text>
          </View>
        </View>
        
        {/* Info Cards */}
        <View style={styles.infoCardsContainer}>
          {/* Date & Time Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Feather name="calendar" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardLabel}>Date & Time</Text>
              <Text style={styles.infoCardValue}>
                {format(new Date(event.start_time), 'PPP')}
              </Text>
              <Text style={styles.infoCardSubValue}>
                {format(new Date(event.start_time), 'p')} - {event.end_time ? format(new Date(event.end_time), 'p') : 'TBD'}
              </Text>
            </View>
          </View>
          
          {/* Location Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Feather name="map-pin" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardLabel}>Location</Text>
              <Text style={styles.infoCardValue}>
                {event.location?.name || 'To be announced'}
              </Text>
              <Text style={styles.infoCardSubValue} numberOfLines={1}>
                {event.location?.address || 'Address details coming soon'}
              </Text>
            </View>
          </View>
          
          {/* Participants Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Feather name="users" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardLabel}>Participants</Text>
              <Text style={styles.infoCardValue}>
                {participantCount} {participantCount === 1 ? 'person' : 'people'} joined
              </Text>
              {event.max_participants > 0 && (
                <Text style={styles.infoCardSubValue}>
                  {Math.max(0, event.max_participants - participantCount)} spots left
                </Text>
              )}
            </View>
          </View>
          
          {/* Admission Fee Card (if applicable) */}
          {event.admission_fee && parseFloat(event.admission_fee) > 0 && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <MaterialCommunityIcons name="cash" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Admission</Text>
                <Text style={styles.infoCardValue}>${parseFloat(event.admission_fee).toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.descriptionText}>{event.description}</Text>
        </View>
        
        {/* Organizer */}
        <View style={styles.organizerContainer}>
          <Text style={styles.sectionTitle}>Organized by</Text>
          <View style={styles.organizerCard}>
            <Image 
              source={event.creator_avatar 
                ? { uri: event.creator_avatar } 
                : require('../../assets/images/placeholder-avatar.jpg')} 
              style={styles.organizerAvatar} 
            />
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName}>{event.creator_name || 'Anonymous'}</Text>
              <Text style={styles.organizerBio} numberOfLines={2}>{event.creator_bio || 'Event organizer'}</Text>
            </View>
          </View>
        </View>
        
        {/* Spacer for the fixed button */}
        <View style={{ height: 80 }} />
      </ScrollView>
      
      {/* Fixed Join/Leave Button */}
      <View style={styles.fixedButtonContainer}>
        <View style={styles.actionButtonContainer}>
          {participantsLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, isParticipant && styles.actionButtonLeave]}
              onPress={handleJoinLeaveEvent}
            >
              <Feather name={isParticipant ? "x-circle" : "check-circle"} size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>{isParticipant ? 'Leave Event' : 'Join Event'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButtonSecondary, isFavorite && styles.actionButtonFavorited]}
            onPress={toggleFavorite}
          >
            <Feather name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? COLORS.white : COLORS.primary} />
            <Text style={[styles.actionButtonSecondaryText, isFavorite && styles.actionButtonFavoritedText]}>
              {isFavorite ? 'Favorited' : 'Favorite'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButtonSecondary}
            onPress={handleShareEvent}
          >
            <Feather name="share-2" size={18} color={COLORS.primary} />
            <Text style={styles.actionButtonSecondaryText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.darkGray,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.darkGray,
    marginTop: 12,
    fontFamily: FONTS.medium,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: COLORS.lightGray,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  titleSection: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
  },
  categoryChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  infoCardsContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  infoCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoCardLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.darkGray,
  },
  infoCardSubValue: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    color: COLORS.darkGray,
  },
  organizerContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  organizerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  organizerBio: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 10,
  },
  actionButtonText: {
    color: COLORS.white,
    marginLeft: 8,
    fontFamily: FONTS.medium,
    fontSize: SIZES.font,
  },
  actionButtonLeave: {
    backgroundColor: COLORS.error,
  },
  actionButtonSecondary: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  actionButtonSecondaryText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    fontSize: SIZES.font,
  },
  actionButtonFavorited: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  actionButtonFavoritedText: {
    color: COLORS.white,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  leaveButton: {
    backgroundColor: COLORS.error,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.white,
  },
});

export default EventDetailScreen;
