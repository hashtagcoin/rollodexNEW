import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Feather from 'react-native-vector-icons/Feather'; 
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AntDesign, Entypo, Octicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import DynamicLogo from '../../components/common/DynamicLogo';
import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';
import { useNotifications, NotificationBadge } from '../../components/notifications';

// Import screens for tab navigation
import ExploreStackNavigator from '../../navigation/ExploreStackNavigator';
import WalletStackNavigator from '../../navigation/WalletStackNavigator';
import SocialStackNavigator from '../../navigation/SocialStackNavigator';
import FavouritesScreen from '../Main/FavouritesScreen';
import ProfileStackNavigator from '../../navigation/ProfileStackNavigator';

// Safe date parser to handle potentially invalid date strings
const safelyFormatDate = (dateString, formatStr = 'MMM d') => {
  try {
    if (!dateString) return 'Not specified';
    
    // Try to parse the date string safely
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    
    // Check if the date is valid
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

// Safe time ago function
const safeTimeAgo = (dateString) => {
  try {
    if (!dateString) return '';
    
    // Try to parse the date string safely
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    
    // Check if the date is valid
    if (!isValid(date)) return '';
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return '';
  }
};

// Create Tab Navigator
const Tab = createBottomTabNavigator();

// Provider Dashboard Content Component
const ProviderDashboardContent = () => {
  const { profile, isProviderMode, toggleProviderMode } = useUser();
  const { showNotificationTray, unreadCount } = useNotifications();
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [listings, setListings] = useState({
    services: [],
    housing: []
  });
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingAgreements: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState({
    appointments: true,
    listings: true,
    stats: true
  });
  const [error, setError] = useState(null);
  const [isNewProvider, setIsNewProvider] = useState(false);
  
  // Use useFocusEffect to scroll to top when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }
      return () => {};
    }, [])
  );
  
  // Fetch upcoming appointments where the user is the provider
  const fetchUpcomingAppointments = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, appointments: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(prevState => ({ ...prevState, appointments: false }));
      setUpcomingAppointments([]);
    }, 5000); // 5 second timeout
    
    try {
      // First check if provider has any services/listings
      const { count: serviceCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', profile.id);
      
      // If no services, skip appointment loading
      if (serviceCount === 0) {
        clearTimeout(timeoutId);
        setUpcomingAppointments([]);
        setLoading(prevState => ({ ...prevState, appointments: false }));
        return;
      }
      const today = new Date().toISOString();
      
      // Get upcoming appointments/bookings for services provided by this user
      const { data, error } = await supabase
        .from('bookings_with_details')
        .select('*')
        .eq('provider_id', profile.id)
        .gte('scheduled_at', today)
        .order('scheduled_at', { ascending: true })
        .limit(5);
        
      if (error) throw error;
      
      clearTimeout(timeoutId);
      setUpcomingAppointments(data || []);
    } catch (err) {
      console.error('Error fetching provider appointments:', err);
      clearTimeout(timeoutId);
      setUpcomingAppointments([]); // Set empty array on error
    } finally {
      setLoading(prevState => ({ ...prevState, appointments: false }));
    }
  }, [profile]);
  
  // Fetch provider's service listings
  const fetchListings = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, listings: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(prevState => ({ ...prevState, listings: false }));
      setListings({ services: [], housing: [] });
    }, 8000); // 8 second timeout
    
    try {
      // Get services provided by this user
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', profile.id)
        .order('created_at', { ascending: false });
        
      if (serviceError) throw serviceError;
      
      // Get housing listings provided by this user
      const { data: housingData, error: housingError } = await supabase
        .from('housing_listings')
        .select('*')
        .eq('provider_id', profile.id)
        .order('created_at', { ascending: false });
        
      if (housingError) throw housingError;
      
      clearTimeout(timeoutId);
      setListings({
        services: serviceData || [],
        housing: housingData || []
      });
    } catch (err) {
      console.error('Error fetching provider listings:', err);
      clearTimeout(timeoutId);
      setListings({ services: [], housing: [] }); // Set empty arrays on error
    } finally {
      setLoading(prevState => ({ ...prevState, listings: false }));
    }
  }, [profile]);
  
  // Fetch provider stats
  const fetchProviderStats = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, stats: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(prevState => ({ ...prevState, stats: false }));
      setStats({ totalBookings: 0, pendingAgreements: 0, revenue: 0 });
    }, 5000); // 5 second timeout
    
    try {
      // First check if provider exists in service_providers table
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      // If provider doesn't exist or error, set default stats
      if (providerError || !providerData) {
        clearTimeout(timeoutId);
        setStats({ totalBookings: 0, pendingAgreements: 0, revenue: 0 });
        setLoading(prevState => ({ ...prevState, stats: false }));
        return;
      }
      // Get total bookings count - using correct table and join structure
      let totalBookings = 0;
      try {
        if (providerData) {
          // Now get bookings through services table
          const { count, error: bookingError } = await supabase
            .from('service_bookings')
            .select('*, services!inner(provider_id)', { count: 'exact', head: true })
            .eq('services.provider_id', providerData.id);
            
          if (!bookingError) {
            totalBookings = count || 0;
          }
        }
      } catch (countError) {
        console.log('Count query failed, defaulting to 0');
      }
      
      // Get pending service agreements - using correct column name
      let pendingAgreements = 0;
      try {
        if (providerData) {
          const { count, error: agreementError } = await supabase
            .from('service_agreements')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerData.id)
            .eq('status', 'pending');
            
          if (!agreementError) {
            pendingAgreements = count || 0;
          }
        }
      } catch (agreementCountError) {
        console.log('Agreement count query failed, defaulting to 0');
      }
      
      // Get total revenue with correct table and column names
      let totalRevenue = 0;
      try {
        if (providerData) {
          // Get revenue from service_bookings through services table
          const { data: revenueData, error: revenueError } = await supabase
            .from('service_bookings')
            .select('total_price, services!inner(provider_id)')
            .eq('services.provider_id', providerData.id)
            .eq('status', 'completed');
            
          if (!revenueError && revenueData && Array.isArray(revenueData)) {
            // Calculate total revenue using total_price column
            totalRevenue = revenueData.reduce((sum, booking) => {
              // Make sure booking.total_price is a number before adding
              const price = typeof booking.total_price === 'number' ? booking.total_price : 0;
              return sum + price;
            }, 0);
          }
        }
      } catch (revenueError) {
        console.log('Revenue calculation failed, defaulting to 0');
      }
      
      // Update stats with safely calculated values
      clearTimeout(timeoutId);
      setStats({
        totalBookings,
        pendingAgreements,
        revenue: totalRevenue
      });
    } catch (err) {
      // More detailed error logging
      console.error('Error fetching provider stats:', err?.message || 'Unknown error');
      clearTimeout(timeoutId);
      // Set default stats on error
      setStats({ totalBookings: 0, pendingAgreements: 0, revenue: 0 });
    } finally {
      setLoading(prevState => ({ ...prevState, stats: false }));
    }
  }, [profile]);
  
  // Check if new provider
  const checkIfNewProvider = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      // Check if provider has any services or housing listings
      const [servicesResult, housingResult] = await Promise.all([
        supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', profile.id),
        supabase
          .from('housing_listings')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', profile.id)
      ]);
      
      const totalListings = (servicesResult.count || 0) + (housingResult.count || 0);
      setIsNewProvider(totalListings === 0);
      
      // If new provider, set all loading states to false immediately
      if (totalListings === 0) {
        setLoading({ appointments: false, listings: false, stats: false });
        setUpcomingAppointments([]);
        setListings({ services: [], housing: [] });
        setStats({ totalBookings: 0, pendingAgreements: 0, revenue: 0 });
      }
    } catch (error) {
      console.error('Error checking if new provider:', error);
      setIsNewProvider(false);
    }
  }, [profile]);

  // Fetch all data when component mounts or profile changes
  useEffect(() => {
    const loadProviderData = async () => {
      if (profile?.id && isProviderMode) {
        await checkIfNewProvider();
      }
    };
    
    loadProviderData();
  }, [profile, isProviderMode, checkIfNewProvider]);
  
  // Separate effect to fetch data based on isNewProvider state
  useEffect(() => {
    if (profile?.id && isProviderMode && !isNewProvider && !loading.appointments && !loading.listings && !loading.stats) {
      fetchUpcomingAppointments();
      fetchListings();
      fetchProviderStats();
    }
  }, [profile, isProviderMode, isNewProvider, fetchUpcomingAppointments, fetchListings, fetchProviderStats]);
  
  // Helper function to format dates for upcoming appointments with better error handling
  const formatAppointmentDate = (dateString) => {
    try {
      if (!dateString) return { date: 'Unknown', time: 'Unknown' };
      
      // Use our safe date parser
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      
      // Check if the date is valid before formatting
      if (!isValid(date)) {
        console.warn('Invalid date string:', dateString);
        return { date: 'Unknown', time: 'Unknown' };
      }
      
      return {
        date: format(date, 'MMM d'),
        time: format(date, 'h:mm a')
      };
    } catch (err) {
      console.error('Error formatting appointment date:', err);
      return { date: 'Unknown', time: 'Unknown' };
    }
  };
  
  // Handle new listing button press
  const handleNewListing = (type) => {
    if (type === 'service') {
      navigation.navigate('ProviderStack', { screen: 'CreateServiceListing' });
    } else if (type === 'housing') {
      navigation.navigate('ProviderStack', { screen: 'CreateHousingListing' });
    }
  };
  
  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* Top Bar with Logo Icon, Title and Notification */}
      <View style={styles.topBar}>
        <View style={styles.titleContainer}>
          <DynamicLogo
            isLight={true} // Provider dashboard has a light background by default
            style={styles.titleContainer}
            imageStyle={styles.titleLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logoicon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.notificationContainer}>
          <TouchableOpacity onPress={showNotificationTray}>
            <Ionicons name="notifications-outline" size={26} color="#222" />
            <NotificationBadge count={unreadCount} style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Welcome Header with Avatar */}
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitleText}>
              Welcome back,
            </Text>
            <Text style={styles.userNameText}>{profile?.business_name || profile?.full_name?.split(' ')[0] || ''}</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Image
              source={
                profile?.avatar_url
                  ? { uri: profile.avatar_url }
                  : require('../../assets/images/default-avatar.png')
              }
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Welcome Message for New Providers */}
        {isNewProvider && (
          <View style={styles.welcomeNewProviderContainer}>
            <LinearGradient
              colors={['#FFB74D', '#FF9800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.welcomeNewProviderGradient}
            >
              <MaterialIcons name="celebration" size={48} color="#FFFFFF" style={{ marginBottom: 12 }} />
              <Text style={styles.welcomeNewProviderTitle}>Welcome to Rollodex Provider!</Text>
              <Text style={styles.welcomeNewProviderText}>
                Start by creating your first service or housing listing to begin receiving bookings.
              </Text>
              <View style={styles.welcomeButtonsRow}>
                <TouchableOpacity 
                  style={styles.welcomeButton}
                  onPress={() => handleNewListing('service')}
                >
                  <Text style={styles.welcomeButtonText}>Create Service</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.welcomeButton}
                  onPress={() => handleNewListing('housing')}
                >
                  <Text style={styles.welcomeButtonText}>List Housing</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Provider Stats Section */}
        <View style={styles.statsContainer}>
          {loading.stats && !isNewProvider ? (
            <View style={[styles.loadingContainer, { height: 152 }]}>
              <ActivityIndicator size="large" color="#3A76F0" />
              <Text style={styles.loadingText}>Loading your stats...</Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#3A76F0', '#1E90FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statsGradient}
            >
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="calendar" size={28} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View style={styles.statValueContainer}>
                    <Text style={styles.statValue}>{stats.totalBookings}</Text>
                  </View>
                  <View style={styles.statLabelContainer}>
                    <Text style={styles.statLabel}>Bookings</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="document-text-outline" size={28} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View style={styles.statValueContainer}>
                    <Text style={styles.statValue}>{stats.pendingAgreements}</Text>
                  </View>
                  <View style={styles.statLabelContainer}>
                    <Text style={styles.statLabel}>Agreements</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="cash-outline" size={28} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View style={styles.statValueContainer}>
                    <Text style={styles.statValue}>${Math.floor(stats.revenue).toLocaleString()}</Text>
                  </View>
                  <View style={styles.statLabelContainer}>
                    <Text style={styles.statLabel}>Revenue</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          )}
        </View>
        
        {/* Upcoming Appointments Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProviderStack', { screen: 'ProviderAppointments' })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {loading.appointments && !isNewProvider ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3A76F0" />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        ) : upcomingAppointments.length > 0 ? (
          <FlatList
            data={upcomingAppointments}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.booking_id}
            contentContainerStyle={styles.carouselList}
            renderItem={({ item }) => {
              const formattedDate = formatAppointmentDate(item.scheduled_at);
              return (
                <TouchableOpacity 
                  style={styles.appointmentCard}
                  onPress={() => navigation.navigate('ProviderStack', { screen: 'AppointmentDetail', params: { bookingId: item.booking_id } })}
                >
                  <Text style={styles.appointmentService}>{item.service_title}</Text>
                  <Text style={styles.appointmentDate}>{formattedDate.date} • {formattedDate.time}</Text>
                  <Text style={styles.appointmentClient}>{item.client_name || 'Client'}</Text>
                  <Text style={styles.appointmentNote}>{item.booking_notes || 'No additional notes'}</Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="calendar-outline" size={40} color="#ccc" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
            <Text style={styles.emptyStateSubText}>Set your availability to start receiving bookings</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('ProviderStack', { screen: 'ProviderCalendar' })}
            >
              <Text style={styles.emptyStateButtonText}>Manage Availability</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* My Listings Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Listings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProviderStack', { screen: 'ManageListings' })}>
            <Text style={styles.viewAllText}>Manage All</Text>
          </TouchableOpacity>
        </View>
        
        {loading.listings && !isNewProvider ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3A76F0" />
            <Text style={styles.loadingText}>Loading listings...</Text>
          </View>
        ) : listings.services.length > 0 || listings.housing.length > 0 ? (
          <View>
            {listings.services.length > 0 && (
              <>
                <Text style={styles.listingSubtitle}>Services ({listings.services.length})</Text>
                <FlatList
                  data={listings.services.slice(0, 2)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={item => `service-${item.id}`}
                  contentContainerStyle={styles.listingsCarousel}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.listingCard}
                      onPress={() => navigation.navigate('ProviderStack', { screen: 'EditServiceListing', params: { serviceId: item.id } })}
                    >
                      <Image
                        source={{ 
                          uri: item.media_urls && item.media_urls.length > 0 
                            ? item.media_urls[0] 
                            : 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png'
                        }}
                        style={styles.listingImage}
                      />
                      <View style={styles.listingContent}>
                        <Text style={styles.listingTitle}>{item.title || 'Service Title'}</Text>
                        <Text style={styles.listingPrice}>${item.price}</Text>
                        <View style={styles.listingStatusContainer}>
                          <View style={[styles.listingStatusIndicator, { backgroundColor: item.available ? '#4CAF50' : '#F44336' }]} />
                          <Text style={styles.listingStatusText}>{item.available ? 'Available' : 'Not Available'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
            
            {listings.housing.length > 0 && (
              <>
                <Text style={styles.listingSubtitle}>Housing ({listings.housing.length})</Text>
                <FlatList
                  data={listings.housing.slice(0, 2)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={item => `housing-${item.id}`}
                  contentContainerStyle={styles.listingsCarousel}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.listingCard}
                      onPress={() => navigation.navigate('ProviderStack', { screen: 'EditHousingListing', params: { housingId: item.id } })}
                    >
                      <Image
                        source={{ 
                          uri: item.media_urls && item.media_urls.length > 0 
                            ? item.media_urls[0] 
                            : 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.jpg'
                        }}
                        style={styles.listingImage}
                      />
                      <View style={styles.listingContent}>
                        <Text style={styles.listingTitle}>{item.title || 'Housing Listing'}</Text>
                        <Text style={styles.listingPrice}>${item.price_per_week}/week</Text>
                        <View style={styles.listingStatusContainer}>
                          <View style={[styles.listingStatusIndicator, { backgroundColor: item.available ? '#4CAF50' : '#F44336' }]} />
                          <Text style={styles.listingStatusText}>{item.available ? 'Available' : 'Not Available'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>
        ) : (
          <View style={[styles.emptyStateContainer, { height: 140 }]}>
            <MaterialIcons name="add-business" size={40} color="#ccc" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyStateText}>You haven't created any listings yet</Text>
            <Text style={styles.emptyStateSubText}>Start offering services to the community</Text>
            <View style={styles.newListingButtonsRow}>
              <TouchableOpacity 
                style={styles.newListingButton}
                onPress={() => handleNewListing('service')}
              >
                <Text style={styles.newListingButtonText}>Create Service</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.newListingButton}
                onPress={() => handleNewListing('housing')}
              >
                <Text style={styles.newListingButtonText}>Create Housing</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('ProviderStack', { screen: 'ServiceAgreements' })}
          >
            <Feather name="file-text" size={22} color={'#007AFF'} style={styles.actionCardIcon} />
            <Text style={styles.actionCardText}>Service Agreements</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('ProviderStack', { screen: 'ProviderCalendar' })}
          >
            <MaterialIcons name="event-available" size={24} color={'#007AFF'} style={styles.actionCardIcon} />
            <Text style={styles.actionCardText}>Manage Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              // Toggle the provider mode in AsyncStorage for persistence
              toggleProviderMode();
              // Navigation-based approach: Reset to MainApp stack
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp' }],
              });
            }}
          >
            <AntDesign name="swap" size={22} color={'#007AFF'} style={styles.actionCardIcon} />
            <Text style={styles.actionCardText}>Switch to Participant</Text>
          </TouchableOpacity>
        </View>
        
        {/* Add some padding at the bottom */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Main Provider Dashboard Screen with Tab Navigator
const ProviderDashboardScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') return <Feather name="home" size={size} color={color} />;
          if (route.name === 'Explore') return <Feather name="search" size={size} color={color} />;
          if (route.name === 'Wallet') return <Entypo name="wallet" size={size} color={color} />;
          if (route.name === 'Social') return <Feather name="message-square" size={size} color={color} />;
          if (route.name === 'Favourites') return <AntDesign name="hearto" size={size} color={color} />;
          if (route.name === 'Profile') return <Octicons name="person" size={size} color={color} />;
          return null;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={ProviderDashboardContent}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Navigate to Provider Dashboard
            navigation.navigate('Home');
          },
        })}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Reset the stack to first screen in the stack
            navigation.navigate('Explore', {
              screen: 'ProviderDiscovery'
            });
          },
        })}
      />
      <Tab.Screen 
        name="Social" 
        component={SocialStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Reset to the first screen in the Social stack
            navigation.navigate('Social', {
              screen: 'SocialFeedScreen'
            });
          },
        })}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Reset the stack to WalletMain screen
            navigation.navigate('Wallet', {
              screen: 'WalletMain'
            });
          },
        })}
      />
      <Tab.Screen 
        name="Favourites" 
        component={FavouritesScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Navigate to Favourites screen
            navigation.navigate('Favourites');
          },
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Reset to the first screen in the Profile stack
            navigation.navigate('Profile', {
              screen: 'ProfileScreen'
            });
          },
        })}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
    paddingTop: 56,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 5,
    paddingHorizontal: 18,
  },
  logoContainer: {
    justifyContent: 'flex-start',
    flex: 1,
    alignItems: 'flex-start',
    marginLeft: -18, // Negative margin to counter parent padding
    paddingLeft: 12,
  },
  logo: {
    height: 52,
    width: 52,
    marginLeft: 0,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  titleLogo: {
    height: 32,
    width: 160,
    resizeMode: 'contain',
  },
  notificationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginRight: -18,
    paddingRight: 12,
    zIndex: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  welcomeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  avatarContainer: {
    borderRadius: 39,
    overflow: 'hidden',
    marginRight: 10,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  welcomeTitleText: {
    fontSize: 18,
    color: '#888',
    fontWeight: '600',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
  },
  statsContainer: {
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statsGradient: {
    borderRadius: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    padding: 8,
    height: 120, // Fixed height to ensure alignment
    justifyContent: 'space-between',
  },
  statIconContainer: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValueContainer: {
    height: 32, // Fixed height for value container
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabelContainer: {
    height: 40, // Fixed height for label container
    alignItems: 'center',
    justifyContent: 'flex-start', // Top align the text
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 18, // Help with the Service Agreements text alignment
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  carouselList: {
    paddingBottom: 10,
    paddingLeft: 4,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 14,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#222',
    marginBottom: 2,
  },
  appointmentClient: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  appointmentNote: {
    fontSize: 13,
    color: '#888',
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#666',
    marginBottom: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubText: {
    color: '#999',
    marginBottom: 12,
    fontSize: 14,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  loadingText: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  newListingButtonsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  newListingButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 6,
  },
  newListingButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  listingSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  listingsCarousel: {
    paddingBottom: 16,
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 14,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  listingImage: {
    height: 140,
    width: '100%',
  },
  listingContent: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  listingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  listingStatusText: {
    fontSize: 12,
    color: '#666',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 105, // Ensure minimum width to fit text
  },
  actionCardIcon: {
    marginBottom: 8,
  },
  actionCardText: {
    fontSize: 13, // Slightly smaller font size
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    width: '100%', // Ensure text has full width of container
  },
  switchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    padding: 12,
    marginTop: 25,
    marginBottom: 10,
    alignSelf: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  switchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButtonIcon: {
    marginRight: 8,
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeNewProviderContainer: {
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeNewProviderGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  welcomeNewProviderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeNewProviderText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  welcomeButtonsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  welcomeButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  welcomeButtonText: {
    color: '#FF9800',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default ProviderDashboardScreen;
