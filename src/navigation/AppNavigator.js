import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppStateProvider } from '../context/AppStateContext'; 

import MainTabs from './MainTabs';
import AuthStack from './AuthStack';

// Import Detail Screens
import ServiceDetailScreen from '../screens/Main/ServiceDetailScreen';
import HousingDetailScreen from '../screens/Main/HousingDetailScreen';
import EventDetailScreen from '../screens/Main/EventDetailScreen';
import GroupDetailScreen from '../screens/Main/GroupDetailScreen'; // Assuming this one exists as GroupDetailScreen.js
import HousingGroupDetailScreen from '../screens/Main/HousingGroupDetailScreen';

const RootStack = createStackNavigator();
const AuthFlowStack = createStackNavigator();

// Placeholder for authentication logic
const useAuth = () => {
  // In a real app, this would come from context or a service
  // For now, let's assume the user is always authenticated after initial load
  // You might want to integrate this with Supabase auth state listener
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    // Simulate auth check or use actual Supabase listener
    // For example:
    // const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    //   setIsAuthenticated(!!session);
    //   setIsLoading(false);
    // });
    // return () => subscription.unsubscribe();
    
    // Simplified for now:
    setTimeout(() => {
      setIsAuthenticated(true); // Default to authenticated for testing navigation
      setIsLoading(false);
    }, 500); // Simulate loading
  }, []);

  return { isAuthenticated, isLoading }; 
};

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Optionally, return a loading spinner/splash screen
    // For now, returning null to avoid rendering anything before auth state is known
    return null; 
  }

  return (
    <AppStateProvider>
      <NavigationContainer>
        {isAuthenticated ? (
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="MainApp" component={MainTabs} />
            {/* Define detail screens here */}
            <RootStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <RootStack.Screen name="HousingDetail" component={HousingDetailScreen} />
            <RootStack.Screen name="EventDetail" component={EventDetailScreen} />
            <RootStack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <RootStack.Screen name="HousingGroupDetail" component={HousingGroupDetailScreen} />
          </RootStack.Navigator>
        ) : (
          <AuthFlowStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthFlowStack.Screen name="Auth" component={AuthStack} />
          </AuthFlowStack.Navigator>
        )}
      </NavigationContainer>
    </AppStateProvider>
  );
}

export default AppNavigator;
