import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather'; 
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';


// Placeholder data - this would come from API/state
const userData = {
  name: 'James',
  walletBalance: '8,200',
  categories: [
    { name: 'Therapy', amount: '2,500.00' },
    { name: 'Support', amount: '2,800.50' }, 
    { name: 'Transport', amount: '1,400.00' },
    { name: 'Tech', amount: '1,500.00' },
  ],
  serviceFeed: {
    imageUri: null, 
    title: 'In-Home Care Assistance',
    fundingInfo: 'Funding available • ★ 4.7',
  }
};

const dummyAppointments = [
  { id: '1', service: 'Physio Therapy', date: 'May 24', time: '10:00 AM', provider: 'MoveWell Clinic', note: 'Bring referral form.' },
  { id: '2', service: 'Speech Pathology', date: 'May 25', time: '2:00 PM', provider: 'TalkRight', note: 'Session 3 of 6.' },
  { id: '3', service: 'Support Worker', date: 'May 27', time: '9:00 AM', provider: 'CareCo', note: 'Meet at home.' },
  { id: '4', service: 'OT Assessment', date: 'May 29', time: '1:30 PM', provider: 'Active OT', note: 'Initial consult.' },
];

const DashboardScreen = () => {
  const { profile } = useUser();
  const scrollViewRef = useRef(null);
  
  // Use useFocusEffect to scroll to top when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // When the screen is focused, scroll to top
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }
      return () => {};
    }, [])
  );
  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.screenContainer} 
      showsVerticalScrollIndicator={false}>
      <View style={styles.contentContainer}>
        {/* Top Bar with Logo and Avatar */}
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.topRightContainer}>
            <TouchableOpacity style={{ marginRight: 12 }}>
              <Ionicons name="notifications-outline" size={26} color="#222" />
            </TouchableOpacity>
            <View style={styles.avatarContainer}>
              <Image
                source={
                  profile?.avatar_url
                    ? { uri: profile.avatar_url }
                    : require('../../assets/images/placeholder-avatar.jpg')
                }
                style={styles.avatar}
              />
            </View>
          </View>
        </View>

        {/* Welcome Header */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitleText}>Welcome back,</Text>
          <Text style={styles.userNameText}>{profile?.full_name || profile?.username || userData.name}</Text>
        </View>

        {/* Financial Information Group */}
        <View style={styles.financialGroup}>
          {/* Wallet Card */}
          <LinearGradient
            colors={['#3A76F0', '#1E90FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.walletCard}
          >
            <View style={styles.walletCardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="wallet-outline" size={22} color="rgba(255,255,255,0.9)" style={{ marginRight: 8 }} />
                <Text style={styles.walletCardTitle}>Wallet Balance</Text>
              </View>
              <Text style={styles.walletCardBalance}>${parseInt(userData.walletBalance.replace(/[^\d]/g, ''), 10).toLocaleString()}</Text>
              <View style={styles.balanceCardChip}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.white} />
                <Text style={styles.balanceCardChipText}>Updated Today</Text>
              </View>
            </View>
            <View style={styles.walletCardIllustration}>
              <Ionicons name="wallet" size={36} color="rgba(255,255,255,0.2)" />
            </View>
          </LinearGradient>
          
          {/* Category Pills */}
          <View style={styles.categoryCard}>
            <FlatList
              data={userData.categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.name}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item, index }) => {
                // Alternating colors for categories
                const colorMap = ['#007AFF', '#34C759', '#FF9500', '#5856D6'];
                const color = colorMap[index % colorMap.length];
                
                return (
                  <View style={[styles.categoryPill, { borderColor: color + '30' }]}>
                    <Text style={[styles.categoryPillName, { color }]}>{item.name}</Text>
                    <Text style={styles.categoryPillAmount}>${Math.floor(Number(item.amount.replace(/,/g, ''))).toLocaleString()}</Text>
                  </View>
                );
              }}
            />
          </View>

          {/* Funding Expiry Notification */}
          <View style={styles.expiryNotification}>
            <Feather name="alert-triangle" size={18} color="#FFA500" style={{ marginRight: 8 }} />
            <Text style={styles.expiryNotificationText}>
              Some of your funding categories are expiring soon. <Text style={{fontWeight:'bold'}}>Check details</Text>
            </Text>
          </View>
        </View>
        
        {/* Upcoming Appointments Carousel */}
        <Text style={styles.carouselTitle}>Upcoming Appointments</Text>
        <FlatList
          data={dummyAppointments}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.carouselList}
          renderItem={({ item }) => (
            <View style={styles.appointmentCard}>
              <Text style={styles.appointmentService}>{item.service}</Text>
              <Text style={styles.appointmentDate}>{item.date} • {item.time}</Text>
              <Text style={styles.appointmentProvider}>{item.provider}</Text>
              <Text style={styles.appointmentNote}>{item.note}</Text>
            </View>
          )}
        />

        {/* Bookings/Events Card */}
        <View style={styles.bookingsCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' }}
            style={styles.bookingsImage}
          />
          <View style={styles.bookingsContent}>
            <Text style={styles.bookingsTitle}>{userData.serviceFeed.title}</Text>
            <Text style={styles.bookingsFunding}>{userData.serviceFeed.fundingInfo}</Text>
            <TouchableOpacity style={styles.bookingsBtn}>
              <Text style={styles.bookingsBtnText}>View Details</Text>
              <Feather name="chevron-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard}>
            <AntDesign name="clockcircleo" size={22} color={'#007AFF'} style={styles.actionCardIcon} />
            <Text style={styles.actionCardText}>Reorder last service</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <MaterialIcons name="people-outline" size={24} color={'#007AFF'} style={styles.actionCardIcon} />
            <Text style={styles.actionCardText}>Your Matches</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  carouselTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  carouselList: {
    paddingBottom: 10,
    paddingLeft: 4,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 14,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#222',
    marginBottom: 2,
  },
  appointmentProvider: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  appointmentNote: {
    fontSize: 13,
    color: '#888',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Changed to white background
    paddingHorizontal: 0,
    paddingTop: 56,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 5,
  },
  logoContainer: {
    justifyContent: 'flex-start',
  },
  logo: {
    height: 40,
    width: 120,
  },
  topRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeContainer: {
    marginBottom: 18,
  },
  financialGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  expiryNotification: {
    backgroundColor: '#FFF9E6', // Light yellow background
    borderRadius: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#FFECB3',
  },
  expiryNotificationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  welcomeTitleText: {
    fontSize: 18,
    color: '#888',
    fontWeight: '600',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
  },
  avatarContainer: {
    marginLeft: 10,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#eaeaea',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  walletCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 0,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  walletCardContent: {
    flex: 3,
    padding: 18,
  },
  walletCardIllustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  walletCardBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  balanceCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  balanceCardChipText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  categoryList: {
    paddingRight: 8,
  },
  categoryPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
  },
  categoryPillName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 2,
  },
  categoryPillAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  expiryIcon: {
    marginRight: 12,
  },
  expiryText: {
    fontSize: 15,
    color: '#b88900',
    flex: 1,
  },
  bookingsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  bookingsImage: {
    width: 94,
    height: 94,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: '#eaeaea',
  },
  bookingsContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  bookingsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  bookingsFunding: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  bookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  bookingsBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginRight: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 14,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionCardIcon: {
    marginBottom: 6,
  },
  actionCardText: {
    fontWeight: '600',
    color: '#222',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default DashboardScreen;
