import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Animated } from 'react-native';
import ActionButton from '../../components/common/ActionButton';
import { Feather } from '@expo/vector-icons';
import AppHeader from '../../components/layout/AppHeader';
import { useNavigation } from '@react-navigation/native';

const MOCK_GROUPS = [
  {
    id: '1',
    name: 'Book Lovers',
    type: 'social',
    desc: 'A group for people who love reading and sharing books.',
    image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80',
    members: 42,
  },
  {
    id: '2',
    name: 'NDIS Support Group',
    type: 'support',
    desc: 'Peer support and advice for NDIS participants.',
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
    members: 55,
  },
  {
    id: '3',
    name: 'Music Makers',
    type: 'social',
    desc: 'For anyone interested in making or enjoying music.',
    image: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80',
    members: 31,
  },
  {
    id: '4',
    name: 'Carers Connect',
    type: 'support',
    desc: 'A safe space for carers to share and connect.',
    image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    members: 24,
  },
  {
    id: '5',
    name: 'Art Enthusiasts',
    type: 'interest',
    desc: 'Share, discuss, and enjoy art together.',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
    members: 18,
  },
  {
    id: '6',
    name: 'Hiking Club',
    type: 'interest',
    desc: 'Explore nature and get some exercise with like-minded people.',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02e5ccb806?auto=format&fit=crop&w=400&q=80',
    members: 12,
  },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'interest', label: 'Interest' },
  { key: 'support', label: 'Support' },
];

const GroupsListScreen = () => {
  const navigation = useNavigation();
  const [filter, setFilter] = useState('all');
  
  // Animation values for the ActionButton
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef(null);

  const filteredGroups = filter === 'all' ? MOCK_GROUPS : MOCK_GROUPS.filter(g => g.type === filter);

  const renderGroupCard = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('GroupDetailScreen', { group: item })}>
      <View style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDesc}>{item.desc}</Text>
          <View style={styles.cardFooter}>
            <Feather name="users" size={16} color="#888" />
            <Text style={styles.membersText}>{item.members} members</Text>
            <TouchableOpacity style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenContainer}>
      {/* Floating Action Button with fade animation */}
      <Animated.View style={[styles.floatingActionButton, {
        opacity: fadeAnim
      }]}>
        <ActionButton
          onPress={() => alert('Create new group feature coming soon!')}
          iconName="add"
          color="#007AFF"
          size={56}
        />
      </Animated.View>
      <AppHeader title="Groups" navigation={navigation} canGoBack={true} />
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'social' && styles.filterBtnActive]}
          onPress={() => setFilter('social')}
        >
          <Text style={[styles.filterBtnText, filter === 'social' && styles.filterBtnTextActive]}>Social</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'interest' && styles.filterBtnActive]}
          onPress={() => setFilter('interest')}
        >
          <Text style={[styles.filterBtnText, filter === 'interest' && styles.filterBtnTextActive]}>Interest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'support' && styles.filterBtnActive]}
          onPress={() => setFilter('support')}
        >
          <Text style={[styles.filterBtnText, filter === 'support' && styles.filterBtnTextActive]}>Support</Text>
        </TouchableOpacity>
        {/* ActionButton positioned at bottom right corner */}
      </View>
      </View>
      <Animated.FlatList
        data={filteredGroups}
        renderItem={renderGroupCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
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
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f2f4fa',
    marginRight: 6,
  },
  filterBtnActive: {
    backgroundColor: '#007AFF',
  },
  filterBtnText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 14,
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  actionButtonCustom: {
    marginLeft: 'auto',
    marginRight: 10,
    // Size and color are controlled by the ActionButton component props
  },
  listContainer: {
    padding: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
  },
  cardImage: {
    width: 90,
    height: 90,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#eaeaea',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 17,
    color: '#222',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  membersText: {
    marginLeft: 5,
    marginRight: 14,
    color: '#888',
    fontSize: 13,
  },
  joinBtn: {
    marginLeft: 'auto',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default GroupsListScreen;
