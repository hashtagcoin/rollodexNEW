import React from 'react';
import { TouchableOpacity, StyleSheet, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Reusable floating action button component that can be used to add various content types
 * 
 * @param {function} onPress - Function to call when button is pressed
 * @param {string} iconName - Ionicons icon name to display (default: 'add')
 * @param {string} color - Background color of the button (default: '#007AFF')
 * @param {string} iconColor - Color of the icon (default: '#FFFFFF')
 * @param {object} style - Additional styles to apply to the button
 * @param {number} size - Size of the button (default: 56)
 * @param {boolean} absolute - Whether to position the button absolutely (default: true)
 */
const ActionButton = ({ 
  onPress, 
  iconName = 'add', 
  color = '#007AFF', 
  iconColor = '#FFFFFF', 
  style,
  size = 56,
  absolute = true,
  opacity = 1,
}) => {
  // Calculate border radius and icon size based on button size
  const borderRadius = size / 2;
  const iconSize = size * 0.42; // ~24px for a 56px button
  
  return (
    <Animated.View style={{opacity}}>
      <TouchableOpacity 
        style={[
          styles.button, 
          { 
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: borderRadius,
            // Only apply absolute positioning if requested
            ...(absolute ? styles.absolutePosition : {})
          },
          style
        ]} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  absolutePosition: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 999,
  }
});

export default ActionButton;
