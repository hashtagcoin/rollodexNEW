import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';

/**
 * Hook for accessing chat-related data and functions
 * Provides methods to fetch conversations, messages, and manage chat state
 */
export const useChat = () => {
  const { profile } = useUser();
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState(null);

  // Messages are stored by conversation ID
  const [messagesMap, setMessagesMap] = useState({});
  const [loadingMessagesMap, setLoadingMessagesMap] = useState({});
  const [messagesErrorMap, setMessagesErrorMap] = useState({});

  // Track active channel subscriptions by name to prevent duplicates
  const [activeChannels, setActiveChannels] = useState({});
  
  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      // Clean up all active channels when component unmounts
      Object.values(activeChannels).forEach((channel) => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, []);

  /**
   * Fetch all conversations where the current user is a participant
   */
  const fetchConversations = async () => {
    if (!profile?.id) return;
    
    try {
      setIsLoadingConversations(true);
      setConversationsError(null);

      // Get all conversations where current user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', profile.id);

      if (participantError) throw participantError;

      if (participantData && participantData.length > 0) {
        const conversationIds = participantData.map(p => p.conversation_id);

        // Get conversation details
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('chat_conversations')
          .select('*')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        if (conversationsError) throw conversationsError;

        // Enhanced conversation data with latest messages and participants
        const enhancedConversations = await Promise.all(
          conversationsData.map(async (conversation) => {
            // Get latest message
            const { data: latestMessage } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1);

            // Get unread message count
            const { count: unreadCount } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact' })
              .eq('conversation_id', conversation.id)
              .eq('read', false)
              .neq('sender_id', profile.id);

            // Get participants
            const { data: participantsData } = await supabase
              .from('chat_participants')
              .select('user_id')
              .eq('conversation_id', conversation.id);

            // Get participant profiles
            let participantProfiles = [];
            if (participantsData) {
              const userIds = participantsData.map(p => p.user_id);
              const { data: profiles } = await supabase
                .from('user_profiles')
                .select('id, username, full_name, avatar_url')
                .in('id', userIds);

              participantProfiles = profiles || [];
            }

            // Filter out current user from participants for display purposes
            const otherParticipants = participantProfiles.filter(p => p.id !== profile.id);

            return {
              ...conversation,
              latest_message: latestMessage ? latestMessage[0] : null,
              unread_count: unreadCount || 0,
              participants: participantProfiles,
              participant_name: conversation.is_group_chat
                ? `${otherParticipants.length} participants`
                : otherParticipants[0]?.full_name || otherParticipants[0]?.username || 'Unknown',
              participant_avatar: conversation.is_group_chat
                ? null // Could create group avatar here
                : otherParticipants[0]?.avatar_url
            };
          })
        );

        setConversations(enhancedConversations);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversationsError('Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  /**
   * Fetch messages for a specific conversation
   * @param {string} conversationId - The ID of the conversation to fetch messages for
   */
  const fetchMessages = async (conversationId) => {
    if (!profile?.id || !conversationId) return;

    try {
      // Set loading state for this conversation
      setLoadingMessagesMap(prev => ({ ...prev, [conversationId]: true }));
      setMessagesErrorMap(prev => ({ ...prev, [conversationId]: null }));

      // First fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      
      // Then fetch user profiles for all sender_ids
      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
      
      const { data: senderProfiles, error: sendersError } = await supabase
        .from('user_profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', senderIds);
        
      if (sendersError) throw sendersError;
      
      // Create a map of senders for quick lookup
      const sendersMap = {};
      senderProfiles.forEach(profile => {
        sendersMap[profile.id] = profile;
      });
      
      // Combine the message data with sender information
      const data = messagesData.map(message => ({
        ...message,
        sender: sendersMap[message.sender_id] || null
      }));

      // Update messages for this conversation
      setMessagesMap(prev => ({
        ...prev,
        [conversationId]: data || []
      }));

      // Mark messages as read
      await markConversationAsRead(conversationId);

    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      setMessagesErrorMap(prev => ({ 
        ...prev, 
        [conversationId]: 'Failed to load messages' 
      }));
    } finally {
      setLoadingMessagesMap(prev => ({ ...prev, [conversationId]: false }));
    }
  };

  /**
   * Send a new message in a conversation
   * @param {string} conversationId - The ID of the conversation
   * @param {string} content - The message content
   * @param {Object} options - Additional options like media attachments
   */
  const sendMessage = async (conversationId, content, options = {}) => {
    if (!profile?.id || !conversationId || !content.trim()) return null;

    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: profile.id,
        content: content.trim(),
        read: false,
        media_url: options.mediaUrl || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select();

      if (error) throw error;

      // Update the conversation's updated_at timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // The message will be added to state via the realtime subscription
      return data[0];
      
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  /**
   * Create a new conversation with selected users
   * @param {Array} userIds - Array of user IDs to include in the conversation
   * @param {boolean} isGroupChat - Whether this is a group chat
   */
  const createConversation = async (userIds, isGroupChat = false) => {
    if (!profile?.id || !userIds.length) return null;

    try {
      // Create new conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('chat_conversations')
        .insert({
          is_group_chat: isGroupChat,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (conversationError) throw conversationError;
      
      const conversationId = conversationData[0].id;
      
      // Add all participants including the current user
      const participantsToAdd = [
        { 
          conversation_id: conversationId, 
          user_id: profile.id,
          created_at: new Date().toISOString()
        },
        ...userIds.map(userId => ({
          conversation_id: conversationId,
          user_id: userId,
          created_at: new Date().toISOString()
        }))
      ];
      
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participantsToAdd);

      if (participantsError) throw participantsError;

      // Fetch the newly created conversation with all details
      await fetchConversations();
      
      // Return the conversation ID for further use
      return conversationId;
      
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  /**
   * Mark all messages in a conversation as read
   * @param {string} conversationId - The ID of the conversation
   */
  const markConversationAsRead = async (conversationId) => {
    if (!profile?.id || !conversationId) return;
    
    try {
      // Mark all messages in this conversation sent by others as read
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', profile.id)
        .eq('read', false);
      
      // Update local state to reflect read status
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 } 
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  /**
   * Set up a realtime subscription for new messages in a conversation
   * @param {string} conversationId - The ID of the conversation to subscribe to
   */
  const subscribeToConversation = (conversationId) => {
    if (!conversationId) return null;
    
    // Check if we already have an active subscription for this conversation
    const channelName = `chat-${conversationId}`;
    if (activeChannels[channelName]) {
      return {
        unsubscribe: () => {
          const channel = activeChannels[channelName];
          if (channel) {
            supabase.removeChannel(channel);
            setActiveChannels(prev => {
              const updated = {...prev};
              delete updated[channelName];
              return updated;
            });
          }
        }
      };
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `conversation_id=eq.${conversationId}` 
        },
        (payload) => {
          // Add the new message to the list
          setMessagesMap(currentMessages => {
            const conversationMessages = currentMessages[conversationId] || [];
            
            // Check if message already exists to avoid duplicates
            const messageExists = conversationMessages.some(msg => msg.id === payload.new.id);
            if (messageExists) return currentMessages;
            
            // Find sender info for the new message
            const newMessage = { ...payload.new, sender: null };
            
            // Mark as read if the message is from someone else and we're viewing the conversation
            if (payload.new.sender_id !== profile?.id) {
              markMessageAsRead(payload.new.id);
            }
            
            return {
              ...currentMessages,
              [conversationId]: [...conversationMessages, newMessage]
            };
          });
          
          // Update conversations list to show latest message
          fetchConversations();
        });
    
    channel.subscribe();
    
    // Store the channel in our activeChannels state
    setActiveChannels(prev => ({
      ...prev,
      [channelName]: channel
    }));
    
    // Return an object with unsubscribe method for component cleanup
    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
        setActiveChannels(prev => {
          const updated = {...prev};
          delete updated[channelName];
          return updated;
        });
      }
    };
  };

  /**
   * Subscribe to global conversation updates (new conversations, updates to existing ones)
   */
  const subscribeToConversationUpdates = () => {
    const channelName = 'chat-updates';
    
    // Check if we already have an active subscription for chat updates
    if (activeChannels[channelName]) {
      return {
        unsubscribe: () => {
          const channel = activeChannels[channelName];
          if (channel) {
            supabase.removeChannel(channel);
            setActiveChannels(prev => {
              const updated = {...prev};
              delete updated[channelName];
              return updated;
            });
          }
        }
      };
    }
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          () => {
            // Refresh conversations to update latest messages
            fetchConversations();
          })
      .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_conversations' },
          () => {
            // Refresh when conversations are updated
            fetchConversations();
          })
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_conversations' },
          () => {
            // Refresh when new conversations are created
            fetchConversations();
          });
    
    channel.subscribe();
    
    // Store the channel in our activeChannels state
    setActiveChannels(prev => ({
      ...prev,
      [channelName]: channel
    }));
    
    // Return an object with unsubscribe method for component cleanup
    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
        setActiveChannels(prev => {
          const updated = {...prev};
          delete updated[channelName];
          return updated;
        });
      }
    };
  };

  /**
   * Mark a specific message as read
   * @param {string} messageId - The ID of the message to mark as read
   */
  const markMessageAsRead = async (messageId) => {
    if (!messageId) return;
    
    try {
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  return {
    conversations,
    isLoadingConversations,
    conversationsError,
    messagesMap,
    loadingMessagesMap,
    messagesErrorMap,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    markConversationAsRead,
    subscribeToConversation,
    subscribeToConversationUpdates,
  };
};

export default useChat;
