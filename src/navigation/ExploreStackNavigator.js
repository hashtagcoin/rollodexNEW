import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ProviderDiscoveryScreen from '../screens/Main/ProviderDiscoveryScreen';
import ServiceDetailScreen from '../screens/Details/ServiceDetailScreen'; // To be created
import HousingDetailScreen from '../screens/Details/HousingDetailScreen'; // To be created

const Stack = createStackNavigator();

const ExploreStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We use a custom header in MainTabs
      }}
    >
      <Stack.Screen name="ProviderDiscovery" component={ProviderDiscoveryScreen} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="HousingDetail" component={HousingDetailScreen} />
    </Stack.Navigator>
  );
};

export default ExploreStackNavigator;
