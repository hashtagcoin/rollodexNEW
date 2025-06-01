import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
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

const BookingsScreen = ({ navigation, route }) => {
  // Handle incoming navigation params for service booking flow
  const { params } = route?.params || {};
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
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Fetch bookings data from Supabase
  const fetchBookings = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString();
      
      // Query based on active tab
      const query = supabase
        .from('bookings_with_details')
        .select('*')
        .eq('user_profile_id', profile.id);
        
      if (activeTab === 'upcoming') {
        query.gte('scheduled_at', today);
      } else {
        query.lt('scheduled_at', today);
      }
      
      // Add order and limit
      const { data, error } = await query
        .order('scheduled_at', { ascending: activeTab === 'upcoming' })
        .limit(50);
        
      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, activeTab]);

  // Refresh on screen focus and handle booking flow if needed
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      
      // If we're in booking flow, show time slot modal
      if (isBookingFlow && incomingServiceId && incomingServiceData) {
        setSelectedService(incomingServiceData);
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        fetchAvailableTimeSlots(incomingServiceId, today)
          .then(() => setIsTimeSlotModalVisible(true));
      }
    }, [fetchBookings, isBookingFlow, incomingServiceId, incomingServiceData])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = parseISO(dateString);
      return {
        dayMonth: format(date, 'dd MMM'),
        time: format(date, 'h:mm a'),
        dayName: format(date, 'EEEE'),
        fullDate: format(date, 'dd MMM yyyy'),
      };
    } catch (err) {
      console.error('Error formatting date:', err);
      return { dayMonth: 'Unknown', time: 'Unknown', dayName: 'Unknown', fullDate: 'Unknown' };
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
        return '#FF3B30'; // Red
      default:
        return '#8E8E93'; // Gray
    }
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={60} color="#DADADA" />
      <Text style={styles.emptyTitle}>No bookings found</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'upcoming' 
          ? 'You don\'t have any upcoming bookings' 
          : 'You don\'t have any past bookings'}
      </Text>
      {activeTab === 'upcoming' && (
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}
        >
          <Text style={styles.emptyButtonText}>Book a Service</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Change date for time slot selection
  const handleDateChange = async (newDate) => {
    if (!selectedService?.id) return;
    
    setSelectedDate(newDate);
    await fetchAvailableTimeSlots(selectedService.id, newDate);
  };
  
  // Fetch available time slots for a service on a specific date
  const fetchAvailableTimeSlots = async (serviceId, date) => {
    if (!serviceId || !date) return [];
    
    setLoading(true);
    try {
      // First get the provider_id for this service
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('provider_id')
        .eq('id', serviceId)
        .single();
        
      if (serviceError) throw serviceError;
      
      if (!serviceData?.provider_id) {
        throw new Error('Provider information not found');
      }
      
      // Now fetch availability for this provider and service
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', serviceData.provider_id)
        .eq('service_id', serviceId)
        .eq('date', date)
        .eq('available', true);
        
      if (availabilityError) throw availabilityError;
      
      // Format the time slots for display
      const timeSlots = (availabilityData || []).map(slot => ({
        id: slot.id,
        timeValue: slot.time_slot,
        displayTime: formatTimeSlot(slot.time_slot),
        isAvailable: true
      }));
      
      // Sort by time
      timeSlots.sort((a, b) => {
        return a.timeValue.localeCompare(b.timeValue);
      });
      
      // Check for existing bookings at these times
      const { data: existingBookings, error: bookingsError } = await supabase
        .from('service_bookings')
        .select('scheduled_at')
        .eq('service_id', serviceId)
        .eq('status', 'confirmed');
        
      if (bookingsError) throw bookingsError;
      
      // Filter out any times that already have bookings
      const filteredTimeSlots = timeSlots.filter(slot => {
        const slotDateTime = `${date}T${slot.timeValue}`;
        
        return !(existingBookings || []).some(booking => {
          const bookingTime = new Date(booking.scheduled_at);
          const slotTime = new Date(slotDateTime);
          
          // Compare if they're the same time (within a few minutes)
          return Math.abs(bookingTime - slotTime) < 5 * 60 * 1000; // 5 minutes tolerance
        });
      });
      
      // Also filter out time slots in the past
      const now = new Date();
      const filteredCurrentTimeSlots = filteredTimeSlots.filter(slot => {
        const slotDateTime = new Date(`${date}T${slot.timeValue}`);
        return isAfter(slotDateTime, now);
      });
      
      setAvailableTimeSlots(filteredCurrentTimeSlots);
      return filteredCurrentTimeSlots;
    } catch (err) {
      console.error('Error fetching available time slots:', err);
      Alert.alert('Error', 'Failed to load available time slots');
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Format time slot for display (convert from HH:MM:SS to h:MM AM/PM)
  const formatTimeSlot = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const h = parseInt(hours, 10);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      
      return `${hour}:${minutes} ${period}`;
    } catch (err) {
      return timeString;
    }
  };
  
  // Handle booking a service
  const handleBookService = async (service) => {
    setSelectedService(service);
    
    // Use today's date as default
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    
    // Fetch available time slots
    const availableSlots = await fetchAvailableTimeSlots(service.id, today);
    
    if (availableSlots.length === 0) {
      Alert.alert(
        'No Available Times', 
        'There are no available time slots for this service today. Would you like to try another day?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Check Availability',
            onPress: () => navigation.navigate('ServiceDetailScreen', { serviceId: service.id })
          }
        ]
      );
      return;
    }
    
    // Show time slot selection modal
    setIsTimeSlotModalVisible(true);
  };
  
  // Handle time slot selection
  const handleTimeSlotSelected = (timeSlot) => {
    if (!selectedService || !timeSlot || !profile?.id) {
      Alert.alert('Error', 'Please select a service and time slot');
      return;
    }
    
    // Close the modal
    setIsTimeSlotModalVisible(false);
    
    // Navigate to booking confirmation screen
    navigation.navigate('BookingConfirmationScreen', {
      serviceData: selectedService,
      selectedTimeSlot: timeSlot,
      selectedDate: selectedDate
    });
  };
  
  // Render time slot selection modal
  const renderTimeSlotModal = () => (
    <Modal
      visible={isTimeSlotModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsTimeSlotModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Time</Text>
            <TouchableOpacity onPress={() => setIsTimeSlotModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Date Selector */}
          <View style={styles.dateSelector}>
            <Text style={styles.dateSelectorLabel}>Select Date:</Text>
            <View style={styles.dateSelectorButtons}>
              {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                const dateString = date.toISOString().split('T')[0];
                const isSelected = dateString === selectedDate;
                
                return (
                  <TouchableOpacity 
                    key={dateString}
                    style={[styles.dateButton, isSelected && styles.selectedDateButton]}
                    onPress={() => handleDateChange(dateString)}
                  >
                    <Text style={[styles.dateButtonDay, isSelected && styles.selectedDateButtonText]}>
                      {format(date, 'E')}
                    </Text>
                    <Text style={[styles.dateButtonDate, isSelected && styles.selectedDateButtonText]}>
                      {format(date, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          
          {/* Available Time Slots */}
          <Text style={styles.availabilityTitle}>
            {selectedService?.title ? `${selectedService.title} - ` : ''}
            Available Times for {format(new Date(selectedDate), 'PPP')}
          </Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.modalLoading} />
          ) : availableTimeSlots.length === 0 ? (
            <View style={styles.noTimeSlotsContainer}>
              <Ionicons name="time-outline" size={50} color="#DADADA" />
              <Text style={styles.noTimeSlotsText}>No available time slots</Text>
              <Text style={styles.noTimeSlotsSubText}>Try selecting another date</Text>
            </View>
          ) : (
            <FlatList
              data={availableTimeSlots}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.timeSlotItem}
                  onPress={() => handleTimeSlotSelected(item)}
                >
                  <Ionicons name="time-outline" size={20} color={COLORS.primary} style={styles.timeSlotIcon} />
                  <Text style={styles.timeSlotText}>{item.displayTime}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.timeSlotsList}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // Render booking card
  const renderBookingItem = ({ item }) => {
    const dateInfo = formatDate(item.scheduled_at);
    const statusColor = getStatusColor(item.booking_status);

    return (
      <TouchableOpacity 
        style={styles.bookingCard}
        onPress={() => navigation.navigate('BookingDetailScreen', { bookingId: item.booking_id })}
        activeOpacity={0.8}
      >
        <View style={styles.dateColumn}>
          <Text style={styles.dateDay}>{dateInfo.dayMonth}</Text>
          <Text style={styles.dateTime}>{dateInfo.time}</Text>
          <View style={[styles.statusChip, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.booking_status?.charAt(0).toUpperCase() + item.booking_status?.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.contentColumn}>
          <Text style={styles.bookingTitle} numberOfLines={1}>{item.service_title}</Text>
          <Text style={styles.bookingProvider} numberOfLines={1}>
            {item.provider_id ? 'Provider Name' : 'Independent Service'}
          </Text>
          
          <View style={styles.bookingDetails}>
            <View style={styles.bookingDetailItem}>
              <Ionicons name="location-outline" size={14} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailText}>{item.service_format || 'In Person'}</Text>
            </View>
            <View style={styles.bookingDetailItem}>
              <Ionicons name="cash-outline" size={14} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailText}>${parseFloat(item.total_price).toFixed(2)}</Text>
            </View>
          </View>
          
          {item.booking_notes ? (
            <Text style={styles.bookingNotes} numberOfLines={2}>
              Note: {item.booking_notes}
            </Text>
          ) : null}
        </View>
        
        <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="My Bookings" navigation={navigation} canGoBack={true} />
      
      {/* Time Slot Selection Modal */}
      {renderTimeSlotModal()}
      
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
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.booking_id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
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
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '80%',
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
    fontWeight: 'bold',
    color: '#333',
  },
  dateSelector: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  dateSelectorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    width: 40,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  selectedDateButton: {
    backgroundColor: COLORS.primary,
  },
  dateButtonDay: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  dateButtonDate: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#333',
  },
  selectedDateButtonText: {
    color: '#ffffff',
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 15,
    paddingBottom: 5,
    color: '#333',
  },
  timeSlotsList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  timeSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timeSlotIcon: {
    marginRight: 15,
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
  },
  modalLoading: {
    padding: 30,
  },
  noTimeSlotsContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTimeSlotsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  noTimeSlotsSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dateColumn: {
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  dateDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dateTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 8,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bookingProvider: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bookingDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailIcon: {
    marginRight: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  bookingNotes: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  chevron: {
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default BookingsScreen;
