import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import ActionButton from '../../components/common/ActionButton';
import { Feather, Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/layout/AppHeader';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'interest', label: 'Interest' },
  { key: 'support', label: 'Support' },
];

const GroupsListScreen = () => {
  const navigation = useNavigation();
  const [filter, setFilter] = useState('all');
  const [groupsData, setGroupsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef(null);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          avatar_url, 
          imageurl,  
          category, 
          is_public,
          group_members ( count )
        `);

      if (fetchError) throw fetchError;

      const formattedGroups = data.map(group => ({
        ...group,
        members: group.group_members && group.group_members.length > 0 ? group.group_members[0].count : 0,
        type: group.category,
        image: group.imageurl || group.avatar_url, 
        desc: group.description,
      }));
      
      setGroupsData(formattedGroups);
    } catch (e) {
      console.error('Error fetching groups:', e);
      setError(e.message || 'Failed to fetch groups.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchGroups();
    }, [])
  );

  const filteredGroups = filter === 'all' 
    ? groupsData 
    : groupsData.filter(g => g.category === filter);

  const GroupCard = React.memo(({ item, navigation }) => {
    const [isFavorited, setIsFavorited] = useState(false); 

    const toggleFavorite = useCallback(() => {
      setIsFavorited(prev => !prev);
      alert(`Group ${item.name} ${!isFavorited ? 'added to' : 'removed from'} favorites (UI only)`);
    }, [isFavorited, item.name]);

    return (
      <TouchableOpacity onPress={() => navigation.navigate('GroupDetailScreen', { groupId: item.id })} style={styles.card}>
        <Image source={{ uri: item.image || 'https://via.placeholder.com/100x100.png?text=No+Image' }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteIconContainer}>
              <Ionicons 
                name={isFavorited ? 'heart' : 'heart-outline'} 
                size={24} 
                color={isFavorited ? 'red' : '#888'} 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Feather name="users" size={14} color="#888" />
              <Text style={styles.membersText}>{item.members} members</Text>
              {item.is_public && <View style={styles.publicBadge}><Text style={styles.publicBadgeText}>Public</Text></View>}
            </View>
            <TouchableOpacity style={styles.joinBtn} onPress={() => alert('Join feature coming soon!')}>
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  const renderGroupCard = useCallback(({ item }) => (
    <GroupCard item={item} navigation={navigation} />
  ), [navigation]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading groups...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchGroups} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
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
              if (scrollEndTimer.current) {
                clearTimeout(scrollEndTimer.current);
              }
              
              if (!isScrolling) {
                setIsScrolling(true);
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }
              
              scrollEndTimer.current = setTimeout(() => {
                setIsScrolling(false);
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 500, 
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
  floatingActionButton: {
    position: 'absolute',
    bottom: 20, 
    right: 16, 
    zIndex: 1000, 
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
  },
  listContainer: {
    padding: 14,
  },
  card: { 
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8, 
    marginVertical: 6,
    marginHorizontal: 8, 
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, 
    shadowRadius: 3,
    elevation: 2, 
  },
  cardImage: { 
    width: 70, 
    height: 70,
    borderRadius: 35, 
    marginRight: 12,
    backgroundColor: '#e0e0e0', 
  },
  cardContent: {
    flex: 1, 
    justifyContent: 'center',
  },
  cardHeader: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17, 
    fontWeight: '600', 
    color: '#222',
    flex: 1, 
  },
  favoriteIconContainer: { 
    paddingLeft: 8, 
  },
  cardDesc: {
    fontSize: 13,
    color: '#777',
    marginBottom: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  membersText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
    marginRight: 8, 
  },
  joinBtn: {
    backgroundColor: '#EFEFF4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  joinBtnText: {
    color: '#007AFF',
    fontWeight: '500',
    fontSize: 13,
  },
  publicBadge: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  publicBadgeText: {
    color: '#007AFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  centeredContainer: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: { 
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: { 
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: { 
    color: '#fff',
    fontSize: 16,
  },
});

export default GroupsListScreen;
