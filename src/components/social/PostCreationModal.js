import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

// Import Supabase
let supabase;
try {
  supabase = require('../../lib/supabaseClient').supabase;
} catch (error) {
  console.error('Error importing Supabase:', error);
  supabase = null;
}

const PostCreationModal = ({ 
  visible, 
  onClose, 
  onPostCreated, 
  groupId, 
  user 
}) => {
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePostSubmit = async () => {
    if (!postContent.trim()) {
      Alert.alert('Error', 'Please enter some content for your post.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a post.');
      return;
    }

    if (!groupId) {
      Alert.alert('Error', 'Group information is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('group_posts')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: postContent.trim(),
          created_at: new Date().toISOString()
        })
        .select(`
          id,
          content,
          media_url,
          media_type,
          created_at,
          user_profiles!inner(
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Format the post data for the UI
      const formattedPost = {
        id: data.id,
        post_id: data.id,
        content: data.content,
        image_url: data.media_url || null,
        created_at: data.created_at,
        author: {
          id: data.user_profiles.id,
          name: data.user_profiles.full_name || data.user_profiles.username || 'User',
          avatar_url: data.user_profiles.avatar_url || `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 90) + 1}.jpg`
        },
        user_has_liked: false,
        like_count: 0,
        comment_count: 0,
        is_own_post: true
      };

      // Call the callback to update the parent component
      onPostCreated?.(formattedPost);
      
      // Reset form and close modal
      setPostContent('');
      onClose();
      
      Alert.alert('Success', 'Your post has been created!');

    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setPostContent('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity 
              onPress={handlePostSubmit}
              disabled={isSubmitting || !postContent.trim()}
              style={[
                styles.postButton,
                (!postContent.trim() || isSubmitting) && styles.postButtonDisabled
              ]}
            >
              <Text style={[
                styles.modalPost,
                (!postContent.trim() || isSubmitting) && styles.modalPostDisabled
              ]}>
                {isSubmitting ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Post Creation Content */}
          <ScrollView style={styles.postCreationContent}>
            <View style={styles.userInfo}>
              <Image 
                source={{ 
                  uri: user?.user_metadata?.avatar_url || 
                       user?.avatar_url || 
                       'https://randomuser.me/api/portraits/lego/1.jpg' 
                }} 
                style={styles.userAvatar} 
              />
              <Text style={styles.userName}>
                {user?.user_metadata?.full_name || 
                 user?.full_name || 
                 user?.email?.split('@')[0] || 
                 'User'}
              </Text>
            </View>
            
            <TextInput
              style={styles.postTextInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              value={postContent}
              onChangeText={setPostContent}
              textAlignVertical="top"
              maxLength={1000}
            />
            
            <Text style={styles.characterCount}>
              {postContent.length}/1000
            </Text>
            
            {/* Media Upload Section - Future Implementation */}
            <View style={styles.mediaSection}>
              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="image-outline" size={24} color={COLORS.DARK_GREEN} />
                <Text style={styles.mediaButtonText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.DARK_GREEN,
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalPost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalPostDisabled: {
    color: '#999',
  },
  postCreationContent: {
    flex: 1,
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  postTextInput: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 16,
  },
  mediaSection: {
    marginTop: 16,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  mediaButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.DARK_GREEN,
    fontWeight: '500',
  },
});

export default PostCreationModal;
