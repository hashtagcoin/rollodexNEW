import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image, // Image is imported but not used in the provided snippet. Will keep it.
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { format, parseISO, isAfter } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS } from '../../constants/theme';
import BookingAvailabilityScreen from '../Bookings/BookingAvailabilityScreen';

const BookingsScreen = ({ navigation, route }) => {
  // --- Booking Availability Modal Integration ---
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null); // { date, time, rate }
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  // Handle incoming navigation params for service booking flow
  const params = route?.params || {}; // Simplified params access
  const incomingServiceId = params?.serviceId;
  const incomingServiceData = params?.serviceData;
  const isBookingFlow = params?.isBooking || false;

  const { profile } = useUser();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
  const [selectedService, setSelectedService] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [isTimeSlotModalVisible, setIsTimeSlotModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBooking, setSelectedBooking] = useState(null); // Added selectedBooking state, used in renderBookingItem example

  // Fetch bookings data from Supabase
  const fetchBookings = useCallback(async () => {
    console.log('[BookingsScreen] Fetching bookings, profile:', profile ? `ID: ${profile.id}` : 'No profile');
    
    if (!profile?.id) {
      console.warn('[BookingsScreen] No profile ID available, cannot fetch bookings');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString();
      console.log(`[BookingsScreen] Using today's date: ${today}`);
      console.log(`[BookingsScreen] Active tab: ${activeTab}`);

      // Query based on active tab
      const queryBuilder = supabase
        .from('bookings_with_details')
        .select('*')
        .eq('user_profile_id', profile.id);

      if (activeTab === 'upcoming') {
        queryBuilder.gte('scheduled_at', today);
      } else {
        queryBuilder.lt('scheduled_at', today);
      }

      // Add order and limit
      const { data, error } = await queryBuilder
        .order('scheduled_at', { ascending: activeTab === 'upcoming' })
        .limit(50);

      console.log(`[BookingsScreen] Query completed - Found ${data?.length || 0} bookings`);
      
      if (error) {
        console.error('[BookingsScreen] Database error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log('[BookingsScreen] First booking:', { 
          id: data[0].booking_id,
          service: data[0].service_title,
          scheduled: data[0].scheduled_at,
          status: data[0].booking_status
        });
      } else {
        console.log('[BookingsScreen] No bookings found for this user and filter');
      }
      
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      Alert.alert('Error', 'Failed to fetch bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, activeTab]);

  // Ensure profile is loaded and refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('[BookingsScreen] Screen focused, checking profile:', profile ? 'Profile exists' : 'No profile');
      
      // Check if profile is available, otherwise wait for UserContext to load it
      if (!profile) {
        console.log('[BookingsScreen] Waiting for profile to load...');
        // We'll fetch bookings once the profile loads via the useEffect below
      } else {
        fetchBookings();
      }

      // If we're in booking flow, show time slot modal
      if (isBookingFlow && incomingServiceId && incomingServiceData) {
        console.log('[BookingsScreen] Handling booking flow for service:', incomingServiceId);
        setSelectedService(incomingServiceData);
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        fetchAvailableTimeSlots(incomingServiceId, today)
          .then((slots) => {
            console.log(`[BookingsScreen] Fetched ${slots?.length || 0} time slots for booking flow`);
            if (slots && slots.length > 0) {
              setIsTimeSlotModalVisible(true);
            } else if (slots) { // slots might be an empty array
               Alert.alert('No Slots', 'No available time slots found for the selected service and date during booking flow.');
            }
            // If fetchAvailableTimeSlots returns undefined (e.g. due to error handled inside), nothing happens here.
          }).catch(err => {
            console.error("Error in focus effect booking flow:", err);
            Alert.alert('Error', 'Could not prepare booking session.');
          });
      }
    }, [fetchBookings, isBookingFlow, incomingServiceId, incomingServiceData]) // Added missing dependencies to inner useCallback
  );

  // Monitor profile changes and fetch bookings when profile is available
  useEffect(() => {
    if (profile?.id) {
      console.log(`[BookingsScreen] Profile loaded/changed - ID: ${profile.id}`);
      fetchBookings();
    }
  }, [profile, fetchBookings]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    console.log('[BookingsScreen] Manual refresh triggered');
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      if (!dateString) return { dayMonth: 'N/A', time: 'N/A', dayName: 'N/A', fullDate: 'N/A' };
      const date = parseISO(dateString);
      return {
        dayMonth: format(date, 'dd MMM'),
        time: format(date, 'h:mm a'),
        dayName: format(date, 'EEEE'),
        fullDate: format(date, 'dd MMM yyyy'),
      };
    } catch (err) {
      console.error('Error formatting date:', err);
      return { dayMonth: 'Error', time: 'Error', dayName: 'Error', fullDate: 'Error' };
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return '#34C759'; // Green
      case 'pending':
        return '#FF9500'; // Orange
      case 'completed':
        return '#8E8E93'; // Gray
      case 'cancelled':
        return '#FF3B30'; // Red
      default:
        return '#8E8E93'; // Gray
    }
  };

  // Render empty state
  const renderEmptyState = () => {
    console.log(`[BookingsScreen] Rendering empty state for ${activeTab} tab`);
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {activeTab === 'upcoming'
            ? 'Book a service to see your upcoming appointments here'
            : 'Your booking history will appear here'}
        </Text>
        {activeTab === 'upcoming' && (
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('ExploreScreen')}
          >
            <Text style={styles.exploreButtonText}>Explore Services</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Change date for time slot selection
  const handleDateChange = async (newDate) => {
    if (!selectedService?.id) {
        Alert.alert("No Service Selected", "Please select a service before choosing a date.");
        return;
    }
    setSelectedDate(newDate);
    await fetchAvailableTimeSlots(selectedService.id, newDate);
  };

  // Fetch available time slots for a service on a specific date
  const fetchAvailableTimeSlots = async (serviceId, date) => {
    if (!serviceId || !date) return [];

    setLoading(true); // Consider a more specific loading state for the modal
    try {
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('provider_id')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;
      if (!serviceData?.provider_id) throw new Error('Provider information not found');

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', serviceData.provider_id)
        //.eq('service_id', serviceId) // Availability might be per provider, not per service of provider
        .eq('date', date)
        .eq('available', true);

      if (availabilityError) throw availabilityError;

      let timeSlots = (availabilityData || []).map(slot => ({
        id: slot.id,
        timeValue: slot.time_slot,
        displayTime: formatTimeSlot(slot.time_slot),
        isAvailable: true
      }));

      timeSlots.sort((a, b) => a.timeValue.localeCompare(b.timeValue));

      const { data: existingBookings, error: bookingsError } = await supabase
        .from('service_bookings') // Assuming this is the correct table name
        .select('scheduled_at')
        .eq('service_id', serviceId) // Check bookings for this specific service
        .eq('status', 'confirmed')
        .like('scheduled_at', `${date}%`); // Filter by date more efficiently

      if (bookingsError) throw bookingsError;

      const bookedTimes = new Set(
        (existingBookings || []).map(b => format(parseISO(b.scheduled_at), "HH:mm:ss"))
      );

      timeSlots = timeSlots.filter(slot => !bookedTimes.has(slot.timeValue));
      
      const now = new Date();
      timeSlots = timeSlots.filter(slot => {
        const slotDateTime = parseISO(`${date}T${slot.timeValue}`);
        return isAfter(slotDateTime, now);
      });

      setAvailableTimeSlots(timeSlots);
      return timeSlots;
    } catch (err) {
      console.error('Error fetching available time slots:', err);
      Alert.alert('Error', 'Failed to load available time slots. Please ensure a service is selected or try again.');
      setAvailableTimeSlots([]); // Clear previous slots on error
      return []; // Ensure it returns an array on error
    } finally {
      setLoading(false); // Reset general loading, or specific modal loading
    }
  };

  // Format time slot for display (convert from HH:MM:SS to h:MM AM/PM)
  const formatTimeSlot = (timeString) => {
    try {
      if (!timeString || !timeString.includes(':')) return timeString;
      const [hours, minutes] = timeString.split(':');
      const h = parseInt(hours, 10);
      const period = h >= 12 ? 'PM' : 'AM';
      let hour = h % 12;
      if (hour === 0) hour = 12; // Adjust for 12 AM (midnight) and 12 PM (noon)

      return `${hour}:${minutes} ${period}`;
    } catch (err) {
      console.error("Error formatting time slot:", err)
      return timeString;
    }
  };

  // Handle booking a service (currently not called in JSX, but defined)
  const handleBookService = async (service) => {
    if (!service || !service.id) {
        Alert.alert("Error", "Service information is missing.");
        return;
    }
    setSelectedService(service);
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);

    const availableSlots = await fetchAvailableTimeSlots(service.id, today);

    if (availableSlots && availableSlots.length === 0) {
      Alert.alert(
        'No Available Times',
        'There are no available time slots for this service today. Would you like to try another day?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Check Other Dates', // Changed text for clarity
            onPress: () => {
                // This should ideally open the modal and allow date picking
                // For now, it will just set the modal visible assuming `selectedService` is set.
                setIsTimeSlotModalVisible(true);
                // If navigating to ServiceDetailScreen, ensure it handles date selection:
                // navigation.navigate('ServiceDetailScreen', { serviceId: service.id })
            }
          }
        ]
      );
      return;
    }
    // If slots are available, open the modal to select a time
    if (availableSlots && availableSlots.length > 0) {
        setIsTimeSlotModalVisible(true);
    }
  }; // Correctly closed the handleBookService function

  // Define renderBookingItem for the FlatList
  const renderBookingItem = ({ item }) => {
    console.log('[BookingsScreen] Rendering booking item:', item.booking_id);
    const formattedDate = formatDate(item.scheduled_at);
    const statusColor = getStatusColor(item.booking_status); // Changed from item.status to item.booking_status

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => {
          try {
            console.log("Booking item pressed:", item.booking_id);
            if (item?.booking_id) {
              setSelectedBooking(item);
              navigation.navigate('BookingDetailScreen', { bookingId: item.booking_id });
            } else {
              console.error('[BookingsScreen] Missing booking_id for navigation');
              Alert.alert('Error', 'Unable to open booking details. Missing booking ID.');
            }
          } catch (error) {
            console.error('[BookingsScreen] Error navigating to booking detail:', error);
            Alert.alert('Error', 'Unable to open booking details. Please try again.');
          }
        }}
      >
        <View style={styles.dateColumn}>
          <Text style={styles.dateDay}>{formattedDate.dayMonth}</Text>
          <Text style={styles.dateTime}>{formattedDate.time}</Text>
          {item.booking_status && (
            <View style={[styles.statusChip, { backgroundColor: statusColor }]}>
              <Text style={[styles.statusText, { color: '#fff' }]}>{item.booking_status.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.contentColumn}>
          <Text style={styles.bookingTitle} numberOfLines={1}>{item.service_title || 'Service Name Missing'}</Text>
          <Text style={styles.bookingProvider} numberOfLines={1}>
            {item.provider_name || 'Provider'}
          </Text>
          {/* Add more details like location, notes if available */}
          {item.booking_notes && (
            <Text style={styles.bookingNotes} numberOfLines={2}>Notes: {item.booking_notes}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color="#C7C7CC" style={styles.chevron} />
      </TouchableOpacity>
    );
  };


  // This is the main return for the BookingsScreen component
  return (
    <View style={styles.container}>
      <AppHeader title="My Bookings" navigation={navigation} canGoBack={route.params?.canGoBack !== false} />
      
      <Modal
        visible={isTimeSlotModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTimeSlotModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay} // Using modalOverlay for consistency
          activeOpacity={1}
          onPressOut={() => setIsTimeSlotModalVisible(false)} // Close on overlay press
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}> {/* Prevent closing when pressing on content */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedService ? selectedService.name : 'Select Time Slot'}
              </Text>
              <TouchableOpacity onPress={() => setIsTimeSlotModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={28} color={COLORS.darkgray} />
              </TouchableOpacity>
            </View>
            
            {/* TODO: Implement Date Picker Here for handleDateChange(newDate) */}
            <View style={styles.dateSelector}>
                <Text style={styles.dateSelectorLabel}>Selected Date: {format(parseISO(selectedDate), 'EEE, dd MMM yyyy')}</Text>
                {/* Add actual date picker component here */}
            </View>

            <Text style={styles.availabilityTitle}>Available Slots for {format(parseISO(selectedDate), 'dd MMM')}:</Text>
            {loading && availableTimeSlots.length === 0 ? ( // Show loading only if slots are empty
                <View style={styles.modalLoading}><ActivityIndicator size="small" color={COLORS.primary} /></View>
            ) : availableTimeSlots.length > 0 ? (
              <FlatList
                data={availableTimeSlots}
                keyExtractor={(slot) => slot.id.toString()}
                renderItem={({ item: slot }) => (
                  <TouchableOpacity 
                    style={styles.timeSlotItem}
                    onPress={() => {
                        // Logic to confirm booking with this time slot
                        Alert.alert("Confirm Booking", `Book ${selectedService?.name} on ${selectedDate} at ${slot.displayTime}?`, [
                            { text: "Cancel"},
                            { text: "Confirm", onPress: () => console.log("Booking confirmed for slot:", slot) /* Call actual booking function */}
                        ]);
                        setIsTimeSlotModalVisible(false);
                    }}
                  >
                    <Ionicons name="time-outline" size={20} color={COLORS.primary} style={styles.timeSlotIcon} />
                    <Text style={styles.timeSlotText}>{slot.displayTime}</Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.timeSlotsList}
              />
            ) : (
              <View style={styles.noTimeSlotsContainer}>
                <Ionicons name="sad-outline" size={40} color="#CCC" />
                <Text style={styles.noTimeSlotsText}>No Slots Available</Text>
                <Text style={styles.noTimeSlotsSubText}>Please try a different date or service.</Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      


      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'upcoming' && styles.activeTabText
          ]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'past' && styles.activeTabText
          ]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Bookings List */}
      {loading && bookings.length === 0 && !refreshing ? ( // Show loading only if list is empty initially
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.booking_id.toString()} // Ensure key is a string
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!loading ? renderEmptyState : null} // Show empty state only if not loading
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSheetOverlay: { // This style was present but modal used modalOverlay. Kept for reference.
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: { // This style was present. Kept for reference.
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 200, // Modal content will define its own height better
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // Aligns modal to bottom; for center, use 'center' and alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30, // For safe area or visual spacing
    paddingTop: 0, // Header has its own padding
    maxHeight: '80%', // Limit height
    width: '100%', // Full width at the bottom
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold, // Using from theme
    color: COLORS.textDark, // Using from theme
  },
  dateSelector: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateSelectorLabel: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    marginBottom: 10,
    color: COLORS.textDark,
  },
  // dateSelectorButtons and related styles seem for a custom date strip,
  // if using a library date picker, these might not be needed directly.
  // Kept for reference.
  dateSelectorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    // Example: for a strip of date buttons
    minWidth: 50,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  selectedDateButton: {
    backgroundColor: COLORS.primary,
  },
  dateButtonDay: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textGray,
  },
  dateButtonDate: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginTop: 4,
    color: COLORS.textDark,
  },
  selectedDateButtonText: {
    color: COLORS.white,
  },
  availabilityTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    color: COLORS.textDark,
  },
  timeSlotsList: {
    paddingHorizontal: 20,
    paddingBottom: 20, // Space at the end of the list
  },
  timeSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  timeSlotIcon: {
    marginRight: 12,
  },
  timeSlotText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.textDark,
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTimeSlotsContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTimeSlotsText: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    marginTop: 15,
    color: COLORS.textDark,
    textAlign: 'center',
  },
  noTimeSlotsSubText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textGray,
    marginTop: 8,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16, // Was 16
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tab: {
    flex: 1, // Make tabs share space equally
    alignItems: 'center', // Center text
    paddingVertical: 12,
    // marginRight: 24, // Removed for flex:1
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontFamily: FONTS.medium, // Using from theme
    color: COLORS.textGray, // Using from theme
  },
  activeTabText: {
    color: COLORS.primary,
    fontFamily: FONTS.semiBold, // Using from theme
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1, // Important for ScrollView behavior with ListEmptyComponent
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50, // Added padding
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textGray,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white, // Using from theme
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Softer shadow
    shadowOpacity: 0.08, // Softer shadow
    shadowRadius: 4,  // Softer shadow
    elevation: 2,
  },
  dateColumn: {
    paddingRight: 16, // Increased spacing
    marginRight: 12, // Added margin for separation
    borderRightWidth: 1,
    borderRightColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  dateDay: {
    fontSize: 16, // Slightly larger
    fontFamily: FONTS.bold, // Using from theme
    color: COLORS.primary, // Use primary color for emphasis
  },
  dateTime: {
    fontSize: 13, // Slightly larger
    fontFamily: FONTS.regular,
    color: COLORS.textGray,
    marginTop: 4,
    marginBottom: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12, // More rounded
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold, // Using from theme
    // Color is set dynamically
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 4, // Reduced from 12 as dateColumn now has marginRight
    justifyContent: 'center', // Vertically center content if it's short
  },
  bookingTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  bookingProvider: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textGray,
    marginBottom: 8,
  },
  bookingDetails: { // Style for potential future use
    flexDirection: 'row',
    marginBottom: 8,
  },
  bookingDetailItem: { // Style for potential future use
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailIcon: { // Style for potential future use
    marginRight: 4,
  },
  detailText: { // Style for potential future use
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textGray,
  },
  bookingNotes: {
    fontSize: 12,
    fontFamily: FONTS.regularItalic, // Using from theme if available
    color: COLORS.textLight, // Lighter gray
    marginTop: 4, // Added margin
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 8, // Added margin
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60, // Increased padding
    paddingHorizontal: 20, // Added horizontal padding
  },
  emptyTitle: {
    fontSize: 20, // Larger
    fontFamily: FONTS.semiBold,
    color: COLORS.textDark,
    marginTop: 20, // Increased margin
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15, // Larger
    fontFamily: FONTS.regular,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 22, // Improved readability
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10, // Added margin
  },
  emptyButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
});

export default BookingsScreen;