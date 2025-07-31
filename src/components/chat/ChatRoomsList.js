import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CHAT_ROOM_TOPICS, EMPTY_STATES, LOADING_STATES, ERROR_MESSAGES, CHAT_ROOM_CATEGORIES } from '../../constants/chatConstants';
import useChat from '../../hooks/useChat';
import { COLORS, FONTS } from '../../constants/theme';

export default function ChatRoomsList({ onSelectRoom, onCreateRoom }) {
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { fetchChatRooms, joinChatRoom } = useChat();

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    setIsLoading(true);
    try {
      const rooms = await fetchChatRooms();
      setChatRooms(rooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      Alert.alert('Error', ERROR_MESSAGES.FAILED_TO_LOAD_CHAT_ROOMS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (room) => {
    // If it's a simulated room, just open it directly
    if (room.isSimulated) {
      onSelectRoom(room);
      return;
    }
    
    if (room.is_joined) {
      // Already joined, just open the room
      onSelectRoom(room);
    } else {
      // Join the room first (only for real rooms from database)
      try {
        const success = await joinChatRoom(room.id);
        if (success) {
          onSelectRoom(room);
          // Reload rooms to update join status
          loadChatRooms();
        } else {
          Alert.alert('Error', ERROR_MESSAGES.FAILED_TO_JOIN_ROOM);
        }
      } catch (error) {
        console.error('Error joining room:', error);
        Alert.alert('Error', 'Could not join the chat room. Please try again.');
      }
    }
  };

  // For demo purposes, we'll use the topic IDs as identifiers
  // In production, these would be actual UUID room IDs from the database
  const simulatedRooms = CHAT_ROOM_TOPICS.map(topic => ({
    id: `room-${topic.id}`, // This is just for display
    room_name: topic.name,
    room_description: topic.description,
    room_topic_id: topic.id,
    participant_count: topic.memberCount,
    is_joined: false,
    topic_icon: topic.icon,
    category: topic.category,
    isSimulated: true // Flag to identify simulated rooms
  }));

  const displayRooms = chatRooms.length > 0 ? chatRooms : simulatedRooms;

  const filteredRooms = displayRooms.filter(room => {
    const matchesCategory = selectedCategory === 'all' || room.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      room.room_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.room_description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderCategoryFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.categoryChipActive
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.categoryTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderRoom = ({ item }) => {
    const topic = CHAT_ROOM_TOPICS.find(t => t.id === item.room_topic_id);
    const isActive = item.participant_count > 100;
    
    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() => handleJoinRoom(item)}
      >
        <View style={styles.roomLeft}>
          <Text style={styles.roomIcon}>{item.topic_icon || topic?.icon || '💬'}</Text>
        </View>
        <View style={styles.roomCenter}>
          <View style={styles.roomTitleRow}>
            <Text style={styles.roomName}>{item.room_name}</Text>
            {isActive && (
              <View style={styles.activeDot} />
            )}
          </View>
          <Text style={styles.roomDescription} numberOfLines={1}>
            {item.room_description}
          </Text>
          <View style={styles.roomStats}>
            <View style={styles.participantInfo}>
              <Ionicons name="people" size={14} color="#666" />
              <Text style={styles.participantCount}>
                {item.participant_count} online
              </Text>
            </View>
            <Text style={styles.roomCategory}>• {topic?.category || item.category}</Text>
          </View>
        </View>
        <View style={styles.roomRight}>
          {item.is_joined ? (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark" size={16} color={COLORS.primary} />
            </View>
          ) : (
            <TouchableOpacity style={styles.joinButton}>
              <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>{LOADING_STATES.CHAT_ROOMS}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chat rooms..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {CHAT_ROOM_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Rooms List */}
      <FlatList
        data={filteredRooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.roomsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No chat rooms found</Text>
            <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  categoryFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesList: {
    paddingHorizontal: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: {
    backgroundColor: '#e8f0ff',
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    fontFamily: FONTS.regular,
  },
  categoryTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  roomsList: {
    paddingVertical: 8,
  },
  roomCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roomLeft: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomIcon: {
    fontSize: 28,
  },
  roomCenter: {
    flex: 1,
    marginLeft: 12,
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: FONTS.medium,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  roomStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
    fontFamily: FONTS.regular,
  },
  roomCategory: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
    fontFamily: FONTS.regular,
  },
  roomRight: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  joinButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    fontFamily: FONTS.medium,
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#aaa',
    fontFamily: FONTS.regular,
  },
});