import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const ServiceDetailScreen = ({ route }) => {
  const { item } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{item.title || 'Service Details'}</Text>
      {/* More details will go here */}
      <Text>Category: {item.category}</Text>
      <Text>Description: {item.description || 'No description available.'}</Text>
      {/* Add more fields as needed */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default ServiceDetailScreen;
