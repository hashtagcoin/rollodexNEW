import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, Picker } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { Ionicons, Feather } from '@expo/vector-icons';

// Placeholder data for appointments
const pendingAppointments = [
  { id: 'a1', title: 'Physio Session', provider: 'Physio Clinic', date: '2025-06-01', time: '10:00 AM', status: 'Upcoming' },
  { id: 'a2', title: 'Support Meeting', provider: 'Care Connect', date: '2025-06-10', time: '2:30 PM', status: 'Upcoming' },
];
const historicalAppointments = [
  { id: 'a3', title: 'Speech Therapy', provider: 'SpeechWorks', date: '2025-05-10', time: '1:00 PM', status: 'Completed' },
  { id: 'a4', title: 'OT Assessment', provider: 'OT Pro', date: '2025-04-22', time: '11:30 AM', status: 'Cancelled' },
];

const BookingDetailScreen = ({ navigation }) => {
  const [pending, setPending] = useState(pendingAppointments);
    const [history, setHistory] = useState(historicalAppointments);
  const [selectedDuration, setSelectedDuration] = useState('1 hour');
  
  // Generate duration options from 15 mins to 24 hours
  const durationOptions = [
    '15 mins', '30 mins', '45 mins', '1 hour', '1.5 hours', 
    '2 hours', '3 hours', '4 hours', '6 hours', '8 hours',
    '12 hours', '24 hours'
  ];

  const handleCancel = (id) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => {
        setPending(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));
      } }
    ]);
  };

  const handleReschedule = (id) => {
    Alert.alert('Reschedule', 'Reschedule feature coming soon!');
  };

  // Compose both lists as sections in a single FlatList
  const pendingData = pending.filter(a => a.status === 'Upcoming');
  const historyData = [...pending.filter(a => a.status !== 'Upcoming'), ...history];
  const combinedData = [
    { type: 'header', key: 'pending-header' },
    ...pendingData.map(item => ({ ...item, type: 'pending' })),
    { type: 'header', key: 'history-header' },
    ...historyData.map(item => ({ ...item, type: 'history' })),
  ];

  return (
    <View style={styles.screenContainer}>
      <AppHeader title="Bookings" navigation={navigation} />
      <FlatList
        data={combinedData}
        keyExtractor={item => item.key || item.id}
        contentContainerStyle={styles.scrollContent}
        renderItem={({ item }) => {
          if (item.type === 'header' && item.key === 'pending-header') {
            return (
              <Text style={styles.sectionTitle}>Pending Appointments</Text>
            );
          }
          if (item.type === 'header' && item.key === 'history-header') {
            return (
              <Text style={styles.sectionTitle}>Appointment History</Text>
            );
          }
          if (item.type === 'pending') {
            return (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="calendar-outline" size={22} color="#10B981" />
                  <Text style={[styles.cardTitle, { color: '#000' }]}>{item.title}</Text>
                  <Text style={styles.cardStatusUpcoming}>{item.status}</Text>
                </View>
                <Text style={styles.cardSubText}>{item.provider}</Text>
                <Text style={styles.cardSubText}>Date: {item.date} at {item.time}</Text>
                <View style={styles.durationContainer}>
                  <Text style={styles.durationLabel}>Duration: </Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedDuration}
                      style={styles.picker}
                      onValueChange={(itemValue) => setSelectedDuration(itemValue)}
                      mode="dropdown"
                    >
                      {durationOptions.map((duration) => (
                        <Picker.Item key={duration} label={duration} value={duration} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.rescheduleBtn} onPress={() => handleReschedule(item.id)}>
                    <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
          if (item.type === 'history') {
            return (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="calendar-outline" size={22} color={item.status === 'Completed' ? '#10B981' : '#F87171'} />
                  <Text style={[styles.cardTitle, { color: '#000' }]}>{item.title}</Text>
                  <Text style={item.status === 'Completed' ? styles.cardStatusCompleted : styles.cardStatusCancelled}>{item.status}</Text>
                </View>
                <Text style={styles.cardSubText}>{item.provider}</Text>
                <Text style={styles.cardSubText}>Date: {item.date} at {item.time}</Text>
              </View>
            );
          }
          return null;
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No appointments found.</Text>}
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
  scrollContent: {
    padding: 18,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
    marginTop: 6,
    paddingLeft: 2,
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
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
    color: '#000',
  },
  cardSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginLeft: 32,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 32,
  },
  durationLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: 40,
    width: '100%',
  },
  cardStatusUpcoming: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  cardStatusCompleted: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  cardStatusCancelled: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  rescheduleBtn: {
    backgroundColor: '#F0F6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  rescheduleBtnText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  cancelBtnText: {
    color: '#F87171',
    fontWeight: '600',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
});

export default BookingDetailScreen;
