import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Share,
  Dimensions
} from 'react-native';
import { Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import AppHeader from '../../components/layout/AppHeader';
import { useRoute } from '@react-navigation/native';
import { format, parseISO, formatDistance, addDays, differenceInSeconds } from 'date-fns';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { useChatButton } from '../../context/ChatButtonContext';
import ChatModal from '../../components/chat/ChatModal';
// Using Location API without MapboxGL due to dependency issues
import * as Location from 'expo-location';

// Mapbox token for static images API
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYm9yZWRiYXNoIiwiYSI6ImNtNng5NzA2NDByczIyanE4NjJtNWJ6ejYifQ.yxMTi_KA9gOE87hZpJyDmA';


// Helper function to generate static map image URL from Mapbox
const getStaticMapImageUrl = (currentLocation, startLocation, endLocation) => {
  try {
    const width = 600;
    const height = 400;
    const zoom = 14; // Slightly zoomed out for better context
    
    // Use the most relevant location for centering
    let centerLng = currentLocation?.longitude || startLocation?.longitude || endLocation?.longitude || 144.9631;
    let centerLat = currentLocation?.latitude || startLocation?.latitude || endLocation?.latitude || -37.8136;
    
    // Build markers array for Mapbox
    let markers = [];
    
    if (currentLocation && currentLocation.longitude && currentLocation.latitude) {
      markers.push(`pin-s+007AFF(${currentLocation.longitude},${currentLocation.latitude})`);
    }
    
    if (startLocation && startLocation.longitude && startLocation.latitude) {
      markers.push(`pin-s+4CD964(${startLocation.longitude},${startLocation.latitude})`);
    }
    
    if (endLocation && endLocation.longitude && endLocation.latitude) {
      markers.push(`pin-s+FF3B30(${endLocation.longitude},${endLocation.latitude})`);
    }
    
    // Build Mapbox URL with retina support
    let url;
    if (markers.length > 0) {
      url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${markers.join(',')}/${centerLng},${centerLat},${zoom}/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
    } else {
      // Show default location map while waiting for actual location
      url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${centerLng},${centerLat},${zoom}/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
    }
    
    return url;
    
  } catch (error) {
    console.error('Error generating map URL:', error);
    return null;
  }
};

// Helper function to calculate marker position on static map image
const getMarkerPosition = (location, refLocation1, refLocation2) => {
  // This is a simplified approach - in a real app, you would need to calculate
  // the pixel position based on the map bounds and projection
  const { width, height } = Dimensions.get('window');
  const mapWidth = width - 40; // Accounting for padding
  
  // For this simplified version, we'll just return a position
  // In a real implementation, you would calculate this based on 
  // the location's coordinates relative to the map bounds
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }]
  };
};

const BookingDetailScreen = ({ navigation }) => {
  const route = useRoute();
  const { bookingId } = route.params || {};
  const { profile } = useUser();
  const { hideChatButton, showChatButton } = useChatButton();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rescheduling state
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);
  const [newDate, setNewDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Cancellation state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Booking history state
  const [bookingHistory, setBookingHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Tracking history state
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [showTrackingHistory, setShowTrackingHistory] = useState(false);
  
  // Video sessions state
  const [videoSessions, setVideoSessions] = useState([]);
  const [showVideoSessions, setShowVideoSessions] = useState(false);
  
  // Chat modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  
  // Session tracking state
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionEndTime, setSessionEndTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapUrl, setMapUrl] = useState(null);
  
  // Hide chat button when this screen is mounted
  useEffect(() => {
    hideChatButton();
    
    // Show chat button again when unmounting
    return () => {
      showChatButton();
    };
  }, [hideChatButton, showChatButton]);
  
  // Fetch booking details and history
  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch booking details
        const { data, error } = await supabase
          .from('bookings_with_details')
          .select('*')
          .eq('booking_id', bookingId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Booking not found');

        setBooking(data);

        // Fetch booking history
        const { data: historyData, error: historyError } = await supabase
          .from('booking_history')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false });

        if (!historyError && historyData) {
          setBookingHistory(historyData);
        }
        
        // Fetch tracking history with specific columns
        const { data: trackingData, error: trackingError } = await supabase
          .from('tracking')
          .select(`
            id,
            booking_id,
            user_id,
            session_start_time,
            session_end_time,
            session_duration_seconds,
            start_latitude,
            start_longitude,
            start_address,
            end_latitude,
            end_longitude,
            end_address,
            path_coordinates,
            map_image_url,
            created_at
          `)
          .eq('booking_id', bookingId)
          .order('session_start_time', { ascending: false });
          
        if (!trackingError && trackingData) {
          setTrackingHistory(trackingData);
        }
        
        // Fetch video sessions
        const { data: videoData, error: videoError } = await supabase
          .from('booking_videos')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false });
          
        if (!videoError && videoData) {
          console.log(`Found ${videoData.length} video sessions for booking ${bookingId}`);
          setVideoSessions(videoData);
        } else if (videoError) {
          console.error('Error fetching video sessions:', videoError);
        }
      } catch (err) {
        console.error('Error fetching booking details:', err);
        setError(err.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  


  // Show reschedule modal
  const showRescheduleModal = () => {
    // Set default new date to current booking date or now + 1 day if date is in the past
    const bookingDate = parseISO(booking.scheduled_at);
    const defaultDate = new Date() > bookingDate ? addDays(new Date(), 1) : bookingDate;
    setNewDate(defaultDate);
    setRescheduleModalVisible(true);
  };

  // Format date for display
  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();

    return `${dayName}, ${monthName} ${day}`;
  };

  // Handle date selection with predefined options
  const handleSelectDate = (daysToAdd = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    setNewDate(date);
    setDateModalVisible(false);
  };

  // Handle time selection with predefined options
  const handleSelectTime = (timeStr) => {
    setSelectedTime(timeStr);
    setTimeModalVisible(false);

    // Update the newDate with the selected time
    const [hourStr, minuteStr] = timeStr.split(':');
    const isPM = timeStr.includes('PM');
    let hour = parseInt(hourStr);
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    const minute = parseInt(minuteStr.split(' ')[0]);

    const updatedDate = new Date(newDate);
    updatedDate.setHours(hour, minute, 0, 0);
    setNewDate(updatedDate);
  };

  // Submit reschedule request
  const submitReschedule = async () => {
    if (!booking || !profile?.id) return;

    // Validate the new date is in the future
    if (new Date() > newDate) {
      Alert.alert('Invalid Date', 'Please select a future date and time.');
      return;
    }

    setRescheduleLoading(true);

    try {
      // 1. Update the booking record
      const { error: updateError } = await supabase
        .from('service_bookings')
        .update({
          scheduled_at: newDate.toISOString(),
          status: 'rescheduled' // Adding a specific status for rescheduled bookings
        })
        .eq('id', booking.booking_id);

      if (updateError) throw updateError;

      // 2. Record the change in booking history
      const { error: historyError } = await supabase
        .from('booking_history')
        .insert({
          booking_id: booking.booking_id,
          user_id: profile.id,
          action_type: 'rescheduled',
          old_scheduled_at: booking.scheduled_at,
          new_scheduled_at: newDate.toISOString(),
          old_status: booking.booking_status,
          new_status: 'rescheduled',
          reason: rescheduleReason,
          notes: 'Rescheduled by user'
        });

      if (historyError) console.error('Error recording booking history:', historyError);

      // 3. Update local state
      setBooking(prev => ({
        ...prev,
        scheduled_at: newDate.toISOString(),
        booking_status: 'rescheduled'
      }));

      // 4. Fetch updated history
      const { data: historyData } = await supabase
        .from('booking_history')
        .select('*')
        .eq('booking_id', booking.booking_id)
        .order('created_at', { ascending: false });

      if (historyData) setBookingHistory(historyData);

      // 5. Close modal and show success message
      setRescheduleModalVisible(false);
      setRescheduleReason('');
      Alert.alert('Success', 'Your booking has been rescheduled successfully.');
    } catch (err) {
      console.error('Error rescheduling booking:', err);
      Alert.alert('Error', 'Failed to reschedule booking. Please try again.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Show cancel modal
  const showCancelModal = () => {
    setCancelModalVisible(true);
  };

  // Submit cancellation
  const submitCancellation = async () => {
    if (!booking || !profile?.id) return;

    setCancelLoading(true);

    try {
      // 1. Update the booking record
      const { error: updateError } = await supabase
        .from('service_bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.booking_id);

      if (updateError) throw updateError;

      // 2. Record the cancellation in booking history
      const { error: historyError } = await supabase
        .from('booking_history')
        .insert({
          booking_id: booking.booking_id,
          user_id: profile.id,
          action_type: 'cancelled',
          old_scheduled_at: booking.scheduled_at,
          new_scheduled_at: booking.scheduled_at, // Same as old for cancellation
          old_status: booking.booking_status,
          new_status: 'cancelled',
          reason: cancellationReason,
          notes: 'Cancelled by user'
        });

      if (historyError) console.error('Error recording cancellation history:', historyError);

      // 3. Update local state
      setBooking(prev => ({ ...prev, booking_status: 'cancelled' }));

      // 4. Fetch updated history
      const { data: historyData } = await supabase
        .from('booking_history')
        .select('*')
        .eq('booking_id', booking.booking_id)
        .order('created_at', { ascending: false });

      if (historyData) setBookingHistory(historyData);

      // 5. Close modal and show success message
      setCancelModalVisible(false);
      setCancellationReason('');
      Alert.alert('Success', 'Your booking has been cancelled successfully.');
    } catch (err) {
      console.error('Error cancelling booking:', err);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Share booking details
  const handleShare = async () => {
    if (!booking) return;

    const dateTime = formatBookingDateTime(booking.scheduled_at);
    // <-- FIX 5: Changed booking.provider_name to booking.user_full_name for consistency
    const shareMessage = `I have a booking for ${booking.service_title} with ${booking.user_full_name || 'a provider'} on ${dateTime.date} at ${dateTime.time}. ${booking.booking_notes ? `Note: ${booking.booking_notes}` : ''}`;

    try {
      await Share.share({
        message: shareMessage,
        title: 'My Booking Details'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share booking details');
    }
  };

  // Format booking date and time
  const formatBookingDateTime = (dateString) => {
    try {
      const date = parseISO(dateString);
      return {
        date: format(date, 'EEEE, MMMM d, yyyy'),
        time: format(date, 'h:mm a'),
        fromNow: formatDistance(date, new Date(), { addSuffix: true }),
        calendar: format(date, 'MMMM yyyy')
      };
    } catch (err) {
      return { date: 'Unknown', time: 'Unknown', fromNow: 'Unknown', calendar: 'Unknown' };
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed':
        return '#34C759'; // Green
      case 'pending':
        return '#FF9500'; // Orange
      case 'completed':
        return '#8E8E93'; // Gray
      case 'cancelled':
      case 'rescheduled':
        return '#FF3B30'; // Red
      default:
        return '#8E8E93'; // Gray
    }
  };

  // Calculate if booking can be cancelled (only future and non-cancelled/completed bookings)
  const canCancel = booking &&
    booking.booking_status?.toLowerCase() !== 'cancelled' &&
    booking.booking_status?.toLowerCase() !== 'completed' &&
    new Date(booking.scheduled_at) > new Date();

  // Calculate if booking can be rescheduled (same conditions as cancel)
  const canReschedule = canCancel;

  // Format the date if booking exists
  const formattedDateTime = booking ? formatBookingDateTime(booking.scheduled_at) : null;

  // Get status color for the booking
  const statusColor = booking ? getStatusColor(booking.booking_status) : '#8E8E93';
  
  // Get current location using Expo Location API
  const getCurrentLocation = async () => {
    try {
      setTrackingLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setTrackingLoading(false);
        Alert.alert('Permission Denied', 'Location permission is required for tracking sessions.');
        throw new Error('Location permission not granted');
      }
      
      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const { latitude, longitude } = position.coords;
      const location = { latitude, longitude };
      
      setCurrentLocation(location);
      setTrackingLoading(false);
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      setTrackingLoading(false);
      Alert.alert('Location Error', 'Unable to get your current location. Please check your device settings.');
      throw error;
    }
  };

  // Reverse geocode to get address from coordinates - simplified version without Mapbox
  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      // Using a hardcoded Mapbox token since MapboxGL is temporarily disabled
      const mapboxToken = 'pk.eyJ1IjoiYm9yZWRiYXNoIiwiYSI6ImNtNng5NzA2NDByczIyanE4NjJtNWJ6ejYifQ.yxMTi_KA9gOE87hZpJyDmA';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Address lookup failed';
    }
  };

  // Start tracking session
  const startSession = async () => {
    try {
      const location = await getCurrentLocation();
      const address = await getAddressFromCoordinates(location.latitude, location.longitude);
      
      const startTime = new Date();
      setSessionStartTime(startTime);
      setStartLocation(location);
      setStartAddress(address);
      setSessionStarted(true);
      setPathCoordinates([{longitude: location.longitude, latitude: location.latitude}]);
      
      // Start the duration counter with the start time
      startDurationCounter(startTime);
      
      // Note: Map centering removed as we're using simplified UI without Mapbox
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start tracking session. Please try again.');
    }
  };
  
  // Add duration counter interval
  const intervalRef = useRef(null);
  
  const startDurationCounter = useCallback((startTime) => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Update immediately, then every second
    const updateDuration = () => {
      const now = new Date();
      const durationSeconds = differenceInSeconds(now, startTime);
      setSessionDuration(durationSeconds);
    };
    
    updateDuration(); // Update immediately
    intervalRef.current = setInterval(updateDuration, 1000);
  }, []);
  
  const stopDurationCounter = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      stopDurationCounter();
    };
  }, []);

  // Auto-start session when modal opens
  useEffect(() => {
    if (trackingModalVisible && !sessionStarted && !sessionEnded) {
      // Generate a default map URL immediately
      if (!mapUrl) {
        const defaultUrl = getStaticMapImageUrl(null, null, null);
        setMapUrl(defaultUrl);
      }
      startSession();
    }
  }, [trackingModalVisible]);

  // Update map URL whenever locations change
  useEffect(() => {
    const url = getStaticMapImageUrl(currentLocation, startLocation, endLocation);
    setMapUrl(url);
  }, [currentLocation, startLocation, endLocation]);

  // End tracking session
  const endSession = async () => {
    try {
      
      const location = await getCurrentLocation();
      const address = await getAddressFromCoordinates(location.latitude, location.longitude);
      
      const endTime = new Date();
      setSessionEndTime(endTime);
      setEndLocation(location);
      setEndAddress(address);
      setSessionEnded(true);
      
      // Update path coordinates with end location
      setPathCoordinates(prev => [...prev, {longitude: location.longitude, latitude: location.latitude}]);
      
      // Calculate final session duration and stop the counter
      const durationSeconds = differenceInSeconds(endTime, sessionStartTime);
      setSessionDuration(durationSeconds);
      stopDurationCounter();
      
      // Save session data to Supabase
      const savedSession = await saveSessionData(durationSeconds, location, address);
      
      // Refresh tracking history if save was successful
      if (savedSession) {
        setTrackingHistory(prev => [savedSession, ...prev]);
      }
    } catch (error) {
      console.error('Error ending session:', error);
      Alert.alert('Error', 'Failed to end tracking session. Please try again.');
    }
  };

  // Upload map image to Supabase storage
  const uploadMapImageToSupabase = async (mapboxUrl) => {
    try {
      // Fetch the image from Mapbox
      const response = await fetch(mapboxUrl);
      const blob = await response.blob();
      
      // Generate a unique filename
      const timestamp = Date.now();
      const fileName = `${profile.id}/${booking.booking_id}_${timestamp}.png`;
      
      // Upload to trackingmaps bucket
      const { data, error } = await supabase.storage
        .from('trackingmaps')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (error) {
        console.error('Error uploading map image:', error);
        // Fall back to using Mapbox URL directly if upload fails
        return mapboxUrl;
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('trackingmaps')
        .getPublicUrl(fileName);
      
      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error('Could not get public URL for map image');
        return mapboxUrl;
      }
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadMapImageToSupabase:', error);
      // Fall back to using Mapbox URL directly if anything fails
      return mapboxUrl;
    }
  };

  // Save session data to Supabase
  const saveSessionData = async (durationSeconds, endLoc, endAddr) => {
    if (!booking || !profile?.id || !startLocation) return;
    
    try {
      // Upload map image to Supabase storage
      let mapImageUrl = null;
      if (mapUrl) {
        mapImageUrl = await uploadMapImageToSupabase(mapUrl);
      }
      
      // Save tracking data without map_image_url for now
      const trackingData = {
        booking_id: booking.booking_id,
        user_id: profile.id,
        session_start_time: sessionStartTime.toISOString(),
        session_end_time: new Date().toISOString(),
        session_duration_seconds: durationSeconds,
        start_latitude: startLocation.latitude,
        start_longitude: startLocation.longitude,
        start_address: startAddress,
        end_latitude: endLoc.latitude,
        end_longitude: endLoc.longitude,
        end_address: endAddr,
        path_coordinates: JSON.stringify(pathCoordinates)
      };
      
      // Add map_image_url if it exists
      if (mapImageUrl) {
        trackingData.map_image_url = mapImageUrl;
      }
      
      const { data, error } = await supabase
        .from('tracking')
        .insert(trackingData)
        .select(`
          id,
          booking_id,
          user_id,
          session_start_time,
          session_end_time,
          session_duration_seconds,
          start_latitude,
          start_longitude,
          start_address,
          end_latitude,
          end_longitude,
          end_address,
          path_coordinates,
          map_image_url,
          created_at
        `);

      if (error) throw error;
      
      Alert.alert('Success', 'Session tracking data saved successfully.');
      
      // Return the saved tracking record
      return data?.[0];
    } catch (err) {
      console.error('Error saving tracking data:', err);
      Alert.alert('Error', 'Failed to save tracking data. Please try again.');
      return null;
    }
  };

  // Reset tracking session
  const resetSession = () => {
    stopDurationCounter(); // Make sure to stop the counter
    setSessionStarted(false);
    setSessionEnded(false);
    setSessionStartTime(null);
    setSessionEndTime(null);
    setSessionDuration(0); // Reset to 0 instead of null
    setStartLocation(null);
    setEndLocation(null);
    setStartAddress('');
    setEndAddress('');
    setPathCoordinates([]);
    setMapUrl(null); // Reset map URL
  };

  // Format duration in hours, minutes, seconds
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Booking Details"
        navigation={navigation}
        canGoBack={true}
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading booking details...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : booking ? (
        <>
          {/* Booking Header with Status */}
          <View style={styles.headerContainer}>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {booking.booking_status?.charAt(0).toUpperCase() + booking.booking_status?.slice(1)}
              </Text>
            </View>
            <Text style={styles.bookingTitle}>{booking.service_title}</Text>

            <View style={styles.bookingMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={16} color="#666" style={styles.metaIcon} />
                <Text style={styles.metaText}>{formattedDateTime.date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={16} color="#666" style={styles.metaIcon} />
                <Text style={styles.metaText}>{formattedDateTime.time}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color={COLORS.primary} />
              <Text style={styles.headerActionButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => {
                // Open chat modal with provider
                if (booking.user_id) {
                  setChatRecipient({
                    id: booking.user_id,
                    name: booking.user_full_name || 'Provider'
                  });
                  setShowChatModal(true);
                } else {
                  Alert.alert('Unable to Message', 'Provider information not available');
                }
              }}
            >
              <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary} />
              <Text style={styles.headerActionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* Service Image (if available) */}
          {booking.service_media_urls && booking.service_media_urls.length > 0 && (
            <Image
              source={booking.service_media_urls[0]}
              style={styles.serviceImage}
              contentFit="cover"
              transition={200}
            />
          )}

          {/* Booking Information Cards */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Booking Details</Text>

            {/* Service Information */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="info-outline" size={22} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Service Information</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Service Type:</Text>
                <Text style={styles.cardValue}>{booking.service_category || 'Not specified'}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Format:</Text>
                <Text style={styles.cardValue}>{booking.service_format || 'In Person'}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Provider:</Text>
                <Text style={styles.cardValue}>{booking.user_full_name || 'Independent Provider'}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Duration:</Text>
                <Text style={styles.cardValue}>1 hour (estimated)</Text>
              </View>
            </View>

            {/* Payment Information */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="payment" size={22} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Payment Details</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Total Price:</Text>
                <Text style={styles.cardValue}>${parseFloat(booking.total_price).toFixed(2)}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>NDIS Covered:</Text>
                <Text style={styles.cardValue}>${parseFloat(booking.ndis_covered_amount).toFixed(2)}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Gap Payment:</Text>
                <Text style={styles.cardValue}>${parseFloat(booking.gap_payment).toFixed(2)}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Payment Status:</Text>
                <Text style={styles.cardValue}>Pending</Text>
              </View>
            </View>

            {/* Notes */}
            {booking.booking_notes && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="note" size={22} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Notes</Text>
                </View>
                <Text style={styles.notesText}>{booking.booking_notes}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <View style={styles.actionButtons}>
              {canReschedule && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.rescheduleButton]}
                  onPress={showRescheduleModal}
                >
                  <MaterialCommunityIcons name="calendar-clock" size={20} color="#fff" />
                  <Text numberOfLines={1} style={styles.actionButtonText}>Reschedule</Text>
                </TouchableOpacity>
              )}

              {canCancel && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={showCancelModal}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#fff" />
                  <Text numberOfLines={1} style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.actionButton, styles.historyButton]}
              onPress={() => setShowHistory(!showHistory)}
            >
              <View style={styles.historyButtonContent}>
                <MaterialIcons name="history" size={22} color="#fff" />
                <Text numberOfLines={1} style={styles.actionButtonText}>
                  {showHistory ? 'Hide History' : 'View History'}
                </Text>
                <Ionicons 
                  name={showHistory ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#fff" 
                  style={styles.historyChevron}
                />
              </View>
            </TouchableOpacity>
            
            {/* Tracking History Button - Only show if there are tracking records */}
            {trackingHistory.length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.trackingHistoryButton]}
                onPress={() => setShowTrackingHistory(!showTrackingHistory)}
              >
                <View style={styles.historyButtonContent}>
                  <FontAwesome5 name="route" size={20} color="#fff" />
                  <Text numberOfLines={1} style={styles.actionButtonText}>
                    {showTrackingHistory ? 'Hide Tracking' : 'View Tracking'}
                  </Text>
                  <Ionicons 
                    name={showTrackingHistory ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#fff" 
                    style={styles.historyChevron}
                  />
                </View>
              </TouchableOpacity>
            )}
            
            {/* Video Sessions Button - Only show if there are video sessions */}
            {videoSessions.length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.videoSessionsButton]}
                onPress={() => setShowVideoSessions(!showVideoSessions)}
              >
                <View style={styles.historyButtonContent}>
                  <MaterialIcons name="videocam" size={20} color="#fff" />
                  <Text numberOfLines={1} style={styles.actionButtonText}>
                    {showVideoSessions ? 'Hide Videos' : 'View Video Sessions'}
                  </Text>
                  <Ionicons 
                    name={showVideoSessions ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#fff" 
                    style={styles.historyChevron}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF9500" />
          <Text style={styles.errorTitle}>Booking Not Found</Text>
          <Text style={styles.errorMessage}>We couldn't find this booking in our records.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Booking History Section (conditionally shown) */}
      {showHistory && booking && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Booking History</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {bookingHistory.length > 0 ? (
            <ScrollView style={styles.historyList}>
              {bookingHistory.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <Text style={styles.historyItemAction}>
                      {item.action_type.charAt(0).toUpperCase() + item.action_type.slice(1)}
                    </Text>
                    <Text style={styles.historyItemDate}>
                      {format(parseISO(item.created_at), 'PPp')}
                    </Text>
                  </View>

                  {item.action_type === 'rescheduled' && (
                    <View style={styles.historyItemDetails}>
                      <Text style={styles.historyItemLabel}>Original Date:</Text>
                      <Text style={styles.historyItemValue}>
                        {format(parseISO(item.old_scheduled_at), 'PPp')}
                      </Text>
                      <Text style={styles.historyItemLabel}>New Date:</Text>
                      <Text style={styles.historyItemValue}>
                        {format(parseISO(item.new_scheduled_at), 'PPp')}
                      </Text>
                      {item.reason && (
                        <>
                          <Text style={styles.historyItemLabel}>Reason:</Text>
                          <Text style={styles.historyItemValue}>{item.reason}</Text>
                        </>
                      )}
                    </View>
                  )}

                  {item.action_type === 'cancelled' && item.reason && (
                    <View style={styles.historyItemDetails}>
                      <Text style={styles.historyItemLabel}>Reason:</Text>
                      <Text style={styles.historyItemValue}>{item.reason}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyHistoryContainer}>
              <MaterialIcons name="history" size={40} color="#ddd" />
              <Text style={styles.emptyHistoryText}>No history available</Text>
            </View>
          )}
        </View>
      )}

      {/* Tracking History Section (conditionally shown) */}
      {showTrackingHistory && booking && (
        <View style={styles.trackingHistoryContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Tracking History</Text>
            <TouchableOpacity onPress={() => setShowTrackingHistory(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {trackingHistory.length > 0 ? (
            <ScrollView style={styles.trackingHistoryList}>
              {trackingHistory.map((session) => (
                <View key={session.id} style={styles.trackingSessionCard}>
                  <View style={styles.trackingSessionHeader}>
                    <View style={styles.trackingSessionInfo}>
                      <Text style={styles.trackingSessionDate}>
                        {format(parseISO(session.session_start_time), 'PPP')}
                      </Text>
                      <Text style={styles.trackingSessionTime}>
                        {format(parseISO(session.session_start_time), 'p')} - {format(parseISO(session.session_end_time), 'p')}
                      </Text>
                    </View>
                    <View style={styles.trackingDurationBadge}>
                      <Ionicons name="time-outline" size={16} color="#fff" />
                      <Text style={styles.trackingDurationText}>
                        {formatDuration(session.session_duration_seconds)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Map Image */}
                  {(() => {
                    // Try to get map URL from map_image_url or extract from notes
                    let mapUrl = session.map_image_url;
                    if (!mapUrl && session.notes && session.notes.includes('Map URL: ')) {
                      const match = session.notes.match(/Map URL: (https?:\/\/[^\s]+)/);
                      if (match) {
                        mapUrl = match[1];
                      }
                    }
                    
                    return mapUrl ? (
                      <View style={styles.trackingMapContainer}>
                        <Image
                          source={{ uri: mapUrl }}
                          style={styles.trackingMapImage}
                          contentFit="cover"
                          transition={200}
                        />
                      </View>
                    ) : null;
                  })()}
                  
                  {/* Location Details */}
                  <View style={styles.trackingLocationDetails}>
                    <View style={styles.trackingLocationRow}>
                      <View style={styles.trackingLocationIcon}>
                        <FontAwesome5 name="map-marker-alt" size={14} color="#4CD964" />
                      </View>
                      <View style={styles.trackingLocationInfo}>
                        <Text style={styles.trackingLocationLabel}>Start Location</Text>
                        <Text style={styles.trackingLocationAddress} numberOfLines={2}>
                          {session.start_address || 'Location not available'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.trackingLocationRow}>
                      <View style={styles.trackingLocationIcon}>
                        <FontAwesome5 name="flag-checkered" size={14} color="#FF3B30" />
                      </View>
                      <View style={styles.trackingLocationInfo}>
                        <Text style={styles.trackingLocationLabel}>End Location</Text>
                        <Text style={styles.trackingLocationAddress} numberOfLines={2}>
                          {session.end_address || 'Location not available'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyHistoryContainer}>
              <FontAwesome5 name="route" size={40} color="#ddd" />
              <Text style={styles.emptyHistoryText}>No tracking sessions yet</Text>
            </View>
          )}
        </View>
      )}

      {/* Video Sessions Section (conditionally shown) */}
      {showVideoSessions && booking && (
        <View style={styles.videoSessionsContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>
              Video Sessions {videoSessions.length > 0 && `(${videoSessions.length})`}
            </Text>
            <TouchableOpacity onPress={() => setShowVideoSessions(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {videoSessions.length > 0 ? (
            <ScrollView 
              style={styles.videoSessionsList}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {console.log('Rendering video sessions:', videoSessions.length)}
              {videoSessions.map((session, index) => (
                <View key={`${session.id}-${index}`} style={styles.videoSessionCard}>
                  <View style={styles.videoSessionHeader}>
                    <View style={styles.videoSessionInfo}>
                      <Text style={[styles.videoSessionDate, { marginBottom: 2 }]}>
                        Session {videoSessions.length - index}
                      </Text>
                      <Text style={styles.videoSessionDate}>
                        {format(parseISO(session.session_start_time || session.created_at), 'PPP')}
                      </Text>
                      <Text style={styles.videoSessionTime}>
                        {session.session_start_time && session.session_end_time
                          ? `${format(parseISO(session.session_start_time), 'p')} - ${format(parseISO(session.session_end_time), 'p')}`
                          : format(parseISO(session.created_at), 'p')}
                      </Text>
                    </View>
                    <View style={styles.videoDurationBadge}>
                      <MaterialIcons name="timer" size={16} color="#fff" />
                      <Text style={styles.videoDurationText}>
                        {formatDuration(session.duration_seconds || 0)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Video Info */}
                  <View style={styles.videoInfoSection}>
                    <View style={styles.videoInfoRow}>
                      <MaterialIcons name="videocam" size={20} color="#1E90FF" />
                      <Text style={styles.videoInfoText}>Video Session Recorded</Text>
                    </View>
                    <View style={styles.videoInfoRow}>
                      <MaterialIcons name="photo-camera" size={20} color="#FF9500" />
                      <Text style={styles.videoInfoText}>
                        {session.screenshot_count || 0} proof-of-service images captured
                      </Text>
                    </View>
                  </View>
                  
                  {/* Screenshot Film Strip */}
                  {session.screenshot_count > 0 && session.screenshots_data && (
                    <View style={styles.screenshotSection}>
                      <Text style={styles.screenshotTitle}>Session Captures</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.screenshotStrip}
                      >
                        {/* Display actual screenshots from JSON data */}
                        {(() => {
                          const screenshotsArray = typeof session.screenshots_data === 'string' 
                            ? JSON.parse(session.screenshots_data) 
                            : session.screenshots_data;
                          return screenshotsArray.slice(0, 5).map((screenshot, index) => (
                            <View key={index} style={styles.screenshotContainer}>
                              {screenshot.thumbnail_url && !screenshot.error ? (
                                <Image
                                  source={{ uri: screenshot.thumbnail_url }}
                                  style={styles.screenshotImage}
                                  contentFit="cover"
                                  transition={200}
                                />
                              ) : (
                                <View style={styles.screenshotPlaceholder}>
                                  <MaterialIcons name="image" size={30} color="#ddd" />
                                  <Text style={styles.screenshotIndex}>{index + 1}</Text>
                                </View>
                              )}
                              <View style={styles.screenshotTimestamp}>
                                <Text style={styles.screenshotTime}>
                                  {screenshot.relative_time || format(parseISO(screenshot.timestamp), 'HH:mm:ss')}
                                </Text>
                              </View>
                            </View>
                          ));
                        })()}
                        {session.screenshot_count > 5 && (
                          <View style={styles.moreScreenshotsContainer}>
                            <Text style={styles.moreScreenshotsText}>
                              +{session.screenshot_count - 5} more
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                  
                  {/* Session Summary */}
                  <View style={styles.sessionSummary}>
                    <Text style={styles.sessionSummaryTitle}>Session Summary</Text>
                    <View style={styles.sessionSummaryContent}>
                      <View style={styles.videoSummaryItem}>
                        <MaterialIcons name="photo" size={20} color="#4CD964" />
                        <Text style={styles.videoSummaryText}>{session.screenshot_count} screenshots saved</Text>
                      </View>
                      <View style={styles.videoSummaryItem}>
                        <MaterialIcons name="shield-check" size={20} color="#1E90FF" />
                        <Text style={styles.videoSummaryText}>Proof of service captured</Text>
                      </View>
                      <View style={styles.videoSummaryItem}>
                        <Ionicons name="information-circle" size={20} color="#FF9500" />
                        <Text style={[styles.videoSummaryText, { fontSize: 13, fontStyle: 'italic' }]}>No video file stored for privacy</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyHistoryContainer}>
              <MaterialIcons name="videocam-off" size={40} color="#ddd" />
              <Text style={styles.emptyHistoryText}>No video sessions yet</Text>
            </View>
          )}
        </View>
      )}

      {/* Start Booking and Video Buttons - Only show for confirmed bookings that are not completed or cancelled */}
      {booking && ['confirmed', 'pending'].includes(booking.booking_status?.toLowerCase()) && (
        <View style={styles.startBookingButtonContainer}>
          <TouchableOpacity 
            style={styles.startBookingButton}
            onPress={() => {
              setTrackingModalVisible(true);
            }}
          >
            <FontAwesome5 name="map-marker-alt" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.startBookingButtonText}>Start Booking</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.startBookingButton, styles.videoButton]}
            onPress={() => {
              navigation.navigate('VideoScreen', { bookingId: booking.booking_id });
            }}
          >
            <Ionicons name="videocam" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.startBookingButtonText}>Start Video</Text>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>

      {/* --- Modals are placed outside the ScrollView but inside the main View --- */}

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Booking</Text>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Please select a new date and time for your booking
            </Text>

            {/* Date Selection */}
            <View style={styles.dateSelectionRow}>
              <Text style={styles.dateLabel}>New Date:</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setDateModalVisible(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {formatDate(newDate)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Time Selection */}
            <View style={styles.dateSelectionRow}>
              <Text style={styles.dateLabel}>New Time:</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setTimeModalVisible(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {selectedTime || format(newDate, 'h:mm a')}
                </Text>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Reason Input */}
            <Text style={styles.dateLabel}>Reason for rescheduling (optional):</Text>
            <TextInput
              style={styles.reasonInput}
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              placeholder="Optional reason for rescheduling..."
              multiline={true}
              numberOfLines={3}
            />

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setRescheduleModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={submitReschedule}
                disabled={rescheduleLoading}
              >
                {rescheduleLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Selection Modal */}
      <Modal
        visible={isDateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(0)}>
              <Text style={styles.modalOptionText}>{formatDate(new Date())}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(1)}>
              <Text style={styles.modalOptionText}>{formatDate(addDays(new Date(), 1))}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(2)}>
              <Text style={styles.modalOptionText}>{formatDate(addDays(new Date(), 2))}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(3)}>
              <Text style={styles.modalOptionText}>{formatDate(addDays(new Date(), 3))}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(7)}>
              <Text style={styles.modalOptionText}>{formatDate(addDays(new Date(), 7))}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => setDateModalVisible(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Selection Modal */}
      <Modal
        visible={isTimeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('9:00 AM')}>
              <Text style={styles.modalOptionText}>9:00 AM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('10:00 AM')}>
              <Text style={styles.modalOptionText}>10:00 AM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('11:00 AM')}>
              <Text style={styles.modalOptionText}>11:00 AM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('1:00 PM')}>
              <Text style={styles.modalOptionText}>1:00 PM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('2:00 PM')}>
              <Text style={styles.modalOptionText}>2:00 PM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('3:00 PM')}>
              <Text style={styles.modalOptionText}>3:00 PM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => setTimeModalVisible(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </Text>

            {/* Reason Input */}
            <Text style={styles.dateLabel}>Reason for cancellation (optional):</Text>
            <TextInput
              style={styles.reasonInput}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              placeholder="Optional reason for cancellation..."
              multiline={true}
              numberOfLines={3}
            />

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Keep Booking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, { backgroundColor: '#FF3B30' }]}
                onPress={submitCancellation}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tracking Modal with Map */}
      <Modal
        visible={trackingModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          if (sessionStarted && !sessionEnded) {
            Alert.alert(
              'Session in Progress',
              'Do you want to end the current tracking session?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'End Session', 
                  onPress: async () => {
                    await endSession();
                  } 
                },
              ]
            );
          } else {
            setTrackingModalVisible(false);
            if (sessionEnded) {
              resetSession();
            }
          }
        }}
      >
        <View style={styles.trackingModalContainer}>
          {/* Use AppHeader for consistency */}
          <AppHeader 
            title={!sessionStarted ? 'Start Tracking' : 
              (!sessionEnded ? 'Tracking in Progress' : 'Tracking Complete')}
            onBackPressOverride={() => {
              if (sessionStarted && !sessionEnded) {
                Alert.alert(
                  'Session in Progress',
                  'Do you want to end the current tracking session?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'End Session', 
                      onPress: async () => {
                        await endSession();
                        setTrackingModalVisible(false);
                        resetSession();
                      } 
                    },
                  ],
                );
              } else {
                setTrackingModalVisible(false);
                if (sessionEnded) {
                  resetSession();
                }
              }
            }}
          />
          
          <ScrollView 
            style={styles.trackingScrollView} 
            contentContainerStyle={styles.trackingScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.mapContainer}>
            {mapError ? (
              <View style={styles.loadingMapContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#999" />
                <Text style={styles.loadingMapText}>Unable to load map</Text>
              </View>
            ) : mapUrl ? (
              <RNImage 
                source={{ uri: mapUrl }}
                style={styles.staticMapImage}
                resizeMode="cover"
                onError={(e) => {
                  console.log('Map load error:', e.nativeEvent);
                  setMapError(true);
                }}
                onLoad={() => {
                  setMapError(false);
                }}
              />
            ) : (
              <View style={styles.loadingMapContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingMapText}>Loading map...</Text>
              </View>
            )}
            
            {startLocation && (
              <View style={[styles.mapMarker, styles.startMarker, getMarkerPosition(startLocation, currentLocation, endLocation)]}>
                <Ionicons name="location" size={18} color="#fff" />
              </View>
            )}
            
            {endLocation && (
              <View style={[styles.mapMarker, styles.endMarker, getMarkerPosition(endLocation, startLocation, currentLocation)]}>
                <Ionicons name="flag" size={18} color="#fff" />
              </View>
            )}
            
            {currentLocation && (
              <View style={[styles.mapMarker, styles.currentMarker, getMarkerPosition(currentLocation, startLocation, endLocation)]}>
                <View style={styles.currentLocationDot} />
              </View>
            )}
            
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, 
                !sessionStarted ? styles.readyBadge : 
                  (!sessionEnded ? styles.activeBadge : styles.completedBadge)
              ]}>
                <Text style={[styles.statusBadgeText, !sessionStarted && {color: '#333'}]}>
                  {!sessionStarted ? 'Ready' : 
                    (!sessionEnded ? 'Active' : 'Completed')}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Compact Info Panel - No scrolling needed */}
          <View style={styles.compactInfoPanel}>
            {/* Progress Timeline */}
            <View style={styles.progressContainer}>
              <View style={styles.progressItem}>
                <View style={[styles.progressDot, styles.progressActive]} />
                <Text style={styles.progressLabel}>Ready</Text>
              </View>
              
              <View style={styles.progressLine} />
              
              <View style={styles.progressItem}>
                <View style={[styles.progressDot, sessionStarted ? styles.progressActive : styles.progressInactive]} />
                <Text style={styles.progressLabel}>Started</Text>
              </View>
              
              <View style={styles.progressLine} />
              
              <View style={styles.progressItem}>
                <View style={[styles.progressDot, sessionEnded ? styles.progressActive : styles.progressInactive]} />
                <Text style={styles.progressLabel}>Completed</Text>
              </View>
            </View>
            
            {/* Location Information - Compact */}
            <View style={styles.locationInfo}>
              {sessionStarted && (
                <>
                  <View style={styles.locationRow}>
                    <FontAwesome5 name="map-marker-alt" size={18} color={COLORS.primary} />
                    <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                      <Text style={{fontWeight: '600'}}>Start: </Text>
                      {startAddress || 'Fetching address...'}
                    </Text>
                  </View>
                  
                  {sessionEnded && (
                    <View style={styles.locationRow}>
                      <FontAwesome5 name="flag-checkered" size={18} color={COLORS.primary} />
                      <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                        <Text style={{fontWeight: '600'}}>End: </Text>
                        {endAddress || 'Fetching address...'}
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              {!sessionStarted && (
                <View style={styles.locationRow}>
                  <FontAwesome5 name="info-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.locationText}>Ready to start tracking your session</Text>
                </View>
              )}
            </View>
            
            {/* Duration - Compact - Show live counter when session is active */}
            {sessionStarted && (
              <View style={styles.durationInfo}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.durationValue}>{formatDuration(sessionDuration || 0)}</Text>
              </View>
            )}
          </View>
          </ScrollView>
          
          {/* Action Button - Fixed at bottom */}
          <View style={styles.trackingActionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, 
                sessionStarted ? 
                  (sessionEnded ? styles.doneButton : styles.endButton) : 
                  styles.startButton
              ]}
              onPress={async () => {
                if (!sessionStarted) {
                  await startSession();
                } else if (!sessionEnded) {
                  await endSession();
                } else {
                  setTrackingModalVisible(false);
                  resetSession();
                }
              }}
              disabled={trackingLoading}
            >
              {trackingLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {!sessionStarted ? 'Start Session' : 
                    (!sessionEnded ? 'End Session' : 'Done')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Chat Modal */}
      {chatRecipient && (
        <ChatModal
          visible={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setChatRecipient(null);
          }}
          recipientId={chatRecipient.id}
          recipientName={chatRecipient.name}
        />
      )}
    </View> // <-- Changed closing tag from </ScrollView> to </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Modern tracking modal styles
  trackingModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  trackingScrollView: {
    flex: 1,
  },
  trackingScrollContent: {
    paddingBottom: 100, // Add padding to ensure button isn't clipped
  },
  // Map styles
  mapContainer: {
    width: '100%',
    height: 200, // Further reduced for more compact view
    position: 'relative',
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapViewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  staticMapContainer: {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  staticMapImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  mapMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  startMarker: {
    backgroundColor: '#00aa00',
  },
  endMarker: {
    backgroundColor: '#aa0000',
  },
  currentMarker: {
    backgroundColor: 'transparent',
  },
  currentLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0080ff',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  // Status badge styles
  statusBadgeContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  readyBadge: {
    backgroundColor: '#fff',
  },
  activeBadge: {
    backgroundColor: COLORS.primary,
  },
  completedBadge: {
    backgroundColor: '#4CD964',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Card styles
  trackingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trackingCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10, // Further reduced
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8, // Reduced to bring elements closer
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressItem: {
    alignItems: 'center',
    width: 80,
  },
  progressDot: {
    width: 16, // Reduced from 20px
    height: 16, // Reduced from 20px
    borderRadius: 8,
    marginBottom: 6, // Reduced from 8px
    borderWidth: 2, // Reduced from 3px
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressActive: {
    backgroundColor: COLORS.primary,
  },
  progressInactive: {
    backgroundColor: '#e0e0e0',
  },
  progressLabel: {
    fontSize: 15, // Increased for better readability
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  progressTime: {
    fontSize: 12,
    color: '#666',
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#e0e0e0',
    marginHorizontal: -10,
    zIndex: -1,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
  },
  durationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  durationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  durationCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  durationValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  // Compact info panel styles
  compactInfoPanel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0, // Remove bottom padding to bring content up
    flex: 1,
    backgroundColor: '#fafafa',
  },
  locationInfo: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Reduced from 12px
  },
  locationText: {
    fontSize: 16, // Increased for better readability
    color: '#333',
    marginLeft: 10,
    flex: 1,
    lineHeight: 22,
  },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 0, // Remove bottom margin
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  durationValue: {
    fontSize: 28, // Large font for timer
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  // Action button styles
  actionButtonContainer: {
    padding: 12, // Reduced from 16px
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  trackingActionButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 30, // Extra padding for home indicator
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  contentContainer: {
    paddingBottom: 180, // Increased to accommodate both Start Booking and Video buttons
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  headerActionButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bookingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  bookingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  serviceImage: {
    width: '100%',
    height: 200,
    marginBottom: 16,
  },
  infoSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  cardValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center', // Center the history button
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  rescheduleButton: {
    backgroundColor: '#FF9500',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  historyButton: {
    backgroundColor: '#5856D6', // Modern purple color
    width: '100%',
    marginHorizontal: 0,
    marginTop: 12,
  },
  historyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  historyChevron: {
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
    flexShrink: 1,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  // Map styles
  mapContainer: {
    width: '100%',
    height: 350,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapViewContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  loadingMapText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  locationStatusContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  readyIndicator: {
    backgroundColor: '#007AFF',
  },
  activeIndicator: {
    backgroundColor: '#4CD964',
  },
  completedIndicator: {
    backgroundColor: '#FF9500',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
  },
  startLocationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CD964',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  endLocationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  locationInfoOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  locationPointContainer: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  locationPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationPointLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  locationPointAddress: {
    fontSize: 12,
    color: '#666',
    paddingLeft: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    width: '100%',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  dateSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  reasonInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  modalCancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  modalSubmitButton: {
    backgroundColor: COLORS.primary,
  },
  modalSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Start Booking Button Styles
  startBookingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  startBookingButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  videoButton: {
    backgroundColor: '#007AFF', // iOS blue for video
    marginBottom: 0,
  },
  startBookingButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  
  // Tracking Modal Styles
  mapContainer: {
    height: Dimensions.get('window').height * 0.4,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  map: {
    flex: 1,
  },
  loadingMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  simplifiedMapContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 16,
  },
  locationInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationCoordinates: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    lineHeight: 24,
  },
  locationStatusContainer: {
    marginBottom: 16,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  readyIndicator: {
    backgroundColor: '#007AFF',
  },
  activeIndicator: {
    backgroundColor: '#4CD964',
  },
  completedIndicator: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  locationPointContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationPointLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  locationPointCoords: {
    fontSize: 14,
    color: '#666',
    paddingLeft: 24,
  },
  currentMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
  },
  startMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CD964',
    borderWidth: 3,
    borderColor: '#fff',
  },
  endMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    borderWidth: 3,
    borderColor: '#fff',
  },
  sessionInfoContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  durationText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionButton: {
    marginTop: 0, // Remove top margin to eliminate black space
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  startButton: {
    backgroundColor: '#4CD964',
  },
  endButton: {
    backgroundColor: '#FF3B30',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 20, // Increased for better readability
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // History styles
  historyContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  historyList: {
    maxHeight: 240,
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemAction: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  historyItemDate: {
    fontSize: 13,
    color: '#777',
  },
  historyItemDetails: {
    marginTop: 6,
  },
  historyItemLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  historyItemValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  // Tracking History Button
  trackingHistoryButton: {
    backgroundColor: '#007AFF', // iOS blue color
    width: '100%',
    marginHorizontal: 0,
    marginTop: 12,
  },
  // Video Sessions Button
  videoSessionsButton: {
    backgroundColor: '#FF2D55', // iOS red color
    width: '100%',
    marginHorizontal: 0,
    marginTop: 12,
  },
  // Tracking History Container
  trackingHistoryContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingHistoryList: {
    maxHeight: 400,
  },
  trackingSessionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  trackingSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  trackingSessionInfo: {
    flex: 1,
  },
  trackingSessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  trackingSessionTime: {
    fontSize: 14,
    color: '#666',
  },
  trackingDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trackingDurationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  trackingMapContainer: {
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  trackingMapImage: {
    width: '100%',
    height: '100%',
  },
  trackingLocationDetails: {
    padding: 16,
    paddingTop: 12,
  },
  trackingLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trackingLocationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackingLocationInfo: {
    flex: 1,
  },
  trackingLocationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  trackingLocationAddress: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  // Video Sessions Container
  videoSessionsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoSessionsList: {
    // Removed maxHeight to allow showing all sessions
    flexGrow: 0,
    flexShrink: 1,
  },
  videoSessionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  videoSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  videoSessionInfo: {
    flex: 1,
  },
  videoSessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoSessionTime: {
    fontSize: 14,
    color: '#666',
  },
  videoDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2D55',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  videoDurationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  videoInfoSection: {
    padding: 16,
    paddingTop: 0,
  },
  videoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  
  // Screenshot Strip Styles
  screenshotSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  screenshotTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  screenshotStrip: {
    flexDirection: 'row',
  },
  screenshotContainer: {
    marginRight: 12,
    alignItems: 'center',
  },
  screenshotPlaceholder: {
    width: 120,
    height: 90,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  screenshotIndex: {
    position: 'absolute',
    top: 5,
    right: 5,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  screenshotImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  screenshotTimestamp: {
    marginTop: 4,
    alignItems: 'center',
  },
  screenshotTime: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  moreScreenshotsContainer: {
    width: 80,
    height: 90,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  moreScreenshotsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  
  // Session Summary Styles
  sessionSummary: {
    padding: 16,
    paddingTop: 0,
  },
  sessionSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  sessionSummaryContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  videoSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoSummaryText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  
  // <-- FIX 4: Removed duplicate and unused styles from here
});

export default BookingDetailScreen;