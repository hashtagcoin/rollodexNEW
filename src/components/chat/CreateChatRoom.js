import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CHAT_ROOM_TOPICS } from '../../constants/chatConstants';
import useChat from '../../hooks/useChat';

export default function CreateChatRoom({ onClose, onRoomCreated }) {
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const { createChatRoom } = useChat();

  const handleCreate = async () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    if (!selectedTopic) {
      Alert.alert('Error', 'Please select a topic');
      return;
    }

    setIsCreating(true);
    try {
      const roomId = await createChatRoom({
        name: roomName.trim(),
        description: roomDescription.trim(),
        topic_id: selectedTopic,
      });

      if (roomId) {
        Alert.alert('Success', 'Chat room created successfully!');
        onRoomCreated(roomId);
      } else {
        Alert.alert('Error', 'Failed to create chat room');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create chat room');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Chat Room</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isCreating || !roomName.trim() || !selectedTopic}
          style={[
            styles.createButton,
            (isCreating || !roomName.trim() || !selectedTopic) && styles.createButtonDisabled
          ]}
        >
          <Text style={[
            styles.createButtonText,
            (isCreating || !roomName.trim() || !selectedTopic) && styles.createButtonTextDisabled
          ]}>
            {isCreating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Room Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter room name"
            value={roomName}
            onChangeText={setRoomName}
            maxLength={50}
          />
          <Text style={styles.charCount}>{roomName.length}/50</Text>
        </View>

        {/* Room Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this room about?"
            value={roomDescription}
            onChangeText={setRoomDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{roomDescription.length}/200</Text>
        </View>

        {/* Topic Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Topic</Text>
          <View style={styles.topicsGrid}>
            {CHAT_ROOM_TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicCard,
                  selectedTopic === topic.id && styles.topicCardActive
                ]}
                onPress={() => setSelectedTopic(topic.id)}
              >
                <Text style={styles.topicIcon}>{topic.icon}</Text>
                <Text style={[
                  styles.topicName,
                  selectedTopic === topic.id && styles.topicNameActive
                ]}>
                  {topic.name}
                </Text>
                <Text style={styles.topicDescription} numberOfLines={2}>
                  {topic.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesSection}>
          <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.guidelineText}>Be respectful and supportive</Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.guidelineText}>Keep conversations on topic</Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.guidelineText}>No spam or inappropriate content</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  createButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#1E90FF',
    fontWeight: '600',
    fontSize: 16,
  },
  createButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  topicCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  topicCardActive: {
    borderColor: '#1E90FF',
    backgroundColor: '#e8f0ff',
  },
  topicIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  topicName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  topicNameActive: {
    color: '#1E90FF',
  },
  topicDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  guidelinesSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});