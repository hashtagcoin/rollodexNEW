import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WalletScreen from '../screens/Main/WalletScreen';
import SubmitClaimScreen from '../screens/Claims/SubmitClaimScreen';
import ViewClaimsScreen from '../screens/Claims/ViewClaimsScreen';
import BookingsScreen from '../screens/Main/BookingsScreen';
import BookingDetailScreen from '../screens/Main/BookingDetailScreen';
import AddPaymentMethodScreen from '../screens/Main/AddPaymentMethodScreen';
import AppHeader from '../components/layout/AppHeader'; // Optional: if you want consistent headers

const Stack = createStackNavigator();

const WalletStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="WalletMain"
      screenOptions={{
        // headerShown: false, // You can control header visibility per screen or globally
      }}
    >
      <Stack.Screen
        name="WalletMain"
        component={WalletScreen}
        options={{ headerShown: false }} // WalletScreen already has AppHeader
      />
      <Stack.Screen
        name="SubmitClaimScreen"
        component={SubmitClaimScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              title="Submit New Claim"
              navigation={navigation}
              canGoBack={true} // Enables the back button
            />
          ),
        })}
      />
      <Stack.Screen
        name="ViewClaimsScreen"
        component={ViewClaimsScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              title="My Claims"
              navigation={navigation}
              canGoBack={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="BookingsScreen"
        component={BookingsScreen}
        options={{ headerShown: false }} // BookingsScreen already has AppHeader
      />
      <Stack.Screen
        name="BookingDetailScreen"
        component={BookingDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              title="Booking Details"
              navigation={navigation}
              canGoBack={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="BookingHistoryScreen"
        component={BookingsScreen}
        initialParams={{ initialTab: 'past' }}
        options={{ headerShown: false }} // BookingsScreen already has AppHeader
      />
      <Stack.Screen
        name="AddPaymentMethod"
        component={AddPaymentMethodScreen}
        options={{ headerShown: false }} // AddPaymentMethodScreen has AppHeader
      />
    </Stack.Navigator>
  );
};

export default WalletStackNavigator;
