import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { sharePost, getUserDetails } from '../../services/postService';
import { supabase } from '../../lib/supabaseClient';

const { width, height } = Dimensions.get('window');

// Custom date formatting function
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

const SharePostModal = ({ visible, onClose, post, onShareComplete }) => {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [originalPoster, setOriginalPoster] = useState(null);

  React.useEffect(() => {
    if (post && post.user_id) {
      fetchOriginalPoster();
    }
  }, [post]);

  const fetchOriginalPoster = async () => {
    try {
      const userData = await getUserDetails(post.user_id);
      setOriginalPoster(userData);
    } catch (error) {
      console.error('Error fetching post creator:', error);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    
    setLoading(true);
    try {
      const { data, error } = await sharePost(post.post_id, caption);
      if (error) throw error;
      
      setCaption('');
      if (onShareComplete) {
        onShareComplete(data);
      }
      onClose();
    } catch (error) {
      console.error('Error sharing post:', error);
      alert('Failed to share post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Share Post</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.content}>
              {/* Original post preview */}
              <View style={styles.originalPostContainer}>
                <View style={styles.postHeader}>
                  <Image
                    source={{ uri: originalPoster?.avatar_url || 'https://via.placeholder.com/40' }}
                    style={styles.avatar}
                  />
                  <View>
                    <Text style={styles.username}>{originalPoster?.username || 'User'}</Text>
                    <Text style={styles.postTime}>{formatDate(post.created_at)}</Text>
                  </View>
                </View>
                
                {post.media_urls && post.media_urls.length > 0 && (
                  <Image
                    source={{ uri: post.media_urls[0] }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}
                
                {post.caption && (
                  <Text style={styles.caption} numberOfLines={3}>
                    {post.caption}
                  </Text>
                )}
              </View>
              
              <Text style={styles.addCaptionLabel}>Add a caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={500}
              />
            </ScrollView>
            
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.shareButton, loading && styles.disabledButton]}
                onPress={handleShare}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.shareButtonText}>Share Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    maxHeight: height * 0.5,
  },
  originalPostContainer: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#888',
  },
  postImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  addCaptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SharePostModal;
