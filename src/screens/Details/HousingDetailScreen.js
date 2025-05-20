import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const HousingDetailScreen = ({ route }) => {
  const { item } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{item.title || 'Housing Details'}</Text>
      {/* More details will go here */}
      <Text>SDA Type: {item.sda_type}</Text>
      <Text>Bedrooms: {item.bedrooms}</Text>
      <Text>Rent: ${item.weekly_rent || 'N/A'} per week</Text>
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

export default HousingDetailScreen;
