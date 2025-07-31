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

// NDIS Chat Room Topics - 30 diverse topics
export const CHAT_ROOM_TOPICS = [
  // Support & Wellbeing
  {
    id: 'mental-health',
    name: 'Mental Health Support',
    description: 'Share experiences and coping strategies',
    icon: '💚',
    category: 'wellbeing',
    memberCount: 245
  },
  {
    id: 'daily-living',
    name: 'Daily Living Tips',
    description: 'Independence and life skills',
    icon: '🏠',
    category: 'wellbeing',
    memberCount: 189
  },
  {
    id: 'peer-support',
    name: 'Peer Support Circle',
    description: 'Connect with others who understand',
    icon: '🤝',
    category: 'wellbeing',
    memberCount: 312
  },
  // Social & Dating
  {
    id: 'dating-relationships',
    name: 'Dating & Relationships',
    description: 'Love, dating and relationship advice',
    icon: '❤️',
    category: 'social',
    memberCount: 156
  },
  {
    id: 'friendship-circle',
    name: 'Friendship Circle',
    description: 'Make new friends and connections',
    icon: '👫',
    category: 'social',
    memberCount: 223
  },
  {
    id: 'lgbtqia-support',
    name: 'LGBTQIA+ Support',
    description: 'Safe space for LGBTQIA+ community',
    icon: '🏳️‍🌈',
    category: 'social',
    memberCount: 178
  },
  // Sports & Fitness
  {
    id: 'adaptive-sports',
    name: 'Adaptive Sports',
    description: 'Inclusive sports and activities',
    icon: '⚽',
    category: 'sports',
    memberCount: 145
  },
  {
    id: 'fitness-wellness',
    name: 'Fitness & Wellness',
    description: 'Exercise tips and motivation',
    icon: '💪',
    category: 'sports',
    memberCount: 198
  },
  {
    id: 'swimming-water',
    name: 'Swimming & Water Sports',
    description: 'Aquatic activities and therapy',
    icon: '🏊',
    category: 'sports',
    memberCount: 112
  },
  // NDIS Services
  {
    id: 'plan-management',
    name: 'NDIS Plan Management',
    description: 'Navigate your NDIS plan effectively',
    icon: '📊',
    category: 'ndis',
    memberCount: 456
  },
  {
    id: 'provider-reviews',
    name: 'Provider Reviews',
    description: 'Share experiences with providers',
    icon: '⭐',
    category: 'ndis',
    memberCount: 289
  },
  {
    id: 'funding-budgets',
    name: 'Funding & Budgets',
    description: 'Make the most of your funding',
    icon: '💰',
    category: 'ndis',
    memberCount: 234
  },
  // Hobbies & Interests
  {
    id: 'gaming-esports',
    name: 'Gaming & eSports',
    description: 'Video games and online gaming',
    icon: '🎮',
    category: 'hobbies',
    memberCount: 267
  },
  {
    id: 'arts-crafts',
    name: 'Arts & Crafts',
    description: 'Creative projects and art therapy',
    icon: '🎨',
    category: 'hobbies',
    memberCount: 189
  },
  {
    id: 'music-dance',
    name: 'Music & Dance',
    description: 'Share your love of music and movement',
    icon: '🎵',
    category: 'hobbies',
    memberCount: 201
  },
  {
    id: 'cooking-food',
    name: 'Cooking & Food',
    description: 'Recipes and dietary tips',
    icon: '🍳',
    category: 'hobbies',
    memberCount: 167
  },
  // Employment & Education
  {
    id: 'job-seekers',
    name: 'Job Seekers',
    description: 'Employment opportunities and tips',
    icon: '💼',
    category: 'employment',
    memberCount: 234
  },
  {
    id: 'education-training',
    name: 'Education & Training',
    description: 'Learning opportunities and courses',
    icon: '📚',
    category: 'employment',
    memberCount: 178
  },
  {
    id: 'workplace-support',
    name: 'Workplace Support',
    description: 'Navigating work with disability',
    icon: '🏢',
    category: 'employment',
    memberCount: 145
  },
  // Current Affairs
  {
    id: 'politics-advocacy',
    name: 'Politics & Advocacy',
    description: 'Disability rights and advocacy',
    icon: '⚖️',
    category: 'current',
    memberCount: 189
  },
  {
    id: 'news-updates',
    name: 'NDIS News & Updates',
    description: 'Latest NDIS changes and news',
    icon: '📰',
    category: 'current',
    memberCount: 567
  },
  // Technology
  {
    id: 'tech-help',
    name: 'Tech Help & Tips',
    description: 'Assistive technology and gadgets',
    icon: '📱',
    category: 'tech',
    memberCount: 223
  },
  {
    id: 'accessible-apps',
    name: 'Accessible Apps',
    description: 'App recommendations and reviews',
    icon: '📲',
    category: 'tech',
    memberCount: 156
  },
  // Family & Carers
  {
    id: 'parents-carers',
    name: 'Parents & Carers',
    description: 'Support for families and carers',
    icon: '👨‍👩‍👧‍👦',
    category: 'family',
    memberCount: 345
  },
  {
    id: 'young-adults',
    name: 'Young Adults (18-25)',
    description: 'Connect with peers your age',
    icon: '🎓',
    category: 'age',
    memberCount: 289
  },
  {
    id: 'seniors-circle',
    name: 'Seniors Circle (50+)',
    description: 'For mature participants',
    icon: '👴',
    category: 'age',
    memberCount: 167
  },
  // Regional & Travel
  {
    id: 'regional-rural',
    name: 'Regional & Rural',
    description: 'Connect across regional areas',
    icon: '🚜',
    category: 'regional',
    memberCount: 134
  },
  {
    id: 'travel-adventures',
    name: 'Travel & Adventures',
    description: 'Accessible travel tips and stories',
    icon: '✈️',
    category: 'travel',
    memberCount: 145
  },
  // Specific Conditions
  {
    id: 'autism-spectrum',
    name: 'Autism Spectrum',
    description: 'ASD community support',
    icon: '♾️',
    category: 'conditions',
    memberCount: 423
  },
  {
    id: 'physical-disability',
    name: 'Physical Disability',
    description: 'Mobility and physical support',
    icon: '♿',
    category: 'conditions',
    memberCount: 356
  }
];

// Chat room categories for filtering
export const CHAT_ROOM_CATEGORIES = [
  { id: 'all', name: 'All Rooms', icon: '🏠' },
  { id: 'wellbeing', name: 'Wellbeing', icon: '💚' },
  { id: 'social', name: 'Social', icon: '👥' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'ndis', name: 'NDIS', icon: '📋' },
  { id: 'hobbies', name: 'Hobbies', icon: '🎨' },
  { id: 'employment', name: 'Work', icon: '💼' },
  { id: 'tech', name: 'Tech', icon: '📱' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'conditions', name: 'Conditions', icon: '♿' }
];

// AI Bot Names for chat rooms
export const AI_BOT_NAMES = [
  { name: 'Sarah M.', avatar: '👩', interests: ['mental health', 'peer support'] },
  { name: 'James K.', avatar: '👨', interests: ['sports', 'fitness'] },
  { name: 'Emma L.', avatar: '👩‍🦰', interests: ['arts', 'music'] },
  { name: 'Michael R.', avatar: '👨‍🦱', interests: ['gaming', 'tech'] },
  { name: 'Sophie T.', avatar: '👩‍🦳', interests: ['cooking', 'wellbeing'] },
  { name: 'David W.', avatar: '🧔', interests: ['employment', 'education'] },
  { name: 'Lucy H.', avatar: '👩‍🦱', interests: ['dating', 'social'] },
  { name: 'Alex P.', avatar: '🧑', interests: ['lgbtqia', 'advocacy'] },
  { name: 'Rachel B.', avatar: '👩‍🦲', interests: ['ndis', 'funding'] },
  { name: 'Tom S.', avatar: '👨‍🦲', interests: ['travel', 'adventure'] },
  { name: 'Jessica M.', avatar: '👩‍💻', interests: ['tech', 'apps'] },
  { name: 'Chris D.', avatar: '👨‍💻', interests: ['politics', 'news'] },
  { name: 'Amanda K.', avatar: '👩‍⚕️', interests: ['health', 'therapy'] },
  { name: 'Ben L.', avatar: '👨‍🏫', interests: ['training', 'skills'] },
  { name: 'Katie R.', avatar: '👩‍🎨', interests: ['crafts', 'creative'] },
  { name: 'Mark J.', avatar: '👨‍🍳', interests: ['food', 'nutrition'] },
  { name: 'Lisa T.', avatar: '👩‍👦', interests: ['parenting', 'family'] },
  { name: 'Paul N.', avatar: '👨‍👦', interests: ['carers', 'support'] },
  { name: 'Helen W.', avatar: '👵', interests: ['seniors', 'community'] },
  { name: 'Ryan F.', avatar: '👨‍🎓', interests: ['young adults', 'study'] }
];

// User Actions
export const USER_ACTIONS = {
  BLOCK: 'block',
  UNBLOCK: 'unblock',
  MUTE: 'mute',
  UNMUTE: 'unmute',
  REPORT: 'report',
  PRIVATE_MESSAGE: 'private_message'
};

// Block Messages
export const BLOCK_MESSAGES = {
  CONFIRM_BLOCK: 'Are you sure you want to block this user? They will not be able to message you.',
  BLOCKED_SUCCESS: 'User has been blocked',
  UNBLOCKED_SUCCESS: 'User has been unblocked',
  CANNOT_MESSAGE_BLOCKED: 'You cannot message this user',
  CONFIRM_MUTE: 'Mute this user in this chat room? You will not see their messages.',
  MUTED_SUCCESS: 'User has been muted in this room',
  UNMUTED_SUCCESS: 'User has been unmuted'
};
