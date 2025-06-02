import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns';
import AppHeader from '../../components/layout/AppHeader';

const ProviderAppointmentsScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Fetch appointments when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [profile, activeTab])
  );
  
  // Fetch provider's appointments
  const fetchAppointments = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Define query based on active tab
      let query = supabase
        .from('bookings_with_details')
        .select('*')
        .eq('provider_id', profile.id);
        
      if (activeTab === 'upcoming') {
        query = query.gte('scheduled_at', now);
      } else if (activeTab === 'past') {
        query = query.lt('scheduled_at', now);
      } // If 'all', don't filter by date
      
      query = query.order('scheduled_at', { ascending: activeTab === 'upcoming' });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching provider appointments:', err);
      Alert.alert('Error', 'Failed to load your appointments');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format appointment date
  const formatAppointmentDate = (dateString) => {
    try {
      const date = parseISO(dateString);
      
      // If today, show "Today at X:XX PM"
      if (isToday(date)) {
        return `Today at ${format(date, 'h:mm a')}`;
      }
      
      return format(date, 'EEE, MMM d, yyyy \'at\' h:mm a');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Date unknown';
    }
  };
  
  // Handle appointment status update
  const updateAppointmentStatus = async (bookingId, newStatus) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      // Update local state
      setAppointments(prev => 
        prev.map(item => 
          item.booking_id === bookingId ? { ...item, status: newStatus } : item
        )
      );
      
      Alert.alert('Success', `Appointment ${newStatus.toLowerCase()} successfully`);
    } catch (err) {
      console.error('Error updating appointment status:', err);
      Alert.alert('Error', 'Failed to update appointment status');
    } finally {
      setLoading(false);
    }
  };
  
  // Render appointment item
  const renderAppointmentItem = ({ item }) => {
    const formattedDate = formatAppointmentDate(item.scheduled_at);
    const isPastAppointment = isPast(parseISO(item.scheduled_at));
    
    return (
      <TouchableOpacity 
        style={styles.appointmentCard}
        onPress={() => navigation.navigate('AppointmentDetail', { bookingId: item.booking_id })}
      >
        <View style={styles.appointmentHeader}>
          <Text style={styles.appointmentService}>{item.service_title}</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: 
              item.status === 'CONFIRMED' ? '#4CAF50' : 
              item.status === 'PENDING' ? '#FF9800' : 
              item.status === 'CANCELED' ? '#F44336' : 
              item.status === 'COMPLETED' ? '#9C27B0' : '#9E9E9E'
          }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={styles.appointmentDate}>
          <Ionicons name="time-outline" size={16} color="#666" /> {formattedDate}
        </Text>
        
        <Text style={styles.appointmentClient}>
          <Ionicons name="person-outline" size={16} color="#666" /> {item.client_name || 'Client'}
        </Text>
        
        {item.booking_notes && (
          <Text style={styles.appointmentNote}>
            <Ionicons name="document-text-outline" size={16} color="#666" /> {item.booking_notes}
          </Text>
        )}
        
        {!isPastAppointment && item.status !== 'CANCELED' && item.status !== 'COMPLETED' && (
          <View style={styles.actionButtonsRow}>
            {item.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => updateAppointmentStatus(item.booking_id, 'CONFIRMED')}
              >
                <Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F44336' }]}
              onPress={() => updateAppointmentStatus(item.booking_id, 'CANCELED')}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            {item.status === 'CONFIRMED' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                onPress={() => updateAppointmentStatus(item.booking_id, 'COMPLETED')}
              >
                <Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <AppHeader
        title="My Appointments"
        navigation={navigation}
        showBackButton={true}
      />
      
      {/* Tab buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTabButton]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'past' && styles.activeTabButton]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'all' && styles.activeTabButton]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Appointments List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.booking_id}
          renderItem={renderAppointmentItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming' ? 'No upcoming appointments' : 
                 activeTab === 'past' ? 'No past appointments' : 
                 'No appointments found'}
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('ProviderCalendar')}
              >
                <Text style={styles.emptyButtonText}>Manage Availability</Text>
              </TouchableOpacity>
            </View>
          )}
          style={styles.flatList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
  },
  tabContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentService: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  appointmentDate: {
    fontSize: 15,
    color: '#444',
    marginBottom: 8,
  },
  appointmentClient: {
    fontSize: 15,
    color: '#444',
    marginBottom: 8,
  },
  appointmentNote: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  flatList: {
    flex: 1,
  },
});

export default ProviderAppointmentsScreen;
