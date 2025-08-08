import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import { LOADING_STATES, ERROR_MESSAGES, EMPTY_STATES } from '../../constants/chatConstants';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import useChat from '../../hooks/useChat';

const NewConversation = ({ onCreateConversation }) => {
  const { profile } = useUser();
  const { createConversation } = useChat();
  
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Handle avatar image loading errors to prevent TurboModule crashes
  const handleAvatarError = (error, userId) => {
    if (__DEV__) {
      console.warn('NewConversation: Avatar image failed to load', {
        userId,
        error: error?.nativeEvent || error,
        platform: Platform.OS
      });
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchUsers();
    }
  }, [profile?.id]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get all users except current user
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', profile.id)
        .order('username', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers((prevSelected) => {
      if (prevSelected.some(u => u.id === user.id)) {
        // If already selected, remove from selection
        return prevSelected.filter(u => u.id !== user.id);
      } else {
        // Add to selection
        return [...prevSelected, user];
      }
    });
  };

  const handleStartConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setCreating(true);
      
      // Extract user IDs from selected users
      const userIds = selectedUsers.map(user => user.id);
      
      // Determine if this is a group chat
      const isGroup = selectedUsers.length > 1;
      
      // Use the createConversation function from our useChat hook
      const conversationId = await createConversation(userIds, isGroup);
      
      if (!conversationId) {
        throw new Error('Failed to create conversation');
      }
      
      // Create a conversation object for the callback
      const conversation = {
        id: conversationId,
        is_group_chat: isGroup,
        participants: [...selectedUsers, { id: profile.id }],
        participant_name: isGroup 
          ? `${selectedUsers.length} participants`
          : selectedUsers[0].full_name || selectedUsers[0].username,
        participant_avatar: !isGroup ? selectedUsers[0].avatar_url : null
      };
      
      // Call the callback with the new conversation
      onCreateConversation(conversation);
      
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError(ERROR_MESSAGES.FAILED_TO_CREATE_CONVERSATION);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = searchQuery.trim() 
    ? users.filter(user => {
        const query = searchQuery.toLowerCase();
        return (
          (user.username && user.username.toLowerCase().includes(query)) ||
          (user.full_name && user.full_name.toLowerCase().includes(query))
        );
      })
    : users;

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.some(user => user.id === item.id);

    return (
      <TouchableOpacity 
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => toggleUserSelection(item)}
      >
        <View style={styles.userAvatarContainer}>
          {item.avatar_url ? (
            <Image 
              source={{ uri: item.avatar_url }} 
              style={styles.userAvatar}
              onError={(error) => handleAvatarError(error, item.id)}
              onLoadStart={() => {
                if (__DEV__) {
                  console.log('NewConversation: Avatar loading started', { userId: item.id });
                }
              }}
              onPartialLoad={() => {
                if (__DEV__) {
                  console.log('NewConversation: Avatar partial load', { userId: item.id });
                }
              }}
              defaultSource={require('../../../assets/placeholder-image.png')}
              loadingIndicatorSource={require('../../../assets/placeholder-image.png')}
              fadeDuration={0}
              progressiveRenderingEnabled={true}
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {(item.full_name || item.username || '?').charAt(0)}
              </Text>
            </View>
          )}
          
          {isSelected && (
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.full_name || item.username}
          </Text>
          {item.username && item.full_name && (
            <Text style={styles.userHandle}>@{item.username}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedUsers = () => {
    if (selectedUsers.length === 0) return null;

    return (
      <View style={styles.selectedUsersContainer}>
        <Text style={styles.selectedTitle}>Selected ({selectedUsers.length})</Text>
        <FlatList
          data={selectedUsers}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.selectedUserBubble}>
              {item.avatar_url ? (
                <Image 
                  source={{ uri: item.avatar_url }} 
                  style={styles.selectedAvatar}
                  onError={(error) => handleAvatarError(error, item.id)}
                  onLoadStart={() => {
                    if (__DEV__) {
                      console.log('NewConversation: Selected avatar loading started', { userId: item.id });
                    }
                  }}
                  onPartialLoad={() => {
                    if (__DEV__) {
                      console.log('NewConversation: Selected avatar partial load', { userId: item.id });
                    }
                  }}
                  defaultSource={require('../../../assets/placeholder-image.png')}
                  loadingIndicatorSource={require('../../../assets/placeholder-image.png')}
                  fadeDuration={0}
                  progressiveRenderingEnabled={true}
                />
              ) : (
                <View style={styles.selectedDefaultAvatar}>
                  <Text style={styles.selectedAvatarText}>
                    {(item.full_name || item.username || '?').charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={styles.selectedUserName} numberOfLines={1}>
                {item.full_name || item.username}
              </Text>
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => toggleUserSelection(item)}
              >
                <Ionicons name="close-circle" size={18} color="rgba(0,0,0,0.5)" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.selectedUsersList}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.darkGray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for people"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {renderSelectedUsers()}

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.usersList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No users found matching your search' : 'No users available'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[
          styles.startButton,
          selectedUsers.length === 0 && styles.startButtonDisabled
        ]}
        onPress={handleStartConversation}
        disabled={selectedUsers.length === 0}
      >
        <Text style={styles.startButtonText}>
          {selectedUsers.length > 1 
            ? 'Start Group Chat' 
            : 'Start Conversation'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.darkGray,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    margin: 16,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    height: 40,
    flex: 1,
    fontSize: 16,
  },
  usersList: {
    paddingBottom: 80,
  },
  userItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    alignItems: 'center',
  },
  selectedUserItem: {
    backgroundColor: 'rgba(0, 123, 255, 0.05)',
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  checkmarkContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.black,
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  selectedUsersContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  selectedUsersList: {
    paddingRight: 10,
  },
  selectedUserBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 6,
    paddingRight: 12,
    marginRight: 8,
  },
  selectedAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 6,
  },
  selectedDefaultAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  selectedAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  selectedUserName: {
    fontSize: 14,
    maxWidth: 100,
  },
  removeButton: {
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  startButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  startButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewConversation;
