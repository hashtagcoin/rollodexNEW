import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS } from '../../constants/theme';

const HousingGroupDetailScreen = ({ route }) => {
  const { groupId } = route.params || {}; // Assuming it's groupId from FavouritesScreen

  return (
    <View style={styles.container}>
      <AppHeader title="Housing Group Details" showBackButton={true} />
      <View style={styles.content}>
        <Text style={styles.text}>Housing Group Detail Screen</Text>
        {groupId ? (
          <Text style={styles.text}>Group ID: {groupId}</Text>
        ) : (
          <Text style={styles.text}>No Group ID provided</Text>
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

export default HousingGroupDetailScreen;
