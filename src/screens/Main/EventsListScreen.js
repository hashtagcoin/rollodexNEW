import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ScrollView, Animated, ActivityIndicator, RefreshControl } from 'react-native';
import ActionButton from '../../components/common/ActionButton';
import { supabase } from '../../lib/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import EventCard from '../../components/cards/EventCard';
import { COLORS, FONTS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import Feather from 'react-native-vector-icons/Feather';

// Event categories for filtering
const EVENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'educational', label: 'Educational' },
  { key: 'sports', label: 'Sports' },
  { key: 'art', label: 'Art' },
  { key: 'health', label: 'Health' }
];

const EventsListScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  
  // Animation values for the ActionButton
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef(null);

  // Fetch events when the screen is focused or refreshed
  const fetchEvents = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      
      // Fetch events using our events_with_details view
      const { data, error } = await supabase
        .from('events_with_details')
        .select('*')
        .order('start_time', { ascending: true });
        
      if (error) throw error;
      
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, []);
  
  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      return () => {};
    }, [])
  );
  
  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents(true);
  };
  
  // Filter events based on search and category
  const filteredEvents = events.filter(event => {
    const matchType = activeFilter === 'all' || event.category === activeFilter;
    const matchSearch = 
      event.title?.toLowerCase().includes(search.toLowerCase()) ||
      event.description?.toLowerCase().includes(search.toLowerCase()) ||
      false;
    return matchType && matchSearch;
  });

  // Toggle view mode between list and grid
  const toggleViewMode = () => {
    setViewMode(viewMode === 'list' ? 'grid' : 'list');
  };

  // Render an event card
  const renderEvent = ({ item }) => (
    <EventCard
      event={item}
      onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
      listView={viewMode === 'list'}
      testID={`event-card-${item.id}`}
    />
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <AppHeader title="Events" navigation={navigation} canGoBack={true} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: COLORS.darkGray }}>Loading events...</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Floating Action Button with fade animation */}
      <Animated.View style={[styles.floatingActionButton, {
        opacity: fadeAnim
      }]}>
        <ActionButton
          onPress={() => alert('Create new event feature coming soon!')}
          iconName="add"
          color="#007AFF"
          size={56}
        />
      </Animated.View>
      <AppHeader 
        title="Events" 
        navigation={navigation} 
        canGoBack={true} 
        rightElement={
          <TouchableOpacity onPress={toggleViewMode} style={{ padding: 5 }}>
            <Feather name={viewMode === 'list' ? 'grid' : 'list'} size={22} color={COLORS.darkGray} />
          </TouchableOpacity>
        }
      />
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
            clearButtonMode="while-editing"
          />
        </View>
      </View>
      {/* Filter section with categories */}
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
      <View style={styles.listingCountContainer}>
        <Text style={styles.listingCount}>{filteredEvents.length} Events</Text>
      </View>
      {events.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={48} color={COLORS.lightGray} />
          <Text style={styles.emptyStateText}>No events found</Text>
          <Text style={styles.emptyStateSubText}>Check back soon for upcoming events</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={item => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingTop: 8,
            paddingBottom: viewMode === 'grid' ? 90 : 80 // Extra padding at bottom for FAB
          }}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : null}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          )}
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
      )}
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
  listingCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  listingCount: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontFamily: FONTS.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: FONTS.medium,
    color: COLORS.darkGray,
    marginTop: 12,
  },
  emptyStateSubText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
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
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f2f4fa',
    marginHorizontal: 4,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontFamily: FONTS.medium,
  },
  filterChipTextActive: {
    color: COLORS.white,
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
