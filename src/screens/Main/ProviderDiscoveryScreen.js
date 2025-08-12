import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  Dimensions,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import { supabase } from '../../lib/supabaseClient'; 
import ServiceCard from '../../components/cards/ServiceCard'; 
import HousingCard from '../../components/cards/HousingCard';
import AppHeader from '../../components/layout/AppHeader';
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
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';
import { preloadImages } from '../../utils/imagePreloader';
import { Image } from 'expo-image';
import useHousingImageCache from '../../hooks/useHousingImageCache';

const { height } = Dimensions.get('window');

// Dynamic column calculation for responsive design - Mobile optimized
const getMobilePadding = (screenWidth) => {
  const isMobile = screenWidth <= 480;
  return isMobile ? 8 : 16; // Reduced padding for mobile
};

const getResponsiveColumns = (viewMode, currentWidth) => {
  if (viewMode !== 'Grid') return 1;
  
  // Always use 2 columns for mobile phones to ensure proper display
  // iPhone sizes: iPhone SE (375), iPhone 12/13/14 (390), iPhone 12/13/14 Pro Max (428)
  // Android typical: 360-450
  const isMobile = currentWidth <= 480; // Covers all typical mobile sizes
  
  if (isMobile) {
    return 2; // Fixed 2 columns for mobile phones
  }
  
  // For tablets/iPads and larger screens, calculate dynamic columns
  // Define constants locally to avoid undefined errors
  const SCREEN_PADDING = 32; // Total left/right screen padding for larger screens
  const CARD_MARGIN = 16; // Space between cards for larger screens
  
  const availableWidth = currentWidth - SCREEN_PADDING;
  const minCardWidth = 200; // Minimum card width for larger screens
  const cardWidthWithMargin = minCardWidth + CARD_MARGIN;
  const calculatedColumns = Math.floor(availableWidth / cardWidthWithMargin);
  
  // Minimum 2 for grid, maximum 4 for readability
  return Math.min(Math.max(calculatedColumns, 2), 4);
};

// Constants
const CATEGORIES = ['All', 'Health', 'Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social', 'Travel', 'Companionship', 'Experiences'];
const PAGE_SIZE = 20;

// Pre-warm the image cache
Image.prefetch([
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop'
]);


const ProviderDiscoveryScreen = ({ route }) => {  
  const initialParams = route?.params || {};
  const navigation = useNavigation();
  
  // Track window dimensions for responsive layout
  const [screenDimensions, setScreenDimensions] = useState(() => {
    const { width } = Dimensions.get('window');
    return { width };
  });
  
  // State management - matching FavouritesScreen pattern
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('Grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: 'created_at', direction: 'desc' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Data cache - persists across category changes
  const dataCache = useRef({});
  const favoritesCache = useRef({});
  const pageCache = useRef({});
  const hasMoreCache = useRef({});
  
  // Current view data
  const [currentData, setCurrentData] = useState([]);
  const [sortedData, setSortedData] = useState([]);
  const [currentFavorites, setCurrentFavorites] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Refs
  const flatListRef = useRef(null);
  const isMounted = useRef(true);
  const fetchController = useRef(null);
  const swiperRef = useRef(null);
  
  // Store previous view state for back navigation from swipe view
  const [previousViewState, setPreviousViewState] = useState({
    viewMode: 'Grid',
    scrollPosition: 0,
    category: 'Services'
  });
  
  // Housing image cache hook
  const { preloadHousingItems, cacheStats } = useHousingImageCache();

  useEffect(() => {
    isMounted.current = true;
    
    // Add listener for dimension changes
    const updateDimensions = ({ window }) => {
      setScreenDimensions({ width: window.width });
    };
    
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => {
      isMounted.current = false;
      if (fetchController.current) {
        fetchController.current.abort();
      }
      // Handle both old and new API
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      } else if (Dimensions.removeEventListener) {
        Dimensions.removeEventListener('change', updateDimensions);
      }
    };
  }, []);

  // Initialize cache for category if not exists
  const initializeCategoryCache = useCallback((category) => {
    if (!dataCache.current[category]) {
      dataCache.current[category] = [];
      favoritesCache.current[category] = new Set();
      pageCache.current[category] = 0;
      hasMoreCache.current[category] = true;
    }
  }, []);

  // Fetch data with caching
  const fetchData = useCallback(async (isRefresh = false, page = 0, append = false) => {
    const category = selectedCategory;
    initializeCategoryCache(category);
    
    // Use cached data if available and not refreshing
    if (!isRefresh && !append && dataCache.current[category].length > 0) {
      setCurrentData(dataCache.current[category]);
      setCurrentFavorites(favoritesCache.current[category]);
      setCurrentPage(pageCache.current[category]);
      setHasMore(hasMoreCache.current[category]);
      setLoading(false);
      return;
    }
    
    // Cancel previous fetch
    if (fetchController.current) {
      fetchController.current.abort();
    }
    fetchController.current = new AbortController();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const isHousing = category === 'Housing';
      const tableName = isHousing ? 'housing_listings' : 'services';
      const itemType = isHousing ? 'housing_listing' : 'service_provider';
      
      let query = supabase.from(tableName);
      
      if (isHousing) {
        query = query.select('id, title, suburb, bedrooms, bathrooms, weekly_rent, media_urls, has_group_match, available');
      } else {
        query = query.select('*');
      }
      
      query = query.eq('available', true);
      
      if (!isHousing && category !== 'All') {
        query = query.ilike('category', `%${category}%`);
      }
      
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);
      
      const { data, error } = await query;
      
      if (!isMounted.current) return;
      
      if (error) throw error;
      
      const items = data || [];
      
      // Preload images efficiently using custom hook
      if (isHousing && items.length > 0) {
        preloadHousingItems(items);
      }
      
      // Update cache
      if (append) {
        dataCache.current[category] = [...dataCache.current[category], ...items];
      } else {
        dataCache.current[category] = items;
      }
      
      pageCache.current[category] = page;
      hasMoreCache.current[category] = items.length === PAGE_SIZE;
      
      // Fetch favorites
      if (items.length > 0) {
        const itemIds = items.map(item => item.id);
        const { data: favs } = await supabase
          .from('favorites')
          .select('item_id')
          .eq('user_id', user.id)
          .eq('item_type', itemType)
          .in('item_id', itemIds);
        
        if (favs) {
          const favSet = new Set(favs.map(f => f.item_id));
          if (append) {
            favs.forEach(f => favoritesCache.current[category].add(f.item_id));
          } else {
            favoritesCache.current[category] = favSet;
          }
        }
      }
      
      // Update current view - batch state updates
      if (isMounted.current) {
        setCurrentData(dataCache.current[category]);
        setCurrentFavorites(favoritesCache.current[category]);
        setCurrentPage(pageCache.current[category]);
        setHasMore(hasMoreCache.current[category]);
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Fetch error:', error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [selectedCategory, searchTerm, preloadHousingItems]);

  // Handle category change
  useEffect(() => {
    initializeCategoryCache(selectedCategory);
    
    // Scroll to top when category changes
    if (flatListRef.current && viewMode !== 'Swipe') {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
    
    // Show cached data immediately
    if (dataCache.current[selectedCategory].length > 0) {
      setCurrentData(dataCache.current[selectedCategory]);
      setCurrentFavorites(favoritesCache.current[selectedCategory]);
      setCurrentPage(pageCache.current[selectedCategory]);
      setHasMore(hasMoreCache.current[selectedCategory]);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [selectedCategory, viewMode]);

  // Handle sort changes - scroll to top when sort configuration changes
  useEffect(() => {
    if (flatListRef.current && viewMode !== 'Swipe') {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [sortConfig]);

  // Optimized toggle favorite
  const toggleFavorite = useCallback(async (item, itemType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isFavorited = currentFavorites.has(item.id);
    
    // Optimistic update
    const newFavorites = new Set(currentFavorites);
    if (isFavorited) {
      newFavorites.delete(item.id);
    } else {
      newFavorites.add(item.id);
    }
    setCurrentFavorites(newFavorites);
    
    // Update favorites cache across ALL categories to maintain consistency
    Object.keys(favoritesCache.current).forEach(category => {
      if (isFavorited) {
        favoritesCache.current[category].delete(item.id);
      } else {
        favoritesCache.current[category].add(item.id);
      }
    });
    
    // API call
    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', item.id)
          .eq('item_type', itemType);
      } else {
        await supabase
          .from('favorites')
          .upsert({
            user_id: user.id,
            item_id: item.id,
            item_type: itemType,
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      // Rollback on error
      setCurrentFavorites(currentFavorites);
      
      // Rollback favorites cache across ALL categories to maintain consistency
      Object.keys(favoritesCache.current).forEach(category => {
        if (isFavorited) {
          favoritesCache.current[category].add(item.id);
        } else {
          favoritesCache.current[category].delete(item.id);
        }
      });
    }
  }, [currentFavorites, selectedCategory]);

  // Navigation handlers
  const handlePress = useCallback((item) => {
    if (selectedCategory === 'Housing') {
      navigation.navigate('HousingDetail', { item });
    } else {
      navigation.navigate('ServiceDetail', { serviceId: item.id });
    }
  }, [navigation, selectedCategory]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true, 0, false);
  }, [fetchData]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    fetchData(false, currentPage + 1, true);
  }, [hasMore, loadingMore, loading, currentPage, fetchData]);
  
  // Handle view mode change with state preservation
  const handleViewModeChange = useCallback((newMode) => {
    if (newMode === 'Swipe' && viewMode !== 'Swipe') {
      // Store current state before switching to swipe
      const scrollPosition = flatListRef.current?._listRef?._scrollMetrics?.offset || 0;
      setPreviousViewState({
        viewMode: viewMode,
        scrollPosition: scrollPosition,
        category: selectedCategory
      });
    }
    setViewMode(newMode);
  }, [viewMode, selectedCategory]);
  
  // Handle back from swipe view
  const handleBackFromSwipe = useCallback(() => {
    setViewMode(previousViewState.viewMode);
    // Restore scroll position after a short delay
    setTimeout(() => {
      if (flatListRef.current && previousViewState.scrollPosition > 0) {
        flatListRef.current.scrollToOffset({ 
          offset: previousViewState.scrollPosition, 
          animated: false 
        });
      }
    }, 100);
  }, [previousViewState]);

  // Sort data function
  const sortData = useCallback((data, config) => {
    if (!data || data.length === 0) return data;
    
    const { field, direction } = config;
    
    return [...data].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];
      
      // Handle different field types
      switch (field) {
        case 'title':
        case 'name':
          aValue = (aValue || '').toLowerCase();
          bValue = (bValue || '').toLowerCase();
          break;
        case 'created_at':
        case 'updated_at':
        case 'available_date':
          aValue = new Date(aValue || 0);
          bValue = new Date(bValue || 0);
          break;
        case 'price':
        case 'rating':
        case 'bedrooms':
        case 'reviews':
        case 'likes_count':
        case 'comments_count':
          aValue = parseFloat(aValue || 0);
          bValue = parseFloat(bValue || 0);
          break;
        case 'distance':
          // Handle distance sorting if available
          aValue = parseFloat(aValue || 999999);
          bValue = parseFloat(bValue || 999999);
          break;
        default:
          // Default string comparison
          aValue = String(aValue || '');
          bValue = String(bValue || '');
      }
      
      // Compare values
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }
      
      // Apply direction
      return direction === 'desc' ? -comparison : comparison;
    });
  }, []);

  // Apply sorting whenever currentData or sortConfig changes
  useEffect(() => {
    const sorted = sortData(currentData, sortConfig);
    setSortedData(sorted);
  }, [currentData, sortConfig, sortData]);

  // Render item - memoized
  const renderItem = useCallback(({ item }) => {
    const isHousing = selectedCategory === 'Housing';
    const CardComponent = isHousing ? HousingCard : ServiceCard;
    
    return (
      <CardComponent
        item={item}
        onPress={handlePress}
        displayAs={viewMode.toLowerCase()}
        isFavorited={currentFavorites.has(item.id)}
        onToggleFavorite={() => toggleFavorite(item, isHousing ? 'housing_listing' : 'service_provider')}
      />
    );
  }, [selectedCategory, viewMode, currentFavorites, handlePress, toggleFavorite]);

  // Key extractor - consistent across renders
  const keyExtractor = useCallback((item) => `${item.id}`, []);

  // Get item layout for better performance
  const getItemLayout = useCallback((data, index) => {
    if (viewMode === 'Grid') {
      // For grid view with dynamic columns, we need to calculate row-based offsets
      const itemHeight = 280; // Updated to match card height
      const itemsPerRow = getResponsiveColumns(viewMode, screenDimensions.width);
      const row = Math.floor(index / itemsPerRow);
      return {
        length: itemHeight,
        offset: itemHeight * row,
        index,
      };
    } else {
      const itemHeight = 110;
      return {
        length: itemHeight,
        offset: itemHeight * index,
        index,
      };
    }
  }, [viewMode, screenDimensions.width]);

  // Get the data to display (sorted data)
  const displayData = sortedData.length > 0 ? sortedData : currentData;

  // Loading state
  if (loading && displayData.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader title="Explore" navigation={navigation} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {viewMode === 'Swipe' ? (
        <AppHeader 
          title="Swipe Mode" 
          navigation={navigation}
          showBackButton={true}
          onBackPressOverride={handleBackFromSwipe}
        />
      ) : (
        <>
          <AppHeader title="Explore" navigation={navigation} />
          
          <SearchComponent
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            showSortOptions={true}
          />
        </>
      )}

      {/* Main content */}
      {viewMode === 'Swipe' ? (
        <SwipeCardDeck
          data={displayData}
          renderCard={(item) => (
            <SwipeCard
              item={item}
              isHousing={selectedCategory === 'Housing'}
              onPress={() => handlePress(item)}
              onLike={() => {
                // Handle favorite button press - swipe right programmatically
                if (swiperRef.current) {
                  swiperRef.current.swipeRight();
                }
              }}
              onDismiss={() => {
                // Handle skip button press - swipe left programmatically
                if (swiperRef.current) {
                  swiperRef.current.swipeLeft();
                }
              }}
            />
          )}
          onSwipeLeft={(item) => {
            // Handle left swipe (pass/dislike)
            console.log('Swiped left on:', item.title);
          }}
          onSwipeRight={(item) => {
            // Handle right swipe (like/favorite)
            toggleFavorite(item, selectedCategory === 'Housing' ? 'housing_listing' : 'service_provider');
            console.log('Swiped right on:', item.title);
          }}
          stackSize={3}
          infinite={false}
          containerStyle={styles.swipeContainer}
          onSwiperRef={(ref) => {
            swiperRef.current = ref;
          }}
          emptyView={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No more items to swipe</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={getResponsiveColumns(viewMode, screenDimensions.width)}
          key={`${viewMode}-${getResponsiveColumns(viewMode, screenDimensions.width)}`} // Change key when columns change
          columnWrapperStyle={getResponsiveColumns(viewMode, screenDimensions.width) > 1 ? styles.gridRowWrapper : null}
          contentContainerStyle={viewMode === 'Grid' ? [
            styles.gridContainer, 
            { paddingHorizontal: getMobilePadding(screenDimensions.width) }
          ] : styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={viewMode === 'Grid' ? 8 : 6}
          maxToRenderPerBatch={viewMode === 'Grid' ? 8 : 6}
          windowSize={21}
          removeClippedSubviews={Platform.OS === 'android'}
          getItemLayout={viewMode !== 'Swipe' ? getItemLayout : undefined}
          updateCellsBatchingPeriod={50}
          legacyImplementation={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No {selectedCategory.toLowerCase()} available
          </Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.footerLoader} />
          ) : null
        }
      />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    paddingTop: 8,
    paddingBottom: 100,
    // paddingHorizontal is now set dynamically based on screen size
  },
  gridRowWrapper: {
    justifyContent: 'space-between', // Better distribution of cards
    paddingHorizontal: 0,
  },
  listContainer: {
    padding: 10,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  footerLoader: {
    marginVertical: 20,
  },
  swipeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default ProviderDiscoveryScreen;