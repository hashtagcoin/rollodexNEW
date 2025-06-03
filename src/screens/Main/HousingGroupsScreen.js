import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// Housing group filters
const HOUSING_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sda', label: 'SDA' },
  { key: 'wheelchair', label: 'Wheelchair' },
  { key: 'accessible', label: 'Accessible' },
  { key: 'under25', label: '<25' },
  { key: 'under35', label: '<35' },
  { key: 'pets', label: 'Pets' },
  { key: 'support', label: 'Support' },
  { key: 'lgbtplus', label: 'LGBT+' },
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
  
  // Animation values removed (FAB no longer present)

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

  // Fetch housing groups data from Supabase - optimized version
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

      // Single query to fetch housing groups with related listing data and membership status
      // This uses Supabase's nested selection to avoid multiple round trips
      const { data: groups, error: groupsError } = await supabase
        .from('housing_groups')
        .select(`
          *,
          housing_listings:listing_id (*),
          housing_group_members!group_id(status)
        `)
        .eq('is_active', true)
        .eq('housing_group_members.user_id', user.id)
        .order('created_at', { ascending: false });

      if (groupsError) {
        // If the join query fails (possibly due to no member records), try basic query
        const { data: basicGroups, error: basicError } = await supabase
          .from('housing_groups')
          .select(`
            *,
            housing_listings:listing_id (*)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (basicError) throw basicError;
        
        // Process the results
        const processedGroups = basicGroups.map(group => ({
          ...group,
          housing_listing_data: group.housing_listings || null,
          membershipStatus: null, // User is not a member of any groups
          applicationStatus: null // Will be checked separately if needed
        }));
        
        setHousingGroups(processedGroups);
      } else {
        // Process the joined results
        const processedGroups = groups.map(group => {
          // Extract membership status from the nested data
          let membershipStatus = null;
          if (group.housing_group_members && group.housing_group_members.length > 0) {
            membershipStatus = group.housing_group_members[0].status;
          }
          
          return {
            ...group,
            housing_listing_data: group.housing_listings || null,
            membershipStatus,
            applicationStatus: null // Will be checked separately if needed for UI updates
          };
        });
        
        setHousingGroups(processedGroups);
      }

      // Optional: If we absolutely need application status and can't modify the UI,
      // we could fetch it in a separate bulk query instead of one per group
      // This would run after initial display to avoid blocking the UI
      /*
      if (user && housingGroups.length > 0) {
        const listingIds = housingGroups
          .filter(g => g.listing_id)
          .map(g => g.listing_id);
          
        if (listingIds.length > 0) {
          const { data: applications } = await supabase
            .from('housing_applications')
            .select('listing_id, status')
            .eq('user_id', user.id)
            .in('listing_id', listingIds);
            
          if (applications?.length > 0) {
            // Create a map for quick lookup
            const appStatusMap = {};
            applications.forEach(app => {
              appStatusMap[app.listing_id] = app.status;
            });
            
            // Update the groups with application status
            setHousingGroups(current => 
              current.map(group => ({
                ...group,
                applicationStatus: group.listing_id ? appStatusMap[group.listing_id] : null
              }))
            );
          }
        }
      }
      */
    } catch (error) {
      // Error fetching housing groups
      // We could show an error message to the user here
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // Only fetch on focus, not on both mount and focus
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

  // Filter groups based on search term and active filters - optimized with useMemo
  const filteredGroups = useMemo(() => {
    // If 'all' is selected or no filters active, don't filter by features
    const shouldApplyFeatureFilters = activeFilters.length > 0 && !activeFilters.includes('all');
    
    return housingGroups.filter(group => {
      // First, apply search term filter
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = 
          group.name?.toLowerCase().includes(lowerSearchTerm) ||
          (group.description && group.description.toLowerCase().includes(lowerSearchTerm)) ||
          (group.housing_listing_data?.suburb && 
           group.housing_listing_data.suburb.toLowerCase().includes(lowerSearchTerm));

        if (!matchesSearch) return false;
      }
      
      // Then, apply feature filters if any are active (except 'all' which means no filtering)
      if (shouldApplyFeatureFilters) {
        return activeFilters.every(filter => {
          switch(filter) {
            case 'under25':
              return group.average_age && group.average_age < 25;
            case 'under35':
              return group.average_age && group.average_age < 35;
            case 'lgbtplus':
              return group.lgbt_friendly === true;
            case 'support':
              return group.support_available === true || group.features?.includes('supportsOnsite');
            case 'pets':
              return group.pet_friendly === true || group.features?.includes('pets');
            case 'sda':
              return group.features?.includes('sda');
            case 'wheelchair':
              return group.features?.includes('wheelchair');
            case 'accessible':
              return group.features?.includes('accessible');
            default:
              return true;
          }
        });
      }
      
      // If no filters or 'all' filter is active, include the group
      return true;
    });
  }, [housingGroups, searchTerm, activeFilters]); // Only recalculate when these dependencies change

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
      // Error joining group
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
      // Error leaving group
    }
  };

  // Handle card action based on membership status
  const handleCardAction = (item) => {
    if (item.membershipStatus === 'approved' || item.membershipStatus === 'pending') {
      // If user is a member or has a pending request, allow them to leave/cancel
      handleLeaveGroup(item.id);
    } else {
      // If user is not a member, navigate to the Main version of HousingGroupDetailScreen
      navigation.navigate('HousingGroupDetailScreen', { groupId: item.id, fromJoinButton: true });
    }
  };

  // Render item for FlatList
  const renderHousingGroup = ({ item }) => {
    // Calculate how many more members are needed
    const spotsNeeded = item.max_members - item.current_members;
    
    // Create a modified item with needsLabel if not a member or pending
    const modifiedItem = {
      ...item,
      needsLabel: (!item.membershipStatus || (item.membershipStatus !== 'approved' && item.membershipStatus !== 'pending')) 
        ? `Need ${spotsNeeded > 0 ? spotsNeeded : 'more'}` 
        : null
    };
    
    return (
      <View style={viewMode === 'Grid' ? styles.gridCardWrapper : styles.listCardWrapper}>
        <HousingGroupCard 
          item={modifiedItem}
          // Always navigate to the Main version when tapping the card
          onPress={() => navigation.navigate('HousingGroupDetailScreen', { groupId: item.id })}
          // Use handleCardAction for the button press
          onActionPress={() => handleCardAction(item)}
          gridMode={viewMode === 'Grid'}
        />
      </View>
    );
  };

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
      {/* FAB button removed as requested */}
      
      <AppHeader title="Housing Groups" navigation={navigation} canGoBack={true} />
      
      {/* Search component */}
      <SearchComponent
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categories={HOUSING_FILTERS.map(filter => filter.label)}
        selectedCategory={activeFilters.length > 0 ? 
          HOUSING_FILTERS.find(f => activeFilters.includes(f.key))?.label || 'All' : 'All'}
        onCategoryChange={(category) => {
          // Find the corresponding filter key
          const filter = HOUSING_FILTERS.find(f => f.label === category);
          if (filter) {
            if (filter.key === 'all') {
              // Clear all filters when 'All' is selected
              setActiveFilters([]);
            } else {
              // Set this as the only active filter
              setActiveFilters([filter.key]);
            }
          }
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewModes={['Grid', 'List']}
        contentType="housing_groups"
      />
      
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
    paddingBottom: 20, // Reduced padding since FAB is removed
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
    marginBottom: 12, // Reduced margin between cards
  },
  listCardWrapper: {
    width: '100%',
    marginBottom: 10, // Reduced margin between cards
    paddingHorizontal: 12, // Reduced horizontal padding
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
  // FAB styles removed

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default HousingGroupsScreen;
