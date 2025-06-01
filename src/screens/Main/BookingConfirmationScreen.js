import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import useBookings from '../../hooks/useBookings';

const BookingConfirmationScreen = ({ route }) => {
  const navigation = useNavigation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  
  // Extract booking details from route params
  const { serviceData, selectedTimeSlot, selectedDate } = route.params || {};
  const { createBooking } = useBookings(profile?.id);

  // Format the selected date and time for display
  const formattedDate = selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM d, yyyy') : 'Unknown Date';
  
  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!profile?.id || !serviceData?.id || !selectedTimeSlot || !selectedDate) {
      Alert.alert('Error', 'Missing booking information');
      return;
    }
    
    setLoading(true);
    try {
      const booking = await createBooking(serviceData.id, selectedTimeSlot, selectedDate);
      
      if (booking) {
        // Success - show confirmation and navigate to bookings list
        Alert.alert(
          'Booking Confirmed!',
          'Your booking request has been sent to the service provider.',
          [
            {
              text: 'View My Bookings',
              onPress: () => navigation.navigate('BookingsScreen', { screen: 'BookingsMain' })
            }
          ]
        );
      } else {
        throw new Error('Failed to create booking');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!serviceData || !selectedTimeSlot || !selectedDate) {
    return (
      <View style={styles.container}>
        <AppHeader title="Booking Confirmation" navigation={navigation} canGoBack={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Missing booking information</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Booking Confirmation" 
        navigation={navigation} 
        canGoBack={true}
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Service Info Card */}
        <View style={styles.serviceCard}>
          <Image 
            source={{ 
              uri: serviceData.media_urls?.[0] || 
              'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/therapy/1.png' 
            }} 
            style={styles.serviceImage}
            resizeMode="cover"
          />
          
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{serviceData.title || 'Service'}</Text>
            <Text style={styles.serviceProvider}>{serviceData.business_name || 'Provider'}</Text>
            
            {serviceData.price && (
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>${serviceData.price}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Booking Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formattedDate}</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{selectedTimeSlot.displayTime}</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Format</Text>
              <Text style={styles.detailValue}>{serviceData.format || 'In Person'}</Text>
            </View>
          </View>
        </View>
        
        {/* Summary Section */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>${serviceData.price || '0.00'}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee (20%)</Text>
            <Text style={styles.summaryValue}>
              ${((serviceData.price || 0) * 0.2).toFixed(2)}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              ${((serviceData.price || 0) * 1.2).toFixed(2)}
            </Text>
          </View>
        </View>
        
        {/* Cancellation Policy */}
        <View style={styles.policyContainer}>
          <Text style={styles.sectionTitle}>Cancellation Policy</Text>
          <Text style={styles.policyText}>
            Free cancellation up to 24 hours before your booking. 
            Cancellations made less than 24 hours in advance may be subject to fees.
          </Text>
        </View>
      </ScrollView>
      
      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Change Time</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.confirmButton, loading && styles.disabledButton]}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 150,
  },
  serviceInfo: {
    padding: 15,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  serviceProvider: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceTag: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: COLORS.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  priceText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  policyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  policyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    padding: 15,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default BookingConfirmationScreen;
