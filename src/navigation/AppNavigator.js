import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppStateProvider } from '../context/AppStateContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '../components/LoadingScreen';
import { NotificationProvider } from '../components/notifications';
import ChatButtonOverlay from '../components/chat/ChatButtonOverlay';

import MainTabs from './MainTabs';
import ProviderStackNavigator from './ProviderStackNavigator';
import AuthStack from './AuthStack';

// Import Detail Screens
import ServiceDetailScreen from '../screens/Details/ServiceDetailScreen';
import HousingDetailScreen from '../screens/Details/HousingDetailScreen';
import EventDetailScreen from '../screens/Main/EventDetailScreen';
import GroupDetailScreen from '../screens/Main/GroupDetailScreen';
import HousingGroupDetailScreen from '../screens/Main/HousingGroupDetailScreen';
import CreateHousingGroupScreen from '../screens/Groups/CreateHousingGroupScreen';
import VideoScreen from '../screens/Main/VideoScreen';

import { supabase } from '../lib/supabaseClient'; // Import Supabase client

console.log(`[DEBUG][${new Date().toISOString()}] AppNavigator - Starting NavigationContainer setup`);

const RootStack = createStackNavigator();
const AuthFlowStack = createStackNavigator();

// Authentication logic with user role handling
const useAuth = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userRole, setUserRole] = React.useState('participant');

  // Helper: check if session is expired
  const isSessionValid = (session) => {
    if (!session) return false;
    // expires_at is a UNIX timestamp in seconds
    if (session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      return session.expires_at > now;
    }
    // If expires_at is not present, fallback to true (legacy behavior)
    return true;
  };

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
    // We don't need to clear existing sessions on app start; instead, handle auth transitions
    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        // Check if session exists and is valid (not expired)
        if (session && session.user?.id && isSessionValid(session)) {
          setIsAuthenticated(true);
          await checkUserRole(session.user.id);
        } else {
          // If session is missing or expired, treat as not authenticated
          setIsAuthenticated(false);
          setUserRole('participant');
          // Optionally clear any stale session here if needed
        }
      } catch (error) {
        // Silent error handling
        setIsAuthenticated(false);
        setUserRole('participant');
      } finally {
        setIsLoading(false);
      }
    };

    
    initializeAuth();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Silent authentication - no console logs
      if (event === 'SIGNED_IN' && session && isSessionValid(session)) {
        setIsAuthenticated(true);
        if (session.user) {
          await checkUserRole(session.user.id);
        }
      } else if (event === 'SIGNED_OUT' || !isSessionValid(session)) {
        setIsAuthenticated(false);
        setUserRole('participant');
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
  console.log(`[DEBUG][${new Date().toISOString()}] AppNavigator - AppNavigator function executing`);
  
  // Test useRef availability
  try {
    console.log(`[DEBUG][${new Date().toISOString()}] AppNavigator - Testing useRef`);
    const testRef = useRef(null);
    console.log(`[DEBUG][${new Date().toISOString()}] AppNavigator - useRef is available`);
  } catch (error) {
    console.error(`[DEBUG][${new Date().toISOString()}] AppNavigator - useRef ERROR:`, error);
  }
  const { isAuthenticated, isLoading, userRole } = useAuth();

  if (isLoading) {
    // Show loading screen while loading user role/auth state
    return <LoadingScreen />;
  }

  // Customize initial route based on user role
  const getInitialRoute = () => {
    // Check if provider mode is active from AsyncStorage
    if (userRole === 'provider') {
      // For providers, start with ProviderStack
      return 'ProviderStack';
    } else {
      // For participants, start with MainApp (MainTabs)
      return 'MainApp';
    }
  };

  console.log(`[DEBUG][${new Date().toISOString()}] AppNavigator - About to return NavigationContainer`);
  
  return (
    <AppStateProvider>
      <NavigationContainer
          onStateChange={(state) => console.log(`[DEBUG][${new Date().toISOString()}] NavigationContainer - Navigation state changed:`, 
            state ? `Current route: ${state.routes[state.index]?.name}` : 'No state')}
          onReady={() => console.log(`[DEBUG][${new Date().toISOString()}] NavigationContainer - Navigation container is ready`)}
        >
        <NotificationProvider>
      <RootStack.Navigator 
        initialRouteName="Auth"
        screenOptions={{ headerShown: false }}
      >
        {/* Always show Auth stack first */}
        <RootStack.Screen 
          name="Auth" 
          component={AuthStack} 
          initialParams={{ isAuthenticated, userRole }}
        />
        <RootStack.Screen name="MainApp" component={MainTabs} />
        <RootStack.Screen name="ProviderStack" component={ProviderStackNavigator} />
        {/* Define detail screens here */}
        <RootStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
        <RootStack.Screen name="HousingDetail" component={HousingDetailScreen} />
        <RootStack.Screen name="EventDetail" component={EventDetailScreen} />
        <RootStack.Screen name="GroupDetail" component={GroupDetailScreen} />
        <RootStack.Screen name="HousingGroupDetailScreen" component={HousingGroupDetailScreen} />
        <RootStack.Screen name="CreateHousingGroup" component={CreateHousingGroupScreen} />
        <RootStack.Screen name="VideoScreen" component={VideoScreen} />
      </RootStack.Navigator>
        </NotificationProvider>
      </NavigationContainer>
    </AppStateProvider>
  );
}

export default AppNavigator;
