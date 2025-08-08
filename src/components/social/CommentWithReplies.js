import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCommentReplies, addCommentReply } from '../../services/postService';
import MentionInput from './MentionInput';

// Custom date formatting function
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${month} ${day}, ${year} • ${formattedHours}:${formattedMinutes} ${ampm}`;
};

const CommentWithReplies = ({ comment, postId, onReplyAdded }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [repliesCount, setRepliesCount] = useState(0);

  useEffect(() => {
    if (showReplies && replies.length === 0) {
      fetchReplies();
    }
  }, [showReplies]);

  const fetchReplies = async () => {
    setLoadingReplies(true);
    try {
      const { data } = await getCommentReplies(comment.id);
      setReplies(data || []);
      setRepliesCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleToggleReplies = () => {
    setShowReplies(!showReplies);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    
    setSubmittingReply(true);
    try {
      const { data, error } = await addCommentReply(comment.id, replyText, postId);
      if (error) throw error;
      
      // Add new reply to the list
      if (data) {
        // Get user profile from user_profiles table
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user_id)
          .single();
          
        const userProfile = userData || { username: 'User', avatar_url: null };
        const newReply = {
          ...data,
          username: userProfile.username || 'User',
          user_avatar: userProfile.avatar_url,
        };
        
        setReplies([...replies, newReply]);
        setRepliesCount(repliesCount + 1);
        setReplyText('');
        setShowReplyInput(false);
        
        if (onReplyAdded) {
          onReplyAdded(newReply);
        }
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const renderReply = (reply, index) => (
    <View key={reply.id || index} style={styles.replyContainer}>
      <Image
        source={{ uri: reply.user_avatar || 'https://via.placeholder.com/30' }}
        style={styles.replyAvatar}
      />
      <View style={styles.replyContent}>
        <Text style={styles.replyUsername}>{reply.username || 'User'}</Text>
        <Text style={styles.replyText}>{reply.reply}</Text>
        <Text style={styles.replyTime}>
          {formatDate(reply.created_at)}
        </Text>
      </View>
    </View>
  );

  // Process text to highlight mentions with color
  const renderCommentText = (text) => {
    if (!text) return null;
    
    // Find mentions using regex
    const parts = text.split(/(@\w+)/g);
    
    return (
      <Text style={styles.commentText}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <Text key={index} style={styles.mention}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.commentItem}>
        <Image
          source={{ uri: comment.user_avatar || 'https://via.placeholder.com/40' }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <Text style={styles.commentUsername}>{comment.username || 'User'}</Text>
          {renderCommentText(comment.comment)}
          <View style={styles.commentActions}>
            <Text style={styles.commentTime}>
              {formatDate(comment.created_at)}
            </Text>
            <TouchableOpacity
              onPress={() => setShowReplyInput(!showReplyInput)}
              style={styles.replyButton}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {repliesCount > 0 && (
        <TouchableOpacity
          style={styles.viewRepliesButton}
          onPress={handleToggleReplies}
        >
          <Ionicons
            name={showReplies ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.viewRepliesText}>
            {showReplies ? 'Hide replies' : `View ${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}`}
          </Text>
        </TouchableOpacity>
      )}
      
      {showReplies && (
        <View style={styles.repliesContainer}>
          {loadingReplies ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
          ) : (
            replies.map(renderReply)
          )}
        </View>
      )}
      
      {showReplyInput && (
        <View style={styles.replyInputContainer}>
          <MentionInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a reply..."
            style={styles.mentionInputContainer}
            inputStyle={styles.mentionInput}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!replyText.trim() || submittingReply) && styles.disabledButton
            ]}
            onPress={handleSubmitReply}
            disabled={!replyText.trim() || submittingReply}
          >
            {submittingReply ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  mention: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#888',
    marginRight: 16,
  },
  replyButton: {
    padding: 4,
  },
  replyButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 52,
  },
  viewRepliesText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  repliesContainer: {
    paddingLeft: 52,
  },
  replyContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  replyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  replyContent: {
    flex: 1,
  },
  replyUsername: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 1,
  },
  replyText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  replyTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 52,
  },
  mentionInputContainer: {
    flex: 1,
    marginRight: 8,
  },
  mentionInput: {
    height: 40,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loader: {
    padding: 8,
  },
});

export default CommentWithReplies;
