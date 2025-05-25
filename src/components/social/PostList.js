import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { likePost, unlikePost, checkIfUserLikedPost, getPostComments } from '../../services/postService';
import { formatDistanceToNow } from 'date-fns';

const PostList = ({ posts, currentUser, onRefresh, refreshing = false, groupId }) => {
  const navigation = useNavigation();

  const handleLike = async (post) => {
    try {
      if (post.is_liked) {
        await unlikePost(post.id, currentUser.id);
      } else {
        await likePost(post.id, currentUser.id);
      }
      // Refresh posts after like action
      onRefresh();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const navigateToComments = (post) => {
    navigation.navigate('PostDetail', { 
      post: { ...post, post_id: post.id },
      groupId: groupId
    });
  };

  const renderPost = ({ item: post }) => (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <Image source={{ uri: post.user_avatar }} style={styles.avatar} />
        <Text style={styles.username}>{post.user_name}</Text>
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </Text>
      </View>
      
      {post.image && (
        <Image 
          source={{ uri: post.image }} 
          style={styles.postImage} 
          resizeMode="cover"
        />
      )}
      
      <View style={styles.postContent}>
        <Text style={styles.caption}>{post.content}</Text>
        
        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(post)}
          >
            <Ionicons 
              name={post.is_liked ? 'heart' : 'heart-outline'} 
              size={24} 
              color={post.is_liked ? '#FF3B30' : '#000'} 
            />
            <Text style={styles.actionText}>{post.likes_count || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToComments(post)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#000" />
            <Text style={styles.actionText}>{post.comments_count || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2E7D32']}
          tintColor="#2E7D32"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 8,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: '600',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginLeft: 'auto',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },
  postContent: {
    padding: 12,
  },
  caption: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 10,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
  },
});

export default PostList;
