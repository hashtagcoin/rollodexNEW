import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import SwipeCardDeck from '../../components/common/SwipeCardDeck';
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
  const listViewRef = useRef(null);
  const gridViewRef = useRef(null);
  const swipeViewRef = useRef(null);
  
  // Handle initial category from params
  useEffect(() => {
    if (initialParams.initialCategory && CATEGORIES.includes(initialParams.initialCategory)) {
      setSelectedCategory(initialParams.initialCategory);
    }
  }, [initialParams.initialCategory]);
  
  // Reset scroll position when tab is focused
  useFocusEffect(
    useCallback(() => {
      console.log('[ProviderDiscovery] Focus effect: scrolling to top for all views.');
      
      // Reset scroll for all view modes regardless of which is active
      // For List view
      if (listViewRef.current) {
        console.log('[ProviderDiscovery] Resetting List view scroll');
        listViewRef.current.scrollToOffset({ offset: 0, animated: false });
      }
      
      // For Grid view
      if (gridViewRef.current) {
        console.log('[ProviderDiscovery] Resetting Grid view scroll');
        gridViewRef.current.scrollToOffset({ offset: 0, animated: false });
      }
      
      // Always reset to first view mode
      setViewMode(VIEW_MODES[0]);
      
      // Reset data to initial state
      if (initialParams.initialCategory && CATEGORIES.includes(initialParams.initialCategory)) {
        setSelectedCategory(initialParams.initialCategory);
      } else {
        setSelectedCategory(CATEGORIES[0]);
      }
      
      // Force refresh data on tab focus
      fetchData(true); // Pass true to force refresh
    }, []) // No dependencies to ensure it runs on every focus
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
    if (isMounted.current && viewMode !== 'Swipe') {
      console.log('[ProviderDiscovery] Category changed, resetting items for non-swipe view.');
      setItems([]); 
      if (listViewRef.current) {
        listViewRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [selectedCategory, viewMode]);
  
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
      // Favorite
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, item_id: itemId, item_type: itemType });

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
    const isHousing = selectedCategory === 'Housing'; // Determine if current category is Housing
    const itemTypeForFavorites = isHousing ? 'housing_listing' : 'service_provider';
    
    try {
      console.log(`[ProviderDiscovery] Swiped ${direction} on:`, cardData.title || cardData.name, 'ID:', cardData.id);
      
      if (direction === 'right') { // Liked
        console.log('[ProviderDiscovery] Liked (swiped right):', cardData.title || cardData.name);
        await toggleFavorite(cardData, itemTypeForFavorites);
      } else if (direction === 'up') { // Super liked
        console.log('[ProviderDiscovery] Super liked:', cardData.title || cardData.name);
        // Potentially a different action or also favorite
        await toggleFavorite(cardData, itemTypeForFavorites); // Example: super like also favorites
      } else if (direction === 'left') { // Disliked
        console.log('[ProviderDiscovery] Disliked (swiped left):', cardData.title || cardData.name);
        // If it was favorited, a left swipe could unfavorite it, or do nothing
        // For simplicity, let's say left swipe does not change favorite status here
        // but you could add: if (userFavorites.has(cardData.id)) { await toggleFavorite(cardData, itemTypeForFavorites); }
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
  
  // Main content renderer based on view mode
  const renderContent = useCallback(() => {
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
          ref={gridViewRef}
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
          ref={listViewRef}
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
      const isHousing = selectedCategory === 'Housing';
      
      // Transform data to ensure it has all required properties for SwipeCard
      const transformedItems = items.map(item => ({
        id: item.id,
        title: item.title || item.name || 'Untitled',
        name: item.title || item.name || 'Untitled',
        description: item.description || item.desc || 'No description available',
        category: item.category || selectedCategory,
        location: item.location || 'Location not specified',
        price: item.price || item.cost || item.rent,
        image_url: item.image_url || item.cover_image_url || item.avatar_url || `https://source.unsplash.com/featured/?${isHousing ? 'apartment' : selectedCategory.toLowerCase()}`,
        tags: item.tags || [],
        // Copy all other properties
        ...item
      }));
      
      console.log('Transformed items for SwipeCard:', transformedItems[0]);
      
      return (
        <SwipeCardDeck
          data={transformedItems}
          renderCard={(cardData) => (
            <SwipeCard
              item={cardData}
              isHousing={isHousing}
              onPress={() => handleSwipeCardPress(cardData)} // Navigate to detail on tap
              onImageLoaded={handleImageLoaded}
              isFavorited={userFavorites.has(cardData.id)} // Pass favorite status
              // onToggleFavorite is not directly applicable to SwipeCard like this
              // Favorite action is handled by onSwipe (handleSwipeCard)
            />
          )}
          onSwipe={handleSwipeCard}
          onCardDisappear={handleAllCardsViewed}
          backgroundColor="#F8F7F3"
          cardStyle={styles.swipeCardStyle}
          overlayLabels={{
            left: {
              title: 'NOPE',
              color: '#E74C3C',
              fontSize: 32
            },
            right: {
              title: 'LIKE',
              color: '#27AE60',
              fontSize: 32
            }
          }}
          containerStyle={styles.swipeContainer}
        />
      );
    }
    
    return null;
  }, [items, viewMode, selectedCategory, loading, handleHousingPress, handleServicePress, handleImageLoaded, handleSwipeCard, handleSwipeCardPress, handleAllCardsViewed, userFavorites, toggleFavorite, onRefresh, refreshing]);

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
});

export default ProviderDiscoveryScreen;
