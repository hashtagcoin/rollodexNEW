import 'react-native-gesture-handler'; // THIS MUST BE THE FIRST IMPORT
import './navigation/NavigationFix'; // Import this early to fix useRef in navigation
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './context/UserContext';
import AppNavigator from './navigation/AppNavigator';
import { useAutoLogin } from './hooks/useAutoLogin';
import GlobalHooksProvider from './hooks/GlobalHooksProvider';
import { ScrollProvider, useScrollContext } from './context/ScrollContext';
import ChatButton from './components/chat/ChatButton';
import ImagePreloadService from './services/ImagePreloadService';

function AppContent() {
  useAutoLogin();
  return <AppNavigator />;
}

// Overlay ChatButton globally
function ChatOverlay() {
  const { isScrolling } = useScrollContext();
  const handleChatPress = () => {
    // TODO: Implement navigation to chat screen or open chat modal
    // Example: navigation.navigate('ChatScreen');
    console.log('Chat button pressed');
  };
  return <ChatButton isScrolling={isScrolling} onPress={handleChatPress} />;
}

export default function App() {
  useEffect(() => {
    // Initialize image preloading service on app startup
    console.log('[App] Initializing ImagePreloadService...');
    ImagePreloadService.initializePreloading().catch(error => {
      console.error('[App] Failed to initialize ImagePreloadService:', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <GlobalHooksProvider>
        <UserProvider>
          <ScrollProvider>
            <AppContent />
            <ChatOverlay />
          </ScrollProvider>
        </UserProvider>
      </GlobalHooksProvider>
    </SafeAreaProvider>
  );
}
