import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import TimeSlotSelector from './TimeSlotSelector';
import AvailabilityLegend from './AvailabilityLegend';

const { width } = Dimensions.get('window');

// Base time slots that never change - defined outside the component to avoid re-creation
const BASE_TIME_SLOTS = (() => {
  const slots = [];
  let slotId = 1; // Use numeric IDs to ensure uniqueness
  
  // Morning slots (8 AM - 11:30 AM)
  for (let hour = 8; hour < 12; hour++) {
    slots.push({ 
      id: slotId++, 
      time: `${hour % 12 || 12}:00 AM`,
      timeValue: `${hour.toString().padStart(2, '0')}:00:00`,
      period: 'morning'
    });
    slots.push({ 
      id: slotId++, 
      time: `${hour % 12 || 12}:30 AM`,
      timeValue: `${hour.toString().padStart(2, '0')}:30:00`,
      period: 'morning'
    });
  }
  
  // Afternoon slots (12 PM - 4:30 PM)
  for (let hour = 12; hour < 17; hour++) {
    slots.push({ 
      id: slotId++,
      time: `${hour % 12 || 12}:00 PM`,
      timeValue: `${hour.toString().padStart(2, '0')}:00:00`,
      period: 'afternoon'
    });
    slots.push({ 
      id: slotId++,
      time: `${hour % 12 || 12}:30 PM`,
      timeValue: `${hour.toString().padStart(2, '0')}:30:00`,
      period: 'afternoon'
    });
  }
  
  // Evening slots (5 PM - 8:30 PM)
  for (let hour = 17; hour <= 20; hour++) {
    slots.push({ 
      id: slotId++,
      time: `${hour % 12 || 12}:00 PM`,
      timeValue: `${hour.toString().padStart(2, '0')}:00:00`,
      period: 'evening'
    });
    slots.push({ 
      id: slotId++,
      time: `${hour % 12 || 12}:30 PM`,
      timeValue: `${hour.toString().padStart(2, '0')}:30:00`,
      period: 'evening'
    });
  }
  
  console.log(`Generated ${slots.length} base time slots`);
  return slots;
})();

// Log the time slots for debugging
console.log('BASE_TIME_SLOTS periods:', {
  morning: BASE_TIME_SLOTS.filter(s => s.period === 'morning').length,
  afternoon: BASE_TIME_SLOTS.filter(s => s.period === 'afternoon').length,
  evening: BASE_TIME_SLOTS.filter(s => s.period === 'evening').length,
});

const AvailabilityCalendarModal = ({ 
  visible, 
  isVisible, // Added for compatibility with usage in ProviderCalendarScreen
  onClose, 
  selectedDate: initialSelectedDate, 
  onDateChange,
  serviceId,
  providerId,
  availabilityData = [],
  bookedSlots = [],
  onAddAvailability,
  onRemoveAvailability,
  onAvailabilityChange, // Added for compatibility with usage in ProviderCalendarScreen
}) => {
  // Use isVisible prop if visible is not provided (for backward compatibility)
  const modalVisible = visible !== undefined ? visible : isVisible;
  // State for the calendar
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate || new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [lastUpdateSource, setLastUpdateSource] = useState('');
  
  // Navigate to previous month
  const goToPrevMonth = useCallback(() => {
    setSelectedMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
    setLastUpdateSource('month-navigation');
  }, []);
  
  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    setSelectedMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
    setLastUpdateSource('month-navigation');
  }, []);
  
  // Stable function to check if a date has availability set
  const hasAvailability = useCallback((dateString) => {
    if (!dateString || !Array.isArray(availabilityData)) {
      console.log(`No availability data for ${dateString}`);
      return false;
    }
    
    const hasAvail = availabilityData.some(a => 
      a && a.service_id === serviceId && 
      a.date === dateString
    );
    
    console.log(`Checking availability for ${dateString} with serviceId ${serviceId}: ${hasAvail ? 'Available' : 'Not Available'}`);
    return hasAvail;
  }, [availabilityData, serviceId]);
  
  // Stable function to check if a date is today
  const isToday = useCallback((date) => {
    if (!date) return false;
    
    const today = new Date();
    return date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear();
  }, []);
  
  // Get the number of days in a month
  const getDaysInMonth = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    // The 0th day of the next month is the last day of the current month
    return new Date(year, month + 1, 0).getDate();
  }, []);
  
  // Function to generate calendar days for the selected month
  const generateCalendarDays = useCallback(() => {
    console.log('Generating calendar days for month:', selectedMonth.toISOString());
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    
    // Get the first day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(selectedMonth);
    
    // Calculate days from previous month to fill first row
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const days = [];
    
    // Add days from previous month
    const prevMonth = new Date(year, month - 1, 1);
    const daysInPrevMonth = getDaysInMonth(prevMonth);
    
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = daysInPrevMonth - (firstDayOfWeek - i - 1);
      const date = new Date(year, month - 1, day);
      const dateString = formatDateString(date);
      
      days.push({
        date: dateString,
        day: day,
        isCurrentMonth: false,
        isToday: isToday(date),
        hasAvailability: hasAvailability(dateString)
      });
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = formatDateString(date);
      
      days.push({
        date: dateString,
        day: day,
        isCurrentMonth: true,
        isToday: isToday(date),
        hasAvailability: hasAvailability(dateString)
      });
    }
    
    // Fill remaining cells with days from next month
    const totalDaysNeeded = Math.ceil(days.length / 7) * 7;
    const remainingDays = totalDaysNeeded - days.length;
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateString = formatDateString(date);
      
      days.push({
        date: dateString,
        day: day,
        isCurrentMonth: false,
        isToday: isToday(date),
        hasAvailability: hasAvailability(dateString)
      });
    }
    
    console.log(`Generated ${days.length} calendar days`);
    setCalendarDays(days);
  }, [selectedMonth, hasAvailability, isToday]);
  
  // Helper to consistently format date strings
  const formatDateString = (date) => {
    // Ensure we're working with a proper Date object
    if (!(date instanceof Date)) {
      console.error('formatDateString received invalid date:', date);
      return '';
    }
    
    try {
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      // Month is 0-indexed in JS Date, so add 1 and pad with zero if needed
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  
  // Function to update time slots with availability info
  const updateTimeSlotsWithAvailability = useCallback(() => {
    console.log('Updating time slots with availability for date:', selectedDate);
    
    // Always start with the base time slots, even if there's no selected date
    // This ensures the UI always shows something
    const updatedSlots = BASE_TIME_SLOTS.map(baseSlot => {
      // Check if this slot has availability data
      const isAvailable = selectedDate && Array.isArray(availabilityData) && availabilityData.some(a => 
        a && a.service_id === serviceId && 
        a.date === selectedDate && 
        a.time_slot === baseSlot.timeValue
      );
      
      // Return a new slot with availability info
      return {
        ...baseSlot,
        available: isAvailable
      };
    });
    
    // Debug each group of slots
    const morningSlots = updatedSlots.filter(s => s.period === 'morning');
    const afternoonSlots = updatedSlots.filter(s => s.period === 'afternoon');
    const eveningSlots = updatedSlots.filter(s => s.period === 'evening');
    
    console.log(`Generated ${updatedSlots.length} total slots:`);
    console.log(`- Morning: ${morningSlots.length} slots`);
    console.log(`- Afternoon: ${afternoonSlots.length} slots`);
    console.log(`- Evening: ${eveningSlots.length} slots`);
    console.log(`- Available slots: ${updatedSlots.filter(s => s.available).length}`);
    
    // Directly log a few sample slots to check their structure
    if (updatedSlots.length > 0) {
      console.log('Sample slot structure:', JSON.stringify(updatedSlots[0]));
    }
    
    // Important: Always set the time slots state, even if there's no availability data
    setTimeSlots(updatedSlots);
    setLastUpdateSource('update-time-slots');
  }, [selectedDate, availabilityData, serviceId]);
  
  // Select a date from the calendar
  const handleDateSelect = useCallback((date) => {
    if (!date) {
      console.warn('Cannot select date: date is undefined');
      return;
    }
    
    console.log('Selecting date:', date);
    setSelectedDate(date);
    
    // Force re-initialize time slots with base slots for the new date
    setTimeSlots([...BASE_TIME_SLOTS]);
    
    // Update time slots with availability for the new date
    updateTimeSlotsWithAvailability(date);
    
    // Notify parent component about date change
    if (typeof onDateChange === 'function') {
      onDateChange(date);
    }
  }, [onDateChange, updateTimeSlotsWithAvailability]);
  
  // Toggle a time slot's availability status
  const handleTimeSlotToggle = useCallback((slot) => {
    if (!slot || !selectedDate) return;
    
    console.log('Toggling time slot:', slot.time, 'on date:', selectedDate);
    
    // Find if this slot already has availability
    const isCurrentlyAvailable = timeSlots.find(s => 
      s.id === slot.id && s.available
    );
    
    // Update local state immediately for better UX
    setTimeSlots(prevTimeSlots => {
      if (!Array.isArray(prevTimeSlots)) {
        console.warn('Previous time slots is not an array');
        return [];
      }
      
      return prevTimeSlots.map(s => {
        if (s.id === slot.id) {
          return { ...s, available: !s.available };
        }
        return s;
      });
    });
    
    // Prepare the update data for callbacks
    const updateData = {
      service_id: serviceId,
      date: selectedDate,
      time_slot: slot.timeValue
    };
    
    // Call the appropriate callback to update parent component/backend
    if (isCurrentlyAvailable) {
      console.log('Removing availability for slot:', slot.time);
      
      // Support both callback formats for compatibility
      if (typeof onRemoveAvailability === 'function') {
        onRemoveAvailability(selectedDate, slot.timeValue);
      }
      
      // For ProviderCalendarScreen usage
      if (typeof onAvailabilityChange === 'function') {
        onAvailabilityChange('remove', updateData);
      }
    } else {
      console.log('Adding availability for slot:', slot.time);
      
      // Support both callback formats for compatibility
      if (typeof onAddAvailability === 'function') {
        onAddAvailability(selectedDate, slot.timeValue);
      }
      
      // For ProviderCalendarScreen usage
      if (typeof onAvailabilityChange === 'function') {
        onAvailabilityChange('add', updateData);
      }
    }
    
    // Track the update source to help debug re-renders
    setLastUpdateSource('toggle-time-slot');
  }, [selectedDate, timeSlots, serviceId, onRemoveAvailability, onAddAvailability, onAvailabilityChange]);
  
  // Effects triggered only on specific conditions to avoid infinite loops
  
  // 1. Effect for modal visibility
  useEffect(() => {
    if (!modalVisible) return;
    
    console.log('Modal became visible');
    
    // Only set default date if we don't have one already
    if (!selectedDate) {
      const today = new Date();
      const formattedDate = formatDateString(today);
      console.log('Setting default date to today:', formattedDate);
      setSelectedDate(formattedDate);
    }
    
    // Calculate which month to show based on selected date
    const dateToUse = selectedDate ? new Date(selectedDate) : new Date();
    setSelectedMonth(new Date(dateToUse.getFullYear(), dateToUse.getMonth(), 1));
    
    // Always regenerate calendar days when modal becomes visible
    generateCalendarDays();
    
    // Force update time slots
    updateTimeSlotsWithAvailability();
    
    setLastUpdateSource('modal-visible');
  }, [modalVisible, selectedDate, generateCalendarDays, updateTimeSlotsWithAvailability]);
  
  // 2. Effect for generating calendar days when month changes
  useEffect(() => {
    if (!visible) return;
    console.log('Generating calendar days for month:', selectedMonth.toISOString());
    generateCalendarDays();
  }, [visible, selectedMonth, generateCalendarDays]);
  
  // Run only once when component mounts to initialize time slots
  useEffect(() => {
    console.log('Initializing time slots on mount');
    // Initialize with base time slots
    setTimeSlots([...BASE_TIME_SLOTS]);
  }, []);
  
  // Separate useEffect to update availability when necessary dependencies change
  useEffect(() => {
    if (!visible) return;
    
    console.log('Running availability update for date:', selectedDate);
    console.log('Availability data count:', availabilityData?.length || 0);
    
    // Update time slots with availability
    updateTimeSlotsWithAvailability();
  }, [visible, selectedDate, availabilityData, serviceId, updateTimeSlotsWithAvailability]);
  
  // Weekday names
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Handle close with proper cleanup
  const handleClose = useCallback(() => {
    console.log('Modal close requested - ensuring all callbacks are called');
    
    // First call onAvailabilityChange with 'close' action if it exists
    if (typeof onAvailabilityChange === 'function') {
      console.log('Calling onAvailabilityChange with close action');
      onAvailabilityChange('close');
      return; // Let the parent handle the actual closing
    }
    
    // Fallback to the standard onClose if onAvailabilityChange doesn't exist
    if (typeof onClose === 'function') {
      console.log('Calling standard onClose function');
      onClose();
    }
  }, [onClose, onAvailabilityChange]);
  
  // Render the modal
  return (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Manage Availability</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.scrollContent}>
            {/* Month Navigation */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <TouchableOpacity onPress={goToPrevMonth}>
                <AntDesign name="left" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              
              <TouchableOpacity onPress={goToNextMonth}>
                <AntDesign name="right" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Weekday Headers */}
            <View style={styles.calendarHeader}>
              {weekdays.map((day, index) => (
                <Text key={index} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>
            
            {/* Calendar Days Grid */}
            <View style={styles.daysGrid}>
              {Array.isArray(calendarDays) ? calendarDays.map((day, index) => {
                if (!day) return null;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      !day.isCurrentMonth && styles.otherMonthDay,
                      day.isToday && styles.today,
                      day.date === selectedDate && styles.selectedDay,
                      day.hasAvailability && styles.dayWithAvailability
                    ]}
                    onPress={() => handleDateSelect(day.date)}
                    disabled={!day.isCurrentMonth}
                  >
                    <Text style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.otherMonthText,
                      day.isToday && styles.todayText,
                      day.date === selectedDate && styles.selectedDayText
                    ]}>
                      {day.day}
                    </Text>
                    
                    {day.hasAvailability && (
                      <View style={styles.availabilityDot} />
                    )}
                  </TouchableOpacity>
                );
              }) : null}
            </View>
            
            {/* Selected Date Display */}
            {selectedDate && (
              <View style={styles.selectedDateContainer}>
                <Text style={styles.selectedDateText}>
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            )}
            
            {/* Time Slots Section */}
            {selectedDate && (
              <View style={styles.timeSlotSection}>
                <Text style={styles.sectionTitle}>Manage Time Slots</Text>
                <Text style={styles.sectionSubtitle}>Toggle slots to mark them as available</Text>
                
                <AvailabilityLegend />
                
                {/* Display time slot count for debugging */}
                <Text style={styles.debugText}>
                  {timeSlots && Array.isArray(timeSlots) ? 
                    `${timeSlots.length} time slots available (${timeSlots.filter(s => s?.available).length} marked available)` : 
                    'No time slots generated'}
                </Text>
                
                {/* Debug info */}
                <View style={{padding: 10, backgroundColor: '#f5f5f5', borderRadius: 5, marginBottom: 10}}>
                  <Text>Debug info:</Text>
                  <Text>Time slots array length: {timeSlots?.length || 0}</Text>
                  <Text>Morning slots: {timeSlots?.filter(s => s?.period === 'morning')?.length || 0}</Text>
                  <Text>Afternoon slots: {timeSlots?.filter(s => s?.period === 'afternoon')?.length || 0}</Text>
                  <Text>Evening slots: {timeSlots?.filter(s => s?.period === 'evening')?.length || 0}</Text>
                </View>
                
                <View style={styles.timeSlotContainer}>
                  <TimeSlotSelector 
                    timeSlots={timeSlots}
                    onToggle={handleTimeSlotToggle}
                    bookedSlots={Array.isArray(bookedSlots) ? bookedSlots : []}
                  />
                </View>
                
                {/* Instructions */}
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsText}>
                    <Text style={{fontWeight: 'bold'}}>Tip:</Text> Tap on any time slot to mark it as available for bookings.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
          
          {/* Actions Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.footerCloseButton}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 15,
  },
  calendarHeader: {
    flexDirection: 'row',
  },
  weekdayText: {
    width: (width * 0.9 - 30) / 7,
    textAlign: 'center',
    fontWeight: '500',
    color: COLORS.darkGray,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  dayCell: {
    width: (width * 0.9 - 30) / 7,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  dayText: {
    fontWeight: '500',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: COLORS.darkGray,
  },
  today: {
    backgroundColor: '#e6f7ff',
    borderRadius: 20,
  },
  todayText: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  selectedDay: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayWithAvailability: {
    position: 'relative',
  },
  availabilityDot: {
    position: 'absolute',
    bottom: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  selectedDateContainer: {
    marginBottom: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: COLORS.primary,
  },
  timeSlotSection: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 15,
  },
  timeSlotContainer: {
    marginTop: 10,
    minHeight: 500, // Increased height to ensure visibility
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  instructionsContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  debugText: {
    fontSize: 12,
    color: COLORS.accent,
    marginVertical: 5,
    fontStyle: 'italic',
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    position: 'absolute',
    bottom: 2,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  footerCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  cancelButtonText: {
    color: COLORS.darkGray,
    fontWeight: '500',
  },
});

export default AvailabilityCalendarModal;
