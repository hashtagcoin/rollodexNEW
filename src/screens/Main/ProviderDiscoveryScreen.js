import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native'; 
import { supabase } from '../../lib/supabaseClient'; 
import ServiceCard from '../../components/cards/ServiceCard'; 
import HousingCard from '../../components/cards/HousingCard'; 
import SwiperList from 'rn-swiper-list';

const CATEGORIES = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
const VIEW_MODES = ['Grid', 'List', 'Swipe'];

const ProviderDiscoveryScreen = () => {
  const navigation = useNavigation(); 
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [viewMode, setViewMode] = useState(VIEW_MODES[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef(null);

  useEffect(() => {
    fetchData(); 
  }, [selectedCategory, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    setItems([]); 

    const isHousing = selectedCategory === 'Housing';
    const tableName = isHousing ? 'housing_listings' : 'services';
    
    let query = supabase.from(tableName).select('*');
    
    if (!isHousing) {
      query = query.eq('category', selectedCategory);
    }

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query.limit(20); 

    if (error) {
      console.error('Error fetching data:', error.message);
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#3A5E49" style={styles.loadingIndicator} />;
    }
    if (items.length === 0) {
      return <Text style={styles.emptyText}>No {selectedCategory.toLowerCase()} found.</Text>;
    }

    // GRID VIEW
    if (viewMode === 'Grid') {
      if (selectedCategory === 'Housing') {
        return (
          <FlatList
            key={`housing-grid-${searchTerm}`}
            data={items}
            renderItem={({ item }) => (
              <HousingCard 
                item={item} 
                onPress={() => navigation.navigate('HousingDetail', { item: item })}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      } else { // Grid View for other SERVICES
        return (
          <FlatList
            key={`services-grid-${searchTerm}`}
            data={items}
            renderItem={({ item }) => (
              <ServiceCard 
                item={item} 
                displayAs='grid' 
                onPress={() => navigation.navigate('ServiceDetail', { item: item })}
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
    // LIST VIEW
    else if (viewMode === 'List') {
      if (selectedCategory === 'Housing') {
        return (
          <FlatList
            key={`housing-list-${searchTerm}`}
            data={items}
            renderItem={({ item }) => (
              <HousingCard 
                item={item} 
                displayAs='list'
                onPress={() => navigation.navigate('HousingDetail', { item: item })}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer} 
            showsVerticalScrollIndicator={false}
          />
        );
      } else { // List View for other SERVICES
        return (
          <FlatList
            key={`services-list-${searchTerm}`}
            data={items}
            renderItem={({ item }) => (
              <ServiceCard 
                item={item} 
                displayAs='list'
                onPress={() => navigation.navigate('ServiceDetail', { item: item })}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer} 
            showsVerticalScrollIndicator={false}
          />
        );
      }
    }
    // SWIPE VIEW
    else if (viewMode === 'Swipe') {
      if (items.length === 0) {
        return <Text style={styles.emptyText}>No items to swipe for {selectedCategory.toLowerCase()}.</Text>;
      }
      return (
        <View style={styles.swiperContainer}>
          <SwiperList
            ref={swiperRef}
            data={items}
            renderItem={({ item, index }) => (
              selectedCategory === 'Housing' ? (
                <HousingCard item={item} displayAs='swipe' />
              ) : (
                <ServiceCard item={item} displayAs='swipe' />
              )
            )}
            onSwipeRight={(index) => {
              Alert.alert('Liked', items[index]?.title || 'Item');
              // Add actual like logic here
            }}
            onSwipeLeft={(index) => {
              Alert.alert('Disliked', items[index]?.title || 'Item');
              // Add actual dislike logic here
            }}
            onSwipedAll={() => {
              Alert.alert('That\'s all!', 'No more items to swipe.');
            }}
            showDebug={false} // Set to true for debugging swipe zones
          />
        </View>
      );
    }

    // Fallback for unhandled cases (should not happen if viewModes are exhaustive)
    return <Text>View Mode: {viewMode} - Category: {selectedCategory} - Items: {items.length}</Text>; 
  };

  return (
    <View style={styles.screenContainer}>
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

      <View style={styles.viewModeContainer}>
        {VIEW_MODES.map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewModeButton, viewMode === mode && styles.selectedViewModeButton]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.viewModeButtonText, viewMode === mode && styles.selectedViewModeButtonText]}>{mode}</Text>
          </TouchableOpacity>
        ))}
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
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  viewModeButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CDCDCD',
  },
  selectedViewModeButton: {
    backgroundColor: '#3A5E49',
    borderColor: '#3A5E49',
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', 
    paddingVertical: 20, 
  },
});

export default ProviderDiscoveryScreen;
