import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { format, isAfter, parseISO } from 'date-fns';

/**
 * Custom hook to manage bookings and available time slots
 */
export const useBookings = (userId) => {
  const [bookings, setBookings] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Format time slot for display (convert from HH:MM:SS to h:MM AM/PM)
   */
  const formatTimeSlot = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const h = parseInt(hours, 10);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      
      return `${hour}:${minutes} ${period}`;
    } catch (err) {
      return timeString;
    }
  };

  /**
   * Fetch user's bookings (upcoming or past)
   */
  const fetchBookings = useCallback(async (isUpcoming = true) => {
    if (!userId) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString();
      
      // Query based on whether we want upcoming or past bookings
      const query = supabase
        .from('bookings_with_details')
        .select('*')
        .eq('user_profile_id', userId);
        
      if (isUpcoming) {
        query.gte('scheduled_at', today);
      } else {
        query.lt('scheduled_at', today);
      }
      
      // Add order and limit
      const { data, error } = await query
        .order('scheduled_at', { ascending: isUpcoming })
        .limit(50);
        
      if (error) throw error;
      
      setBookings(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Generate default time slots from 9 AM to 5 PM
   */
  const generateDefaultTimeSlots = (date) => {
    const slots = [];
    const dateObj = new Date(date);
    
    // Return empty array if weekend (0 is Sunday, 6 is Saturday)
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return slots; // No slots for weekends
    }
    
    // Generate time slots between 9 AM and 5 PM, every 1 hour
    for (let hour = 9; hour <= 17; hour++) {
      const timeValue = `${hour.toString().padStart(2, '0')}:00:00`;
      slots.push({
        id: `default-${timeValue}`,
        timeValue,
        displayTime: formatTimeSlot(timeValue),
        isAvailable: true,
        isDefaultSlot: true
      });
    }
    
    return slots;
  };

  /**
   * Fetch available time slots for a service on a specific date
   */
  const fetchAvailableTimeSlots = useCallback(async (serviceId, date) => {
    if (!serviceId || !date) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      // First get the provider_id for this service
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('provider_id')
        .eq('id', serviceId)
        .single();
        
      if (serviceError) throw serviceError;
      
      if (!serviceData?.provider_id) {
        throw new Error('Provider information not found');
      }
      
      // Now fetch availability for this provider and service
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', serviceData.provider_id)
        .eq('service_id', serviceId)
        .eq('date', date);
        
      if (availabilityError) throw availabilityError;
      
      let timeSlots = [];
      
      // If provider has explicitly set availability for this date
      if (availabilityData && availabilityData.length > 0) {
        // Check if there are any explicitly available slots
        const explicitAvailableSlots = availabilityData.filter(slot => slot.available === true);
        
        // If provider has explicitly set available slots, use those
        if (explicitAvailableSlots.length > 0) {
          timeSlots = explicitAvailableSlots.map(slot => ({
            id: slot.id,
            timeValue: slot.time_slot,
            displayTime: formatTimeSlot(slot.time_slot),
            isAvailable: true,
            isProviderSet: true
          }));
        } else {
          // Provider set slots but none are available, respect provider's choice
          timeSlots = [];
        }
      } else {
        // Provider hasn't set any availability, use default weekday slots
        timeSlots = generateDefaultTimeSlots(date);
      }
      
      // Sort by time
      timeSlots.sort((a, b) => {
        return a.timeValue.localeCompare(b.timeValue);
      });
      
      // Check for existing bookings at these times
      const { data: existingBookings, error: bookingsError } = await supabase
        .from('service_bookings')
        .select('scheduled_at')
        .eq('service_id', serviceId)
        .eq('status', 'confirmed');
        
      if (bookingsError) throw bookingsError;
      
      // Filter out any times that already have bookings
      const filteredTimeSlots = timeSlots.filter(slot => {
        const slotDateTime = `${date}T${slot.timeValue}`;
        
        return !(existingBookings || []).some(booking => {
          const bookingTime = new Date(booking.scheduled_at);
          const slotTime = new Date(slotDateTime);
          
          // Compare if they're the same time (within a few minutes)
          return Math.abs(bookingTime - slotTime) < 5 * 60 * 1000; // 5 minutes tolerance
        });
      });
      
      // Also filter out time slots in the past
      const now = new Date();
      const filteredCurrentTimeSlots = filteredTimeSlots.filter(slot => {
        const slotDateTime = new Date(`${date}T${slot.timeValue}`);
        return isAfter(slotDateTime, now);
      });
      
      setAvailableTimeSlots(filteredCurrentTimeSlots);
      return filteredCurrentTimeSlots;
    } catch (err) {
      console.error('Error fetching available time slots:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new booking
   */
  const createBooking = useCallback(async (serviceId, timeSlot, date) => {
    if (!userId || !serviceId || !timeSlot || !date) {
      setError('Missing required booking information');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create the booking
      const scheduledDateTime = `${date}T${timeSlot.timeValue}`;
      
      const { data, error } = await supabase
        .from('service_bookings')
        .insert({
          user_profile_id: userId,
          service_id: serviceId,
          scheduled_at: scheduledDateTime,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Cancel an existing booking
   */
  const cancelBooking = useCallback(async (bookingId) => {
    if (!bookingId) {
      setError('No booking ID provided');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Update the booking status to cancelled
      const { error } = await supabase
        .from('service_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Refresh the bookings list
      await fetchBookings(true);
      return true;
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBookings]);

  return {
    bookings,
    availableTimeSlots,
    loading,
    error,
    fetchBookings,
    fetchAvailableTimeSlots,
    createBooking,
    cancelBooking,
  };
};

export default useBookings;
