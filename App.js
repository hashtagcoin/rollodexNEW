import 'react-native-gesture-handler'; // THIS MUST BE THE FIRST IMPORT
import './src/navigation/NavigationFix'; // Import this early to fix useRef in navigation
import React, { useRef } from 'react';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useAutoLogin } from './src/hooks/useAutoLogin';
import GlobalHooksProvider from './src/hooks/GlobalHooksProvider';

function AppContent() {
  useAutoLogin();
  return <AppNavigator />;
}

export default function App() {
  return (
    <GlobalHooksProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </GlobalHooksProvider>
  );
}
