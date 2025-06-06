import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, ActivityIndicator, ImageBackground } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather'; 
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants/theme';
import DynamicLogo from '../../components/common/DynamicLogo';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { useNotifications, NotificationBadge } from '../../components/notifications';

const DashboardScreen = () => {
  const { profile, isProviderMode, toggleProviderMode } = useUser();
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const { showNotificationTray, unreadCount } = useNotifications();
  
  const [wallet, setWallet] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState({
    wallet: true,
    bookings: true,
    recommendations: true
  });
  const [error, setError] = useState(null);
  
  // Use useFocusEffect to scroll to top when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // When the screen is focused, scroll to top
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }
      return () => {};
    }, [])
  );
  
  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, wallet: true }));
    try {
      // Fetch wallet
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('total_balance, category_breakdown')
        .eq('user_id', profile.id)
        .maybeSingle();
        
      // If wallet doesn't exist, create one with defaults
      if (!walletData) {
        const defaultWalletData = {
          user_id: profile.id,
          total_balance: 15000,
          category_breakdown: {
            core_support: 8000,
            capacity_building: 5000,
            capital_support: 2000,
          },
        };
        
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert(defaultWalletData)
          .select('total_balance, category_breakdown')
          .maybeSingle();
          
        if (createError) throw createError;
        walletData = newWallet;
      }
      
      setWallet(walletData);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to load wallet information');
    } finally {
      setLoading(prevState => ({ ...prevState, wallet: false }));
    }
  }, [profile]);
  
  // Fetch upcoming bookings
  const fetchUpcomingBookings = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, bookings: true }));
    try {
      const today = new Date().toISOString();
      
      // Get upcoming bookings using the bookings_with_details view
      const { data, error } = await supabase
        .from('bookings_with_details')
        .select('*')
        .eq('user_profile_id', profile.id)
        .gte('scheduled_at', today)
        .order('scheduled_at', { ascending: true })
        .limit(5);
        
      if (error) throw error;
      
      setUpcomingBookings(data || []);
    } catch (err) {
      console.error('Error fetching upcoming bookings:', err);
      setError('Failed to load upcoming bookings');
    } finally {
      setLoading(prevState => ({ ...prevState, bookings: false }));
    }
  }, [profile]);
  
  // Fetch recommendations based on user's bookings and interests
  const fetchRecommendations = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, recommendations: true }));
    try {
      // First, get the categories of services the user has booked
      const { data: userBookings, error: bookingError } = await supabase
        .from('bookings_with_details')
        .select('service_category')
        .eq('user_profile_id', profile.id)
        .limit(10);
        
      if (bookingError) throw bookingError;
      
      // Extract unique categories
      const bookedCategories = userBookings ? 
        [...new Set(userBookings.map(booking => booking.service_category))] : 
        [];
        
      // If user has no bookings, get some popular services
      if (bookedCategories.length === 0) {
        const { data: popularServices, error: servicesError } = await supabase
          .from('services')
          .select('*, provider:provider_id(id, business_name)')
          .eq('available', true)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (servicesError) throw servicesError;
        setRecommendations(popularServices || []);
      } else {
        // Get services in the same categories the user has booked before
        const { data: similarServices, error: servicesError } = await supabase
          .from('services')
          .select('*, provider:provider_id(id, business_name)')
          .in('category', bookedCategories)
          .eq('available', true)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (servicesError) throw servicesError;
        setRecommendations(similarServices || []);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(prevState => ({ ...prevState, recommendations: false }));
    }
  }, [profile]);
  
  // Effect to navigate to provider dashboard when isProviderMode changes
  useEffect(() => {
    if (isProviderMode) {
      // Note: We'll let the MainTabs navigator handle the actual rendering
      // This is just a fallback in case direct access to this component occurs
      navigation.navigate('ProviderStack', { screen: 'ProviderDashboard' });
    }
  }, [isProviderMode, navigation]);

  // Fetch all data when component mounts or profile changes
  useEffect(() => {
    if (profile?.id && !isProviderMode) {
      fetchWalletData();
      fetchUpcomingBookings();
      fetchRecommendations();
    }
  }, [profile, isProviderMode, fetchWalletData, fetchUpcomingBookings, fetchRecommendations]);
  
  // Helper function to format dates for upcoming bookings
  const formatBookingDate = (dateString) => {
    try {
      const date = parseISO(dateString);
      return {
        date: format(date, 'MMM d'),
        time: format(date, 'h:mm a')
      };
    } catch (err) {
      console.error('Error formatting date:', err);
      return { date: 'Unknown', time: 'Unknown' };
    }
  };
  return (
    <ImageBackground
      source={require('../../assets/images/MegaTron.jpg')}
      style={styles.wallpaper}
      resizeMode="cover"
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.screenContainer} 
        showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
        {/* Top Bar with Logo Icon, Title and Notification */}
        <View style={styles.topBar}>
          <View style={styles.titleContainer}>
            <DynamicLogo
              isDark={true} // MegaTron.jpg has a darker background
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

        {/* Welcome Header with Avatar */}
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitleText}>Welcome back,</Text>
            <Text style={styles.userNameText}>{profile?.full_name || profile?.username || 'User'}</Text>
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

        {/* Financial Information Group */}
        <View style={styles.financialGroup}>
          {/* Wallet Card */}
          {loading.wallet ? (
            <View style={[styles.walletCard, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
              <ActivityIndicator size="large" color="#3A76F0" />
            </View>
          ) : wallet ? (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3A76F0', '#1E90FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.walletCard}
              >
                <View style={styles.walletCardContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="wallet-outline" size={22} color="rgba(255,255,255,0.9)" style={{ marginRight: 8 }} />
                    <Text style={styles.walletCardTitle}>Wallet Balance</Text>
                  </View>
                  <Text style={styles.walletCardBalance}>${Math.floor(wallet.total_balance).toLocaleString()}</Text>
                  <View style={styles.balanceCardChip}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.white} />
                    <Text style={styles.balanceCardChipText}>Updated Today</Text>
                  </View>
                </View>
                <View style={styles.walletCardIllustration}>
                  <Ionicons name="wallet" size={36} color="rgba(255,255,255,0.2)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.walletCard, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
              <Text style={{ color: '#666' }}>Error loading wallet data</Text>
            </View>
          )}
          
          {/* Category Pills */}
          <View style={styles.categoryCard}>
            {loading.wallet ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3A76F0" />
              </View>
            ) : wallet?.category_breakdown ? (
              <FlatList
                data={Object.entries(wallet.category_breakdown).map(([name, amount]) => ({ 
                  name: name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), 
                  amount: amount.toString() 
                }))}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.name}
                contentContainerStyle={styles.categoryList}
                renderItem={({ item, index }) => {
                  // Alternating colors for categories
                  const colorMap = ['#007AFF', '#34C759', '#FF9500', '#5856D6'];
                  const color = colorMap[index % colorMap.length];
                  
                  return (
                    <View style={[styles.categoryPill, { borderColor: color + '30' }]}>
                      <Text style={[styles.categoryPillName, { color }]}>{item.name}</Text>
                      <Text style={styles.categoryPillAmount}>${Math.floor(Number(item.amount)).toLocaleString()}</Text>
                    </View>
                  );
                }}
              />
            ) : (
              <Text style={styles.errorText}>No category data available</Text>
            )}
          </View>

          {/* Funding Expiry Notification */}
          <TouchableOpacity 
            style={styles.expiryNotification}
            onPress={() => navigation.navigate('Wallet')}
          >
            <Feather name="alert-triangle" size={18} color="#FFA500" style={{ marginRight: 8 }} />
            <Text style={styles.expiryNotificationText}>
              Some of your funding categories are expiring soon. <Text style={{fontWeight:'bold'}}>Check details</Text>
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Upcoming Appointments Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.carouselTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Wallet', { screen: 'BookingsScreen' })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {loading.bookings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3A76F0" />
          </View>
        ) : upcomingBookings.length > 0 ? (
          <FlatList
            data={upcomingBookings}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.booking_id}
            contentContainerStyle={styles.carouselList}
            renderItem={({ item }) => {
              // Format date and time from item.scheduled_at
              const dateObj = new Date(item.scheduled_at);
              const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
              return (
                <TouchableOpacity 
                  style={styles.appointmentCard}
                  onPress={() => navigation.navigate('Wallet', { screen: 'BookingDetailScreen', params: { bookingId: item.booking_id } })}
                  activeOpacity={0.85}
                >
                  <View style={styles.appointmentCardContent}>
                    <View style={styles.appointmentCardLeft}>
                      <Text style={styles.appointmentCardDate}>{dateStr}</Text>
                      <Text style={styles.appointmentCardTime}>{timeStr}</Text>
                    </View>
                    <View style={styles.appointmentCardRight}>
                      <Text style={styles.appointmentCardService} numberOfLines={1}>{item.service_title}</Text>
                      <Text style={styles.appointmentCardProvider} numberOfLines={1}>{item.user_full_name || item.service_provider || 'Provider'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}
            >
              <Text style={styles.emptyStateButtonText}>Book a Service</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recommended Services */}
        <View style={styles.sectionHeader}>
          <Text style={styles.carouselTitle}>Recommended for You</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}>
            <Text style={styles.viewAllText}>See More</Text>
          </TouchableOpacity>
        </View>
        
        {loading.recommendations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3A76F0" />
          </View>
        ) : recommendations.length > 0 ? (
          <FlatList
            data={recommendations}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.recommendationsList}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.bookingsCard}
                onPress={() => navigation.navigate('Explore', { screen: 'ServiceDetail', params: { serviceId: item.id } })}
              >
                <Image
                  source={{ 
                    uri: item.media_urls && item.media_urls.length > 0 
                      ? item.media_urls[0] 
                      : 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png'
                  }}
                  style={styles.bookingsImage}
                />
                <View style={styles.bookingsContent}>
                  <Text style={styles.bookingsTitle}>{item.title || 'Service Title'}</Text>
                  <Text style={styles.bookingsFunding}>
                    {item.ndis_approved ? 'NDIS Approved' : 'Service Available'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.bookingsBtn}
                    onPress={() => navigation.navigate('Explore', { screen: 'ServiceDetail', params: { serviceId: item.id } })}
                  >
                    <Text style={styles.bookingsBtnText}>View Details</Text>
                    <Feather name="chevron-right" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No recommendations available</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}
            >
              <Text style={styles.emptyStateButtonText}>Browse Services</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Wallet', { screen: 'BookingHistoryScreen' })}
          >
            <AntDesign name="clockcircleo" size={22} color={'#007AFF'} style={styles.actionCardIcon} />
            <Text style={styles.actionCardText}>Booking History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}
          >
            <MaterialIcons name="search" size={24} color={'#007AFF'} style={styles.actionCardIcon} />
            <Text style={styles.actionCardText}>Explore Services</Text>
          </TouchableOpacity>
        </View>
        
        {/* Provider Dashboard Switch Button */}
        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => {
            // Use navigation to switch to provider stack instead of toggling state
            toggleProviderMode(); // Still toggle the state for persistence
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProviderStack' }]
            });
          }}
        >
          <View style={styles.switchButtonContent}>
            <MaterialIcons name="swap-horiz" size={24} color="#FFFFFF" style={styles.switchButtonIcon} />
            <Text style={styles.switchButtonText}>Switch to Provider Dashboard</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </ImageBackground>
  );
};

const styles = StyleSheet.create({
  wallpaper: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  carouselTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
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
  recommendationsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    marginBottom: 8,
    marginLeft: 4,
  },
  carouselList: {
    paddingBottom: 10,
    paddingLeft: 4,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 0,
    marginLeft: 12,
    marginRight: 8,
    width: 240,
    shadowColor: '#151515',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 18,
    width: '100%',
  },
  appointmentCardLeft: {
    alignItems: 'flex-start',
    marginRight: 14,
    minWidth: 70,
  },
  appointmentCardDate: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3B4A6B',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  appointmentCardTime: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7B8BB2',
  },
  appointmentCardRight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 6,
  },
  appointmentCardService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28324B',
    marginBottom: 3,
  },
  appointmentCardProvider: {
    fontSize: 13,
    color: '#9CA6B8',
    fontWeight: '400',
  },
  // Removed old noisy appointment card styles for a cleaner look

  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: 56,
  },
  contentContainer: {
    flex: 1,
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
  },
  logoContainer: {
    justifyContent: 'flex-start',
    flex: 1,
    alignItems: 'flex-start',
    marginLeft: -12, // Adjusted for padding
    paddingLeft: 12, // Added padding to left edge
  },
  logo: {
    height: 52, // 30% larger (40 * 1.3 = 52)
    width: 52, // Making it square for the icon
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
    marginRight: -12,
    paddingRight: 12, // Added padding to right edge
    zIndex: 1, // Ensure it appears above the title
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

  financialGroup: {
    backgroundColor: 'rgba(255,255,255,0.85)', // Slightly translucent for readability
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  expiryNotification: {
    backgroundColor: '#FFF9E6', // Light yellow background
    borderRadius: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#FFECB3',
  },
  expiryNotificationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
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
  avatarContainer: {
    borderRadius: 39,
    overflow: 'hidden',
    marginRight: 10, // Added padding to right edge
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  walletCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 0,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  walletCardContent: {
    flex: 3,
    padding: 18,
  },
  walletCardIllustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  walletCardBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  balanceCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  balanceCardChipText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  categoryList: {
    paddingRight: 8,
  },
  categoryPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
  },
  categoryPillName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 2,
  },
  categoryPillAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  expiryIcon: {
    marginRight: 12,
  },
  expiryText: {
    fontSize: 15,
    color: '#b88900',
    flex: 1,
  },
  bookingsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  bookingsImage: {
    width: 94,
    height: 94,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: '#eaeaea',
  },
  bookingsContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  bookingsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  bookingsFunding: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  bookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  bookingsBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginRight: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 14,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionCardIcon: {
    marginBottom: 6,
  },
  actionCardText: {
    fontWeight: '600',
    color: '#222',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default DashboardScreen;
