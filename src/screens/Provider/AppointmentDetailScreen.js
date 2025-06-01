import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { COLORS, FONTS } from '../../constants/theme';

// Safe date parser to handle potentially invalid date strings
const safelyFormatDate = (dateString, formatStr = 'PPP, p') => {
  try {
    if (!dateString) return 'Not specified';
    
    // Try to parse the date string safely
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    
    // Check if the date is valid
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

const AppointmentDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings_with_provider_details')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error) throw error;
      
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      Alert.alert('Error', 'Failed to load appointment details.');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (newStatus) => {
    try {
      setStatusUpdateLoading(true);
      
      const { error } = await supabase
        .from('service_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Update local state with new status
      setBooking(prev => ({ ...prev, status: newStatus }));
      Alert.alert('Success', `Appointment ${newStatus.toLowerCase()} successfully.`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update appointment status.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleNotes = async (notes) => {
    try {
      setStatusUpdateLoading(true);
      
      const { error } = await supabase
        .from('service_bookings')
        .update({ provider_notes: notes })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Update local state with new notes
      setBooking(prev => ({ ...prev, provider_notes: notes }));
      Alert.alert('Success', 'Notes updated successfully.');
    } catch (error) {
      console.error('Error updating provider notes:', error);
      Alert.alert('Error', 'Failed to update notes.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const renderStatusActions = () => {
    if (!booking) return null;

    switch (booking.status) {
      case 'PENDING':
        return (
          <View style={styles.actionButtons}>
            <Button 
              title="Confirm" 
              onPress={() => updateBookingStatus('CONFIRMED')}
              loading={statusUpdateLoading}
              style={styles.confirmButton}
            />
            <Button 
              title="Decline" 
              onPress={() => updateBookingStatus('DECLINED')}
              loading={statusUpdateLoading}
              style={styles.declineButton}
              textStyle={{ color: COLORS.primary }}
              outlined
            />
          </View>
        );
      case 'CONFIRMED':
        return (
          <View style={styles.actionButtons}>
            <Button 
              title="Complete" 
              onPress={() => updateBookingStatus('COMPLETED')}
              loading={statusUpdateLoading}
              style={styles.confirmButton}
            />
            <Button 
              title="Cancel" 
              onPress={() => updateBookingStatus('CANCELLED')}
              loading={statusUpdateLoading}
              style={styles.declineButton}
              textStyle={{ color: COLORS.primary }}
              outlined
            />
          </View>
        );
      case 'COMPLETED':
      case 'DECLINED':
      case 'CANCELLED':
        return (
          <View style={styles.completedContainer}>
            <Text style={styles.statusCompletedText}>
              This appointment is {booking.status.toLowerCase()}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderStatusBadge = () => {
    if (!booking) return null;

    const statusColors = {
      'PENDING': { bg: '#FFF9C4', text: '#F57F17' },
      'CONFIRMED': { bg: '#E0F7FA', text: '#0097A7' },
      'COMPLETED': { bg: '#E8F5E9', text: '#388E3C' },
      'CANCELLED': { bg: '#FFEBEE', text: '#D32F2F' },
      'DECLINED': { bg: '#FFEBEE', text: '#D32F2F' }
    };

    const statusColor = statusColors[booking.status] || { bg: '#F5F5F5', text: '#757575' };

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
        <Text style={[styles.statusText, { color: statusColor.text }]}>
          {booking.status}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AppHeader title="Appointment Details" showBack onBack={() => navigation.goBack()} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <AppHeader title="Appointment Details" showBack onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={COLORS.gray} />
          <Text style={styles.errorText}>Appointment not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Appointment Details" 
        showBack 
        onBack={() => navigation.goBack()} 
      />

      <ScrollView style={styles.scrollContainer}>
        {/* Status Badge */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{booking.service_title}</Text>
          {renderStatusBadge()}
        </View>

        {/* Client Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Client Information</Text>
          </View>
          <View style={styles.clientInfoContainer}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: booking.client_avatar || 'https://via.placeholder.com/100' }} 
                style={styles.avatar}
              />
            </View>
            <View style={styles.clientDetails}>
              <Text style={styles.clientName}>{booking.client_name}</Text>
            </View>
          </View>
        </Card>

        {/* Appointment Details */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Appointment Details</Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Feather name="calendar" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {booking.scheduled_at ? safelyFormatDate(booking.scheduled_at) : 'Not set'}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <FontAwesome5 name="tags" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Service Category</Text>
              <Text style={styles.detailValue}>{booking.service_category || 'Not specified'}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <FontAwesome5 name="dollar-sign" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Payment</Text>
              <Text style={styles.detailValue}>
                ${booking.total_price ? booking.total_price.toFixed(2) : '0.00'} 
                {booking.ndis_covered_amount > 0 && ` (${booking.ndis_covered_amount.toFixed(2)} NDIS, ${booking.gap_payment.toFixed(2)} gap)`}
              </Text>
            </View>
          </View>
          
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Client Notes</Text>
            <View style={styles.notesContent}>
              <Text style={styles.notes}>
                {booking.notes || 'No notes provided'}
              </Text>
            </View>
          </View>

          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Provider Notes</Text>
            <TouchableOpacity 
              style={styles.notesContent}
              onPress={() => {
                Alert.prompt(
                  'Update Notes',
                  'Add or edit notes for this appointment',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Save', onPress: handleNotes }
                  ],
                  'plain-text',
                  booking.provider_notes || ''
                );
              }}
            >
              <Text style={styles.notes}>
                {booking.provider_notes || 'Tap to add notes'}
              </Text>
              <Feather name="edit" size={16} color={COLORS.primary} style={styles.editIcon} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Status Actions */}
        {renderStatusActions()}

        {/* Additional Actions */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Additional Actions</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('ServiceAgreements')}
          >
            <Feather name="file-text" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Manage Service Agreement</Text>
            <Feather name="chevron-right" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('ProviderCalendar')}
          >
            <Feather name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Update Availability</Text>
            <Feather name="chevron-right" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  notesContainer: {
    padding: 16,
  },
  notesLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
  },
  notesContent: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    flexDirection: 'row',
  },
  notes: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  editIcon: {
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  confirmButton: {
    flex: 1,
    marginRight: 8,
  },
  declineButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  completedContainer: {
    backgroundColor: '#F1F1F1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusCompletedText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
});

export default AppointmentDetailScreen;
