import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PanResponder,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';

const { width, height } = Dimensions.get('window');

const CommentTray = ({ 
  visible, 
  onClose, 
  item,
  itemType = 'post', // Can be 'post', 'group', etc.
  onCommentAdded
}) => {
  // Get current user from context
  const { user } = useUser();
  
  // State
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Pan gesture handler for drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5; // Only respond to downward gestures
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward movement
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) { // Threshold to dismiss
          onClose();
        } else {
          // Snap back to original position
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
  // Animation effects
  useEffect(() => {
    if (visible) {
      setComment(''); // Clear input when opened
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);
  
  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      let tableName = '';
      let commentData = {};
      
      // Prepare comment data based on item type
      if (itemType === 'post') {
        tableName = 'post_comments';
        commentData = {
          post_id: item.id,
          user_id: user.id,
          content: comment.trim(),
          created_at: new Date().toISOString()
        };
      } else if (itemType === 'group') {
        tableName = 'group_comments';
        commentData = {
          group_id: item.id,
          user_id: user.id,
          content: comment.trim(),
          created_at: new Date().toISOString()
        };
      }
      
      // Insert comment to appropriate table
      const { data, error } = await supabase
        .from(tableName)
        .insert(commentData)
        .select('*, user_profiles(username, full_name, avatar_url)');
        
      if (error) throw error;
      
      // Call the callback with the new comment
      if (onCommentAdded && data && data[0]) {
        onCommentAdded(data[0]);
      }
      
      // Clear input and close tray
      setComment('');
      onClose();
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!visible) return null;
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      
      <Animated.View
        style={[
          styles.tray,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.trayContent}>
          {/* Handle for drag gesture */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          <Text style={styles.title}>Add Comment</Text>
          
          {/* Comment input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Write a comment..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              autoFocus
            />
            
            <View style={styles.inputActions}>
              <Text style={styles.charCount}>{comment.length}/500</Text>
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!comment.trim() || isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitComment}
                disabled={!comment.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  tray: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxHeight: height * 0.5,
  },
  trayContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#aaa',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 16,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#333',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  input: {
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  charCount: {
    color: '#aaa',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: COLORS.DARK_GREEN,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#555',
  },
});

export default CommentTray;
