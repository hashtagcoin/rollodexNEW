import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppStateProvider } from '../context/AppStateContext';
import MainTabs from './MainTabs';
import AuthStack from './AuthStack';

const Stack = createStackNavigator();

function AppNavigator() {
  // For now, we'll assume the user is always authenticated
  // In a real app, you would check the authentication state here
  const isAuthenticated = true;

  return (
    <AppStateProvider>
      <NavigationContainer>
        {isAuthenticated ? <MainTabs /> : <AuthStack />}
      </NavigationContainer>
    </AppStateProvider>
  );
}

export default AppNavigator;
