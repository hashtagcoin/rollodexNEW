import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ScrollView, Dimensions, TextInput, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import CreatePostModal from '../../components/social/CreatePostModal';
import { getUserPosts } from '../../services/postService';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { useUser } from '../../context/UserContext';

const TABS = ['Posts', 'Groups', 'Bookings', 'Friends'];
const windowWidth = Dimensions.get('window').width;

// We'll replace mockPosts with real data from Supabase
const mockGroups = Array.from({ length: 3 }, (_, i) => ({ id: i + '', name: `Group ${i+1}`, desc: 'Airbnb-style group card', image: `https://picsum.photos/seed/group${i}/400/200` }));
const mockBookings = Array.from({ length: 2 }, (_, i) => ({ id: i + '', title: `Booking ${i+1}`, location: 'Melbourne', date: '2025-06-0' + (i+1), image: `https://picsum.photos/seed/booking${i}/400/200` }));
const mockFriends = Array.from({ length: 8 }, (_, i) => ({ id: i + '', name: `Friend ${i+1}`, avatar: `https://randomuser.me/api/portraits/men/${i+10}.jpg` }));

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState('Posts');
  const [friendSearch, setFriendSearch] = useState('');
  const [addFriendSearch, setAddFriendSearch] = useState('');
  const [friendRequests, setFriendRequests] = useState([
    { id: '1', name: 'Alex', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
    { id: '2', name: 'Jamie', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
  ]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [addFriendResults, setAddFriendResults] = useState([
    { id: '101', name: 'Taylor', avatar: 'https://randomuser.me/api/portraits/men/21.jpg' },
    { id: '102', name: 'Morgan', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' },
  ]);
  
  // New state variables for posts
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Get user profile from context
  const { user, profile: userProfile } = useUser();

  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  // Fetch posts using the user from context
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (user) {
          setCurrentUser(user);
          // Fetch posts for the current user
          setLoadingPosts(true);
          const userPosts = await getUserPosts(user.id);
          setPosts(userPosts || []);
          setLoadingPosts(false);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setLoadingPosts(false);
      }
    };
    
    fetchPosts();
  }, [user]);  // Re-fetch when user changes

  // Refresh posts after creating a new one
  const handlePostCreated = async () => {
    if (currentUser) {
      setLoadingPosts(true);
      try {
        const userPosts = await getUserPosts(currentUser.id);
        setPosts(userPosts || []);
      } catch (error) {
        console.error('Error refreshing posts:', error);
      } finally {
        setLoadingPosts(false);
      }
    }
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Posts':
        return (
          <View style={{ flex: 1 }}>
            {/* New Post Button */}
            <TouchableOpacity 
              style={styles.newPostButton}
              onPress={() => setShowCreatePostModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.newPostButtonText}>New Post</Text>
            </TouchableOpacity>
            
            {loadingPosts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : posts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No posts yet</Text>
                <Text style={styles.emptySubText}>Create your first post by tapping the New Post button</Text>
              </View>
            ) : (
              <FlatList
                data={posts}
                numColumns={3}
                keyExtractor={item => item.post_id}
                contentContainerStyle={styles.postsList}
                renderItem={({ item }) => {
                  // Use the first image from media_urls if available, otherwise use a placeholder
                  const imageUrl = item.media_urls && item.media_urls.length > 0 
                    ? item.media_urls[0] 
                    : 'https://via.placeholder.com/200x200?text=No+Image';
                    
                  return (
                    <TouchableOpacity 
                      style={styles.postImageContainer}
                      onPress={() => navigation.navigate('UserPostsFeedScreen', { userId: currentUser?.id, username: 'My Posts' })}
                    >
                      <Image source={{ uri: imageUrl }} style={styles.postImage} />
                    </TouchableOpacity>
                  );
                }}
              />
            )}            
          </View>
        );
      case 'Groups':
        return (
          <FlatList
            data={mockGroups}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.cardList}
            renderItem={({ item }) => (
              <View style={styles.airbnbCard}>
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>
              </View>
            )}
          />
        );
      case 'Bookings':
        return (
          <FlatList
            data={mockBookings}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.cardList}
            renderItem={({ item }) => (
              <View style={styles.airbnbCard}>
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.location} • {item.date}</Text>
                </View>
              </View>
            )}
          />
        );
      case 'Friends':
        // Filter friends based on search
        const filteredFriends = mockFriends.filter(f =>
          f.name.toLowerCase().includes(friendSearch.toLowerCase())
        );
        
        // Combine friend requests and friends into sections for a single FlatList
        const sections = [];
        
        // Add search header section
        sections.push({
          type: 'header',
          content: (
            <View style={styles.friendSearchRow}>
              <TextInput
                style={styles.friendSearchInput}
                placeholder="Search friends..."
                value={friendSearch}
                onChangeText={setFriendSearch}
              />
              <TouchableOpacity style={styles.addFriendBtn} onPress={() => setShowAddFriendModal(true)}>
                <Text style={styles.addFriendBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )
        });
        
        // Add friend requests section if there are any
        if (friendRequests.length > 0) {
          sections.push({
            type: 'requestsHeader',
            content: <Text style={styles.sectionTitle}>Friend Requests</Text>
          });
          
          sections.push({
            type: 'requests',
            content: friendRequests.map(item => ({
              id: item.id,
              avatar: item.avatar,
              name: item.name
            }))
          });
        }
        
        // Add friends section
        sections.push({
          type: 'friendsHeader',
          content: <Text style={styles.sectionTitle}>Your Friends</Text>
        });
        
        sections.push({
          type: 'friends',
          content: filteredFriends
        });
        
        // Render the Friends tab with a single top-level FlatList
        const renderFriendsSection = () => (
          <View style={{flex: 1}}>
            <FlatList
              data={sections}
              keyExtractor={(item, index) => item.type + index}
              renderItem={({ item }) => {
                switch (item.type) {
                  case 'header':
                    return item.content;
                    
                  case 'requestsHeader':
                  case 'friendsHeader':
                    return <View style={styles.sectionHeaderContainer}>{item.content}</View>;
                    
                  case 'requests':
                    return (
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.requestsContainer}
                        contentContainerStyle={styles.requestsContentContainer}
                      >
                        {item.content.map(request => (
                          <View key={request.id} style={styles.friendRequestCard}>
                            <Image source={{ uri: request.avatar }} style={styles.friendAvatarSmall} />
                            <Text style={styles.friendNameSmall}>{request.name}</Text>
                            <View style={styles.friendRequestActions}>
                              <TouchableOpacity style={styles.acceptBtn}>
                                <Text style={styles.acceptBtnText}>Accept</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.declineBtn}>
                                <Text style={styles.declineBtnText}>Decline</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    );
                    
                  case 'friends':
                    return (
                      <View style={styles.friendsGridContainer}>
                        {item.content.map((friend, index) => (
                          <TouchableOpacity 
                            key={friend.id}
                            style={styles.friendGridItem} 
                            onPress={() => handleOpenFriendModal(friend)}
                          >
                            <Image 
                              source={{ uri: friend.avatar }} 
                              style={styles.friendGridAvatar} 
                            />
                            <Text style={styles.friendGridName} numberOfLines={1}>{friend.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  default:
                    return null;
                }
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        );
        
        return (
          <View style={{flex: 1}}>
            {renderFriendsSection()}
            
            {/* Friend Detail Modal */}
            <Modal
              visible={!!selectedFriend}
              transparent
              animationType="slide"
              onRequestClose={() => setSelectedFriend(null)}
            >
              <View style={styles.friendModalOverlay}>
                <View style={styles.friendModalContent}>
                  {selectedFriend && (
                    <>
                      <Image source={{ uri: selectedFriend.avatar }} style={styles.friendAvatarLarge} />
                      <Text style={styles.friendNameLarge}>{selectedFriend.name}</Text>
                      <View style={styles.friendTypeSelectorRow}>
                        {['Friend','Provider','Family'].map(type => (
                          <TouchableOpacity
                            key={type}
                            style={[styles.friendTypeSelectorBtn, selectedFriend.type === type && styles.friendTypeSelectorBtnActive]}
                            onPress={() => handleChangeFriendType(selectedFriend.id, type)}
                          >
                            <Text style={styles.friendTypeSelectorText}>{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.friendModalActionsRow}>
                        <TouchableOpacity style={styles.friendChatBtn} onPress={() => handleChat(selectedFriend)}><Text style={styles.friendChatBtnText}>Chat</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.friendRemoveBtn} onPress={() => handleRemoveFriend(selectedFriend.id)}><Text style={styles.friendRemoveBtnText}>Remove</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.friendBlockBtn} onPress={() => handleBlockFriend(selectedFriend.id)}><Text style={styles.friendBlockBtnText}>Block</Text></TouchableOpacity>
                      </View>
                      <TouchableOpacity style={styles.friendModalCloseBtn} onPress={() => setSelectedFriend(null)}><Text style={styles.friendModalCloseBtnText}>Close</Text></TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </Modal>
            {/* Add Friend Modal */}
            <Modal
              visible={showAddFriendModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowAddFriendModal(false)}
            >
              <View style={styles.friendModalOverlay}>
                <View style={styles.friendModalContent}>
                  <Text style={styles.addFriendTitle}>Search & Add Friends</Text>
                  <TextInput
                    style={styles.friendSearchInput}
                    placeholder="Enter name or email..."
                    value={addFriendSearch}
                    onChangeText={setAddFriendSearch}
                  />
                  <FlatList
                    data={addFriendResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.addFriendResultRow}>
                        <Image source={{ uri: item.avatar }} style={styles.friendAvatarSmall} />
                        <Text style={styles.friendNameSmall}>{item.name}</Text>
                        <TouchableOpacity style={styles.sendRequestBtn} onPress={() => handleSendFriendRequest(item.id)}><Text style={styles.sendRequestBtnText}>Request</Text></TouchableOpacity>
                      </View>
                    )}
                    style={{maxHeight: 200}}
                  />
                  <TouchableOpacity style={styles.friendModalCloseBtn} onPress={() => setShowAddFriendModal(false)}><Text style={styles.friendModalCloseBtnText}>Close</Text></TouchableOpacity>
                </View>
              </View>
            </Modal>
            {/* Group Chat Modal (placeholder) */}
            <Modal
              visible={showGroupChatModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowGroupChatModal(false)}
            >
              <View style={styles.friendModalOverlay}>
                <View style={styles.friendModalContent}>
                  <Text style={styles.groupChatTitle}>Start a Group Chat</Text>
                  <Text style={{marginBottom:14}}>Select friends to add to group chat (feature coming soon!)</Text>
                  <TouchableOpacity style={styles.friendModalCloseBtn} onPress={() => setShowGroupChatModal(false)}><Text style={styles.friendModalCloseBtnText}>Close</Text></TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader
        title="Profile"
        navigation={navigation}
        canGoBack={true}
        onBackPressOverride={handleBackToDashboard}
      />
      
      {/* Profile Header - Fixed at top */}
      <View style={styles.profileHeader}>
        <View style={styles.profileTopSection}>
          <Image 
            source={{ 
              uri: userProfile?.avatar_url || 'https://randomuser.me/api/portraits/women/44.jpg' 
            }} 
            style={styles.avatar}
            // Use cache policy for faster loading across screen changes
            cachePolicy="memory-disk"
          />
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userProfile?.full_name || 'User'}</Text>
            <Text style={styles.username}>@{userProfile?.username || 'username'}</Text>
            <Text style={styles.ndisParticipant}>NDIS Participant</Text>
          </View>
          
          <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfileScreen')}>
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userBio}>Nature lover & art enthusiast 🖌 seeking therapeutic support and new experiences.</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statNumber}>{posts.length}</Text><Text style={styles.statLabel}>Posts</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>8</Text><Text style={styles.statLabel}>Friends</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>Groups</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>2</Text><Text style={styles.statLabel}>Bookings</Text></View>
        </View>
        
        <View style={styles.profileButtonRow}>
          <TouchableOpacity style={styles.rewardsButton} onPress={() => navigation.navigate('RewardsScreen')}>
            <Text style={styles.rewardsButtonText}>Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryProfileButton} onPress={() => navigation.navigate('BookingDetailScreen')}>
            <Text style={styles.secondaryProfileButtonText}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryProfileButton} onPress={() => navigation.navigate('NDISScreen')}>
            <Text style={styles.secondaryProfileButtonText}>NDIS</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, selectedTab === tab && styles.tabBtnActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Tab Content - Each tab handles its own scrolling */}
      <View style={styles.tabContent} key={selectedTab}>
        {renderTabContent()}
      </View>
      
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
  // Instagram-style scroll view and container
  scrollView: {
    flex: 1,
  },
  
  // Posts tab styles
  newPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newPostButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  postsList: {
    paddingHorizontal: 2,
    paddingBottom: 20,
  },
  postImageContainer: {
    width: windowWidth / 3 - 4,
    height: windowWidth / 3 - 4,
    margin: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  
  // Modern Instagram-style friends grid
  sectionHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requestsContainer: {
    paddingVertical: 8,
  },
  requestsContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  friendRequestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 14,
    width: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  friendAvatarSmall: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
    backgroundColor: '#eee',
  },
  friendNameSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  friendRequestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  acceptBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flex: 1,
    marginRight: 6,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  declineBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flex: 1,
    marginLeft: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  declineBtnText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  friendsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  friendGridItem: {
    alignItems: 'center',
    marginBottom: 20,
    width: (windowWidth - 64) / 3, // Accounting for margins and padding
  },
  friendGridAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  friendGridName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    width: '100%',
  },
  profileButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  },
  friendMenuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  friendMenuBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  secondaryProfileButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  secondaryProfileButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F0F4F8', // Match the dashboard background color for consistency
  },
  profileHeader: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    fontFamily: 'System',
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  ndisParticipant: {
    fontSize: 14,
    color: '#777',
  },
  userBio: {
    fontSize: 16,
    color: '#444',
    marginBottom: 20,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  editProfileButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginLeft: 8,
  },
  editProfileButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },
  rewardsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  rewardsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  profileButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabBtnActive: {
    backgroundColor: '#f3b15a22',
  },
  tabText: {
    color: '#888',
    fontWeight: '500',
    fontSize: 15,
  },
  tabTextActive: {
    color: '#f3b15a',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  postsList: {
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
  },
  airbnbCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginVertical: 6,
    marginHorizontal: 8,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#888',
  },
  friendsList: {
    alignItems: 'center',
    paddingTop: 8,
  },
  friendCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    margin: 6,
    borderRadius: 14,
    padding: 14,
    width: windowWidth / 2 - 24, 
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  friendAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginBottom: 8,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  friendSearchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  friendSearchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 12,
  },
  addFriendBtn: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addFriendBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  groupChatBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  groupChatBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  friendRequestsSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  friendRequestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  friendRequestCard: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  friendAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  friendNameSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  friendRequestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  acceptBtn: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  declineBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  declineBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  friendModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  friendAvatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  friendNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  friendTypeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendTypeSelectorBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  friendTypeSelectorBtnActive: {
    backgroundColor: '#f3b15a',
    borderColor: '#f3b15a',
  },
  friendTypeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  friendModalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  friendChatBtn: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  friendChatBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  friendRemoveBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  friendRemoveBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  friendBlockBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  friendBlockBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  friendModalCloseBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  friendModalCloseBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  addFriendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  addFriendResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  sendRequestBtn: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendRequestBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  groupChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  friendTypeBadge: {
    fontSize: 12,
    color: '#888',
  },
  editProfileButton: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfileButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  profileButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  }
});

export default ProfileScreen;
