import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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
  InteractionManager,
  Platform
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
import PostCardOptimized from '../../components/social/PostCardOptimized';

const { width, height } = Dimensions.get('window');

// Memoized housing group item
const HousingGroupItem = memo(({ item }) => {
  const thumbUrl = getOptimizedImageUrl(item.image, 400, 70);
  return (
    <View style={styles.housingCard}>
      <Image 
        source={{ uri: thumbUrl }} 
        style={styles.housingCardImage} 
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />
      <View style={styles.housingCardContent}>
        <Text style={styles.housingCardTitle}>{item.name}</Text>
        <Text style={styles.housingCardDesc}>{item.desc}</Text>
        <Text style={styles.housingCardMembers}>{item.members} members</Text>
      </View>
    </View>
  );
});

// Memoized header component
const HeaderComponent = memo(({ navigation }) => (
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
));

// Mock data for housing groups
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
  
  // Consolidated state management to reduce re-renders
  const [uiState, setUIState] = useState({
    loading: true,
    refreshing: false,
    housingModalVisible: false,
    showCreatePostModal: false
  });
  
  const { loading, refreshing, housingModalVisible, showCreatePostModal } = uiState;
  
  // Helper to update UI state without causing multiple re-renders
  const updateUIState = useCallback((updates) => {
    setUIState(prev => ({ ...prev, ...updates }));
  }, []);
  
  const [posts, setPosts] = useState([]);
  
  // Performance optimization refs
  const fetchInProgressRef = useRef(false);
  const cacheRef = useRef(null);
  const fetchCounterRef = useRef(0);
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Optimized focus effect with debouncing
  useFocusEffect(
    useCallback(() => {
      // Reset scroll position instantly
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
      
      // Use cached data if available and fresh (less than 30 seconds old)
      const now = Date.now();
      const cacheAge = now - lastFetchTime.current;
      const cacheIsFresh = cacheAge < 30000; // 30 seconds
      
      if (cacheRef.current && cacheIsFresh) {
        setPosts(cacheRef.current);
        updateUIState({ loading: false });
        
        // Optional background refresh after 2 seconds
        const timer = setTimeout(() => {
          if (isMounted.current) {
            fetchPosts(false, true);
          }
        }, 2000);
        
        return () => clearTimeout(timer);
      } else {
        // Fetch immediately if no fresh cache
        InteractionManager.runAfterInteractions(() => {
          // Add timeout to prevent infinite loading
          const fetchTimeout = setTimeout(() => {
            if (loading && isMounted.current) {
              console.log('[SocialFeed] Fetch timeout - resetting loading state');
              updateUIState({ loading: false });
              setPosts([]);
            }
          }, 10000); // 10 second timeout
          
          fetchPosts().finally(() => {
            clearTimeout(fetchTimeout);
          });
        });
      }
    }, [loading, fetchPosts, updateUIState])
  );

  // Optimized fetch with better error handling and caching
  const fetchPosts = useCallback(async (isRefreshing = false, isBackgroundRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgressRef.current && !isRefreshing) {
      return;
    }
    
    const fetchId = ++fetchCounterRef.current;
    
    if (!isMounted.current) return;
    
    fetchInProgressRef.current = true;
    
    try {
      // Only show loading on initial load or pull-to-refresh
      if (!cacheRef.current && !isBackgroundRefresh) {
        updateUIState({ loading: true });
      }
      if (isRefreshing) {
        updateUIState({ refreshing: true });
      }
      
      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[SocialFeed] No authenticated user');
        setPosts([]);
        return;
      }
      
      // Optimized query with only needed fields
      const { data, error } = await supabase
        .from('posts')
        .select(`
          post_id,
          user_id,
          caption,
          media_urls,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to prevent loading too many posts
      
      if (!isMounted.current || fetchId !== fetchCounterRef.current) return;
      
      if (error) {
        console.error('[SocialFeed] Query error:', error);
        // Set empty posts on error to prevent infinite loading
        setPosts([]);
        cacheRef.current = [];
        return;
      }
      
      const newPosts = data || [];
      
      // Update state and cache
      setPosts(newPosts);
      cacheRef.current = newPosts;
      lastFetchTime.current = Date.now();
      
      // Prefetch images for first 10 posts
      if (newPosts.length > 0) {
        const imagesToPrefetch = newPosts
          .slice(0, 10)
          .filter(p => p.media_urls && p.media_urls.length > 0)
          .map(p => getOptimizedImageUrl(p.media_urls[0], 400, 70));
        
        // Batch prefetch images
        Promise.all(imagesToPrefetch.map(url => Image.prefetch(url))).catch(err => {
          console.log('[SocialFeed] Image prefetch error:', err);
        });
      }
      
    } catch (error) {
      console.error('[SocialFeed] Error fetching posts:', error);
      // Set empty posts on error to prevent infinite loading
      setPosts([]);
      cacheRef.current = [];
    } finally {
      // Always reset loading states
      if (isMounted.current) {
        updateUIState({
          loading: false,
          refreshing: false
        });
      }
      fetchInProgressRef.current = false;
    }
  }, [updateUIState]);

  // Navigate back to dashboard
  const handleBackToDashboard = useCallback(() => {
    navigation.navigate('DashboardScreen');
  }, [navigation]);

  // Handle post created
  const handlePostCreated = useCallback(async () => {
    cacheRef.current = null;
    lastFetchTime.current = 0;
    fetchPosts();
  }, [fetchPosts]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  // Optimized render post with navigation
  const renderPost = useCallback(({ item }) => (
    <PostCardOptimized 
      post={item} 
      onPress={() => navigation.navigate('PostDetailScreen', { post: item })}
      showActions={true}
    />
  ), [navigation]);

  // Key extractor
  const keyExtractor = useCallback((item) => item.post_id, []);

  // Get item layout for better performance
  const getItemLayout = useCallback((data, index) => ({
    length: 500, // Approximate height of each post card
    offset: 500 * index,
    index,
  }), []);

  // List header
  const ListHeader = useCallback(() => (
    <HeaderComponent navigation={navigation} />
  ), [navigation]);

  // Empty component
  const EmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No posts yet.</Text>
      <TouchableOpacity 
        style={styles.createPostButton}
        onPress={() => navigation.navigate('CreatePostScreen')}
      >
        <Text style={styles.createPostButtonText}>Create your first post</Text>
      </TouchableOpacity>
    </View>
  ), [navigation]);

  // Footer component for loading
  const ListFooter = useCallback(() => {
    if (!loading && posts.length > 0) return null;
    return null;
  }, [loading, posts.length]);

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Social"
        navigation={navigation}
        canGoBack={true} 
        onBackPressOverride={handleBackToDashboard}
      />
      
      {loading && !refreshing && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyComponent}
          ListFooterComponent={ListFooter}
          stickyHeaderIndices={[0]}
          
          // Performance optimizations
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          getItemLayout={getItemLayout}
          
          // Additional optimizations
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          scrollEventThrottle={16}
          directionalLockEnabled={true}
          disableVirtualization={false}
          
          // Optimization for images
          viewabilityConfig={{
            minimumViewTime: 100,
            itemVisiblePercentThreshold: 20,
            waitForInteraction: true,
          }}
        />
      )}

      <Modal
        visible={housingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => updateUIState({ housingModalVisible: false })}
      >
        <Pressable style={styles.modalOverlay} onPress={() => updateUIState({ housingModalVisible: false })}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Housing Groups</Text>
              <Pressable style={styles.closeBtn} onPress={() => updateUIState({ housingModalVisible: false })}>
                <Feather name="x" size={24} color="#333" />
              </Pressable>
            </View>
            <FlatList
              data={dummyHousingGroups}
              renderItem={({ item }) => <HousingGroupItem item={item} />}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 12 }}
            />
          </SafeAreaView>
        </Pressable>
      </Modal>
      
      <ActionButton
        onPress={() => updateUIState({ showCreatePostModal: true })}
        iconName="add"
        color="#007AFF"
        size={56}
      />
      
      <CreatePostModal
        visible={showCreatePostModal}
        onClose={() => updateUIState({ showCreatePostModal: false })}
        onPostCreated={handlePostCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
    paddingBottom: 100,
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
    marginHorizontal: 16,
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