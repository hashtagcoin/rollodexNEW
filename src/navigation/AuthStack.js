import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SignInScreen from '../screens/Auth/SignInScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import SplashScreen from '../screens/Auth/SplashScreen';
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import RoleSelectionScreen from '../screens/Auth/RoleSelectionScreen';
import ParticipantOnboarding from '../screens/Auth/ParticipantOnboarding';
import ProviderOnboarding from '../screens/Auth/ProviderOnboarding';
import OnboardingSuccess from '../screens/Auth/OnboardingSuccess';

const Stack = createStackNavigator();

const AuthStack = ({ route }) => {
  const { isAuthenticated, userRole } = route.params || {};
  
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animationEnabled: false // Disable default animations for smoother custom transitions
      }}
      initialRouteName="Splash"
    >
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen} 
        initialParams={{ isAuthenticated, userRole }}
      />
      <Stack.Screen 
        name="WelcomeScreen" 
        component={WelcomeScreen} 
        initialParams={{ isAuthenticated, userRole }}
      />
      <Stack.Screen 
        name="RoleSelection" 
        component={RoleSelectionScreen} 
        initialParams={{ isAuthenticated, userRole }}
      />
      <Stack.Screen 
        name="ParticipantOnboarding" 
        component={ParticipantOnboarding} 
        initialParams={{ isAuthenticated, userRole }}
      />
      <Stack.Screen 
        name="ProviderOnboarding" 
        component={ProviderOnboarding} 
        initialParams={{ isAuthenticated, userRole }}
      />
      <Stack.Screen 
        name="OnboardingSuccess" 
        component={OnboardingSuccess} 
        initialParams={{ isAuthenticated, userRole }}
      />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;
