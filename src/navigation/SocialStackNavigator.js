import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SocialFeedScreen from '../screens/Main/SocialFeedScreen';
import HousingGroupsScreen from '../screens/Main/HousingGroupsScreen';
import EventsListScreen from '../screens/Main/EventsListScreen';
import UserPostsFeedScreen from '../screens/Social/UserPostsFeedScreen';
import PostDetailScreen from '../screens/Social/PostDetailScreen';
import HousingGroupDetailScreen from '../screens/Main/HousingGroupDetailScreen';
import GroupDetailScreen from '../screens/Main/GroupDetailScreen';

const Stack = createStackNavigator();

const SocialStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SocialFeedScreen" component={SocialFeedScreen} />
      <Stack.Screen name="HousingGroupsScreen" component={HousingGroupsScreen} />
      <Stack.Screen name="EventsListScreen" component={EventsListScreen} />
      <Stack.Screen name="UserPostsFeedScreen" component={UserPostsFeedScreen} />
      <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
      <Stack.Screen name="HousingGroupDetailScreen" component={HousingGroupDetailScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
    </Stack.Navigator>
  );
};

export default SocialStackNavigator;
