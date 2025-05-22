import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabaseClient';
import { likePost, unlikePost, checkIfUserLikedPost, addComment } from '../../services/postService';
import { sharePost as sharePostService } from '../../services/shareService';
import SharePostModal from '../../components/social/SharePostModal';

// Simple date formatting function
const formatDate = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

const PostDetailScreen = ({ route, navigation }) => {
  const params = route.params || {};
  const { post, isNewPost = false } = params;
  const [commentText, setCommentText] = useState('');
  const [posterProfile, setPosterProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch the poster's profile including avatar when component mounts
  useEffect(() => {
    if (post && post.user_id) {
      fetchPosterProfile(post.user_id);
      fetchPostCounts();
      fetchComments();
      getCurrentUser();
      checkLikeStatus();
    }
  }, [post]);
  
  // Get current logged in user
  const getCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };
  
  // Fetch counts (likes, comments, etc.)
  const fetchPostCounts = async () => {
    if (!post || !post.post_id) return;
    
    try {
      // Get likes count
      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('id', { count: 'exact' })
        .eq('post_id', post.post_id);
        
      // Get comments count
      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('id', { count: 'exact' })
        .eq('post_id', post.post_id);
      
      setLikesCount(likesCount || 0);
      setCommentsCount(commentsCount || 0);
    } catch (error) {
      console.error('Error fetching post counts:', error);
    }
  };
  
  // Check if current user has liked the post
  const checkLikeStatus = async () => {
    if (!post || !post.post_id) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      
      const { data: like } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.post_id)
        .eq('user_id', userData.user.id)
        .maybeSingle();
      
      setIsLiked(!!like);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };
  
  // Fetch comments for this post
  const fetchComments = async () => {
    if (!post || !post.post_id) return;
    
    try {
      // First, fetch the comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('post_comments')
        .select('id, comment, created_at, user_id')
        .eq('post_id', post.post_id)
        .order('created_at', { ascending: true });
      
      if (commentsError) throw commentsError;
      
      // If we have comments, fetch the user profiles for each commenter
      if (commentsData && commentsData.length > 0) {
        const commentWithProfiles = await Promise.all(commentsData.map(async (comment) => {
          // Get user profile for this comment
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('username, full_name, avatar_url')
            .eq('id', comment.user_id)
            .single();
          
          if (profileError && !profileError.message.includes('No rows found')) {
            console.error('Error fetching user profile:', profileError);
          }
          
          // Return comment with profile data
          return {
            ...comment,
            user_profiles: userProfile || { username: 'User', full_name: '', avatar_url: null }
          };
        }));
        
        setComments(commentWithProfiles);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };
  
  // Handle like/unlike post
  const handleLikePress = async () => {
    if (!post || !post.post_id || !currentUser) return;
    
    try {
      if (isLiked) {
        await unlikePost(post.post_id, currentUser.id);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await likePost(post.post_id, currentUser.id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };
  
  // Handle adding a comment
  const handleAddComment = async () => {
    if (!commentText.trim() || !post || !post.post_id || !currentUser) return;
    
    setSubmittingComment(true);
    try {
      await addComment(post.post_id, currentUser.id, commentText);
      setCommentText('');
      fetchComments();
      setCommentsCount(prev => prev + 1);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Handle sharing a post
  const handleSharePost = async (caption) => {
    if (!post || !post.post_id || !currentUser) return;
    
    try {
      await sharePostService(post.post_id, currentUser.id, caption);
      setShowShareModal(false);
      Alert.alert('Success', 'Post shared successfully!');
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    }
  };

  // Function to fetch poster's profile from user_profiles table
  const fetchPosterProfile = async (userId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setPosterProfile(data);
    } catch (error) {
      console.error('Error fetching poster profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isNewPost) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Create New Post" navigation={navigation} canGoBack={true} />
        <ScrollView style={styles.scrollView}>
          <View style={styles.createPostContainer}>
            <Text style={styles.createPostHeader}>Create a New Post</Text>
            <TextInput
              placeholder="What's on your mind?"
              style={styles.createPostInput}
              multiline={true}
              maxLength={2000}
            />
            <TouchableOpacity style={styles.addMediaButton}>
              <Ionicons name="image-outline" size={24} color="#007AFF" />
              <Text style={styles.addMediaText}>Add Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postButton}>
              <Text style={styles.postButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Post Details" navigation={navigation} canGoBack={true} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Post Details" navigation={navigation} canGoBack={true} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <Image 
              source={{
                uri: posterProfile?.avatar_url || 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/avatars/default-avatar.png'
              }} 
              style={styles.avatar} 
            />
            <View style={styles.headerInfo}>
              <Text style={styles.username}>{posterProfile?.username || posterProfile?.full_name || 'User'}</Text>
              <Text style={styles.postTime}>{formatDate(post.created_at)}</Text>
            </View>
          </View>
          <Text style={styles.postContent}>{post.caption}</Text>
          {post.media_urls && post.media_urls.length > 0 && (
            <Image source={{ uri: post.media_urls[0] }} style={styles.postImage} resizeMode="cover" />
          )}
        </View>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLikePress}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={isLiked ? "#FF0000" : "#333"} 
            />
            <Text style={styles.actionText}>{likesCount > 0 ? likesCount : ''} {likesCount === 1 ? 'Like' : 'Likes'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color="#333" />
            <Text style={styles.actionText}>{commentsCount > 0 ? commentsCount : ''} {commentsCount === 1 ? 'Comment' : 'Comments'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowShareModal(true)}>
            <Ionicons name="share-social-outline" size={22} color="#333" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.commentsContainer}>
          <Text style={styles.commentsHeader}>Comments ({commentsCount})</Text>
          
          {/* Comments list */}
          {comments.length > 0 ? (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image 
                    source={{ uri: item.user_profiles?.avatar_url || 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/avatars/default-avatar.png' }} 
                    style={styles.commentAvatar} 
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUsername}>{item.user_profiles?.username || 'User'}</Text>
                    <Text style={styles.commentText}>{item.comment}</Text>
                    <Text style={styles.commentTime}>{formatDate(item.created_at)}</Text>
                  </View>
                </View>
              )}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.noCommentsText}>No comments yet</Text>}
            />
          ) : (
            <Text style={styles.noCommentsText}>No comments yet</Text>
          )}
          
          {/* Add comment box */}
          <View style={styles.commentBox}>
            <Image 
              source={{
                uri: currentUser?.user_metadata?.avatar_url || 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/avatars/default-avatar.png'
              }} 
              style={styles.commentAvatar} 
            />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.postCommentButton, !commentText.trim() && styles.postCommentButtonDisabled]}
              onPress={handleAddComment}
              disabled={!commentText.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postCommentText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Share Post Modal */}
      <SharePostModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
        onShareComplete={handleSharePost}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createPostContainer: {
    padding: 16,
  },
  createPostHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  createPostInput: {
    height: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addMediaText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
  },
  postButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  postContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  postTime: {
    color: '#666',
    fontSize: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 6,
    color: '#333',
  },
  commentsContainer: {
    padding: 12,
  },
  commentsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  commentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    marginTop: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    maxHeight: 100,
  },
  postCommentButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  postCommentButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  postCommentText: {
    color: '#fff',
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commentContent: {
    flex: 1,
    marginLeft: 8,
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#999',
    padding: 10,
    fontStyle: 'italic',
  },
  emptyCollectionsContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCollectionsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  createCollectionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createCollectionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PostDetailScreen;
