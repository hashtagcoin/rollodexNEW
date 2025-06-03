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
    try {
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
      
      setUpcomingAppointments(data || []);
    } catch (err) {
      console.error('Error fetching provider appointments:', err);
      setError('Failed to load upcoming appointments');
    } finally {
      setLoading(prevState => ({ ...prevState, appointments: false }));
    }
  }, [profile]);
  
  // Fetch provider's service listings
  const fetchListings = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, listings: true }));
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
      
      setListings({
        services: serviceData || [],
        housing: housingData || []
      });
    } catch (err) {
      console.error('Error fetching provider listings:', err);
      setError('Failed to load your listings');
    } finally {
      setLoading(prevState => ({ ...prevState, listings: false }));
    }
  }, [profile]);
  
  // Fetch provider stats
  const fetchProviderStats = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, stats: true }));
    try {
      // Get total bookings count - using a safer approach with error handling
      let totalBookings = 0;
      try {
        const { count, error: bookingError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', profile.id);
          
        if (!bookingError) {
          totalBookings = count || 0;
        }
      } catch (countError) {
        console.log('Count query failed, defaulting to 0');
      }
      
      // Get pending service agreements - with safer error handling
      let pendingAgreements = 0;
      try {
        const { count, error: agreementError } = await supabase
          .from('service_agreements')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', profile.id)
          .eq('status', 'pending');
          
        if (!agreementError) {
          pendingAgreements = count || 0;
        }
      } catch (agreementCountError) {
        console.log('Agreement count query failed, defaulting to 0');
      }
      
      // Get total revenue with safer approach
      let totalRevenue = 0;
      try {
        // Check if booking table has price column
        const { data: revenueData, error: revenueError } = await supabase
          .from('bookings')
          .select('price')
          .eq('provider_id', profile.id)
          .eq('status', 'completed');
          
        if (!revenueError && revenueData && Array.isArray(revenueData)) {
          // Only calculate if we have valid data
          totalRevenue = revenueData.reduce((sum, booking) => {
            // Make sure booking.price is a number before adding
            const price = typeof booking.price === 'number' ? booking.price : 0;
            return sum + price;
          }, 0);
        }
      } catch (revenueError) {
        console.log('Revenue calculation failed, defaulting to 0');
      }
      
      // Update stats with safely calculated values
      setStats({
        totalBookings,
        pendingAgreements,
        revenue: totalRevenue
      });
    } catch (err) {
      // More detailed error logging
      console.error('Error fetching provider stats:', err?.message || 'Unknown error');
      // Don't set error state to avoid UI disruption
    } finally {
      setLoading(prevState => ({ ...prevState, stats: false }));
    }
  }, [profile]);
  
  // Fetch all data when component mounts or profile changes
  useEffect(() => {
    if (profile?.id && isProviderMode) {
      fetchUpcomingAppointments();
      fetchListings();
      fetchProviderStats();
    }
  }, [profile, fetchUpcomingAppointments, fetchListings, fetchProviderStats, isProviderMode]);
  
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
          <Image
            source={require('../../assets/images/rollodex-title.png')}
            style={styles.titleLogo}
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
                  : require('../../assets/images/placeholder-avatar.jpg')
              }
              style={styles.avatar}
            />
          </View>
        </View>

        {/* Provider Stats Section */}
        <View style={styles.statsContainer}>
          {loading.stats ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3A76F0" />
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
        
        {loading.appointments ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3A76F0" />
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
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
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
        
        {loading.listings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3A76F0" />
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
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>You haven't created any listings yet</Text>
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
    marginBottom: 8,
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
});

export default ProviderDashboardScreen;
