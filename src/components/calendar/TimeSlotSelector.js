import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const TimeSlotSelector = ({ timeSlots = [], onToggle, bookedSlots = [] }) => {
  // Ensure inputs are arrays to prevent errors
  const slots = Array.isArray(timeSlots) ? timeSlots : [];
  const safeBookedSlots = Array.isArray(bookedSlots) ? bookedSlots : [];
  
  console.log('TimeSlotSelector received:', slots.length, 'slots');
  if (slots.length > 0) {
    console.log('Sample slot:', JSON.stringify(slots[0]));
  }
  
  // Group time slots by period
  const morningSlots = slots.filter(slot => slot && slot.period === 'morning');
  const afternoonSlots = slots.filter(slot => slot.period === 'afternoon');
  const eveningSlots = slots.filter(slot => slot.period === 'evening');
  
  console.log(`TimeSlotSelector groups: Morning(${morningSlots.length}), Afternoon(${afternoonSlots.length}), Evening(${eveningSlots.length})`);
  
  // If there are no slots grouped by period, create fallback groups based on time
  const hasPeriodGroups = morningSlots.length > 0 || afternoonSlots.length > 0 || eveningSlots.length > 0;
  
  // Fallback grouping if period information is missing
  let fallbackMorningSlots = [];
  let fallbackAfternoonSlots = [];
  let fallbackEveningSlots = [];
  
  if (!hasPeriodGroups && slots.length > 0) {
    console.log('No period information found, using fallback grouping');
    // Group by time value instead
    fallbackMorningSlots = slots.filter(slot => {
      if (!slot || !slot.timeValue) return false;
      const hour = parseInt(slot.timeValue.split(':')[0]);
      return hour >= 8 && hour < 12;
    });
    
    fallbackAfternoonSlots = slots.filter(slot => {
      if (!slot || !slot.timeValue) return false;
      const hour = parseInt(slot.timeValue.split(':')[0]);
      return hour >= 12 && hour < 17;
    });
    
    fallbackEveningSlots = slots.filter(slot => {
      if (!slot || !slot.timeValue) return false;
      const hour = parseInt(slot.timeValue.split(':')[0]);
      return hour >= 17 && hour <= 20;
    });
    
    console.log(`Fallback groups: Morning(${fallbackMorningSlots.length}), Afternoon(${fallbackAfternoonSlots.length}), Evening(${fallbackEveningSlots.length})`);
  }

  // Check if a slot is booked
  const isSlotBooked = (slot) => {
    if (!slot || !safeBookedSlots.length) return false;
    return safeBookedSlots.some(bookedSlot => {
      return bookedSlot && bookedSlot.timeValue === slot.timeValue;
    });
  };

  // Render a single time slot with Instagram-style UI
  const renderTimeSlot = (slot) => {
    if (!slot) return null;
    
    const booked = isSlotBooked(slot);
    const isAvailable = slot.available && !booked;
    
    // Format the time for display (convert 24h format to 12h format)
    const formattedTime = () => {
      try {
        if (!slot.time) return '';
        const [hours, minutes] = slot.time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHour}:${minutes} ${ampm}`;
      } catch (err) {
        return slot.time; // Fallback to original format
      }
    };
    
    return (
      <TouchableOpacity
        key={slot.id}
        style={[
          styles.timeSlot,
          isAvailable && styles.availableSlot,
          booked && styles.bookedSlot,
          !isAvailable && !booked && styles.unavailableSlot
        ]}
        onPress={(event) => !booked && onToggle(slot, event)}
        disabled={booked}
        activeOpacity={0.7}
      >
        <View style={styles.timeSlotContent}>
          <Text style={[
            styles.timeSlotText,
            isAvailable && styles.availableSlotText,
            booked && styles.bookedSlotText,
            !isAvailable && !booked && styles.unavailableSlotText
          ]}>
            {formattedTime()}
          </Text>
          
          <View style={styles.statusContainer}>
            {/* Instagram-style Status Icons and Labels */}
            {isAvailable && (
              <>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                <Text style={styles.statusText}>Available</Text>
              </>
            )}
            
            {booked && (
              <>
                <Ionicons name="calendar" size={18} color="#e74c3c" />
                <Text style={styles.bookedStatusText}>Booked</Text>
              </>
            )}
            
            {!isAvailable && !booked && (
              <>
                <Ionicons name="close-circle" size={18} color="#95a5a6" />
                <Text style={styles.unavailableStatusText}>Unavailable</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a group of time slots with a title
  const renderTimeSlotGroup = (slots, title, icon, subtitle) => {
    if (!slots || slots.length === 0) return null;
    
    return (
      <View style={styles.timeSlotGroup}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name={icon} size={20} color="#ff9500" />
          </View>
          <View>
            <Text style={styles.sectionHeaderText}>{title}</Text>
            <Text style={styles.sectionSubtext}>{subtitle}</Text>
          </View>
        </View>
        
        <View style={styles.timeSlotsRow}>
          {slots.map(slot => renderTimeSlot(slot))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Available Time Slots</Text>
      <Text style={styles.subtitle}>Tap on time slots to mark them as available</Text>
      
      {/* If we have no slots at all, show a message */}
      {slots.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No time slots available for this date.</Text>
        </View>
      )}
      
      {/* Debug info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Received {slots.length} time slots</Text>
        <Text style={styles.debugText}>Using {hasPeriodGroups ? 'standard' : 'fallback'} grouping</Text>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Use either standard or fallback grouping */}
        {hasPeriodGroups ? (
          // Standard grouping by period property with Instagram-style headers
          <>
            {renderTimeSlotGroup(morningSlots, 'Morning', 'sunny', '8:00 AM - 12:00 PM')}
            {renderTimeSlotGroup(afternoonSlots, 'Afternoon', 'partly-sunny', '12:00 PM - 5:00 PM')}
            {renderTimeSlotGroup(eveningSlots, 'Evening', 'moon', '5:00 PM - 9:00 PM')}
          </>
        ) : (
          // Fallback grouping by time with Instagram-style headers
          <>
            {renderTimeSlotGroup(fallbackMorningSlots, 'Morning', 'sunny', '8:00 AM - 12:00 PM')}
            {renderTimeSlotGroup(fallbackAfternoonSlots, 'Afternoon', 'partly-sunny', '12:00 PM - 5:00 PM')}
            {renderTimeSlotGroup(fallbackEveningSlots, 'Evening', 'moon', '5:00 PM - 9:00 PM')}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10
  },
  debugContainer: {
    padding: 8,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  debugText: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic'
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginVertical: 15,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  timeSlotGroup: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 15,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#888',
  },
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  timeSlot: {
    width: '31%', // About 3 per row with margin
    marginHorizontal: '1%',
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeSlotContent: {
    padding: 12,
    alignItems: 'center',
  },
  availableSlot: {
    backgroundColor: '#e8f5e9', // Light green background (Instagram-style)
  },
  bookedSlot: {
    backgroundColor: '#ffebee', // Light red background
  },
  unavailableSlot: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  availableSlotText: {
    color: '#2e7d32', // Green text
  },
  bookedSlotText: {
    color: '#c62828', // Red text
    fontWeight: 'bold'
  },
  unavailableSlotText: {
    color: '#9e9e9e', // Grey text
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  bookedStatusText: {
    fontSize: 12,
    color: '#e74c3c',
    marginLeft: 4,
    fontWeight: '500',
  },
  unavailableStatusText: {
    fontSize: 12,
    color: '#95a5a6',
    marginLeft: 4,
    fontWeight: '400',
  },
  iconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    zIndex: 2, // Above the gradient
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    padding: 2
  },
  emptyIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    zIndex: 2,
    opacity: 0.6
  },
  // Instagram-style gradient overlay for depth
  overlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 1
  }
});

export default TimeSlotSelector;
