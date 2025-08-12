import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';

const ShareTrayModal = ({ visible, onClose, itemToShare, highlightSharedUsers = false }) => {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sharedWithIds, setSharedWithIds] = useState([]);
  const [flashUser, setFlashUser] = useState(null);

  useEffect(() => {
    if (visible && !itemToShare) {
      console.warn('ShareTrayModal opened without itemToShare');
    }
    if (visible) {
      fetchUsers();
      if (highlightSharedUsers && itemToShare) {
        fetchSharedUsers();
      }
    } else {
      // Reset state when modal is closed
      setSearchText('');
      setUsers([]);
      setSelectedUsers([]);
    }
  }, [visible, itemToShare]);
  
  // Fetch users who have already been shared with
  const fetchSharedUsers = async () => {
    if (!itemToShare) return;
    
    try {
      // Use 'group' as the type for housing_group to match the notification type we're using
      const notificationType = itemToShare.item_type === 'housing_group' ? 'group' : itemToShare.item_type;
      
      const { data, error } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('type', notificationType)
        .eq('content', itemToShare.item_id.toString());
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const sharedIds = data.map(item => item.user_id);
        setSharedWithIds(sharedIds);
      }
    } catch (err) {
      console.error('Error fetching shared users:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.error('No current user found for fetching users list.');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('user_profiles')
        .select('id, username, avatar_url, full_name')
        .neq('id', currentUser.id); // Exclude current user

      if (searchText) {
        query = query.or(`username.ilike.%${searchText}%,full_name.ilike.%${searchText}%`);
      }
      query = query.limit(20);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Exception fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (visible) fetchUsers();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchText, visible]);

  const handleShare = async (userToShareWith) => {
    if (!itemToShare || !userToShareWith) {
      console.warn('Missing item or user to share with.');
      return;
    }
    
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      
      // Create a notification for the shared item with a valid notification type
      let notificationType;
      
      // Map item types to valid notification types from the constraint
      switch (itemToShare.item_type) {
        case 'housing_group':
          notificationType = 'system'; // Changed from 'group' to 'system' for compatibility
          break;
        case 'housing_listing':
          notificationType = 'system'; // Use system for housing listings
          break;
        case 'post':
          notificationType = 'system'; // Use system for posts
          break;
        case 'event':
          notificationType = 'system'; // Use system for events
          break;
        default:
          notificationType = 'system'; // Default fallback for unknown types
      }
      
      // Track the share in the shared_items table based on type
      if (itemToShare.item_type === 'housing_group' && itemToShare.item_id && itemToShare.item_id !== 'temp_id') {
        // For housing groups, use the shared_items table
        try {
          console.log('Attempting to record housing group share for item_id:', itemToShare.item_id);
          
          // Ensure item_id is a valid UUID for the database
          const itemId = typeof itemToShare.item_id === 'string' ? itemToShare.item_id : itemToShare.item_id.toString();
          
          const shareRecord = {
            sender_id: currentUser.id,
            recipient_id: userToShareWith.id,
            item_type: 'housing_group', // This matches the check constraint
            item_id: itemId,
            is_favourited: false,
            dismissed: false
          };
          
          const { error: shareError } = await supabase
            .from('shared_items')
            .insert([shareRecord]);
          
          if (shareError) {
            console.error('Error recording housing group share:', shareError);
            console.error('Share record that failed:', shareRecord);
          }
        } catch (error) {
          console.error('Error sharing housing group:', error);
        }
      } else if (itemToShare.item_type === 'housing_listing' && itemToShare.item_id) {
        // For housing listings, record in the shared_items table
        try {
          console.log('Attempting to record housing listing share for item_id:', itemToShare.item_id);
          
          // Ensure item_id is a valid UUID for the database
          const itemId = typeof itemToShare.item_id === 'string' ? itemToShare.item_id : itemToShare.item_id.toString();
          
          const shareRecord = {
            sender_id: currentUser.id,
            recipient_id: userToShareWith.id,
            item_type: 'housing_listing', // This matches the check constraint
            item_id: itemId, // Ensure it's a proper UUID string
            is_favourited: false,
            dismissed: false
            // Don't include created_at - let the database handle the default
          };
          
          const { error: shareError } = await supabase
            .from('shared_items')
            .insert([shareRecord]);
            
          if (shareError) {
            console.error('Error recording housing listing share:', shareError);
            console.error('Share record that failed:', shareRecord);
            // Continue execution even if share tracking fails
          }
        } catch (error) {
          console.error('Error sharing housing listing:', error);
          // Continue with notification even if share tracking fails
        }
      } else if (itemToShare.item_type === 'service_provider' && itemToShare.item_id) {
        // For service providers, record in the shared_items table
        try {
          console.log('Attempting to record service provider share for item_id:', itemToShare.item_id);
          
          const itemId = typeof itemToShare.item_id === 'string' ? itemToShare.item_id : itemToShare.item_id.toString();
          
          const shareRecord = {
            sender_id: currentUser.id,
            recipient_id: userToShareWith.id,
            item_type: 'service_provider', // This matches the check constraint
            item_id: itemId,
            is_favourited: false,
            dismissed: false
          };
          
          const { error: shareError } = await supabase
            .from('shared_items')
            .insert([shareRecord]);
            
          if (shareError) {
            console.error('Error recording service provider share:', shareError);
            console.error('Share record that failed:', shareRecord);
          }
        } catch (error) {
          console.error('Error sharing service provider:', error);
        }
      } else if (itemToShare.item_type === 'group_event' && itemToShare.item_id) {
        // For group events, record in the shared_items table
        try {
          console.log('Attempting to record group event share for item_id:', itemToShare.item_id);
          
          const itemId = typeof itemToShare.item_id === 'string' ? itemToShare.item_id : itemToShare.item_id.toString();
          
          const shareRecord = {
            sender_id: currentUser.id,
            recipient_id: userToShareWith.id,
            item_type: 'group_event', // This matches the check constraint
            item_id: itemId,
            is_favourited: false,
            dismissed: false
          };
          
          const { error: shareError } = await supabase
            .from('shared_items')
            .insert([shareRecord]);
            
          if (shareError) {
            console.error('Error recording group event share:', shareError);
            console.error('Share record that failed:', shareRecord);
          }
        } catch (error) {
          console.error('Error sharing group event:', error);
        }
      } else if (itemToShare.item_type === 'post' && itemToShare.item_id) {
        // For posts, we cannot use shared_items table as it doesn't support 'post' type
        // The check constraint only allows: 'group_event', 'service_provider', 'housing_listing', 'housing_group'
        console.log('Post sharing - using notification-only approach (posts not supported in shared_items table)');
        // Skip shared_items insertion for posts and rely on notifications only
      } else {
        console.log(`Sharing type '${itemToShare.item_type}' not supported in shared_items table`);
      }
      
      // Create a notification - this is the most important part, so do it last
      try {
        const notificationRecord = {
          user_id: userToShareWith.id,
          title: 'New Share',
          body: `${currentUser?.user_metadata?.full_name || currentUser?.email || 'Someone'} shared '${itemToShare.item_title}' with you!`,
          type: notificationType,
          content: itemToShare.item_id.toString(),
          seen: false,
          created_at: new Date().toISOString()
        };
        
        console.log('Creating notification:', notificationRecord);
        
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([notificationRecord]);
        
        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          throw notificationError;
        }
      } catch (error) {
        console.error('Failed to create notification:', error);
        throw error; // Re-throw notification errors as they are critical
      }
      
      console.log(`Sharing item: ${itemToShare.item_title} with user: ${userToShareWith.username}`);
      
      // Add the shared user to local state for UI update
      setSelectedUsers(prev => [...prev, userToShareWith.id]);
      setSharedWithIds(prev => [...prev, userToShareWith.id]);
      
      // Trigger quick flash animation
      setFlashUser(userToShareWith.id);
      setTimeout(() => setFlashUser(null), 250); // Flash for just 1/4 second
      
    } catch (err) {
      console.error('Error sharing item:', err);
    }
  };

  const renderUserItem = ({ item }) => {
    const isShared = sharedWithIds.includes(item.id) || selectedUsers.includes(item.id);
    const isFlashing = flashUser === item.id;
    
    return (
      <View style={styles.userItemWrapper}>
        <TouchableOpacity 
          style={[
            styles.userItemContainer,
            isShared && styles.sharedUserItemContainer,
            isFlashing && styles.flashEffect
          ]}
          onPress={() => handleShare(item)}
          disabled={isShared}
          activeOpacity={0.7}
        >
          <Image 
            source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.userAvatar}
          />
          <View style={styles.userInfoContainer}>
            <Text style={[styles.userName, isShared && styles.sharedUserText]}>
              {item.full_name || item.username}
            </Text>
            {item.username && (
              <Text style={[styles.userUsername, isShared && styles.sharedUserText]}>
                @{item.username}
              </Text>
            )}
          </View>
          {isShared ? (
            <View style={styles.sentLabel}>
              <Text style={styles.sentLabelText}>Sent</Text>
            </View>
          ) : (
            <Ionicons 
              name="paper-plane-outline" 
              size={24} 
              color={COLORS.primary} 
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Use a simple View for Android and BlurView for iOS
  const BackgroundBlur = () => (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      {Platform.OS === 'ios' && (
        <BlurView 
          intensity={30}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <BackgroundBlur />
      <TouchableOpacity 
        style={[styles.modalOverlay, visible && styles.blurOverlay]} 
        activeOpacity={1} 
        onPress={onClose} 
      />
      <View style={styles.modalContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Share "{itemToShare?.item_title || 'Favorite'}" with...</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-circle" size={30} color={COLORS.darkGray} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={COLORS.gray}
          />
        </View>

        {loading && users.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }}/>
        ) : users.length === 0 && !loading ? (
          <Text style={styles.emptyMessage}>No users found. Try a different search.</Text>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 0 }}
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  userItemWrapper: {
    marginVertical: 4,
    marginHorizontal: 0, // Remove margin to match search bar width exactly
    borderRadius: 30, // Significantly increased radius for pill-like rounded corners
    overflow: 'hidden',
  },
  sharedUserItemContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 0, // No need for border radius on inner container
    marginHorizontal: 0, // No need for negative margin anymore
    // Keep padding identical to non-highlighted state to prevent movement
    paddingHorizontal: SIZES.padding * 0.7,
    paddingVertical: SIZES.padding * 0.25,
  },
  flashEffect: {
    backgroundColor: COLORS.primary + '80',
    borderRadius: 30, // Match the wrapper border radius
  },
  sentLabel: {
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8, // Add right margin to prevent crowding at edge
    backgroundColor: 'transparent',
  },
  sentLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sharedUserText: {
    color: 'white', // White text for shared users
  },
  modalContainer: {
    height: '75%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding / 2,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.black,
    flex: 1,
    marginRight: SIZES.base,
  },
  closeButton: {
    padding: SIZES.base / 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.base,
    marginBottom: SIZES.padding / 2,
    height: 50,
  },
  searchIcon: {
    marginRight: SIZES.base,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body3,
    color: COLORS.black,
    height: '100%',
  },
  userItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.padding * 0.25, // Reduced vertical padding
    paddingHorizontal: SIZES.padding * 0.7, // Reduced horizontal padding
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    marginVertical: 2, // Add a small gap between rows
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SIZES.padding * 0.8, // Increased spacing between avatar and text
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    ...FONTS.h4,
    color: COLORS.black,
  },
  userUsername: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  emptyMessage: {
    ...FONTS.body3,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ShareTrayModal;
