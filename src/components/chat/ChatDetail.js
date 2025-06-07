import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import { BUBBLE_COLORS, EMPTY_STATES, LOADING_STATES, ERROR_MESSAGES } from '../../constants/chatConstants';
import { useUser } from '../../context/UserContext';
import useChat from '../../hooks/useChat';
import { format } from 'date-fns';
import MessageBubble from './MessageBubble';

const ChatDetail = ({ conversation, onBack }) => {
  const { profile } = useUser();
  const { 
    messagesMap, 
    loadingMessagesMap, 
    messagesErrorMap,
    fetchMessages, 
    sendMessage, 
    markConversationAsRead,
    subscribeToConversation,
    fetchConversations
  } = useChat();
  
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const [localMessages, setLocalMessages] = useState([]);
  
  // Get messages for this conversation from the messagesMap or use local messages
  const messages = messagesMap[conversation?.id]?.length ? messagesMap[conversation?.id] : localMessages;
  const loading = loadingMessagesMap[conversation?.id] || false;
  const error = messagesErrorMap[conversation?.id] || null;

  useEffect(() => {
    if (conversation?.id) {
      // Check if this is a temporary conversation (from initialUser in ChatModal)
      const isTempConversation = conversation.id.toString().startsWith('temp-');
      
      if (!isTempConversation) {
        // Only fetch messages and mark as read for real conversations
        fetchMessages(conversation.id);
        markConversationAsRead(conversation.id);
      } else {
        // For temporary conversations, we don't need to fetch messages
        // as they don't exist in the database yet
        console.log('Temporary conversation, skipping message fetch');
      }
      
      // Subscribe to real-time updates for this conversation
      const subscription = subscribeToConversation(conversation.id);
      
      return () => {
        if (subscription) {
          // Cleanup subscription when component unmounts or conversation changes
          subscription.unsubscribe();
        }
      };
    }
  }, [conversation?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !profile?.id || !conversation?.id) return;
    
    try {
      setSending(true);
      
      const messageContent = messageText.trim();
      setMessageText(''); // Clear input immediately for better UX
      
      // Create a temporary local message that will show immediately
      const tempMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: profile.id,
        content: messageContent,
        read: true,
        created_at: new Date().toISOString(),
        sender: {
          id: profile.id,
          full_name: profile.full_name || 'Me',
          username: profile.username || 'me',
          avatar_url: profile.avatar_url
        }
      };
      
      // Add the temporary message to local state immediately
      setLocalMessages(prev => [...prev, tempMessage]);
      
      // Scroll to bottom after adding the local message
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 50);
      
      // Use the sendMessage function from our hook
      const result = await sendMessage(conversation.id, messageContent);

      if (!result) {
        throw new Error('Failed to send message');
      }
      
      // Fetch updated messages after sending
      fetchMessages(conversation.id);
      // Also refresh conversations list to update latest message
      fetchConversations();
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(messageContent); // Restore message text if failed
    } finally {
      setSending(false);
    }
  };

  const renderMessageItem = ({ item }) => (
    <MessageBubble 
      message={item}
      isOwnMessage={item.sender_id === profile?.id}
    />
  );

  const renderParticipants = () => {
    // Only show participant avatars if this is a group chat
    if (!conversation?.is_group_chat || !conversation?.participants) return null;

    return (
      <View style={styles.participantsContainer}>
        <Text style={styles.participantsTitle}>Participants</Text>
        <FlatList
          data={conversation.participants}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.participantsList}
          renderItem={({ item }) => (
            <View style={styles.participantItem}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.participantAvatar} />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Text style={styles.avatarText}>{item.full_name?.[0] || item.username?.[0] || '?'}</Text>
                </View>
              )}
              <Text style={styles.participantName} numberOfLines={1}>
                {item.full_name || item.username || 'Unknown'}
              </Text>
            </View>
          )}
        />
      </View>
    );
  };

  const renderMessageDate = (message) => {
    const date = new Date(message.created_at);
    return format(date, 'MMM d, h:mm a');
  };

  const renderHeader = () => {
    if (loading) return null;
    
    return (
      <>
        {renderParticipants()}
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {messages.length > 0 
              ? `Conversation started ${format(new Date(messages[0].created_at), 'MMM d, yyyy')}`
              : 'Start a conversation'}
          </Text>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{LOADING_STATES.MESSAGES}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.secondary} />
          <Text style={styles.errorText}>{ERROR_MESSAGES.FAILED_TO_LOAD_MESSAGES}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchMessages(conversation.id)}>
            <Text style={styles.retryButtonText}>{ERROR_MESSAGES.RETRY}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwnMessage={item.sender_id === profile?.id}
            />
          )}
          showsVerticalScrollIndicator={false}
          inverted={false} // Set to true if you want newest messages at the bottom
          ListHeaderComponent={renderParticipants}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={50} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>{EMPTY_STATES.NO_MESSAGES}</Text>
              <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
            </View>
          }
          onContentSizeChange={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }}
        />
      )}

      <View style={styles.inputContainer}>
        {/* You could add attachment button here */}
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 8, // Added horizontal padding to prevent edge cropping
  },
  messagesContent: {
    paddingVertical: 10,
    paddingBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.darkGray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: '#fff',
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
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  participantsContainer: {
    marginVertical: 10,
  },
  participantsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
    marginLeft: 5,
  },
  participantsList: {
    paddingBottom: 10,
  },
  participantItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 60,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  participantName: {
    fontSize: 12,
    color: COLORS.darkGray,
    textAlign: 'center',
    width: 60,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.darkGray,
    backgroundColor: '#F0F0F0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#FFF',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
});

export default ChatDetail;
