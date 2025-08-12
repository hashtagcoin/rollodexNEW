import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import FallbackImage from '../common/FallbackImage';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getOptimizedImageUrl } from '../../utils/imageHelper';

// Import services
import { 
  getUserDetails, 
  getUserCollections, 
  addPostToCollection, 
  likePost, 
  unlikePost, 
  checkIfUserLikedPost 
} from '../../services/postService';
import {
  toggleBookmark,
  isPostBookmarked
} from '../../services/bookmarkService';
import LikesListModal from './LikesListModal';
import ShareTrayModal from '../common/ShareTrayModal';

const { width, height } = Dimensions.get('window');

// Custom date formatting function - memoized
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

// Helper function to process image URIs
const processImageUri = (imageUri) => {
  if (!imageUri) return 'https://via.placeholder.com/300';
  
  if (imageUri.startsWith('data:image') || 
      imageUri.startsWith('file://') || 
      imageUri.startsWith('http://') || 
      imageUri.startsWith('https://')) {
    return imageUri;
  }
  
  if (imageUri.includes('supabase.co/storage/v1/object/public')) {
    return imageUri;
  }
  
  if (imageUri.startsWith('/')) {
    return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public${imageUri}`;
  }
  
  if (!imageUri.includes('/')) {
    return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/posts/${imageUri}`;
  }
  
  return imageUri;
};

// Memoized user header component
const UserHeader = memo(({ user, postTime, onPress }) => {
  const normalizedAvatarUrl = useMemo(() => {
    if (!user?.avatar_url) return null;
    return user.avatar_url.replace(/(https?:\/\/)([^\/]*)\/\/+/g, '$1$2/');
  }, [user?.avatar_url]);

  return (
    <TouchableOpacity style={styles.cardHeader} onPress={onPress}>
      <FallbackImage 
        source={normalizedAvatarUrl} 
        style={styles.avatar}
      />
      <View>
        <Text style={styles.username}>{user?.username || 'User'}</Text>
        <Text style={styles.postTime}>{postTime}</Text>
      </View>
    </TouchableOpacity>
  );
});

// Memoized action button component
const ActionButton = memo(({ icon, isActive, activeColor, count, onPress, style }) => (
  <View style={styles.actionButtonGroup}>
    <TouchableOpacity style={[styles.actionButton, style]} onPress={onPress}>
      <Ionicons 
        name={icon} 
        size={22} 
        color={isActive ? activeColor : "#333"} 
      />
    </TouchableOpacity>
    {count > 0 && (
      <TouchableOpacity onPress={onPress} style={styles.countButton}>
        <Text style={styles.actionText}>{count}</Text>
      </TouchableOpacity>
    )}
  </View>
));

const PostCardOptimized = ({ post, onPress, showActions = true, onBookmarkToggle, initialBookmarkState, isGridView = false }) => {
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
  
  // Animation references
  const doubleTapRef = useRef(null);
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  // Refs for preventing unnecessary re-fetches
  const userFetchedRef = useRef(false);
  const countsFetchedRef = useRef(false);
  
  // Reset refs when post changes to ensure fresh data is fetched
  useEffect(() => {
    userFetchedRef.current = false;
    countsFetchedRef.current = false;
    // Reset states to defaults when post changes
    // Use initialBookmarkState if provided, otherwise default to false
    setIsBookmarked(initialBookmarkState !== undefined ? initialBookmarkState : false);
    setIsLiked(false);
    setLikesCount(0);
    setCommentsCount(0);
    setUser(null);
  }, [post?.post_id, initialBookmarkState]);

  // Memoized post date
  const postDate = useMemo(() => formatDate(post.created_at), [post.created_at]);

  // Memoized image URL
  const currentImageUrl = useMemo(() => {
    if (!post.media_urls || post.media_urls.length === 0) return null;
    return getOptimizedImageUrl(processImageUri(post.media_urls[currentImageIndex]), 400, 70);
  }, [post.media_urls, currentImageIndex]);

  // Fetch user details only once
  useEffect(() => {
    if (!userFetchedRef.current && post?.user_id) {
      userFetchedRef.current = true;
      getUserDetails(post.user_id).then(userData => {
        if (userData) setUser(userData);
      }).catch(console.error);
    }
  }, [post?.user_id]);

  // Fetch counts and status only once
  useEffect(() => {
    if (!countsFetchedRef.current && post?.post_id) {
      countsFetchedRef.current = true;
      
      console.log('[PostCard] Fetching bookmark status for post:', post.post_id);
      
      // Batch all async operations
      Promise.all([
        // Get likes count
        supabase
          .from('post_likes')
          .select('id', { count: 'exact' })
          .eq('post_id', post.post_id),
        
        // Get comments count
        supabase
          .from('post_comments')
          .select('id', { count: 'exact' })
          .eq('post_id', post.post_id),
        
        // Get current user
        supabase.auth.getUser()
      ]).then(async ([likesResult, commentsResult, userResult]) => {
        setLikesCount(likesResult.count || 0);
        setCommentsCount(commentsResult.count || 0);
        
        if (userResult.data?.user?.id) {
          const userId = userResult.data.user.id;
          console.log('[PostCard] Checking bookmark for user:', userId, 'post:', post.post_id);
          
          // Check like and bookmark status
          const [likeStatus, bookmarkResult] = await Promise.all([
            checkIfUserLikedPost(post.post_id, userId),
            isPostBookmarked(userId, post.post_id)
          ]);
          
          console.log('[PostCard] Like status:', likeStatus);
          console.log('[PostCard] Bookmark result:', bookmarkResult);
          console.log('[PostCard] Setting like state:', likeStatus.isLiked || false);
          console.log('[PostCard] Setting bookmark state:', bookmarkResult.isBookmarked || false);
          
          setIsLiked(likeStatus.isLiked || false);
          setIsBookmarked(bookmarkResult.isBookmarked || false);
        } else {
          // No user logged in, ensure bookmark is false
          console.log('[PostCard] No user logged in, setting bookmark to false');
          setIsBookmarked(false);
        }
      }).catch(error => {
        console.error('[PostCard] Error fetching post data:', error);
        // On error, ensure bookmark is false
        setIsBookmarked(false);
        setIsLiked(false);
      });
    }
  }, [post?.post_id]);

  // Optimized double tap handler
  const onDoubleTap = useCallback(async () => {
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

      handleLikePress();
    }
  }, [isLiked]);

  // Optimized like handler
  const handleLikePress = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      
      // Optimistic update
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
      
      // Perform action
      if (isLiked) {
        await unlikePost(post.post_id, userData.user.id);
      } else {
        await likePost(post.post_id, userData.user.id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : Math.max(0, prev - 1));
      console.error('Error toggling like:', error);
    }
  }, [isLiked, post.post_id]);

  // Optimized bookmark handler
  const handleBookmarkPress = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      
      // Optimistic update
      const newBookmarkState = !isBookmarked;
      setIsBookmarked(newBookmarkState);
      
      // Use the new bookmark service
      const { isBookmarked: finalState, error } = await toggleBookmark(userData.user.id, post.post_id);
      
      if (error) {
        // Revert on error
        setIsBookmarked(isBookmarked);
        console.error('Error toggling bookmark:', error);
      } else {
        // Update with the actual state from the server
        setIsBookmarked(finalState);
        
        // Notify parent component of bookmark toggle
        if (onBookmarkToggle) {
          onBookmarkToggle(post.post_id, finalState);
        }
      }
    } catch (error) {
      // Revert on error
      setIsBookmarked(isBookmarked);
      console.error('Error toggling bookmark:', error);
    }
  }, [isBookmarked, post.post_id, onBookmarkToggle]);

  // Navigation handlers
  const handleImageNavigation = useCallback((direction) => {
    if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    } else if (direction === 'next' && currentImageIndex < post.media_urls.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  }, [currentImageIndex, post.media_urls?.length]);

  const onSingleTap = useCallback(() => {
    if (onPress) onPress(post);
  }, [onPress, post]);

  return (
    <View style={[styles.card, isGridView && styles.gridCard]}>
      <UserHeader 
        user={user} 
        postTime={postDate}
        onPress={() => {}} 
      />
      
      {/* Post image with gestures */}
      <TapGestureHandler
        ref={doubleTapRef}
        numberOfTaps={2}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.ACTIVE) {
            onDoubleTap();
          }
        }}
      >
        <TouchableOpacity activeOpacity={1} onPress={onSingleTap}>
          <View style={styles.imageContainer}>
            {currentImageUrl ? (
              <>
                <Image
                  source={{ uri: currentImageUrl }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                  placeholderContentFit="cover"
                />
                
                {/* Heart animation */}
                <Animated.View
                  style={[
                    styles.heartContainer,
                    {
                      transform: [{ scale }],
                      opacity,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Ionicons name="heart" size={80} color="#fff" />
                </Animated.View>
                
                {/* Image navigation */}
                {post.media_urls?.length > 1 && (
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
      
      {/* Actions */}
      {showActions && (
        <View style={styles.cardFooter}>
          <View style={styles.actionRow}>
            <ActionButton
              icon={isLiked ? "heart" : "heart-outline"}
              isActive={isLiked}
              activeColor="#FF0000"
              count={likesCount}
              onPress={handleLikePress}
            />
            
            <ActionButton
              icon="chatbubble-outline"
              count={commentsCount}
              onPress={() => onPress && onPress(post)}
              style={{ marginLeft: 16 }}
            />
            
            <TouchableOpacity 
              style={[styles.actionButton, { marginLeft: 16 }]}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share-social-outline" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={handleBookmarkPress}>
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={22} 
              color={isBookmarked ? COLORS.primary : "#333"} 
            />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Modals */}
      {showLikesModal && (
        <LikesListModal 
          visible={showLikesModal}
          onClose={() => setShowLikesModal(false)}
          postId={post.post_id}
        />
      )}
      
      {showShareModal && (
        <ShareTrayModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          itemToShare={{
            item_id: post.post_id,
            item_type: 'post',
            item_title: post.caption || 'Shared Post',
            item_image_url: post.media_urls?.[0] || null
          }}
          highlightSharedUsers={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  gridCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontWeight: '600',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  imageContainer: {
    width: '100%',
    height: width - 32, // Account for margin
    backgroundColor: '#f7f7f7',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
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
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
  },
  countButton: {
    padding: 4,
    paddingLeft: 2,
  },
  actionText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 2,
    fontWeight: '500',
  },
});

// Aggressive memoization to prevent re-renders
export default memo(PostCardOptimized, (prevProps, nextProps) => {
  return (
    prevProps.post?.post_id === nextProps.post?.post_id &&
    prevProps.post?.caption === nextProps.post?.caption &&
    prevProps.post?.media_urls?.length === nextProps.post?.media_urls?.length &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.isGridView === nextProps.isGridView
  );
});