import React from 'react';
import ManageListingsScreen from './ManageListingsScreen';

// This is a wrapper component that allows ManageListingsScreen to be used
// inside the MainTabs navigator (with the bottom tab bar visible)
const TabManageListingsScreen = ({ navigation, route }) => {
  return <ManageListingsScreen navigation={navigation} route={route} />;
};

export default TabManageListingsScreen;
