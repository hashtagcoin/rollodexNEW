import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TouchableWithoutFeedback, 
  Animated, 
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');
const TRAY_HEIGHT = height * 0.4; // 40% of screen height

/**
 * A reusable sort tray component that adapts its options based on content type
 * @param {boolean} visible - Whether the tray is visible
 * @param {function} onClose - Function to call when tray should close
 * @param {string} contentType - Type of content (e.g., 'services', 'housing', 'posts')
 * @param {object} currentSort - Current sort configuration {field, direction}
 * @param {function} onSortChange - Callback when sort changes
 */
const SortTray = ({ visible, onClose, contentType, currentSort, onSortChange }) => {
  const [animation] = useState(new Animated.Value(0));
  const [sortOptions, setSortOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(currentSort?.field || '');
  const [sortDirection, setSortDirection] = useState(currentSort?.direction || 'desc');
  
  // Animation for tray slide-up
  useEffect(() => {
    Animated.timing(animation, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  
  // Determine sort options based on content type
  useEffect(() => {
    const options = getSortOptionsForType(contentType);
    setSortOptions(options);
    
    // Set default option if none selected
    if (!selectedOption && options.length > 0) {
      setSelectedOption(options[0].value);
    }
  }, [contentType]);
  
  // Get sort options based on content type
  const getSortOptionsForType = (type) => {
    const commonOptions = [
      { label: 'Newest First', value: 'created_at', defaultDirection: 'desc' },
      { label: 'Oldest First', value: 'created_at', defaultDirection: 'asc' },
      { label: 'Highest Rating', value: 'rating', defaultDirection: 'desc' },
      { label: 'A-Z', value: 'title', defaultDirection: 'asc' },
      { label: 'Z-A', value: 'title', defaultDirection: 'desc' },
    ];
    
    // Add type-specific options
    switch (type) {
      case 'housing':
        return [
          ...commonOptions,
          { label: 'Price: Low to High', value: 'price', defaultDirection: 'asc' },
          { label: 'Price: High to Low', value: 'price', defaultDirection: 'desc' },
          { label: 'Most Bedrooms', value: 'bedrooms', defaultDirection: 'desc' },
          { label: 'Available Soonest', value: 'available_date', defaultDirection: 'asc' },
        ];
        
      case 'services':
        return [
          ...commonOptions,
          { label: 'Price: Low to High', value: 'price', defaultDirection: 'asc' },
          { label: 'Price: High to Low', value: 'price', defaultDirection: 'desc' },
          { label: 'Most Reviews', value: 'reviews', defaultDirection: 'desc' },
          { label: 'Nearest Location', value: 'distance', defaultDirection: 'asc' },
        ];
        
      case 'posts':
        return [
          ...commonOptions,
          { label: 'Most Liked', value: 'likes_count', defaultDirection: 'desc' },
          { label: 'Most Comments', value: 'comments_count', defaultDirection: 'desc' },
        ];
        
      case 'friends':
        return [
          { label: 'Recently Active', value: 'last_active', defaultDirection: 'desc' },
          { label: 'A-Z', value: 'name', defaultDirection: 'asc' },
          { label: 'Z-A', value: 'name', defaultDirection: 'desc' },
        ];
        
      default:
        return commonOptions;
    }
  };
  
  // Calculate the translation Y based on animation value
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [TRAY_HEIGHT, 0],
  });
  
  // Handle option selection
  const handleOptionSelect = (option) => {
    // Find the option in the array
    const selectedOptionObj = sortOptions.find(opt => opt.value === option);
    
    // If we're selecting the same option, toggle direction
    if (selectedOption === option) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      onSortChange({ field: option, direction: newDirection });
    } else {
      // If selecting a new option, use its default direction
      const defaultDirection = selectedOptionObj?.defaultDirection || 'desc';
      setSelectedOption(option);
      setSortDirection(defaultDirection);
      onSortChange({ field: option, direction: defaultDirection });
    }
  };
  
  // Get the label for the current sort
  const getCurrentSortLabel = () => {
    const option = sortOptions.find(opt => opt.value === selectedOption);
    return option ? option.label : 'Sort';
  };
  
  // Handle the apply button
  const handleApply = () => {
    onSortChange({ field: selectedOption, direction: sortDirection });
    onClose();
  };
  
  // Only render when visible
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <Animated.View 
              style={[
                styles.trayContainer, 
                { transform: [{ translateY }] }
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Sort By</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              {/* Options */}
              <ScrollView style={styles.optionsContainer}>
                {sortOptions.map((option, index) => {
                  const isSelected = selectedOption === option.value;
                  const directionIcon = option.value === selectedOption
                    ? sortDirection === 'asc' 
                      ? 'arrow-up'
                      : 'arrow-down'
                    : null;
                    
                  return (
                    <TouchableOpacity
                      key={`${option.value}-${index}`}
                      style={[
                        styles.optionButton,
                        isSelected && styles.selectedOption
                      ]}
                      onPress={() => handleOptionSelect(option.value)}
                    >
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.selectedOptionText
                      ]}>
                        {option.label}
                      </Text>
                      
                      {directionIcon && (
                        <Ionicons 
                          name={directionIcon} 
                          size={18} 
                          color="#000" 
                          style={styles.directionIcon} 
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
              {/* Apply button */}
              <View style={styles.footer}>
                <TouchableOpacity 
                  style={styles.applyButton}
                  onPress={handleApply}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  trayContainer: {
    height: TRAY_HEIGHT,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  optionsContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  optionButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOption: {
    // No background color for selected option
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  selectedOptionText: {
    color: '#000',
    fontWeight: '600',
  },
  directionIcon: {
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 16,
  },
  applyButton: {
    backgroundColor: '#000',
    padding: 15,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SortTray;
