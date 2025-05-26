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

import { supabase } from '../lib/supabaseClient'; // Import Supabase client

const RootStack = createStackNavigator();
const AuthFlowStack = createStackNavigator();

// Placeholder for authentication logic
const useAuth = () => {
  // In a real app, this would come from context or a service
  // For now, let's assume the user is always authenticated after initial load
  // You might want to integrate this with Supabase auth state listener
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [sessionChecked, setSessionChecked] = React.useState(false); // To ensure initial session check completes

  React.useEffect(() => {
    // Check initial session state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setSessionChecked(true); // Mark initial session check as complete
      // setIsLoading(false); // We'll let onAuthStateChange handle final isLoading
    }).catch(() => {
      setIsAuthenticated(false);
      setSessionChecked(true);
      // setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, 'Session:', session);
      setIsAuthenticated(!!session);
      if (sessionChecked) { // Only set isLoading to false after initial check AND first auth event
        setIsLoading(false);
      }
      // If it's the initial SIGNED_IN or INITIAL_SESSION event and session is present, ensure loading is false
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session && !isLoading) {
        // This case might be redundant if sessionChecked logic is robust
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)){
        setIsLoading(false); // Ensure loading stops if signed out or no initial session
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [sessionChecked]); // Rerun if sessionChecked changes, though it should only change once

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
            <RootStack.Screen name="HousingGroupDetailScreen" component={HousingGroupDetailScreen} />
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
