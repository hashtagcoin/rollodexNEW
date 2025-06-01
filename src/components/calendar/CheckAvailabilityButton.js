import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

const CheckAvailabilityButton = ({ serviceId, serviceData }) => {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCheckAvailability = () => {
    // Instead of showing modal, navigate directly to BookingsScreen with selected service
    navigation.navigate('BookingsScreen', { 
      screen: 'BookingsMain',
      params: { 
        serviceId: serviceId,
        serviceData: serviceData,
        isBooking: true // Flag to indicate we're in booking flow
      }
    });
  };

  return (
    <TouchableOpacity
      style={styles.checkAvailabilityButton}
      onPress={handleCheckAvailability}
    >
      <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
      <Text style={styles.checkAvailabilityText}>Check Availability</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  checkAvailabilityButton: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  checkAvailabilityText: {
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  }
});

export default CheckAvailabilityButton;
