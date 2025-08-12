import React from 'react';
import { View, StyleSheet } from 'react-native';
import ChatButton from './ChatButton';
import { ScrollProvider } from '../../context/ScrollContext';
import { ChatButtonProvider } from '../../context/ChatButtonContext';

/**
 * ChatButtonOverlay - Provides a persistent chat button that overlays the app
 * This component should wrap the main navigation container
 */
const ChatButtonOverlay = ({ children }) => {
  return (
    <ChatButtonProvider>
      <ScrollProvider>
        <View style={styles.container}>
          {children}
          <ChatButton />
        </View>
      </ScrollProvider>
    </ChatButtonProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChatButtonOverlay;
