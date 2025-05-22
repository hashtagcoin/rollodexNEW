import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ProviderDiscoveryScreen from '../screens/Main/ProviderDiscoveryScreen';
import ServiceDetailScreen from '../screens/Details/ServiceDetailScreen';
import HousingDetailScreen from '../screens/Details/HousingDetailScreen';
import CreateBookingScreen from '../screens/Bookings/CreateBookingScreen';
import ServiceAgreementScreen from '../screens/Agreements/ServiceAgreementScreen';

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
      <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
      <Stack.Screen name="ServiceAgreement" component={ServiceAgreementScreen} />
    </Stack.Navigator>
  );
};

export default ExploreStackNavigator;
