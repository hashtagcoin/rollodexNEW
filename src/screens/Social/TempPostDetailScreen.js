import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Dimensions,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  getPostComments, 
  addComment, 
  likePost, 
  unlikePost, 
  checkIfUserLikedPost,
  getPostLikes,
  getUserDetails,
  sharePost,
  getUserCollections,
  addPostToCollection,
  processTagsInText
} from '../../services/postService';
import CommentWithReplies from '../../components/social/CommentWithReplies';
import SharePostModal from '../../components/social/SharePostModal';

const { width, height } = Dimensions.get('window');

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

const PostDetailScreen = ({ route, navigation }) => {
  const { post } = route.params;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : 0;
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [postUser, setPostUser] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // Social features state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [savingToCollection, setSavingToCollection] = useState(false);
  
  const commentInputRef = useRef(null);

  useEffect(() => {
    fetchPostDetails();
    fetchComments();
    checkLikeStatus();
  }, []);

  const fetchPostDetails = async () => {
    try {
      if (post.user_id) {
        const userData = await getUserDetails(post.user_id);
        setPostUser(userData);
      }
    } catch (error) {
      console.error('Error fetching post user details:', error);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const { data } = await getPostComments(post.post_id);
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const checkLikeStatus = async () => {
    try {
      // Check if the current user has liked the post
      const { isLiked } = await checkIfUserLikedPost(post.post_id);
      setIsLiked(isLiked);
      
      // Get total likes count
      const { data: likesData } = await getPostLikes(post.post_id);
      setLikesCount(likesData?.length || 0);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLikePress = async () => {
    try {
      if (isLiked) {
        await unlikePost(post.post_id);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await likePost(post.post_id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    
    setSubmitting(true);
    try {
      console.log('Starting comment submission process...');
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) {
        throw new Error('User not authenticated');
      }
      
      const userId = userData.user.id;
      console.log('User authenticated with ID:', userId);
      
      // Skip tag processing for now to simplify the flow
      const finalCommentText = commentText.trim();
      console.log('Comment text ready:', finalCommentText);
      
      // Add the comment - direct database insert to bypass any potential issues
      console.log('Inserting comment into database...');
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.post_id,
          user_id: userId,
          comment: finalCommentText,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Comment successfully added:', data);
      
      if (data) {
        // Format the new comment for the UI
        const newComment = {
          ...data,
          username: userData.user.user_metadata?.username || 'User',
          user_avatar: userData.user.user_metadata?.avatar_url,
        };
        
        setComments([...comments, newComment]);
        setCommentText('');
        console.log('UI updated with new comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert(`Failed to add comment: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Collections functionality
  const fetchUserCollections = async () => {
    setLoadingCollections(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const collections = await getUserCollections(user.id);
      setCollections(collections || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoadingCollections(false);
    }
  };
  
  const handleShowCollectionsModal = () => {
    fetchUserCollections();
    setShowCollectionsModal(true);
  };
  
  const handleSaveToCollection = async (collectionId) => {
    setSavingToCollection(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await addPostToCollection(collectionId, post.post_id, user.id);
      if (error) throw error;
      
      setShowCollectionsModal(false);
      // Could add toast notification here
    } catch (error) {
      console.error('Error saving to collection:', error);
      alert('Failed to save to collection. Please try again.');
    } finally {
      setSavingToCollection(false);
    }
  };

  const renderCommentItem = ({ item }) => (
    <CommentWithReplies 
      comment={item} 
      postId={post.post_id}
      onReplyAdded={() => fetchComments()}
    />
  );
  
  const renderImageIndicators = () => {
    if (!post.media_urls || post.media_urls.length <= 1) return null;
    
    return (
      <View style={styles.indicatorsContainer}>
        {post.media_urls.map((_, index) => (
          <View
            key={index}
            style={[
              styles.imageIndicator,
              currentImageIndex === index && styles.imageIndicatorActive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <SafeAreaView style={styles.container}>
        <AppHeader title="Post Details" showBackButton />
        
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderCommentItem}
          ListHeaderComponent={() => (
            <View style={styles.postContainer}>
              {/* Post header */}
              <View style={styles.postHeader}>
                <Image
                  source={
                    postUser?.avatar_url
                      ? { uri: postUser.avatar_url }
                      : require('../../assets/default-avatar.png')
                  }
                  style={styles.avatar}
                />
                <View style={styles.headerInfo}>
                  <Text style={styles.username}>{postUser?.username || 'User'}</Text>
                  <Text style={styles.postTime}>
                    {formatDate(post.created_at)}
                  </Text>
                </View>
              </View>

              {/* Post Images */}
              {post.media_urls && post.media_urls.length > 0 && (
                <View style={styles.imageContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const newIndex = Math.floor(
                        e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
                      );
                      setCurrentImageIndex(newIndex);
                    }}
                  >
                    {post.media_urls.map((url, index) => (
                      <Image
                        key={`image-${index}`}
                        source={{ uri: url }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                  {renderImageIndicators()}
                </View>
              )}

              {/* Post Caption */}
              {post.caption && (
                <View style={styles.captionContainer}>
                  <Text style={styles.caption}>{post.caption}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleLikePress}
                  >
                    <Ionicons 
                      name={isLiked ? "heart" : "heart-outline"} 
                      size={24} 
                      color={isLiked ? COLORS.danger : "#333"} 
                    />
                    {likesCount > 0 && (
                      <Text style={styles.actionText}>{likesCount}</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={22} color="#333" />
                    {comments.length > 0 && (
                      <Text style={styles.actionText}>{comments.length}</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => setShowShareModal(true)}
                  >
                    <Ionicons name="share-social-outline" size={22} color="#333" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Comments header */}
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>
                  Comments {comments.length > 0 ? `(${comments.length})` : ''}
                </Text>
              </View>

              {/* Comments loading state */}
              {commentsLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              )}

              {/* Empty comments state */}
              {!commentsLoading && comments.length === 0 && (
                <View style={styles.emptyCommentsContainer}>
                  <Text style={styles.emptyCommentsText}>
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              )}
            </View>
          )}
          contentContainerStyle={styles.commentsContainer}
        />

        {/* Comment input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={commentInputRef}
            value={commentText}
            onChangeText={(text) => setCommentText(text)}
            placeholder="Add a comment..."
            style={styles.commentInput}
            multiline={true}
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !commentText.trim() && styles.disabledButton]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Share Modal */}
        <SharePostModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          post={post}
          onShareComplete={() => setShowShareModal(false)}
        />
        
        {/* Collections Modal */}
        {showCollectionsModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.collectionsModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Save to Collection</Text>
                <TouchableOpacity
                  onPress={() => setShowCollectionsModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              {loadingCollections ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : collections.length > 0 ? (
                <FlatList
                  data={collections}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.collectionItem}
                      onPress={() => handleSaveToCollection(item.id)}
                      disabled={savingToCollection}
                    >
                      <View style={styles.collectionIconContainer}>
                        <Ionicons name="bookmark" size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.collectionInfo}>
                        <Text style={styles.collectionName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.collectionDescription} numberOfLines={1}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                      {savingToCollection && (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.collectionsList}
                />
              ) : (
                <View style={styles.emptyCollectionsContainer}>
                  <Text style={styles.emptyCollectionsText}>
                    You don't have any collections yet.
                  </Text>
                  <TouchableOpacity style={styles.createCollectionButton}>
                    <Text style={styles.createCollectionText}>Create Collection</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  postContainer: {
    width: '100%',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    color: '#888',
  },
  imageContainer: {
    width: width,
    height: width,
    position: 'relative',
  },
  postImage: {
    width: width,
    height: width,
  },
  indicatorsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    margin: 3,
  },
  imageIndicatorActive: {
    backgroundColor: '#FFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  captionContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  caption: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  actionsContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    padding: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
  },
  commentsContainer: {
    paddingBottom: 100,
  },
  commentsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyCommentsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    fontFamily: FONTS.regular,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  collectionsModalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loaderContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionsList: {
    padding: 12,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  collectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collectionInfo: {
    flex: 1,
    marginRight: 8,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  collectionDescription: {
    fontSize: 13,
    color: '#666',
  },
  emptyCollectionsContainer: {
    padding: 30,
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
    backgroundColor: COLORS.primary,
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
