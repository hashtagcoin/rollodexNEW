import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView
} from 'react-native';

// Create an animated version of FlatList
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import SearchComponent from '../../components/common/SearchComponent';
import HousingGroupCard from '../../components/cards/HousingGroupCard';

const { width } = Dimensions.get('window');

// NDIS-relevant filters for housing groups
const HOUSING_FILTERS = [
  { key: 'sda', label: 'SDA' },
  { key: 'pets', label: 'Pet Friendly' },
  { key: 'accessible', label: 'Accessible' },
  { key: 'wheelchair', label: 'Wheelchair Friendly' },
  { key: 'sil', label: 'SIL' },
  { key: 'supportsOnsite', label: 'Supports Onsite' },
  { key: 'sensory', label: 'Sensory Friendly' },
  { key: 'smoking', label: 'Smoking Allowed' },
  { key: 'parking', label: 'Parking Available' },
  { key: 'female', label: 'Female Only' },
  { key: 'male', label: 'Male Only' },
];

const HousingGroupsScreen = ({ navigation }) => {
  // State management
  const [housingGroups, setHousingGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('List');
  const [userId, setUserId] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Animation values for the FloatingActionButton
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef(null);

  // Fetch user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  // Fetch housing groups data from Supabase
  const fetchHousingGroups = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else if (!refreshing) {
      setLoading(true);
    }

    try {
      // First, get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('No authenticated user');

      // Fetch all active housing groups
      const { data: groups, error: groupsError } = await supabase
        .from('housing_groups')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // For each group, check user's membership status and get housing listing data
      const groupsWithStatus = await Promise.all(groups.map(async (group) => {
        // Get associated housing listing data if available
        let housingListingData = null;
        if (group.listing_id) {
          const { data: listing, error: listingError } = await supabase
            .from('housing_listings')
            .select('*')
            .eq('id', group.listing_id)
            .single();

          if (!listingError && listing) {
            housingListingData = listing;
          }
        }

        // Check if user is a member of this group
        const { data: membership, error: membershipError } = await supabase
          .from('housing_group_members')
          .select('status')
          .eq('group_id', group.id)
          .eq('user_id', user.id)
          .single();

        // Check if user has applied to the related housing listing
        let applicationStatus = null;
        if (group.listing_id) {
          const { data: application, error: appError } = await supabase
            .from('housing_applications')
            .select('status')
            .eq('user_id', user.id)
            .eq('listing_id', group.listing_id)
            .single();
          
          if (!appError && application) {
            applicationStatus = application.status;
          }
        }

        return {
          ...group,
          housing_listing_data: housingListingData,
          membershipStatus: membership?.status || null,
          applicationStatus
        };
      }));

      setHousingGroups(groupsWithStatus);
    } catch (error) {
      console.error('Error fetching housing groups:', error);
      // We could show an error message to the user here
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // Initial data fetch and refresh on focus
  useEffect(() => {
    fetchHousingGroups();
  }, [fetchHousingGroups]);

  useFocusEffect(
    useCallback(() => {
      fetchHousingGroups();
    }, [fetchHousingGroups])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchHousingGroups(true);
  }, [fetchHousingGroups]);

  // Toggle a filter
  const toggleFilter = (key) => {
    setActiveFilters(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Filter groups based on search term and active filters
  const filteredGroups = housingGroups.filter(group => {
    // First, apply search term filter
    const matchesSearch = 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (group.housing_listing_data?.suburb && 
       group.housing_listing_data.suburb.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    
    // If no filters are active, return all matches
    if (activeFilters.length === 0) return true;

    // Apply filters
    return activeFilters.some(filter => {
      switch(filter) {
        case 'sda':
          return group.housing_listing_data?.is_sda_certified === true;
        case 'pets':
          return group.housing_listing_data?.pet_friendly === true || 
                 group.housing_listing_data?.features?.includes('pet friendly');
        case 'accessible':
          return (group.housing_listing_data?.accessibility_rating || 0) >= 3;
        case 'wheelchair':
          return group.housing_listing_data?.accessibility_features?.includes('wheelchair') || 
                 group.housing_listing_data?.features?.includes('wheelchair access');
        case 'supportsOnsite':
          return group.housing_listing_data?.features?.includes('onsite support') || 
                 group.housing_listing_data?.supports_onsite === true;
        case 'sensory':
          return group.housing_listing_data?.features?.includes('sensory friendly') || 
                 group.housing_listing_data?.accessibility_features?.includes('sensory');
        case 'smoking':
          return group.housing_listing_data?.smoking_allowed === true || 
                 group.housing_listing_data?.features?.includes('smoking allowed');
        case 'parking':
          return group.housing_listing_data?.parking_available === true || 
                 group.housing_listing_data?.features?.includes('parking');
        case 'female':
          return group.gender_preference === 'female' || 
                 group.housing_listing_data?.gender_preference === 'female';
        case 'male':
          return group.gender_preference === 'male' || 
                 group.housing_listing_data?.gender_preference === 'male';
        case 'sil':
          return group.support_needs?.includes('SIL') || 
                 group.housing_listing_data?.features?.includes('SIL');
        default:
          return true;
      }
    });
  });

  // Handle join group action
  const handleJoinGroup = async (groupId) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // First check if a membership already exists
      const { data: existingMembership, error: checkError } = await supabase
        .from('housing_group_members')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;

      // If membership exists with 'pending' or 'declined' status, update it
      if (existingMembership) {
        const { error: updateError } = await supabase
          .from('housing_group_members')
          .update({ status: 'pending', join_date: new Date().toISOString() })
          .eq('id', existingMembership.id);

        if (updateError) throw updateError;
      } else {
        // If no membership exists, create a new one
        const { error: insertError } = await supabase
          .from('housing_group_members')
          .insert([
            { 
              group_id: groupId, 
              user_id: userId,
              status: 'pending',
              join_date: new Date().toISOString()
            }
          ]);

        if (insertError) throw insertError;
      }

      // Refresh the groups list to update status
      fetchHousingGroups();
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  // Handle leave group action - this cancels a join request
  const handleLeaveGroup = async (groupId) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // For approved members, we'll delete the membership
      // For pending members, we'll delete their request
      const { error } = await supabase
        .from('housing_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh the groups list to update status
      fetchHousingGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  // Handle card action based on membership status
  const handleCardAction = (item) => {
    if (item.membershipStatus === 'approved' || item.membershipStatus === 'pending') {
      // If user is a member or has a pending request, allow them to leave/cancel
      handleLeaveGroup(item.id);
    } else {
      // If user is not a member, allow them to join
      handleJoinGroup(item.id);
    }
  };

  // Render item for FlatList
  const renderHousingGroup = ({ item }) => (
    <View style={viewMode === 'Grid' ? styles.gridCardWrapper : styles.listCardWrapper}>
      <HousingGroupCard 
        item={item}
        onPress={() => navigation.navigate('HousingGroupDetailScreen', { groupId: item.id })}
        onActionPress={() => navigation.navigate('HousingGroupDetailScreen', { groupId: item.id })} // Navigate to detail screen on button press
        gridMode={viewMode === 'Grid'}
      />
    </View>
  );

  // Empty list component
  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Housing Groups Found</Text>
      <Text style={styles.emptyText}>
        {searchTerm || activeFilters.length > 0 
          ? 'Try different search terms or filters' 
          : 'Check back later for new housing groups'}
      </Text>
    </View>
  );

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Floating Action Button with fade animation */}
      <Animated.View style={[
        styles.fabContainer,
        {
          opacity: fadeAnim
        }
      ]}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('CreateHousingGroup')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </Animated.View>
      
      <AppHeader title="Housing Groups" navigation={navigation} canGoBack={true} />
      
      {/* Search component */}
      <SearchComponent
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory="Housing Groups"
        onCategoryChange={() => {}}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewModes={['Grid', 'List']}
        contentType="housing_groups"
      />
      
      {/* Filters removed as requested */}
      
      {/* Listing count */}
      <Text style={styles.listingCount}>
        {filteredGroups.length} {filteredGroups.length === 1 ? 'Group' : 'Groups'}
      </Text>
      
      {/* Housing groups list */}
      <AnimatedFlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        renderItem={renderHousingGroup}
        contentContainerStyle={styles.contentContainer}
        key={viewMode} // Force re-render when view mode changes
        numColumns={viewMode === 'Grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'Grid' ? styles.gridContainer : null}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]} 
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: true,
            listener: () => {
              // Clear any existing timer
              if (scrollEndTimer.current) {
                clearTimeout(scrollEndTimer.current);
              }
              
              // If not already scrolling, animate button fade out
              if (!isScrolling) {
                setIsScrolling(true);
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }
              
              // Set a timer to detect when scrolling stops
              scrollEndTimer.current = setTimeout(() => {
                setIsScrolling(false);
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 500, // Slower fade in
                  useNativeDriver: true,
                }).start();
              }, 200);
            }
          }
        )}
        scrollEventThrottle={16}
        ListEmptyComponent={EmptyListComponent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80, // Extra padding at the bottom for the FAB
    paddingHorizontal: 4,
  },
  headerContainer: {
    marginTop: 10,
    marginBottom: 10, // Reduced to make room for filters
  },
  gridContainer: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  gridCardWrapper: {
    width: '48%', // Using percentage for better responsiveness
    marginBottom: 16,
  },
  listCardWrapper: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 10,
    maxHeight: 50,
    paddingHorizontal: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary + '20', // Light version of primary color
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listingCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default HousingGroupsScreen;
