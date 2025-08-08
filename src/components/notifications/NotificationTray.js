import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';

const { height } = Dimensions.get('window');

// Types of notifications with icons and colors
const NOTIFICATION_TYPES = {
  CHAT: {
    icon: 'chatbubble-ellipses',
    iconType: 'Ionicons',
    gradient: ['#4F7FFF', '#1A56FF']
  },
  GROUP: {
    icon: 'people',
    iconType: 'Ionicons',
    gradient: ['#FF6B6B', '#FF3E3E']
  },
  HOUSING: {
    icon: 'home',
    iconType: 'Ionicons',
    gradient: ['#38B6FF', '#0090E9']
  },
  EVENT: {
    icon: 'calendar',
    iconType: 'Ionicons',
    gradient: ['#9C6ADE', '#7839C5']
  },
  SERVICE: {
    icon: 'briefcase',
    iconType: 'Ionicons',
    gradient: ['#23C16B', '#149E4D']
  },
  SYSTEM: {
    icon: 'information-circle',
    iconType: 'Ionicons',
    gradient: ['#FF9500', '#FF7A00']
  },
  BADGE: {
    icon: 'trophy',
    iconType: 'Ionicons',
    gradient: ['#FFD700', '#FFA500']
  },
  LIKE: {
    icon: 'heart',
    iconType: 'Ionicons',
    gradient: ['#FF4081', '#F50057']
  },
  COMMENT: {
    icon: 'chatbubble',
    iconType: 'Ionicons',
    gradient: ['#43A047', '#2E7D32']
  }
};

// Types of notifications with icons and colors (moved from below)

// Helper function to render notification icons based on type
const renderNotificationIcon = (type) => {
  const notificationType = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.SYSTEM;
  const IconComponent = 
    notificationType.iconType === 'Ionicons' ? Ionicons :
    notificationType.iconType === 'MaterialCommunityIcons' ? MaterialCommunityIcons :
    FontAwesome5;
  
  return (
    <View style={styles.iconContainer}>
      <LinearGradient 
        colors={notificationType.gradient} 
        style={styles.iconGradient}
      >
        <IconComponent 
          name={notificationType.icon} 
          size={20} 
          color="#FFF" 
        />
      </LinearGradient>
    </View>
  );
};

const NotificationTray = ({ visible, onClose, notifications = [], loading = false, markAllAsRead, markAsRead, onRefresh }) => {
  const navigation = useNavigation();
  const translateY = useRef(new Animated.Value(height)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Handle image loading errors to prevent TurboModule crashes
  const handleImageError = (error, uri, imageType) => {
    if (__DEV__) {
      console.warn('NotificationTray: Image failed to load', {
        imageType,
        uri: uri?.substring(0, 50) + '...',
        error: error?.nativeEvent || error,
        platform: Platform.OS
      });
    }
  };
  
  // Function to handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // Call the provider's fetchNotifications if available
    if (onRefresh) {
      await onRefresh();
    } else {
      // Fallback delay if onRefresh not provided
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setRefreshing(false);
  };
  
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
    } else {
      Animated.spring(translateY, {
        toValue: height,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
    }
  }, [visible]);

  const handleNotificationPress = (notification) => {
    // Mark notification as read
    if (!notification.read && markAsRead) {
      markAsRead(notification.id);
    }
    
    onClose(); // Close the tray
    
    // Handle navigation based on notification type
    setTimeout(() => {
      switch (notification.type) {
        case 'CHAT':
          if (notification.data.chatId) {
            // Navigate to the chat screen with the specific chat/user
            navigation.navigate('ChatScreen', { userId: notification.data.chatId });
          } else {
            // Fallback to chats list
            navigation.navigate('ChatsScreen');
          }
          break;
        case 'GROUP':
          if (notification.data.groupId) {
            // Navigate to the specific group
            navigation.navigate('GroupDetailScreen', { groupId: notification.data.groupId });
          } else {
            // Fallback to groups list
            navigation.navigate('GroupsScreen');
          }
          break;
        case 'HOUSING':
          if (notification.data.housingId) {
            // Navigate to specific housing listing
            navigation.navigate('HousingDetailScreen', { listingId: notification.data.housingId });
          } else {
            // Fallback to housing list
            navigation.navigate('HousingScreen');
          }
          break;
        case 'EVENT':
          if (notification.data.eventId) {
            // Navigate to specific event
            navigation.navigate('EventDetailScreen', { eventId: notification.data.eventId });
          } else {
            // Fallback to events list
            navigation.navigate('EventsScreen');
          }
          break;
        case 'SERVICE':
          if (notification.data.bookingId) {
            // Navigate to specific booking
            navigation.navigate('BookingDetailScreen', { bookingId: notification.data.bookingId });
          } else {
            // Fallback to bookings list
            navigation.navigate('BookingsScreen');
          }
          break;
        case 'BADGE':
          // Navigate to rewards screen
          navigation.navigate('RewardsScreen');
          break;
        case 'LIKE':
        case 'COMMENT':
          // For likes and comments, navigate to the specific post if available
          if (notification.data.postId) {
            navigation.navigate('PostDetailScreen', { postId: notification.data.postId });
          } else if (notification.data.groupId) {
            navigation.navigate('GroupDetailScreen', { groupId: notification.data.groupId });
          }
          break;
        case 'SYSTEM':
          if (notification.data.screen) {
            navigation.navigate(notification.data.screen);
          }
          break;
        default:
          // Default fallback for unknown notification types
          console.log('Unknown notification type:', notification.type);
          break;
      }
    }, 300); // Small delay to allow animation to complete
  };
  
  const handleMarkAllAsRead = () => {
    if (markAllAsRead) {
      markAllAsRead();
    }
    onClose();
  };

  const formatBadgeNotification = (notification) => {
    // If we have badge data in the notification, use that
    if (notification.data?.badgeId) {
      const { badgeName, badgeDescription, badgeIcon, badgePoints, awardedAt } = notification.data;
      return (
        <View style={styles.badgeContainer}>
          <View style={styles.badgeHeader}>
            <LinearGradient 
              colors={['#FFD700', '#FFA500']} 
              style={styles.badgeIconContainer}
            >
              {badgeIcon && typeof badgeIcon === 'string' && badgeIcon.startsWith('http') ? (
                <Image 
                  source={{ uri: badgeIcon }} 
                  style={styles.badgeImage}
                  onError={(error) => handleImageError(error, badgeIcon, 'badge')}
                  onLoadStart={() => {
                    if (__DEV__) {
                      console.log('NotificationTray: Badge image loading started');
                    }
                  }}
                  onPartialLoad={() => {
                    if (__DEV__) {
                      console.log('NotificationTray: Badge image partial load');
                    }
                  }}
                  defaultSource={require('../../../assets/placeholder-image.png')}
                  loadingIndicatorSource={require('../../../assets/placeholder-image.png')}
                  fadeDuration={0}
                  progressiveRenderingEnabled={true}
                />
              ) : (
                <Ionicons name="trophy" size={24} color="#FFF" />
              )}
            </LinearGradient>
            <View style={styles.badgeHeaderText}>
              <Text style={styles.badgeTitle}>🎉 Badge Earned! 🎉</Text>
              <Text style={styles.badgeName}>{badgeName || 'New Badge'}</Text>
            </View>
          </View>
          {badgeDescription && (
            <Text style={styles.badgeDescription}>{badgeDescription}</Text>
          )}
          <View style={styles.badgeFooter}>
            {badgePoints > 0 && (
              <View style={styles.pointsContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.pointsText}>{badgePoints} points</Text>
              </View>
            )}
            {awardedAt && (
              <Text style={styles.awardedText}>
                Awarded on {new Date(awardedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      );
    }
    
    // Fallback for older notification format
    try {
      if (typeof notification.message === 'string') {
        // Try to parse if it's a stringified JSON
        try {
          const parsed = JSON.parse(message);
          if (parsed && typeof parsed === 'object') {
            return (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeTitle}>🎉 New Badge Earned! 🎉</Text>
                <View style={styles.badgeContent}>
                  <Text style={styles.badgeName}>{parsed.name || 'New Achievement'}</Text>
                  {parsed.description && (
                    <Text style={styles.badgeDescription}>{parsed.description}</Text>
                  )}
                  {parsed.level && (
                    <View style={styles.badgeLevel}>
                      <Text style={styles.badgeLevelText}>Level {parsed.level}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }
        } catch (e) {
          // If parsing fails, return the message as is
          return message;
        }
      } else if (message && typeof message === 'object') {
        // If message is already an object
        return (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeTitle}>🎉 New Badge Earned! 🎉</Text>
            <View style={styles.badgeContent}>
              <Text style={styles.badgeName}>{message.name || 'New Achievement'}</Text>
              {message.description && (
                <Text style={styles.badgeDescription}>{message.description}</Text>
              )}
              {message.level && (
                <View style={styles.badgeLevel}>
                  <Text style={styles.badgeLevelText}>Level {message.level}</Text>
                </View>
              )}
            </View>
          </View>
        );
      }
      return message;
    } catch (error) {
      console.error('Error formatting badge notification:', error);
      return message;
    }
  };

  const renderNotificationIcon = (type) => {
    // Standardize type to uppercase and make sure we have a valid type
    const standardizedType = type?.toUpperCase() || 'SYSTEM';
    const notificationType = NOTIFICATION_TYPES[standardizedType] || NOTIFICATION_TYPES.SYSTEM;
    
    if (!notificationType) return null;
    
    return (
      <LinearGradient
        colors={notificationType.gradient}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {notificationType.iconType === 'Ionicons' && (
          <Ionicons name={notificationType.icon} size={18} color="#FFFFFF" />
        )}
        {notificationType.iconType === 'MaterialCommunityIcons' && (
          <MaterialCommunityIcons name={notificationType.icon} size={18} color="#FFFFFF" />
        )}
        {notificationType.iconType === 'FontAwesome5' && (
          <FontAwesome5 name={notificationType.icon} size={16} color="#FFFFFF" />
        )}
      </LinearGradient>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.handle} />
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#222" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={50} color="#CCCCCC" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.notificationList}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {notifications.map((notification, index) => {
            const notificationId = notification && notification.id !== undefined && notification.id !== null 
              ? notification.id.toString() 
              : null;

            const key = notificationId !== null 
              ? notificationId 
              : `notification-fallback-${index}`;

            if (notificationId === null) {
              console.warn(
                `[NotificationTray] Notification ID is undefined or null. Using fallback key: ${key}. Notification object:`, 
                JSON.stringify(notification)
              );
            }

            return (
            <TouchableOpacity
              key={key}
              style={[
                styles.notificationItem,
                !notification.read && styles.unreadNotification,
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              {renderNotificationIcon(notification.type)}
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle} numberOfLines={1}>
                    {notification.title}
                  </Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
                {notification.type === 'BADGE' ? (
                  formatBadgeNotification(notification)
                ) : (
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                )}
                <Text style={styles.notificationTime}>{notification.timestamp}</Text>
              </View>
              {!notification.read && <View style={styles.unreadIndicator} />}
            </TouchableOpacity>
          );})}
        </ScrollView>
      )}

      {notifications.length > 0 && (
        <TouchableOpacity style={styles.markAllReadButton} onPress={handleMarkAllAsRead}>
          <Text style={styles.markAllReadText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    position: 'relative',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  notificationList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: height * 0.6,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  // Badge notification styles
  badgeContainer: {
    width: '100%',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FFE6B2',
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  badgeHeaderText: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF9500',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  badgeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FFE6B2',
    paddingTop: 10,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E67E22',
    marginLeft: 4,
  },
  awardedText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadNotification: {
    backgroundColor: 'rgba(58, 118, 240, 0.05)',
  },
  readNotification: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  badgeContainer: {
    marginTop: 6,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8C00',
    marginBottom: 6,
    textAlign: 'center',
  },
  badgeContent: {
    paddingLeft: 4,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  badgeLevel: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  badgeLevelText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 'auto',
    marginRight: 5,
    position: 'absolute',
    right: 10,
    top: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  markAllReadButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  markAllReadText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default NotificationTray;
