import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList } from 'react-native';
import Feather from 'react-native-vector-icons/Feather'; 
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AntDesign } from '@expo/vector-icons';


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
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.welcomeTitleText}>Welcome back,</Text>
            <Text style={styles.userNameText}>{userData.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <TouchableOpacity style={{ marginRight: 8 }}>
              <Ionicons name="notifications-outline" size={26} color="#222" />
            </TouchableOpacity>
            <View style={styles.avatarContainer}>
              <Image
                source={require('../../assets/images/placeholder-avatar.jpg')}
                style={styles.avatar}
              />
            </View>
          </View>
        </View>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="wallet-outline" size={26} color="#00A36C" style={{ marginRight: 10 }} />
            <Text style={styles.walletCardTitle}>Wallet Balance</Text>
          </View>
          <Text style={styles.walletCardBalance}>${parseInt(userData.walletBalance.replace(/[^\d]/g, ''), 10).toLocaleString()}</Text>
          <FlatList
            data={userData.categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.name}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillName}>{item.name}</Text>
                <Text style={styles.categoryPillAmount}>${Math.floor(Number(item.amount.replace(/,/g, ''))).toLocaleString()}</Text>
              </View>
            )}
          />
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
        {/* Expiry Reminder Card */}
          <Feather name="alert-triangle" size={22} color="#FFA500" style={styles.expiryIcon} />
          <Text style={styles.expiryText}>Some of your funding categories are expiring soon. <Text style={{fontWeight:'bold'}}>Check details</Text></Text>
        </View>

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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 0,
    paddingTop: 56,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
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
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  walletCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#00A36C',
  },
  walletCardBalance: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  categoryList: {
    marginTop: 2,
    paddingVertical: 2,
  },
  categoryPill: {
    backgroundColor: '#f3f6fa',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  categoryPillName: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  categoryPillAmount: {
    fontSize: 15,
    color: '#222',
    fontWeight: 'bold',
  },
  expiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
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
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
    marginTop: 10,
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
    paddingVertical: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
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
