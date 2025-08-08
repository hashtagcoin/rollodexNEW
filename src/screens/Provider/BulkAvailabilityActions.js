import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

// Instagram-style bulk actions component for availability management
const BulkAvailabilityActions = ({ onReplicatePattern, onSetWeekendsOff, onClearAll }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bulk Actions</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onReplicatePattern}
        >
          <Ionicons name="copy-outline" size={16} color="#fff" />
          <Text style={styles.actionText}>Replicate Pattern</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onSetWeekendsOff}
        >
          <Ionicons name="calendar-outline" size={16} color="#fff" />
          <Text style={styles.actionText}>Set Weekends Off</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#e74c3c' }]}
          onPress={onClearAll}
        >
          <Ionicons name="close-circle-outline" size={16} color="#fff" />
          <Text style={styles.actionText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  }
});

export default BulkAvailabilityActions;
