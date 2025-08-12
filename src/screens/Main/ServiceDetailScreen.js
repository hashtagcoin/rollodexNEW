import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LogBox, ScrollView, FlatList, ActivityIndicator  } from 'react-native';
import { Alert } from '../../utils/alert';

import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import BookingAvailabilityScreen from '../Bookings/BookingAvailabilityScreen';
import ChatModal from '../../components/chat/ChatModal';
import ShareTray from '../../components/common/ShareTray';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabaseClient';
import { format, addDays } from 'date-fns';

// Ignore any yellow warnings that might appear
LogBox.ignoreLogs(['Warning:']);

const AIRBNB_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
};

const ServiceDetailScreen = ({ route }) => {
  console.log('Rendering ServiceDetailScreen');
  const { serviceId } = route.params || {};
  const navigation = useNavigation();

  // State for booking and UI
  const [showModal, setShowModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showShareTray, setShowShareTray] = useState(false);
  const [serviceProvider, setServiceProvider] = useState(null);
  const [bookingInfo, setBookingInfo] = useState({
    date: null,
    time: null,
    display: null,
    hourlyRate: null
  });
  const [serviceDetails, setServiceDetails] = useState({
    title: 'Service Name',
    location: 'Location',
    price: 0,
    description: 'Service description',
    imageUrl: null,
    loading: true
  });
  const [quickSlots, setQuickSlots] = useState([]);
  const [loadingQuickSlots, setLoadingQuickSlots] = useState(false);
  
  // Fetch service details
  useEffect(() => {
    if (serviceId) {
      fetchServiceDetails();
      fetchQuickAvailability();
    }
  }, [serviceId]);
  
  // Debug effect to log state changes
  useEffect(() => {
    console.log('State updated:', { showModal, bookingInfo });
  }, [showModal, bookingInfo]);
  
  const fetchServiceDetails = async () => {
    try {
      // Fetch service details with provider information
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          service_providers!inner(
            id,
            business_name,
            user_profiles!inner(
              id,
              full_name,
              avatar_url,
              username
            )
          )
        `)
        .eq('id', serviceId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setServiceDetails({
          title: data.title || data.name || 'Service Name',
          location: data.address_suburb || data.location || 'Location',
          price: data.price || data.hourly_rate || 0,
          description: data.description || 'No description available',
          imageUrl: data.media_urls && data.media_urls.length > 0 ? data.media_urls[0] : data.image_url,
          loading: false
        });
        
        // Set provider details for chat
        if (data.service_providers && data.service_providers.user_profiles) {
          setServiceProvider({
            id: data.service_providers.user_profiles.id,
            name: data.service_providers.user_profiles.full_name || data.service_providers.business_name,
            avatar: data.service_providers.user_profiles.avatar_url,
            username: data.service_providers.user_profiles.username
          });
        }
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
      setServiceDetails(prev => ({ ...prev, loading: false }));
    }
  };
  
  const fetchQuickAvailability = async () => {
    setLoadingQuickSlots(true);
    try {
      // Generate next 5 days
      const today = new Date();
      const nextDays = [];
      
      for (let i = 0; i < 5; i++) {
        const day = addDays(today, i);
        const slots = [
          { time: '09:00:00', display: '9:00 AM' },
          { time: '10:00:00', display: '10:00 AM' },
          { time: '11:00:00', display: '11:00 AM' },
          { time: '13:00:00', display: '1:00 PM' },
          { time: '14:00:00', display: '2:00 PM' },
          { time: '15:00:00', display: '3:00 PM' },
          { time: '16:00:00', display: '4:00 PM' },
        ];
        
        // Here you would check availability from API
        // For now we'll randomly mark some as unavailable
        const availableSlots = slots.filter(() => Math.random() > 0.3);
        
        if (availableSlots.length > 0) {
          nextDays.push({
            date: day,
            month: format(day, 'MMM'),
            day: format(day, 'd'),
            dayOfWeek: format(day, 'EEE'),
            firstAvailableSlot: availableSlots[0],
            hourlyRate: serviceDetails.price
          });
        }
      }
      
      setQuickSlots(nextDays);
    } catch (error) {
      console.error('Error generating quick slots:', error);
    } finally {
      setLoadingQuickSlots(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Select Date';
    try {
      return date.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Invalid date';
    }
  };

  // Simplified handlers using a single state update
  const handleOpenModal = useCallback(() => {
    console.log('Opening modal');
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    console.log('Closing modal');
    setShowModal(false);
  }, []);

  // This is a key handler - make it super simple
  const handleSelectBooking = useCallback((data) => {
    console.log('Selection received:', data);
    
    // Use a timeout to decouple the state update from the modal closing
    setTimeout(() => {
      try {
        console.log('Setting booking info');
        setBookingInfo(data);
        console.log('Booking info set successfully');
      } catch (e) {
        console.error('Error updating booking info:', e);
      }
    }, 100);
  }, []);

  const handleSelectQuickSlot = useCallback((item) => {
    setBookingInfo({
      date: item.date,
      time: item.firstAvailableSlot.time,
      display: item.firstAvailableSlot.display,
      hourlyRate: item.hourlyRate || serviceDetails.price
    });
  }, [serviceDetails.price]);
  
  const handleBookNow = useCallback(() => {
    if (!bookingInfo.date || !bookingInfo.time) {
      console.log('No booking info, opening modal');
      setShowModal(true);
    } else {
      console.log('Navigating to booking details');
      try {
        navigation.navigate('BookingDetailScreen', {
          serviceId,
          serviceName: serviceDetails.title,
          selectedDate: bookingInfo.date.toISOString(),
          selectedTime: bookingInfo.time,
          selectedTimeDisplay: bookingInfo.display,
          hourlyRate: bookingInfo.hourlyRate || serviceDetails.price,
          location: serviceDetails.location
        });
      } catch (e) {
        console.error('Navigation error:', e);
        Alert.alert('Error', 'Could not navigate to booking details');
      }
    }
  }, [bookingInfo, navigation, serviceId, serviceDetails]);

  // Handler for opening chat with service provider
  const handleMessage = useCallback(() => {
    if (!serviceProvider) {
      Alert.alert('Error', 'Service provider information not available');
      return;
    }
    console.log('Opening chat with provider:', serviceProvider.name);
    setShowChatModal(true);
  }, [serviceProvider]);

  // Handler for sharing service
  const handleShare = useCallback(() => {
    console.log('Opening share tray for service:', serviceDetails.title);
    setShowShareTray(true);
  }, [serviceDetails.title]);

  return (
    <View style={styles.container}>
      <AppHeader title="Service Details" showBackButton={true} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Service Details Card */}
        <View style={[styles.serviceCard, AIRBNB_CARD_SHADOW]}>
          {serviceDetails.loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <>
              <Text style={styles.serviceTitle}>{serviceDetails.title}</Text>
              
              <View style={styles.serviceInfoRow}>
                <View style={styles.serviceInfoItem}>
                  <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.serviceInfoText}>{serviceDetails.location}</Text>
                </View>
                
                <View style={styles.serviceInfoItem}>
                  <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.serviceInfoText}>${serviceDetails.price}/hr</Text>
                </View>
              </View>
              
              <Text style={styles.serviceDescription}>{serviceDetails.description}</Text>
            </>
          )}
        </View>

        {/* Action Buttons Row */}
        {!serviceDetails.loading && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={handleMessage}
              disabled={!serviceProvider}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Check Availability Button */}
        <TouchableOpacity
          style={styles.checkAvailabilityBtn}
          onPress={handleOpenModal}
        >
          <Ionicons name="calendar-outline" size={22} color="#fff" style={styles.btnIcon} />
          <Text style={styles.btnText}>Check Availability</Text>
        </TouchableOpacity>
        
        {/* Quick Available Slots */}
        <Text style={styles.sectionTitle}>Available Dates</Text>
        {loadingQuickSlots ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{marginVertical: 10}} />
        ) : quickSlots.length > 0 ? (
          <FlatList
            horizontal
            data={quickSlots}
            keyExtractor={(item) => item.date.toISOString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickSlotsList}
            renderItem={({item}) => (
              <TouchableOpacity 
                style={[
                  styles.quickSlotCard,
                  bookingInfo.date && bookingInfo.date.toDateString() === item.date.toDateString() && styles.selectedQuickSlot
                ]}
                onPress={() => handleSelectQuickSlot(item)}
              >
                <Text style={[styles.quickSlotMonth, bookingInfo.date && bookingInfo.date.toDateString() === item.date.toDateString() && styles.selectedQuickSlotText]}>{item.month}</Text>
                <Text style={[styles.quickSlotDay, bookingInfo.date && bookingInfo.date.toDateString() === item.date.toDateString() && styles.selectedQuickSlotText]}>{item.day}</Text>
                <Text style={[styles.quickSlotDayOfWeek, bookingInfo.date && bookingInfo.date.toDateString() === item.date.toDateString() && styles.selectedQuickSlotText]}>{item.dayOfWeek}</Text>
                <Text style={[styles.quickSlotTime, bookingInfo.date && bookingInfo.date.toDateString() === item.date.toDateString() && styles.selectedQuickSlotText]}>{item.firstAvailableSlot.display}</Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text style={styles.noSlotsText}>No available slots found</Text>
        )}
        
        {/* Booking Summary */}
        {(bookingInfo.date && bookingInfo.time) && (
          <View style={[styles.bookingSummary, AIRBNB_CARD_SHADOW]}>
            <Text style={styles.bookingSummaryTitle}>You are booking:</Text>
            <View style={styles.bookingSummaryRow}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <Text style={styles.bookingSummaryText}>
                {formatDate(bookingInfo.date)}, {bookingInfo.display}
              </Text>
            </View>
            <View style={styles.bookingSummaryRow}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.bookingSummaryText}>{serviceDetails.location}</Text>
            </View>
            <View style={styles.bookingSummaryRow}>
              <Ionicons name="cash" size={20} color={COLORS.primary} />
              <Text style={styles.bookingSummaryText}>${bookingInfo.hourlyRate || serviceDetails.price}/hr</Text>
            </View>
          </View>
        )}
        
        {/* Book Now Button */}
        <TouchableOpacity
          style={styles.bookNowBtn}
          onPress={handleBookNow}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={styles.btnIcon} />
          <Text style={styles.btnText}>Book Now</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Simplified modal approach */}
      {showModal && (
        <BookingAvailabilityScreen
          visible={showModal}
          onClose={handleCloseModal}
          onSelect={handleSelectBooking}
          selectedServiceId={serviceId}
          baseHourlyRate={50}
        />
      )}

      {/* Chat Modal */}
      {showChatModal && serviceProvider && (
        <ChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          initialUser={serviceProvider}
        />
      )}

      {/* Share Tray */}
      {showShareTray && (
        <ShareTray
          visible={showShareTray}
          onClose={() => setShowShareTray(false)}
          item={{
            id: serviceId,
            item_id: serviceId,
            item_title: serviceDetails.title,
            item_type: 'service_provider'
          }}
          itemType="service_provider"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 22,
    color: COLORS.textDark,
    fontFamily: FONTS.bold,
    marginBottom: 12,
  },
  serviceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfoText: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
    marginLeft: 6,
  },
  serviceDescription: {
    fontSize: 15,
    color: COLORS.textGray,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.textDark,
    fontFamily: FONTS.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  checkAvailabilityBtn: {
    backgroundColor: '#4285F4', // Modern blue color
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...AIRBNB_CARD_SHADOW,
  },
  bookNowBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...AIRBNB_CARD_SHADOW,
  },
  btnIcon: {
    marginRight: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  quickSlotsList: {
    paddingVertical: 8,
  },
  quickSlotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 90,
    alignItems: 'center',
    ...AIRBNB_CARD_SHADOW,
  },
  selectedQuickSlot: {
    backgroundColor: COLORS.primary,
  },
  quickSlotMonth: {
    fontSize: 14,
    color: COLORS.textGray,
    fontFamily: FONTS.medium,
  },
  quickSlotDay: {
    fontSize: 22,
    color: COLORS.textDark,
    fontFamily: FONTS.bold,
    marginVertical: 2,
  },
  quickSlotDayOfWeek: {
    fontSize: 14,
    color: COLORS.textGray,
    fontFamily: FONTS.medium,
    marginBottom: 6,
  },
  quickSlotTime: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  selectedQuickSlotText: {
    color: '#fff',
  },
  noSlotsText: {
    fontSize: 15,
    color: COLORS.textGray,
    fontFamily: FONTS.medium,
    marginVertical: 10,
    fontStyle: 'italic',
  },
  bookingSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  bookingSummaryTitle: {
    fontSize: 18,
    color: COLORS.textDark,
    fontFamily: FONTS.bold,
    marginBottom: 12,
  },
  bookingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingSummaryText: {
    fontSize: 18,
    color: COLORS.textDark,
    fontFamily: FONTS.semiBold,
    marginLeft: 10,
  },
  // New styles for action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    ...AIRBNB_CARD_SHADOW,
  },
  messageButton: {
    backgroundColor: '#007AFF', // iOS blue
  },
  shareButton: {
    backgroundColor: '#34C759', // iOS green
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    marginLeft: 8,
  },
});

export default ServiceDetailScreen;
