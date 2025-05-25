import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import FallbackImage from '../common/FallbackImage';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system';

// Custom date formatting function
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

// Helper function to process image URIs for different formats
const processImageUri = (imageUri) => {
  if (!imageUri) {
    return 'https://via.placeholder.com/300';
  }
  
  // Handle base64 encoded images
  if (imageUri.startsWith('data:image')) {
    return imageUri;
  }
  
  // Handle local file paths
  if (imageUri.startsWith('file://')) {
    return imageUri;
  }
  
  // Handle Supabase storage URLs
  if (imageUri.includes('supabase.co/storage/v1/object/public')) {
    return imageUri;
  }
  
  // Handle relative paths from Supabase storage
  if (imageUri.startsWith('/')) {
    // Convert to full Supabase URL
    return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public${imageUri}`;
  }
  
  // Handle regular URLs (http/https)
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return imageUri;
  }
  
  // If it's just a filename without path, assume it's in Supabase storage
  if (!imageUri.includes('/')) {
    return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/posts/${imageUri}`;
  }
  
  // Default fallback
  return imageUri;
};

import { getUserDetails, bookmarkPost, unbookmarkPost, isPostBookmarked, getUserCollections, addPostToCollection, likePost, unlikePost, checkIfUserLikedPost } from '../../services/postService';
import LikesListModal from './LikesListModal';
import SharePostModal from './SharePostModal';

const { width, height } = Dimensions.get('window');

const PostCard = ({ post, onPress, showActions = true }) => {
  const [user, setUser] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [savingToCollection, setSavingToCollection] = useState(false);
  
  // Animation references for double-tap heart
  const doubleTapRef = useRef(null);
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  // Image loading states
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchUserDetails();
    fetchCounts();
    checkLikeStatus();
  }, [post]);
  
  // Check bookmarked status when component mounts
  useEffect(() => {
    if (post && post.post_id) {
      checkBookmarkedStatus();
      checkLikeStatus();
    }
  }, [post]);
  
  // Function to fetch user collections
  const fetchUserCollections = async () => {
    setLoadingCollections(true);
    try {
      const { data } = await getUserCollections();
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoadingCollections(false);
    }
  };
  
  // Handle showing collections modal
  const handleShowCollectionsModal = () => {
    fetchUserCollections();
    setShowCollectionsModal(true);
  };
  
  // Handle saving post to a collection
  const handleSaveToCollection = async (collectionId) => {
    setSavingToCollection(true);
    try {
      const { data, error } = await addPostToCollection(post.post_id, collectionId);
      if (error) throw error;
      
      // Show success feedback
      setShowCollectionsModal(false);
      // You could implement a toast notification here
    } catch (error) {
      console.error('Error saving to collection:', error);
      alert('Failed to save to collection. Please try again.');
    } finally {
      setSavingToCollection(false);
    }
  };

  const fetchUserDetails = async () => {
    try {
      if (post && post.user_id) {
        const userData = await getUserDetails(post.user_id);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const fetchCounts = async () => {
    if (!post || !post.post_id) return;
    
    try {
      // Get likes count
      const { data: likes, count: likesCount } = await supabase
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
      console.error('Error fetching counts:', error);
    }
  };
  
  // Check if user has liked the post
  const checkLikeStatus = async () => {
    if (!post || !post.post_id) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      
      const isLiked = await checkIfUserLikedPost(post.post_id, userData.user.id);
      setIsLiked(isLiked);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };
  
  // We'll just keep the checkLikeStatus function here
  
  // Handle double tap animation and like action
  const onDoubleTap = async () => {
    // Don't perform like if already liked
    if (!isLiked) {
      // Show heart animation
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Perform like action
      await handleLikePress();
    }
  };
  
  const handleLikePress = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      
      if (isLiked) {
        // Unlike post - use the service function
        await unlikePost(post.post_id, userData.user.id);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like post - use the service function
        await likePost(post.post_id, userData.user.id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        
        // Show heart animation on like
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.2,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.delay(500),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };
  
  const checkBookmarkedStatus = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const isBookmarked = await isPostBookmarked(post.post_id, userData.user.id);
      setIsBookmarked(isBookmarked);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };
  
  const handleBookmarkPress = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (isBookmarked) {
        await unbookmarkPost(post.post_id, userData.user.id);
        setIsBookmarked(false);
      } else {
        await bookmarkPost(post.post_id, userData.user.id);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Handle image loading state
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };
  
  // Handle image error
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };
  
  const onSingleTap = () => {
    if (onPress) {
      onPress(post);
    }
  };

  return (
    <View style={styles.card}>
      {/* User header */}
      <TouchableOpacity 
        style={styles.cardHeader}
        onPress={() => {
          // Navigate to user profile
        }}
      >
        <FallbackImage 
          source={{ uri: user?.avatar_url || 'https://via.placeholder.com/40' }} 
          style={styles.avatar}
          fallbackSource={'https://via.placeholder.com/40'}
        />
        <View>
          <Text style={styles.username}>{user?.username || 'User'}</Text>
          <Text style={styles.postTime}>
            {formatDate(post.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
      
      {/* Post image */}
      <TapGestureHandler
        ref={doubleTapRef}
        numberOfTaps={2}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.ACTIVE) {
            onDoubleTap();
          }
        }}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={onSingleTap}
        >
          <View style={styles.imageContainer}>
            {post.media_urls && post.media_urls.length > 0 ? (
              <>
                <FallbackImage
                  source={processImageUri(post.media_urls[currentImageIndex])}
                  style={styles.image}
                  fallbackSource={'https://via.placeholder.com/400x300?text=Image+Not+Available'}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  imageProps={{ resizeMode: 'cover' }}
                />
                
                {/* Heart animation on double-tap */}
                <Animated.View
                  style={[
                    styles.heartContainer,
                    {
                      transform: [{ scale }],
                      opacity,
                    },
                  ]}
                >
                  <Ionicons name="heart" size={80} color="#fff" />
                </Animated.View>
                
                {/* Image pagination dots */}
                {post.media_urls.length > 1 && (
                  <>
                    <View style={styles.paginationContainer}>
                      {post.media_urls.map((_, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.paginationDotButton}
                          onPress={() => setCurrentImageIndex(index)}
                        >
                          <View
                            style={[
                              styles.paginationDot,
                              currentImageIndex === index && styles.paginationDotActive,
                            ]}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {/* Left/Right navigation arrows */}
                    <View style={styles.imageNavigation}>
                      {currentImageIndex > 0 && (
                        <TouchableOpacity 
                          style={styles.navButton}
                          onPress={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                        >
                          <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                      )}
                      
                      {currentImageIndex < post.media_urls.length - 1 && (
                        <TouchableOpacity 
                          style={styles.navButton}
                          onPress={() => setCurrentImageIndex(prev => Math.min(post.media_urls.length - 1, prev + 1))}
                        >
                          <Ionicons name="chevron-forward" size={24} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </>
            ) : (
              <View style={styles.noImageContainer}>
                <Ionicons name="image-outline" size={40} color="#CCC" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TapGestureHandler>
      
      {/* Caption */}
      {post.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption} numberOfLines={3}>
            {post.caption}
          </Text>
        </View>
      )}
      
      {/* Post footer with actions */}
      {showActions && (
        <View style={styles.cardFooter}>
          <View style={styles.actionRow}>
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleLikePress}
              >
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={22} 
                  color={isLiked ? "#FF0000" : "#333"} 
                />
              </TouchableOpacity>
              
              {likesCount > 0 && (
                <TouchableOpacity 
                  onPress={() => setShowLikesModal(true)}
                  style={styles.likesCountButton}
                >
                  <Text style={styles.actionText}>{likesCount}</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onPress && onPress(post)}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#333" />
              {commentsCount > 0 && (
                <Text style={styles.actionText}>{commentsCount}</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share-social-outline" size={20} color="#333" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShowCollectionsModal}
            >
              <Ionicons name="albums-outline" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.bookmarkButton}
            onPress={handleBookmarkPress}
          >
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={22} 
              color={isBookmarked ? COLORS.primary : "#333"} 
            />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Modals */}
      <LikesListModal 
        visible={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        postId={post.post_id}
      />
      
      <SharePostModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
        onShareComplete={() => setShowShareModal(false)}
      />
      
      {showCollectionsModal && (
        <Modal
          visible={showCollectionsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCollectionsModal(false)}
        >
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
                  keyExtractor={item => item.id.toString()}
                  contentContainerStyle={styles.collectionsList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.collectionItem}
                      onPress={() => handleSaveToCollection(item.id)}
                      disabled={savingToCollection}
                    >
                      <View style={styles.collectionIconContainer}>
                        <Ionicons name="folder" size={24} color={COLORS.primary} />
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
                />
              ) : (
                <View style={styles.emptyCollectionsContainer}>
                  <Text style={styles.emptyCollectionsText}>
                    You don't have any collections yet.
                  </Text>
                  <TouchableOpacity 
                    style={styles.createCollectionButton}
                    onPress={() => {
                      setShowCollectionsModal(false);
                      // Here you would navigate to the collections screen
                      // navigation.navigate('Collections');
                    }}
                  >
                    <Text style={styles.createCollectionText}>Create Collection</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  imageContainer: {
    width: '100%',
    height: width,
    position: 'relative',
    backgroundColor: '#f7f7f7',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0', // Light background for images while loading
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  imageErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  imageErrorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#FFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paginationDotButton: {
    padding: 5,
  },
  imageNavigation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionContainer: {
    padding: 12,
    paddingTop: 8,
  },
  caption: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  likesCountButton: {
    padding: 4,
    paddingLeft: 2,
  },
  actionText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 2,
    fontWeight: '500',
  },
  bookmarkButton: {
    padding: 4,
  },
  // Collection modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionsModalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

export default PostCard;
