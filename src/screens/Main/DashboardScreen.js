import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, ImageBackground } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useScrollContext } from '../../context/ScrollContext';
import { defaultDataProvider, isNewUser, shuffleArray } from '../../utils/defaultDataProvider';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
import EventCard from '../../components/cards/EventCard';
import ServiceCard from '../../components/cards/ServiceCard';

const DashboardScreen = () => {
  const { reportScroll } = useScrollContext();
  const { profile, isProviderMode, toggleProviderMode, refreshProfile } = useUser();
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const { showNotificationTray, unreadCount } = useNotifications();
  
  // Log profile data when component renders
  console.log('[DashboardScreen] Rendering with profile:', profile);
  console.log('[DashboardScreen] Profile username:', profile?.username);
  console.log('[DashboardScreen] Profile full_name:', profile?.full_name);
  console.log('[DashboardScreen] Profile created_at:', profile?.created_at);
  
  const [wallet, setWallet] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [events, setEvents] = useState([]);
  const [isNewUserStatus, setIsNewUserStatus] = useState(true); // Default to true for new users
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(0);
  const [loading, setLoading] = useState({
    wallet: true,
    bookings: true,
    recommendations: true,
    events: false
  });
  const [error, setError] = useState(null);

  // Performance optimization refs for caching and fetch control
  const cacheRef = useRef({
    wallet: null,
    bookings: null,
    recommendations: null,
    timestamp: null
  });
  const fetchInProgressRef = useRef(false);
  const lastFetchUserRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  // Cache timeout (5 minutes)
  const CACHE_TIMEOUT = 5 * 60 * 1000;

  const debugTiming = (operation, startTime) => {
    const duration = Date.now() - startTime;
    console.log(`[Dashboard] ${operation}: ${duration}ms`);
  };

  // Use useFocusEffect to scroll to top when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkNewUserStatus = async () => {
        // When the screen is focused, scroll to top
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
        }


        // Check if user is new first
        let userIsNew = true; // Default to true
        
        // First check AsyncStorage flag
        const newUserFlag = await AsyncStorage.getItem('is_new_user');
        
        if (profile) {
          if (newUserFlag === 'true') {
            userIsNew = true;
            // Clear the flag after first check
            await AsyncStorage.removeItem('is_new_user');
          } else {
            // Fall back to profile check
            userIsNew = isNewUser(profile);
          }
          console.log('[Dashboard] Profile:', profile);
          console.log('[Dashboard] Profile created_at:', profile.created_at);
          console.log('[Dashboard] New user flag:', newUserFlag);
          console.log('[Dashboard] Is new user:', userIsNew);
        } else {
          // No profile yet - definitely a new user
          console.log('[Dashboard] No profile yet - treating as new user');
          userIsNew = true;
        }
        
        setIsNewUserStatus(userIsNew);

        // Check cache for instant loading on focus
        const cache = cacheRef.current;
        const userChanged = lastFetchUserRef.current !== profile?.id;
        const cacheExpired = cache.timestamp && Date.now() - cache.timestamp > CACHE_TIMEOUT;
        
        if (!userChanged && !cacheExpired && cache.recommendations) {
          console.log('[Dashboard] Using cached data for instant loading');
          // For new users, only use recommendations cache
          if (userIsNew) {
            setRecommendations(cache.recommendations);
            setWallet(null);
            setUpcomingBookings([]);
            setLoading({
              wallet: false,
              bookings: false,
              recommendations: false,
              events: false
            });
          } else if (cache.wallet && cache.bookings) {
            // For existing users, use all cached data
            setWallet(cache.wallet);
            setUpcomingBookings(cache.bookings);
            setRecommendations(cache.recommendations);
            setLoading({
              wallet: false,
              bookings: false,
              recommendations: false,
              events: false
            });
          }
        }
      };
      
      checkNewUserStatus();
      
      return () => {};
    }, [profile?.id])
  );
  
  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(prevState => ({ ...prevState, wallet: false }));
      return;
    }
    
    setLoading(prevState => ({ ...prevState, wallet: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(prevState => ({ ...prevState, wallet: false }));
    }, 10000); // 10 second timeout
    
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
      
      // Update cache
      cacheRef.current.wallet = walletData;
      
    } catch (err) {
      console.error('Error fetching wallet data:', err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(prevState => ({ ...prevState, wallet: false }));
    }
  }, [profile]);
  
  // Fetch events for all users
  const fetchEvents = useCallback(async () => {
    setLoading(prevState => ({ ...prevState, events: true }));
    
    try {
      // Get upcoming events from events_with_details view - ordered by end_time (expiring first)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events_with_details')
        .select('*')
        .gte('end_time', new Date().toISOString())
        .order('end_time', { ascending: true })
        .limit(20);
        
      if (eventsError) throw eventsError;
      
      // Use the real events data
      setEvents(eventsData || []);
      
    } catch (err) {
      console.error('Error fetching events:', err);
      // Don't fall back to default events - show empty state instead
      setEvents([]);
    } finally {
      setLoading(prevState => ({ ...prevState, events: false }));
    }
  }, []);

  // Fetch upcoming bookings
  const fetchUpcomingBookings = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(prevState => ({ ...prevState, bookings: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(prevState => ({ ...prevState, bookings: false }));
    }, 10000); // 10 second timeout
    
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
      
      // Update cache
      cacheRef.current.bookings = data || [];
      
    } catch (err) {
      console.error('Error fetching upcoming bookings:', err);
      setError('Failed to load upcoming bookings');
    } finally {
      clearTimeout(timeoutId);
      setLoading(prevState => ({ ...prevState, bookings: false }));
    }
  }, [profile]);

  // Fetch recommendations - random services from the services table
  const fetchRecommendations = useCallback(async () => {
    // Allow fetching recommendations even without profile for new users
    console.log('[Dashboard] Fetching recommendations, profile:', profile?.id || 'no profile');
    
    setLoading(prevState => ({ ...prevState, recommendations: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(prevState => ({ ...prevState, recommendations: false }));
    }, 10000); // 10 second timeout
    
    try {
      // Get random available services - same as ProviderDiscoveryScreen
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false });
        
      if (servicesError) throw servicesError;
      
      // Shuffle and take 13 random services (10 more than before)
      if (services && services.length > 0) {
        const shuffled = shuffleArray([...services]);
        const randomServices = shuffled.slice(0, 13);
        setRecommendations(randomServices);
        
        // Update cache
        cacheRef.current.recommendations = randomServices;
      } else {
        setRecommendations([]);
      }
        
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
      setRecommendations([]);
    } finally {
      clearTimeout(timeoutId);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // If no profile yet, just fetch events and recommendations for new users
    if (!profile && !isProviderMode) {
      console.log('[Dashboard] No profile yet - fetching only events and recommendations');
      fetchEvents();
      fetchRecommendations();
      setLoading(prevState => ({ 
        ...prevState, 
        wallet: false,
        bookings: false 
      }));
      return;
    }
    
    if (profile?.id && !isProviderMode) {
      const fetchAllData = async () => {
        const startTime = Date.now();
        
        // Prevent duplicate fetches
        if (fetchInProgressRef.current) {
          console.log('[Dashboard] Fetch already in progress, skipping');
          return;
        }
        
        // Debounce: Don't fetch if we just fetched within 2 seconds
        const now = Date.now();
        if (now - lastFetchTimeRef.current < 2000) {
          console.log('[Dashboard] Debouncing fetch - too soon since last fetch');
          return;
        }
        lastFetchTimeRef.current = now;
        
        // Check if user is new first
        const userIsNew = isNewUser(profile);
        console.log('[Dashboard] Fetch - Profile created_at:', profile.created_at);
        console.log('[Dashboard] Fetch - Is new user:', userIsNew);
        setIsNewUserStatus(userIsNew);
        
        // Check if useFocusEffect already loaded cached data
        const cache = cacheRef.current;
        const userChanged = lastFetchUserRef.current !== profile.id;
        const cacheExpired = !cache.timestamp || Date.now() - cache.timestamp > CACHE_TIMEOUT;
        
        // Skip fetch if we have valid cached data based on user type
        if (!userChanged && !cacheExpired) {
          if (userIsNew && cache.recommendations) {
            console.log('[Dashboard] New user - using cached recommendations');
            return;
          } else if (!userIsNew && cache.wallet && cache.bookings && cache.recommendations) {
            console.log('[Dashboard] Existing user - using all cached data');
            return;
          }
        }
        
        fetchInProgressRef.current = true;

        try {
          console.log('[Dashboard] Fetching fresh data from useEffect');
          
          // Fetch data based on user status
          if (userIsNew) {
            console.log('[Dashboard] New user detected - only fetching events and recommendations');
            // For new users, only fetch events and recommendations
            await Promise.all([
              fetchEvents(),
              fetchRecommendations()
            ]);
            // Set wallet and bookings to default states for new users
            setWallet(null);
            setUpcomingBookings([]);
            setLoading(prevState => ({ 
              ...prevState, 
              wallet: false,
              bookings: false 
            }));
          } else {
            console.log('[Dashboard] Existing user - fetching all data');
            // For existing users, fetch all data
            await Promise.all([
              fetchWalletData(),
              fetchEvents(),
              fetchUpcomingBookings(), 
              fetchRecommendations()
            ]);
          }

          // Update cache timestamp after successful fetch
          cacheRef.current.timestamp = Date.now();
          lastFetchUserRef.current = profile.id;
          debugTiming('Fresh fetch completed', startTime);
        } catch (error) {
          console.error('[Dashboard] Error in fetchAllData:', error);
        } finally {
          fetchInProgressRef.current = false;
        }
      };

      fetchAllData();
    }
  }, [profile?.id, isProviderMode]);
  
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
  // Use the user's custom background image if available, otherwise fall back to default
  const backgroundImageSource = profile?.background 
    ? { uri: profile.background } 
    : require('../../assets/images/MegaTron.jpg');

  console.log('[Dashboard] Rendering - Profile:', profile);
  console.log('[Dashboard] Rendering - Profile full_name:', profile?.full_name);
  console.log('[Dashboard] Rendering - Profile username:', profile?.username);
  console.log('[Dashboard] Rendering - Profile background:', profile?.background);
  console.log('[Dashboard] Rendering - Background source:', backgroundImageSource);
  console.log('[Dashboard] Rendering - Is new user:', isNewUserStatus);
  console.log('[Dashboard] Rendering - Loading states:', loading);

  return (
    <ImageBackground
      source={backgroundImageSource}
      style={styles.wallpaper}
      resizeMode="cover"
      onError={(error) => {
        console.error('[Dashboard] Background image loading error:', error);
        console.log('[Dashboard] Failed to load background URL:', profile?.background);
      }}
      defaultSource={require('../../assets/images/MegaTron.jpg')}
    >
      {/* Dark gradient overlay for logo visibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'transparent']}
        style={styles.topGradientOverlay}
        pointerEvents="none"
      />
      
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={reportScroll}
        scrollEventThrottle={16}
      >
        <View style={{ height: 40 }} />
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
            <Text style={styles.welcomeTitleText}>{isNewUserStatus ? 'Welcome,' : 'Welcome back,'}</Text>
            <Text style={styles.userNameText}>
              {(() => {
                const displayName = profile?.full_name || profile?.username || 'Friend';
                console.log('[DashboardScreen] Display name logic:');
                console.log('  - profile?.full_name:', profile?.full_name);
                console.log('  - profile?.username:', profile?.username);
                console.log('  - Final display name:', displayName);
                console.log('  - Is new user:', isNewUserStatus);
                return displayName;
              })()}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('Profile')}
          >
            <Image
              source={
                profile?.avatar_url
                  ? { uri: profile.avatar_url }
                  : require('../../assets/images/default-avatar.png')
              }
              style={styles.avatar}
              contentFit="cover"
            />
          </TouchableOpacity>
        </View>

        {/* Community Events Section - Show for ALL users */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.carouselTitle}>Community Events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Social', { screen: 'Events' })}>
              <Text style={styles.viewAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {loading.events ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3A76F0" />
            </View>
          ) : events.length > 0 ? (
            <FlatList
              data={events}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={{ width: 320, height: 140, marginRight: 8 }}
                  onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                >
                  <EventCard
                    event={item}
                    onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                    listView={true}
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="calendar-outline" size={48} color="#007AFF" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyStateText}>No Upcoming Events</Text>
              <Text style={[styles.emptyStateText, { fontSize: 14, color: '#666', marginTop: 4 }]}>Check back later for community events</Text>
            </View>
          )}
        </View>

        {/* Upcoming Appointments - Show for ALL users */}
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
          <View style={[styles.emptyStateContainer, styles.compactEmptyState, isNewUserStatus && { backgroundColor: '#1a1a1a' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="calendar-outline" size={32} color={isNewUserStatus ? "#4A90E2" : "#007AFF"} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.emptyStateText, { marginBottom: 2, fontSize: 15, color: isNewUserStatus ? '#FFFFFF' : '#333' }]}>
                    {isNewUserStatus ? 'Start Your Journey!' : 'No Appointments'}
                  </Text>
                  <Text style={[styles.emptyStateText, { fontSize: 12, color: isNewUserStatus ? '#B0B0B0' : '#666', marginTop: 0 }]}>
                    {isNewUserStatus ? 'Book your first service' : 'Book a service'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.emptyStateButton, { backgroundColor: isNewUserStatus ? '#4A90E2' : '#007AFF', paddingHorizontal: 16, paddingVertical: 8, marginLeft: 12 }]}
                onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}
              >
                <Text style={[styles.emptyStateButtonText, { fontSize: 14, fontWeight: '600' }]}>Browse</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Wallet Section - Show only for existing users */}
        {!isNewUserStatus && (
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
            <TouchableOpacity 
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#F5F5F5', '#E8E8E8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.walletCard}
              >
                <View style={styles.walletCardContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="link-outline" size={22} color="#666" style={{ marginRight: 8 }} />
                    <Text style={[styles.walletCardTitle, { color: '#333' }]}>Connect Your NDIS</Text>
                  </View>
                  <Text style={[styles.walletCardBalance, { fontSize: 16, color: '#666' }]}>Link your NDIS account to view balance</Text>
                  <View style={[styles.balanceCardChip, { backgroundColor: '#007AFF' }]}>
                    <Text style={styles.balanceCardChipText}>Tap to Connect</Text>
                  </View>
                </View>
                <View style={styles.walletCardIllustration}>
                  <Ionicons name="wallet" size={36} color="rgba(0,0,0,0.1)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
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
        )}

        {/* Recommended Services */}
        <View style={styles.servicesSection}>
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
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={{ width: 320, height: 152, marginRight: 8 }}
                  onPress={() => navigation.navigate('Explore', { screen: 'ServiceDetail', params: { serviceId: item.id } })}
                >
                  <ServiceCard
                    item={item}
                    onPress={() => navigation.navigate('Explore', { screen: 'ServiceDetail', params: { serviceId: item.id } })}
                    isFavorited={false}
                    onToggleFavorite={() => {}}
                    displayAs="list"
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="sparkles" size={48} color="#CCC" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyStateText}>No services available</Text>
              <Text style={[styles.emptyStateText, { fontSize: 14, color: '#888', marginTop: 4 }]}>Check back later for new services</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}
              >
                <Text style={styles.emptyStateButtonText}>Browse All Services</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#1a1a1a' }]}
            onPress={() => navigation.navigate('Wallet', { screen: 'BookingHistoryScreen' })}
          >
            <AntDesign name="clockcircleo" size={22} color={'#4A90E2'} style={styles.actionCardIcon} />
            <Text style={[styles.actionCardText, { color: '#FFFFFF' }]}>Booking History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#1a1a1a' }]}
            onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}
          >
            <MaterialIcons name="search" size={24} color={'#4A90E2'} style={styles.actionCardIcon} />
            <Text style={[styles.actionCardText, { color: '#FFFFFF' }]}>Explore Services</Text>
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
    backgroundColor: '#f5f5f5', // Fallback color in case image doesn't load
  },
  topGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200, // Extended to cover more area for better visibility
    zIndex: -1, // Behind all content
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
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  compactEmptyState: {
    minHeight: 70,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emptyStateText: {
    color: '#333',
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 12,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#3A76F0',
    width: 20,
  },
  eventsSection: {
    marginBottom: 24,
  },
  servicesSection: {
    marginBottom: 24,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: '100%',
  },
  appointmentCardLeft: {
    alignItems: 'flex-start',
    marginRight: 14,
    minWidth: 70,
  },
  appointmentCardDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B4A6B',
    marginBottom: 0,
    letterSpacing: 0.2,
  },
  appointmentCardTime: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#28324B',
    marginBottom: 1,
  },
  appointmentCardProvider: {
    fontSize: 11,
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
    zIndex: 1, // Ensure content appears above gradient
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 5,
    zIndex: 2, // Ensure top bar appears above everything
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
