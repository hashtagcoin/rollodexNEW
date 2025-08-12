import React, { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import { Alert } from '../../utils/alert';

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
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHousingImageCache } from '../../hooks/useHousingImageCache';

// Create an animated version of FlatList
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
import AppHeader from '../../components/layout/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, DARK_GREEN, SIZES } from '../../constants/theme';
import { CardStyles } from '../../constants/CardStyles';
import SearchComponent from '../../components/common/SearchComponent';
import HousingGroupCard from '../../components/cards/HousingGroupCard';
import { useScrollContext } from '../../context/ScrollContext';

const { width } = Dimensions.get('window');

// Dynamic column calculation for responsive design
const CARD_MIN_WIDTH = 280; // Minimum width for each card
const CARD_MARGIN = 20; // Margin between cards
const SCREEN_PADDING = 32; // Total left/right padding

const getGridNumColumns = (currentWidth) => {
  // Mobile phones: fixed 2 columns
  // Tablets/iPads and larger: dynamic columns based on width
  const isMobile = Platform.OS === 'ios' ? currentWidth <= 428 : currentWidth <= 450; // iPhone 14 Pro Max is 428pt
  
  if (isMobile) {
    return 2; // Fixed 2 columns for mobile phones
  }
  
  // For tablets/iPads and larger screens, calculate dynamic columns
  const availableWidth = currentWidth - SCREEN_PADDING;
  const cardWidthWithMargin = CARD_MIN_WIDTH + CARD_MARGIN;
  const calculatedColumns = Math.floor(availableWidth / cardWidthWithMargin);
  
  // Minimum 2 for grid, no artificial maximum - let screen width determine
  return Math.max(calculatedColumns, 2);
};

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

const PAGE_SIZE = 15;

const HousingGroupsScreen = ({ navigation }) => {
  const { reportScroll } = useScrollContext();
  const { preloadHousingItems, getCachedUrl, cacheStats } = useHousingImageCache();
  
  // Track window dimensions for responsive layout
  const [screenDimensions, setScreenDimensions] = useState(() => {
    const { width } = Dimensions.get('window');
    return { width };
  });
  
  // State management
  const [housingGroups, setHousingGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('List');
  const [userId, setUserId] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [userFavorites, setUserFavorites] = useState(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Create refs for FlatList
  const flatListRef = useRef(null);

  // Fetch user ID on component mount and add dimensions listener
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
    
    // Add listener for dimension changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions({ width: window.width });
    });
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Fetch housing groups data from Supabase - optimized version
  const fetchHousingGroups = useCallback(async (pageNum = 0, isRefreshing = false) => {
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
      const start = pageNum * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const { data: groups, error: groupsError } = await supabase
        .from('housing_groups')
        .select(`*, housing_listings:listing_id (*), housing_group_members!group_id(status)`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (groupsError) {
        // If the join query fails (possibly due to no member records), try basic query
        const { data: basicGroups, error: basicError } = await supabase
          .from('housing_groups')
          .select(`*, housing_listings:listing_id (*)`)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .range(start, end);

        if (basicError) throw basicError;
        
        // Process the results
        const processedGroups = basicGroups.map(group => {
          // Build features array from group and housing_listing_data
          const features = [];
          if (group.features && Array.isArray(group.features)) {
            features.push(...group.features);
          }
          if (group.is_sda || group.housing_listing_data?.is_sda) features.push('sda');
          if (group.is_wheelchair_accessible || group.housing_listing_data?.is_wheelchair_accessible) features.push('wheelchair');
          if (group.is_accessible || group.housing_listing_data?.is_accessible) features.push('accessible');
          if (group.pet_friendly || group.housing_listing_data?.pet_friendly) features.push('pets');
          if (group.support_available || group.housing_listing_data?.support_available) features.push('support');
          if (group.lgbt_friendly || group.housing_listing_data?.lgbt_friendly) features.push('lgbtplus');
          // Remove duplicates
          const uniqueFeatures = [...new Set(features)];
          return {
            ...group,
            housing_listing_data: group.housing_listings || null,
            membershipStatus: null, // User is not a member of any groups
            applicationStatus: null, // Will be checked separately if needed
            features: uniqueFeatures,
          };
        });
        
        let updatedList;
        if (pageNum === 0) {
          updatedList = processedGroups;
          setHousingGroups(updatedList);
        } else {
          setHousingGroups(prev => {
            const existingIds = new Set(prev.map(g => g.id));
            const merged = [...prev, ...processedGroups.filter(g => !existingIds.has(g.id))];
            updatedList = merged;
            return merged;
          });
        }
        setHasMore(processedGroups.length === PAGE_SIZE);
        setPage(pageNum);
      } else {
        // Process the joined results
        const processedGroups = groups.map(group => {
          // Extract membership status from the nested data
          let membershipStatus = null;
          if (group.housing_group_members && group.housing_group_members.length > 0) {
            membershipStatus = group.housing_group_members[0].status;
          }
          // Build features array
          const features = [];
          if (group.features && Array.isArray(group.features)) {
            features.push(...group.features);
          }
          if (group.is_sda || group.housing_listing_data?.is_sda) features.push('sda');
          if (group.is_wheelchair_accessible || group.housing_listing_data?.is_wheelchair_accessible) features.push('wheelchair');
          if (group.is_accessible || group.housing_listing_data?.is_accessible) features.push('accessible');
          if (group.pet_friendly || group.housing_listing_data?.pet_friendly) features.push('pets');
          if (group.support_available || group.housing_listing_data?.support_available) features.push('support');
          if (group.lgbt_friendly || group.housing_listing_data?.lgbt_friendly) features.push('lgbtplus');
          // Remove duplicates
          const uniqueFeatures = [...new Set(features)];
          return {
            ...group,
            housing_listing_data: group.housing_listings || null,
            membershipStatus,
            applicationStatus: null, // Will be checked separately if needed for UI updates
            features: uniqueFeatures,
          };
        });
        
        let updatedList;
        if (pageNum === 0) {
          updatedList = processedGroups;
          setHousingGroups(updatedList);
        } else {
          setHousingGroups(prev => {
            const existingIds = new Set(prev.map(g => g.id));
            const merged = [...prev, ...processedGroups.filter(g => !existingIds.has(g.id))];
            updatedList = merged;
            return merged;
          });
        }
        setHasMore(processedGroups.length === PAGE_SIZE);
        setPage(pageNum);
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
      setIsFetchingMore(false);

      // cache to AsyncStorage on initial page or after merge complete
      try {
        const toCache = pageNum === 0 ? updatedList : await AsyncStorage.getItem('cachedHousingGroups');
        if (Array.isArray(updatedList)) {
          await AsyncStorage.setItem('cachedHousingGroups', JSON.stringify(updatedList));
        }
      } catch (err) {}
    }
  }, [refreshing]);

  // Only fetch on focus, not on both mount and focus
  useFocusEffect(
    useCallback(() => {
      const loadCache = async () => {
        try {
          const cached = await AsyncStorage.getItem('cachedHousingGroups');
          if (cached) setHousingGroups(JSON.parse(cached));
        } catch (err) {}
        fetchHousingGroups(0);
      };
      loadCache();
    }, [fetchHousingGroups])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setHasMore(true);
    setPage(0);
    fetchHousingGroups(0, true);
  }, [fetchHousingGroups]);

  const handleLoadMore = () => {
    if (hasMore && !isFetchingMore && !loading) {
      setIsFetchingMore(true);
      fetchHousingGroups(page + 1);
    }
  };

  // Toggle a filter
  const toggleFilter = (key) => {
    setActiveFilters(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Filter groups based on search term and active filters - optimized with useMemo
  const deferredSearch = useDeferredValue(searchTerm);
  const filteredGroups = useMemo(() => {
    // If 'all' is selected or no filters active, don't filter by features
    const shouldApplyFeatureFilters = activeFilters.length > 0 && !activeFilters.includes('all');
    
    return housingGroups.filter(group => {
      // First, apply search term filter
      if (deferredSearch) {
        const lowerSearchTerm = deferredSearch.toLowerCase();
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
  }, [housingGroups, deferredSearch, activeFilters]);

  // Toggle Favorite Function
  const toggleFavorite = useCallback(async (itemId, itemType) => {
    if (!itemId || !itemType) {
      console.error('[HousingGroups] toggleFavorite: Invalid itemId or itemType', itemId, itemType);
      Alert.alert('Error', 'Could not update favorite status.');
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      Alert.alert('Authentication Error', 'You must be logged in to favorite items.');
      console.error('[HousingGroups] toggleFavorite: Auth error or no user', authError);
      return;
    }

    const isCurrentlyFavorited = userFavorites.has(itemId);

    console.log(`[HousingGroups] toggleFavorite: Item ID: ${itemId}, Type: ${itemType}, Currently Favorited: ${isCurrentlyFavorited}, User: ${user.id}`);

    if (isCurrentlyFavorited) {
      // Unfavorite
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('item_type', itemType);

      if (error) {
        console.error('[HousingGroups] Error unfavoriting item:', error);
        Alert.alert('Error', 'Could not remove from favorites. Please try again.');
      } else {
        setUserFavorites(prevFavorites => {
          const newFavorites = new Set(prevFavorites);
          newFavorites.delete(itemId);
          console.log('[HousingGroups] Item unfavorited. New favorites set:', newFavorites);
          return newFavorites;
        });
      }
    } else {
      // Favorite - use upsert to handle potential conflicts
      const { error } = await supabase
        .from('favorites')
        .upsert({ 
          user_id: user.id, 
          item_id: itemId, 
          item_type: itemType,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,item_id,item_type',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('[HousingGroups] Error favoriting item:', error);
        Alert.alert('Error', 'Could not add to favorites. Please try again.');
      } else {
        setUserFavorites(prevFavorites => {
          const newFavorites = new Set(prevFavorites);
          newFavorites.add(itemId);
          console.log('[HousingGroups] Item favorited. New favorites set:', newFavorites);
          return newFavorites;
        });
      }
    }
  }, [userFavorites]);

  // Refresh user favorites
  const refreshUserFavorites = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[HousingGroups] refreshUserFavorites: Auth error or no user', authError);
      return;
    }

    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('item_id')
      .eq('user_id', user.id);

    if (favoritesError) {
      console.error('[HousingGroups] refreshUserFavorites: Error fetching favorites', favoritesError);
    } else {
      setUserFavorites(new Set(favorites.map(favorite => favorite.item_id)));
    }
  }, []);

  // Reset scroll position when tab is focused and refresh favorites data
  useFocusEffect(
    useCallback(() => {
      console.log('[HousingGroups] Screen focused - refreshing favorites data');
      refreshUserFavorites();
      return () => {
        console.log('[HousingGroups] Screen unfocused');
      };
    }, [refreshUserFavorites])
  );

  // Prefetch housing images using optimized cache
  useEffect(() => {
    if (housingGroups.length === 0) return;
    
    // Prepare items for preloading
    const itemsToPreload = housingGroups.map(group => ({
      id: group.id,
      media_urls: group.housing_listing_data?.media_urls?.length > 0 
        ? group.housing_listing_data.media_urls 
        : group.avatar_url ? [group.avatar_url] : []
    }));
    
    // Preload images with proper caching
    preloadHousingItems(itemsToPreload);
    
    // Log cache stats in development
    if (__DEV__) {
      console.log('[HousingGroups] Cache stats:', cacheStats);
    }
  }, [housingGroups, preloadHousingItems, cacheStats]);

  // Handle creating a new housing group
  const handleCreateGroup = () => {
    navigation.navigate('CreateHousingGroupScreen');
  };

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

  // Calculate how many spots are still needed
  const calculateSpotsNeeded = useCallback((group) => {
    // Check if max_members and current_members data is available
    if (group && group.max_members !== undefined && group.current_members !== undefined) {
      return Math.max(0, group.max_members - group.current_members);
    }
    // Default to 0 if data is missing
    return 0;
  }, []);

  // Render a housing group card
  const renderHousingGroup = ({ item }) => {
    // Calculate spots needed
    const spotsNeeded = calculateSpotsNeeded(item);
    
    return (
      <HousingGroupCard
        item={item}
        onPress={() => navigation.navigate('HousingGroupDetailScreen', { groupId: item.id })}
        onJoin={handleJoinGroup}
        userFavorites={userFavorites}
        onToggleFavorite={(id) => toggleFavorite(id, 'housing_group')}
        isFavorited={userFavorites.has(item.id)}
        displayAs={viewMode.toLowerCase()}
      />
    );
  };

  // Empty list component
  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No Housing Groups Found</Text>
      <Text style={styles.emptyText}>
        {searchTerm || activeFilters.length > 0 
          ? 'Try different search terms or filters' 
          : 'Create a group to start collaborating'}
      </Text>
    </View>
  );

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Housing Groups" 
        navigation={navigation} 
        canGoBack={true}
      />
      
      <SearchComponent
        contentType="housing_groups"
        categories={HOUSING_FILTERS.map(filter => filter.label)}
        selectedCategory={activeFilters.length > 0 ? 
          HOUSING_FILTERS.find(f => activeFilters.includes(f.key))?.label || 'All' : 'All'}
        onCategoryChange={(category) => {
          const filter = HOUSING_FILTERS.find(f => f.label === category);
          if (filter) {
            if (filter.key === 'all') {
              setActiveFilters([]);
            } else {
              setActiveFilters([filter.key]);
            }
          }
        }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewModes={['Grid', 'List']}
        showCategories={true}
        showViewModes={true}
      />

      <View style={styles.contentViewWrapper}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading housing groups...</Text>
          </View>
        ) : filteredGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={80} color={COLORS.gray} />
            <Text style={styles.emptyText}>No housing groups found</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreateGroup}
            >
              <Text style={styles.emptyButtonText}>Create a Housing Group</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'Grid' ? (
          <FlatList
            key="grid"
            data={filteredGroups}
            renderItem={renderHousingGroup}
            keyExtractor={(item) => String(item.id)}
            numColumns={getGridNumColumns(screenDimensions.width)}
            key={`grid-${getGridNumColumns(screenDimensions.width)}`}
            columnWrapperStyle={{justifyContent: 'space-around', paddingHorizontal: 8}}
            contentContainerStyle={{paddingHorizontal: 10, paddingBottom: 20}}
            showsVerticalScrollIndicator={false}
            initialNumToRender={4}
            maxToRenderPerBatch={6}
            windowSize={7}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
            onScroll={reportScroll}
            scrollEventThrottle={16}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
          />
        ) : (
          <FlatList
            key="list"
            data={filteredGroups}
            renderItem={renderHousingGroup}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            showsVerticalScrollIndicator={false}
            initialNumToRender={4}
            maxToRenderPerBatch={6}
            windowSize={7}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
            onScroll={reportScroll}
            scrollEventThrottle={16}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  contentViewWrapper: {
    flex: 1,
  },
  listContainer: {
    padding: 10,
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.darkGray,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HousingGroupsScreen;
