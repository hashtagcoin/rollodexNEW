import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const NAV_ITEMS = [
  {
    label: 'Home',
    icon: (focused) => <Feather name="home" size={24} color={focused ? '#007AFF' : '#888'} />,
    route: 'DashboardScreen',
  },
  {
    label: 'Discover',
    icon: (focused) => <Feather name="search" size={24} color={focused ? '#007AFF' : '#888'} />,
    route: 'ProviderDiscoveryScreen',
  },
  {
    label: 'Bookings',
    icon: (focused) => <MaterialIcons name="event-available" size={24} color={focused ? '#007AFF' : '#888'} />,
    route: 'BookingsScreen',
  },
  {
    label: 'Groups',
    icon: (focused) => <FontAwesome5 name="users" size={22} color={focused ? '#007AFF' : '#888'} />,
    route: 'GroupsScreen',
  },
  {
    label: 'Profile',
    icon: (focused) => <Feather name="user" size={24} color={focused ? '#007AFF' : '#888'} />,
    route: 'ProfileScreen',
  },
];

export default function BottomNavbar() {
  const navigation = useNavigation();
  const route = useRoute();

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const focused = route.name === item.route;
        return (
          <TouchableOpacity
            key={item.label}
            style={styles.navItem}
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.7}
          >
            {item.icon(focused)}
            <Text style={[styles.label, focused && styles.labelFocused]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 10,
    paddingBottom: 12,
    paddingTop: 6,
    height: 62,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 7,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelFocused: {
    color: '#007AFF',
    fontWeight: '700',
  },
});
