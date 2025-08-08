import React, { useRef } from 'react';
// import { useGlobalHooks } from '../hooks/GlobalHooksProvider'; // This was imported but not used
import { View, Text } from 'react-native'; // View, Text imported but not used directly in this file's JSX
import { createStackNavigator } from '@react-navigation/stack';
import ChatButtonOverlay from '../components/chat/ChatButtonOverlay';

// Import Provider Screens
import ProviderDashboardScreen from '../screens/Provider/ProviderDashboardScreen';
import ManageListingsScreen from '../screens/Provider/ManageListingsScreen';
import ProviderAppointmentsScreen from '../screens/Provider/ProviderAppointmentsScreen';
import ServiceAgreementsScreen from '../screens/Provider/ServiceAgreementsScreen';
import ModernProviderCalendarScreen from '../screens/Provider/ModernProviderCalendarScreen';
import AppointmentDetailScreen from '../screens/Provider/AppointmentDetailScreen';
import CreateServiceListingScreen from '../screens/Provider/CreateServiceListingScreen';
import CreateHousingListingScreen from '../screens/Provider/CreateHousingListingScreen';
import EditServiceListingScreen from '../screens/Provider/EditServiceListingScreen';

import EditHousingListingScreen from '../screens/Provider/EditHousingListingScreen';
import ServiceAgreementDetailScreen from '../screens/Provider/ServiceAgreementDetailScreen';
import CreateServiceAgreementScreen from '../screens/Provider/CreateServiceAgreementScreen';

// All screens have now been implemented!

// REMOVED: Misplaced console.log and global useRef assignment
// if (!global.ReactHooks || !global.ReactHooks.useRef) {
//   console.log('[DEBUG] Setting up global useRef in ProviderStackNavigator');
//   global.useRef = useRef;
// }

const Stack = createStackNavigator();

const ProviderStackNavigator = () => {
  // REMOVED: Debug console.logs
  // console.log(`[DEBUG][${new Date().toISOString()}] ProviderStackNavigator - Component rendering`);
  
  // try {
  //   const testRef = useRef(null);
  //   console.log(`[DEBUG][${new Date().toISOString()}] ProviderStackNavigator - useRef is available`);
  // } catch (error) {
  //   console.error(`[DEBUG][${new Date().toISOString()}] ProviderStackNavigator - useRef ERROR:`, error);
  // }
  return (
    <ChatButtonOverlay>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ProviderDashboard" component={ProviderDashboardScreen} />
        <Stack.Screen name="ManageListings" component={ManageListingsScreen} />
        <Stack.Screen name="ProviderAppointments" component={ProviderAppointmentsScreen} />
        <Stack.Screen name="ServiceAgreements" component={ServiceAgreementsScreen} />
        <Stack.Screen name="ProviderCalendar" component={ModernProviderCalendarScreen} />
        <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
        <Stack.Screen name="CreateServiceListing" component={CreateServiceListingScreen} />
        <Stack.Screen name="CreateHousingListing" component={CreateHousingListingScreen} />
        <Stack.Screen name="EditServiceListing" component={EditServiceListingScreen} />
        <Stack.Screen name="EditHousingListing" component={EditHousingListingScreen} />
        <Stack.Screen name="CreateServiceAgreement" component={CreateServiceAgreementScreen} />
        <Stack.Screen name="ServiceAgreementDetail" component={ServiceAgreementDetailScreen} />
      </Stack.Navigator>
    </ChatButtonOverlay>
  );
};

export default ProviderStackNavigator;
