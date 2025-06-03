import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SocialFeedScreen from '../screens/Main/SocialFeedScreen';
import GroupsListScreen from '../screens/Main/GroupsListScreen';
import HousingGroupsScreen from '../screens/Main/HousingGroupsScreen';
import EventsListScreen from '../screens/Main/EventsListScreen';
import UserPostsFeedScreen from '../screens/Social/UserPostsFeedScreen';
import PostDetailScreen from '../screens/Social/PostDetailScreen';
import HousingGroupDetailScreen from '../screens/Main/HousingGroupDetailScreen';
import GroupDetailScreen from '../screens/Main/GroupDetailScreen';
import EditGroupScreen from '../screens/Groups/EditGroupScreen';
import CreateSocialGroupScreen from '../screens/Groups/CreateSocialGroupScreen';

const Stack = createStackNavigator();

const SocialStackNavigator = () => {
  // Set GroupsList as the initial route

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="GroupsList">
      <Stack.Screen name="GroupsList" component={GroupsListScreen} />
      <Stack.Screen name="SocialFeedScreen" component={SocialFeedScreen} />
      <Stack.Screen name="HousingGroupsScreen" component={HousingGroupsScreen} />
      <Stack.Screen name="EventsListScreen" component={EventsListScreen} />
      <Stack.Screen name="UserPostsFeedScreen" component={UserPostsFeedScreen} />
      <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
      <Stack.Screen name="HousingGroupDetailScreen" component={HousingGroupDetailScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="EditGroup" component={EditGroupScreen} />
      <Stack.Screen name="CreateSocialGroup" component={CreateSocialGroupScreen} />
    </Stack.Navigator>
  );
};

export default SocialStackNavigator;
