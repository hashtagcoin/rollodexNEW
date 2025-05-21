import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Dimensions, Alert, Animated, Image, PanResponder } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; 
import SwiperFlatList from 'react-native-swiper-flatlist';
import { useNavigation } from '@react-navigation/native'; 
import { supabase } from '../../lib/supabaseClient'; 
import ServiceCard from '../../components/cards/ServiceCard'; 
import HousingCard from '../../components/cards/HousingCard';
import AppHeader from '../../components/layout/AppHeader';
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
  ICON_COLOR_LIGHT, 
  LIKE_GREEN, 
  DISLIKE_RED 
} from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Constants
const CATEGORIES = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
const VIEW_MODES = ['Grid', 'List', 'Swipe'];
const APP_HEADER_ESTIMATED_HEIGHT = 50; 
const CONTROLS_CONTAINER_ESTIMATED_HEIGHT = 140; 
const VIEW_MODE_TOGGLE_ESTIMATED_HEIGHT = 60; 
const BOTTOM_NAV_BAR_ESTIMATED_HEIGHT = 60; 
const CARD_MARGIN_VERTICAL = 10;
const ACTION_BUTTON_RESERVED_SPACE = 110;

const ProviderDiscoveryScreen = () => {
  console.log('[ProviderDiscoveryScreen] Rendering');
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  // --- NETWORK DEBUGGING ---
  const supabaseFetchCount = useRef(0);
  const [viewMode, setViewMode] = useState(VIEW_MODES[0]);
  const [items, setItems] = useState([]); // Initialize directly
  const [loading, setLoading] = useState(true); // Start true for initial fetch
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const fetchCounter = useRef(0);
  const swiperRef = useRef(null);
  const listViewRef = useRef(null);
  const swipeDeckRef = useRef(null);

  // Main data fetching effect
  useEffect(() => {
    fetchCounter.current += 1;
    console.log(`[ProviderDiscoveryScreen] useEffect for fetchData triggered. Category: ${selectedCategory}, SearchTerm: ${searchTerm}, Fetch Count: ${fetchCounter.current}`);
    if (selectedCategory === 'Housing') {
      console.log(`[HOUSING DEBUG] useEffect triggered for Housing. Fetch count: ${fetchCounter.current}`);
    }

    let isMounted = true; // Flag to check if component is still mounted

    const executeFetch = async () => {
      console.log(`[ProviderDiscoveryScreen] executeFetch called. Category: ${selectedCategory}, SearchTerm: ${searchTerm}`);
      
      // No longer setting items to [] here unconditionally.
      // The FlatList key change will handle clearing for category changes.
      // For searchTerm changes within the same category, new data will replace old.
      setLoading(true); 

      try {
        const isHousing = selectedCategory === 'Housing';
        const tableName = isHousing ? 'housing_listings' : 'services';
        
        console.log(`[ProviderDiscoveryScreen] Querying table: ${tableName}`);
        
        let query;
        if (isHousing) {
          console.log('[HOUSING DEBUG] Constructing simplified query for housing_listings');
          supabaseFetchCount.current++;
          console.log(`[NetworkDebug] Fetching data from Supabase at ${new Date().toISOString()} (fetch count: ${supabaseFetchCount.current})`);
          query = supabase.from(tableName).select('*').limit(5); // Keep your limit for testing
        } else {
          console.log(`[ProviderDiscoveryScreen] Filtering by category (partial match): ${selectedCategory}`);
          supabaseFetchCount.current++;
          console.log(`[NetworkDebug] Fetching data from Supabase at ${new Date().toISOString()} (fetch count: ${supabaseFetchCount.current})`);
          query = supabase.from(tableName).select('*');
          query = query.ilike('category', `%${selectedCategory}%`);
          if (searchTerm) {
            console.log(`[ProviderDiscoveryScreen] Applying search term: ${searchTerm}`);
            query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
          }
          query = query.order('created_at', { ascending: false }).limit(20);
        }

        console.log('[ProviderDiscoveryScreen] Executing query...');
        const { data, error, status } = await query;
        
        if (!isMounted) {
          console.log('[ProviderDiscoveryScreen] Component unmounted or dependencies changed before fetch completed. Aborting state update.');
          return;
        }
        
        console.log('[ProviderDiscoveryScreen] Query status:', status);
        console.log('[ProviderDiscoveryScreen] Data received:', data ? `Array of ${data.length} items` : 'No data');
        console.log('[ProviderDiscoveryScreen] Raw data from Supabase:', data);
        console.log('[ProviderDiscoveryScreen] Category filter used:', selectedCategory);
        
        if (error) {
          console.error('[ProviderDiscoveryScreen] Supabase fetch error:', error);
          setItems([]); // Set to empty on error
        } else {
          console.log('[ProviderDiscoveryScreen] Setting items:', data ? data.length : 0);
          setItems(data || []);
        }
      } catch (error) {
        if (!isMounted) {
            console.log('[ProviderDiscoveryScreen] Component unmounted or dependencies changed during exception. Aborting state update.');
            return;
        }
        console.error('[ProviderDiscoveryScreen] Exception in executeFetch:', error);
        setItems([]); // Set to empty on exception
      } finally {
        if (isMounted) {
          console.log(`[ProviderDiscoveryScreen] --- Setting loading to false. Category: ${selectedCategory} ---`);
          setLoading(false);
        }
      }
    };

    executeFetch();
    
    // Cleanup function for this effect
    return () => {
      isMounted = false;
      console.log(`[ProviderDiscoveryScreen] Cleanup for useEffect. Category: ${selectedCategory}, SearchTerm: ${searchTerm}. isMounted set to false.`);
    };
  }, [selectedCategory, searchTerm]); // Depend directly on category and search term

  // ... (handleServicePress, handleHousingPress, getCardStyle, renderContent, handleBackPressProviderDiscovery remain largely the same)
  // Make sure they don't inadvertently change selectedCategory or searchTerm

  // In your JSX for TextInput:
  // <TextInput
  //   style={styles.searchInput}
  //   placeholder={`Search in ${selectedCategory}...`}
  //   value={searchTerm}
  //   onChangeText={setSearchTerm}
  //   // onSubmitEditing={fetchData} // REMOVE THIS - useEffect will handle it
  //   returnKeyType="search"
  // />

  // Rest of your component...

  const handleServicePress = useCallback((item) => {
    console.log(`[ProviderDiscoveryScreen] Navigating to ServiceDetailScreen for item ID: ${item.id}`);
    navigation.navigate('ServiceDetail', { item: item });
  }, [navigation]); // navigation is a stable dependency from useNavigation

  // --- Card style helper (must be in scope for swipe deck and renderTinderCard) ---
  const getCardStyle = (item) => {
    const isService = item.service_name !== undefined;
    let cardHeight;
    if (viewMode === 'Swipe') {
      let calculatedHeight = height - VIEW_MODE_TOGGLE_ESTIMATED_HEIGHT - BOTTOM_NAV_BAR_ESTIMATED_HEIGHT - ACTION_BUTTON_RESERVED_SPACE;
      cardHeight = calculatedHeight * 0.94; 
    } else { 
      cardHeight = height - CONTROLS_CONTAINER_ESTIMATED_HEIGHT - BOTTOM_NAV_BAR_ESTIMATED_HEIGHT - (2 * CARD_MARGIN_VERTICAL); 
    }
    return { 
      ...styles.swipeCardBase, 
      height: cardHeight, 
      marginVertical: CARD_MARGIN_VERTICAL, 
      padding: 0 
    }; 
  };

  const handleHousingPress = useCallback((item) => {
    console.log(`[ProviderDiscoveryScreen] Navigating to HousingDetailScreen for item ID: ${item.id}`);
    navigation.navigate('HousingDetailScreen', { item });
  }, [navigation]);

  const renderContent = () => {
    // Define currentItemsToDisplay at the start of the function
    const currentItemsToDisplay = items; // Use the items from state
    
    console.log(`[ProviderDiscoveryScreen] renderContent called. ViewMode: ${viewMode}, Category: ${selectedCategory}, Items: ${items.length}`);
    
    // Show loading indicator if we're loading and have no items
    if (loading && items.length === 0) {
      return <ActivityIndicator size="large" color={DARK_GREEN} style={styles.loadingIndicator} />;
    }
    
    // Show empty state if we're not loading but have no items
    if (!loading && items.length === 0) {
      return <Text style={styles.emptyText}>No {selectedCategory.toLowerCase()} found.</Text>;
    }
    
    // If we have items but are still loading (e.g., refreshing), we'll show the existing items
    // with a loading indicator at the top if needed

    if (viewMode === 'Grid') {
      // ... use currentItemsToDisplay ...
       if (selectedCategory === 'Housing') {
        return (
          <FlatList
            key={'housing-grid'}
            data={currentItemsToDisplay} // Use currentItemsToDisplay
            renderItem={({ item }) => (
              <HousingCard 
                item={item} 
                onPress={() => handleHousingPress(item)} // Pass item to handler
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
            data={currentItemsToDisplay} // Use currentItemsToDisplay
            renderItem={({ item }) => (
              <ServiceCard 
                item={item} 
                onPress={() => handleServicePress(item)} // Pass item to handler
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
            data={currentItemsToDisplay} // Use currentItemsToDisplay
            renderItem={({ item }) => (
              <HousingCard 
                item={item} 
                onPress={() => handleHousingPress(item)} // Pass item to handler
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
            data={currentItemsToDisplay} // Use currentItemsToDisplay
            renderItem={({ item }) => (
              <ServiceCard 
                item={item} 
                onPress={() => handleServicePress(item)} // Pass item to handler
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
      // Map housing items so HousingCard always receives the correct fields
      const swipeItems = Array.isArray(currentItemsToDisplay)
        ? currentItemsToDisplay.map(item => {
            if (selectedCategory === 'Housing') {
              return {
                ...item,
                property_name: item.property_name || item.title || item.name,
                rent_amount: item.rent_amount || item.price,
                rent_frequency: item.rent_frequency || 'month',
                address_street: item.address_street || item.location || '',
                address_city: item.address_city || item.city || '',
              };
            }
            return item;
          })
        : [];
      
      if (swipeItems.length === 0) {
        return (
          <View style={styles.emptySwipeContainer}>
            <Text style={styles.emptyText}>No more items to swipe for {selectedCategory.toLowerCase()}.</Text>
          </View>
        );
      }

      // --- Tinder-style swipe deck implementation ---
      // Inline component for swipe deck
      const TinderSwipeDeck = ({ data, renderCard, onSwipeLeft, onSwipeRight }) => {
        const [cardIndex, setCardIndex] = useState(0);
        const position = useRef(new Animated.ValueXY()).current;
        const [swipeFeedback, setSwipeFeedback] = useState(null); // 'like' or 'nope'

        // Track prefetched images
        const prefetchedImages = useRef(new Set());

        // Prefetch all images on initial load
        React.useEffect(() => {
          if (!Array.isArray(data) || data.length === 0) return;
          data.forEach(card => {
            const imageUrl = card.media_urls && card.media_urls.length > 0
              ? card.media_urls[0]
              : (card.image_url || card.photo || card.img);
            if (imageUrl && !prefetchedImages.current.has(imageUrl)) {
              prefetchedImages.current.add(imageUrl);
              Image.prefetch(imageUrl);
              console.log(`[SwipeTiming] Initial prefetch: ${imageUrl}`);
            }
          });
        }, [data]);

        // On every swipe, prefetch the next card's image if not already prefetched
        React.useEffect(() => {
          if (!Array.isArray(data) || data.length === 0) return;
          const nextCard = data[cardIndex + 1];
          if (nextCard) {
            const imageUrl = nextCard.media_urls && nextCard.media_urls.length > 0
              ? nextCard.media_urls[0]
              : (nextCard.image_url || nextCard.photo || nextCard.img);
            if (imageUrl && !prefetchedImages.current.has(imageUrl)) {
              prefetchedImages.current.add(imageUrl);
              Image.prefetch(imageUrl);
              console.log(`[SwipeTiming] Prefetch on swipe: ${imageUrl}`);
            }
          }
        }, [cardIndex, data]);

        // Fix flicker: Reset position after cardIndex changes
        React.useEffect(() => {
          console.log(`[SwipeTiming] cardIndex changed to ${cardIndex} at ${performance.now()}`);
          const resetPositionTime = performance.now();
          position.setValue({ x: 0, y: 0 });
          console.log(`[SwipeTiming] Reset position finished at ${performance.now()}, duration: ${performance.now() - resetPositionTime}`);
        }, [cardIndex]);

        const rotate = position.x.interpolate({
          inputRange: [-200, 0, 200],
          outputRange: ['-15deg', '0deg', '15deg'],
          extrapolate: 'clamp',
        });
        const likeOpacity = position.x.interpolate({
          inputRange: [0, 150],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });
        const nopeOpacity = position.x.interpolate({
          inputRange: [-150, 0],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        });

        const panResponder = React.useRef(
          PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
            onPanResponderMove: Animated.event([
              null,
              { dx: position.x, dy: position.y },
            ], { useNativeDriver: false }),
            onPanResponderRelease: (_, { dx }) => {
              const swipeReleaseTime = performance.now();
              console.log(`[SwipeTiming] onPanResponderRelease at ${swipeReleaseTime}`);
              if (dx > 120) {
                console.log(`[SwipeTiming] Start animate right at ${performance.now()}`);
                const animateRightStartTime = performance.now();
                Animated.timing(position, {
                  toValue: { x: 500, y: 0 },
                  duration: 250,
                  useNativeDriver: false,
                }).start(() => {
                  const animEnd = performance.now();
                  console.log(`[SwipeTiming] Animation RIGHT finished at ${animEnd}, duration: ${animEnd - animateRightStartTime}`);
                  setSwipeFeedback('like');
                  setCardIndex((prev) => {
                    const next = prev + 1;
                    console.log(`[SwipeTiming] setCardIndex to ${next} at ${performance.now()}`);
                    return next;
                  });
                  if (onSwipeRight) onSwipeRight(data[cardIndex]);
                  setTimeout(() => setSwipeFeedback(null), 300);
                });
              } else if (dx < -120) {
                console.log(`[SwipeTiming] Start animate left at ${performance.now()}`);
                const animateLeftStartTime = performance.now();
                Animated.timing(position, {
                  toValue: { x: -500, y: 0 },
                  duration: 250,
                  useNativeDriver: false,
                }).start(() => {
                  const animEnd = performance.now();
                  console.log(`[SwipeTiming] Animation LEFT finished at ${animEnd}, duration: ${animEnd - swipeReleaseTime}`);
                  setSwipeFeedback('nope');
                  setCardIndex((prev) => {
                    const next = prev + 1;
                    console.log(`[SwipeTiming] setCardIndex to ${next} at ${performance.now()}`);
                    return next;
                  });
                  if (onSwipeLeft) onSwipeLeft(data[cardIndex]);
                  setTimeout(() => setSwipeFeedback(null), 300);
                });
              } else {
                Animated.spring(position, {
                  toValue: { x: 0, y: 0 },
                  useNativeDriver: false,
                  friction: 5,
                }).start();
              }
            },
          })
        ).current;

        // Button trigger for like/dislike
        const triggerSwipe = (direction) => {
          Animated.timing(position, {
            toValue: { x: direction === 'right' ? 500 : -500, y: 0 },
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            setSwipeFeedback(direction === 'right' ? 'like' : 'nope');
            position.setValue({ x: 0, y: 0 });
            setCardIndex((prev) => prev + 1);
            if (direction === 'right' && onSwipeRight) onSwipeRight(data[cardIndex]);
            if (direction === 'left' && onSwipeLeft) onSwipeLeft(data[cardIndex]);
            setTimeout(() => setSwipeFeedback(null), 300);
          });
        };

        if (cardIndex >= data.length) {
          return (
            <View style={styles.emptySwipeContainer}>
              <Text style={styles.emptyText}>No more items to swipe for {selectedCategory.toLowerCase()}.</Text>
            </View>
          );
        }

        return (
          <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center', position: 'relative' }}>
            {/* Only render the top card for performance */}
            <Animated.View
              key={data[cardIndex]?.id || cardIndex}
              {...panResponder.panHandlers}
              style={{
                ...getCardStyle(data[cardIndex]),
                zIndex: 2,
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate },
                ],
                position: 'absolute',
                top: 0,
                left: 32, // Move card to the right
                right: 0,
              }}
            >
              {/* Overlay feedback */}
              <Animated.View style={{
                position: 'absolute',
                top: 32,
                left: 24,
                zIndex: 10,
                opacity: nopeOpacity,
                transform: [{ rotate: '-18deg' }],
              }}>
                <View style={{
                  borderWidth: 4,
                  borderColor: DISLIKE_RED,
                  borderRadius: 8,
                  paddingHorizontal: 18,
                  paddingVertical: 6,
                  backgroundColor: 'rgba(255,59,48,0.1)',
                }}>
                  <Text style={{
                    color: DISLIKE_RED,
                    fontWeight: 'bold',
                    fontSize: 32,
                    letterSpacing: 2,
                  }}>NOPE</Text>
                </View>
              </Animated.View>
              <Animated.View style={{
                position: 'absolute',
                top: 32,
                right: 24,
                zIndex: 10,
                opacity: likeOpacity,
                transform: [{ rotate: '18deg' }],
              }}>
                <View style={{
                  borderWidth: 4,
                  borderColor: LIKE_GREEN,
                  borderRadius: 8,
                  paddingHorizontal: 18,
                  paddingVertical: 6,
                  backgroundColor: 'rgba(52,199,89,0.1)',
                }}>
                  <Text style={{
                    color: LIKE_GREEN,
                    fontWeight: 'bold',
                    fontSize: 32,
                    letterSpacing: 2,
                  }}>LIKE</Text>
                </View>
              </Animated.View>
              {/* Card content */}
              {renderCard(data[cardIndex])}
            </Animated.View>
            {/* Floating buttons */}
            <View style={{
              position: 'absolute',
              bottom: 36,
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              zIndex: 20,
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: DISLIKE_RED,
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 14,
                  elevation: 2,
                  shadowColor: DISLIKE_RED,
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                }}
                onPress={() => triggerSwipe('left')}
                activeOpacity={0.85}
              >
                <Feather name="x" size={32} color={'#fff'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: LIKE_GREEN,
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 14,
                  elevation: 2,
                  shadowColor: LIKE_GREEN,
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                }}
                onPress={() => triggerSwipe('right')}
                activeOpacity={0.85}
              >
                <Feather name="heart" size={28} color={'#fff'} />
              </TouchableOpacity>
            </View>
          </View>
        );
      };

      // --- Card layout: Airbnb style, image, heading, icons, etc. ---
      const renderTinderCard = (item) => {
        // Use the same logic as list view for consistent data/image handling
        if (selectedCategory === 'Housing') {
          return (
            <HousingCard 
              item={item} 
              onPress={() => handleHousingPress(item)} 
              displayAs="swipe"
            />
          );
        } else {
          return (
            <ServiceCard 
              item={item} 
              onPress={() => handleServicePress(item)} 
              displayAs="swipe"
            />
          );
        }
      };

      // --- Minimalist, colored floating action buttons ---
      // Update the TinderSwipeDeck floating button section (inside the deck component):
      // (Replace the styles for the buttons with minimalist, colored, circular design)
      // See below for updated style definitions.

      return (
        <View style={styles.swiperContainer}>
          <TinderSwipeDeck
            data={swipeItems}
            renderCard={renderTinderCard}
            onSwipeLeft={(item) => console.log('NOPE:', item.title || item.name)}
            onSwipeRight={(item) => console.log('LIKE:', item.title || item.name)}
          />
        </View>
      );
    }
    return null; // Should not be reached if all view modes covered
  };

  const handleBackPressProviderDiscovery = useCallback(() => {
    if (viewMode !== 'Grid') {
      setViewMode('Grid');
      if (listViewRef.current && typeof listViewRef.current.scrollToOffset === 'function') {
        listViewRef.current.scrollToOffset({ animated: true, offset: 0 });
      }
    } else {
      // If already in Grid view, navigate to Dashboard
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
      />

      {viewMode !== 'Swipe' && (
        <>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${selectedCategory}...`}
              value={searchTerm}
              onChangeText={setSearchTerm}
              // onSubmitEditing removed
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
        {/* ... View mode buttons ... (no change needed here) */}
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

// ... styles ... (no change needed to styles)
const styles = StyleSheet.create({ /* Your existing styles */ 
 screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3', // Lighter background for overall screen
  },
  searchBarContainer: {
    padding: 10,
    backgroundColor: '#FFFFFF', // White background for search bar area
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Light gray border
  },
  searchInput: {
    backgroundColor: '#F0F0F0', // Light gray for input field
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333333', // Darker text color
  },
  categoryContainer: {
    paddingVertical: 10,
    backgroundColor: '#FFFFFF', // White background for categories
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryScrollView: {
    paddingHorizontal: 10,
  },
  categoryButton: {
    backgroundColor: '#E9E9E9', // Lighter gray for unselected buttons
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCategoryButton: {
    backgroundColor: DARK_GREEN, // Use DARK_GREEN from constants
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333333', // Dark gray text
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF', // White text for selected
    fontWeight: 'bold',
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start', 
    paddingVertical: 10,
    paddingHorizontal: 15, 
    backgroundColor: '#FFFFFF', // White background for view mode toggles
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 15, 
  },
  viewModeButton: {
    padding: 8, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    // No background color by default, relies on selection
  },
  selectedViewModeButton: {
    backgroundColor: DARK_GREEN, // Use DARK_GREEN
  },
  viewModeButtonText: { // For text label if you had one
    fontSize: 14,
    color: ICON_COLOR_DARK, // Use ICON_COLOR_DARK
    fontWeight: '500',
  },
  selectedViewModeButtonText: { // For text label if you had one
    color: ICON_COLOR_LIGHT, // Use ICON_COLOR_LIGHT
    fontWeight: 'bold',
  },
  // Icon colors are directly set in the JSX, these text styles are placeholders if you add text
  contentViewWrapper: {
    flex: 1,
    // backgroundColor: '#F8F7F3', // Content area background
  },
  loadingIndicator: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    // marginTop: 50, // Give some space from top if it's the only thing
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666', // Medium gray for empty text
    paddingHorizontal: 20, // Add some padding
  },
  gridContainer: {
    paddingHorizontal: 5, 
    paddingBottom: ACTION_BUTTON_RESERVED_SPACE + 20, // Ensure space for potential FAB or bottom nav
  },
  listContainer: { 
    paddingHorizontal: 0, // List items usually span full width
    paddingBottom: ACTION_BUTTON_RESERVED_SPACE + 20,
  },
  swiperContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Light background for swiper area
    position: 'relative', // For absolute positioning of action buttons
  },
  swiper: {
    flex: 1, // Take up available space for swiping
    width: '100%',
  },
  swiperContent: {
    // alignItems: 'center', // Center cards if they are narrower than swiper
    paddingBottom: ACTION_BUTTON_RESERVED_SPACE, // Space for action buttons below cards
  },
  swipeCardBase: { // Style for the View wrapping the card in swipe mode
    width: width * 0.9, // 90% of screen width
    // height calculated dynamically in getCardStyle
    alignSelf: 'center', // Center the card horizontally
    // marginHorizontal: (width * 0.1) / 2, // This would be redundant with alignSelf and width
    marginVertical: 20, // Vertical margin around the card
    borderRadius: 15,
    overflow: 'hidden', // Ensure child card's corners are clipped
    backgroundColor: '#fff', // Card background
    ...SHADOWS.medium, // Use shadow from constants
    elevation: 5, // Android shadow
  },
  emptySwipeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  swipeActionContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Center buttons
    alignItems: 'center',
    paddingVertical: 15, // Vertical padding
    position: 'absolute',
    bottom: 10, // Position at the bottom
    left: 0,
    right: 0,
    gap: 40, // Space between buttons
  },
  actionButton: {
    width: 70, 
    height: 70, 
    borderRadius: 35, // Circular
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large, // Heavier shadow for action buttons
    elevation: 8,
    // borderWidth: 0, // Default, no border needed
    // opacity: 0.8, // Slightly transparent if desired, but solid looks good too
  },
  dislikeButton: {
    backgroundColor: DISLIKE_RED, // Use constant
  },
  likeButton: {
    backgroundColor: LIKE_GREEN, // Use constant
  },
});


export default ProviderDiscoveryScreen;