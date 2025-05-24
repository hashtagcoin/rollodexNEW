import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { getValidImageUrl, getDefaultImage } from '../../utils/imageHelper';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Custom date formatting function
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

import { getUserDetails, getPostCreator, bookmarkPost, unbookmarkPost, isPostBookmarked, getUserCollections, addPostToCollection, checkIfUserLikedPost } from '../../services/postService';
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

  // Memoize image source for better performance, using our new utility function
  const imageSource = React.useMemo(() => {
    if (post.media_urls && post.media_urls.length > 0) {
      // Use our new helper to get a properly formatted URL for Supabase storage
      const validUrl = getValidImageUrl(post.media_urls[currentImageIndex], 'postsimages');
      return { uri: validUrl };
    }
    // Use our helper function to get the default image
    return getDefaultImage('post');
  }, [post.media_urls, currentImageIndex]);

  useEffect(() => {
    fetchUserDetails();
    fetchCounts();
  }, [post]);
  
  // Check bookmarked and like status when component mounts
  useEffect(() => {
    if (post && post.post_id) {
      checkBookmarkedStatus();
      checkLikeStatus();
    }
  }, [post]);
  
  // Function to check if the user has liked the post
  const checkLikeStatus = async () => {
    try {
      const { isLiked: liked } = await checkIfUserLikedPost(post.post_id);
      setIsLiked(liked);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };
  
  // Function to fetch user collections
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
  
  // Handle showing collections modal
  const handleShowCollectionsModal = () => {
    fetchUserCollections();
    setShowCollectionsModal(true);
  };
  
  // Handle saving post to a collection
  const handleSaveToCollection = async (collectionId) => {
    setSavingToCollection(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await addPostToCollection(collectionId, post.post_id, user.id);
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
        const userData = await getPostCreator(post.user_id);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const fetchCounts = async () => {
    try {
      // Get likes count
      const { data: likes, error } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact' })
        .eq('post_id', post.post_id);
        
      const count = likes?.length;
        
      if (!error) {
        setLikesCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  };
  
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
      if (isLiked) {
        // Unlike post
        const { data: userData } = await supabase.auth.getUser();
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.post_id)
          .eq('user_id', userData.user.id);
          
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like post
        const { data: userData } = await supabase.auth.getUser();
        await supabase
          .from('post_likes')
          .insert({
            post_id: post.post_id,
            user_id: userData.user.id,
            created_at: new Date().toISOString()
          });
          
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
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
        <Image 
          source={{ uri: user?.avatar_url || 'https://via.placeholder.com/40' }} 
          style={styles.avatar}
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
                {imageLoading && (
                  <View style={styles.imageLoadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  </View>
                )}
                <Image
                  key={`post-img-${post.post_id}-${currentImageIndex}`}
                  source={imageSource}
                  style={styles.image}
                  resizeMode="cover"
                  onLoad={() => {
                    handleImageLoad();
                    if (typeof onImageLoaded === 'function' && post.media_urls && post.media_urls.length > 0) {
                      onImageLoaded(post.media_urls[currentImageIndex]);
                    }
                  }}
                  onError={(e) => console.log('Image error:', e.nativeEvent.error)}
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
                  <View style={styles.paginationContainer}>
                    {post.media_urls.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.paginationDot,
                          currentImageIndex === index && styles.paginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
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
                  color={isLiked ? COLORS.danger : "#333"} 
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
