import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  FlatList, 
  Dimensions
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import { supabase } from '../../lib/supabaseClient'; 
import ServiceCard from '../../components/cards/ServiceCard'; 
import HousingCard from '../../components/cards/HousingCard';
import AppHeader from '../../components/layout/AppHeader';
import CachedImage from '../../components/common/CachedImage';
import SortTray from '../../components/common/SortTray';
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
  const [selectedCategory, setSelectedCategory] = useState(
    initialParams.initialCategory && CATEGORIES.includes(initialParams.initialCategory) 
      ? initialParams.initialCategory 
      : CATEGORIES[0]
  );
  const [viewMode, setViewMode] = useState(VIEW_MODES[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort related state
  const [isSortTrayVisible, setIsSortTrayVisible] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    field: 'created_at',
    direction: 'desc'
  });
  
  // Refs
  const fetchCounter = useRef(0);
  const listViewRef = useRef(null);
  
  // Reset items when category changes
  useEffect(() => {
    setItems([]);
  }, [selectedCategory]);
  
  // Main data fetching effect
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
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
      isMounted = false;
    };
  }, [selectedCategory, searchTerm, sortConfig]);
  
  // Handle sort changes
  const handleSortChange = (newSortConfig) => {
    setSortConfig(newSortConfig);
    setIsSortTrayVisible(false);
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
    
    return null;
  }, [items, viewMode, selectedCategory, loading, handleHousingPress, handleServicePress, handleImageLoaded]);

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
      />

      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search in ${selectedCategory}...`}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
        />
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryScrollView}
        >
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton, 
                selectedCategory === category && styles.selectedCategoryButton
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryButtonText, 
                selectedCategory === category && styles.selectedCategoryButtonText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* View mode toggle and sort controls */}
      <View style={styles.viewModeContainer}>
        {/* View mode buttons in rounded group box */}
        <View style={styles.viewModeButtonGroup}>
          <TouchableOpacity 
            style={[styles.viewModeButton, viewMode === 'Grid' && styles.selectedViewModeButton, styles.leftButton]}
            onPress={() => setViewMode('Grid')}
          >
            <Ionicons name="grid-outline" size={18} color={viewMode === 'Grid' ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.viewModeButton, viewMode === 'List' && styles.selectedViewModeButton, styles.middleButton]}
            onPress={() => setViewMode('List')}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={18} color={viewMode === 'List' ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.viewModeButton, viewMode === 'Swipe' && styles.selectedViewModeButton, styles.rightButton]}
            onPress={() => setViewMode('Swipe')}
          >
            <Ionicons name="swap-horizontal" size={18} color={viewMode === 'Swipe' ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>
        
        {/* Sort button */}
        <TouchableOpacity style={styles.sortButton} onPress={() => setIsSortTrayVisible(true)}>
          <Ionicons name="filter-outline" size={20} color="#000000" />
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentViewWrapper}>
        {renderContent()}
      </View>
      
      {/* Context-aware Sort Tray */}
      <SortTray
        visible={isSortTrayVisible}
        onClose={() => setIsSortTrayVisible(false)}
        contentType={selectedCategory === 'Housing' ? 'housing' : 'services'}
        currentSort={sortConfig}
        onSortChange={handleSortChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#F0F0F0', // Light gray background
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 6,
  },
  selectedCategoryButton: {
    backgroundColor: '#3434eb', // New blue highlight color
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666666', // Medium gray text
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF', // White text for selected category
    fontWeight: '600',
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Position buttons left and sort right
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16, // Add horizontal padding
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  viewModeButtonGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  viewModeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // No background as requested
    flexDirection: 'row',
  },
  leftButton: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  middleButton: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
  },
  rightButton: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  selectedViewModeButton: {
    backgroundColor: '#3434eb', // New blue highlight color
  },
  viewModeButtonText: {
    color: '#000000', // Black text
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  selectedViewModeButtonText: {
    color: '#FFFFFF', // White text
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 6,
  },
  contentViewWrapper: {
    flex: 1,
    backgroundColor: '#F8F7F3', // Match screen background
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666666',
  },
  gridContainer: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    width: '100%',
  },
  listContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8F7F3'
  }
});

export default ProviderDiscoveryScreen;
