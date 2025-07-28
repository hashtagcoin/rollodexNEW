import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';

const { width } = Dimensions.get('window');

const ModernProviderCalendarScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedService, setSelectedService] = useState(null);
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animatedValue] = useState(new Animated.Value(0));

  // Time slots configuration
  const timeSlots = [
    { period: 'Morning', slots: ['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'] },
    { period: 'Afternoon', slots: ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'] },
    { period: 'Evening', slots: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM'] },
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    loadData();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const loadData = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      // Load services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', profile.id)
        .eq('active', true);

      setServices(servicesData || []);
      if (servicesData?.length > 0) {
        setSelectedService(servicesData[0]);
      }

      // Load availability for current month
      await loadAvailability();
      await loadAppointments();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!profile?.id || !selectedService) return;
    
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    const { data } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', profile.id)
      .eq('service_id', selectedService.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());

    // Convert to object for easy access
    const availabilityMap = {};
    data?.forEach(item => {
      if (!availabilityMap[item.date]) {
        availabilityMap[item.date] = {};
      }
      availabilityMap[item.date][item.time_slot] = item.available;
    });
    
    setAvailability(availabilityMap);
  };

  const loadAppointments = async () => {
    if (!profile?.id) return;
    
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    const { data } = await supabase
      .from('bookings')
      .select('*, user_profiles(full_name), services(title)')
      .eq('provider_id', profile.id)
      .gte('scheduled_at', startOfMonth.toISOString())
      .lte('scheduled_at', endOfMonth.toISOString())
      .in('status', ['confirmed', 'pending']);

    setAppointments(data || []);
  };

  const toggleTimeSlot = async (date, timeSlot) => {
    if (!selectedService) {
      Alert.alert('Select Service', 'Please select a service first');
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    const currentAvailability = availability[dateStr]?.[timeSlot] || false;
    
    try {
      if (currentAvailability) {
        // Remove availability
        await supabase
          .from('provider_availability')
          .delete()
          .eq('provider_id', profile.id)
          .eq('service_id', selectedService.id)
          .eq('date', dateStr)
          .eq('time_slot', timeSlot);
      } else {
        // Add availability
        await supabase
          .from('provider_availability')
          .insert({
            provider_id: profile.id,
            service_id: selectedService.id,
            date: dateStr,
            time_slot: timeSlot,
            available: true,
          });
      }

      // Update local state
      setAvailability(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [timeSlot]: !currentAvailability,
        },
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const renderCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    const days = [];
    
    // Previous month days
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, isOtherMonth: true });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      const hasAvailability = availability[dateStr] && Object.values(availability[dateStr]).some(v => v);
      const hasAppointments = appointments.some(apt => 
        new Date(apt.scheduled_at).toDateString() === date.toDateString()
      );
      
      days.push({
        date: i,
        fullDate: date,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        hasAvailability,
        hasAppointments,
        isOtherMonth: false,
      });
    }
    
    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => setSelectedDate(new Date(year, month - 1, 1))}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          
          <Text style={styles.monthText}>
            {months[month]} {year}
          </Text>
          
          <TouchableOpacity
            onPress={() => setSelectedDate(new Date(year, month + 1, 1))}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekDaysRow}>
          {weekDays.map(day => (
            <Text key={day} style={styles.weekDay}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.daysGrid}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                day.isOtherMonth && styles.otherMonthDay,
                day.isToday && styles.todayCell,
                day.isSelected && styles.selectedDay,
              ]}
              onPress={() => day.date && setSelectedDate(day.fullDate)}
              disabled={day.isOtherMonth}
            >
              {day.date && (
                <>
                  <Text style={[
                    styles.dayText,
                    day.isToday && styles.todayText,
                    day.isSelected && styles.selectedDayText,
                  ]}>
                    {day.date}
                  </Text>
                  <View style={styles.dayIndicators}>
                    {day.hasAvailability && (
                      <View style={[styles.indicator, styles.availabilityIndicator]} />
                    )}
                    {day.hasAppointments && (
                      <View style={[styles.indicator, styles.appointmentIndicator]} />
                    )}
                  </View>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderServiceSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.serviceSelector}
      contentContainerStyle={styles.serviceSelectorContent}
    >
      {services.map(service => (
        <TouchableOpacity
          key={service.id}
          style={[
            styles.serviceCard,
            selectedService?.id === service.id && styles.selectedServiceCard,
          ]}
          onPress={() => setSelectedService(service)}
        >
          <MaterialCommunityIcons
            name={service.icon || 'briefcase'}
            size={24}
            color={selectedService?.id === service.id ? '#FFF' : COLORS.primary}
          />
          <Text style={[
            styles.serviceName,
            selectedService?.id === service.id && styles.selectedServiceName,
          ]}>
            {service.title}
          </Text>
          <Text style={[
            styles.servicePrice,
            selectedService?.id === service.id && styles.selectedServicePrice,
          ]}>
            ${service.price}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );


  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.quickActionButton} onPress={handleCopyWeek}>
        <MaterialCommunityIcons name="content-copy" size={20} color={COLORS.primary} />
        <Text style={styles.quickActionText}>Copy Week</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.quickActionButton} onPress={handleBlockDay}>
        <MaterialCommunityIcons name="block-helper" size={20} color="#FF6B6B" />
        <Text style={styles.quickActionText}>Block Day</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.quickActionButton} onPress={handleSetRecurring}>
        <MaterialCommunityIcons name="repeat" size={20} color="#4CAF50" />
        <Text style={styles.quickActionText}>Set Recurring</Text>
      </TouchableOpacity>
    </View>
  );

  const handleCopyWeek = () => {
    Alert.alert(
      'Copy Week Pattern',
      'Copy this week\'s availability to next week?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy', onPress: () => {/* Implementation */} },
      ]
    );
  };

  const handleBlockDay = () => {
    Alert.alert(
      'Block Day',
      'Block all slots for this day?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => {/* Implementation */} },
      ]
    );
  };

  const handleSetRecurring = () => {
    navigation.navigate('RecurringAvailability', {
      serviceId: selectedService?.id,
      date: selectedDate,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Manage Availability" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Manage Availability" navigation={navigation} />
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: animatedValue,
              transform: [{
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              }],
            },
          ]}
        >
          {renderServiceSelector()}
          {renderCalendar()}
          {renderQuickActions()}
          <View style={styles.timeSlotsWrapper}>
            {timeSlots.map(period => (
              <View key={period.period} style={styles.periodSection}>
                <Text style={styles.periodTitle}>{period.period}</Text>
                <View style={styles.slotsGrid}>
                  {period.slots.map(slot => {
                    const dateStr = selectedDate.toISOString().split('T')[0];
                    const dayAvailability = availability[dateStr] || {};
                    const dayAppointments = appointments.filter(apt => 
                      new Date(apt.scheduled_at).toDateString() === selectedDate.toDateString()
                    );
                    const isAvailable = dayAvailability[slot] || false;
                    const hasAppointment = dayAppointments.some(apt => {
                      const aptTime = new Date(apt.scheduled_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      });
                      return aptTime === slot;
                    });

                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.timeSlot,
                          isAvailable && styles.availableSlot,
                          hasAppointment && styles.bookedSlot,
                        ]}
                        onPress={() => !hasAppointment && toggleTimeSlot(selectedDate, slot)}
                        disabled={hasAppointment}
                      >
                        <Text style={[
                          styles.slotTime,
                          isAvailable && styles.availableSlotText,
                          hasAppointment && styles.bookedSlotText,
                        ]}>
                          {slot}
                        </Text>
                        {hasAppointment && (
                          <Text style={styles.bookedLabel}>Booked</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceSelector: {
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  serviceSelectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serviceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedServiceCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  selectedServiceName: {
    color: '#FFF',
  },
  servicePrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  selectedServicePrice: {
    color: 'rgba(255,255,255,0.8)',
  },
  calendar: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDay: {
    width: width / 7 - 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: (width - 64) / 7,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  otherMonthDay: {
    opacity: 0,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 22.5,
  },
  selectedDay: {
    backgroundColor: COLORS.primary,
    borderRadius: 22.5,
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectedDayText: {
    color: '#FFF',
    fontWeight: '600',
  },
  dayIndicators: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  availabilityIndicator: {
    backgroundColor: '#4CAF50',
  },
  appointmentIndicator: {
    backgroundColor: '#FF6B6B',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    color: '#333',
  },
  timeSlotsWrapper: {
    backgroundColor: '#FFF',
    paddingBottom: 20,
  },
  periodSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  timeSlot: {
    width: (width - 48) / 4,
    margin: 4,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  availableSlot: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  bookedSlot: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF6B6B',
  },
  slotTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  availableSlotText: {
    color: '#4CAF50',
  },
  bookedSlotText: {
    color: '#FF6B6B',
  },
  bookedLabel: {
    fontSize: 10,
    color: '#FF6B6B',
    marginTop: 2,
  },
});

export default ModernProviderCalendarScreen;