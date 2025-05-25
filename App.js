import 'react-native-gesture-handler'; // THIS MUST BE THE FIRST IMPORT
import React from 'react';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useAutoLogin } from './src/hooks/useAutoLogin';

function AppContent() {
  useAutoLogin();
  return <AppNavigator />;
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
