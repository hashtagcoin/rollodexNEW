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
  Image
} from 'react-native';
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
      
      // Create a notification for the shared item
      const notificationType = itemToShare.item_type === 'housing_group' ? 'group' : itemToShare.item_type;
      
      const { error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userToShareWith.id,
            title: 'New Share',
            body: `${currentUser?.email || 'Someone'} shared '${itemToShare.item_title}' with you!`,
            type: notificationType,
            content: itemToShare.item_id.toString(),
            seen: false
          }
        ]);
      
      if (error) throw error;
      
      // Add the shared user to local state for UI update
      setSelectedUsers(prev => [...prev, userToShareWith.id]);
      setSharedWithIds(prev => [...prev, userToShareWith.id]);
      
      // Set flash effect
      setFlashUser(userToShareWith.id);
      setTimeout(() => setFlashUser(null), 1000); // Flash for 1 second
      
    } catch (err) {
      console.error('Error sharing item:', err);
    }
  };

  const renderUserItem = ({ item }) => {
    const isShared = sharedWithIds.includes(item.id) || selectedUsers.includes(item.id);
    const isFlashing = flashUser === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.userItemContainer,
          isShared && styles.sharedUserItemContainer,
          isFlashing && styles.flashEffect
        ]}
        onPress={() => handleShare(item)}
        disabled={isShared}
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
            contentContainerStyle={{ paddingBottom: 20 }}
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
  sharedUserItemContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 0,
    marginHorizontal: -SIZES.padding,
    paddingHorizontal: SIZES.padding,
  },
  flashEffect: {
    backgroundColor: COLORS.primary + '80',
  },
  sentLabel: {
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    paddingVertical: SIZES.padding / 2,
    paddingHorizontal: SIZES.padding,
    marginHorizontal: -SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SIZES.padding / 2,
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
