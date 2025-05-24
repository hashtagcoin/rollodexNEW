import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Dimensions
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import SortTray from './SortTray';

const { width } = Dimensions.get('window');

/**
 * Reusable Search Component with category filters, view mode toggles, and sorting
 * 
 * @param {Object} props Component props
 * @param {string} props.contentType The type of content being searched ('services', 'housing', 'groups', etc.)
 * @param {Array} props.categories Array of category options to display
 * @param {string} props.selectedCategory Currently selected category
 * @param {function} props.onCategoryChange Callback when category changes
 * @param {string} props.searchTerm Current search term
 * @param {function} props.onSearchChange Callback when search term changes
 * @param {string} props.viewMode Current view mode ('Grid', 'List', 'Swipe')
 * @param {function} props.onViewModeChange Callback when view mode changes
 * @param {Object} props.sortConfig Current sort configuration { field, direction }
 * @param {function} props.onSortChange Callback when sort configuration changes
 * @param {Array} props.viewModes Available view modes (default: ['Grid', 'List', 'Swipe'])
 * @param {boolean} props.showCategories Whether to show the categories section (default: true)
 * @param {boolean} props.showViewModes Whether to show the view modes section (default: true)
 * @param {boolean} props.showSort Whether to show the sort button (default: true)
 */
const SearchComponent = ({
  contentType = 'services',
  categories = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'],
  selectedCategory,
  onCategoryChange,
  searchTerm = '',
  onSearchChange,
  viewMode = 'Grid',
  onViewModeChange,
  sortConfig = { field: 'created_at', direction: 'desc' },
  onSortChange,
  viewModes = ['Grid', 'List', 'Swipe'],
  showCategories = true,
  showViewModes = true,
  showSort = true
}) => {
  // Internal state for sort tray visibility
  const [isSortTrayVisible, setIsSortTrayVisible] = useState(false);
  
  // Handle internal sort change and notify parent
  const handleSortChange = (newSortConfig) => {
    setIsSortTrayVisible(false);
    if (onSortChange) {
      onSortChange(newSortConfig);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search in ${selectedCategory || contentType}...`}
          value={searchTerm}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
      </View>

      {/* Categories Section */}
      {showCategories && categories.length > 0 && (
        <View style={styles.categoryContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoryScrollView}
          >
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton, 
                  selectedCategory === category && styles.selectedCategoryButton
                ]}
                onPress={() => onCategoryChange(category)}
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
      )}

      {/* View Mode Toggle and Sort Controls */}
      {(showViewModes || showSort) && (
        <View style={styles.viewModeContainer}>
          {/* View Mode Buttons */}
          {showViewModes && viewModes.length > 0 && (
            <View style={styles.viewModeButtonGroup}>
              {viewModes.includes('Grid') && (
                <TouchableOpacity 
                  style={[
                    styles.viewModeButton, 
                    viewMode === 'Grid' && styles.selectedViewModeButton,
                    viewModes.indexOf('Grid') === 0 && styles.leftButton,
                    viewModes.length === 1 && styles.singleButton,
                    viewModes.indexOf('Grid') > 0 && viewModes.indexOf('Grid') < viewModes.length - 1 && styles.middleButton,
                    viewModes.indexOf('Grid') === viewModes.length - 1 && styles.rightButton
                  ]}
                  onPress={() => onViewModeChange('Grid')}
                >
                  <Ionicons name="grid-outline" size={18} color={viewMode === 'Grid' ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
              )}
              
              {viewModes.includes('List') && (
                <TouchableOpacity 
                  style={[
                    styles.viewModeButton, 
                    viewMode === 'List' && styles.selectedViewModeButton,
                    viewModes.indexOf('List') === 0 && styles.leftButton,
                    viewModes.length === 1 && styles.singleButton,
                    viewModes.indexOf('List') > 0 && viewModes.indexOf('List') < viewModes.length - 1 && styles.middleButton,
                    viewModes.indexOf('List') === viewModes.length - 1 && styles.rightButton
                  ]}
                  onPress={() => onViewModeChange('List')}
                >
                  <MaterialCommunityIcons name="format-list-bulleted" size={18} color={viewMode === 'List' ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
              )}
              
              {viewModes.includes('Swipe') && (
                <TouchableOpacity 
                  style={[
                    styles.viewModeButton, 
                    viewMode === 'Swipe' && styles.selectedViewModeButton,
                    viewModes.indexOf('Swipe') === 0 && styles.leftButton,
                    viewModes.length === 1 && styles.singleButton,
                    viewModes.indexOf('Swipe') > 0 && viewModes.indexOf('Swipe') < viewModes.length - 1 && styles.middleButton,
                    viewModes.indexOf('Swipe') === viewModes.length - 1 && styles.rightButton
                  ]}
                  onPress={() => onViewModeChange('Swipe')}
                >
                  <Ionicons name="swap-horizontal" size={18} color={viewMode === 'Swipe' ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Sort Button */}
          {showSort && (
            <TouchableOpacity style={styles.sortButton} onPress={() => setIsSortTrayVisible(true)}>
              <Ionicons name="filter-outline" size={20} color="#000000" />
              <Text style={styles.sortButtonText}>Sort</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Sort Tray */}
      {showSort && (
        <SortTray
          visible={isSortTrayVisible}
          onClose={() => setIsSortTrayVisible(false)}
          contentType={contentType}
          currentSort={sortConfig}
          onSortChange={handleSortChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    color: '#333333',
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
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 6,
  },
  selectedCategoryButton: {
    backgroundColor: '#000000', // Changed to black
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  viewModeButtonGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  viewModeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedViewModeButton: {
    backgroundColor: '#000000', // Changed to black
  },
  leftButton: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  rightButton: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  middleButton: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: '#E0E0E0',
    borderRightColor: '#E0E0E0',
  },
  singleButton: {
    borderRadius: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#333333',
    fontWeight: '500',
  },
});

export default SearchComponent;
