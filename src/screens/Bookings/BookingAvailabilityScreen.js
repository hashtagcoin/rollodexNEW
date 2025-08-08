import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabaseClient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getMonth, getYear, isSameDay } from 'date-fns';

const getMonthsList = (monthsAhead = 6) => {
  const now = new Date();
  const months = [];
  for (let i = 0; i < monthsAhead; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      label: format(date, 'MMM yyyy'),
      value: date,
      month: getMonth(date),
      year: getYear(date),
    });
  }
  return months;
};

const BookingAvailabilityScreen = ({
  visible,
  onClose,
  onSelect,
  selectedServiceId,
  baseHourlyRate, // Accept baseHourlyRate prop
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showTimesModal, setShowTimesModal] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);
  // const [hourlyRate, setHourlyRate] = useState(null); // Base rate now comes from props

  useEffect(() => {
    // Fetch days with availability for the selected month
    setLoadingDays(true);
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const daysArr = eachDayOfInterval({ start, end });
    setDays(daysArr);
    setLoadingDays(false);
  }, [selectedMonth]);

  const generateDefaultTimeSlots = (day, rate) => {
    const slots = [];
    const dateStr = format(day, 'yyyy-MM-dd');
    for (let hour = 8; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 16 && minute > 30) continue; // Last slot is 16:30
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        slots.push({
          id: `default_${dateStr}_${timeStr}`,
          time: timeStr,
          display: format(new Date(`${dateStr}T${timeStr}`), 'h:mm a'),
          hourlyRate: rate,
          available: true, // Default to available
        });
      }
    }
    return slots;
  };

  const fetchTimes = async (day) => {
    setLoadingTimes(true);
    setSelectedDay(day);
    const dateStr = format(day, 'yyyy-MM-dd');

    // 1. Generate default slots
    const defaultSlots = generateDefaultTimeSlots(day, baseHourlyRate || 0); // Use baseHourlyRate, default to 0 if not provided

    // 2. Fetch overrides from service_availability
    let overrideQuery = supabase
      .from('service_availability') // Query new table
      .select('id, time_slot, available') // Select relevant fields, assuming hourly_rate might be overridden
      .eq('date', dateStr);

    if (selectedServiceId) {
      overrideQuery = overrideQuery.eq('service_id', selectedServiceId);
    }

    const { data: overrideData, error: overrideError } = await overrideQuery;

    if (overrideError) {
      console.error('Error fetching service availability overrides:', overrideError);
      // Potentially set an error state or show a message
      setAvailableTimes(defaultSlots); // Fallback to default slots on error
      setLoadingTimes(false);
      setShowTimesModal(true);
      return;
    }

    // 3. Merge default slots with overrides
    const availabilityMap = {};
    if (overrideData) {
      overrideData.forEach(override => {
        availabilityMap[override.time_slot] = {
          id: override.id, // Use DB id if override exists
          available: override.available
          // hourlyRate will be taken from the default slot, which uses baseHourlyRate
        };
      });
    }

    const mergedSlots = defaultSlots.map(slot => {
      if (availabilityMap[slot.time]) {
        return {
          ...slot, // Keep display format from default
          id: availabilityMap[slot.time].id || slot.id, // Prefer DB id
          available: availabilityMap[slot.time].available,
          // hourlyRate remains from the default slot (which is baseHourlyRate)
          hourlyRate: slot.hourlyRate, // This is already baseHourlyRate from defaultSlots
        };
      }
      return slot;
    });

    setAvailableTimes(mergedSlots);
    setLoadingTimes(false);
    setShowTimesModal(true);
  };

  const monthsList = getMonthsList();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Booking Availability</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle-outline" size={28} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Select Month</Text>
          <FlatList
            data={monthsList}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.label}
            style={styles.monthList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.monthButton,
                  getMonth(selectedMonth) === item.month && getYear(selectedMonth) === item.year && styles.selectedMonthButton
                ]}
                onPress={() => setSelectedMonth(item.value)}
              >
                <Text
                  style={[
                    styles.monthButtonText,
                    getMonth(selectedMonth) === item.month && getYear(selectedMonth) === item.year && styles.selectedMonthButtonText
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Text style={styles.label}>Select Day</Text>
          {loadingDays ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayList}>
              {days.map(day => (
                <TouchableOpacity
                  key={format(day, 'yyyy-MM-dd')}
                  style={[
                    styles.dayButton,
                    selectedDay && isSameDay(selectedDay, day) && styles.selectedDayButton
                  ]}
                  onPress={() => fetchTimes(day)}
                >
                  <Text style={styles.dayButtonText}>{format(day, 'd')}</Text>
                  <Text style={styles.dayButtonSubText}>{format(day, 'EEE')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {/* Times Modal */}
          <Modal visible={showTimesModal} animationType="slide" transparent>
            <View style={styles.overlay}>
              <View style={styles.timesModalContent}>
                <View style={styles.header}>
                  <Text style={styles.title}>Select Time</Text>
                  <TouchableOpacity onPress={() => setShowTimesModal(false)}>
                    <Ionicons name="close-circle-outline" size={28} color={COLORS.textDark} />
                  </TouchableOpacity>
                </View>
                {loadingTimes ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : availableTimes.length > 0 ? (
                  <FlatList
                    data={availableTimes}
                    keyExtractor={item => item.id.toString()} // id can be default_... or UUID
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.timeSlotCard, !item.available && styles.unavailableTimeSlotCard]}
                        disabled={!item.available} 
                        onPress={() => {
                          // Close the time selection modal first
                          setShowTimesModal(false);
                          
                          // Use setTimeout to prevent UI freeze when passing data back
                          setTimeout(() => {
                            // Send only the minimal data needed
                            const selectedData = {
                              date: selectedDay,
                              time: item.time,
                              display: item.display,
                              hourlyRate: item.hourlyRate || 0,
                            };
                            
                            console.log('Sending selection back:', selectedData);
                            onSelect(selectedData);
                            
                            // Use another setTimeout to delay closing the main modal
                            setTimeout(() => {
                              onClose();
                            }, 50);
                          }, 50);
                        }}
                      >
                        <Text style={[styles.timeSlotText, !item.available && styles.unavailableTimeSlotText]}>
                          {item.display}{!item.available ? ' (Unavailable)' : ''}
                        </Text>
                        <Text style={styles.rateText}>${item.hourlyRate}/hr</Text>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <Text style={styles.noTimesText}>No times available for this day.</Text>
                )}
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '96%',
    padding: 20,
    maxHeight: '90%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: COLORS.textDark,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textDark,
    marginTop: 10,
    marginBottom: 6,
  },
  monthList: {
    marginBottom: 10,
  },
  monthButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  selectedMonthButton: {
    backgroundColor: COLORS.primary,
  },
  monthButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textGray,
  },
  selectedMonthButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
  },
  dayList: {
    marginBottom: 10,
  },
  dayButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    alignItems: 'center',
    width: 54,
  },
  selectedDayButton: {
    backgroundColor: COLORS.primary,
  },
  dayButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.textDark,
  },
  dayButtonSubText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textGray,
  },
  timesModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '92%',
    alignSelf: 'center',
    maxHeight: '60%',
  },
  timeSlotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  timeSlotText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textDark,
  },
  rateText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.primary,
  },
  unavailableTimeSlotCard: {
    backgroundColor: '#FFEBEE', // Light red background
    borderColor: '#E57373',     // Medium red border
    opacity: 0.7,               // Slightly faded
  },
  unavailableTimeSlotText: {
    color: '#D32F2F',           // Strong red text
    textDecorationLine: 'line-through',
  },
  noTimesText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textGray,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default BookingAvailabilityScreen;
