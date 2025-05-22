import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import PostCardFixed from '../../components/social/PostCardFixed';

const { width, height } = Dimensions.get('window');

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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [housingModalVisible, setHousingModalVisible] = useState(false);

  // Navigate back to dashboard
  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  // Fetch all posts for the social feed
  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Get all posts, sorted by most recent first
      const { data, error } = await supabase
        .from('posts')
        .select(`
          post_id,
          user_id,
          caption,
          media_urls,
          created_at,
          location,
          updated_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // Render each post using the PostCardFixed component
  const renderPost = ({ item }) => (
    <PostCardFixed 
      post={item} 
      onPress={() => navigation.navigate('PostDetailScreen', { post: item })}
      showActions={true}
    />
  );

  const renderHousingGroup = ({ item }) => (
    <View style={styles.housingCard}>
      <Image source={{ uri: item.image }} style={styles.housingCardImage} />
      <View style={styles.housingCardContent}>
        <Text style={styles.housingCardTitle}>{item.name}</Text>
        <Text style={styles.housingCardDesc}>{item.desc}</Text>
        <Text style={styles.housingCardMembers}>{item.members} members</Text>
      </View>
    </View>
  );

  // Header component with sticky navigation buttons
  const HeaderComponent = () => (
    <View style={styles.stickyHeader}>
      <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('GroupsListScreen')}>
        <Feather name="users" size={20} color="#007AFF" />
        <Text style={styles.stickerBtnText}>Groups</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('HousingGroupsScreen')}>
        <Feather name="home" size={20} color="#007AFF" />
        <Text style={styles.stickerBtnText}>Housing</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('EventsListScreen')}>
        <Feather name="calendar" size={20} color="#007AFF" />
        <Text style={styles.stickerBtnText}>Events</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.stickerBtn, styles.addPostBtn]}
        onPress={() => navigation.navigate('CreatePostScreen')}
      >
        <Feather name="plus-circle" size={30} color="#fff" />
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
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.post_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListHeaderComponent={<HeaderComponent />}
          stickyHeaderIndices={[0]}
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
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  stickerBtnText: {
    marginLeft: 4,
    color: '#333',
    fontWeight: '500',
  },
  addPostBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 0,
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
