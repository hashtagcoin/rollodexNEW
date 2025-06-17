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
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
import { preloadImages } from '../../utils/imagePreloader';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

// Constants
const CATEGORIES = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
const VIEW_MODES = ['Grid', 'List', 'Swipe'];
const PAGE_SIZE = 20;
const APP_HEADER_HEIGHT = 50; 
const CONTROLS_HEIGHT = 140; 
const VIEW_MODE_TOGGLE_HEIGHT = 60; 
const BOTTOM_NAV_HEIGHT = 60; 
const CARD_MARGIN = 10;

/**
 * Provider Discovery Screen - Main screen for exploring services and housing
 */
const ProviderDiscoveryScreen = ({ route }) => {  
  // Track component mount
  useEffect(() => {
    return () => {
    };
  }, []);

  // Extract route params
  const initialParams = route?.params || {};
  const navigation = useNavigation();
  
  // State variables
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  // Track swiped items to prevent them from reappearing
  const [swipedItemIds, setSwipedItemIds] = useState(new Set());
  const listViewRef = useRef(null);
  // Cache previously fetched items by category to avoid refetching and remounting
  const cacheRef = useRef({});
  const favoritesCacheRef = useRef({}); // cache favorites per category for instant display
  
  // Add fetch in progress flag to prevent duplicate fetches
  const fetchInProgressRef = useRef(false);
  const lastFetchCategoryRef = useRef(null);
  
  // State variables - loading, pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auto-set category to Therapy and scroll to top on navigation
  useFocusEffect(
    useCallback(() => {
      console.log('[ProviderDiscovery] Screen focused - setting category to Therapy and scrolling to top');
      
      // Always set category to "Therapy" when navigating to this screen
      setSelectedCategory('Therapy');
      
      // Scroll to top of the list
      if (listViewRef.current) {
        listViewRef.current.scrollToOffset({ animated: false, offset: 0 });
      }
      
      // Reset pagination
      setPage(0);
      setHasMore(true);
      
    }, [])
  );

  // Handle initial category from params
  useEffect(() => {
    if (initialParams.initialCategory && CATEGORIES.includes(initialParams.initialCategory)) {
      setSelectedCategory(initialParams.initialCategory);
    }
  }, [initialParams.initialCategory]);
  
  const [viewMode, setViewMode] = useState(VIEW_MODES[0]); // Default to 'Grid'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFavorites, setUserFavorites] = useState(new Set());
  // Keep a ref in sync so callbacks always have latest value
  const userFavoritesRef = useRef(new Set());
  useEffect(() => {
    userFavoritesRef.current = userFavorites;
  }, [userFavorites]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Sort related state
  const [sortConfig, setSortConfig] = useState({
    field: 'created_at',
    direction: 'desc'
  });
  
  // Refs
  const isMounted = useRef(true);
  const fetchCounterRef = useRef(0); // Tracks latest fetch to ignore stale responses

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Replace old category-change effect with cached version
  useEffect(() => {
    if (!isMounted.current) return;

    // Show cached data instantly
    if (cacheRef.current[selectedCategory]) {
      setItems(cacheRef.current[selectedCategory]);
      // Instant favorite state from cache if available
      const cachedFavs = favoritesCacheRef.current[selectedCategory];
      setUserFavorites(cachedFavs ? new Set(cachedFavs) : new Set());
      setLoading(false);
    } else {
      // No cache – fetch immediately without clearing current items to avoid flicker
      if (!fetchInProgressRef.current || lastFetchCategoryRef.current !== selectedCategory) {
        fetchData(false, 0, false);
      }
    }

    // Reset swipe state when switching category
    if (viewMode === 'Swipe') {
      setSwipedItemIds(new Set());
    }

    // Scroll to top for list/grid views
    if (listViewRef.current && viewMode !== 'Swipe') {
      listViewRef.current.scrollToOffset({ offset: 0, animated: false });
    }

    // Reset pagination states
    setPage(0);
    setHasMore(true);
  }, [selectedCategory, fetchData, viewMode]);
  
  // useMemo to filter out swiped items for the swipe deck
  const filteredItems = useMemo(() => {
    if (viewMode !== 'Swipe' || !items) return items;
    
    // For SwipeCardDeck: DO NOT filter out swiped items
    // SwipeCardDeck manages its own internal index for swiping
    // Just ensure each item has a unique ID
    return items.filter(item => item && item.id);
  }, [items, viewMode]);

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
  const fetchData = useCallback(async (isRefreshing = false, targetPage = 0, append = false) => {
    // Prevent duplicate fetches
    if (fetchInProgressRef.current && lastFetchCategoryRef.current === selectedCategory && !append) {
      return;
    }
    
    const fetchId = ++fetchCounterRef.current; // Increment fetch counter
    
    if (!isMounted.current) return;
    const categoryAtStart = selectedCategory;  // Snapshot category
    
    fetchInProgressRef.current = true;
    lastFetchCategoryRef.current = selectedCategory;
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ProviderDiscovery] Auth error or no user:', authError);
        if (isMounted.current) {
          setItems([]);
          setUserFavorites(new Set());
          if (!isRefreshing) setLoading(false);
          if (isRefreshing) setRefreshing(false);
        }
        return;
      }
      console.log('[ProviderDiscovery] User ID:', user.id);

      const isHousing = selectedCategory === 'Housing';
      const tableName = isHousing ? 'housing_listings' : 'services';
      const itemTypeForFavorites = isHousing ? 'housing_listing' : 'service_provider';
      
      let query = supabase.from(tableName);
      
      // For housing, select only essential fields first to load cards quickly
      if (isHousing) {
        query = query.select(`
          id, title, property_type, suburb, 
          weekly_rent, bedrooms, bathrooms, media_urls, available,
          description, created_at, updated_at, has_group_match
        `);
      } else {
        query = query.select('*');
      }
      
      query = query.eq('available', true); // Only show available listings
      
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
      
      // Pagination
      const limit = viewMode === 'Swipe' ? 10 : PAGE_SIZE;
      const from = targetPage * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error } = await query;
      
      if (!isMounted.current) return;
      
      // Ignore if a newer fetch started or category has changed
      if (fetchId !== fetchCounterRef.current || categoryAtStart !== selectedCategory) {
        return;
      }
      
      if (error) {
        console.error('[ProviderDiscovery] Fetch error:', error);
        if (isMounted.current) setItems([]);
      } else {
        console.log(`[ProviderDiscovery] Fetched ${data ? data.length : 0} items for ${tableName}`);
        if (isMounted.current) {
          if (append) {
            setItems(prev => [...prev, ...(data || [])]);
          } else {
            setItems(data || []);
          }
          // Update hasMore flag
          setHasMore((data || []).length === limit);
          setPage(targetPage);
        }
        // Cache the fetched data for instant reuse next time
        cacheRef.current[selectedCategory] = append ? [...(cacheRef.current[selectedCategory] || []), ...(data || [])] : (data || []);
        
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
            setUserFavorites(prev => {
              // Merge with previous favorites for incremental pages
              const newSet = append ? new Set([...prev, ...favoritedIds]) : favoritedIds;
              // Update cache for instant reuse next time
              favoritesCacheRef.current[selectedCategory] = Array.from(newSet);
              return newSet;
            });
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
      fetchInProgressRef.current = false;
    }
  }, [selectedCategory, searchTerm, sortConfig, viewMode]);

  // useEffect to call fetchData
  useEffect(() => {
    fetchData(false, 0, false); // Initial fetch
  }, [fetchData]); // fetchData is now a stable useCallback

  const onRefresh = useCallback(() => {
    console.log('[ProviderDiscovery] Refresh triggered');
    setRefreshing(true);
    fetchData(true, 0, false).finally(() => setRefreshing(false));
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
    const isCurrentlyFavorited = userFavoritesRef.current.has(itemId);

    console.log(`[ProviderDiscovery] toggleFavorite OPTIMISTIC: Item ID: ${itemId}, Type: ${itemType}, Currently Favorited: ${isCurrentlyFavorited}`);

    // --- optimistic UI update first ---
    setUserFavorites(prev => {
      const next = new Set(prev);
      isCurrentlyFavorited ? next.delete(itemId) : next.add(itemId);
      // update favorites cache instantly so other screens use latest state
      favoritesCacheRef.current[selectedCategory] = Array.from(next);
      return next;
    });

    // Save snapshot for potential rollback
    const snapshot = new Set(userFavoritesRef.current);

    // Fire & forget API call
    if (isCurrentlyFavorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('item_type', itemType);

      if (error) {
        console.error('[ProviderDiscovery] Error unfavoriting item:', error);
        // rollback UI
        setUserFavorites(snapshot);
        Alert.alert('Error', 'Could not remove from favorites. Please try again.');
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .upsert({
          user_id: user.id,
          item_id: itemId,
          item_type: itemType,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id,item_id,item_type', ignoreDuplicates: true });

      if (error) {
        console.error('[ProviderDiscovery] Error favoriting item:', error);
        // rollback UI
        setUserFavorites(snapshot);
        Alert.alert('Error', 'Could not add to favorites. Please try again.');
      }
    }
  }, []);

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
  
  // Load more handler for pagination
  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    fetchData(false, nextPage, true).finally(() => setLoadingMore(false));
  };

  // Focus effect: Refresh on screen focus only if no cached data
  useFocusEffect(
    useCallback(() => {
      console.log('[ProviderDiscovery] Screen focused');
      
      // Only fetch if we don't have cached data for current category
      if (!cacheRef.current[selectedCategory]) {
        fetchData(false, 0, false);
      }
      
      return () => {
        console.log('[ProviderDiscovery] Screen unfocused');
      };
    }, [selectedCategory])
  );

  // Preload images for each category on app startup
  useEffect(() => {
    const preloadImagesForCategories = async () => {
      console.log('[ProviderDiscovery] Starting image preloading for all categories...');
      
      for (const category of CATEGORIES) {
        try {
          const isHousing = category === 'Housing';
          
          if (isHousing) {
            // Housing data from housing_listings table
            const { data, error } = await supabase
              .from('housing_listings')
              .select('media_urls')
              .limit(4);
              
            if (!error && data?.length > 0) {
              const imageUrls = data
                .map(item => {
                  const rawUrl = item.media_urls?.[0];
                  if (!rawUrl) return null;
                  const validUrl = getValidImageUrl(rawUrl, 'housingimages');
                  return getOptimizedImageUrl(validUrl, 400, 70);
                })
                .filter(Boolean);
                
              if (imageUrls.length > 0) {
                console.log(`[ProviderDiscovery] Preloading ${imageUrls.length} housing images...`);
                await preloadImages(imageUrls, `Housing-${category}`);
              }
            }
          } else {
            // Service data from services table  
            const { data, error } = await supabase
              .from('services')
              .select('media_urls')
              .eq('category', category)
              .limit(4);
              
            if (!error && data?.length > 0) {
              const imageUrls = data
                .map(item => {
                  const rawUrl = item.media_urls?.[0];
                  if (!rawUrl) return null;
                  const validUrl = getValidImageUrl(rawUrl, 'providerimages');
                  return getOptimizedImageUrl(validUrl, 400, 70);
                })
                .filter(Boolean);
                
              if (imageUrls.length > 0) {
                console.log(`[ProviderDiscovery] Preloading ${imageUrls.length} images for ${category}...`);
                await preloadImages(imageUrls, `Service-${category}`);
              }
            }
          }
          
          // Add small delay between categories to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`[ProviderDiscovery] Error preloading images for ${category}:`, error);
        }
      }
      
      console.log('[ProviderDiscovery] Image preloading completed for all categories');
    };

    // Run preloading in background without blocking UI
    setTimeout(() => {
      preloadImagesForCategories();
    }, 1000); // Wait 1 second after component mount to let initial render complete
  }, []);

  // Render main content 
  const renderContent = () => {
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
      const renderItem = ({ item, index }) => {
        const isHousing = selectedCategory === 'Housing';
        // Use HousingCard for 'Housing', ServiceCard for all other categories.
        const CardComponent = isHousing ? HousingCard : ServiceCard;

        return (
          <CardComponent
            item={item}
            onPress={() => handleServicePress(item)}
            displayAs="grid"
            isFavorited={userFavorites.has(item.id)} 
            onToggleFavorite={() => toggleFavorite(item, isHousing ? 'housing_listing' : 'service_provider')}
          />
        );
      };

      return (
        <FlatList
          key="grid-view"
          listKey="grid-view"
          data={items}
          renderItem={renderItem}
          keyExtractor={item => `${selectedCategory === 'Housing' ? 'housing' : 'service'}-${item.id}`}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews={true}
          extraData={[userFavorites]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[DARK_GREEN]}
            />
          }
          ref={listViewRef}
        />
      );
    } 
    
    // List view
    else if (viewMode === 'List') {
      const renderItem = ({ item, index }) => {
        const isHousing = selectedCategory === 'Housing';
        // Use HousingCard for 'Housing', ServiceCard for all other categories.
        const CardComponent = isHousing ? HousingCard : ServiceCard;

        return (
          <View style={styles.listItemContainer}>
            <CardComponent 
              item={item} 
              onPress={() => handleServicePress(item)}
              displayAs="list"
              isFavorited={userFavorites.has(item.id)} 
              onToggleFavorite={() => toggleFavorite(item, isHousing ? 'housing_listing' : 'service_provider')}
            />
          </View>
        );
      };

      return (
        <FlatList
          key="list-view"
          listKey="list-view"
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${selectedCategory === 'Housing' ? 'housing' : 'service'}-${item.id}-${index}`}
          contentContainerStyle={styles.listContainer} 
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          updateCellsBatchingPeriod={100}
          windowSize={5}
          removeClippedSubviews={true}
          getItemLayout={null} 
          legacyImplementation={false}
          onViewableItemsChanged={null} 
          viewabilityConfig={null}
          extraData={[userFavorites]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#000000']}
              tintColor={'#000000'}
            />
          }
          ref={listViewRef}
        />
      );
    }
    
    // Swipe view
    else if (viewMode === 'Swipe') {
      return (
        <SwipeCardDeck
          data={filteredItems}
          renderCard={(item) => {
            const isHousing = selectedCategory === 'Housing';
            
            return (
              <SwipeCard 
                item={item} 
                isHousing={isHousing} 
                onPress={() => handleSwipeCardPress(item)}
                onBackPress={() => setViewMode('Grid')}
              />
            );
          }}
          onSwipeLeft={(item) => handleCardSwipe('left', item)}
          onSwipeRight={(item) => handleCardSwipe('right', item)}
          cardIndex={0}
          backgroundColor="transparent"
          stackSize={3}
          stackSeparation={15}
          animateCardOpacity={true}
          swipeAnimationDuration={350}
          disableBottomSwipe={true}
          disableTopSwipe={true}
          verticalSwipe={false}
          onSwipedAll={handleAllCardsViewed}
          keyExtractor={(item) => `swipe-${item.id}`}
          showSecondCard={true}
          stackAnimationFriction={7}
          stackAnimationTension={40}
          inputOverlayLabelsOpacity={0.8}
          animateOverlayLabelsOpacity={true}
          overlayLabels={{
            left: {
              title: 'PASS',
              style: {
                label: {
                  backgroundColor: '#E74C3C',
                  borderColor: '#E74C3C',
                  color: 'white',
                  borderWidth: 1,
                  fontSize: 24,
                  fontWeight: 'bold',
                  padding: 10,
                  borderRadius: 10,
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  marginTop: 20,
                  marginLeft: -20,
                },
              },
            },
            right: {
              title: 'LIKE',
              style: {
                label: {
                  backgroundColor: '#27AE60',
                  borderColor: '#27AE60',
                  color: 'white',
                  borderWidth: 1,
                  fontSize: 24,
                  fontWeight: 'bold',
                  padding: 10,
                  borderRadius: 10,
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  marginTop: 20,
                  marginLeft: 20,
                },
              },
            },
          }}
        />
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
        <View style={styles.swipeViewHeader}>
          {/* Back Arrow - replaces category title */}
          <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('Grid')}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          
          {/* View Mode Controls - using SearchComponent style */}
          <View style={styles.viewModeButtonGroup}>
            <TouchableOpacity
              style={[
                styles.viewModeIconButton,
                viewMode === 'Grid' && styles.selectedViewModeButton
              ]}
              onPress={() => setViewMode('Grid')}
            >
              <Ionicons name="grid-outline" size={18} color={viewMode === 'Grid' ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.viewModeIconButton,
                viewMode === 'List' && styles.selectedViewModeButton
              ]}
              onPress={() => setViewMode('List')}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={18} color={viewMode === 'List' ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.viewModeIconButton,
                styles.rightButton,
                viewMode === 'Swipe' && styles.selectedViewModeButton
              ]}
              onPress={() => setViewMode('Swipe')}
            >
              <Ionicons name="swap-horizontal" size={18} color={viewMode === 'Swipe' ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
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
  swipeViewHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 10,
  },
  viewModeButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 4,
  },
  viewModeIconButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  selectedViewModeButton: {
    backgroundColor: '#000000',
  },
  rightButton: {
    marginLeft: 5,
  },
  swipeContainer: {
    flex: 1,
    overflow: 'visible', // Important to ensure cards are visible beyond container bounds
    zIndex: 1,           // Ensure cards stack correctly
    height: height - (APP_HEADER_HEIGHT + VIEW_MODE_TOGGLE_HEIGHT + BOTTOM_NAV_HEIGHT),
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 10,
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
