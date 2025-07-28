/**
 * Chat-related constants
 */

// Maximum character length for message input
export const MAX_MESSAGE_LENGTH = 1000;

// Timeouts
export const TYPING_INDICATOR_TIMEOUT = 3000; // 3 seconds
export const MESSAGE_FETCH_LIMIT = 50; // Number of messages to fetch initially

// Chat UI constants
export const BUBBLE_COLORS = {
  SENT: '#1E90FF', // Matches primary color
  RECEIVED: '#F0F0F0',
  READ_INDICATOR: 'rgba(255, 255, 255, 0.8)',
  TIME_STAMP: '#999',
};

// Real-time subscription channels
export const REALTIME_CHANNELS = {
  CHAT_UPDATES: 'chat-updates',
  MESSAGE_PREFIX: 'chat-',
};

// Empty state messages
export const EMPTY_STATES = {
  NO_CONVERSATIONS: 'No conversations yet',
  START_CONVERSATION: 'Start a conversation',
  NO_MESSAGES: 'No messages yet',
  BEGIN_CONVERSATION: 'Say hello to start the conversation!',
  NO_CHAT_ROOMS: 'No chat rooms available',
};

// Loading state messages
export const LOADING_STATES = {
  CONVERSATIONS: 'Loading conversations...',
  MESSAGES: 'Loading messages...',
  USERS: 'Loading users...',
  CHAT_ROOMS: 'Loading chat rooms...',
};

// Error messages
export const ERROR_MESSAGES = {
  FAILED_TO_LOAD_CONVERSATIONS: 'Failed to load conversations',
  FAILED_TO_LOAD_MESSAGES: 'Failed to load messages',
  FAILED_TO_SEND: 'Failed to send message',
  RETRY: 'Retry',
  FAILED_TO_LOAD_CHAT_ROOMS: 'Failed to load chat rooms',
  FAILED_TO_JOIN_ROOM: 'Failed to join chat room',
};

// Chat Types
export const CHAT_TYPE = {
  PRIVATE: 'private',
  GROUP: 'group', 
  ROOM: 'room'
};

// NDIS Chat Room Topics
export const CHAT_ROOM_TOPICS = [
  {
    id: 'support-wellbeing',
    name: 'Support & Wellbeing',
    description: 'Mental health support and coping strategies',
    icon: '💙',
    subtopics: ['Mental Health', 'Daily Living', 'Peer Support']
  },
  {
    id: 'activities-social',
    name: 'Activities & Social',
    description: 'Events, hobbies, and social connections',
    icon: '🎉',
    subtopics: ['Local Events', 'Hobbies', 'Sports & Recreation']
  },
  {
    id: 'ndis-services',
    name: 'NDIS Services',
    description: 'Plan management and service navigation',
    icon: '📋',
    subtopics: ['Plan Management', 'Provider Reviews', 'Funding Questions']
  },
  {
    id: 'life-skills',
    name: 'Life Skills',
    description: 'Independent living and education',
    icon: '🎯',
    subtopics: ['Independent Living', 'Employment', 'Technology Help']
  },
  {
    id: 'community-groups',
    name: 'Community Groups',
    description: 'Connect with specific communities',
    icon: '👥',
    subtopics: ['Parents & Carers', 'Young Adults', 'Regional Communities']
  }
];
