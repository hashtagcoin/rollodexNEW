import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { getUserPosts } from '../../services/postService';
import { supabase } from '../../lib/supabaseClient';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PostCard from '../../components/social/PostCard';

const { width } = Dimensions.get('window');

const UserPostsFeedScreen = ({ route, navigation }) => {
  const { userId, username, postId } = route.params;
  const flatListRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  // Scroll to the specific post if postId is provided
  useEffect(() => {
    if (postId && !loading && posts.length > 0) {
      const postIndex = posts.findIndex(post => post.post_id === postId);
      if (postIndex !== -1 && flatListRef.current) {
        // Small delay to ensure FlatList is fully rendered
        setTimeout(() => {
          flatListRef.current.scrollToIndex({
            index: postIndex,
            animated: true,
            viewPosition: 0
          });
        }, 300);
      }
    }
  }, [postId, posts, loading]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const userPosts = await getUserPosts(userId);
      // Sort posts by creation date, newest first
      const sortedPosts = userPosts.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setPosts(sortedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handlePostPress = (post) => {
    navigation.navigate('PostDetailScreen', { post });
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={`${username || 'User'}'s Posts`}
        navigation={navigation}
        canGoBack={true}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={60} color="#888" />
          <Text style={styles.emptyText}>No posts yet</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item.post_id}
          onScrollToIndexFailed={info => {
            console.warn('Failed to scroll to post: ', info);
            // Fallback scrolling implementation for when the scroll fails
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true
                });
              }
            }, 100);
          }}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => handlePostPress(item)}
              showActions={true}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default UserPostsFeedScreen;
