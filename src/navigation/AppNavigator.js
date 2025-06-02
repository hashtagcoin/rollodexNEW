import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppStateProvider } from '../context/AppStateContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '../components/LoadingScreen';
import { NotificationProvider } from '../components/notifications';

import MainTabs from './MainTabs';
import ProviderStackNavigator from './ProviderStackNavigator';
import AuthStack from './AuthStack';

// Import Detail Screens
import ServiceDetailScreen from '../screens/Main/ServiceDetailScreen';
import HousingDetailScreen from '../screens/Details/HousingDetailScreen';
import EventDetailScreen from '../screens/Main/EventDetailScreen';
import GroupDetailScreen from '../screens/Main/GroupDetailScreen';
import HousingGroupDetailScreen from '../screens/Main/HousingGroupDetailScreen';
import CreateHousingGroupScreen from '../screens/Groups/CreateHousingGroupScreen';

import { supabase } from '../lib/supabaseClient'; // Import Supabase client

const RootStack = createStackNavigator();
const AuthFlowStack = createStackNavigator();

// Authentication logic with user role handling
const useAuth = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userRole, setUserRole] = React.useState('participant');

  // Function to check user profile and determine role
  const checkUserRole = async (userId) => {
    try {
      // First check AsyncStorage for cached provider mode
      const cachedProviderMode = await AsyncStorage.getItem('provider_mode');
      if (cachedProviderMode !== null) {
        const isProvider = JSON.parse(cachedProviderMode);
        setUserRole(isProvider ? 'provider' : 'participant');
        return;
      }
      
      // If not in AsyncStorage, fetch from database
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data && data.role) {
        setUserRole(data.role);
        // Cache the provider mode
        const isProvider = data.role === 'provider';
        await AsyncStorage.setItem('provider_mode', JSON.stringify(isProvider));
      }
    } catch (error) {
      // Silent error handling - no console logs
      // Default to participant if there's an error
      setUserRole('participant');
    }
  };

  React.useEffect(() => {
    // Clear any existing session on app start to force explicit login
    const clearExistingSession = async () => {
      try {
        // Sign out any existing user
        await supabase.auth.signOut();
        // Clear stored provider mode
        await AsyncStorage.removeItem('provider_mode');
        // Silent operation - no console logs
      } catch (error) {
        // Silent error handling
      }
      
      // Set loading to false as initialization is complete
      setIsLoading(false);
      setIsAuthenticated(false);
    };
    
    clearExistingSession();

    // Only listen for auth state changes after initial clear
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Silent authentication - no console logs
      
      // Only set authenticated if there's an explicit SIGNED_IN event (not INITIAL_SESSION)
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        if (session.user) {
          await checkUserRole(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []); // No dependencies as we want this to run only once on mount

  return { isAuthenticated, isLoading, userRole }; 
};

function AppNavigator() {
  const { isAuthenticated, isLoading, userRole } = useAuth();

  if (isLoading) {
    // Show loading screen while loading user role/auth state
    return <LoadingScreen />;
  }

  // Customize initial route based on user role
  const getInitialRoute = () => {
    if (userRole === 'provider') {
      // For providers, start with ProviderStack
      return 'ProviderStack';
    } else {
      // For participants, start with MainApp (MainTabs)
      return 'MainApp';
    }
  };

  return (
    <AppStateProvider>
      <NavigationContainer>
        <NotificationProvider>
        {isAuthenticated ? (
          <RootStack.Navigator 
            initialRouteName={getInitialRoute()}
            screenOptions={{ headerShown: false }}
          >
            <RootStack.Screen name="MainApp" component={MainTabs} />
            <RootStack.Screen name="ProviderStack" component={ProviderStackNavigator} />
            {/* Define detail screens here */}
            <RootStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <RootStack.Screen name="HousingDetail" component={HousingDetailScreen} />
            <RootStack.Screen name="EventDetail" component={EventDetailScreen} />
            <RootStack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <RootStack.Screen name="HousingGroupDetailScreen" component={HousingGroupDetailScreen} />
            <RootStack.Screen name="CreateHousingGroup" component={CreateHousingGroupScreen} />
          </RootStack.Navigator>
        ) : (
          <AuthFlowStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthFlowStack.Screen name="Auth" component={AuthStack} />
          </AuthFlowStack.Navigator>
        )}
        </NotificationProvider>
      </NavigationContainer>
    </AppStateProvider>
  );
}

export default AppNavigator;
