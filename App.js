import 'react-native-gesture-handler'; // THIS MUST BE THE FIRST IMPORT
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator'; 
import { useAutoSupabaseLogin } from './src/lib/autoSupabaseLogin';
import { UserProvider } from './src/context/UserContext';

export default function App() {
  useAutoSupabaseLogin();
  return (
    <UserProvider>
      <AppNavigator />
    </UserProvider>
  );
}
