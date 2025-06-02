import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { useUser } from '../../context/UserContext';
import { useNotifications } from '../notifications';
import { NotificationBadge } from '../notifications';
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
  
  // Get screen width for calculating title length
  const screenWidth = Dimensions.get('window').width;
  
  // Format title into two lines if needed
  const formattedTitle = useMemo(() => {
    if (!title) {
      return { singleLine: null, firstLine: null, secondLine: null };
    }
    
    // Check if the title contains a newline character - explicit line break
    if (typeof title === 'string' && title.includes('\n')) {
      const [firstLine, secondLine] = title.split('\n');
      return { singleLine: null, firstLine, secondLine };
    }
    
    // For titles without newlines but longer than threshold
    if (typeof title === 'string' && title.length > 16) {
      // For longer titles, split into two balanced lines
      const words = title.split(' ');
      let firstLine = '';
      let secondLine = '';
      const targetLength = title.length / 2;
      let currentLength = 0;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (currentLength + word.length <= targetLength) {
          firstLine += (firstLine ? ' ' : '') + word;
          currentLength += word.length + (firstLine ? 1 : 0);
        } else {
          secondLine += (secondLine ? ' ' : '') + word;
        }
      }
      
      // If the balance is too uneven, adjust
      if (Math.abs(firstLine.length - secondLine.length) > 5 && words.length > 3) {
        const lastWordOfFirstLine = firstLine.split(' ').pop();
        const firstWordOfSecondLine = secondLine.split(' ')[0];
        
        // Try moving a word from first line to second
        if (firstLine.length > secondLine.length) {
          firstLine = firstLine.substring(0, firstLine.length - lastWordOfFirstLine.length - 1);
          secondLine = lastWordOfFirstLine + ' ' + secondLine;
        } 
        // Try moving a word from second line to first
        else if (secondLine.length > firstLine.length) {
          firstLine = firstLine + ' ' + firstWordOfSecondLine;
          secondLine = secondLine.substring(firstWordOfSecondLine.length + 1);
        }
      }
      
      return { singleLine: null, firstLine, secondLine };
    }
    
    // Default for short titles
    return { singleLine: title, firstLine: null, secondLine: null };
  }, [title]);
  
  // Update local avatar when profile changes
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);
  // Get notification tray functions and unread count
  const { showNotificationTray, unreadCount } = useNotifications();

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
          formattedTitle.singleLine ? (
            <Text style={styles.headerTitle}>{formattedTitle.singleLine}</Text>
          ) : (
            <View style={styles.twoLineTitle}>
              <Text style={styles.headerTitleLine}>{formattedTitle.firstLine}</Text>
              <Text style={styles.headerTitleLine}>{formattedTitle.secondLine}</Text>
            </View>
          )
        ) : null}
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconButton} onPress={showNotificationTray}>
          <Ionicons name="notifications-outline" size={28} color={'#333'} />
          <NotificationBadge count={unreadCount} style={styles.notificationBadge} />
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
    textAlign: 'center',
  },
  twoLineTitle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleLine: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
  iconButton: { 
    padding: 5,
    marginLeft: 15, 
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
});

export default AppHeader;
