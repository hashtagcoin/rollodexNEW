import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS } from '../../constants/theme';

const HousingDetailScreen = ({ route }) => {
  const { item } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader title="Housing Details" showBackButton={true} />
      <View style={styles.content}>
        <Text style={styles.text}>Housing Detail Screen</Text>
        {item && item.id ? (
          <Text style={styles.text}>Housing ID: {item.id}</Text>
        ) : (
          <Text style={styles.text}>No Housing item provided</Text>
        )}
        {item && item.title && (
          <Text style={styles.text}>Title: {item.title}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: {
    fontSize: 18,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
});

export default HousingDetailScreen;
