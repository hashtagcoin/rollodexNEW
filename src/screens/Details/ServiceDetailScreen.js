import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, FlatList, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Feather, MaterialIcons, Ionicons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';
import { format, addDays, isSameDay, parseISO } from 'date-fns';

import BookingAvailabilityScreen from '../Bookings/BookingAvailabilityScreen';

const ServiceDetailScreen = ({ route }) => {
  console.log('[ServiceDetailScreen] Rendering...');
  const { serviceId } = route.params;
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  const [liked, setLiked] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedTimeDisplay, setSelectedTimeDisplay] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(null);
  const [quickAvailLoading, setQuickAvailLoading] = useState(false);
  const [quickSlots, setQuickSlots] = useState([]);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  
  // Generate quick availability slots for the next 7 days
  useEffect(() => {
    if (serviceData && serviceData.available) {
      setQuickAvailLoading(true);
      
      // Generate availability for next 7 days
      const today = new Date();
      const availabilitySlots = [];
      
      // For demo purposes, generate some random availability
      for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const isAvailable = Math.random() > 0.3; // 70% chance of availability
        
        if (isAvailable) {
          // Generate 1-3 random time slots for this day
          const numSlots = Math.floor(Math.random() * 3) + 1;
          const hours = [9, 10, 11, 13, 14, 15, 16, 17];
          
          for (let j = 0; j < numSlots; j++) {
            const randomHourIndex = Math.floor(Math.random() * hours.length);
            const hour = hours.splice(randomHourIndex, 1)[0]; // Remove used hour
            
            const time = `${hour}:00:00`;
            const display = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
            const hourlyRate = serviceData.price || 50;
            
            availabilitySlots.push({
              date,
              dateStr,
              time,
              display,
              hourlyRate,
              dayName: format(date, 'EEE'),
              dayOfMonth: format(date, 'd'),
              month: format(date, 'MMM')
            });
          }
        }
      }
      
      // Sort by date and time
      availabilitySlots.sort((a, b) => {
        const dateA = new Date(`${a.dateStr}T${a.time}`);
        const dateB = new Date(`${b.dateStr}T${b.time}`);
        return dateA - dateB;
      });
      
      setQuickSlots(availabilitySlots);
      setQuickAvailLoading(false);
    }
  }, [serviceData]);

  // Fetch service details from Supabase
  const fetchServiceDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch the service and provider details in a single query with a join
      const { data, error } = await supabase
        .from('services')
        .select(`
          id, title, description, category, format, price, available, media_urls,
          service_providers!inner(
            business_name, credentials, verified, service_area, business_description, logo_url
          )
        `)
        .eq('id', serviceId)
        .single();
        
      if (error) throw error;
      
      // Format the data for our UI
      if (data) {
        setServiceData({
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          format: data.format,
          price: data.price,
          available: data.available,
          media_urls: data.media_urls,
          business_name: data.service_providers.business_name,
          credentials: data.service_providers.credentials,
          verified: data.service_providers.verified,
          service_area: data.service_providers.service_area,
          business_description: data.service_providers.business_description,
          logo_url: data.service_providers.logo_url,
          // Adding mock data for fields not in the database
          rating: 4.8,
          subtitle: `${data.category} services - ${data.format}`,
          support_types: [data.category, data.format === 'Online' ? 'Remote Support' : 'In-Person Support'],
          availability: data.available ? 'Monday–Friday' : 'Currently Unavailable',
          ndis_number: '4-6785-8920'
        });
      }
    } catch (err) {
      console.error('Error fetching service details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);
  
  // Initial data fetch
  useEffect(() => {
    fetchServiceDetails();
    checkIfFavorited();
  }, [fetchServiceDetails]);
  
  // Check if this service is in user's favorites
  const checkIfFavorited = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('[ServiceDetailScreen] Not logged in, cannot check favorites');
        return;
      }
      
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', serviceId)
        .eq('item_type', 'service_provider');
        
      if (error) {
        console.error('[ServiceDetailScreen] Error checking favorites:', error);
        return;
      }
      
      setLiked(data && data.length > 0);
    } catch (err) {
      console.error('[ServiceDetailScreen] Exception checking favorites:', err);
    }
  }, [serviceId]);
  
  // Toggle favorite status in Supabase
  const toggleFavorite = useCallback(async () => {
    try {
      setFavoriteLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        Alert.alert('Authentication Error', 'You must be logged in to favorite items.');
        setFavoriteLoading(false);
        return;
      }
      
      if (liked) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', serviceId)
          .eq('item_type', 'service_provider');
          
        if (error) {
          console.error('[ServiceDetailScreen] Error removing favorite:', error);
          Alert.alert('Error', 'Could not remove from favorites. Please try again.');
        } else {
          setLiked(false);
          console.log('[ServiceDetailScreen] Removed from favorites');
        }
      } else {
        // Add to favorites using upsert to handle potential conflicts
        const { error } = await supabase
          .from('favorites')
          .upsert({
            user_id: user.id,
            item_id: serviceId,
            item_type: 'service_provider'
          }, {
            onConflict: 'user_id,item_id,item_type',
            ignoreDuplicates: true
          });
          
        if (error) {
          console.error('[ServiceDetailScreen] Error adding favorite:', error);
          Alert.alert('Error', 'Could not add to favorites. Please try again.');
        } else {
          setLiked(true);
          console.log('[ServiceDetailScreen] Added to favorites');
        }
      }
    } catch (err) {
      console.error('[ServiceDetailScreen] Exception in toggleFavorite:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setFavoriteLoading(false);
    }
  }, [serviceId, liked]);
  
  // Generate stars based on rating
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <MaterialIcons key={`full-${i}`} name="star" size={16} color="#FFD700" />
        ))}
        {halfStar && <MaterialIcons key="half" name="star-half" size={16} color="#FFD700" />}
        {[...Array(emptyStars)].map((_, i) => (
          <MaterialIcons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />
        ))}
        <Text style={styles.ratingText}>{rating}</Text>
      </View>
    );
  };

  const renderTabContent = () => {
    if (!serviceData) return null;
    
    switch (activeTab) {
      case 'Overview':
        return (
          <View style={styles.tabContent}>
            <View style={styles.supportTypes}>
              <Text style={styles.supportTypeText}>
                {serviceData.support_types?.join(' • ') || `${serviceData.category} • ${serviceData.format}`}
              </Text>
            </View>
            
            <Text style={styles.descriptionText}>
              {serviceData.description || 'No description available'}
            </Text>
            
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <Text style={styles.infoText}>{serviceData.availability}</Text>
              
              {/* Horizontal scrolling available dates */}
              <View style={styles.quickAvailabilitySection}>
                <Text style={styles.sectionTitle}>Next Available</Text>
                {quickAvailLoading ? (
                  <ActivityIndicator size="small" color="#007AFF" style={{marginTop: 10}} />
                ) : quickSlots.length > 0 ? (
                  <FlatList
                    horizontal
                    data={quickSlots}
                    keyExtractor={(item, index) => `slot-${index}`}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({item}) => (
                      <TouchableOpacity 
                        style={[styles.quickSlotItem, 
                          selectedDate && selectedTime && 
                          format(selectedDate, 'yyyy-MM-dd') === format(item.date, 'yyyy-MM-dd') && 
                          selectedTime === item.time ? styles.selectedQuickSlot : null]} 
                        onPress={() => {
                          // Select this quick slot
                          setSelectedDate(item.date);
                          setSelectedTime(item.time);
                          setSelectedTimeDisplay(item.display);
                          setHourlyRate(item.hourlyRate);
                        }}
                      >
                        <Text style={styles.quickSlotMonth}>{item.month.toUpperCase()}</Text>
                        <Text style={styles.quickSlotDay}>{item.dayOfMonth}</Text>
                        <Text style={styles.quickSlotTime}>{item.display}</Text>
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.quickSlotsContainer}
                  />
                ) : (
                  <Text style={styles.noAvailabilityText}>No availability for the next few days</Text>
                )}
                
                {/* Modern blue button with calendar icon - moved under Next Available */}
                <TouchableOpacity 
                  style={styles.modernBlueButton} 
                  onPress={() => setShowAvailabilityModal(true)}
                >
                  <Ionicons name="calendar-outline" size={22} color="#fff" style={styles.btnIcon} />
                  <Text style={styles.modernButtonText}>Check Availability</Text>
                </TouchableOpacity>
              </View>
              
              {/* Booking information (shows when date/time selected) */}
              {selectedDate && selectedTime && (
                <View style={styles.bookingSummary}>
                  <Text style={styles.bookingSummaryTitle}>You are booking:</Text>
                  <View style={styles.bookingInfoRow}>
                    <FontAwesome5 name="calendar-alt" size={18} color="#007AFF" style={styles.bookingInfoIcon} />
                    <Text style={styles.bookingInfoText}>
                      {format(selectedDate, 'EEE, MMM d, yyyy')} at {selectedTimeDisplay}
                    </Text>
                  </View>
                  <View style={styles.bookingInfoRow}>
                    <FontAwesome5 name="map-marker-alt" size={18} color="#007AFF" style={styles.bookingInfoIcon} />
                    <Text style={styles.bookingInfoText}>
                      {serviceData.service_area || 'Online'}
                    </Text>
                  </View>
                  <View style={styles.bookingInfoRow}>
                    <FontAwesome5 name="money-bill-wave" size={18} color="#007AFF" style={styles.bookingInfoIcon} />
                    <Text style={styles.bookingInfoText}>
                      ${hourlyRate} per hour
                    </Text>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.infoText}>{serviceData.service_area || 'Australia-wide'}</Text>
            </View>
            
            {serviceData.price && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Price</Text>
                <Text style={styles.infoText}>${serviceData.price} per session</Text>
              </View>
            )}
          </View>
        );
      case 'Credentials':
        return (
          <View style={styles.tabContent}>
            <View style={styles.credentialsHeader}>
              <Text style={styles.sectionTitle}>Credentials</Text>
              {serviceData.verified && (
                <View style={styles.accreditedBadge}>
                  <Text style={styles.accreditedText}>Accredited</Text>
                </View>
              )}
            </View>
            <Text style={styles.credentialText}>
              NDIS Registration Number: {serviceData.ndis_number || '4-6785-8920'}
            </Text>
            {serviceData.credentials && serviceData.credentials.length > 0 ? (
              serviceData.credentials.map((credential, index) => (
                <Text key={index} style={styles.credentialText}>• {credential}</Text>
              ))
            ) : (
              <Text style={styles.credentialText}>No additional credentials listed</Text>
            )}
          </View>
        );
      case 'Reviews':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.reviewsText}>No reviews yet.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // Show loading indicator when data is being fetched
  if (loading) {
    return (
      <View style={[styles.screenContainer, styles.loadingContainer]}>
        <AppHeader title="" navigation={navigation} canGoBack={true} />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading service details...</Text>
      </View>
    );
  }
  
  // Show error message if there was an error
  if (error) {
    return (
      <View style={[styles.screenContainer, styles.errorContainer]}>
        <AppHeader title="Error" navigation={navigation} canGoBack={true} />
        <Text style={styles.errorText}>Failed to load service details</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // If no service data is available
  if (!serviceData) {
    return (
      <View style={[styles.screenContainer, styles.errorContainer]}>
        <AppHeader title="Not Found" navigation={navigation} canGoBack={true} />
        <Text style={styles.errorText}>Service not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title=""
        navigation={navigation}
        canGoBack={true}
      />
      <ScrollView style={styles.container}>
        {/* Hero Header Image */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: serviceData.media_urls?.[0] || 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/therapy/1.png' }} 
            style={styles.heroImage} 
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.heroGradient}
          />
          
          {/* Like button - styled to match ServiceCard */}
          <TouchableOpacity 
            style={styles.heartIconContainer}
            onPress={toggleFavorite}
            activeOpacity={0.8}
            disabled={favoriteLoading}
          >
            <View style={styles.heartIconCircle}>
              {favoriteLoading ? (
                <ActivityIndicator size="small" color={liked ? "#FF6B6B" : "white"} />
              ) : (
                <Ionicons 
                  name={liked ? "heart" : "heart-outline"} 
                  size={20} 
                  color={liked ? "#FF6B6B" : "white"} 
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Provider name and details */}
        <Text style={styles.title}>{serviceData.title || serviceData.business_name}</Text>
        <Text style={styles.subtitle}>{serviceData.subtitle}</Text>
        
        {/* Rating stars */}
        {renderStars(serviceData.rating || 4.8)}
        
        {/* Tab navigation */}
        <View style={styles.tabsContainer}>
          {['Overview', 'Credentials', 'Reviews'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Tab content */}
        {renderTabContent()}
      </ScrollView>
      
      {/* Action buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Feather name="message-circle" size={20} color="black" />
          <Text style={styles.secondaryButtonText}>Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton}>
          <Feather name="share" size={20} color="black" />
          <Text style={styles.secondaryButtonText}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.primaryButton, !serviceData.available && styles.disabledButton]}
          disabled={!serviceData.available}
          onPress={() => {
            console.log('[ServiceDetailScreen] Action button pressed - selectedDate:', selectedDate, 'selectedTime:', selectedTime);
            
            if (selectedDate && selectedTime) {
              // Navigate to create booking screen with all required information
              navigation.navigate('CreateBooking', {
                serviceId: serviceData.id,
                serviceName: serviceData.title,
                serviceProviderName: serviceData.business_name,
                servicePrice: hourlyRate || serviceData.price,
                selectedDate: selectedDate,
                selectedTime: selectedTime,
                selectedTimeDisplay: selectedTimeDisplay,
                location: serviceData.service_area || 'Online'
              });
            } else {
              // If no date/time selected, show the availability modal
              setShowAvailabilityModal(true);
            }
          }}
        >
          <Text style={styles.primaryButtonText}>
            {!serviceData.available ? 'Currently Unavailable' : 
             (selectedDate && selectedTime) ? 'Confirm' : 'Book'}
          </Text>
        </TouchableOpacity>
      </View>
    {/* Booking Availability Modal */}
    <BookingAvailabilityScreen
      visible={showAvailabilityModal}
      onClose={() => {
        console.log('[ServiceDetailScreen] onClose called');
        setShowAvailabilityModal(false);
      }}
      onSelect={({ date, time, display, hourlyRate }) => {
        console.log('[ServiceDetailScreen] onSelect triggered. Date:', date, 'TimeSlot:', { time, display, hourlyRate });
        setShowAvailabilityModal(false);
        // Use setTimeout to decouple state updates from modal closing
        setTimeout(() => {
          console.log('[ServiceDetailScreen] Setting state in onSelect after timeout.');
          setSelectedDate(date);
          setSelectedTime(time);
          setSelectedTimeDisplay(display);
          setHourlyRate(hourlyRate);
          console.log('[ServiceDetailScreen] State updates complete after timeout.');
        }, 50);
      }}
      selectedServiceId={serviceData.id}
      baseHourlyRate={serviceData.price}
      // serviceData={serviceData} // Pass the whole serviceData object
    />
  </View>
  );
};

const styles = StyleSheet.create({
  // Modern button (now green to match primaryButton)
  modernBlueButton: {
    backgroundColor: '#2E7D32', // Changed from blue to green to match primaryButton
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  modernButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 6,
  },
  btnIcon: {
    marginRight: 8,
  },
  
  // Quick availability section - Instagram style horizontal list
  quickAvailabilitySection: {
    marginTop: 16,
    marginBottom: 10,
  },
  quickSlotsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  quickSlotItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedQuickSlot: {
    backgroundColor: '#e1f5fe',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  quickSlotMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333', // Changed from blue to black
    marginBottom: 4,
  },
  quickSlotDay: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  quickSlotTime: {
    fontSize: 14,
    color: '#555',
  },
  noAvailabilityText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  
  // Booking summary - Airbnb style card
  bookingSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderColor: '#eee',
    borderWidth: 1,
  },
  bookingSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  bookingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingInfoIcon: {
    marginRight: 12,
  },
  bookingInfoText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E53935',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff', 
  },
  heroContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  heartIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  heartIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabButton: {
    backgroundColor: '#fff',
  },
  tabButtonText: {
    fontSize: 15,
    color: '#888',
  },
  activeTabButtonText: {
    fontWeight: '600',
    color: '#000',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#000',
  },
  tabContent: {
    paddingBottom: 80, // Extra space for buttons at bottom
  },
  supportTypes: {
    marginBottom: 16,
  },
  supportTypeText: {
    fontSize: 15,
    color: '#555',
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 15,
    color: '#555',
  },
  credentialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accreditedBadge: {
    backgroundColor: '#F1F8F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  accreditedText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
  },
  credentialText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 8,
  },
  reviewsText: {
    fontSize: 15,
    color: '#888',
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 10,
  },
  secondaryButtonText: {
    marginLeft: 6,
    color: '#333',
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

});

export default ServiceDetailScreen;
