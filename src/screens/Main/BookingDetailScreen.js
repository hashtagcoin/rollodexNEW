import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Share // <-- FIX 1: Added missing Share import
} from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { useRoute } from '@react-navigation/native';
import { format, parseISO, formatDistance, addDays } from 'date-fns';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';

const BookingDetailScreen = ({ navigation }) => {
  const route = useRoute();
  const { bookingId } = route.params || {};
  const { profile } = useUser();

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

          {/* Service Image (if available) */}
          {booking.service_media_urls && booking.service_media_urls.length > 0 && (
            <Image
              source={{ uri: booking.service_media_urls[0] }}
              style={styles.serviceImage}
              resizeMode="cover"
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
              <MaterialIcons name="history" size={20} color="#fff" />
              <Text numberOfLines={1} style={styles.actionButtonText}>{showHistory ? 'Hide' : 'History'}</Text>
            </TouchableOpacity>
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
    </View> // <-- FIX 3: Changed closing tag from </ScrollView> to </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  contentContainer: {
    paddingBottom: 40,
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
    backgroundColor: '#8E8E93',
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
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
  // <-- FIX 4: Removed duplicate and unused styles from here
});

export default BookingDetailScreen;