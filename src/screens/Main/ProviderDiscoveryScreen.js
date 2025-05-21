import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Dimensions, Alert, Animated, Image } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; 
import SwiperFlatList from 'react-native-swiper-flatlist';
import { useNavigation } from '@react-navigation/native'; 
import { supabase } from '../../lib/supabaseClient'; 
import ServiceCard from '../../components/cards/ServiceCard'; 
import HousingCard from '../../components/cards/HousingCard';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, SIZES, FONTS, SHADOWS, DARK_GREEN, LIGHT_GREEN, RED, TEXT_INPUT_GRAY, ICON_COLOR_DARK, ICON_COLOR_LIGHT, LIKE_GREEN, DISLIKE_RED } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const APP_HEADER_ESTIMATED_HEIGHT = 50; 
const CONTROLS_CONTAINER_ESTIMATED_HEIGHT = 140; 
const VIEW_MODE_TOGGLE_ESTIMATED_HEIGHT = 60; 
const BOTTOM_NAV_BAR_ESTIMATED_HEIGHT = 60; 
const CARD_MARGIN_VERTICAL = 10;
const ACTION_BUTTON_RESERVED_SPACE = 110; 

const CATEGORIES = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
const VIEW_MODES = ['Grid', 'List', 'Swipe'];

const ACTION_BUTTON_LIKE_GREEN = '#34C759'; 
const ACTION_BUTTON_DISLIKE_RED = '#FF3B30'; 

const ProviderDiscoveryScreen = () => {
  console.log('[ProviderDiscoveryScreen] Rendering');
  const navigation = useNavigation(); 
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [viewMode, setViewMode] = useState(VIEW_MODES[0]); 
  // Initialize items as an empty array to prevent undefined errors
  const [items, setItems] = useState(() => {
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const swipeDeckRef = useRef(null);
  const listViewRef = useRef(null);
  
  // Add a ref for the SwiperFlatList component
  const swiperRef = useRef(null);
  const fetchCounter = useRef(0); // <-- Add a counter for fetch calls

  useEffect(() => {
    fetchCounter.current += 1;
    console.log(`[ProviderDiscoveryScreen] useEffect for fetchData triggered. Category: ${selectedCategory}, SearchTerm: ${searchTerm}, Fetch Count: ${fetchCounter.current}`);
    if (selectedCategory === 'Housing') {
      console.log(`[HOUSING DEBUG] useEffect triggered for Housing. Fetch count: ${fetchCounter.current}`);
    }
    fetchData(); 
  }, [selectedCategory, searchTerm]);

  const fetchData = async () => {
    console.log(`[ProviderDiscoveryScreen] fetchData called. Category: ${selectedCategory}, SearchTerm: ${searchTerm}`);
    setLoading(true);
    setItems([]); 

    try {
      const isHousing = selectedCategory === 'Housing';
      const tableName = isHousing ? 'housing_listings' : 'services';
      
      console.log(`[ProviderDiscoveryScreen] Querying table: ${tableName}`);
      
      let query;
      if (isHousing) {
        console.log('[HOUSING DEBUG] Constructing simplified query for housing_listings');
        query = supabase.from(tableName).select('*').limit(5); // Simplified for debugging
      } else {
        query = supabase.from(tableName).select('*');
        console.log(`[ProviderDiscoveryScreen] Filtering by category (case-insensitive): ${selectedCategory}`);
        query = query.ilike('category', selectedCategory.toLowerCase());
        if (searchTerm) {
          console.log(`[ProviderDiscoveryScreen] Applying search term: ${searchTerm}`);
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        query = query.order('created_at', { ascending: false }).limit(20);
      }

      // Original search logic for housing if the simplified one is too restrictive for testing general search
      // if (isHousing && searchTerm) {
      //   console.log(`[HOUSING DEBUG] Applying search term to housing: ${searchTerm}`);
      //   query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      // }
      // if (isHousing) { // Apply ordering for housing if needed
      //   query = query.order('created_at', { ascending: false });
      // }

      console.log('[ProviderDiscoveryScreen] Executing query...');
      const { data, error, status } = await query;
      
      console.log('[ProviderDiscoveryScreen] Query status:', status);
      console.log('[ProviderDiscoveryScreen] Data received:', data ? `Array of ${data.length} items` : 'No data');
      if (isHousing) {
        console.log('[HOUSING DEBUG] Data for housing:', data);
      }
      
      if (error) {
        console.error('[ProviderDiscoveryScreen] Error fetching data:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        if (isHousing) {
          console.error('[HOUSING DEBUG] Error fetching housing data:', error);
        }
        setItems([]);
      } else {
        console.log('[ProviderDiscoveryScreen] Setting items:', data ? data.length : 0);
        setItems(data || []);
      }
    } catch (error) {
      console.error('[ProviderDiscoveryScreen] Exception in fetchData:', {
        message: error.message,
        stack: error.stack
      });
      if (selectedCategory === 'Housing') {
        console.error('[HOUSING DEBUG] Exception during housing fetch:', error);
      }
      setItems([]);
    } finally {
      console.log(`[ProviderDiscoveryScreen] --- About to set loading to false. Category: ${selectedCategory} ---`);
      setLoading(false);
      console.log(`[ProviderDiscoveryScreen] --- Loading set to false. Category: ${selectedCategory} ---`);
      if (selectedCategory === 'Housing') {
        console.log('[HOUSING DEBUG] Loading definitely set to false.');
      }
    }
  };

  const handleServicePress = useCallback((item) => {
    console.log(`[ProviderDiscoveryScreen] Navigating to ServiceDetailScreen for item ID: ${item.id}`);
    navigation.navigate('ServiceDetail', { item: item });
  }, [navigation]);

  const handleHousingPress = useCallback((item) => {
    console.log(`[ProviderDiscoveryScreen] Navigating to HousingDetailScreen for item ID: ${item.id}`);
    navigation.navigate('HousingDetail', { item: item });
  }, [navigation]);

  const getCardStyle = (item) => {
    const isService = item.service_name !== undefined;
    let cardHeight;

    if (viewMode === 'Swipe') {
      let calculatedHeight = height - VIEW_MODE_TOGGLE_ESTIMATED_HEIGHT - BOTTOM_NAV_BAR_ESTIMATED_HEIGHT - ACTION_BUTTON_RESERVED_SPACE;
      cardHeight = calculatedHeight * 0.94; 
    } else { 
      cardHeight = height - CONTROLS_CONTAINER_ESTIMATED_HEIGHT - BOTTOM_NAV_BAR_ESTIMATED_HEIGHT - (2 * CARD_MARGIN_VERTICAL); 
    }
    return { ...styles.swipeCardBase, height: cardHeight, marginVertical: CARD_MARGIN_VERTICAL, padding: 0 }; 
  };

  const renderContent = () => {
    console.log(`[ProviderDiscoveryScreen] renderContent called. ViewMode: ${viewMode}, Category: ${selectedCategory}, Items: ${items.length}`);
    if (loading) {
      return <ActivityIndicator size="large" color="#3A5E49" style={styles.loadingIndicator} />;
    }
    if (items.length === 0) {
      return <Text style={styles.emptyText}>No {selectedCategory.toLowerCase()} found.</Text>;
    }

    if (viewMode === 'Grid') {
      if (selectedCategory === 'Housing') {
        return (
          <FlatList
            key={'housing-grid'}
            data={items}
            renderItem={({ item }) => (
              <HousingCard 
                item={item} 
                onPress={handleHousingPress}
                displayAs="grid"
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      } else { 
        return (
          <FlatList
            key={'services-grid'}
            data={items}
            renderItem={({ item }) => (
              <ServiceCard 
                item={item} 
                onPress={handleServicePress}
                displayAs="grid"
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      }
    } 
    else if (viewMode === 'List') {
      if (selectedCategory === 'Housing') {
        return (
          <FlatList
            key={'housing-list'}
            data={items}
            renderItem={({ item }) => (
              <HousingCard 
                item={item} 
                onPress={handleHousingPress}
                displayAs="list"
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer} 
            showsVerticalScrollIndicator={false}
          />
        );
      } else { 
        return (
          <FlatList
            key={'services-list'}
            data={items}
            renderItem={({ item }) => (
              <ServiceCard 
                item={item} 
                onPress={handleServicePress}
                displayAs="list"
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer} 
            showsVerticalScrollIndicator={false}
          />
        );
      }
    }
    else if (viewMode === 'Swipe') {
      const swipeItems = Array.isArray(items) ? items : [];
      
      if (swipeItems.length === 0) {
        return (
          <View style={styles.emptySwipeContainer}>
            <Text style={styles.emptyText}>No more items to swipe for {selectedCategory.toLowerCase()}.</Text>
          </View>
        );
      }

      const renderItem = ({ item }) => {
        if (!item) return null;
        
        return (
          <View style={getCardStyle(item)}>
            {selectedCategory === 'Housing' ? (
              <HousingCard item={item} onPress={handleHousingPress} displayAs="swipe" />
            ) : (
              <ServiceCard item={item} onPress={handleServicePress} displayAs="swipe" />
            )}
          </View>
        );
      };

      const handleSwipe = (index) => {
        console.log('Swiped to card:', index);
      };

      const handleLeftAction = (index) => {
        console.log('Disliked:', swipeItems[index]?.title || 'Item');
        swiperRef.current.scrollToIndex({ index: index + 1, animated: true });
      };

      const handleRightAction = (index) => {
        console.log('Liked:', swipeItems[index]?.title || 'Item');
        swiperRef.current.scrollToIndex({ index: index + 1, animated: true });
      };

      return (
        <View style={styles.swiperContainer}>
          <SwiperFlatList
            ref={swiperRef}
            data={swipeItems}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            onMomentumScrollEnd={({ index }) => handleSwipe(index)}
            horizontal
            pagingEnabled
            showPagination={false}
            paginationDefaultColor="rgba(0,0,0,0.2)"
            paginationActiveColor="#3A5E49"
            style={styles.swiper}
            contentContainerStyle={styles.swiperContent}
          />
          
          <View style={styles.swipeActionContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.dislikeButton]}
              onPress={() => handleLeftAction(swiperRef.current?.getCurrentIndex() || 0)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={35} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => handleRightAction(swiperRef.current?.getCurrentIndex() || 0)}
              activeOpacity={0.7}
            >
              <Feather name="heart" size={35} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return <Text>View Mode: {viewMode} - Category: {selectedCategory} - Items: {items.length}</Text>; 
  };

  const handleBackPressProviderDiscovery = () => {
    if (viewMode !== 'Grid') {
      setViewMode('Grid'); 
      if (listViewRef.current && typeof listViewRef.current.scrollToOffset === 'function') {
        listViewRef.current.scrollToOffset({ animated: true, offset: 0 });
      }
    } else {
      // If already in Grid view, navigate to Dashboard
      navigation.navigate('DashboardScreen'); 
    }
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Explore"
        navigation={navigation}
        canGoBack={true} 
        onBackPressOverride={handleBackPressProviderDiscovery} 
      />

      {viewMode !== 'Swipe' && (
        <>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${selectedCategory}...`}
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmitEditing={fetchData} 
              returnKeyType="search"
            />
          </View>

          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollView}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryButton, selectedCategory === category && styles.selectedCategoryButton]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[styles.categoryButtonText, selectedCategory === category && styles.selectedCategoryButtonText]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'Grid' && styles.selectedViewModeButton]}
          onPress={() => setViewMode('Grid')}
        >
          <Ionicons name="grid-outline" size={24} color={viewMode === 'Grid' ? styles.selectedViewModeButtonText.color : styles.viewModeButtonText.color} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'List' && styles.selectedViewModeButton]}
          onPress={() => setViewMode('List')}
        >
          <MaterialCommunityIcons name="format-list-checkbox" size={24} color={viewMode === 'List' ? styles.selectedViewModeButtonText.color : styles.viewModeButtonText.color} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'Swipe' && styles.selectedViewModeButton]}
          onPress={() => setViewMode('Swipe')}
        >
          <MaterialCommunityIcons name="cards-outline" size={24} color={viewMode === 'Swipe' ? styles.selectedViewModeButtonText.color : styles.viewModeButtonText.color} />
        </TouchableOpacity>
      </View>

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
  searchBarContainer: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  categoryContainer: {
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryScrollView: {
    paddingHorizontal: 10,
  },
  categoryButton: {
    backgroundColor: '#E9E9E9',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCategoryButton: {
    backgroundColor: '#3A5E49', 
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start', 
    paddingVertical: 10,
    paddingHorizontal: 15, 
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 15, 
  },
  viewModeButton: {
    padding: 8, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
  },
  selectedViewModeButton: {
    backgroundColor: '#3A5E49',
  },
  viewModeButtonText: { 
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  selectedViewModeButtonText: { 
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  contentViewWrapper: {
    flex: 1,
  },
  loadingIndicator: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  gridContainer: {
    paddingHorizontal: 5, 
    paddingBottom: 20, 
  },
  listContainer: { 
    paddingHorizontal: 0, 
    paddingBottom: 20,
  },
  swiperContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  swiper: {
    flex: 1,
    width: '100%',
  },
  swiperContent: {
    paddingBottom: 150, 
  },
  swipeCardBase: {
    width: Dimensions.get('window').width - 40,
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptySwipeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  swipeActionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'absolute',
    bottom: 10, 
    left: 0,
    right: 0,
    gap: 40, 
  },
  actionButton: {
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 0, 
    opacity: 0.8, 
  },
  dislikeButton: {
    backgroundColor: ACTION_BUTTON_DISLIKE_RED,
  },
  likeButton: {
    backgroundColor: ACTION_BUTTON_LIKE_GREEN,
  },
});

export default ProviderDiscoveryScreen;
