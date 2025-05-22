import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { useUser } from '../../context/UserContext';
import { COLORS } from '../../constants/theme';

const AppHeader = ({
  title,
  userName,
  showWelcomeMessage = false,
  navigation,
  canGoBack = false,
  onBackPressOverride,
  showBackButton = true, 
}) => {
  // Get user profile from context
  const { profile } = useUser();
  
  // For optimistic UI updates, keep local state of avatar
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  // Update local avatar when profile changes
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);
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
        {/* Main navigation tabs use logoicon.png */}
        {['Explore', 'Social', 'Wallet', 'Favourites', 'Profile'].includes(title) ? (
          <Image 
            source={require('../../assets/images/logoicon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
        ) : (
          /* All other screens use back button */
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Feather name="arrow-left" size={26} color="#333" />
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.iconButton} onPress={() => alert('Notification bell pressed!')}>
          <Ionicons name="notifications-outline" size={28} color={'#333'} />
        </TouchableOpacity>
        {navigation && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => navigation.navigate('Profile')} 
          >
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={styles.avatarImage} 
                // Use cache policy for faster loading
                cachePolicy="memory-disk"
              />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color={'#333'} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoIcon: {
    width: 45,
    height: 45,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 35 : 50, 
    paddingBottom: 12,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    minHeight: Platform.OS === 'android' ? 90 : 110,
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
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 5,
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
  iconButton: { 
    padding: 5,
    marginLeft: 15, 
  },
});

export default AppHeader;
