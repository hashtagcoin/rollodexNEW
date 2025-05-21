import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign'; 
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; 
import Feather from 'react-native-vector-icons/Feather'; 

// Placeholder data - this would come from API/state
const userData = {
  name: 'James', // This name will be used by the global AppHeader via MainTabs
  walletBalance: '8,200.50',
  categories: [
    { name: 'Therapy', amount: '2,500.00' },
    { name: 'Support', amount: '2,800.50' }, // Corrected amount from image
    { name: 'Transport', amount: '1,400.00' },
    { name: 'Tech', amount: '1,500.00' },
  ],
  serviceFeed: {
    imageUri: null, // Add a placeholder image or logic to load one
    title: 'In-Home Care Assistance',
    fundingInfo: 'Funding available • ★ 4.7',
  }
};

const DashboardScreen = () => {
  return (
    <ScrollView style={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeTitleText}>Welcome, {userData.name}</Text>
          <View style={styles.avatarContainer}>
            <Image 
              source={require('../../assets/images/placeholder-avatar.jpg')} 
              style={styles.avatar}
            />
          </View>
        </View>

        {/* Wallet Balance Card */}
        <View style={styles.card}>
          <Text style={styles.walletTitle}>Wallet Balance</Text>
          <Text style={styles.walletBalance}>${userData.walletBalance}</Text>
          <Text style={styles.categoryBreakdownText}>Category breakdown</Text>
          {userData.categories.map((cat, index) => (
            <View key={index} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.categoryAmount}>${cat.amount}</Text>
            </View>
          ))}
        </View>

        {/* Expiry Reminders */}
        <View style={styles.expiryContainer}>
          <Feather name="alert-triangle" size={20} color="#FFA500" style={styles.expiryIcon} />
          <Text style={styles.expiryText}>Expiry reminders</Text>
        </View>

        {/* Dynamic Service Feed */}
        <Text style={styles.feedTitle}>Bookings</Text>
        <View style={[styles.card, styles.serviceCard]}>
          {/* Placeholder for Image - ideally use an <Image> component */}
          <View style={styles.serviceImagePlaceholder}>
            <Text>Service Image Here</Text>
          </View>
          <Text style={styles.serviceTitle}>{userData.serviceFeed.title}</Text>
          <Text style={styles.serviceFunding}>{userData.serviceFeed.fundingInfo}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <View>
              <AntDesign name="clockcircleo" size={22} color={'#333'} style={styles.actionButtonIcon} />
              <Text style={styles.actionButtonText}>Reorder last service</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View>
              <MaterialIcons name="people-outline" size={24} color={'#333'} style={styles.actionButtonIcon} />
              <Text style={styles.actionButtonText}>Your Matches</Text>
              <Text style={styles.actionButtonSubText}>(based on preferences)</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3', 
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20, // Added top padding for breathing room
    paddingBottom: 20, // Added for consistency
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  avatarContainer: {
    marginLeft: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  walletTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  walletBalance: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00A36C', // A green color from the image
    marginBottom: 10,
  },
  categoryBreakdownText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
  },
  categoryAmount: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF3E0', // Light orange background for warning
    borderRadius: 8,
    marginBottom: 20,
  },
  expiryIcon: {
    // fontSize: 18, // Size controlled by Icon component
    marginRight: 10,
  },
  expiryText: {
    fontSize: 14,
    color: '#856404', // Darker yellow/brown for text
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  serviceCard: {
    // Specific styles for service card if needed
  },
  serviceImagePlaceholder: {
    height: 150,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  serviceFunding: {
    fontSize: 13,
    color: '#555',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#E9E9E9', // Light grey, adjust as needed
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center', // Added to better center icon and text
  },
  actionButtonIcon: {
    // fontSize: 20, // Size is now controlled by the Icon component's size prop
    marginBottom: 8, // Adjusted spacing
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionButtonSubText: {
    fontSize: 10,
    color: '#777',
    textAlign: 'center',
  }
});

export default DashboardScreen;
