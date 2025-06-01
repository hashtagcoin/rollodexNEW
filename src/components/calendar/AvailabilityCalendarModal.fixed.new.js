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

const AvailabilityCalendarModal = ({ 
  visible, 
  onClose, 
  selectedDate: initialSelectedDate, 
  onDateChange,
  serviceId,
  providerId,
  availabilityData = [],
  bookedSlots = [],
  onAddAvailability,
  onRemoveAvailability
}) => {
  // State for the calendar
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate || new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState([]);
  
  // Check if a date has availability (memoized)
  const checkDateHasAvailability = useMemo(() => {
    return (dateString) => {
      if (!dateString || !Array.isArray(availabilityData)) return false;
      
      return availabilityData.some(a => 
        a && a.service_id === serviceId && 
        a.date === dateString
      );
    };
  }, [availabilityData, serviceId]);
  
  // Check if a date is today (memoized)
  const isToday = useMemo(() => {
    return (date) => {
      if (!date) return false;
      
      const today = new Date();
      return date.getDate() === today.getDate() && 
        date.getMonth() === today.getMonth() && 
        date.getFullYear() === today.getFullYear();
    };
  }, []);
  
  // Generate time slots for the selected date
  const generateTimeSlots = useMemo(() => () => {
    if (!selectedDate) {
      console.log('No selected date, cannot generate time slots');
      return [];
    }
    
    const slots = [];
    
    // Morning slots (8 AM - 11:30 AM)
    for (let hour = 8; hour < 12; hour++) {
      slots.push({ 
        id: `${hour}:00`, 
        time: `${hour}:00 AM`, 
        available: false,
        timeValue: `${hour.toString().padStart(2, '0')}:00:00`,
        period: 'morning'
      });
      slots.push({ 
        id: `${hour}:30`, 
        time: `${hour}:30 AM`, 
        available: false,
        timeValue: `${hour.toString().padStart(2, '0')}:30:00`,
        period: 'morning'
      });
    }
    
    // Noon (12 PM)
    slots.push({ 
      id: `12:00`, 
      time: `12:00 PM`, 
      available: false,
      timeValue: `12:00:00`,
      period: 'afternoon'
    });
    slots.push({ 
      id: `12:30`, 
      time: `12:30 PM`, 
      available: false,
      timeValue: `12:30:00`,
      period: 'afternoon'
    });
    
    // Afternoon slots (1 PM - 4:30 PM)
    for (let hour = 1; hour < 5; hour++) {
      slots.push({ 
        id: `${hour + 12}:00`, 
        time: `${hour}:00 PM`, 
        available: false,
        timeValue: `${(hour + 12).toString().padStart(2, '0')}:00:00`,
        period: 'afternoon'
      });
      slots.push({ 
        id: `${hour + 12}:30`, 
        time: `${hour}:30 PM`, 
        available: false,
        timeValue: `${(hour + 12).toString().padStart(2, '0')}:30:00`,
        period: 'afternoon'
      });
    }
    
    // Evening slots (5 PM - 8 PM)
    for (let hour = 5; hour <= 8; hour++) {
      slots.push({ 
        id: `${hour + 12}:00`, 
        time: `${hour}:00 PM`, 
        available: false,
        timeValue: `${(hour + 12).toString().padStart(2, '0')}:00:00`,
        period: 'evening'
      });
      slots.push({ 
        id: `${hour + 12}:30`, 
        time: `${hour}:30 PM`, 
        available: false,
        timeValue: `${(hour + 12).toString().padStart(2, '0')}:30:00`,
        period: 'evening'
      });
    }
    
    // Check existing availability
    if (selectedDate && Array.isArray(availabilityData) && availabilityData.length > 0) {
      console.log('Checking availability for', selectedDate, 'with', availabilityData.length, 'slots');
      
      slots.forEach(slot => {
        if (!slot) return;
        
        const foundSlot = availabilityData.find(a => 
          a && a.service_id === serviceId && 
          a.date === selectedDate && 
          a.time_slot === slot.timeValue
        );
        
        slot.available = foundSlot ? true : false;
      });
    }
    
    console.log('Generated', slots.length, 'time slots');
    return slots;
  }, [selectedDate, availabilityData, serviceId]);
  
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
  
  // Handle date selection
  const handleDateSelect = useCallback((dateString) => {
    console.log('Date selected:', dateString);
    
    // Update the selected date
    setSelectedDate(dateString);
    
    if (typeof onDateChange === 'function') {
      onDateChange(dateString);
    }
    
    // Note: We don't need to manually generate time slots here anymore
    // as the useEffect hook will handle this when selectedDate changes
  }, [onDateChange]);
  
  // Handle time slot toggle
  const handleTimeSlotToggle = useCallback((slot) => {
    if (!slot || !selectedDate) {
      console.warn('Cannot toggle slot: slot or selectedDate is undefined');
      return;
    }
    
    console.log('Toggling time slot:', slot.time, 'for date:', selectedDate);
    
    const isSlotAvailable = slot.available;
    
    // Prepare the update
    const updatedSlot = {
      service_id: serviceId,
      date: selectedDate,
      time_slot: slot.timeValue
    };
    
    // If removing availability
    if (isSlotAvailable) {
      console.log('Removing availability for slot:', slot.time);
      if (typeof onRemoveAvailability === 'function') {
        onRemoveAvailability(updatedSlot);
      }
    } 
    // If adding availability
    else {
      console.log('Adding availability for slot:', slot.time);
      if (typeof onAddAvailability === 'function') {
        onAddAvailability(updatedSlot);
      }
    }
    
    // Update local state
    setTimeSlots(prevTimeSlots => {
      // Defensive check: ensure prevTimeSlots is an array
      if (!Array.isArray(prevTimeSlots)) {
        console.warn('prevTimeSlots is not an array');
        return [];
      }
      
      const updatedTimeSlots = prevTimeSlots.map(ts => {
        if (ts && ts.id === slot.id) {
          return {
            ...ts,
            available: !isSlotAvailable
          };
        }
        return ts;
      });
      
      console.log(`Updated time slots. Now ${updatedTimeSlots.filter(s => s.available).length} available slots`);
      return updatedTimeSlots;
    });
  }, [selectedDate, serviceId, onRemoveAvailability, onAddAvailability]);
  
  // Update when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Reset to current date when opening modal
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      handleDateSelect(formattedDate);
      
      // Set calendar to current month
      setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }
  }, [visible, handleDateSelect]);
  
  // Effect for updating time slots when selected date changes
  useEffect(() => {
    if (selectedDate) {
      // Generate time slots for the selected date
      const slots = generateTimeSlots();
      console.log('Updating time slots for date:', selectedDate, 'slots:', slots?.length || 0);
      setTimeSlots(slots);
    }
  }, [selectedDate, generateTimeSlots]);
  
  // This useEffect only runs once when the modal opens or month changes
  useEffect(() => {
    if (!visible) return;
    
    const days = [];
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    
    // Get the number of days in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get the day of the week for the first day of the month (0 = Sunday, 6 = Saturday)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Add days from previous month to fill the first row
    for (let i = 0; i < firstDayOfMonth; i++) {
      const day = new Date(year, month, -firstDayOfMonth + i + 1).getDate();
      const date = new Date(year, month, -firstDayOfMonth + i + 1);
      const dateString = date.toISOString().split('T')[0];
      
      days.push({
        date: dateString,
        day: day,
        isCurrentMonth: false,
        isToday: isToday(date),
        hasAvailability: checkDateHasAvailability(dateString)
      });
    }
    
    // Add days for the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      
      days.push({
        date: dateString,
        day: day,
        isCurrentMonth: true,
        isToday: isToday(date),
        hasAvailability: checkDateHasAvailability(dateString)
      });
    }
    
    // Fill remaining cells with days from next month
    const totalDaysNeeded = Math.ceil(days.length / 7) * 7;
    const remainingDays = totalDaysNeeded - days.length;
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateString = date.toISOString().split('T')[0];
      
      days.push({
        date: dateString,
        day: day,
        isCurrentMonth: false,
        isToday: isToday(date),
        hasAvailability: checkDateHasAvailability(dateString)
      });
    }
    
    setCalendarDays(days);
  }, [visible, selectedMonth, checkDateHasAvailability, isToday]);
  
  // Weekday names
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Render the modal
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
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
                
                const hasAvailability = Array.isArray(availabilityData) && 
                  availabilityData.some(a => a && a.date === day.date && a.service_id === serviceId);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      !day.isCurrentMonth && styles.otherMonthDay,
                      day.isToday && styles.today,
                      day.date === selectedDate && styles.selectedDay,
                      hasAvailability && styles.dayWithAvailability
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
                    
                    {hasAvailability && (
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
              style={styles.cancelButton}
              onPress={onClose}
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
    height: 400, // Fixed height to ensure visibility
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
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'center',
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
