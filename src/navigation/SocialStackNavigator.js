import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SocialFeedScreen from '../screens/Main/SocialFeedScreen';
import HousingGroupsScreen from '../screens/Main/HousingGroupsScreen';
import EventsListScreen from '../screens/Main/EventsListScreen';
import UserPostsFeedScreen from '../screens/Social/UserPostsFeedScreen';
import PostDetailScreen from '../screens/Social/PostDetailScreen';

const Stack = createStackNavigator();

const SocialStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SocialFeedScreen" component={SocialFeedScreen} />
      <Stack.Screen name="HousingGroupsScreen" component={HousingGroupsScreen} />
      <Stack.Screen name="EventsListScreen" component={EventsListScreen} />
      <Stack.Screen name="UserPostsFeedScreen" component={UserPostsFeedScreen} />
      <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
    </Stack.Navigator>
  );
};

export default SocialStackNavigator;
