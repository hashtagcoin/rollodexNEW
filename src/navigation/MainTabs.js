import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Feather, Entypo, AntDesign, Octicons } from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

// Import screens
import DashboardScreen from '../screens/Main/DashboardScreen';
import ExploreStackNavigator from './ExploreStackNavigator';
import WalletStackNavigator from './WalletStackNavigator';
import SocialStackNavigator from './SocialStackNavigator';
import FavouritesScreen from '../screens/Main/FavouritesScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import GroupsListScreen from '../screens/Main/GroupsListScreen';
import GroupDetailScreen from '../screens/Main/GroupDetailScreen';
import CreateGroupPostScreen from '../screens/Main/CreateGroupPostScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') return <Feather name="home" size={size} color={color} />;
          if (route.name === 'Explore') return <Feather name="search" size={size} color={color} />;
          if (route.name === 'Wallet') return <Entypo name="wallet" size={size} color={color} />;
          if (route.name === 'Social') return <Feather name="message-square" size={size} color={color} />;
          if (route.name === 'Favourites') return <AntDesign name="hearto" size={size} color={color} />;
          if (route.name === 'Profile') return <Octicons name="person" size={size} color={color} />;
          return null;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen 
        name="Explore" 
        component={ExploreStackNavigator} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Reset the stack to first screen in the stack (ProviderDiscovery)
            navigation.navigate('Explore', {
              screen: 'ProviderDiscovery'
            });
          },
        })}
      />
      <Tab.Screen name="Social" component={SocialStackNavigator} />
      <Tab.Screen 
        name="Wallet" 
        component={WalletStackNavigator} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Reset the stack to WalletMain screen
            navigation.navigate('Wallet', {
              screen: 'WalletMain'
            });
          },
        })}
      />
      <Tab.Screen name="Favourites" component={FavouritesScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};

const MainTabs = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={TabNavigator} />
    <Stack.Screen name="GroupsListScreen" component={GroupsListScreen} />
    <Stack.Screen 
      name="CreateGroupPostScreen" 
      component={CreateGroupPostScreen}
      options={{ presentation: 'modal' }}
    />
  </Stack.Navigator>
);

export default MainTabs;
