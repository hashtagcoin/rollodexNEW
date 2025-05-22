import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ProfileScreen from '../screens/Main/ProfileScreen';
import NDISScreen from '../screens/Main/NDISScreen';
import BookingDetailScreen from '../screens/Main/BookingDetailScreen';
import ServiceAgreementsScreen from '../screens/Main/ServiceAgreementsScreen';
import EditProfileScreen from '../screens/Main/EditProfileScreen';
import UserPostsFeedScreen from '../screens/Social/UserPostsFeedScreen';
import PostDetailScreen from '../screens/Social/PostDetailScreen';

const Stack = createStackNavigator();

const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
      <Stack.Screen name="NDISScreen" component={NDISScreen} />
      <Stack.Screen name="BookingDetailScreen" component={BookingDetailScreen} />
      <Stack.Screen name="ServiceAgreementsScreen" component={ServiceAgreementsScreen} />
      <Stack.Screen name="UserPostsFeedScreen" component={UserPostsFeedScreen} />
      <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
