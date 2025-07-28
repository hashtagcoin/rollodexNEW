import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CHAT_ROOM_TOPICS, EMPTY_STATES, LOADING_STATES, ERROR_MESSAGES } from '../../constants/chatConstants';
import useChat from '../../hooks/useChat';

export default function ChatRoomsList({ onSelectRoom, onCreateRoom }) {
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
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
    if (room.is_joined) {
      // Already joined, just open the room
      onSelectRoom(room);
    } else {
      // Join the room first
      const success = await joinChatRoom(room.id);
      if (success) {
        onSelectRoom(room);
        // Reload rooms to update join status
        loadChatRooms();
      } else {
        Alert.alert('Error', ERROR_MESSAGES.FAILED_TO_JOIN_ROOM);
      }
    }
  };

  const filteredRooms = selectedTopic
    ? chatRooms.filter(room => room.room_topic_id === selectedTopic)
    : chatRooms;

  const renderTopicFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.topicChip,
        selectedTopic === item.id && styles.topicChipActive
      ]}
      onPress={() => setSelectedTopic(selectedTopic === item.id ? null : item.id)}
    >
      <Text style={styles.topicIcon}>{item.icon}</Text>
      <Text style={[
        styles.topicText,
        selectedTopic === item.id && styles.topicTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderRoom = ({ item }) => {
    const topic = CHAT_ROOM_TOPICS.find(t => t.id === item.room_topic_id);
    
    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() => handleJoinRoom(item)}
      >
        <View style={styles.roomHeader}>
          <Text style={styles.roomIcon}>{topic?.icon || '💬'}</Text>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{item.room_name}</Text>
            <Text style={styles.roomDescription} numberOfLines={2}>
              {item.room_description}
            </Text>
          </View>
        </View>
        <View style={styles.roomFooter}>
          <View style={styles.participantInfo}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.participantCount}>
              {item.participant_count} {item.participant_count === 1 ? 'member' : 'members'}
            </Text>
          </View>
          {item.is_joined ? (
            <View style={styles.joinedBadge}>
              <Text style={styles.joinedText}>Joined</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.joinButton}>
              <Text style={styles.joinButtonText}>Join</Text>
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
      {/* Topic Filter */}
      <View style={styles.topicFilterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CHAT_ROOM_TOPICS}
          renderItem={renderTopicFilter}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.topicsList}
        />
      </View>

      {/* Rooms List */}
      <FlatList
        data={filteredRooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.roomsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{EMPTY_STATES.NO_CHAT_ROOMS}</Text>
          </View>
        }
      />

      {/* Create Room Button */}
      <TouchableOpacity
        style={styles.createRoomButton}
        onPress={onCreateRoom}
      >
        <Ionicons name="add-circle" size={56} color="#1E90FF" />
      </TouchableOpacity>
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
  topicFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topicsList: {
    paddingHorizontal: 15,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  topicChipActive: {
    backgroundColor: '#e8f0ff',
    borderColor: '#1E90FF',
  },
  topicIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  topicText: {
    fontSize: 14,
    color: '#333',
  },
  topicTextActive: {
    color: '#1E90FF',
    fontWeight: '600',
  },
  roomsList: {
    padding: 15,
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  roomIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  joinButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1E90FF',
    borderRadius: 20,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  joinedBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#e8f0ff',
    borderRadius: 20,
  },
  joinedText: {
    color: '#1E90FF',
    fontWeight: '600',
    fontSize: 14,
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
  },
  createRoomButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});