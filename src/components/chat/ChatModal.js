import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  SafeAreaView,
  Platform,
  Keyboard,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import ChatList from './ChatList';
import ChatDetail from './ChatDetail';
import NewConversation from './NewConversation';
import ChatRoomsList from './ChatRoomsList';
import CreateChatRoom from './CreateChatRoom';
import useChat from '../../hooks/useChat';

const { height } = Dimensions.get('window');

const ChatModal = ({ visible, onClose, initialUser = null }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [activeView, setActiveView] = useState('list'); // 'list', 'detail', 'new', 'rooms', 'createRoom'
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'rooms'
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newConversationUsers, setNewConversationUsers] = useState([]);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  
  // Get chat functions from the hook
  const { createConversation, fetchConversations, conversations } = useChat();

  useEffect(() => {
    if (visible) {
      // When modal opens, animate up from bottom
      Animated.spring(slideAnim, {
        toValue: 0,
        velocity: 3,
        tension: 2,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      // If initialUser is provided, directly start a conversation with them
      if (initialUser) {
        handleInitialUserConversation();
      }
    } else {
      // When modal closes, animate down
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Handle creating a conversation with the initial user
  const handleInitialUserConversation = async () => {
    if (!initialUser || !initialUser.id) return;
    
    try {
      setIsCreatingConversation(true);
      
      // Check if a conversation already exists with this user
      const existingConversation = conversations.find(conv => {
        // For non-group chats, check if there are exactly two participants and one is the initialUser
        if (!conv.is_group_chat && conv.participants && conv.participants.length === 2) {
          return conv.participants.some(p => p.id === initialUser.id);
        }
        return false;
      });
      
      if (existingConversation) {
        // Use the existing conversation
        setSelectedConversation(existingConversation);
        setActiveView('detail');
      } else {
        // Create a new conversation with this user
        const conversationId = await createConversation([initialUser.id], false);
        if (conversationId) {
          // Fetch latest conversations to get the newly created one
          await fetchConversations();
          
          // Find the newly created conversation
          const newConversation = conversations.find(conv => conv.id === conversationId);
          if (newConversation) {
            setSelectedConversation(newConversation);
            setActiveView('detail');
          }
        }
      }
    } catch (error) {
      console.error('Error creating conversation with initial user:', error);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleClose = () => {
    // Animate out and then call the onClose callback
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      setActiveView('list'); // Reset to list view when closing
      setActiveTab('chats'); // Reset to chats tab
      setSelectedConversation(null);
    });
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    setActiveView('detail');
  };

  const handleBackToList = () => {
    setActiveView('list');
    setSelectedConversation(null);
  };

  const handleStartNewConversation = () => {
    setActiveView('new');
  };

  const handleSelectRoom = (room) => {
    setSelectedConversation(room);
    setActiveView('detail');
  };

  const handleCreateRoom = () => {
    setActiveView('createRoom');
  };

  const handleRoomCreated = async (roomId) => {
    // Fetch conversations to get the new room
    await fetchConversations();
    const newRoom = conversations.find(conv => conv.id === roomId);
    if (newRoom) {
      setSelectedConversation(newRoom);
      setActiveView('detail');
    }
  };

  const handleCreateConversation = (conversation) => {
    // Handle a newly created conversation from NewConversation component
    if (conversation) {
      // Select the newly created conversation
      setSelectedConversation(conversation);
      setActiveView('detail');
    } else {
      // If no conversation was created, go back to list
      setActiveView('list');
    }
  };

  const renderHeader = () => {
    switch (activeView) {
      case 'list':
      case 'rooms':
        return (
          <View>
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <MaterialIcons name="chat" size={22} color={COLORS.black} />
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>Messages</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <Ionicons name="close" size={22} color={COLORS.darkGray} />
              </TouchableOpacity>
            </View>
            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
                onPress={() => {
                  setActiveTab('chats');
                  setActiveView('list');
                }}
              >
                <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
                  Private Chats
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'rooms' && styles.activeTab]}
                onPress={() => {
                  setActiveTab('rooms');
                  setActiveView('rooms');
                }}
              >
                <Text style={[styles.tabText, activeTab === 'rooms' && styles.activeTabText]}>
                  Chat Rooms
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'detail':
        return (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackToList} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedConversation?.room_name 
                ? selectedConversation?.room_name
                : selectedConversation?.is_group_chat 
                ? 'Group Chat' 
                : selectedConversation?.participant_name || 'Chat'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>
        );
      case 'new':
        return (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackToList} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Message</Text>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>
        );
      case 'createRoom':
        return (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setActiveView('rooms')} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Chat Room</Text>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>
        );
    }
  };

  const renderContent = () => {
    // Show loading indicator when creating a conversation
    if (isCreatingConversation) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Creating conversation...</Text>
        </View>
      );
    }
    
    switch (activeView) {
      case 'list':
        return (
          <ChatList 
            onSelectConversation={handleConversationSelect}
            onNewConversation={handleStartNewConversation}
          />
        );
      case 'detail':
        return (
          <ChatDetail 
            conversation={selectedConversation}
            onBack={handleBackToList}
          />
        );
      case 'new':
        return (
          <NewConversation 
            onCreateConversation={handleCreateConversation}
          />
        );
      case 'rooms':
        return (
          <ChatRoomsList
            onSelectRoom={handleSelectRoom}
            onCreateRoom={handleCreateRoom}
          />
        );
      case 'createRoom':
        return (
          <CreateChatRoom
            onClose={() => setActiveView('rooms')}
            onRoomCreated={handleRoomCreated}
          />
        );
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: isKeyboardVisible ? 0 : insets.bottom,
              paddingTop: insets.top || 12,
            },
          ]}
        >
          {renderHeader()}
          {renderContent()}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    width: '100%', // Ensure it takes full width
    alignSelf: 'center', // Center the modal
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8, // Very minimal horizontal padding
    paddingVertical: 4, // Very minimal vertical padding
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: 'white',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    marginLeft: 6, // Reduced margin
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  headerBackButton: {
    padding: 6, // Reduced padding
    marginRight: 6, // Reduced margin
  },
  headerButton: {
    padding: 6, // Reduced padding
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default ChatModal;
