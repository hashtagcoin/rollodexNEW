import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS } from '../../constants/theme';

const EventDetailScreen = ({ route }) => {
  const { eventId } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader title="Event Details" showBackButton={true} />
      <View style={styles.content}>
        <Text style={styles.text}>Event Detail Screen</Text>
        {eventId ? (
          <Text style={styles.text}>Event ID: {eventId}</Text>
        ) : (
          <Text style={styles.text}>No Event ID provided</Text>
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

export default EventDetailScreen;
