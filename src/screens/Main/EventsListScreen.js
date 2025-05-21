import React, { useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import Feather from 'react-native-vector-icons/Feather';

const dummyEvents = [
  {
    id: 'e1',
    name: 'NDIS Social BBQ',
    desc: 'Meet, eat and connect with other NDIS participants.',
    date: '2025-06-02',
    type: 'social',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'e2',
    name: 'Financial Literacy Workshop',
    desc: 'Learn to manage your NDIS funds.',
    date: '2025-06-10',
    type: 'educational',
    image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'e3',
    name: 'Inclusive Sports Day',
    desc: 'Try out wheelchair basketball and more!',
    date: '2025-06-15',
    type: 'sports',
    image: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'e4',
    name: 'Art Therapy Session',
    desc: 'Express yourself through art in a supportive environment.',
    date: '2025-06-20',
    type: 'social',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  },
];

const EVENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'educational', label: 'Educational' },
  { key: 'sports', label: 'Sports' },
];

const EventsListScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredEvents = dummyEvents.filter(event => {
    const matchType = activeFilter === 'all' || event.type === activeFilter;
    const matchSearch = event.name.toLowerCase().includes(search.toLowerCase()) || event.desc.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const renderEvent = ({ item }) => (
    <View style={styles.eventCard}>
      <Image source={{ uri: item.image }} style={styles.eventCardImage} />
      <View style={styles.eventCardContent}>
        <Text style={styles.eventCardTitle}>{item.name}</Text>
        <Text style={styles.eventCardDesc}>{item.desc}</Text>
        <Text style={styles.eventCardDate}>{item.date}</Text>
        <TouchableOpacity style={styles.joinBtn}><Text style={styles.joinBtnText}>Join</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <AppHeader title="Events" navigation={navigation} canGoBack={true} />
      {/* Search and filter row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBarWrap}>
          <Feather name="search" size={20} color="#888" style={{ marginLeft: 8, marginRight: 4 }} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search events..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#aaa"
            returnKeyType="search"
          />
        </View>
      </View>
      {/* Filter section (persistent) */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{paddingHorizontal: 10}}>
          {EVENT_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Listing count */}
      <Text style={styles.listingCount}>{filteredEvents.length} Events</Text>
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 18, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#f1f1f1',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#fff',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f4fa',
    borderRadius: 18,
    flex: 1,
    marginRight: 10,
    height: 38,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    paddingVertical: 0,
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
    borderRadius: 18,
    height: 38,
  },
  filterScroll: {
    backgroundColor: '#fff',
    paddingVertical: 4,
    marginBottom: 2,
  },
  filterChip: {
    backgroundColor: '#f2f4fa',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e3e9f2',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 15,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listingCount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#007AFF',
    marginLeft: 18,
    marginBottom: 8,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  eventCardImage: {
    width: 76,
    height: 76,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  eventCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  eventCardDesc: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  eventCardDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  joinBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default EventsListScreen;
