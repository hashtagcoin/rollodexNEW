import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

const AvailabilityLegend = () => {
  return (
    <View style={styles.container}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.legendText}>Available</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#f0f0f0' }]} />
        <Text style={styles.legendText}>Unavailable</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
        <Text style={styles.legendText}>Booked</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  legendText: {
    fontSize: 12,
    color: COLORS.darkGray,
  }
});

export default AvailabilityLegend;
