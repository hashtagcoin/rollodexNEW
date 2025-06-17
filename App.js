import 'react-native-gesture-handler'; // THIS MUST BE THE FIRST IMPORT
import './src/navigation/NavigationFix'; // Import this early to fix useRef in navigation
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useAutoLogin } from './src/hooks/useAutoLogin';
import GlobalHooksProvider from './src/hooks/GlobalHooksProvider';
import { ScrollProvider, useScrollContext } from './src/context/ScrollContext';
import ChatButton from './src/components/chat/ChatButton';
import ImagePreloadService from './src/services/ImagePreloadService';

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
    ImagePreloadService.initializePreloading();
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
