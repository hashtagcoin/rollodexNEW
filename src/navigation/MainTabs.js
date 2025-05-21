import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';

import Feather from 'react-native-vector-icons/Feather';
import Entypo from 'react-native-vector-icons/Entypo';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Octicons from 'react-native-vector-icons/Octicons';

import DashboardScreen from '../screens/Main/DashboardScreen';
import ExploreStackNavigator from './ExploreStackNavigator';
import WalletScreen from '../screens/Main/WalletScreen';
import SocialFeedScreen from '../screens/Main/SocialFeedScreen';
import FavouritesScreen from '../screens/Main/FavouritesScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';



const Tab = createBottomTabNavigator();

const DUMMY_USER_DATA = {
  name: 'James', 
};

const MainTabs = () => {
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
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.dispatch(
              CommonActions.navigate({
                name: route.name, 
                params: { screen: 'ProviderDiscovery' } 
              })
            );
          },
        })}
      />
      <Tab.Screen 
        name="Social" 
        component={SocialFeedScreen} 
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate(route.name);
          },
        })}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen} 
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate(route.name);
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
        component={ProfileScreen} 
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate(route.name);
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
