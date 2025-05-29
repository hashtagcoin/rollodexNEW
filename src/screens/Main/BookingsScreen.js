import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS } from '../../constants/theme';

const BookingsScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'

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

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
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
