import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';

const HousingDiscoveryScreen = () => {
  const navigation = useNavigation();
  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Housing"
        navigation={navigation}
        canGoBack={true}
        onBackPressOverride={handleBackToDashboard}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.text}>Housing Discovery Screen</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
  },
});

export default HousingDiscoveryScreen;
