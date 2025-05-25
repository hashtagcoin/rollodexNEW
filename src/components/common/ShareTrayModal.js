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

const ShareTrayModal = ({ visible, onClose, itemToShare }) => {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (visible && !itemToShare) {
      console.warn('ShareTrayModal opened without itemToShare');
    }
    if (visible) {
      fetchUsers();
    } else {
      // Reset state when modal is closed
      setSearchText('');
      setUsers([]);
      setSelectedUser(null);
    }
  }, [visible, itemToShare]);

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

  const handleShare = (userToShareWith) => {
    if (!itemToShare || !userToShareWith) {
      console.warn('Missing item or user to share with.');
      alert('Could not share. Please try again.');
      return;
    }
    // Placeholder for actual share logic
    // This could involve creating a notification, a direct message, or a shared_items entry
    console.log(`Sharing item: ${itemToShare.item_title} (ID: ${itemToShare.item_id}, Type: ${itemToShare.item_type}) with user: ${userToShareWith.username} (ID: ${userToShareWith.id})`);
    alert(`Shared '${itemToShare.item_title}' with ${userToShareWith.username}! (Placeholder)`);
    setSelectedUser(userToShareWith);
    // Optionally close modal after sharing or show a success message
    // onClose(); 
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItemContainer}
      onPress={() => handleShare(item)}
    >
      <Image 
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfoContainer}>
        <Text style={styles.userName}>{item.full_name || item.username}</Text>
        {item.username && <Text style={styles.userUsername}>@{item.username}</Text>}
      </View>
      <Ionicons name="paper-plane-outline" size={24} color={COLORS.primary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
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
