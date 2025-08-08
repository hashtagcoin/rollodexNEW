import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../context/UserContext';
import { COLORS } from '../../constants/theme';

/**
 * UserAvatar - universal avatar component for user profile navigation
 * @param {string} userId - user id for navigation
 * @param {string} avatarUrl - image url for the avatar
 * @param {number} size - avatar size in px (default 48)
 * @param {object} style - additional style
 * @param {boolean} disableNav - disables navigation on press (optional)
 */
const UserAvatar = ({ userId, avatarUrl, size = 48, style, disableNav = false }) => {
  const navigation = useNavigation();
  const { user: loggedInUser } = useUser();

  const handlePress = () => {
    if (disableNav) return;
    if (!userId) return;
    if (loggedInUser && userId === loggedInUser.id) {
      navigation.navigate('ProfileScreen');
    } else {
      navigation.navigate('UserProfileScreen', { userId });
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}
      accessibilityRole="imagebutton"
      accessibilityLabel="User avatar"
    >
      <Image
        source={avatarUrl ? { uri: avatarUrl } : require('../../assets/images/default-avatar.png')}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.lightGray,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: COLORS.lightGray,
  },
});

export default UserAvatar;
