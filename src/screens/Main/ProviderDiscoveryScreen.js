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

const { width, height } = Dimensions.get('window');

// Constants
const CATEGORIES = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
const VIEW_MODES = ['Grid', 'List', 'Swipe'];
const PAGE_SIZE = 20;

// Pre-warm the image cache
Image.prefetch([
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop'
]);

// Memoized category tab component
const CategoryTab = memo(({ item, isSelected, onPress }) => (
  <TouchableOpacity
    style={[
      styles.categoryTab,
      isSelected && styles.activeCategoryTab
    ]}
    onPress={() => onPress(item)}
  >
    <Text style={[
      styles.categoryText,
      isSelected && styles.activeCategoryText
    ]}>
      {item}
    </Text>
  </TouchableOpacity>
));

const ProviderDiscoveryScreen = ({ route }) => {  
  const initialParams = route?.params || {};
  const navigation = useNavigation();
  
  // Consolidated state management to reduce re-renders
  const [uiState, setUIState] = useState({
    selectedCategory: CATEGORIES[0],
    viewMode: VIEW_MODES[0],
    searchTerm: '',
    loading: true,
    refreshing: false,
    loadingMore: false
  });
  
  // Destructure for easier access
  const { selectedCategory, viewMode, searchTerm, loading, refreshing, loadingMore } = uiState;
  
  // Helper to update UI state
  const updateUIState = useCallback((updates) => {
    setUIState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Data cache - persists across category changes
  const dataCache = useRef({});
  const favoritesCache = useRef({});
  const pageCache = useRef({});
  const hasMoreCache = useRef({});
  
  // Current view data
  const [currentData, setCurrentData] = useState([]);
  const [currentFavorites, setCurrentFavorites] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Refs
  const flatListRef = useRef(null);
  const isMounted = useRef(true);
  const fetchController = useRef(null);
  
  // Housing image cache hook
  const { preloadHousingItems, cacheStats } = useHousingImageCache();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (fetchController.current) {
        fetchController.current.abort();
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
      updateUIState({ loading: false });
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
        updateUIState({ loading: false });
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
        updateUIState({ 
          loading: false,
          refreshing: false,
          loadingMore: false
        });
      }
    }
  }, [selectedCategory, searchTerm, updateUIState, preloadHousingItems]);

  // Handle category change
  useEffect(() => {
    initializeCategoryCache(selectedCategory);
    
    // Show cached data immediately
    if (dataCache.current[selectedCategory].length > 0) {
      setCurrentData(dataCache.current[selectedCategory]);
      setCurrentFavorites(favoritesCache.current[selectedCategory]);
      setCurrentPage(pageCache.current[selectedCategory]);
      setHasMore(hasMoreCache.current[selectedCategory]);
      updateUIState({ loading: false });
    } else {
      fetchData();
    }
  }, [selectedCategory]);

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
    favoritesCache.current[selectedCategory] = newFavorites;
    
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
      favoritesCache.current[selectedCategory] = currentFavorites;
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
    updateUIState({ refreshing: true });
    fetchData(true, 0, false);
  }, [fetchData, updateUIState]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    updateUIState({ loadingMore: true });
    fetchData(false, currentPage + 1, true);
  }, [hasMore, loadingMore, loading, currentPage, fetchData, updateUIState]);

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
      // For grid view with 2 columns, we need to calculate row-based offsets
      const itemHeight = 220;
      const itemsPerRow = 2;
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
  }, [viewMode]);

  // Loading state
  if (loading && currentData.length === 0) {
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
      <AppHeader title="Explore" navigation={navigation} />
      
      {/* Category tabs */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <CategoryTab
              item={item}
              isSelected={selectedCategory === item}
              onPress={(category) => updateUIState({ selectedCategory: category })}
            />
          )}
          extraData={selectedCategory}
        />
      </View>

      {/* Main content */}
      <FlatList
        ref={flatListRef}
        data={currentData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={viewMode === 'Grid' ? 2 : 1}
        key={viewMode} // Only change key when view mode changes
        contentContainerStyle={viewMode === 'Grid' ? styles.gridContainer : styles.listContainer}
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
  categoryContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeCategoryTab: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  activeCategoryText: {
    color: 'white',
    fontWeight: '600',
  },
  gridContainer: {
    padding: 5,
    paddingBottom: 100,
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
});

export default ProviderDiscoveryScreen;