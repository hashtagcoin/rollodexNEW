import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { getUserBookmarks } from '../../services/bookmarkService';
import AppHeader from '../../components/layout/AppHeader';
import PostCardOptimized from '../../components/social/PostCardOptimized';
import { COLORS } from '../../constants/theme';

const BookmarksScreen = ({ navigation }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user
  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      console.log('[BookmarksScreen] Getting current user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[BookmarksScreen] Current user:', user ? 'Found' : 'Not found');
      setCurrentUser(user);
      
      // If no user, stop loading immediately
      if (!user) {
        console.log('[BookmarksScreen] No user found, stopping loading');
        setLoading(false);
      }
    } catch (error) {
      console.error('[BookmarksScreen] Error getting current user:', error);
      // Stop loading on error
      setLoading(false);
    }
  };

  // Safety net: ensure loading doesn't stay true forever
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('BookmarksScreen: Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 15000); // 15 seconds timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Fetch bookmarks when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('[BookmarksScreen] useFocusEffect triggered, currentUser:', currentUser ? 'Present' : 'Not present');
      if (currentUser) {
        fetchBookmarks();
      } else {
        console.log('[BookmarksScreen] useFocusEffect: No current user, not fetching bookmarks');
      }
    }, [currentUser])
  );

  const fetchBookmarks = async (isRefreshing = false) => {
    console.log('[BookmarksScreen] fetchBookmarks called, currentUser:', currentUser ? 'Present' : 'Not present');
    
    if (!currentUser) {
      // If no user, make sure loading is false
      console.log('[BookmarksScreen] No current user, stopping loading');
      setLoading(false);
      if (isRefreshing) {
        setRefreshing(false);
      }
      return;
    }

    try {
      if (!isRefreshing) {
        console.log('[BookmarksScreen] Setting loading to true');
        setLoading(true);
      }

      console.log('[BookmarksScreen] Fetching bookmarks for user:', currentUser.id);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const bookmarkPromise = getUserBookmarks(currentUser.id);
      const { data, error } = await Promise.race([bookmarkPromise, timeoutPromise]);
      
      if (error) {
        console.error('[BookmarksScreen] Error fetching bookmarks:', error);
        Alert.alert('Error', 'Failed to load bookmarks. Please try again.');
        setBookmarks([]);
        return;
      }

      console.log('[BookmarksScreen] Successfully fetched bookmarks:', data?.length || 0, 'items');
      setBookmarks(data || []);
    } catch (error) {
      console.error('[BookmarksScreen] Error in fetchBookmarks:', error);
      if (error.message === 'Request timeout') {
        Alert.alert('Timeout', 'Request took too long. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to load bookmarks. Please try again.');
      }
      setBookmarks([]);
    } finally {
      console.log('[BookmarksScreen] Setting loading to false');
      setLoading(false);
      if (isRefreshing) {
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookmarks(true);
  }, [currentUser]);

  const handleBookmarkToggle = useCallback((postId, isBookmarked) => {
    // If bookmark was removed (isBookmarked = false), remove from list
    if (!isBookmarked) {
      console.log('[BookmarksScreen] Removing post from bookmarks list:', postId);
      setBookmarks(prev => prev.filter(bookmark => bookmark.post_id !== postId));
    }
    // If bookmark was added (isBookmarked = true), we could add it to the list
    // but typically this won't happen in the BookmarksScreen since posts here are already bookmarked
  }, []);

  const renderBookmarkItem = ({ item }) => {
    return (
      <View style={styles.bookmarkItem}>
        <PostCardOptimized
          post={item}
          onPress={() => navigation.navigate('PostDetail', { post: item })}
          onBookmarkToggle={handleBookmarkToggle}
          initialBookmarkState={true}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="bookmark" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Saved Posts</Text>
      <Text style={styles.emptyText}>
        Posts you bookmark will appear here. Start exploring and save posts you want to read later!
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => navigation.navigate('SocialFeed')}
      >
        <Text style={styles.exploreButtonText}>Explore Posts</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Saved Posts"
          navigation={navigation}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your saved posts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Saved Posts"
        navigation={navigation}
        showBackButton={true}
      />
      
      {bookmarks.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmarkItem}
          keyExtractor={(item) => `bookmark-${item.post_id}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    paddingVertical: 8,
  },
  bookmarkItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookmarksScreen;
