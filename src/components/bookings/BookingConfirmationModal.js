import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BookingConfirmationModal = ({
  visible,
  onClose,
  bookingData,
  navigateToExplore
}) => {
  // Format currency amounts
  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Format date 
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!bookingData) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header with success icon */}
          <View style={styles.successHeader}>
            <View style={styles.successIconContainer}>
              <Feather name="check" size={50} color="white" />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Service Image */}
            {bookingData.service_media_url && (
              <Image 
                source={{ uri: bookingData.service_media_url }} 
                style={styles.serviceImage}
                resizeMode="cover"
              />
            )}

            {/* Booking Details */}
            <View style={styles.detailsContainer}>
              <Text style={styles.bookingTitle}>{bookingData.service_title}</Text>
              <Text style={styles.bookingProvider}>{bookingData.provider_name}</Text>
              
              <View style={styles.divider} />
              
              {/* Date and Time */}
              <View style={styles.detailRow}>
                <Feather name="calendar" size={18} color="#2E7D32" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailText}>
                    {formatDate(bookingData.scheduled_at)}
                  </Text>
                  {bookingData.duration && (
                    <View style={styles.additionalDetailRow}>
                      <Feather name="clock" size={14} color="#666" style={styles.smallIcon} />
                      <Text style={styles.additionalDetailText}>
                        {bookingData.duration}
                      </Text>
                    </View>
                  )}
                  {bookingData.format && (
                    <View style={styles.additionalDetailRow}>
                      <Feather 
                        name={bookingData.format === 'Online' ? 'video' : 'map-pin'} 
                        size={14} 
                        color="#666" 
                        style={styles.smallIcon} 
                      />
                      <Text style={styles.additionalDetailText}>
                        {bookingData.format}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Price Breakdown */}
              <View style={styles.priceContainer}>
                <Text style={styles.priceTitle}>Price Details</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Service Cost</Text>
                  <Text style={styles.priceValue}>{formatCurrency(bookingData.total_price)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>NDIS Covered</Text>
                  <Text style={styles.ndisValue}>{formatCurrency(bookingData.ndis_covered_amount)}</Text>
                </View>
                {bookingData.gap_payment > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Gap Payment</Text>
                    <Text style={styles.gapValue}>{formatCurrency(bookingData.gap_payment)}</Text>
                  </View>
                )}
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total You Pay</Text>
                  <Text style={styles.totalValue}>{formatCurrency(bookingData.gap_payment)}</Text>
                </View>
              </View>

              {/* Booking Reference */}
              <View style={styles.referenceContainer}>
                <Text style={styles.referenceLabel}>Booking Reference</Text>
                <Text style={styles.referenceValue}>{bookingData.id.substring(0, 8)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={navigateToExplore}
            >
              <Text style={styles.primaryButtonText}>Return to Explore</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  successHeader: {
    backgroundColor: '#2E7D32',
    padding: 20,
    alignItems: 'center',
    paddingTop: 35,
    paddingBottom: 25,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollContent: {
    maxHeight: 400,
  },
  serviceImage: {
    width: '100%',
    height: 150,
  },
  detailsContainer: {
    padding: 20,
  },
  bookingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  bookingProvider: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailTextContainer: {
    marginLeft: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
  },
  additionalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  smallIcon: {
    marginRight: 6,
  },
  additionalDetailText: {
    fontSize: 13,
    color: '#666',
  },
  priceContainer: {
    marginTop: 20,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
  },
  priceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 15,
    color: '#333',
  },
  ndisValue: {
    fontSize: 15,
    color: '#2E7D32',
  },
  gapValue: {
    fontSize: 15,
    color: '#E53935',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  referenceContainer: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  referenceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  referenceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BookingConfirmationModal;
