import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { Ionicons, Feather } from '@expo/vector-icons';

// Placeholder data
const planSummary = {
  planNumber: 'NDIS-2025-12345',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  status: 'Active',
};

const agreements = [
  { id: '1', title: 'Therapy Services', provider: 'Physio Clinic', status: 'Signed', expiry: '2025-11-15' },
  { id: '2', title: 'Support Coordination', provider: 'Care Connect', status: 'Pending', expiry: '2025-09-01' },
];

const goals = [
  { id: 'g1', title: 'Improve mobility', progress: 0.7 },
  { id: 'g2', title: 'Increase social participation', progress: 0.4 },
  { id: 'g3', title: 'Daily living skills', progress: 0.9 },
];

const wallet = {
  core_support: 8000,
  capacity_building: 5000,
  capital_support: 2000,
  expiry: '2025-12-31',
};

const claims = [
  { id: 'c1', amount: 120, status: 'Pending', created_at: '2025-05-10' },
  { id: 'c2', amount: 85, status: 'Approved', created_at: '2025-04-20' },
];

const bookings = [
  { id: 'b1', title: 'Physio Appointment', date: '2025-06-01', provider: 'Physio Clinic' },
  { id: 'b2', title: 'Support Meeting', date: '2025-06-10', provider: 'Care Connect' },
];

const documents = [
  { id: 'd1', name: 'NDIS Plan.pdf', url: '#' },
  { id: 'd2', name: 'Service Agreement.pdf', url: '#' },
];

const notifications = [
  { id: 'n1', message: 'Service Agreement expiring soon', type: 'alert' },
  { id: 'n2', message: 'Claim approved', type: 'info' },
];

const NDISScreen = ({ navigation }) => {
  return (
    <View style={styles.screenContainer}>
      <AppHeader title="NDIS" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Plan Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="document-text-outline" size={26} color="#3B82F6" />
            <Text style={styles.cardTitle}>NDIS Plan</Text>
            <TouchableOpacity style={styles.cardActionBtn}><Feather name="upload" size={20} color="#3B82F6" /></TouchableOpacity>
          </View>
          <Text style={styles.planNumber}>{planSummary.planNumber}</Text>
          <Text style={styles.planDates}>{planSummary.startDate} - {planSummary.endDate}</Text>
          <Text style={styles.planStatus}>{planSummary.status}</Text>
        </View>
        {/* Agreements */}
        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:2}}>
          <Text style={styles.sectionTitle}>Service Agreements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ServiceAgreementsScreen')} style={styles.viewAllBtn}>
            <Text style={styles.viewAllBtnText}>View All</Text>
          </TouchableOpacity>
        </View>
        {agreements.map(ag => (
          <View key={ag.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="document-attach-outline" size={22} color="#F59E42" />
              <Text style={styles.cardTitle}>{ag.title}</Text>
              <Text style={[styles.agreementStatus, ag.status === 'Signed' ? styles.signed : styles.pending]}>{ag.status}</Text>
            </View>
            <Text style={styles.cardSubText}>{ag.provider}</Text>
            <Text style={styles.cardSubText}>Expiry: {ag.expiry}</Text>
            <View style={styles.agreementActionsRow}>
              <TouchableOpacity style={styles.agreementBtn}><Text style={styles.agreementBtnText}>E-sign</Text></TouchableOpacity>
              <TouchableOpacity style={styles.agreementBtn}><Text style={styles.agreementBtnText}>Download</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        {/* Goals */}
        <Text style={styles.sectionTitle}>Goals</Text>
        <FlatList
          data={goals}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.goalsList}
          renderItem={({ item }) => (
            <View style={styles.goalCard}>
              <Text style={styles.goalTitle}>{item.title}</Text>
              <View style={styles.goalProgressBarBg}>
                <View style={[styles.goalProgressBarFill, { width: `${item.progress * 100}%` }]} />
              </View>
              <Text style={styles.goalProgressText}>{Math.round(item.progress * 100)}%</Text>
              <TouchableOpacity style={styles.goalActionBtn}><Text style={styles.goalActionBtnText}>Edit</Text></TouchableOpacity>
            </View>
          )}
        />
        {/* Wallet & Claims */}
        <Text style={styles.sectionTitle}>Wallet & Claims</Text>
        <View style={styles.card}>
          <View style={styles.walletRow}><Text style={styles.walletCategory}>Core Support</Text><Text style={styles.walletAmount}>${wallet.core_support}</Text></View>
          <View style={styles.walletRow}><Text style={styles.walletCategory}>Capacity Building</Text><Text style={styles.walletAmount}>${wallet.capacity_building}</Text></View>
          <View style={styles.walletRow}><Text style={styles.walletCategory}>Capital Support</Text><Text style={styles.walletAmount}>${wallet.capital_support}</Text></View>
          <Text style={styles.walletExpiry}>Expiry: {wallet.expiry}</Text>
          <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
            <Text style={styles.walletClaimsTitle}>Recent Claims</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Wallet', { screen: 'ViewClaimsScreen' })} style={styles.viewAllBtn}>
              <Text style={styles.viewAllBtnText}>View All</Text>
            </TouchableOpacity>
          </View>
          {claims.map(claim => (
            <View key={claim.id} style={styles.claimRow}>
              <Text style={styles.claimAmount}>${claim.amount}</Text>
              <Text style={[styles.claimStatus, claim.status === 'Approved' ? styles.claimApproved : styles.claimPending]}>{claim.status}</Text>
              <Text style={styles.claimDate}>{claim.created_at}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.claimActionBtn} onPress={() => navigation.navigate('Wallet', { screen: 'SubmitClaimScreen' })}>
            <Text style={styles.claimActionBtnText}>Submit New Claim</Text>
          </TouchableOpacity>
        </View>
        {/* Bookings */}
        <Text style={styles.sectionTitle}>Bookings</Text>
        {bookings.map(booking => (
          <View key={booking.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="calendar-outline" size={22} color="#10B981" />
              <Text style={styles.cardTitle}>{booking.title}</Text>
            </View>
            <Text style={styles.cardSubText}>{booking.provider}</Text>
            <Text style={styles.cardSubText}>Date: {booking.date}</Text>
            <TouchableOpacity style={styles.bookingActionBtn}><Text style={styles.bookingActionBtnText}>View</Text></TouchableOpacity>
          </View>
        ))}
        {/* Documents */}
        <Text style={styles.sectionTitle}>Documents</Text>
        <View style={styles.card}>
          {documents.map(doc => (
            <View key={doc.id} style={styles.documentRow}>
              <Ionicons name="document-outline" size={20} color="#6366F1" />
              <Text style={styles.documentName}>{doc.name}</Text>
              <TouchableOpacity style={styles.documentViewBtn}><Text style={styles.documentViewBtnText}>View</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.uploadDocBtn}><Text style={styles.uploadDocBtnText}>Upload New Document</Text></TouchableOpacity>
        </View>
        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        {notifications.map(note => (
          <View key={note.id} style={[styles.notificationRow, note.type === 'alert' ? styles.notificationAlert : styles.notificationInfo]}>
            <Ionicons name={note.type === 'alert' ? 'alert-circle-outline' : 'information-circle-outline'} size={20} color={note.type === 'alert' ? '#F87171' : '#3B82F6'} />
            <Text style={styles.notificationText}>{note.message}</Text>
          </View>
        ))}
      </ScrollView>
      {/* BottomNavbar should be included if app uses it globally */}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
    color: '#222',
  },
  cardActionBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F0F6FF',
  },
  planNumber: {
    fontSize: 15,
    color: '#6366F1',
    marginBottom: 2,
  },
  planDates: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  planStatus: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 2,
  },
  agreementStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  signed: {
    color: '#10B981',
  },
  pending: {
    color: '#F59E42',
  },
  agreementActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  agreementBtn: {
    backgroundColor: '#F0F6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  agreementBtnText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
    marginTop: 6,
    paddingLeft: 2,
  },
  goalsList: {
    marginBottom: 18,
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  goalTitle: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 8,
    color: '#3B82F6',
  },
  goalProgressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalProgressBarFill: {
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  goalProgressText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  goalActionBtn: {
    backgroundColor: '#F0F6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  goalActionBtnText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 13,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  walletCategory: {
    color: '#6366F1',
    fontWeight: '600',
  },
  walletAmount: {
    color: '#222',
    fontWeight: '600',
  },
  walletExpiry: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    marginTop: 2,
  },
  walletClaimsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    marginTop: 8,
    marginBottom: 2,
  },
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  claimAmount: {
    color: '#3B82F6',
    fontWeight: '600',
    width: 60,
  },
  claimStatus: {
    fontWeight: '600',
    fontSize: 12,
    width: 70,
  },
  claimApproved: {
    color: '#10B981',
  },
  claimPending: {
    color: '#F59E42',
  },
  claimDate: {
    color: '#888',
    fontSize: 12,
    flex: 1,
  },
  claimActionBtn: {
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 16,
    marginTop: 10,
    alignItems: 'center',
  },
  claimActionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  bookingActionBtn: {
    backgroundColor: '#F0F6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  bookingActionBtnText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 13,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  documentName: {
    flex: 1,
    color: '#222',
  },
  documentViewBtn: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  documentViewBtnText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 12,
  },
  uploadDocBtn: {
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadDocBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  notificationAlert: {
    backgroundColor: '#FEE2E2',
  },
  notificationInfo: {
    backgroundColor: '#DBEAFE',
  },
  notificationText: {
    color: '#222',
    flex: 1,
  },
});

export default NDISScreen;
