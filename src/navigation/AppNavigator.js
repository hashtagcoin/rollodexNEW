import React, { useState } from 'react'; // Using a simple state for now
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import { AppStateProvider } from '../context/AppStateContext';

// This is a placeholder. In a real app, this would come from your auth context/state management
const useAuth = () => {
  // For demonstration, toggle this to switch between Auth and Main screens
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default to true for dashboard testing 
  // Example function to simulate login, you'd call this from SignInScreen
  // const login = () => setIsAuthenticated(true);
  // const logout = () => setIsAuthenticated(false);
  return { isAuthenticated }; 
};

const AppNavigator = () => {
  const { isAuthenticated } = useAuth(); // Replace with your actual auth state logic

  return (
    <AppStateProvider>
      <NavigationContainer>
        {isAuthenticated ? <MainTabs /> : <AuthStack />}
      </NavigationContainer>
    </AppStateProvider>
  );
};

export default AppNavigator;
