import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS } from '../../constants/theme';

const ServiceDetailScreen = ({ route }) => {
  const { serviceId } = route.params || {};

  return (
    <View style={styles.container}>
      <AppHeader title="Service Details" showBackButton={true} />
      <View style={styles.content}>
        <Text style={styles.text}>Service Detail Screen</Text>
        {serviceId ? (
          <Text style={styles.text}>Service ID: {serviceId}</Text>
        ) : (
          <Text style={styles.text}>No Service ID provided</Text>
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

export default ServiceDetailScreen;
