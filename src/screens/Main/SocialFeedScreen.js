import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Feather, FontAwesome, AntDesign } from '@expo/vector-icons';

// Mock data for posts
const mockPosts = [
  {
    id: '1',
    user: {
      name: 'Sarah Connor',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    caption: 'Enjoying the summer vibes! #sunnyday',
    likes: 128,
    isLiked: false,
    isBookmarked: false,
    comments: [
      { id: 'c1', user: 'johnny', text: 'Looks amazing!' },
      { id: 'c2', user: 'lisa', text: 'Wow, where is this?' },
    ],
  },
  {
    id: '2',
    user: {
      name: 'John Doe',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80',
    caption: 'Adventure time! 🏔️',
    likes: 90,
    isLiked: false,
    isBookmarked: false,
    comments: [
      { id: 'c1', user: 'sarah', text: 'Epic view!' },
    ],
  },
  // Add more posts as needed
];

import { Modal, Pressable, SafeAreaView } from 'react-native';

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

  // Modal state for housing groups
  const [housingModalVisible, setHousingModalVisible] = useState(false);

  // Fix: Define handleBackToDashboard
  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  const [posts, setPosts] = useState(mockPosts);

  const handleLike = (postId) => {
    setPosts(posts => posts.map(post =>
      post.id === postId ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 } : post
    ));
  };
  const handleBookmark = (postId) => {
    setPosts(posts => posts.map(post =>
      post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
    ));
  };
  // For demo, comments are not interactive

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        <Text style={styles.username}>{item.user.name}</Text>
        <Feather name="more-horizontal" size={22} color="#333" style={{ marginLeft: 'auto' }} />
      </View>
      {/* Image */}
      <Image source={{ uri: item.image }} style={styles.postImage} />
      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => handleLike(item.id)}>
          {item.isLiked ? (
            <AntDesign name="heart" size={26} color="#e74c3c" style={styles.actionIcon} />
          ) : (
            <AntDesign name="hearto" size={26} color="#222" style={styles.actionIcon} />
          )}
        </TouchableOpacity>
        <TouchableOpacity>
          <FontAwesome name="comment-o" size={25} color="#222" style={styles.actionIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleBookmark(item.id)}>
          {item.isBookmarked ? (
            <FontAwesome name="bookmark" size={25} color="#007AFF" style={styles.actionIcon} />
          ) : (
            <FontAwesome name="bookmark-o" size={25} color="#222" style={styles.actionIcon} />
          )}
        </TouchableOpacity>
      </View>
      {/* Likes */}
      <Text style={styles.likes}>{item.likes} likes</Text>
      {/* Caption */}
      <Text style={styles.caption}><Text style={styles.username}>{item.user.name}</Text> {item.caption}</Text>
      {/* Comments */}
      {item.comments.length > 0 && (
        <View style={styles.commentsPreview}>
          {item.comments.slice(0, 2).map(comment => (
            <Text key={comment.id} style={styles.comment}><Text style={styles.commentUser}>{comment.user}</Text> {comment.text}</Text>
          ))}
          {item.comments.length > 2 && (
            <Text style={styles.viewAllComments}>View all {item.comments.length} comments</Text>
          )}
        </View>
      )}
    </View>
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

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Social"
        navigation={navigation}
        canGoBack={true} 
        onBackPressOverride={handleBackToDashboard}
      />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedList}
        ListHeaderComponent={
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
            <TouchableOpacity style={[styles.stickerBtn, styles.addPostBtn]}>
              <Feather name="plus-circle" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        }
        stickyHeaderIndices={[0]}
      />
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
    alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  closeBtn: {
    padding: 4,
  },
  housingCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  housingCardImage: {
    width: 76,
    height: 76,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  housingCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  housingCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  housingCardDesc: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  housingCardMembers: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f1f1',
    zIndex: 10,
  },
  stickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e3e9f2',
  },
  stickerBtnText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  addPostBtn: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    marginRight: 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  feedList: {
    paddingBottom: 24,
    backgroundColor: '#fafafa',
  },
  postCard: {
    backgroundColor: '#fff',
    marginBottom: 18,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 0,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  username: {
    fontWeight: '600',
    fontSize: 15,
    color: '#222',
    marginRight: 8,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#eaeaea',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 2,
    backgroundColor: '#fff',
  },
  actionIcon: {
    marginRight: 18,
  },
  likes: {
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 14,
    marginTop: 2,
    color: '#222',
  },
  caption: {
    marginLeft: 14,
    marginRight: 14,
    marginTop: 4,
    fontSize: 14,
    color: '#222',
  },
  commentsPreview: {
    marginLeft: 14,
    marginRight: 14,
    marginTop: 3,
    marginBottom: 8,
  },
  comment: {
    fontSize: 13,
    color: '#444',
    marginTop: 1,
  },
  commentUser: {
    fontWeight: '600',
    color: '#222',
  },
  viewAllComments: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
});

export default SocialFeedScreen;
