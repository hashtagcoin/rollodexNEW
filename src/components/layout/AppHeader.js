import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather'; 

const AppHeader = ({
  title,
  userName,
  showWelcomeMessage = false,
  navigation,
  canGoBack = false,
  onBackPressOverride, 
}) => {
  const handleBackPress = () => {
    if (onBackPressOverride) {
      onBackPressOverride();
    } else if (navigation?.canGoBack()) { 
      navigation.goBack();
    } else {
      // Fallback or do nothing if no override and cannot go back
      // console.log('Cannot go back and no override provided.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {canGoBack && navigation ? (
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Feather name="arrow-left" size={26} color="#333" />
          </TouchableOpacity>
        ) : (
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
        )}
      </View>

      <View style={styles.middleSection}>
        {showWelcomeMessage && !!userName ? (
          <Text style={styles.welcomeText}>Welcome, {userName}</Text>
        ) : !!title ? (
          <Text style={styles.headerTitle}>{title}</Text>
        ) : null}
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.notificationButton} onPress={() => alert('Notification bell pressed!')}>
          <Ionicons name="notifications-outline" size={28} color={'#333'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 35 : 50, 
    paddingBottom: 10,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  middleSection: {
    flex: 3, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  logo: {
    width: 100, 
    height: 35, 
  },
  backButton: {
    padding: 5, 
  },
  welcomeText: {
    fontSize: 18, 
    fontWeight: '600',
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  notificationButton: {
    padding: 5, 
  },
});

export default AppHeader;
