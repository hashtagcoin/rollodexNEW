import React, { createContext, useState, useContext, useEffect } from 'react';
import NotificationTray from './NotificationTray';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';

// Mock notification data that matches the actual Supabase table structure
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    user_id: 'current-user-id', // Will be replaced with actual user ID
    type: 'BADGE',
    title: 'Badge Earned!',
    content: 'You earned the "Community Champion" badge',
    body: JSON.stringify({ 
      badgeId: 'badge-123',
      badgeName: 'Community Champion',
      badgeDescription: 'Awarded for active participation in the community',
      badgeIcon: 'https://example.com/badges/community-champion.png',
      badgeCategory: 'Social',
      badgePoints: 100,
      awardedAt: new Date().toISOString()
    }),
    seen: false,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    user_badges: [{
      badge_id: 'badge-123',
      awarded_at: new Date().toISOString(),
      is_claimed: false,
      badges: {
        id: 'badge-123',
        name: 'Community Champion',
        description: 'Awarded for active participation in the community',
        icon_url: 'https://example.com/badges/community-champion.png',
        category: 'Social',
        points: 100
      }
    }]
  },
  {
    id: '2',
    user_id: 'current-user-id',
    type: 'CHAT',
    title: 'New message from Sarah',
    content: 'Hey, are you still interested in the apartment?',
    body: JSON.stringify({ chatId: '123', sender_name: 'Sarah', sender_id: 'user-456' }),
    seen: false,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    user_id: 'current-user-id',
    type: 'GROUP',
    title: 'Roommate Group',
    content: 'Jake posted a new message in your group',
    body: JSON.stringify({ groupId: '456', poster_name: 'Jake', poster_id: 'user-789', group_name: 'Roommate Group' }),
    seen: false,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: '3a', // Corrected duplicate ID
    user_id: 'current-user-id',
    type: 'HOUSING',
    title: 'New housing recommendation',
    content: 'A new housing listing matches your preferences',
    body: JSON.stringify({ housingId: '789', address: '123 Main St', price: '$1200/month', bedrooms: 2 }),
    seen: true,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    user_id: 'current-user-id',
    type: 'EVENT',
    title: 'Event Reminder',
    content: 'Housing fair starts tomorrow at 10AM',
    body: JSON.stringify({ eventId: '101', location: 'Community Center', date: '2025-06-03T10:00:00' }),
    seen: true,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    user_id: 'current-user-id',
    type: 'SERVICE',
    title: 'Service Booking Confirmed',
    content: 'Your cleaning service has been confirmed',
    body: JSON.stringify({ bookingId: '202', service_name: 'Home Cleaning', provider: 'CleanCo', date: '2025-06-10T14:00:00' }),
    seen: true,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '6',
    user_id: 'current-user-id',
    type: 'SYSTEM',
    title: 'Welcome to Rollodex',
    content: 'Complete your profile to get personalized recommendations',
    body: JSON.stringify({ action: 'complete_profile', screen: 'Profile' }),
    seen: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

// Create notification context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { profile } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Get default title based on notification type
  const getDefaultTitle = (type) => {
    switch(type.toUpperCase()) {
      case 'GROUP': return 'Group Invitation';
      case 'HOUSING': return 'Housing Update';
      case 'EVENT': return 'Event Notification';
      case 'SERVICE': return 'Service Update';
      case 'CHAT': return 'New Message';
      case 'BADGE': return 'Badge Earned';
      case 'SYSTEM': return 'System Notification';
      case 'LIKE': return 'New Like';
      case 'COMMENT': return 'New Comment';
      default: return 'Notification';
    }
  };

  // Function to format timestamp relative to current time
  const formatTimestamp = (isoString) => {
    const now = new Date();
    const diffMs = now - new Date(isoString);
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    
    const diffMonths = Math.round(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    setLoading(true);
    
    try {
      let notificationData;
      
      // Try to get data from Supabase first with a join to the badges table
      let query = supabase
        .from('notifications')
        .select(`
          *,
          user_badges!inner(
            badge_id,
            awarded_at,
            is_claimed,
            badges!inner(
              id,
              name,
              description,
              icon_url,
              category,
              points
            )
          )
        `)
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      // If we have a Supabase error or no data, fall back to mock data
      if (error || !data || data.length === 0) {
        console.log('Using mock notification data');
        notificationData = MOCK_NOTIFICATIONS;
      } else {
        notificationData = data;
      }
      
      // Format timestamps and adapt to the component format
      const formattedNotifications = notificationData.map(notification => {
        // Parse the body field which contains the additional data
        let bodyData = {};
        try {
          if (notification.body) {
            if (typeof notification.body === 'string') {
              // Try to parse as JSON, fall back to using as plain text if it's not valid JSON
              try {
                bodyData = JSON.parse(notification.body);
              } catch (e) {
                // If it's not valid JSON, treat it as a plain text message
                bodyData = { message: notification.body };
              }
            } else if (typeof notification.body === 'object') {
              // If body is already an object, use it directly
              bodyData = notification.body;
            }
          }
        } catch (e) {
          console.error('Error processing notification body:', e, 'Body:', notification.body);
          // Fallback to using the raw body as a message
          bodyData = { message: notification.body || 'New notification' };
        }
        
        // Extract IDs based on notification type
        // Some types store IDs directly in the content field
        let notificationData = {};
        
        // Process based on notification type
        switch(notification.type.toUpperCase()) {
          case 'GROUP':
            // Group notifications have the group ID in the content field
            notificationData.groupId = notification.content;
            break;
          case 'HOUSING':
            // Housing notifications might have the listing ID in content
            notificationData.housingId = bodyData.housingId || notification.content;
            break;
          case 'EVENT':
            // Event notifications might have the event ID in content
            notificationData.eventId = bodyData.eventId || notification.content;
            break;
          case 'SERVICE':
            // Service notifications might have booking ID in content
            notificationData.bookingId = bodyData.bookingId || notification.content;
            break;
          case 'CHAT':
            // Chat notifications might have chat ID in content
            notificationData.chatId = bodyData.chatId || notification.content;
            break;
          case 'BADGE':
            // For badge notifications, include the badge details
            if (notification.user_badges && notification.user_badges.length > 0) {
              const badge = notification.user_badges[0].badges;
              // Create a new object with all the badge data
              const badgeData = {
                ...notificationData, // Spread existing data first
                badgeId: badge.id,
                badgeName: badge.name,
                badgeDescription: badge.description,
                badgeIcon: badge.icon_url,
                badgeCategory: badge.category,
                badgePoints: badge.points,
                awardedAt: notification.user_badges[0].awarded_at,
                isClaimed: notification.user_badges[0].is_claimed,
                screen: 'RewardsScreen'
              };
              // Assign the new object back to notificationData
              notificationData = badgeData;
            } else {
              // Fallback to basic data if badge details aren't available
              notificationData.screen = 'RewardsScreen';
            }
            break;
          case 'SYSTEM':
            // System notifications might specify a screen to navigate to
            notificationData.screen = bodyData.screen || bodyData.action || 'Profile';
            break;
          default:
            // Copy any IDs from body data for unknown types
            Object.assign(notificationData, bodyData);
        }
        
        return {
          id: notification.id,
          type: notification.type.toUpperCase(), // Standardize to uppercase
          title: notification.title || getDefaultTitle(notification.type),
          message: notification.content,
          timestamp: formatTimestamp(notification.created_at),
          read: notification.seen,
          data: notificationData,
          // Keep original data for reference
          original: notification
        };
      });
      
      setNotifications(formattedNotifications);
      
      // Count unread notifications
      const unread = formattedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    // Optimistically update UI
    setNotifications(prev => {
      const updated = prev.map(notification => {
        if (notification.id === notificationId) {
          return { 
            ...notification, 
            read: true,
            // Also update the original data if it exists
            original: notification.original ? {
              ...notification.original,
              seen: true
            } : undefined
          };
        }
        return notification;
      });
      
      // Update unread count
      const unread = updated.filter(n => !n.read).length;
      setUnreadCount(unread);
      
      return updated;
    });
    
    // Supabase integration
    try {
      // Use the actual database field 'seen' instead of 'read'
      const { data, error } = await supabase
        .from('notifications')
        .update({ seen: true })
        .eq('id', notificationId)
        .eq('user_id', profile.id);
      
      if (error) throw error;
      console.log(`Marked notification ${notificationId} as read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    // Optimistically update UI
    setNotifications(prev => {
      const updated = prev.map(notification => ({
        ...notification,
        read: true,
        // Also update the original data if it exists
        original: notification.original ? {
          ...notification.original,
          seen: true
        } : undefined
      }));
      
      setUnreadCount(0);
      return updated;
    });
    
    // Supabase integration
    try {
      // Use the actual database field 'seen' instead of 'read'
      const { data, error } = await supabase
        .from('notifications')
        .update({ seen: true })
        .eq('user_id', profile.id);
      
      if (error) throw error;
      console.log('Marked all notifications as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Show notification tray
  const showNotificationTray = () => {
    // Fetch latest notifications when tray is opened
    fetchNotifications();
    setIsVisible(true);
  };
  
  // Hide notification tray
  const hideNotificationTray = () => {
    setIsVisible(false);
  };
  
  // Fetch notifications on initial load and set up refresh interval
  useEffect(() => {
    if (profile?.id) {
      fetchNotifications();
      
      // Set up a refresh interval to check for new notifications every 2 minutes
      const refreshInterval = setInterval(() => {
        fetchNotifications();
      }, 2 * 60 * 1000);
      
      // Clean up interval on unmount
      return () => clearInterval(refreshInterval);
    }
  }, [profile?.id]);
  
  return (
    <NotificationContext.Provider 
      value={{
        showNotificationTray,
        hideNotificationTray,
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications
      }}
    >
      {children}
      <NotificationTray 
        visible={isVisible} 
        onClose={hideNotificationTray}
        notifications={notifications}
        loading={loading}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        onRefresh={fetchNotifications}
      />
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification functionality
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
};
