import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  Dimensions,
  InteractionManager
} from 'react-native';
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '../../utils/imageHelper';
import ActionButton from '../../components/common/ActionButton';
import CreatePostModal from '../../components/social/CreatePostModal';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import PostCardFixed from '../../components/social/PostCardFixed';

const { width, height } = Dimensions.get('window');

// Performance tracking for diagnostics
const performanceTracker = {
  componentId: `SFS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  mountTime: null,
  renders: 0,
  fetchTimes: {},
  focusEvents: 0
};

const debugTiming = (action, details = {}) => {
  const timestamp = Date.now();
  const elapsed = performanceTracker.mountTime ? timestamp - performanceTracker.mountTime : 0;
  console.log(`[SOCIALFEED-TIMING][${performanceTracker.componentId}][${elapsed}ms] ${action}`, {
    timestamp,
    elapsed,
    ...details
  });
};

// Mock data for housing groups - kept for the housing modal
const dummyHousingGroups = [
  {
    id: 'h1',
    name: 'NDIS Housing Co-op',
    desc: 'Affordable, accessible housing for NDIS participants.',
    members: 18,
    image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'h2',
    name: 'Young Renters',
    desc: 'Support for young adults finding their first home.',
    members: 44,
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'h3',
    name: 'Accessible Living',
    desc: 'A group for accessible housing tips and listings.',
    members: 27,
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
  },
];

const SocialFeedScreen = () => {
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [housingModalVisible, setHousingModalVisible] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  
  // Performance optimization refs
  const fetchInProgressRef = useRef(false);
  const cacheRef = useRef(null); // Cache for posts
  const fetchCounterRef = useRef(0); // Track fetch order
  const isMounted = useRef(true);
  
  // Track component lifecycle
  useEffect(() => {
    performanceTracker.mountTime = Date.now();
    debugTiming('COMPONENT_MOUNTED', {
      componentId: performanceTracker.componentId
    });
    
    return () => {
      isMounted.current = false;
      debugTiming('COMPONENT_UNMOUNTING', {
        totalFocusEvents: performanceTracker.focusEvents,
        totalRenders: performanceTracker.renders
      });
    };
  }, []);
  
  // Track renders
  performanceTracker.renders++;
  debugTiming('RENDER', {
    renderCount: performanceTracker.renders,
    postCount: posts.length,
    loading,
    hasCachedData: !!cacheRef.current
  });

  // Reset scroll position when tab is focused with smart data fetching
  useFocusEffect(
    useCallback(() => {
      performanceTracker.focusEvents++;
      debugTiming('SCREEN_FOCUSED', {
        focusCount: performanceTracker.focusEvents,
        hasCachedData: !!cacheRef.current
      });
      
      // Focus effect: scrolling to top
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
      
      // Only fetch if we don't have cached data
      if (!cacheRef.current) {
        debugTiming('NO_CACHE_ON_FOCUS_FETCHING');
        const interaction = InteractionManager.runAfterInteractions(() => {
          fetchPosts();
        });
        return () => {
          interaction.cancel();
          debugTiming('SCREEN_UNFOCUSED');
        };
      } else {
        // Use cached data instantly
        debugTiming('USING_CACHED_DATA_ON_FOCUS', {
          cachedPostCount: cacheRef.current.length
        });
        setPosts(cacheRef.current);
        setLoading(false);
        
        // Optional: Background refresh after delay to get latest posts
        const interaction = InteractionManager.runAfterInteractions(() => {
          const timer = setTimeout(() => {
            if (isMounted.current) {
              fetchPosts(false, true); // Silent background refresh
            }
          }, 1000);
          return () => clearTimeout(timer);
        });
        
        return () => {
          interaction.cancel();
          debugTiming('SCREEN_UNFOCUSED');
        };
      }
    }, [])
  );

  // Navigate back to dashboard
  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  // Fetch all posts for the social feed
  const fetchPosts = async (isRefreshing = false, isBackgroundRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgressRef.current && !isRefreshing) {
      debugTiming('FETCH_PREVENTED_DUPLICATE', {
        isRefreshing,
        isBackgroundRefresh
      });
      return;
    }
    
    const fetchStart = Date.now();
    const fetchId = ++fetchCounterRef.current;
    
    if (!isMounted.current) return;
    
    fetchInProgressRef.current = true;
    
    debugTiming('FETCH_POSTS_START', {
      isRefreshing,
      isBackgroundRefresh,
      fetchId
    });
    
    try {
      // Only show loading on initial load or pull-to-refresh
      if (!cacheRef.current && !isBackgroundRefresh) {
        setLoading(true);
      }
      if (isRefreshing) {
        setRefreshing(true);
      }
      
      // Get all posts, sorted by most recent first
      const { data, error } = await supabase
        .from('posts')
        .select(`
          post_id,
          user_id,
          caption,
          media_urls,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      const fetchTime = Date.now() - fetchStart;
      performanceTracker.fetchTimes[fetchId] = fetchTime;
      
      debugTiming('FETCH_POSTS_COMPLETE', {
        postCount: data?.length || 0,
        fetchTimeMs: fetchTime,
        error: !!error,
        fetchId,
        isStale: fetchId !== fetchCounterRef.current
      });
      
      if (!isMounted.current) return;
      
      // Ignore if a newer fetch started
      if (fetchId !== fetchCounterRef.current) {
        debugTiming('STALE_FETCH_IGNORED', { fetchId, currentFetchId: fetchCounterRef.current });
        return;
      }
      
      if (error) throw error;
      
      const newPosts = data || [];
      setPosts(newPosts);
      
      // Update cache
      cacheRef.current = newPosts;
      debugTiming('CACHE_UPDATED', {
        postCount: newPosts.length
      });
      
    } catch (error) {
      console.error('[SocialFeed] Error fetching posts:', error);
      debugTiming('FETCH_ERROR', {
        error: error.message
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
      fetchInProgressRef.current = false;
    }
  };

  // Note: fetchPosts is triggered in useFocusEffect after navigation interactions, avoiding duplicate calls here.

  // Prefetch first 12 thumbnails when posts change
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    
    const prefetchStart = Date.now();
    const urls = posts.slice(0, 12)
      .map(p => (p.media_urls && p.media_urls.length > 0 ? getOptimizedImageUrl(p.media_urls[0], 400, 70) : null))
      .filter(Boolean);
    
    urls.forEach(u => Image.prefetch(u));
    
    debugTiming('IMAGES_PREFETCHED', {
      imageCount: urls.length,
      timeMs: Date.now() - prefetchStart
    });
  }, [posts]);

  // Refresh posts after creating a new one
  const handlePostCreated = async () => {
    debugTiming('POST_CREATED_REFRESHING');
    // Clear cache to force fresh fetch
    cacheRef.current = null;
    fetchPosts();
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts(true);
  };

  // Render each post using the PostCardFixed component
  const renderPost = ({ item }) => (
    <PostCardFixed 
      post={item} 
      onPress={() => navigation.navigate('PostDetailScreen', { post: item })}
      showActions={true}
    />
  );

  const renderHousingGroup = ({ item }) => {
    const thumbUrl = getOptimizedImageUrl(item.image, 400, 70);
    return (
      <View style={styles.housingCard}>
        <Image 
          source={{ uri: thumbUrl }} 
          style={styles.housingCardImage} 
          contentFit="cover"
          cachePolicy="immutable"
        />
        <View style={styles.housingCardContent}>
          <Text style={styles.housingCardTitle}>{item.name}</Text>
          <Text style={styles.housingCardDesc}>{item.desc}</Text>
          <Text style={styles.housingCardMembers}>{item.members} members</Text>
        </View>
      </View>
    );
  };

  // Header component with sticky navigation buttons
  const HeaderComponent = () => (
    <View style={styles.stickyHeader}>
      <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('GroupsList')}>
        <Feather name="users" size={20} color="#000" />
        <Text style={styles.stickerBtnText}>Groups</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('HousingGroupsScreen')}>
        <Feather name="home" size={20} color="#000" />
        <Text style={styles.stickerBtnText}>Housing</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('EventsListScreen')}>
        <Feather name="calendar" size={20} color="#000" />
        <Text style={styles.stickerBtnText}>Events</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('BookmarksScreen')}>
        <Feather name="bookmark" size={20} color="#000" />
        <Text style={styles.stickerBtnText}>Saved</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Social"
        navigation={navigation}
        canGoBack={true} 
        onBackPressOverride={handleBackToDashboard}
      />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet.</Text>
          <TouchableOpacity 
            style={styles.createPostButton}
            onPress={() => navigation.navigate('CreatePostScreen')}
          >
            <Text style={styles.createPostButtonText}>Create your first post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          listKey="social-feed"
          ref={flatListRef}
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.post_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListHeaderComponent={<HeaderComponent />}
          stickyHeaderIndices={[0]}
          initialNumToRender={6}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews
        />
      )}

      <Modal
        visible={housingModalVisible}
        transparent={true}
        onRequestClose={() => setHousingModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setHousingModalVisible(false)}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Housing Groups</Text>
              <Pressable style={styles.closeBtn} onPress={() => setHousingModalVisible(false)}>
                <Feather name="x" size={24} color="#333" />
              </Pressable>
            </View>
            <FlatList
              data={dummyHousingGroups}
              renderItem={renderHousingGroup}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 12 }}
            />
          </SafeAreaView>
        </Pressable>
      </Modal>
      
      {/* Action button for creating new post - positioned absolutely like in ProfileScreen */}
      <ActionButton
        onPress={() => setShowCreatePostModal(true)}
        iconName="add"
        color="#007AFF"
        size={56}
      />
      
      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={handlePostCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Style for the fixed ActionButton
  actionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  modalList: {
    padding: 16,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  feedList: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  createPostButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 8,
    marginHorizontal: 2,
  },
  stickerBtnText: {
    marginLeft: 4,
    color: '#333',
    fontWeight: '500',
  },
  actionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  housingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  housingCardImage: {
    width: 100,
    height: 100,
  },
  housingCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  housingCardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  housingCardDesc: {
    color: '#666',
    marginBottom: 8,
    fontSize: 14,
  },
  housingCardMembers: {
    color: '#007AFF',
    fontSize: 13,
  },
});

export default SocialFeedScreen;
