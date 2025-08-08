import { CHAT_ROOM_TOPICS } from '../constants/chatConstants';
import { supabase } from '../lib/supabaseClient';

// Topic-specific message templates
const topicMessages = {
  'mental-health': [
    "Has anyone tried the new mindfulness app? It's been really helpful for me.",
    "Remember, it's okay to have bad days. We're all here to support each other.",
    "I found a great therapist through NDIS. Happy to share their details!",
    "Taking things one day at a time has really helped me cope better.",
    "Does anyone have experience with anxiety management techniques?",
    "The peer support groups in my area have been amazing.",
    "Just wanted to check in - how is everyone doing today?",
    "Self-care isn't selfish. What do you do for self-care?"
  ],
  'dating-relationships': [
    "Dating with a disability can be challenging, but don't give up!",
    "I met my partner at a community event. Sometimes the best connections happen naturally.",
    "Communication is key in any relationship, especially about our needs.",
    "Anyone have tips for accessible date ideas?",
    "Just went on my first date in ages! Feeling nervous but excited.",
    "Online dating has actually been great for being upfront about my disability.",
    "My partner has been so supportive with my NDIS journey.",
    "Remember, you deserve love and respect just like everyone else!"
  ],
  'gaming-esports': [
    "Just got the new adaptive controller! Game changer!",
    "Anyone up for some co-op gaming tonight?",
    "Accessibility features in games have come so far. Love to see it!",
    "Found a great Discord server for gamers with disabilities.",
    "What games are you all playing lately?",
    "The Xbox adaptive controller has opened up so many games for me.",
    "Anyone interested in starting an inclusive gaming clan?",
    "Streaming has been a great way to connect with other gamers."
  ],
  'adaptive-sports': [
    "Wheelchair basketball practice was intense today! 💪",
    "Swimming has been amazing for my mobility and mental health.",
    "Looking for people to join our boccia team!",
    "The Paralympics always inspire me to push harder.",
    "Anyone know good accessible gyms in Melbourne?",
    "Just signed up for adaptive rock climbing!",
    "Sport has given me so much confidence.",
    "Our local sports club is so inclusive and welcoming."
  ],
  'plan-management': [
    "Just had my plan review - got some great outcomes!",
    "Can anyone recommend a good plan manager?",
    "Remember to keep all your receipts for claims!",
    "The NDIS app has made tracking so much easier.",
    "Don't be afraid to advocate for what you need in your plan.",
    "My support coordinator has been invaluable.",
    "Anyone else finding the new portal easier to use?",
    "Happy to share my plan review tips if anyone needs them."
  ],
  'arts-crafts': [
    "Art therapy has been incredible for my mental health.",
    "Just finished a painting! Art is such a great outlet.",
    "Anyone interested in starting an online craft group?",
    "Adaptive tools have made crafting accessible for me again.",
    "The local art class for people with disabilities is amazing.",
    "Creating art helps me express things I can't put into words.",
    "Would love to see what everyone is working on!",
    "Pottery has been great for my fine motor skills."
  ],
  'tech-help': [
    "Voice control has changed my life!",
    "Can anyone recommend good accessibility apps?",
    "Just discovered this amazing screen reader.",
    "Tech support through NDIS has been really helpful.",
    "Smart home devices have increased my independence so much.",
    "Anyone need help setting up assistive technology?",
    "The accessibility features on iPhone are incredible.",
    "Happy to share my favorite adaptive tech finds!"
  ],
  'employment': [
    "Just got a job interview! Any tips?",
    "My employer has been great with workplace modifications.",
    "DES helped me find the perfect role.",
    "Remember, you don't have to disclose your disability if you don't want to.",
    "Working from home has been a game-changer for me.",
    "Anyone know disability-friendly employers?",
    "The employment support through NDIS is really helpful.",
    "Celebrating small wins - completed my first week at work!"
  ],
  'parents-carers': [
    "Being a carer is rewarding but exhausting sometimes.",
    "Respite care has been a lifesaver for our family.",
    "How do you all manage self-care as carers?",
    "My child just achieved a huge milestone!",
    "The NDIS has given our family so much support.",
    "Anyone have tips for navigating school with NDIS?",
    "Carer support groups have been invaluable.",
    "Remember to celebrate the small victories!"
  ],
  'default': [
    "Great to be part of this community!",
    "Thanks for all the support everyone.",
    "Anyone have experience with this?",
    "I'd love to hear other perspectives on this.",
    "This group has been so helpful.",
    "Feeling grateful for this space.",
    "Thanks for listening everyone.",
    "Your stories inspire me every day."
  ]
};

// Generate contextual responses based on keywords
const contextualResponses = {
  greeting: [
    "Hey there! Welcome to the room! 👋",
    "Hello! Great to see you here!",
    "Hi! How's everyone doing today?",
    "Welcome! Feel free to jump into the conversation!"
  ],
  thanks: [
    "You're very welcome! We're all here to help.",
    "No problem at all! That's what this community is for.",
    "Happy to help! 😊",
    "Anytime! We support each other here."
  ],
  question: [
    "That's a great question! I'd love to hear what others think.",
    "I'm curious about this too!",
    "Following this - would love to know more.",
    "Great topic! Anyone have insights on this?"
  ],
  celebration: [
    "That's amazing! Congratulations! 🎉",
    "Wow, that's fantastic news!",
    "So happy for you! Well done!",
    "This is wonderful! Thanks for sharing!"
  ],
  support: [
    "Sending you positive vibes 💙",
    "We're here for you!",
    "You've got this! One step at a time.",
    "Thanks for sharing. You're not alone in this."
  ]
};

class ChatBotService {
  constructor() {
    this.activeBots = new Map();
    this.messageTimers = new Map();
    this.cachedProfiles = null;
    this.profilesCacheTime = null;
  }

  // Fetch random user profiles from database
  async fetchRandomProfiles() {
    // Cache profiles for 5 minutes to avoid too many database calls
    if (this.cachedProfiles && this.profilesCacheTime && 
        Date.now() - this.profilesCacheTime < 5 * 60 * 1000) {
      return this.cachedProfiles;
    }

    try {
      // Fetch random user profiles (excluding current user)
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url')
        .limit(30);

      if (error) throw error;

      this.cachedProfiles = profiles || [];
      this.profilesCacheTime = Date.now();
      return this.cachedProfiles;
    } catch (error) {
      console.error('Error fetching user profiles for bots:', error);
      return [];
    }
  }

  // Initialize bots for a room
  async initializeRoomBots(roomId, topicId, currentUserId) {
    const bots = await this.generateBotsForTopic(roomId, topicId, currentUserId);
    this.activeBots.set(roomId, bots);
    return bots;
  }

  // Generate relevant bots for a topic
  async generateBotsForTopic(roomId, topicId, currentUserId) {
    const topic = CHAT_ROOM_TOPICS.find(t => t.id === topicId);
    if (!topic) return [];

    // Fetch real user profiles
    const profiles = await this.fetchRandomProfiles();
    
    // Filter out the current user and get random profiles
    const availableProfiles = profiles.filter(p => p.id !== currentUserId);
    const shuffledProfiles = this.shuffleArray(availableProfiles);
    
    // Select 3-8 random profiles to act as active users
    const numBots = Math.floor(Math.random() * 6) + 3; // 3-8 bots
    const selectedProfiles = shuffledProfiles.slice(0, Math.min(numBots, availableProfiles.length));

    return selectedProfiles.map((profile, index) => ({
      id: profile.id,
      name: profile.full_name || profile.username || 'User',
      avatar: profile.avatar_url,
      isOnline: Math.random() > 0.2, // 80% chance of being online
      isBot: true, // Mark as bot internally but don't show in UI
      interests: this.generateInterestsForTopic(topicId),
      lastMessageTime: null
    }));
  }

  // Generate random interests based on topic
  generateInterestsForTopic(topicId) {
    const topicInterests = {
      'mental-health': ['wellness', 'support', 'mindfulness', 'therapy', 'self-care'],
      'dating-relationships': ['dating', 'relationships', 'love', 'communication', 'connection'],
      'gaming-esports': ['gaming', 'esports', 'technology', 'streaming', 'accessibility'],
      'adaptive-sports': ['sports', 'fitness', 'athletics', 'health', 'motivation'],
      'plan-management': ['ndis', 'planning', 'support', 'services', 'management'],
      'arts-crafts': ['art', 'creativity', 'crafts', 'expression', 'therapy'],
      'tech-help': ['technology', 'accessibility', 'apps', 'devices', 'innovation'],
      'employment': ['work', 'career', 'jobs', 'skills', 'opportunities'],
      'parents-carers': ['family', 'care', 'support', 'parenting', 'respite']
    };

    const interests = topicInterests[topicId] || ['community', 'support', 'sharing'];
    return this.shuffleArray(interests).slice(0, 3);
  }

  // Get a contextual message for a bot
  getBotMessage(topicId, botInterests, recentMessages = []) {
    // Check if this is a response to recent messages
    const lastUserMessage = recentMessages.find(msg => !msg.isBot);
    if (lastUserMessage) {
      const response = this.getContextualResponse(lastUserMessage.content);
      if (response) return response;
    }

    // Get topic-specific messages
    const messages = topicMessages[topicId] || topicMessages.default;
    
    // Filter messages based on bot interests if possible
    const relevantMessages = messages.filter(msg => 
      botInterests.some(interest => 
        msg.toLowerCase().includes(interest.toLowerCase())
      )
    );

    const messagePool = relevantMessages.length > 0 ? relevantMessages : messages;
    return messagePool[Math.floor(Math.random() * messagePool.length)];
  }

  // Get contextual response based on keywords
  getContextualResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.match(/\b(hi|hello|hey|g'day)\b/)) {
      return contextualResponses.greeting[Math.floor(Math.random() * contextualResponses.greeting.length)];
    }
    
    if (lowerMessage.match(/\b(thanks|thank you|cheers|ta)\b/)) {
      return contextualResponses.thanks[Math.floor(Math.random() * contextualResponses.thanks.length)];
    }
    
    if (lowerMessage.includes('?')) {
      return contextualResponses.question[Math.floor(Math.random() * contextualResponses.question.length)];
    }
    
    if (lowerMessage.match(/\b(congrat|amazing|awesome|great news|fantastic)\b/)) {
      return contextualResponses.celebration[Math.floor(Math.random() * contextualResponses.celebration.length)];
    }
    
    if (lowerMessage.match(/\b(help|support|struggling|difficult|hard time)\b/)) {
      return contextualResponses.support[Math.floor(Math.random() * contextualResponses.support.length)];
    }
    
    return null;
  }

  // Start bot conversation simulation
  startBotActivity(roomId, topicId, onNewMessage) {
    if (this.messageTimers.has(roomId)) {
      this.stopBotActivity(roomId);
    }

    const bots = this.activeBots.get(roomId);
    if (!bots || bots.length === 0) {
      console.log('[ChatBotService] No bots available for room:', roomId);
      return;
    }
    
    // Initial messages after a short delay
    setTimeout(() => {
      this.generateBotMessage(roomId, topicId, onNewMessage);
    }, 3000);

    // Periodic messages
    const timer = setInterval(() => {
      if (Math.random() > 0.6) { // 40% chance every interval
        this.generateBotMessage(roomId, topicId, onNewMessage);
      }
    }, 15000 + Math.random() * 15000); // 15-30 seconds

    this.messageTimers.set(roomId, timer);
  }

  // Stop bot activity for a room
  stopBotActivity(roomId) {
    const timer = this.messageTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.messageTimers.delete(roomId);
    }
  }

  // Generate a single bot message
  generateBotMessage(roomId, topicId, onNewMessage) {
    const bots = this.activeBots.get(roomId);
    if (!bots || bots.length === 0) return;

    const onlineBots = bots.filter(bot => bot.isOnline);
    if (onlineBots.length === 0) return;

    // Select a bot that hasn't messaged recently
    const now = Date.now();
    const availableBots = onlineBots.filter(bot => 
      !bot.lastMessageTime || now - bot.lastMessageTime > 30000 // 30 seconds
    );

    if (availableBots.length === 0) return;

    const bot = availableBots[Math.floor(Math.random() * availableBots.length)];
    bot.lastMessageTime = now;

    const message = {
      id: `bot-msg-${now}-${Math.random()}`,
      sender_id: bot.id,
      content: this.getBotMessage(topicId, bot.interests),
      created_at: new Date().toISOString(),
      isBot: true,
      sender: {
        id: bot.id,
        full_name: bot.name,
        avatar_url: bot.avatar
      }
    };

    if (onNewMessage) {
      onNewMessage(message);
    }

    return message;
  }

  // Utility function to shuffle array
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // Clean up all bot activities
  cleanup() {
    this.messageTimers.forEach((timer, roomId) => {
      clearInterval(timer);
    });
    this.messageTimers.clear();
    this.activeBots.clear();
  }
}

export default new ChatBotService();