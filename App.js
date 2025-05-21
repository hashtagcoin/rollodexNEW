import 'react-native-gesture-handler'; // THIS MUST BE THE FIRST IMPORT
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator'; 
import { useAutoSupabaseLogin } from './src/lib/autoSupabaseLogin';

export default function App() {
  useAutoSupabaseLogin();
  return <AppNavigator />;
}
