import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppHeader from '../../components/layout/AppHeader';
import { getCollectionPosts, removePostFromCollection } from '../../services/postService';

const { width } = Dimensions.get('window');

// Custom date formatting function
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

const CollectionDetailScreen = ({ route, navigation }) => {
  const { collection } = route.params;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCollectionPosts();
  }, []);

  const fetchCollectionPosts = async () => {
    setLoading(true);
    try {
      const { data } = await getCollectionPosts(collection.id);
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching collection posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCollectionPosts();
  };

  const handleViewPost = (post) => {
    navigation.navigate('PostDetail', { post });
  };

  const handleRemovePost = (postId) => {
    Alert.alert(
      'Remove Post',
      'Are you sure you want to remove this post from the collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { success, error } = await removePostFromCollection(postId, collection.id);
              if (error) throw error;
              
              if (success) {
                // Remove post from state
                setPosts(posts.filter(post => post.post_id !== postId));
              }
            } catch (error) {
              console.error('Error removing post:', error);
              Alert.alert('Error', 'Failed to remove post. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderPostItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.postCard}
        onPress={() => handleViewPost(item)}
        activeOpacity={0.9}
      >
        {item.media_urls && item.media_urls.length > 0 ? (
          <Image
            source={{ uri: item.media_urls[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.postImage, styles.noImageContainer]}>
            <Ionicons name="image-outline" size={40} color="#DDD" />
          </View>
        )}
        
        <View style={styles.postInfo}>
          <View style={styles.postHeader}>
            {item.profiles && (
              <Image
                source={{ uri: item.profiles.avatar_url || 'https://via.placeholder.com/30' }}
                style={styles.avatar}
              />
            )}
            <Text style={styles.username}>
              {item.profiles ? item.profiles.username : 'User'}
            </Text>
          </View>
          
          {item.caption && (
            <Text style={styles.caption} numberOfLines={2}>
              {item.caption}
            </Text>
          )}
          
          <Text style={styles.postDate}>
            {formatDate(item.created_at)}
          </Text>
          
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => handleRemovePost(item.post_id)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={collection.name}
        navigation={navigation}
        canGoBack={true}
      />
      
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionDescription}>
          {collection.description || 'Saved posts collection'}
        </Text>
        <Text style={styles.collectionCount}>
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </Text>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : posts.length > 0 ? (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={item => item.post_id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          columnWrapperStyle={styles.columnWrapper}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={60} color="#999" />
          <Text style={styles.emptyTitle}>No Posts Yet</Text>
          <Text style={styles.emptyText}>
            Save posts to this collection while browsing
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  collectionDescription: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
  },
  collectionCount: {
    fontSize: 14,
    color: '#888',
  },
  listContainer: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  postCard: {
    width: (width - 24) / 2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 150,
  },
  noImageContainer: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postInfo: {
    padding: 12,
    position: 'relative',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  username: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  caption: {
    fontSize: 13,
    color: '#444',
    marginBottom: 8,
  },
  postDate: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CollectionDetailScreen;
