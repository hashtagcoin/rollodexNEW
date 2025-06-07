import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import { EMPTY_STATES, LOADING_STATES, ERROR_MESSAGES } from '../../constants/chatConstants';
import useChat from '../../hooks/useChat';
import { formatDistanceToNow } from 'date-fns';

const ChatList = ({ onSelectConversation, onNewConversation }) => {
  const { 
    conversations, 
    isLoadingConversations, 
    conversationsError,
    fetchConversations,
    subscribeToConversationUpdates
  } = useChat();

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to conversation updates and get the subscription object
    const subscription = subscribeToConversationUpdates();
    
    // Return cleanup function
    return () => {
      if (subscription) {
        // The subscription object should have an unsubscribe method from useChat hook
        subscription.unsubscribe();
      }
    };
  }, []);

  const renderConversationItem = ({ item }) => {
    const timeAgo = item.latest_message?.created_at
      ? formatDistanceToNow(new Date(item.latest_message.created_at), { addSuffix: true })
      : '';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => onSelectConversation(item)}
      >
        <View style={styles.avatarContainer}>
          {item.participant_avatar ? (
            <Image 
              source={{ uri: item.participant_avatar }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {item.is_group_chat 
                  ? 'G' 
                  : (item.participant_name?.charAt(0) || '?')}
              </Text>
            </View>
          )}
          {item.unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {item.is_group_chat 
                ? 'Group Chat'  // You might want to add group names in your database
                : item.participant_name}
            </Text>
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
          
          <Text style={[
            styles.messagePreview,
            item.unread_count > 0 && styles.unreadMessage
          ]} numberOfLines={1}>
            {item.latest_message?.content || 'Start a conversation...'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={60} color={COLORS.lightGray} />
      <Text style={styles.emptyText}>{EMPTY_STATES.NO_CONVERSATIONS}</Text>
      <TouchableOpacity
        style={styles.newChatButton}
        onPress={onNewConversation}
      >
        <Text style={styles.newChatButtonText}>{EMPTY_STATES.START_CONVERSATION}</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoadingConversations) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{LOADING_STATES.CONVERSATIONS}</Text>
      </View>
    );
  }

  if (conversationsError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
        <Text style={styles.errorText}>{ERROR_MESSAGES.FAILED_TO_LOAD_CONVERSATIONS}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchConversations}
        >
          <Text style={styles.retryButtonText}>{ERROR_MESSAGES.RETRY}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={onNewConversation}
      >
        <Ionicons name="create" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.darkGray,
  },
  messagePreview: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  unreadMessage: {
    fontWeight: '600',
    color: COLORS.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.darkGray,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  newChatButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  newChatButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ChatList;
