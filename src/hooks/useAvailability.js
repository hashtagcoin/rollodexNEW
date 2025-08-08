import { useState, useEffect, useCallback } from 'react';
import { Alert } from '../utils/alert';

import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';

/**
 * Custom hook to manage service provider availability
 * @param {string} serviceId - Optional service ID to filter availability
 * @returns {Object} - Methods and state for managing availability
 */
const useAvailability = (serviceId = null) => {
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  
  /**
   * Fetch availability for a provider, optionally filtered by service
   * @param {string} providerId - The provider ID
   * @param {string} [specificServiceId] - Optional service ID to filter by
   * @param {string} [startDate] - Optional start date in YYYY-MM-DD format
   * @param {string} [endDate] - Optional end date in YYYY-MM-DD format
   */
  const fetchAvailability = useCallback(async (
    providerId, 
    specificServiceId = serviceId, 
    startDate = null,
    endDate = null
  ) => {
    if (!providerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId);
      
      // Filter by service if provided
      if (specificServiceId) {
        query = query.eq('service_id', specificServiceId);
      }
      
      // Filter by date range if provided
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setAvailability(data || []);
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', 'Failed to load availability data');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);
  
  /**
   * Fetch booked appointments for a provider
   * @param {string} providerId - The provider ID
   * @param {string} [specificServiceId] - Optional service ID to filter by
   * @param {string} [startDate] - Optional start date in YYYY-MM-DD format
   * @param {string} [endDate] - Optional end date in YYYY-MM-DD format
   */
  const fetchBookedSlots = useCallback(async (
    providerId, 
    specificServiceId = serviceId, 
    startDate = null,
    endDate = null
  ) => {
    if (!providerId) return;
    
    try {
      let query = supabase
        .from('bookings_with_details')
        .select('*')
        .eq('provider_id', providerId)
        .or('status.eq.confirmed,status.eq.pending');
      
      // Filter by service if provided
      if (specificServiceId) {
        query = query.eq('service_id', specificServiceId);
      }
      
      // Filter by date range if provided
      if (startDate) {
        query = query.gte('scheduled_at', `${startDate}T00:00:00`);
      }
      
      if (endDate) {
        query = query.lte('scheduled_at', `${endDate}T23:59:59`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const formattedBookings = (data || []).map(booking => {
        const scheduledAt = new Date(booking.scheduled_at);
        return {
          id: booking.id,
          date: scheduledAt.toISOString().split('T')[0],
          timeValue: scheduledAt.toTimeString().substring(0, 8), // HH:MM:SS format
          client: booking.client_name,
          service: booking.service_title,
          status: booking.status
        };
      });
      
      setBookedSlots(formattedBookings);
    } catch (err) {
      console.error('Error fetching booked slots:', err);
    }
  }, [serviceId]);
  
  /**
   * Set availability for a specific date and time slot
   * @param {Object} params - The availability parameters
   * @param {string} params.providerId - The provider ID
   * @param {string} params.serviceId - The service ID
   * @param {string} params.date - The date in YYYY-MM-DD format
   * @param {string} params.timeSlot - The time slot value in HH:MM:SS format
   * @param {boolean} params.available - Whether the slot is available
   */
  const setTimeSlotAvailability = async ({ providerId, serviceId, date, timeSlot, available }) => {
    if (!providerId || !serviceId || !date || !timeSlot) {
      console.error('Missing required parameters for setting availability');
      return { success: false };
    }
    
    try {
      // Check if this time slot already has availability entry
      const { data: existingSlots } = await supabase
        .from('provider_availability')
        .select('id')
        .eq('provider_id', providerId)
        .eq('service_id', serviceId)
        .eq('date', date)
        .eq('time_slot', timeSlot);
      
      if (existingSlots && existingSlots.length > 0) {
        if (available) {
          // Already available, do nothing
          return { success: true, operation: 'unchanged' };
        } else {
          // Remove availability
          const { error } = await supabase
            .from('provider_availability')
            .delete()
            .eq('id', existingSlots[0].id);
            
          if (error) throw error;
          
          // Update local state
          setAvailability(prev => prev.filter(slot => slot.id !== existingSlots[0].id));
          return { success: true, operation: 'deleted' };
        }
      } else {
        if (!available) {
          // Already unavailable, do nothing
          return { success: true, operation: 'unchanged' };
        } else {
          // Insert new availability
          const { data, error } = await supabase
            .from('provider_availability')
            .insert({
              provider_id: providerId,
              service_id: serviceId,
              date,
              time_slot: timeSlot,
              available: true
            })
            .select();
            
          if (error) throw error;
          
          // Update local state
          setAvailability(prev => [...prev, data[0]]);
          return { success: true, operation: 'inserted', data: data[0] };
        }
      }
    } catch (err) {
      console.error('Error setting availability:', err);
      return { success: false, error: err.message };
    }
  };
  
  /**
   * Update multiple time slots availability at once
   * @param {Object[]} slots - Array of slot objects to update
   * @param {string} providerId - The provider ID
   * @param {string} serviceId - The service ID
   */
  const batchUpdateAvailability = async (slots, providerId, serviceId) => {
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return { success: false, error: 'No slots to update' };
    }
    
    if (!providerId || !serviceId) {
      return { success: false, error: 'Provider ID and Service ID required' };
    }
    
    const toInsert = [];
    const toDelete = [];
    
    try {
      // Process slots to determine which to insert and which to delete
      for (const slot of slots) {
        const { date, timeSlot, available } = slot;
        
        // Check if slot exists
        const { data: existing } = await supabase
          .from('provider_availability')
          .select('id')
          .eq('provider_id', providerId)
          .eq('service_id', serviceId)
          .eq('date', date)
          .eq('time_slot', timeSlot);
        
        if (existing && existing.length > 0) {
          // Slot exists
          if (!available) {
            toDelete.push(existing[0].id);
          }
          // If still available, do nothing
        } else {
          // Slot doesn't exist
          if (available) {
            toInsert.push({
              provider_id: providerId,
              service_id: serviceId,
              date,
              time_slot: timeSlot,
              available: true
            });
          }
          // If should be unavailable, it already is
        }
      }
      
      // Execute batch operations
      const operations = [];
      
      if (toInsert.length > 0) {
        operations.push(
          supabase.from('provider_availability').insert(toInsert)
        );
      }
      
      for (const id of toDelete) {
        operations.push(
          supabase.from('provider_availability').delete().eq('id', id)
        );
      }
      
      if (operations.length > 0) {
        await Promise.all(operations);
        
        // Refresh availability data
        if (profile?.id) {
          fetchAvailability(
            profile.id,
            serviceId
          );
        }
      }
      
      return { 
        success: true, 
        inserted: toInsert.length, 
        deleted: toDelete.length 
      };
    } catch (err) {
      console.error('Error in batch update:', err);
      return { success: false, error: err.message };
    }
  };
  
  /**
   * Apply a recurring availability pattern
   * @param {Object} params - The pattern parameters
   * @param {string} params.providerId - The provider ID
   * @param {string} params.serviceId - The service ID
   * @param {number[]} params.daysOfWeek - Array of days (0=Sunday, 6=Saturday)
   * @param {string[]} params.timeSlots - Array of time slots in HH:MM:SS format
   * @param {string} params.startDate - Start date in YYYY-MM-DD format
   * @param {string} params.endDate - End date in YYYY-MM-DD format
   * @param {boolean} params.setAvailable - Whether to set as available or unavailable
   */
  const applyRecurringPattern = async ({ 
    providerId,
    serviceId,
    daysOfWeek,
    timeSlots,
    startDate,
    endDate,
    setAvailable = true
  }) => {
    if (!providerId || !serviceId || !daysOfWeek || !timeSlots || !startDate || !endDate) {
      return { success: false, error: 'Missing required parameters' };
    }
    
    try {
      // Generate all dates in range that match day of week
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates = [];
      
      // Loop through each day in range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
        
        if (daysOfWeek.includes(dayOfWeek)) {
          const dateStr = d.toISOString().split('T')[0];
          
          // For each matching day, add entries for each time slot
          for (const timeSlot of timeSlots) {
            dates.push({
              date: dateStr,
              timeSlot,
              available: setAvailable
            });
          }
        }
      }
      
      // Use batch update to apply the pattern
      return await batchUpdateAvailability(dates, providerId, serviceId);
    } catch (err) {
      console.error('Error applying recurring pattern:', err);
      return { success: false, error: err.message };
    }
  };
  
  // Initialize by loading availability for current user if they are a provider
  useEffect(() => {
    if (profile?.id && profile?.is_service_provider) {
      fetchAvailability(profile.id);
      fetchBookedSlots(profile.id);
    }
  }, [profile?.id, fetchAvailability, fetchBookedSlots]);
  
  return {
    loading,
    error,
    availability,
    bookedSlots,
    fetchAvailability,
    fetchBookedSlots,
    setTimeSlotAvailability,
    batchUpdateAvailability,
    applyRecurringPattern
  };
};

export default useAvailability;
