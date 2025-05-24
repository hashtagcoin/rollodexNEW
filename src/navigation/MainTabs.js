import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';

import Feather from 'react-native-vector-icons/Feather';
import Entypo from 'react-native-vector-icons/Entypo';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Octicons from 'react-native-vector-icons/Octicons';

import DashboardScreen from '../screens/Main/DashboardScreen';
import ExploreStackNavigator from './ExploreStackNavigator';
import WalletStackNavigator from './WalletStackNavigator';
import SocialFeedScreen from '../screens/Main/SocialFeedScreen';
import SocialStackNavigator from './SocialStackNavigator';
import FavouritesScreen from '../screens/Main/FavouritesScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import GroupsListScreen from '../screens/Main/GroupsListScreen';
import GroupDetailScreen from '../screens/Main/GroupDetailScreen';

import { createStackNavigator } from '@react-navigation/stack';

const Tab = createBottomTabNavigator();

const DUMMY_USER_DATA = {
  name: 'James', 
};

const Stack = createStackNavigator();

const MainTabsTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconComponent;

          if (route.name === 'Home') {
            iconComponent = <Feather name="home" size={size} color={color} />;
          } else if (route.name === 'Explore') {
            iconComponent = <Feather name="search" size={size} color={color} />;
          } else if (route.name === 'Wallet') {
            iconComponent = <Entypo name="wallet" size={size} color={color} />;
          } else if (route.name === 'Social') {
            iconComponent = <Feather name="message-square" size={size} color={color} />; 
          } else if (route.name === 'Favourites') {
            iconComponent = <AntDesign name="hearto" size={size} color={color} />;
          } else if (route.name === 'Profile') {
            iconComponent = <Octicons name="person" size={size} color={color} />;
          }
          return iconComponent;
        },
        tabBarActiveTintColor: 'tomato', 
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // Ensure no header is shown for any tab
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate(route.name);
          },
        })}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreStackNavigator} 
        // Optimized navigation to prevent remounting
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            // Prevent default behavior which could cause remounting
            e.preventDefault();
            // Navigate to the route but don't reset the stack
            navigation.navigate(route.name, {
              screen: 'ProviderDiscovery',
              // Don't pass initialCategory here - let component handle it internally
              params: {},
              merge: true, // Merge params instead of replacing
            });
          },
        })}
      />
      <Tab.Screen 
        name="Social" 
        component={SocialStackNavigator} 
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate(route.name);
          },
        })}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletStackNavigator} 
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate(route.name, {
              screen: 'WalletMain', 
              // params: { /* any params */ },
            });
          },
        })}
      />
      <Tab.Screen 
        name="Favourites" 
        component={FavouritesScreen} 
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate(route.name);
          },
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator} 
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            navigation.navigate(route.name);
          },
        })}
      />
    </Tab.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabsTabs" component={MainTabsTabs} />
      <Stack.Screen name="GroupsListScreen" component={GroupsListScreen} />
      <Stack.Screen name="GroupDetailScreen" component={GroupDetailScreen} />
    </Stack.Navigator>
  );
};

export default MainTabs;
