import React, { useRef, useEffect, useState } from 'react';
import { Animated, TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollContext } from '../../context/ScrollContext';
import { useChatButton } from '../../context/ChatButtonContext';
import ChatModal from './ChatModal';

// Constants for positioning
const TAB_BAR_HEIGHT = 50;

/**
 * ChatButton - A floating chat button fixed to the bottom left corner.
 * 
 * Props:
 * - onPress: function to call when button is pressed
 * - isScrolling: boolean, true if the user is actively scrolling
 */
const ChatButton = () => {
  const { isScrolling } = useScrollContext();
  const { isChatButtonVisible } = useChatButton();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(1)).current;
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  
  // Hide chat button if context says so
  if (!isChatButtonVisible) {
    return null;
  }

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isScrolling ? 0.3 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isScrolling]);

  const handleOpenChat = () => {
    setIsChatModalVisible(true);
  };

  const handleCloseChat = () => {
    setIsChatModalVisible(false);
  };

  return (
    <>
      <Animated.View style={[styles.container, { opacity, bottom: insets.bottom + TAB_BAR_HEIGHT + 16 }]}>
        <TouchableOpacity onPress={handleOpenChat} style={styles.button}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      

      <ChatModal 
        visible={isChatModalVisible} 
        onClose={handleCloseChat} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    zIndex: 1000,
    elevation: 5,
  },
  button: {
    backgroundColor: '#007BFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ChatButton;
