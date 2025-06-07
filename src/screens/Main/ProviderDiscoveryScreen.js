import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  Dimensions,
  TouchableOpacity,
  Alert,
  RefreshControl 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import { supabase } from '../../lib/supabaseClient'; 
import ServiceCard from '../../components/cards/ServiceCard'; 
import HousingCard from '../../components/cards/HousingCard';
import AppHeader from '../../components/layout/AppHeader';
import CachedImage from '../../components/common/CachedImage';
import SearchComponent from '../../components/common/SearchComponent';
import SwipeCardDeck from '../../components/common/SwipeCardDeck.js';
import SwipeCard from '../../components/common/SwipeCard';
import { 
  COLORS, 
  SIZES, 
  FONTS, 
  SHADOWS, 
  DARK_GREEN, 
  LIGHT_GREEN, 
  RED, 
  TEXT_INPUT_GRAY, 
  ICON_COLOR_DARK, 
  ICON_COLOR_LIGHT 
} from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Constants
const CATEGORIES = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
const VIEW_MODES = ['Grid', 'List', 'Swipe'];
const APP_HEADER_HEIGHT = 50; 
const CONTROLS_HEIGHT = 140; 
const VIEW_MODE_TOGGLE_HEIGHT = 60; 
const BOTTOM_NAV_HEIGHT = 60; 
const CARD_MARGIN = 10;

/**
 * Provider Discovery Screen - Main screen for exploring services and housing
 */
const ProviderDiscoveryScreen = ({ route }) => {  
  // Extract route params
  const initialParams = route?.params || {};
  const navigation = useNavigation();
  
  // State variables
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  // Track swiped items to prevent them from reappearing
  const [swipedItemIds, setSwipedItemIds] = useState(new Set());
  const listViewRef = useRef(null);
  
  // Handle initial category from params
  useEffect(() => {
    if (initialParams.initialCategory && CATEGORIES.includes(initialParams.initialCategory)) {
      setSelectedCategory(initialParams.initialCategory);
    }
  }, [initialParams.initialCategory]);
  
  // Function to refresh just the user favorites without reloading all items
  const refreshUserFavorites = useCallback(async () => {
    try {
      console.log('[ProviderDiscovery] Refreshing user favorites');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('[ProviderDiscovery] Not logged in, cannot refresh favorites');
        return;
      }
      
      // Get current displayed item IDs
      if (!items || items.length === 0) {
        console.log('[ProviderDiscovery] No items to refresh favorites for');
        return;
      }
      
      // Determine correct item type for the current category
      const isHousing = selectedCategory === 'Housing';
      const itemTypeForFavorites = isHousing ? 'housing_listing' : 'service_provider';
      const itemIds = items.map(item => item.id);
      
      console.log(`[ProviderDiscovery] Refreshing favorites for ${items.length} ${itemTypeForFavorites} items`);
      
      // Try to get any favorited items for the current items shown
      try {
        // First, clear the current user favorites if switching categories
        const prevFavorites = new Set(userFavorites);
        setUserFavorites(new Set());
        
        // Fetch latest favorites status for these items
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('favorites')
          .select('item_id')
          .eq('user_id', user.id)
          .eq('item_type', itemTypeForFavorites)
          .in('item_id', itemIds);
        
        if (favoritesError) {
          console.error('[ProviderDiscovery] DB Error refreshing favorites:', favoritesError);
        } else if (favoritesData) {
          const favoritedIds = new Set(favoritesData.map(fav => fav.item_id));
          console.log(`[ProviderDiscovery] Found ${favoritesData.length} favorited items of type ${itemTypeForFavorites}`);
          
          // Always update regardless of previous state to ensure consistency
          setUserFavorites(favoritedIds);
        }
      } catch (dbError) {
        console.error('[ProviderDiscovery] Exception querying favorites:', dbError);
      }
    } catch (err) {
      console.error('[ProviderDiscovery] Top-level exception refreshing favorites:', err);
    }
  }, [items, selectedCategory]);
  
  
  // Reset scroll position when tab is focused and refresh favorites data
  useFocusEffect(
    useCallback(() => {
      console.log('[ProviderDiscovery] Screen focused');
      
      // Reset scroll position if in list view
      if (viewMode === 'List' && listViewRef.current) {
        listViewRef.current.scrollToOffset({ offset: 0, animated: false });
      }
      
      // IMPORTANT: Always refresh favorites when screen gains focus
      // This ensures changes from other screens (like ServiceDetailScreen) are reflected
      console.log('[ProviderDiscovery] Screen focused - refreshing favorites data');
      refreshUserFavorites();
      
      // Force a fetchData call to ensure we have the most recent data
      // This helps ensure consistency across the app
      fetchData(true);
      
      return () => {
        // Code to run when screen loses focus (optional)
        console.log('[ProviderDiscovery] Screen unfocused');
      };
    }, [refreshUserFavorites, fetchData]) // Include fetchData in dependencies
  );
  const [viewMode, setViewMode] = useState(VIEW_MODES[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFavorites, setUserFavorites] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  
  // Sort related state
  const [sortConfig, setSortConfig] = useState({
    field: 'created_at',
    direction: 'desc'
  });
  
  // Refs
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Reset items and scroll position when category changes (primarily for non-swipe views)
  useEffect(() => {
    if (isMounted.current) {
      console.log('[ProviderDiscovery] Category changed, resetting items');
      setItems([]);
      // Clear swiped items when category changes
      if (viewMode === 'Swipe') {
        console.log('[ProviderDiscovery] Resetting swiped items with category change');
        setSwipedItemIds(new Set());
      } 
      if (listViewRef.current && viewMode !== 'Swipe') {
        listViewRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [selectedCategory, viewMode]);
  
  // useMemo to filter out swiped items for the swipe deck
  const filteredItems = useMemo(() => {
    if (viewMode !== 'Swipe' || !items) return items;
    
    // Filter out any items that have already been swiped
    // Also ensure each item has a unique ID to prevent React key issues
    const filtered = items
      .filter(item => item && item.id && !swipedItemIds.has(item.id));
      
    console.log(`[ProviderDiscovery] Filtered items: ${filtered.length} (total: ${items.length}, swiped: ${swipedItemIds.size})`);
    return filtered;
  }, [items, swipedItemIds, viewMode]);

  // Handle card swipe events - keeps track of which items have been swiped
  // and optionally adds to favorites for right swipes
  const handleCardSwipe = useCallback((direction, item) => {
    if (!item || !item.id) {
      console.log('[ProviderDiscovery] Swipe handler received invalid item:', item);
      return;
    }
    
    // Skip if this item has already been processed
    if (swipedItemIds.has(item.id)) {
      console.log(`[ProviderDiscovery] Item ${item.id} already swiped, skipping duplicate event`);
      return;
    }
    
    console.log(`[ProviderDiscovery] Card swiped ${direction}:`, item.id, item.title || item.name);
    
    // Add swiped item ID to the set of swiped items
    setSwipedItemIds(prevIds => {
      const newIds = new Set(prevIds);
      newIds.add(item.id);
      console.log('[ProviderDiscovery] Updated swiped items set, now contains', newIds.size, 'items');
      return newIds;
    });
    
    // If swiped right, add to favorites
    if (direction === 'right') {
      console.log('[ProviderDiscovery] User liked item, adding to favorites');
      // Determine the correct item type based on the category
      const itemType = selectedCategory === 'Housing' ? 'housing_listing' : 'service_provider';
      // Use a small timeout to ensure the swipe animation completes before updating favorites
      // This helps prevent UI jank during the swipe and favorite operations
      setTimeout(() => {
        toggleFavorite(item, itemType);
      }, 300);
    }
  }, [toggleFavorite, swipedItemIds]);

  // Main data fetching logic as a useCallback
  const fetchData = useCallback(async (isRefreshing = false) => {
    if (!isMounted.current) return;
    console.log('[ProviderDiscovery] fetchData called. Category:', selectedCategory, 'Search:', searchTerm, 'Refreshing:', isRefreshing);

    try {
      if (!isRefreshing) setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ProviderDiscovery] Auth error or no user:', authError);
        if (isMounted.current) {
          setItems([]);
          setUserFavorites(new Set());
          if (!isRefreshing) setLoading(false);
          if (isRefreshing) setRefreshing(false);
          // Alert.alert('Authentication Error', 'Could not retrieve user details. Please try logging in again.');
        }
        return;
      }
      console.log('[ProviderDiscovery] User ID:', user.id);

      const isHousing = selectedCategory === 'Housing';
      const tableName = isHousing ? 'housing_listings' : 'services';
      const itemTypeForFavorites = isHousing ? 'housing_listing' : 'service_provider';
      
      let query = supabase.from(tableName).select('*')
        .eq('available', true); // Only show available listings
      
      if (!isHousing) {
        query = query.ilike('category', `%${selectedCategory}%`);
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
      } else if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      const { field, direction } = sortConfig;
      const isAscending = direction === 'asc';
      if (field) query = query.order(field, { ascending: isAscending });
      
      // Adjust limit based on view mode, swipe might want fewer initially
      const limit = viewMode === 'Swipe' ? 10 : 20;
      query = query.limit(limit);
      
      const { data, error } = await query;
      
      if (!isMounted.current) return;
      
      if (error) {
        console.error('[ProviderDiscovery] Fetch error:', error);
        if (isMounted.current) setItems([]);
      } else {
        console.log(`[ProviderDiscovery] Fetched ${data ? data.length : 0} items for ${tableName}`);
        if (isMounted.current) setItems(data || []);
        
        if (user && data && data.length > 0) {
          const itemIds = data.map(item => item.id);
          console.log(`[ProviderDiscovery] Fetching favorites for ${itemTypeForFavorites} items:`, itemIds);
          const { data: favoritesData, error: favoritesError } = await supabase
            .from('favorites')
            .select('item_id')
            .eq('user_id', user.id)
            .eq('item_type', itemTypeForFavorites)
            .in('item_id', itemIds);

          if (favoritesError) {
            console.error('[ProviderDiscovery] Error fetching user favorites:', favoritesError);
          } else if (favoritesData && isMounted.current) {
            const favoritedIds = new Set(favoritesData.map(fav => fav.item_id));
            console.log('[ProviderDiscovery] User favorited IDs:', favoritedIds);
            setUserFavorites(favoritedIds);
          }
        } else if (isMounted.current) {
          // No items fetched or no user, clear favorites for current view
           setUserFavorites(new Set());
        }
      }
    } catch (error) {
      if (!isMounted.current) return;
      console.error('[ProviderDiscovery] Exception in fetchData:', error);
      if (isMounted.current) setItems([]);
    } finally {
      if (isMounted.current) {
        if (!isRefreshing) setLoading(false);
        if (isRefreshing) setRefreshing(false);
      }
    }
  }, [selectedCategory, searchTerm, sortConfig, viewMode]); // Added viewMode as it affects limit

  // useEffect to call fetchData
  useEffect(() => {
    fetchData(false); // Initial fetch, not a refresh
  }, [fetchData]); // fetchData is now a stable useCallback

  const onRefresh = useCallback(() => {
    console.log('[ProviderDiscovery] onRefresh called');
    setRefreshing(true);
    fetchData(true); // Call fetchData with isRefreshing = true
  }, [fetchData]);
  
  // Toggle Favorite Function
  const toggleFavorite = useCallback(async (item, itemType) => {
    if (!item || !item.id || !itemType) {
      console.error('[ProviderDiscovery] toggleFavorite: Invalid item or itemType', item, itemType);
      Alert.alert('Error', 'Could not update favorite status.');
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      Alert.alert('Authentication Error', 'You must be logged in to favorite items.');
      console.error('[ProviderDiscovery] toggleFavorite: Auth error or no user', authError);
      return;
    }

    const itemId = item.id;
    const isCurrentlyFavorited = userFavorites.has(itemId);

    console.log(`[ProviderDiscovery] toggleFavorite: Item ID: ${itemId}, Type: ${itemType}, Currently Favorited: ${isCurrentlyFavorited}, User: ${user.id}`);

    if (isCurrentlyFavorited) {
      // Unfavorite
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('item_type', itemType);

      if (error) {
        console.error('[ProviderDiscovery] Error unfavoriting item:', error);
        Alert.alert('Error', 'Could not remove from favorites. Please try again.');
      } else {
        setUserFavorites(prevFavorites => {
          const newFavorites = new Set(prevFavorites);
          newFavorites.delete(itemId);
          console.log('[ProviderDiscovery] Item unfavorited. New favorites set:', newFavorites);
          return newFavorites;
        });
      }
    } else {
      // Favorite with created_at field in ISO format
      const { error } = await supabase
        .from('favorites')
        .upsert({
          user_id: user.id,
          item_id: itemId,
          item_type: itemType,
          created_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id,item_id,item_type',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('[ProviderDiscovery] Error favoriting item:', error);
        Alert.alert('Error', 'Could not add to favorites. Please try again.');
      } else {
        setUserFavorites(prevFavorites => {
          const newFavorites = new Set(prevFavorites);
          newFavorites.add(itemId);
          console.log('[ProviderDiscovery] Item favorited. New favorites set:', newFavorites);
          return newFavorites;
        });
      }
    }
  }, [userFavorites]); // Dependency: userFavorites

  // Handle sort changes
  const handleSortChange = (newSortConfig) => {
    setSortConfig(newSortConfig);
  };
  
  // Navigation handlers
  const handleServicePress = useCallback((item) => {
    navigation.navigate('ServiceDetail', { serviceId: item.id });
  }, [navigation]);

  const handleHousingPress = useCallback((item) => {
    navigation.navigate('HousingDetail', { item });
  }, [navigation]);
  
  // Image handlers
  // Create a stable callback that only logs completion once
  const handleImageLoaded = useCallback((uri) => {
    // Empty callback that maintains stable reference
    // No need to do anything here as the CachedImage component handles caching
  }, []);
  
  // Swipe card handlers
  const handleSwipeCard = useCallback(async (cardData, direction) => {
    // This method is called by the SwipeCardDeck component and is separate from handleCardSwipe
    // It's mainly for analytics or other side effects, not for UI state management
    const isHousing = selectedCategory === 'Housing'; // Determine if current category is Housing
    const itemTypeForFavorites = isHousing ? 'housing_listing' : 'service_provider';
    
    try {
      // No need to handle favorites here - that's done in handleCardSwipe
      console.log(`[ProviderDiscovery] SwipeCardDeck processed swipe ${direction}:`, cardData?.title || cardData?.name || 'Unknown card');
      
      if (direction === 'right') { // Liked
        console.log('[ProviderDiscovery] Processed like event');
        // No need to toggle favorite here - handled in handleCardSwipe
      } else if (direction === 'up') { // Super liked
        console.log('[ProviderDiscovery] Processed super like event');
        // Special handling for up swipe if needed
      } else if (direction === 'left') { // Disliked
        console.log('[ProviderDiscovery] Processed dislike event');
      }
      
      // Could implement saving to user's favorites/likes here
      // Example:
      // if (direction === 'right' || direction === 'up') {
      //   await supabase
      //     .from('user_favorites')
      //     .insert({
      //       user_id: currentUserId,
      //       item_id: cardData.id,
      //       item_type: isHousing ? 'housing' : 'service',
      //       super_liked: direction === 'up'
      //     });
      // }
    } catch (error) {
      console.error('Error handling swipe:', error);
    }
  }, [selectedCategory]);
  
  const handleSwipeCardPress = useCallback((item) => {
    const isHousing = selectedCategory === 'Housing';
    if (isHousing) {
      navigation.navigate('HousingDetail', { item });
    } else {
      navigation.navigate('ServiceDetail', { serviceId: item.id });
    }
  }, [navigation, selectedCategory]);
  
  const handleAllCardsViewed = useCallback(() => {
    // No alert when all cards are viewed
    console.log('All cards viewed in this category');
  }, []);
  
  // Render main content 
  const renderContent = () => {
    // Add console logging to help debug rendering issues
    console.log(`[ProviderDiscovery] Rendering content in ${viewMode} mode`);
    console.log(`[ProviderDiscovery] Total items: ${items.length}, Filtered items: ${filteredItems.length}, Swiped items: ${swipedItemIds.size}`);
    
    // Loading state
    if (loading && items.length === 0) {
      return <ActivityIndicator size="large" color={DARK_GREEN} style={styles.loadingIndicator} />;
    }
    
    // Empty state
    if (!loading && items.length === 0) {
      return <Text style={styles.emptyText}>No {selectedCategory.toLowerCase()} found.</Text>;
    }
    
    // Grid view
    if (viewMode === 'Grid') {
      const isHousing = selectedCategory === 'Housing';
      const CardComponent = isHousing ? HousingCard : ServiceCard;
      const handlePress = isHousing ? handleHousingPress : handleServicePress;
      
      return (
        <FlatList
          key={`${isHousing ? 'housing' : 'services'}-grid`}
          data={items}
          renderItem={({ item }) => (
            <CardComponent 
              item={item} 
              onPress={handlePress}
              displayAs="grid"
              onImageLoaded={handleImageLoaded}
              isFavorited={userFavorites.has(item.id)} 
              onToggleFavorite={() => toggleFavorite(item, isHousing ? 'housing_listing' : 'service_provider')}
            />
          )}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[DARK_GREEN]}
            />
          }
        />
      );
    } 
    
    // List view
    else if (viewMode === 'List') {
      const isHousing = selectedCategory === 'Housing';
      const CardComponent = isHousing ? HousingCard : ServiceCard;
      const handlePress = isHousing ? handleHousingPress : handleServicePress;
      
      return (
        <FlatList
          key={`${isHousing ? 'housing' : 'services'}-list`}
          data={items}
          renderItem={({ item }) => (
            <View style={styles.listItemContainer}>
              <CardComponent 
                item={item} 
                onPress={handlePress}
                displayAs="list"
                onImageLoaded={handleImageLoaded}
                isFavorited={userFavorites.has(item.id)} 
                onToggleFavorite={() => toggleFavorite(item, isHousing ? 'housing_listing' : 'service_provider')}
              />
            </View>
          )}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContainer} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[DARK_GREEN]}
            />
          }
        />
      );
    }
    
    // Swipe view
    else if (viewMode === 'Swipe') {
      // Use filtered items for swipe view to avoid showing already swiped cards
      if (loading) {
        return <ActivityIndicator style={styles.loader} size="large" color={COLORS.DARK_GREEN} />;
      }
      
      if (!filteredItems || filteredItems.length === 0) {
        // Check if we have items but all have been swiped
        if (items.length > 0 && swipedItemIds.size === items.length) {
          return (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>You've viewed all {selectedCategory} items</Text>
              <TouchableOpacity 
                style={styles.resetButton} 
                onPress={() => {
                  console.log('[ProviderDiscovery] Resetting swiped items');
                  setSwipedItemIds(new Set());
                }}
              >
                <Text style={styles.resetButtonText}>View Again</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return <Text style={styles.noResultsText}>No {selectedCategory} matches found</Text>;
      }
      
      console.log(`[ProviderDiscovery] Rendering SwipeCardDeck with ${filteredItems.length} items`);
      
      return (
        <View style={styles.swipeContainer}>
          <SwipeCardDeck
            data={filteredItems}
            renderCard={(item) => (
              <SwipeCard 
                item={item} 
                isHousing={selectedCategory === 'Housing'} 
                onPress={() => handleSwipeCardPress(item)}
              />
            )}
            onSwipeLeft={(item) => handleCardSwipe('left', item)}
            onSwipeRight={(item) => handleCardSwipe('right', item)}
            onSwipeBottom={(item) => handleCardSwipe('bottom', item)}
            onCardDisappear={(item, index) => {
              // Just log the disappear event but don't update state here to avoid duplicates
              // State updates are handled by the onSwipe* callbacks
              if (item) {
                console.log(`[ProviderDiscovery] Card disappeared: ${item.id || 'unknown'} at index ${index}`);
              }
            }}
            onAllCardsViewed={() => {
              console.log('[ProviderDiscovery] All cards have been viewed');
              // Optional: Show a message to the user that they've viewed all cards
            }}
            stackSize={3}
            stackSeparation={15}
            stackScale={0.08}
            infinite={false}
            backgroundColor="transparent"
            disableTopSwipe={true}
            disableBottomSwipe={false}
            animationDuration={300}
            cardStyle={styles.swipeCard}
            overlayLabels={{
              left: {
                title: 'SKIP',
                color: '#E74C3C',
                fontSize: 32
              },
              right: {
                title: 'LIKE',
                color: '#27AE60',
                fontSize: 32
              },
              bottom: {
                title: 'DISMISS',
                color: '#7F8C8D',
                fontSize: 24
              }
            }}
          />
        </View>
      );
    }
    
    return null;
  };
  

  // Back button handler with view mode cycling
  const handleBackPressProviderDiscovery = useCallback(() => {
    if (viewMode !== 'Grid') {
      setViewMode('Grid');
      if (listViewRef.current && typeof listViewRef.current.scrollToOffset === 'function') {
        listViewRef.current.scrollToOffset({ animated: true, offset: 0 });
      }
    } else {
      navigation.navigate('DashboardScreen');
    }
  }, [viewMode, navigation]);

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Explore"
        navigation={navigation}
        canGoBack={true} 
        onBackPressOverride={handleBackPressProviderDiscovery}
        rightContent={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {VIEW_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 5,
                  backgroundColor: viewMode === mode ? DARK_GREEN : 'transparent',
                  marginLeft: 5
                }}
                onPress={() => setViewMode(mode)}
              >
                <Text style={{ color: viewMode === mode ? 'white' : DARK_GREEN, fontSize: 12 }}>
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />

      {/* Show full search component in grid/list views, or just view mode controls in swipe view */}
      {viewMode !== 'Swipe' ? (
        <SearchComponent
          contentType={selectedCategory === 'Housing' ? 'housing' : 'services'}
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          viewModes={VIEW_MODES}
          showCategories={true}
          showViewModes={true}
          showSort={true}
        />
      ) : (
        <View style={styles.viewModeSelectorContainer}>
          <Text style={styles.categoryTitle}>{selectedCategory}</Text>
          <View style={styles.viewModeControls}>
            {VIEW_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[styles.viewModeButtonText, viewMode === mode && styles.viewModeButtonTextActive]}>
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.contentViewWrapper}>
        {renderContent()}
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
    backgroundColor: '#F8F7F3', 
  },
  viewModeSelectorContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DARK_GREEN,
  },
  viewModeControls: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 4,
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  viewModeButtonActive: {
    backgroundColor: DARK_GREEN,
  },
  viewModeButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  swipeContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 5, 
  },
  gridContainer: {
    paddingBottom: 20,
    paddingHorizontal: CARD_MARGIN,
  },
  listContainer: {
    paddingBottom: 20,
    paddingHorizontal: CARD_MARGIN,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  swipeCardStyle: {
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  listItemContainer: {
    marginBottom: 10,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 18,
    marginTop: 40,
    color: ICON_COLOR_DARK,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  resetButton: {
    backgroundColor: COLORS.DARK_GREEN,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
    elevation: 2,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
export default ProviderDiscoveryScreen;
