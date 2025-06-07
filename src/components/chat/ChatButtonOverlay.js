import React from 'react';
import { View, StyleSheet } from 'react-native';
import ChatButton from './ChatButton';
import { ScrollProvider } from '../../context/ScrollContext';

/**
 * ChatButtonOverlay - Provides a persistent chat button that overlays the app
 * This component should wrap the main navigation container
 */
const ChatButtonOverlay = ({ children }) => {
  return (
    <ScrollProvider>
      <View style={styles.container}>
        {children}
        <ChatButton />
      </View>
    </ScrollProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChatButtonOverlay;
