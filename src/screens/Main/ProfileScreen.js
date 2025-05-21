import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';

const ProfileScreen = () => {
  const navigation = useNavigation();

  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Profile"
        navigation={navigation}
        canGoBack={true} 
        onBackPressOverride={handleBackToDashboard} 
      />
      <View style={styles.contentContainer}>  
        <Text style={styles.text}>Profile Screen Content</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { 
    flex: 1,
    backgroundColor: '#F8F7F3', 
  },
  contentContainer: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
  },
});

export default ProfileScreen;
