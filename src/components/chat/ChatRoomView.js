import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import { 
  AI_BOT_NAMES, 
  USER_ACTIONS, 
  BLOCK_MESSAGES,
  BUBBLE_COLORS,
  CHAT_ROOM_TOPICS 
} from '../../constants/chatConstants';
import { useUser } from '../../context/UserContext';
import useChat from '../../hooks/useChat';
import MessageBubble from './MessageBubble';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chatBotService from '../../services/chatBotService';

const { width } = Dimensions.get('window');
const USERS_PANEL_WIDTH = width * 0.3; // 30% of screen width

export default function ChatRoomView({ room, onBack }) {
  const { profile } = useUser();
  const { 
    messagesMap, 
    sendMessage, 
    fetchMessages,
    markConversationAsRead,
    subscribeToConversation,
  } = useChat();
  
  const defaultAvatar = require('../../assets/images/default-avatar.png');
  
  // For simulated rooms, store messages locally
  const [localMessages, setLocalMessages] = useState([]);
  
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserActions, setShowUserActions] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [showUsersPanel, setShowUsersPanel] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const flatListRef = useRef(null);
  
  // Get room topic info
  const topicInfo = CHAT_ROOM_TOPICS.find(t => t.id === room.room_topic_id);
  
  // Get messages for this room - use local messages for simulated rooms
  const messages = room?.isSimulated ? localMessages : (messagesMap[room?.id] || []);

  useEffect(() => {
    console.log('[ChatRoomView] useEffect triggered, room?.id:', room?.id);
    if (room?.id) {
      initializeRoom();
    } else {
      console.log('[ChatRoomView] No room ID, skipping initialization');
      setIsLoading(false);
    }
    return () => {
      // Cleanup bot service
      console.log('[ChatRoomView] Cleanup - stopping bot activity');
      chatBotService.stopBotActivity(room?.id);
    };
  }, [room?.id]);

  const initializeRoom = async () => {
    console.log('[ChatRoomView] Starting room initialization');
    console.log('[ChatRoomView] Room data:', JSON.stringify(room, null, 2));
    console.log('[ChatRoomView] Profile data:', profile ? `User: ${profile.full_name || profile.username}` : 'No profile');
    
    try {
      setIsLoading(true);
      console.log('[ChatRoomView] Loading state set to true');
      
      // Check if we have required data
      if (!room || !profile) {
        console.log('[ChatRoomView] Missing required data - room:', !!room, 'profile:', !!profile);
        setIsLoading(false);
        return;
      }
      
      // Load blocked users
      console.log('[ChatRoomView] Loading blocked users...');
      try {
        const blocked = await AsyncStorage.getItem('blocked_users');
        if (blocked) {
          setBlockedUsers(JSON.parse(blocked));
        }
        console.log('[ChatRoomView] Blocked users loaded');
      } catch (error) {
        console.log('[ChatRoomView] Error loading blocked users:', error);
      }
      
      // Load muted users
      console.log('[ChatRoomView] Loading muted users...');
      try {
        const muted = await AsyncStorage.getItem(`muted_users_${room.id}`);
        if (muted) {
          setMutedUsers(JSON.parse(muted));
        }
        console.log('[ChatRoomView] Muted users loaded');
      } catch (error) {
        console.log('[ChatRoomView] Error loading muted users:', error);
      }
      
      // Load users panel preference
      try {
        const panelState = await AsyncStorage.getItem('chat_users_panel_visible');
        if (panelState !== null) {
          setShowUsersPanel(JSON.parse(panelState));
        }
      } catch (error) {
        console.log('[ChatRoomView] Error loading panel state:', error);
      }
      
      // Initialize bots for this room
      console.log('[ChatRoomView] Initializing bots for room:', room.id, 'topic:', room.room_topic_id);
      const bots = await chatBotService.initializeRoomBots(room.id, room.room_topic_id, profile.id);
      console.log('[ChatRoomView] Initialized', bots.length, 'bots');
      
      // Generate room users (mix of real and AI bots)
      console.log('[ChatRoomView] Setting room users...');
      setRoomUsers([
        { 
          id: profile.id, 
          name: profile.full_name || profile.username || 'You', 
          avatar: profile.avatar_url,
          isOnline: true,
          isBot: false 
        },
        ...bots.map(bot => ({
          id: bot.id,
          name: bot.name,
          avatar: bot.avatar,
          isOnline: bot.isOnline,
          isBot: true,
          interests: bot.interests
        }))
      ]);
      console.log('[ChatRoomView] Room users set');
      
      // Fetch existing messages (only for real rooms)
      if (room?.id && !room?.isSimulated) {
        console.log('[ChatRoomView] Fetching messages for real room');
        try {
          await fetchMessages(room.id);
          markConversationAsRead(room.id);
        } catch (error) {
          console.error('[ChatRoomView] Error fetching messages:', error);
        }
      } else {
        console.log('[ChatRoomView] Skipping message fetch for simulated room');
      }
      
      // Start bot conversation simulation
      console.log('[ChatRoomView] Starting bot activity...');
      chatBotService.startBotActivity(room.id, room.room_topic_id, handleBotMessage);
      console.log('[ChatRoomView] Bot activity started');
      
      console.log('[ChatRoomView] Setting loading to false...');
      setIsLoading(false);
      console.log('[ChatRoomView] Loading state set to false');
      console.log('[ChatRoomView] Room initialization complete');
    } catch (error) {
      console.error('[ChatRoomView] Error initializing room:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load chat room. Please try again.');
    }
  };

  // Handle incoming bot messages
  const handleBotMessage = (message) => {
    if (room?.isSimulated) {
      // For simulated rooms, add to local messages
      setLocalMessages(prev => [...prev, message]);
    } else {
      // For real rooms, add to messages map
      if (!messagesMap[room.id]) {
        messagesMap[room.id] = [];
      }
      messagesMap[room.id].push(message);
      // Force re-render
      setRoomUsers(prev => [...prev]);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    try {
      setSending(true);
      const content = messageText.trim();
      setMessageText('');
      
      if (room?.isSimulated) {
        // For simulated rooms, create a local message
        const userMessage = {
          id: `user-msg-${Date.now()}`,
          sender_id: profile.id,
          content: content,
          created_at: new Date().toISOString(),
          sender: {
            id: profile.id,
            full_name: profile.full_name || profile.username,
            avatar_url: profile.avatar_url
          }
        };
        setLocalMessages(prev => [...prev, userMessage]);
        
        // Trigger bot response after a delay
        setTimeout(() => {
          chatBotService.generateBotMessage(room.id, room.room_topic_id, handleBotMessage);
        }, 1000 + Math.random() * 2000);
      } else {
        // For real rooms, use the normal send message flow
        await sendMessage(room.id, content);
      }
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  const handleUserPress = (user) => {
    if (user.id === profile.id) return;
    setSelectedUser(user);
    setShowUserActions(true);
  };
  
  const toggleUsersPanel = async () => {
    const newState = !showUsersPanel;
    setShowUsersPanel(newState);
    try {
      await AsyncStorage.setItem('chat_users_panel_visible', JSON.stringify(newState));
    } catch (error) {
      console.log('[ChatRoomView] Error saving panel state:', error);
    }
  };

  const handleUserAction = async (action) => {
    setShowUserActions(false);
    
    switch (action) {
      case USER_ACTIONS.BLOCK:
        Alert.alert(
          'Block User',
          BLOCK_MESSAGES.CONFIRM_BLOCK,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Block', 
              style: 'destructive',
              onPress: async () => {
                const newBlockedUsers = [...blockedUsers, selectedUser.id];
                setBlockedUsers(newBlockedUsers);
                await AsyncStorage.setItem('blocked_users', JSON.stringify(newBlockedUsers));
                Alert.alert('Success', BLOCK_MESSAGES.BLOCKED_SUCCESS);
              }
            }
          ]
        );
        break;
      case USER_ACTIONS.MUTE:
        const isMuted = mutedUsers.includes(selectedUser.id);
        if (isMuted) {
          // Unmute
          const newMutedUsers = mutedUsers.filter(id => id !== selectedUser.id);
          setMutedUsers(newMutedUsers);
          await AsyncStorage.setItem(`muted_users_${room.id}`, JSON.stringify(newMutedUsers));
          Alert.alert('Success', BLOCK_MESSAGES.UNMUTED_SUCCESS);
        } else {
          // Mute
          Alert.alert(
            'Mute User',
            BLOCK_MESSAGES.CONFIRM_MUTE,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Mute', 
                onPress: async () => {
                  const newMutedUsers = [...mutedUsers, selectedUser.id];
                  setMutedUsers(newMutedUsers);
                  await AsyncStorage.setItem(`muted_users_${room.id}`, JSON.stringify(newMutedUsers));
                  Alert.alert('Success', BLOCK_MESSAGES.MUTED_SUCCESS);
                }
              }
            ]
          );
        }
        break;
      case USER_ACTIONS.PRIVATE_MESSAGE:
        // Navigate to private chat with the selected user
        console.log('[ChatRoomView] Private message action for user:', selectedUser);
        if (onBack && typeof onBack === 'function') {
          // Pass the selected user to parent component
          onBack('private_message', selectedUser);
        }
        break;
      case USER_ACTIONS.REPORT:
        Alert.alert('Report User', 'Report functionality coming soon');
        break;
    }
  };

  const UserItem = ({ item, isMuted, onPress }) => {
    const [avatarError, setAvatarError] = useState(false);
    
    return (
      <TouchableOpacity 
        style={[styles.userItem, isMuted && styles.mutedUserItem]} 
        onPress={onPress}
      >
        <View style={styles.userAvatar}>
          {item.avatar && !avatarError ? (
            <Image 
              source={{ uri: item.avatar }} 
              style={styles.avatarImage}
              onError={() => setAvatarError(true)}
              defaultSource={defaultAvatar}
            />
          ) : (
            <Image 
              source={defaultAvatar} 
              style={styles.avatarImage}
            />
          )}
          {item.isOnline && !isMuted && (
            <View style={styles.onlineIndicator} />
          )}
          {isMuted && (
            <View style={styles.mutedIndicator}>
              <Ionicons name="volume-mute" size={12} color="#fff" />
            </View>
          )}
        </View>
        <Text style={[styles.userName, isMuted && styles.mutedUserName]} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item }) => {
    if (blockedUsers.includes(item.id)) return null;
    const isMuted = mutedUsers.includes(item.id);
    
    return (
      <UserItem 
        item={item} 
        isMuted={isMuted} 
        onPress={() => handleUserPress(item)}
      />
    );
  };

  const renderMessage = ({ item }) => {
    const sender = roomUsers.find(u => u.id === item.sender_id);
    if (!sender || blockedUsers.includes(sender.id) || mutedUsers.includes(sender.id)) return null;
    
    // Pass the sender info to MessageBubble to avoid double avatars
    const messageWithSender = {
      ...item,
      sender: {
        ...item.sender,
        full_name: sender.name,
        avatar_url: sender.avatar
      }
    };
    
    return (
      <MessageBubble 
        message={messageWithSender}
        isOwnMessage={item.sender_id === profile?.id}
        isBot={sender?.isBot || item.isBot}
        onPressAvatar={() => handleUserPress(sender)}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Joining room...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.roomTitle}>{room.room_name}</Text>
          <Text style={styles.roomSubtitle}>{roomUsers.length} members</Text>
        </View>
        <TouchableOpacity 
          onPress={toggleUsersPanel}
          style={styles.toggleButton}
        >
          <Ionicons 
            name={showUsersPanel ? "eye" : "eye-off"} 
            size={24} 
            color="#333" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>

        {showUsersPanel && (
          <View style={styles.usersPanel}>
            <Text style={styles.usersPanelTitle}>Online Users</Text>
            <FlatList
              data={roomUsers}
              renderItem={renderUser}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}


        <View style={styles.chatArea}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />


          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sending}
            >
              <Ionicons name="send" size={20} color={messageText.trim() ? COLORS.primary : '#ccc'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>


      <Modal
        visible={showUserActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserActions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowUserActions(false)}
        >
          <View style={styles.userActionsModal}>
            <Text style={styles.modalTitle}>{selectedUser?.name}</Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleUserAction(USER_ACTIONS.PRIVATE_MESSAGE)}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#333" />
              <Text style={styles.actionText}>Send Private Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleUserAction(USER_ACTIONS.MUTE)}
            >
              <Ionicons 
                name={mutedUsers.includes(selectedUser?.id) ? "volume-high-outline" : "volume-mute-outline"} 
                size={20} 
                color="#666" 
              />
              <Text style={styles.actionText}>
                {mutedUsers.includes(selectedUser?.id) ? 'Unmute User' : 'Mute in this room'}
              </Text>
            </TouchableOpacity>
            
            {!selectedUser?.isBot && (
              <>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleUserAction(USER_ACTIONS.BLOCK)}
                >
                  <Ionicons name="ban-outline" size={20} color="#ff4444" />
                  <Text style={[styles.actionText, { color: '#ff4444' }]}>Block User</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleUserAction(USER_ACTIONS.REPORT)}
                >
                  <Ionicons name="flag-outline" size={20} color="#ff8800" />
                  <Text style={[styles.actionText, { color: '#ff8800' }]}>Report User</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  roomSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  usersPanel: {
    width: USERS_PANEL_WIDTH,
    backgroundColor: '#f8f8f8',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingTop: 12,
  },
  usersPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#f8f8f8',
  },
  userName: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  mutedUserItem: {
    opacity: 0.6,
  },
  mutedUserName: {
    color: '#999',
    fontStyle: 'italic',
  },
  mutedIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f8f8f8',
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userActionsModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
});