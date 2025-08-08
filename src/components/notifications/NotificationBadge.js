import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/theme';

const NotificationBadge = ({ count = 0, style }) => {
  // Don't render if no notifications
  if (count <= 0) return null;

  // Cap the displayed count at 99+ for visual cleanliness
  const displayCount = count > 99 ? '99+' : count.toString();
  
  // Determine size based on count length
  const isSingleDigit = count < 10;
  
  return (
    <View 
      style={[
        styles.badge, 
        isSingleDigit ? styles.singleDigit : styles.multiDigit,
        style
      ]}
    >
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  singleDigit: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 2,
  },
  multiDigit: {
    minWidth: 20, 
    height: 18,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default NotificationBadge;
