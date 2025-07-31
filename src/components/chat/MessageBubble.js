import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity
} from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';
import { BUBBLE_COLORS } from '../../constants/chatConstants';
import { format } from 'date-fns';

const MessageBubble = ({ message, isOwnMessage, isBot = false, onPressAvatar }) => {
  const [avatarError, setAvatarError] = useState(false);
  const defaultAvatar = require('../../assets/images/default-avatar.png');
  
  // Format time from ISO string to readable format (e.g., 10:30 AM)
  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch (e) {
      return '';
    }
  };

  const shouldUseDefaultAvatar = !message.sender?.avatar_url || avatarError;

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      {!isOwnMessage && message.sender && (
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={onPressAvatar}
          disabled={!onPressAvatar}
        >
          {shouldUseDefaultAvatar ? (
            <Image 
              source={defaultAvatar} 
              style={styles.avatar}
              defaultSource={defaultAvatar}
            />
          ) : (
            <Image 
              source={{ uri: message.sender.avatar_url }} 
              style={styles.avatar}
              onError={() => setAvatarError(true)}
              defaultSource={defaultAvatar}
            />
          )}
        </TouchableOpacity>
      )}
      
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
      ]}>
        {/* Sender name for group chats */}
        {!isOwnMessage && message.sender && (
          <View style={styles.senderRow}>
            <Text style={styles.senderName}>
              {message.sender.full_name || message.sender.username || 'Unknown'}
            </Text>
          </View>
        )}
        
        {/* Message content */}
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.content}
        </Text>
        
        {/* Time stamp */}
        <Text style={[
          styles.timeText,
          isOwnMessage ? styles.ownTimeText : styles.otherTimeText
        ]}>
          {formatTime(message.created_at)}
          {isOwnMessage && (
            <Text style={styles.readStatus}>
              {message.read ? ' • Read' : ''}
            </Text>
          )}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8, // Added horizontal padding to prevent edge cropping
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
    marginLeft: 40, // Reduced margin to prevent cropping
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
    marginRight: 40, // Reduced margin to prevent cropping
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 15,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '80%',
  },
  ownMessageBubble: {
    backgroundColor: BUBBLE_COLORS.SENT,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: BUBBLE_COLORS.RECEIVED,
    borderBottomLeftRadius: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFF',
  },
  otherMessageText: {
    color: '#000',
  },
  timeText: {
    fontSize: 10,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  ownTimeText: {
    color: BUBBLE_COLORS.READ_INDICATOR,
  },
  otherTimeText: {
    color: BUBBLE_COLORS.TIME_STAMP,
  },
  readStatus: {
    fontSize: 10,
    fontStyle: 'italic',
  }
});

export default MessageBubble;
