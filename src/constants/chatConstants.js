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
};

// Loading state messages
export const LOADING_STATES = {
  CONVERSATIONS: 'Loading conversations...',
  MESSAGES: 'Loading messages...',
  USERS: 'Loading users...',
};

// Error messages
export const ERROR_MESSAGES = {
  FAILED_TO_LOAD_CONVERSATIONS: 'Failed to load conversations',
  FAILED_TO_LOAD_MESSAGES: 'Failed to load messages',
  FAILED_TO_SEND: 'Failed to send message',
  RETRY: 'Retry',
};
