import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture, differenceInDays } from 'date-fns';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, FONTS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';

const { width: screenWidth } = Dimensions.get('window');

// Booking status colors
const STATUS_COLORS = {
  pending: '#FF9500',
  confirmed: '#34C759',
  completed: '#007AFF',
  cancelled: '#FF3B30',
  no_show: '#8E8E93'
};

const BookingCard = ({ booking, onPress, onStatusChange }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'no_show': return 'alert-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const getDateDisplay = (dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return `${Math.abs(differenceInDays(new Date(), date))} days ago`;
    return `In ${differenceInDays(date, new Date())} days`;
  };

  const formatTime = (dateString) => {
    return format(parseISO(dateString), 'h:mm a');
  };

  return (
    <TouchableOpacity style={styles.bookingCard} onPress={() => onPress(booking)}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA']}
        style={styles.cardGradient}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[booking.status] }]}>
          <Ionicons name={getStatusIcon(booking.status)} size={16} color="#FFFFFF" />
          <Text style={styles.statusText}>{booking.status.replace('_', ' ').toUpperCase()}</Text>
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Date and Time */}
          <View style={styles.dateTimeSection}>
            <View style={styles.dateBox}>
              <Text style={styles.monthText}>{format(parseISO(booking.scheduled_at), 'MMM')}</Text>
              <Text style={styles.dayText}>{format(parseISO(booking.scheduled_at), 'd')}</Text>
              <Text style={styles.yearText}>{format(parseISO(booking.scheduled_at), 'yyyy')}</Text>
            </View>
            
            <View style={styles.timeInfo}>
              <Text style={styles.dateLabel}>{getDateDisplay(booking.scheduled_at)}</Text>
              <Text style={styles.timeText}>{formatTime(booking.scheduled_at)}</Text>
              <Text style={styles.durationText}>{booking.duration || 60} minutes</Text>
            </View>
          </View>

          {/* Service Info */}
          <View style={styles.serviceSection}>
            <Text style={styles.serviceTitle}>{booking.service_title}</Text>
            <Text style={styles.servicePrice}>${booking.total_price}</Text>
          </View>

          {/* Client Info */}
          <View style={styles.clientSection}>
            <View style={styles.clientAvatar}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{booking.client_name || 'Client'}</Text>
              <Text style={styles.clientContact}>{booking.client_email || booking.client_phone || 'No contact info'}</Text>
            </View>
          </View>

          {/* Location */}
          {booking.location && (
            <View style={styles.locationSection}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.locationText}>{booking.location}</Text>
            </View>
          )}

          {/* Quick Actions */}
          {booking.status === 'pending' && (
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => onStatusChange(booking.id, 'confirmed')}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => onStatusChange(booking.id, 'cancelled')}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const ProviderBookingsScreen = () => {
  const navigation = useNavigation();
  const { profile } = useUser();
  const scrollViewRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    revenue: 0
  });

  const filters = [
    { id: 'all', label: 'All', icon: 'list' },
    { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
    { id: 'pending', label: 'Pending', icon: 'time' },
    { id: 'completed', label: 'Completed', icon: 'checkmark-done' },
  ];

  useFocusEffect(
    useCallback(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      fetchBookings();
    }, [])
  );

  const fetchBookings = async (isRefreshing = false) => {
    if (!profile?.id) return;
    
    if (!isRefreshing) setLoading(true);
    
    try {
      // First, get the bookings for this provider's services
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('service_bookings')
        .select(`
          *,
          services!inner(
            id,
            title,
            price,
            provider_id
          )
        `)
        .eq('services.provider_id', profile.id)
        .order('scheduled_at', { ascending: false });
        
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }
      
      // Get unique user IDs from bookings
      const userIds = [...new Set((bookingsData || []).map(booking => booking.user_id).filter(Boolean))];
      
      // Batch fetch all user profiles
      let userProfilesMap = {};
      if (userIds.length > 0) {
        const { data: userProfiles, error: userError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, phone, avatar_url')
          .in('id', userIds);
          
        if (!userError && userProfiles) {
          userProfilesMap = userProfiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }
      
      // Combine bookings with user profiles
      const data = (bookingsData || []).map(booking => ({
        ...booking,
        user_profiles: userProfilesMap[booking.user_id] || null
      }));
      
      const error = null;
        
      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      // Transform the data
      const transformedBookings = (data || []).map(booking => ({
        id: booking.id,
        service_id: booking.service_id,
        service_title: booking.services?.title || 'Service',
        service_price: booking.services?.price || 0,
        total_price: booking.total_price || booking.services?.price || 0,
        client_id: booking.user_id,
        client_name: booking.user_profiles?.full_name || 'Client',
        client_email: booking.user_profiles?.email,
        client_phone: booking.user_profiles?.phone,
        client_avatar: booking.user_profiles?.avatar_url,
        scheduled_at: booking.scheduled_at,
        duration: booking.duration || 60,
        status: booking.status || 'pending',
        location: booking.location,
        notes: booking.notes,
        created_at: booking.created_at,
        payment_status: booking.payment_status
      }));
      
      setBookings(transformedBookings);
      applyFilter(selectedFilter, transformedBookings);
      calculateStats(transformedBookings);
      
    } catch (error) {
      console.error('Error fetching provider bookings:', error);
      Alert.alert('Error', 'Failed to load bookings. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (bookingsList) => {
    const stats = bookingsList.reduce((acc, booking) => {
      acc.total++;
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      if (booking.status === 'completed' && booking.payment_status === 'paid') {
        acc.revenue += booking.total_price;
      }
      return acc;
    }, { total: 0, pending: 0, confirmed: 0, completed: 0, revenue: 0 });
    
    setStats(stats);
  };

  const applyFilter = (filter, bookingsList = bookings) => {
    let filtered = [...bookingsList];
    
    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(b => 
          isFuture(parseISO(b.scheduled_at)) && 
          ['pending', 'confirmed'].includes(b.status)
        );
        break;
      case 'pending':
        filtered = filtered.filter(b => b.status === 'pending');
        break;
      case 'completed':
        filtered = filtered.filter(b => b.status === 'completed');
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }
    
    setFilteredBookings(filtered);
    setSelectedFilter(filter);
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    Alert.alert(
      'Update Booking Status',
      `Are you sure you want to ${newStatus === 'confirmed' ? 'confirm' : 'cancel'} this booking?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('service_bookings')
                .update({ 
                  status: newStatus,
                  updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);
                
              if (error) throw error;
              
              Alert.alert('Success', `Booking ${newStatus === 'confirmed' ? 'confirmed' : 'cancelled'} successfully`);
              fetchBookings();
              
            } catch (error) {
              console.error('Error updating booking status:', error);
              Alert.alert('Error', 'Failed to update booking status');
            }
          }
        }
      ]
    );
  };

  const handleBookingPress = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-busy" size={64} color="#CCC" />
      <Text style={styles.emptyStateTitle}>No Bookings Yet</Text>
      <Text style={styles.emptyStateText}>
        {selectedFilter === 'all' 
          ? 'Your customer bookings will appear here' 
          : `No ${selectedFilter} bookings found`}
      </Text>
    </View>
  );

  const renderBookingDetails = () => {
    if (!selectedBooking) return null;
    
    return (
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Service Details */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Service</Text>
                <Text style={styles.detailText}>{selectedBooking.service_title}</Text>
                <Text style={styles.detailSubText}>${selectedBooking.total_price}</Text>
              </View>
              
              {/* Schedule Details */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Schedule</Text>
                <Text style={styles.detailText}>
                  {format(parseISO(selectedBooking.scheduled_at), 'EEEE, MMMM d, yyyy')}
                </Text>
                <Text style={styles.detailSubText}>
                  {format(parseISO(selectedBooking.scheduled_at), 'h:mm a')} ({selectedBooking.duration} minutes)
                </Text>
              </View>
              
              {/* Client Details */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Client Information</Text>
                <Text style={styles.detailText}>{selectedBooking.client_name}</Text>
                {selectedBooking.client_email && (
                  <TouchableOpacity style={styles.contactButton}>
                    <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.contactButtonText}>{selectedBooking.client_email}</Text>
                  </TouchableOpacity>
                )}
                {selectedBooking.client_phone && (
                  <TouchableOpacity style={styles.contactButton}>
                    <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.contactButtonText}>{selectedBooking.client_phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Location */}
              {selectedBooking.location && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Location</Text>
                  <Text style={styles.detailText}>{selectedBooking.location}</Text>
                </View>
              )}
              
              {/* Notes */}
              {selectedBooking.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Notes</Text>
                  <Text style={styles.detailText}>{selectedBooking.notes}</Text>
                </View>
              )}
              
              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedBooking.status] }]}>
                  <Text style={styles.statusBadgeText}>
                    {selectedBooking.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            </ScrollView>
            
            {/* Action Buttons */}
            {selectedBooking.status === 'pending' && (
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalActionButton, styles.confirmModalButton]}
                  onPress={() => {
                    setShowDetailsModal(false);
                    handleStatusChange(selectedBooking.id, 'confirmed');
                  }}
                >
                  <Text style={styles.modalActionButtonText}>Confirm Booking</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalActionButton, styles.cancelModalButton]}
                  onPress={() => {
                    setShowDetailsModal(false);
                    handleStatusChange(selectedBooking.id, 'cancelled');
                  }}
                >
                  <Text style={[styles.modalActionButtonText, { color: '#FF3B30' }]}>Cancel Booking</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Customer Bookings"
        navigation={navigation}
        canGoBack={true}
      />
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#1E3A8A', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statsGradient}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.confirmed}</Text>
                <Text style={styles.statLabel}>Confirmed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${stats.revenue}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                selectedFilter === filter.id && styles.filterButtonActive
              ]}
              onPress={() => applyFilter(filter.id)}
            >
              <Ionicons 
                name={filter.icon} 
                size={18} 
                color={selectedFilter === filter.id ? '#FFFFFF' : '#666'} 
              />
              <Text style={[
                styles.filterButtonText,
                selectedFilter === filter.id && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Bookings List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : filteredBookings.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.bookingsList}>
            {filteredBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={handleBookingPress}
                onStatusChange={handleStatusChange}
              />
            ))}
          </View>
        )}
      </ScrollView>
      
      {renderBookingDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statsGradient: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...FONTS.h2,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statLabel: {
    ...FONTS.body4,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    ...FONTS.body4,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  bookingsList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  bookingCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardGradient: {
    overflow: 'hidden',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  statusText: {
    ...FONTS.body5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  dateTimeSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateBox: {
    width: 60,
    height: 60,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  monthText: {
    ...FONTS.body5,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dayText: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  yearText: {
    ...FONTS.body5,
    color: COLORS.primary,
    fontSize: 10,
  },
  timeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  dateLabel: {
    ...FONTS.body5,
    color: '#666',
  },
  timeText: {
    ...FONTS.body3,
    color: '#333',
    fontWeight: '600',
  },
  durationText: {
    ...FONTS.body5,
    color: '#666',
  },
  serviceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    ...FONTS.body3,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  servicePrice: {
    ...FONTS.body3,
    color: COLORS.primary,
    fontWeight: '700',
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...FONTS.body4,
    color: '#333',
    fontWeight: '500',
  },
  clientContact: {
    ...FONTS.body5,
    color: '#666',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    ...FONTS.body5,
    color: '#666',
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    ...FONTS.body4,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    ...FONTS.body3,
    color: '#666',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    ...FONTS.body2,
    color: '#333',
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateText: {
    ...FONTS.body4,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    ...FONTS.h4,
    color: '#333',
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    ...FONTS.body5,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    ...FONTS.body3,
    color: '#333',
    lineHeight: 22,
  },
  detailSubText: {
    ...FONTS.body4,
    color: '#666',
    marginTop: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  contactButtonText: {
    ...FONTS.body4,
    color: COLORS.primary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  statusBadgeText: {
    ...FONTS.body5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  modalActionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmModalButton: {
    backgroundColor: '#34C759',
  },
  cancelModalButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  modalActionButtonText: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProviderBookingsScreen;