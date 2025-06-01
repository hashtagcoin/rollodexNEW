import React from 'react';
import { View, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

// Import Provider Screens
import ProviderDashboardScreen from '../screens/Provider/ProviderDashboardScreen';
import ManageListingsScreen from '../screens/Provider/ManageListingsScreen';
import ProviderAppointmentsScreen from '../screens/Provider/ProviderAppointmentsScreen';
import ServiceAgreementsScreen from '../screens/Provider/ServiceAgreementsScreen';
import ProviderCalendarScreen from '../screens/Provider/ProviderCalendarScreen';
import AppointmentDetailScreen from '../screens/Provider/AppointmentDetailScreen';
import CreateServiceListingScreen from '../screens/Provider/CreateServiceListingScreen';
import CreateHousingListingScreen from '../screens/Provider/CreateHousingListingScreen';
import EditServiceListingScreen from '../screens/Provider/EditServiceListingScreen';
import EditHousingListingScreen from '../screens/Provider/EditHousingListingScreen';
import ServiceAgreementDetailScreen from '../screens/Provider/ServiceAgreementDetailScreen';
import CreateServiceAgreementScreen from '../screens/Provider/CreateServiceAgreementScreen';

// All screens have now been implemented!

const Stack = createStackNavigator();

const ProviderStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderDashboard" component={ProviderDashboardScreen} />
      <Stack.Screen name="ManageListings" component={ManageListingsScreen} />
      <Stack.Screen name="ProviderAppointments" component={ProviderAppointmentsScreen} />
      <Stack.Screen name="ServiceAgreements" component={ServiceAgreementsScreen} />
      <Stack.Screen name="ProviderCalendar" component={ProviderCalendarScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen name="CreateServiceListing" component={CreateServiceListingScreen} />
      <Stack.Screen name="CreateHousingListing" component={CreateHousingListingScreen} />
      <Stack.Screen name="EditServiceListing" component={EditServiceListingScreen} />
      <Stack.Screen name="EditHousingListing" component={EditHousingListingScreen} />
      <Stack.Screen name="CreateServiceAgreement" component={CreateServiceAgreementScreen} />
      <Stack.Screen name="ServiceAgreementDetail" component={ServiceAgreementDetailScreen} />
    </Stack.Navigator>
  );
};

export default ProviderStackNavigator;
