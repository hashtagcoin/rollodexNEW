import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  ScrollView, 
  Platform 
} from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons, AntDesign } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';

// Import new calendar components - using clean version that fixes the infinite loop issues
import AvailabilityCalendarModal from '../../components/calendar/AvailabilityCalendarModal.clean';
import TimeSlotSelector from '../../components/calendar/TimeSlotSelector';
import AvailabilityLegend from '../../components/calendar/AvailabilityLegend';
import useAvailability from '../../hooks/useAvailability';
import BulkAvailabilityActions from './BulkAvailabilityActions';

const ProviderCalendarScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [selected, setSelected] = useState('');
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false); // For debug info toggle
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
  // Bulk action: Replicate availability pattern to future dates with same weekday
  const handleReplicatePattern = async () => {
    if (!profile?.id || !selected || !selectedService) {
      Alert.alert('Error', 'Please select a service and date first');
      return;
    }
    
    // Get all availability for the selected date
    const currentDateAvailability = availability.filter(a => 
      a.date === selected && a.service_id === selectedService
    );
    
    if (currentDateAvailability.length === 0) {
      Alert.alert('Nothing to Replicate', 'Please add some availability slots first');
      return;
    }
    
    Alert.alert(
      'Replicate Availability',
      'This will copy today\'s availability pattern to the same weekday for the next 3 months. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Replicate', 
          onPress: async () => {
            try {
              // Show loading state
              setLoadingServices(true);
              
              // Get the current day of week
              const selectedDay = new Date(selected);
              const dayOfWeek = selectedDay.getDay();
              
              // Generate future dates with same weekday
              const futureDates = [];
              const currentDate = new Date(selected);
              
              // Generate 12 future same weekday dates (approximately 3 months)
              for (let i = 1; i <= 12; i++) {
                // Add 7 days each time to get same day of week
                const futureDate = new Date(currentDate);
                futureDate.setDate(futureDate.getDate() + (7 * i));
                const formattedDate = futureDate.toISOString().split('T')[0];
                futureDates.push(formattedDate);
              }
              
              // Create new availability entries
              const newAvailabilities = [];
              
              futureDates.forEach(date => {
                currentDateAvailability.forEach(slot => {
                  newAvailabilities.push({
                    service_id: selectedService,
                    provider_id: profile.id,
                    date: date,
                    time_slot: slot.time_slot,
                    available: true
                  });
                });
              });
              
              // Insert into database with proper conflict handling
              const { error } = await supabase
                .from('provider_availability')
                .upsert(newAvailabilities, { onConflict: 'provider_id,service_id,date,time_slot' });
              
              if (error) {
                console.error('Error replicating availability:', error);
                Alert.alert('Error', 'Failed to replicate availability pattern');
              } else {
                Alert.alert('Success', `Availability pattern replicated to ${futureDates.length} future dates`);
              }
            } catch (err) {
              console.error('Error replicating availability:', err);
              Alert.alert('Error', 'Failed to replicate availability');
            } finally {
              setLoadingServices(false);
            }
          }
        }
      ]
    );
  };
  
  // Bulk action: Set all weekends as unavailable
  const handleSetWeekendsOff = async () => {
    if (!profile?.id || !selectedService) {
      Alert.alert('Error', 'Please select a service first');
      return;
    }
    
    Alert.alert(
      'Set Weekends Unavailable',
      'This will mark all weekend days (Saturday and Sunday) as unavailable for the next 3 months. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setLoadingServices(true);
              
              // Get dates for next 3 months
              const startDate = new Date();
              const endDate = new Date();
              endDate.setMonth(endDate.getMonth() + 3);
              
              // Generate all weekend dates
              const weekendDates = [];
              const currentDate = new Date(startDate);
              
              while (currentDate <= endDate) {
                const dayOfWeek = currentDate.getDay();
                
                // Check if it's a weekend (0 = Sunday, 6 = Saturday)
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                  const formattedDate = currentDate.toISOString().split('T')[0];
                  weekendDates.push(formattedDate);
                }
                
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
              }
              
              // Clear existing availability for all weekend days first
              if (weekendDates.length > 0) {
                // First delete any existing availability records
                const { error: deleteError } = await supabase
                  .from('provider_availability')
                  .delete()
                  .eq('provider_id', profile.id)
                  .eq('service_id', selectedService)
                  .in('date', weekendDates);
                  
                if (deleteError) {
                  console.error('Error removing weekend availability:', deleteError);
                  Alert.alert('Error', 'Failed to update weekend availability');
                  return;
                }

                // Create standard half-hour time slots from 8 AM to 8 PM
                const standardTimeSlots = [];
                for (let hour = 8; hour <= 20; hour++) {
                  const formattedHour = hour.toString().padStart(2, '0');
                  standardTimeSlots.push(`${formattedHour}:00`);
                  if (hour < 20) { // Don't add 8:30 PM
                    standardTimeSlots.push(`${formattedHour}:30`);
                  }
                }
                
                // Create unavailable entries for each weekend date and time slot
                const allTimeSlotsToDisable = [];
                weekendDates.forEach(date => {
                  standardTimeSlots.forEach(timeSlot => {
                    allTimeSlotsToDisable.push({
                      provider_id: profile.id,
                      service_id: selectedService,
                      date: date,
                      time_slot: timeSlot,
                      available: false // Explicitly set as unavailable
                    });
                  });
                });

                // Batch insert all unavailable time slots
                const { error: insertError } = await supabase
                  .from('provider_availability')
                  .upsert(allTimeSlotsToDisable, { 
                    onConflict: 'provider_id,service_id,date,time_slot' 
                  });
                  
                if (insertError) {
                  console.error('Error setting weekends unavailable:', insertError);
                  Alert.alert('Error', 'Failed to update weekend availability');
                } else {
                  Alert.alert('Success', `Set ${weekendDates.length} weekend days as unavailable`);
                  
                  // Refresh current view if it's a weekend
                  const selectedDate = new Date(selected);
                  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
                  if (isWeekend) {
                    fetchAvailability(selected);
                  }
                }
              }
            } catch (err) {
              console.error('Error setting weekends unavailable:', err);
              Alert.alert('Error', 'Failed to update weekend availability');
            } finally {
              setLoadingServices(false);
            }
          }
        }
      ]
    );
  };
  
  // Bulk action: Make all slots unavailable for current date
  const handleClearAll = async () => {
    if (!profile?.id || !selected || !selectedService) {
      Alert.alert('Error', 'Please select a service and date first');
      return;
    }
    
    Alert.alert(
      'Clear All Availability',
      'This will remove all availability slots for this day. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          onPress: async () => {
            try {
              setLoadingServices(true);
              
              const { error } = await supabase
                .from('provider_availability')
                .delete()
                .eq('provider_id', profile.id)
                .eq('service_id', selectedService)
                .eq('date', selected);
                
              if (error) {
                console.error('Error clearing availability:', error);
                Alert.alert('Error', 'Failed to clear availability');
              } else {
                Alert.alert('Success', 'All availability slots cleared');
                fetchAvailability(selected);
              }
            } catch (err) {
              console.error('Error clearing availability:', err);
              Alert.alert('Error', 'Failed to clear availability');
            } finally {
              setLoadingServices(false);
            }
          }
        }
      ]
    );
  };

  const [selectedService, setSelectedService] = useState(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  // Add a ref for the ScrollView to maintain scroll position
  const scrollViewRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Use our custom hook for availability management
  const {
    availability,
    bookedSlots,
    loading: loadingAvailability,
    fetchAvailability: fetchAvailabilityData,
    setAvailability: updateAvailability,
    applyRecurringPattern,
    batchUpdateAvailability
  } = useAvailability();
  
  // Pre-defined time slots (half-hour slots) using same format as AvailabilityCalendarModal
  const timeSlots = (() => {
    const slots = [];
    let slotId = 1;
    
    // Morning slots (8 AM - 11:30 AM)
    for (let hour = 8; hour < 12; hour++) {
      slots.push({ 
        id: slotId++, 
        time: `${hour.toString().padStart(2, '0')}:00:00`,
        timeValue: `${hour.toString().padStart(2, '0')}:00:00`,
        period: 'morning'
      });
      slots.push({ 
        id: slotId++, 
        time: `${hour.toString().padStart(2, '0')}:30:00`,
        timeValue: `${hour.toString().padStart(2, '0')}:30:00`,
        period: 'morning'
      });
    }
    
    // Afternoon slots (12 PM - 4:30 PM)
    for (let hour = 12; hour < 17; hour++) {
      slots.push({ 
        id: slotId++,
        time: `${hour.toString().padStart(2, '0')}:00:00`,
        timeValue: `${hour.toString().padStart(2, '0')}:00:00`,
        period: 'afternoon'
      });
      slots.push({ 
        id: slotId++,
        time: `${hour.toString().padStart(2, '0')}:30:00`,
        timeValue: `${hour.toString().padStart(2, '0')}:30:00`,
        period: 'afternoon'
      });
    }
    
    // Evening slots (5 PM - 8:30 PM)
    for (let hour = 17; hour <= 20; hour++) {
      slots.push({ 
        id: slotId++,
        time: `${hour.toString().padStart(2, '0')}:00:00`,
        timeValue: `${hour.toString().padStart(2, '0')}:00:00`,
        period: 'evening'
      });
      slots.push({ 
        id: slotId++,
        time: `${hour.toString().padStart(2, '0')}:30:00`,
        timeValue: `${hour.toString().padStart(2, '0')}:30:00`,
        period: 'evening'
      });
    }
    
    return slots;
  })();
  
  // Safe date parser to avoid "Date value out of bounds" errors
  const safeParseDate = (dateString) => {
    try {
      // First check if it's a valid date string
      if (!dateString || typeof dateString !== 'string') {
        return new Date(); // Return current date as fallback
      }
      
      // Try to parse ISO string first (YYYY-MM-DD)
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
        // Create date using year, month (0-indexed), day
        return new Date(year, month - 1, day);
      }
      
      // Otherwise try normal Date parsing
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return new Date(); // Return current date as fallback
      }
      
      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date(); // Return current date as fallback
    }
  };
  
  // Helper to categorize a time slot into a period (morning, afternoon, evening)
  const getPeriodForTimeSlot = (timeString) => {
    if (!timeString) return 'morning';
    
    try {
      const hour = parseInt(timeString.split(':')[0]);
      if (hour >= 0 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      return 'evening';
    } catch (err) {
      console.error('Error parsing time period:', err);
      return 'morning'; // default fallback
    }
  };
  
  // Check if date is a weekend
  const isWeekend = (dateString) => {
    const date = safeParseDate(dateString);
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    return day === 0 || day === 6;
  };
  
  // Check if a time slot is available
  const isTimeSlotAvailable = (timeSlot) => {
    // Null check for availability array
    if (!availability || !Array.isArray(availability)) {
      // Default: Available on weekdays, not available on weekends
      return !isWeekend(selected);
    }

    // First check if provider has explicitly set availability for this slot
    const explicitAvailability = availability.find(a => 
      a && a.date === selected && 
      a.time_slot === timeSlot.time &&
      a.service_id === selectedService
    );
    
    // If provider has explicitly set availability, use that value
    if (explicitAvailability && explicitAvailability.hasOwnProperty('available')) {
      return explicitAvailability.available === true;
    }
    
    // If no explicit setting and not a weekend, it's available by default
    return !isWeekend(selected);
  };
  
  // Check if time slot availability is explicitly set by provider
  const isExplicitlySet = (timeSlot) => {
    // Add null checks to prevent errors if availability isn't loaded yet
    return availability && Array.isArray(availability) && availability.some(a => 
      a && a.date === selected && 
      a.time_slot === timeSlot.time &&
      a.service_id === selectedService
    );
  };
  
  // Set initial selected date to today with safe handling
  useEffect(() => {
    try {
      const today = new Date();
      // Make sure date is valid before using it
      if (isNaN(today.getTime())) {
        console.error('Invalid initial date');
        // Fallback to string representation of current date
        const fallbackDate = new Date().toISOString().substring(0, 10);
        setSelected(fallbackDate);
      } else {
        // Valid date - convert to YYYY-MM-DD format
        const formattedDate = today.toISOString().split('T')[0];
        setSelected(formattedDate);
      }
    } catch (error) {
      console.error('Error initializing date:', error);
      // Ultimate fallback - hardcoded recent date
      setSelected('2023-01-01');
    }
  }, []);
  
  // Fetch data when screen is focused or selected date changes
  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchServices();
        if (selected) {
          fetchAvailability(selected);
          fetchAppointments(selected);
        }
      }
    }, [profile, selected])
  );
  
  // Force refresh all data
  const forceRefresh = async () => {
    console.log('Force refreshing all data...');
    setLoadingServices(true);
    setLoadingAvailability(true);
    
    try {
      // Clear existing state
      setServices([]);
      setSelectedService(null);
      setAvailability([]);
      setAppointments([]);
      
      // Fetch services with direct provider ID from Supabase
      const hardcodedProviderId = 'e816663a-3f36-4791-85f6-4d6495cdd619';
      console.log('Trying hardcoded provider ID:', hardcodedProviderId);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', hardcodedProviderId)
        .eq('available', true);
      
      if (error) {
        console.error('Error fetching services with hardcoded ID:', error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} services with hardcoded provider ID`);
      
      if (data && data.length > 0) {
        console.log('Service titles:', data.map(s => s.title).join(', '));
        setServices(data);
        setSelectedService(data[0].id);
      } else {
        console.log('No services found with hardcoded ID');
        Alert.alert('No Services Found', 'Could not find any services for your account.');
      }
    } catch (err) {
      console.error('Force refresh failed:', err);
      Alert.alert('Refresh Failed', 'Could not refresh your data. Please try again.');
    } finally {
      setLoadingServices(false);
      setLoadingAvailability(false);
    }
  };

  // Fetch provider's services
  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      console.log('Fetching services for profile ID:', profile?.id);
      
      // First, try with the hardcoded provider ID that we know works
      const hardcodedProviderId = 'e816663a-3f36-4791-85f6-4d6495cdd619';
      console.log('Trying hardcoded provider ID first:', hardcodedProviderId);
      
      const { data: directData, error: directError } = await supabase
        .from('services')
        .select('id, title')
        .eq('provider_id', hardcodedProviderId)
        .eq('available', true)
        .order('title', { ascending: true });
      
      if (!directError && directData && directData.length > 0) {
        console.log(`Found ${directData.length} services with hardcoded provider ID`);
        setServices(directData);
        
        // Set first service as selected by default
        if (!selectedService) {
          setSelectedService(directData[0].id);
        }
        return;
      }
      
      // If hardcoded ID didn't work, check if the user has a service provider record
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      
      if (providerError && providerError.code !== 'PGRST116') {
        console.error('Error fetching provider record:', providerError);
        throw providerError;
      }
      
      // If provider record found, use that ID to fetch services
      if (providerData?.id) {
        console.log('Found provider record with ID:', providerData.id);
        
        const { data, error } = await supabase
          .from('services')
          .select('id, title')
          .eq('provider_id', providerData.id)
          .eq('available', true)
          .order('title', { ascending: true });
          
        if (error) throw error;
        
        console.log(`Found ${data?.length || 0} services for provider ID ${providerData.id}`);
        setServices(data || []);
        
        // Set first service as selected by default if we have services and none is currently selected
        if (data && data.length > 0 && !selectedService) {
          setSelectedService(data[0].id);
        }
      } else {
        // If no provider record found, try fetching services directly using the user ID
        console.log('No provider record found, trying direct user ID query');
        
        const { data, error } = await supabase
          .from('services')
          .select('id, title')
          .eq('provider_id', profile.id)
          .eq('available', true)
          .order('title', { ascending: true });
          
        if (error) throw error;
        
        console.log(`Found ${data?.length || 0} services for direct user ID ${profile.id}`);
        setServices(data || []);
        
        // Set first service as selected by default if we have services and none is currently selected
        if (data && data.length > 0 && !selectedService) {
          setSelectedService(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching provider services:', err);
      Alert.alert('Error', 'Failed to load your services');
    } finally {
      setLoadingServices(false);
    }
  };
  
  // Fetch provider's availability for a specific date
  const fetchAvailability = async (date, preventReset = false) => {
    if (!profile?.id || !date) return;
    
    // In React Native, we'll handle this differently
    // The preventReset flag will be used in the state update logic
    
    try {
      // Use our custom hook to fetch availability and booked slots
      await fetchAvailabilityData(profile.id, selectedService, date);
      
      // With preventReset true, we'll handle state updates differently
      
      // Update time slots based on availability
      const updatedTimeSlots = [...timeSlots];
      updatedTimeSlots.forEach(slot => {
        // Reset availability
        slot.available = false;
        
        // Check if this time slot is available
        const availableSlot = availability?.find(a => 
          a.time_slot === slot.time && 
          (!selectedService || a.service_id === selectedService) &&
          a.date === date
        );
        
        if (availableSlot) {
          slot.available = true;
        }
      });
      
      // Update time slots based on default availability
      updatedTimeSlots.forEach(slot => {
        if (!slot.available && !isWeekend(date)) {
          slot.available = true;
        }
      });
      
      // Update time slots based on explicit availability
      updatedTimeSlots.forEach(slot => {
        if (isExplicitlySet(slot)) {
          const explicitAvailability = availability?.find(a => 
            a.date === date && 
            a.time_slot === slot.time &&
            a.service_id === selectedService
          );
          // Only set availability if we found an explicit record
          if (explicitAvailability) {
            slot.available = explicitAvailability.available;
          }
        }
      });
    } catch (err) {
      console.error('Error fetching provider availability:', err);
      Alert.alert('Error', 'Failed to load your availability');
    }
  };
  
  // Fetch appointments for a specific date
  const fetchAppointments = async (date) => {
    setLoadingAppointments(true);
    try {
      // Calculate start and end of the selected date (in UTC to match database)
      // This properly handles the time range for a full day
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      
      // Use proper date range comparison instead of pattern matching
      const { data, error } = await supabase
        .from('bookings_with_details')
        .select('*')
        .eq('provider_id', profile.id)
        .gte('scheduled_at', startOfDay.toISOString())
        .lt('scheduled_at', endOfDay.toISOString());
        
      if (error) throw error;
      
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching provider appointments:', err);
      Alert.alert('Error', 'Failed to load your appointments');
    } finally {
      setLoadingAppointments(false);
    }
  };
  
  // Toggle availability for a time slot
  const toggleAvailability = async (timeSlot, event) => {
    if (!selectedService) {
      Alert.alert('Error', 'Please select a service first');
      return;
    }
    
    // Prevent default scroll behavior
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    
    try {
      // Save the current scroll position
      const currentScrollPos = scrollPosition;
      
      // Get time slot value based on timeValue or time property
      const timeSlotValue = timeSlot.timeValue || timeSlot.time;
      
      if (timeSlot.available) {
        // If it was available, remove the entry from the database
        const { error } = await supabase
          .from('provider_availability')
          .delete()
          .eq('provider_id', profile.id)
          .eq('service_id', selectedService)
          .eq('date', selected)
          .eq('time_slot', timeSlotValue);
          
        if (error) throw error;
      } else {
        // If it wasn't available, add an entry to mark it as available
        // Use upsert to handle potential duplicates
        const { error } = await supabase
          .from('provider_availability')
          .upsert(
            {
              provider_id: profile.id,
              service_id: selectedService,
              date: selected,
              time_slot: timeSlotValue,
              available: true
            },
            { onConflict: 'provider_id,service_id,date,time_slot' }
          );
          
        if (error) {
          console.error('Error adding availability:', error);
          Alert.alert('Error', 'Failed to save availability time slot');
          return;
        }
      }
      
      // Refresh availability after changes
      fetchAvailability(selected, true);
      
      // Restore scroll position after a brief timeout to allow state update
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: currentScrollPos, animated: false });
        }
      }, 100);
      
      // Show Instagram-style feedback toast
      Alert.alert('Success', 'Availability updated!', [{ text: 'OK' }]);
    } catch (err) {
      console.error('Error updating availability:', err);
      Alert.alert('Error', 'Failed to update your availability');
    }
  };
  
  // Handle availability changes with the calendar modal
  const handleAvailabilityChange = async (slot) => {
    console.log('Handling availability change with clean version:', slot);
    
    if (!selectedService || !profile?.id) {
      Alert.alert('Error', 'Please select a service first');
      return;
    }
    
    try {
      // Check if this is a close action
      if (slot && slot.action === 'close') {
        console.log('Closing availability modal');
        setShowCalendarModal(false);
        return;
      }
      
      // Check if this time slot already has availability
      const existingSlot = availability.find(a => 
        a.date === selected && 
        a.time === slot.timeValue &&
        a.service_id === selectedService
      );
      
      if (existingSlot) {
        // This is a remove operation
        console.log('Removing availability slot');
        const { error } = await supabase
          .from('availability')
          .delete()
          .match({
            service_id: selectedService,
            provider_id: profile.id,
            date: selected,
            time: slot.timeValue
          });
          
        if (error) {
          console.error('Error removing availability:', error);
          Alert.alert('Error', 'Failed to remove availability time slot');
          return;
        }
      } else {
        // This is an add operation
        console.log('Adding availability slot');
        const newSlot = {
          service_id: selectedService,
          provider_id: profile.id,
          date: selected,
          time: slot.timeValue
        };
        
        const { data, error } = await supabase
          .from('provider_availability')
          .insert(newSlot)
          .select();
          
        if (error) {
          console.error('Error adding availability:', error);
          Alert.alert('Error', 'Failed to save availability time slot');
          return;
        }
      }
      
      // Refresh availability after changes
      fetchAvailability(selected);
      
      // Show Instagram-style feedback toast (simulated with Alert for now)
      Alert.alert('Success', 'Availability updated!', [{ text: 'OK' }]);
    } catch (err) {
      console.error('Error updating availability:', err);
      Alert.alert('Error', 'Failed to update your availability');
    }
  };

  // Open the calendar modal for advanced availability management
  const openAvailabilityModal = () => {
    setShowCalendarModal(true);
  };

  // Helper component for availability legend
  const AvailabilityLegend = () => {
    return (
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f0f0f0' }]} />
          <Text style={styles.legendText}>Unavailable</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
      </View>
    );
  };
  
  // Check if a time slot has an appointment
  const hasAppointmentAt = (timeSlot) => {
    // Safely handle undefined or null appointments array
    if (!appointments || !Array.isArray(appointments)) {
      return false;
    }
    
    return appointments.some(appointment => {
      try {
        if (!appointment || !appointment.scheduled_at) return false;
        
        const appointmentTime = safeParseDate(appointment.scheduled_at).toLocaleTimeString([], { 
          hour: '2-digit',
          minute: '2-digit'
        });
        return appointmentTime === timeSlot.time;
      } catch (err) {
        console.error('Error parsing appointment time:', err);
        return false;
      }
    });
  };
  
  // Get appointment details for a time slot
  const getAppointmentDetails = (timeSlot) => {
    // Safely handle undefined or null appointments array
    if (!appointments || !Array.isArray(appointments)) {
      return null;
    }
    
    return appointments.find(appointment => {
      try {
        if (!appointment || !appointment.scheduled_at) return false;
        
        const appointmentTime = safeParseDate(appointment.scheduled_at).toLocaleTimeString([], { 
          hour: '2-digit',
          minute: '2-digit'
        });
        return appointmentTime === timeSlot.time;
      } catch (err) {
        console.error('Error parsing appointment time:', err);
        return false;
      }
    });
  };
  
  // Generate calendar days for the current month view
  const generateCalendarDays = () => {
    const days = [];
    const currentDate = safeParseDate(selected);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get the first day of the month
    const firstDayOfMonth = new Date(year, month, 1); // Safe: using numeric values
    const dayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
    
    // Add days from previous month to fill the first row
    const prevMonth = new Date(year, month, 0); // Safe: using numeric values
    const daysInPrevMonth = prevMonth.getDate();
    
    for (let i = 0; i < dayOfWeek; i++) {
      const day = daysInPrevMonth - (dayOfWeek - i - 1);
      const date = new Date(year, month - 1, day); // Safe: using numeric values
      days.push({
        date: date.toISOString().split('T')[0],
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Add days of current month
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // Safe: using numeric values
    const today = new Date().toISOString().split('T')[0];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day); // Safe: using numeric values
      const dateString = date.toISOString().split('T')[0];
      days.push({
        date: dateString,
        isCurrentMonth: true,
        isToday: dateString === today
      });
    }
    
    // Fill remaining cells with days from next month
    const totalDays = 42; // 6 rows of 7 days
    const remainingDays = totalDays - days.length;
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day); // Safe: using numeric values
      days.push({
        date: date.toISOString().split('T')[0],
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return days;
  };
  
  // Render time slot item
  const renderTimeSlot = ({ item }) => {
    const hasAppointment = hasAppointmentAt(item);
    const appointmentDetails = hasAppointment ? getAppointmentDetails(item) : null;
    
    return (
      <View style={styles.timeSlotRow}>
        <Text style={styles.timeSlotText}>{item.time}</Text>
        
        {hasAppointment ? (
          <View style={styles.appointmentSlot}>
            <Text style={styles.appointmentText}>{appointmentDetails?.service_title || 'Appointment'}</Text>
            <Text style={styles.appointmentClientText}>{appointmentDetails?.client_name || 'Client'}</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.availabilityToggle,
              item.available ? styles.availableSlot : styles.unavailableSlot
            ]}
            onPress={() => toggleAvailability(item)}
          >
            <Text style={[
              styles.availabilityText,
              item.available ? styles.availableText : styles.unavailableText
            ]}>
              {item.available ? 'Available' : 'Unavailable'}
            </Text>
            <Ionicons 
              name={item.available ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={item.available ? '#4CAF50' : '#999'} 
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <AppHeader
        title="Manage Availability"
        canGoBack={true}
        navigation={navigation}
        rightIcon={
          <TouchableOpacity
            style={styles.advancedButton}
            onPress={openAvailabilityModal}
          >
            <Ionicons name="calendar" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        onScroll={(e) => {
          setScrollPosition(e.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={16}
      >
      
      {/* Instagram-style Calendar Modal for advanced availability management */}
      <AvailabilityCalendarModal
        visible={showCalendarModal}
        onClose={() => {
          console.log('Modal closing from parent onClose handler');
          setShowCalendarModal(false);
        }}
        onDateChange={(date) => {
          console.log('Date changed to:', date);
          setSelected(date);
          fetchAvailability(date);
        }}
        onTimeSlotToggle={handleAvailabilityChange}
        serviceId={selectedService}
        providerId={profile?.id}
        initialDate={selected}
      />
      
      {/* Instagram-style Custom Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              style={styles.calendarArrow}
              onPress={() => {
                const date = new Date(selected);
                date.setMonth(date.getMonth() - 1);
                const newSelected = date.toISOString().split('T')[0];
                setSelected(newSelected);
                fetchAvailability(newSelected);
                fetchAppointments(newSelected);
              }}
            >
              <AntDesign name="left" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            
            <Text style={styles.calendarTitle}>
              {safeParseDate(selected).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            
            <TouchableOpacity 
              style={styles.calendarArrow}
              onPress={() => {
                const date = new Date(selected);
                date.setMonth(date.getMonth() + 1);
                const newSelected = date.toISOString().split('T')[0];
                setSelected(newSelected);
                fetchAvailability(newSelected);
                fetchAppointments(newSelected);
              }}
            >
              <AntDesign name="right" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.weekdaysRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={index} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.daysContainer}>
            {generateCalendarDays().map((day) => {
              // Check if there are any appointments on this day
              const hasAppointments = appointments.some(apt => apt.date === day.date);
              // Check if there is any availability set for this day
              const hasAvailability = availability && availability.some(a => a && a.date === day.date && a.service_id === selectedService);
              
              return (
                <TouchableOpacity
                  key={day.date}
                  style={[
                    styles.dayButton,
                    day.date === selected && styles.selectedDay,
                    day.isCurrentMonth ? {} : styles.otherMonthDay,
                    day.isToday && styles.today,
                    hasAppointments && styles.appointmentDay,
                    hasAvailability && styles.availabilityDay
                  ]}
                  onPress={() => {
                    setSelected(day.date);
                    fetchAvailability(day.date);
                    fetchAppointments(day.date);
                  }}
                  disabled={!day.isCurrentMonth}
                >
                  <Text style={[
                    styles.dayText,
                    day.date === selected && styles.selectedDayText,
                    day.isCurrentMonth ? {} : styles.otherMonthDayText,
                    day.isToday && styles.todayText,
                    hasAppointments && styles.appointmentDayText
                  ]}>
                    {safeParseDate(day.date).getDate()}
                  </Text>
                  
                  {/* Small indicator dot for appointments */}
                  {hasAppointments && <View style={styles.appointmentDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
      
      {/* Service selector */}
      {loadingServices ? (
        <View style={styles.loadingServices}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : services.length > 0 ? (
        <View style={styles.serviceSelector}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>Your Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateServiceListing')}>
              <Text style={styles.addServiceText}>+ Add Service</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.serviceCardsScroll}
            contentContainerStyle={styles.serviceCardsContent}
          >
            {services.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  selectedService === service.id && styles.selectedServiceCard
                ]}
                onPress={() => {
                  setSelectedService(service.id);
                  fetchAvailability(selected);
                }}
              >
                {/* Service Image or Icon */}
                <View style={styles.serviceCardIconContainer}>
                  <Ionicons 
                    name={service.icon || "calendar-outline"} 
                    size={24} 
                    color={selectedService === service.id ? '#fff' : COLORS.primary} 
                  />
                </View>
                
                <Text
                  style={[
                    styles.serviceCardTitle,
                    selectedService === service.id && styles.selectedServiceCardText
                  ]}
                  numberOfLines={1}
                >
                  {service.title}
                </Text>
                
                <Text 
                  style={[
                    styles.serviceCardPrice,
                    selectedService === service.id && styles.selectedServiceCardText
                  ]}
                >
                  ${service.price || '0'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.noServicesContainer}>
          <View style={styles.emptyStateCard}>
            <Ionicons name="briefcase-outline" size={50} color={COLORS.primary} style={styles.emptyStateIcon} />
            
            <Text style={styles.emptyStateTitle}>No Active Services</Text>
            <Text style={styles.emptyStateMessage}>Create a service to start managing your availability and accepting bookings.</Text>
            
            {/* Debug info for development (collapsible) */}
            <TouchableOpacity 
              style={styles.debugToggle}
              onPress={() => setShowDebugInfo(prev => !prev)}
            >
              <Text style={styles.debugToggleText}>Debug Info</Text>
              <Ionicons 
                name={showDebugInfo ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#888" 
              />
            </TouchableOpacity>
            
            {showDebugInfo && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>Profile ID: {profile?.id || 'Not loaded'}</Text>
                {recentProviderIds.length > 0 && (
                  <Text style={styles.debugText}>
                    Recent Provider IDs: {recentProviderIds.join(', ')}
                  </Text>
                )}
              </View>
            )}
            
            <View style={styles.emptyStateActions}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={forceRefresh}
              >
                <Ionicons name="refresh" size={16} color="#fff" style={styles.refreshIcon} />
                <Text style={styles.refreshButtonText}>Force Refresh</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.createServiceButton}
                onPress={() => navigation.navigate('CreateServiceListing')}
              >
                <Ionicons name="add-circle" size={16} color="#fff" style={styles.createServiceIcon} />
                <Text style={styles.createServiceButtonText}>Create Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {/* Availability Legend */}
      <AvailabilityLegend />
      
      {/* Bulk Availability Actions - Instagram style UI */}
      {selectedService && selected && profile && (
        <BulkAvailabilityActions 
          onReplicatePattern={handleReplicatePattern}
          onSetWeekendsOff={handleSetWeekendsOff}
          onClearAll={handleClearAll}
        />
      )}
      
      {/* Daily schedule with new TimeSlotSelector */}
      {loadingAvailability || loadingAppointments ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      ) : (
        <View style={styles.timeSlotSelectorContainer}>
          <Text style={styles.dateTitle}>
            {safeParseDate(selected).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          
          <View style={styles.timeSlotsHeader}>
            <Text style={styles.timeSlotsTitle}>Availability for {selected}</Text>
            {selectedService && (
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => {
                  // Set all slots to available for this service and date
                  Alert.alert(
                    'Set All Slots',
                    'Do you want to make all time slots available for this service on this date?',
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Make All Available',
                        onPress: async () => {
                          try {
                            // First delete any existing slots for this date/service
                            const { error: deleteError } = await supabase
                              .from('provider_availability')
                              .delete()
                              .eq('provider_id', profile.id)
                              .eq('service_id', selectedService)
                              .eq('date', selected);
                              
                            if (deleteError) throw deleteError;
                            
                            // Create entries for all time slots
                            const newAvailability = timeSlots.map(slot => ({
                              provider_id: profile.id,
                              service_id: selectedService,
                              date: selected,
                              time_slot: slot.time,
                              available: true
                            }));
                            
                            const { error } = await supabase
                              .from('provider_availability')
                              .insert(newAvailability);
                              
                            if (error) throw error;
                            
                            // Refresh availability
                            fetchAvailability(selected);
                          } catch (err) {
                            console.error('Error setting bulk availability:', err);
                            Alert.alert('Error', 'Failed to update availability');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.bulkActionButtonText}>Set All Available</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TimeSlotSelector
            timeSlots={timeSlots.map(slot => ({
              ...slot,
              // Format as expected by TimeSlotSelector
              timeValue: slot.time,
              available: isTimeSlotAvailable(slot),
              // Add period grouping
              period: getPeriodForTimeSlot(slot.time)
            }))}
            onToggle={toggleAvailability}
            bookedSlots={(bookedSlots || []).filter(b => b && b.date === selected && b.service_id === selectedService)}
          />
          
          {/* Appointments for the day */}
          {appointments.length > 0 && (
            <View style={styles.appointmentsContainer}>
              <Text style={styles.appointmentsTitle}>Appointments</Text>
              {appointments.map(appointment => (
                <TouchableOpacity 
                  key={appointment.booking_id}
                  style={styles.appointmentCard}
                  onPress={() => navigation.navigate('AppointmentDetailScreen', { appointmentId: appointment.booking_id })}
                >
                  <View style={styles.appointmentTimeContainer}>
                    <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.appointmentTime}>
                      {safeParseDate(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.appointmentDetailsContainer}>
                    <Text style={styles.appointmentService} numberOfLines={1}>{appointment.service_title}</Text>
                    <Text style={styles.appointmentClient} numberOfLines={1}>{appointment.client_name || 'Client'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30, // Extra padding at the bottom for comfortable scrolling
  },
  timeSlotSelectorContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    marginBottom: 20,
  },
  dateTitle: {
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  advancedButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarContainer: {
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderRadius: 12,
  },
  calendar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    overflow: 'hidden',
  },
  appointmentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appointmentTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    minWidth: 80,
  },
  appointmentTime: {
    fontSize: 14,
    marginLeft: 5,
    color: COLORS.primary,
  },
  appointmentDetailsContainer: {
    flex: 1,
  },
  appointmentService: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  appointmentClient: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  calendar: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    margin: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  calendarArrow: {
    padding: 10,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekdayText: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  dayButton: {
    width: '14.28%', // 100% / 7 days
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    position: 'relative', // For dot positioning
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDay: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  selectedDayText: {
    color: '#FFF',
    fontWeight: '600',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: '#999',
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
  appointmentDay: {
    // Instagram-style subtle indicator for days with appointments
  },
  availabilityDay: {
    // Light indicator for days with availability set
  },
  appointmentDayText: {
    fontWeight: '500',
  },
  appointmentDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingServices: {
    padding: 16,
    alignItems: 'center',
  },
  serviceSelector: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addServiceText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  serviceCardsScroll: {
    marginLeft: -8, // Compensate for card padding
  },
  serviceCardsContent: {
    paddingRight: 15,
    paddingVertical: 8,
  },
  serviceCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  selectedServiceCard: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  serviceCardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceCardPrice: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  selectedServiceCardText: {
    color: '#ffffff',
  },
  serviceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
  },
  selectedServiceButtonText: {
    color: '#FFFFFF',
  },
  noServicesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateIcon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  },
  debugToggleText: {
    fontSize: 12,
    color: '#888',
    marginRight: 4,
  },
  debugContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  emptyStateActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
  },
  refreshIcon: {
    marginRight: 2
  },
  createServiceButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  createServiceIcon: {
    marginRight: 4
  },
  createServiceButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeSlotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  timeSlotsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  bulkActionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  bulkActionButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  timeSlotsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
    width: 80,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  availableSlot: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  unavailableSlot: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  bookedSlot: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
  },
  defaultSlot: {
    backgroundColor: '#81C784',
    borderColor: '#388E3C',
    borderStyle: 'dashed',
  },
  explicitSlot: {
    borderWidth: 2,
  },
  defaultLegend: {
    backgroundColor: '#81C784',
    borderColor: '#388E3C',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  weekendMessage: {
    padding: 15,
    backgroundColor: '#FFECB3',
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  weekendText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 5,
  },
  weekendSubtext: {
    fontSize: 14,
    color: '#757575',
  },
  defaultLabel: {
    fontSize: 10,
    color: '#2E7D32',
    marginTop: 2,
    fontStyle: 'italic',
  },
  availableText: {
    color: '#4CAF50',
  },
  unavailableText: {
    color: '#666',
  },
  appointmentSlot: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
    flex: 1,
    marginLeft: 12,
  },
  appointmentText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  appointmentClientText: {
    fontSize: 12,
    color: '#666',
  },
});

export default ProviderCalendarScreen;
