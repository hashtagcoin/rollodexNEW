import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { Ionicons } from '@expo/vector-icons';

const allAgreements = [
  { id: '1', title: 'Therapy Services', provider: 'Physio Clinic', status: 'Signed', expiry: '2025-11-15' },
  { id: '2', title: 'Support Coordination', provider: 'Care Connect', status: 'Pending', expiry: '2025-09-01' },
  { id: '3', title: 'Transport Assistance', provider: 'GoMobility', status: 'Signed', expiry: '2025-08-10' },
  { id: '4', title: 'Daily Living', provider: 'LifeSkills', status: 'Expired', expiry: '2024-12-31' },
];

const FILTERS = ['All', 'Signed', 'Pending', 'Expired'];

const ServiceAgreementsScreen = ({ navigation }) => {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filtered = selectedFilter === 'All'
    ? allAgreements
    : allAgreements.filter(a => a.status === selectedFilter);

  return (
    <View style={styles.screenContainer}>
      <AppHeader title="Service Agreements" navigation={navigation} />
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, selectedFilter === f && styles.filterBtnActive]}
            onPress={() => setSelectedFilter(f)}
          >
            <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="document-attach-outline" size={22} color="#F59E42" />
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={
                item.status === 'Signed' ? styles.signed :
                item.status === 'Pending' ? styles.pending :
                styles.expired
              }>{item.status}</Text>
            </View>
            <Text style={styles.cardSubText}>{item.provider}</Text>
            <Text style={styles.cardSubText}>Expiry: {item.expiry}</Text>
            <View style={styles.agreementActionsRow}>
              <TouchableOpacity style={styles.agreementBtn}><Text style={styles.agreementBtnText}>E-sign</Text></TouchableOpacity>
              <TouchableOpacity style={styles.agreementBtn}><Text style={styles.agreementBtnText}>Download</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No agreements found.</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 10,
  },
  filterBtn: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  filterBtnActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    color: '#222',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 18,
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
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
    color: '#222',
  },
  signed: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  pending: {
    color: '#F59E42',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  expired: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  cardSubText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
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
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
});

export default ServiceAgreementsScreen;
