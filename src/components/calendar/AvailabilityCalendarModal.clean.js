import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  Alert
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import TimeSlotSelector from './TimeSlotSelector';
import AvailabilityLegend from './AvailabilityLegend';

const { width } = Dimensions.get('window');

/**
 * AvailabilityCalendarModal - Instagram-style modal for setting availability
 * Completely rewritten to eliminate infinite loop issues
 */
const AvailabilityCalendarModal = ({ 
  visible, 
  onClose, 
  selectedDate, 
  onDateChange,
  serviceId,
  providerId,
  availabilityData = [],
  onAddAvailability,
  onRemoveAvailability,
  bookedSlots = []
}) => {
  // Debug counter to track renders
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`RENDER #${renderCount.current}`, { visible, selectedDate, serviceId, providerId });

  // Core state variables with stable initialization
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Initialize once with the selected date or current date
    const date = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  
  const [calendarDays, setCalendarDays] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  
  // Helper to check if a date is today (memoized for performance)
  const isToday = useCallback((date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }, []);
  
  // Check if a date has any availability slots (memoized for performance)
  const checkDateHasAvailability = useCallback((dateString) => {
    if (!Array.isArray(availabilityData) || availabilityData.length === 0) return false;
    
    return availabilityData.some(slot => 
      slot && slot.service_id === serviceId &&
      slot.date === dateString
    );
  }, [availabilityData, serviceId]);
  
  // Generate time slots (stable reference with useCallback)
  const generateTimeSlots = useCallback(() => {
    const slots = [];
    
    // Morning slots (8 AM - 11 AM)
    for (let hour = 8; hour <= 11; hour++) {
      slots.push({ 
        id: `${hour}:00`, 
        time: `${hour}:00 AM`, 
        available: false,
        timeValue: `${hour.toString().padStart(2, '0')}:00:00`
      });
      slots.push({ 
        id: `${hour}:30`, 
        time: `${hour}:30 AM`, 
        available: false,
        timeValue: `${hour.toString().padStart(2, '0')}:30:00`
      });
    }
    
    // Afternoon slots (12 PM - 5 PM)
    slots.push({ 
      id: '12:00', 
      time: '12:00 PM', 
      available: false,
      timeValue: '12:00:00'
    });
    slots.push({ 
      id: '12:30', 
      time: '12:30 PM', 
      available: false,
      timeValue: '12:30:00'
    });
    
    for (let hour = 1; hour <= 5; hour++) {
      slots.push({ 
        id: `${hour + 12}:00`, 
        time: `${hour}:00 PM`, 
        available: false,
        timeValue: `${(hour + 12).toString().padStart(2, '0')}:00:00`
      });
      slots.push({ 
        id: `${hour + 12}:30`, 
        time: `${hour}:30 PM`, 
        available: false,
        timeValue: `${(hour + 12).toString().padStart(2, '0')}:30:00`
      });
    }
    
    // Evening slots (6 PM - 9 PM)
    for (let hour = 6; hour <= 9; hour++) {
      slots.push({ 
        id: `${hour + 12}:00`, 
        time: `${hour}:00 PM`, 
        available: false,
        timeValue: `${(hour + 12).toString().padStart(2, '0')}:00:00`
      });
      slots.push({ 
        id: `${hour + 12}:30`, 
        time: `${hour}:30 PM`, 
        available: false,
        timeValue: `${(hour + 12).toString().padStart(2, '0')}:30:00`
      });
    }
    
    return slots;
  }, []);
  
  // Generate calendar days (stable reference with useCallback)
  const generateCalendarDays = useCallback((date) => {
    if (!date) return [];
    
    const days = [];
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Previous month's days to fill the first row
    const previousMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = previousMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        dateString: date.toISOString().split('T')[0],
      });
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        day,
        isCurrentMonth: true,
        dateString: date.toISOString().split('T')[0],
      });
    }
    
    // Next month's days to fill the last row
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        days.push({
          date,
          day,
          isCurrentMonth: false,
          dateString: date.toISOString().split('T')[0],
        });
      }
    }
    
    return days;
  }, []);
  
  // Handler for date selection
  const handleDateSelect = useCallback((dateString) => {
    if (dateString && onDateChange) {
      console.log('Date selected:', dateString);
      onDateChange(dateString);
    }
  }, [onDateChange]);
  
  // Handler for time slot toggling
  const handleTimeSlotToggle = useCallback((slot) => {
    console.log('Time slot toggled:', slot);
    if (!selectedDate || !slot || !serviceId || !providerId) {
      console.warn('Missing required data for toggling time slot');
      return;
    }
    
    // Check if the slot is already available
    const isSlotAvailable = timeSlots.find(ts => ts.id === slot.id)?.available || false;
    
    // Prepare the availability data
    const updatedSlot = {
      service_id: serviceId,
      provider_id: providerId,
      date: selectedDate,
      time: slot.timeValue,
    };
    
    // Call the appropriate handler based on current state
    if (isSlotAvailable) {
      if (onRemoveAvailability) {
        onRemoveAvailability(updatedSlot);
      }
    } else {
      if (onAddAvailability) {
        onAddAvailability(updatedSlot);
      }
    }
    
    // Update local state immediately for responsiveness
    setTimeSlots(prevTimeSlots => {
      if (!Array.isArray(prevTimeSlots)) {
        console.warn('prevTimeSlots is not an array');
        return [];
      }
      
      return prevTimeSlots.map(ts => {
        if (ts && ts.id === slot.id) {
          return {
            ...ts,
            available: !isSlotAvailable
          };
        }
        return ts;
      });
    });
  }, [selectedDate, serviceId, providerId, timeSlots, onRemoveAvailability, onAddAvailability]);
  
  // Set up calendar and slots when modal becomes visible
  useEffect(() => {
    if (visible) {
      console.log('Modal became visible, initializing...');
      
      // Set up the month display
      const date = selectedDate ? new Date(selectedDate) : new Date();
      setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      
      // Generate initial time slots
      setTimeSlots(generateTimeSlots());
    }
  }, [visible, selectedDate, generateTimeSlots]);
  
  // Update calendar days when month changes
  useEffect(() => {
    if (selectedMonth) {
      const days = generateCalendarDays(selectedMonth);
      setCalendarDays(days);
    }
  }, [selectedMonth, generateCalendarDays]);
  
  // Update time slot availability when selected date changes
  useEffect(() => {
    if (!selectedDate || !timeSlots.length) return;
    
    console.log('Updating time slot availability for date:', selectedDate);
    
    // Mark slots as available if they exist in the availabilityData
    setTimeSlots(prevTimeSlots => {
      return prevTimeSlots.map(slot => {
        const isAvailable = availabilityData.some(
          avail => avail.date === selectedDate && 
                  avail.time === slot.timeValue && 
                  avail.service_id === serviceId
        );
        
        return {
          ...slot,
          available: isAvailable
        };
      });
    });
  }, [selectedDate, availabilityData, serviceId, timeSlots.length]);
  
  // Navigate to previous month
  const goToPrevMonth = useCallback(() => {
    setSelectedMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  }, []);
  
  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    setSelectedMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  }, []);
  
  // Format the month title
  const monthTitle = useMemo(() => {
    if (!selectedMonth) return '';
    
    const options = { month: 'long', year: 'numeric' };
    return selectedMonth.toLocaleDateString('en-US', options);
  }, [selectedMonth]);
  
  // Weekday header names
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Handle close button press
  const handleClosePress = useCallback(() => {
    console.log('Close button pressed');
    if (onClose) {
      onClose();
    }
  }, [onClose]);
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClosePress}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header with close button */}
          <View style={styles.header}>
            <Text style={styles.title}>Set Availability</Text>
            <TouchableOpacity onPress={handleClosePress} style={styles.closeButton}>
              <AntDesign name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            {/* Calendar section */}
            <View style={styles.calendarContainer}>
              {/* Month navigation */}
              <View style={styles.monthNavigation}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                  <AntDesign name="left" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthTitle}</Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                  <AntDesign name="right" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              {/* Weekday headers */}
              <View style={styles.weekdayHeader}>
                {weekdays.map(day => (
                  <Text key={day} style={styles.weekdayText}>{day}</Text>
                ))}
              </View>
              
              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      day.isCurrentMonth ? styles.currentMonthDay : styles.otherMonthDay,
                      selectedDate === day.dateString && styles.selectedDay,
                      isToday(day.date) && styles.today
                    ]}
                    onPress={() => handleDateSelect(day.dateString)}
                    disabled={!day.isCurrentMonth}
                  >
                    <Text style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.otherMonthDayText,
                      selectedDate === day.dateString && styles.selectedDayText,
                      isToday(day.date) && styles.todayText
                    ]}>
                      {day.day}
                    </Text>
                    
                    {/* Availability indicator */}
                    {checkDateHasAvailability(day.dateString) && (
                      <View style={styles.availabilityDot} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Time slots section */}
            {selectedDate && (
              <View style={styles.timeSlotSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Time Slots</Text>
                  <Text style={styles.sectionSubtitle}>
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
                
                <TimeSlotSelector
                  timeSlots={timeSlots}
                  onToggleTimeSlot={handleTimeSlotToggle}
                />
                
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsText}>
                    Tap on time slots to mark when you're available. Green slots indicate times you're available.
                  </Text>
                </View>
                
                <AvailabilityLegend />
              </View>
            )}
          </ScrollView>
          
          {/* Footer with close button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClosePress}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 5,
  },
  calendarContainer: {
    padding: 15,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  navButton: {
    padding: 10,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.darkGray,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100/7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    position: 'relative',
  },
  dayText: {
    fontSize: 14,
    color: COLORS.text,
  },
  currentMonthDay: {
    backgroundColor: '#fff',
  },
  otherMonthDay: {
    backgroundColor: '#f9f9f9',
  },
  otherMonthDayText: {
    color: '#ccc',
  },
  selectedDay: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  today: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  timeSlotSection: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionHeader: {
    marginBottom: 15,
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
  availabilityDot: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    position: 'absolute',
    bottom: 2,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: '500'
  }
});

export default AvailabilityCalendarModal;
