import React, { useState, useRef } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, TextInput, ScrollView, Animated } from 'react-native';
import ActionButton from '../../components/common/ActionButton';
import AppHeader from '../../components/layout/AppHeader';
import Feather from 'react-native-vector-icons/Feather';

const dummyHousingGroups = [
  {
    id: 'h1',
    name: 'NDIS Housing Co-op',
    desc: 'Affordable, accessible housing for NDIS participants.',
    members: 18,
    image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'h2',
    name: 'Young Renters',
    desc: 'Support for young adults finding their first home.',
    members: 44,
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'h3',
    name: 'Accessible Living',
    desc: 'A group for accessible housing tips and listings.',
    members: 27,
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
  },
];

const FILTERS = [
  { key: 'accessible', label: 'Accessible' },
  { key: 'sda', label: 'SDA' },
  { key: 'sil', label: 'SIL' },
  { key: 'pets', label: 'Pets Allowed' },
  { key: 'parking', label: 'Parking' },
  { key: 'price', label: 'Price Range' },
];

const HousingGroupsScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Animation values for the ActionButton
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef(null);

  // Dummy filter logic: just show all for now
  const filteredGroups = dummyHousingGroups.filter(group =>
    group.name.toLowerCase().includes(search.toLowerCase()) ||
    group.desc.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFilter = key => {
    setActiveFilters(f => f.includes(key) ? f.filter(k => k !== key) : [...f, key]);
  };

  const renderHousingGroup = ({ item }) => (
    <View style={styles.housingCard}>
      <Image source={{ uri: item.image }} style={styles.housingCardImage} />
      <View style={styles.housingCardContent}>
        <Text style={styles.housingCardTitle}>{item.name}</Text>
        <Text style={styles.housingCardDesc}>{item.desc}</Text>
        <Text style={styles.housingCardMembers}>{item.members} members</Text>
        <TouchableOpacity style={styles.joinBtn}><Text style={styles.joinBtnText}>Join</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Floating Action Button with fade animation */}
      <Animated.View style={[styles.floatingActionButton, {
        opacity: fadeAnim
      }]}>
        <ActionButton
          onPress={() => navigation.navigate('Explore', { 
            screen: 'ProviderDiscovery',
            params: { initialCategory: 'Housing' } // Pass Housing as the initial category
          })}
          iconName="add"
          color="#007AFF"
          size={56}
        />
      </Animated.View>
      <AppHeader title="Housing Groups" navigation={navigation} canGoBack={true} />
      {/* Search and filter row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBarWrap}>
          <Feather name="search" size={20} color="#888" style={{ marginLeft: 8, marginRight: 4 }} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search suburb, keyword, etc..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#aaa"
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Feather name="sliders" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>
      {/* Filter section (persistent) */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{paddingHorizontal: 10}}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilters.includes(f.key) && styles.filterChipActive]}
              onPress={() => toggleFilter(f.key)}
            >
              <Text style={[styles.filterChipText, activeFilters.includes(f.key) && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Listing count */}
      <Text style={styles.listingCount}>{filteredGroups.length} Listings</Text>
      <Animated.FlatList
        data={filteredGroups}
        renderItem={renderHousingGroup}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 18, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: true,
            listener: () => {
              // Clear any existing timer
              if (scrollEndTimer.current) {
                clearTimeout(scrollEndTimer.current);
              }
              
              // If not already scrolling, animate button fade out
              if (!isScrolling) {
                setIsScrolling(true);
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }
              
              // Set a timer to detect when scrolling stops
              scrollEndTimer.current = setTimeout(() => {
                setIsScrolling(false);
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 500, // Slower fade in
                  useNativeDriver: true,
                }).start();
              }, 200);
            }
          }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Fixed position ActionButton style with fade animation
  floatingActionButton: {
    position: 'absolute',
    bottom: 20, // Close to the bottom navbar
    right: 16, // Equal padding from right edge
    zIndex: 1000, // Ensure it's above all content
  },
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
  filterIconBtn: {
    backgroundColor: '#f2f4fa',
    borderRadius: 18,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  housingCard: {
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
  housingCardImage: {
    width: 76,
    height: 76,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  housingCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  housingCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  housingCardDesc: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  housingCardMembers: {
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

export default HousingGroupsScreen;
