import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  Dimensions,
  TouchableOpacity,
  Alert
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
  
  // Handle initial category from params
  useEffect(() => {
    if (initialParams.initialCategory && CATEGORIES.includes(initialParams.initialCategory)) {
      setSelectedCategory(initialParams.initialCategory);
    }
  }, [initialParams.initialCategory]);
  
  // Reset scroll position when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (listViewRef.current) {
        listViewRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }, [])
  );
  const [viewMode, setViewMode] = useState(VIEW_MODES[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort related state
  const [sortConfig, setSortConfig] = useState({
    field: 'created_at',
    direction: 'desc'
  });
  
  // Refs
  const isMounted = useRef(true);
  
  // Reset items and scroll position when category changes
  useEffect(() => {
    if (isMounted.current) {
      setItems([]);
      if (listViewRef.current) {
        listViewRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [selectedCategory]);
  
  // Main data fetching effect
  useEffect(() => {
    let isSubscribed = true;
    
    const fetchData = async () => {
      if (!isMounted.current) return;
      
      try {
        setLoading(true);
        const isHousing = selectedCategory === 'Housing';
        const tableName = isHousing ? 'housing_listings' : 'services';
        const contentType = isHousing ? 'housing' : 'services';
        
        let query = supabase.from(tableName).select('*');
        
        // Apply filters based on category and search term
        if (!isHousing) {
          query = query.ilike('category', `%${selectedCategory}%`);
          if (searchTerm) {
            query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
          }
        } else if (searchTerm) {
          // For housing, only filter by search term if provided
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        
        // Apply sort
        const { field, direction } = sortConfig;
        const isAscending = direction === 'asc';
        
        // Make sure the field exists in the table before sorting
        if (field) {
          query = query.order(field, { ascending: isAscending });
        }
        
        // Limit results
        query = query.limit(isHousing ? 5 : 20);
        
        const { data, error } = await query;
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Fetch error:', error);
          setItems([]);
        } else {
          setItems(data || []);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Exception in fetchData:', error);
        setItems([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      // Using isMounted ref which is properly set up
      // No need to reassign isSubscribed which would cause a read-only error
    };
  }, [selectedCategory, searchTerm, sortConfig]);
  
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
    const isHousing = selectedCategory === 'Housing';
    
    try {
      // Log swipe action - could save to favorites/likes in future
      console.log(`Swiped ${direction} on:`, cardData.title || cardData.name);
      
      // No alerts in swipe view - just log the action
      if (direction === 'right') {
        // Like action - could save to favorites
        console.log('Liked:', cardData.title || cardData.name);
      } else if (direction === 'up') {
        // Super like action
        console.log('Super liked:', cardData.title || cardData.name);
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
          key={`${isHousing ? 'housing' : 'services'}-grid`}
          data={items}
          renderItem={({ item }) => (
            <CardComponent 
              item={item} 
              onPress={handlePress}
              displayAs="grid"
              onImageLoaded={handleImageLoaded}
            />
          )}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
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
            <CardComponent 
              item={item} 
              onPress={handlePress}
              displayAs="list"
              onImageLoaded={handleImageLoaded}
            />
          )}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContainer} 
          showsVerticalScrollIndicator={false}
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
              onPress={handleSwipeCardPress}
              onLike={() => handleSwipeCard(cardData, 'right')}
              onDismiss={() => handleSwipeCard(cardData, 'left')}
            />
          )}
          onSwipeLeft={(cardData) => handleSwipeCard(cardData, 'left')}
          onSwipeRight={(cardData) => handleSwipeCard(cardData, 'right')}
          onSwipeTop={(cardData) => handleSwipeCard(cardData, 'up')}
          onSwipeBottom={(cardData) => handleSwipeCard(cardData, 'down')}
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
  }, [items, viewMode, selectedCategory, loading, handleHousingPress, handleServicePress, handleImageLoaded, handleSwipeCard, handleSwipeCardPress, handleAllCardsViewed]);

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
    backgroundColor: '#F8F7F3', // Lighter background for overall screen
  },
  contentViewWrapper: {
    flex: 1,
    backgroundColor: '#F8F7F3', // Match screen background
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
    paddingTop: 5, // Reduced top padding for swipe view
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
});

export default ProviderDiscoveryScreen;
