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
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import ChatList from './ChatList';
import ChatDetail from './ChatDetail';
import NewConversation from './NewConversation';

const { height } = Dimensions.get('window');

const ChatModal = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [activeView, setActiveView] = useState('list'); // 'list', 'detail', 'new'
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newConversationUsers, setNewConversationUsers] = useState([]);

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

  const handleClose = () => {
    // Animate out and then call the onClose callback
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      setActiveView('list'); // Reset to list view when closing
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
        return (
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <MaterialIcons name="chat" size={24} color={COLORS.primary} />
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Chats</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleStartNewConversation} style={styles.headerButton}>
              <Ionicons name="create-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>
        );
      case 'detail':
        return (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackToList} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedConversation?.is_group_chat 
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
    }
  };

  const renderContent = () => {
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  headerBackButton: {
    padding: 8,
    marginRight: 8,
  },
  headerButton: {
    padding: 8,
  },
});

export default ChatModal;
