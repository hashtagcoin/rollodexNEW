import React, { useState, useEffect, useContext, useRef } from 'react';
import { Alert } from 'react-native';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ScrollView, Dimensions, TextInput, Modal, ActivityIndicator, Animated } from 'react-native';
import ActionButton from '../../components/common/ActionButton';
import { useFocusEffect } from '@react-navigation/native';
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
  
  // Get user profile from context - move this to the top
  const { user, profile: userProfile } = useUser();
  
  // UI state
  const [selectedTab, setSelectedTab] = useState('Posts');
  const scrollViewRef = useRef(null);
  
  // Animation values for the ActionButtons
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef(null);
  
  // Posts state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Friends state
  useFocusEffect(
    React.useCallback(() => {
      // When the screen is focused via BottomNavbar, reset to the first tab
      // and refresh posts
      setSelectedTab('Posts');
      
      // Refresh posts when the screen is focused
      if (user) {
        const refreshPosts = async () => {
          setLoadingPosts(true);
          try {
            const userPosts = await getUserPosts(user.id);
            setPosts(userPosts || []);
          } catch (error) {
            console.error('Error refreshing posts on focus:', error);
          } finally {
            setLoadingPosts(false);
          }
        };
        
        refreshPosts();
      }
      
      return () => {};
    }, [user]) // Re-run when user changes
  );
  const [friendSearch, setFriendSearch] = useState('');
  const [addFriendSearch, setAddFriendSearch] = useState('');
  const [friendRequests, setFriendRequests] = useState([
    { id: '1', name: 'Alex', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
    { id: '2', name: 'Jamie', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
  ]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [showUsersTray, setShowUsersTray] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [friendships, setFriendships] = useState([]);
  const [addFriendResults, setAddFriendResults] = useState([
    { id: '101', name: 'Taylor', avatar: 'https://randomuser.me/api/portraits/men/21.jpg' },
    { id: '102', name: 'Morgan', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' },
  ]);
  
  // Handle navigation back to dashboard
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

  useEffect(() => {
    if (currentUser) {
      // We already fetch posts in another useEffect
      fetchAllUsers();
      fetchFriendships();
    }
  }, [currentUser]);

  // Fetch all users from user_profiles table
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, full_name, avatar_url')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch friendships for current user
  const fetchFriendships = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');
      
      if (error) throw error;
      setFriendships(data || []);
    } catch (error) {
      console.error('Error fetching friendships:', error);
    }
  };

  // Check if a user is a friend of the current user
  const isFriend = (userId) => {
    if (!currentUser) return false;
    return friendships.some(
      f => (f.user_id === currentUser.id && f.friend_id === userId) || 
           (f.friend_id === currentUser.id && f.user_id === userId)
    );
  };

  // Send friend request
  const sendFriendRequest = async (userId) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUser.id,
          friend_id: userId,
          status: 'pending',
          category: 'friend',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      Alert.alert('Success', 'Friend request sent successfully!');
      setShowUsersTray(false);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };
  
  // Handle opening the friend modal
  const handleOpenFriendModal = (friend) => {
    setSelectedFriend(friend);
  };
  
  // Start a chat with a user
  const startChat = async (userId) => {
    // This would navigate to the chat screen or create a new chat
    Alert.alert('Coming Soon', 'Chat functionality will be available soon!');
    // Future implementation would navigate to a chat screen
    // navigation.navigate('ChatScreen', { userId });
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Posts':
        return (
          <View style={{ flex: 1 }}>
            
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
                key="posts-grid" /* Adding key to fix numColumns change error */
                data={posts}
                numColumns={3}
                keyExtractor={item => item.post_id}
                scrollEnabled={false}
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
          <View style={{ flex: 1 }}>
            
            <FlatList
              key="groups-list" /* Adding key to fix numColumns change error */
              data={mockGroups}
              keyExtractor={item => item.id}
              scrollEnabled={false}
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
          </View>
        );
        
      case 'Bookings':
        return (
          <View style={{ flex: 1 }}>
            
            <FlatList
              key="bookings-list" /* Adding key to fix numColumns change error */
              data={mockBookings}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.cardList}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.airbnbCard}
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDesc}>{item.location} • {item.date}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        );
        
      case 'Friends':
        // Filter friends based on search
        const filteredFriends = mockFriends.filter(f =>
          f.name.toLowerCase().includes(friendSearch.toLowerCase())
        );

        // Create sections for the flat list
        const sections = [];

        // 1. Add search header
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
              <TouchableOpacity 
                style={styles.addFriendBtn} 
                onPress={() => setShowAddFriendModal(true)}
              >
                <Text style={styles.addFriendBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )
        });

        // 2. Add friend requests section if any
        if (friendRequests.length > 0) {
          sections.push({
            type: 'requestsHeader',
            content: <Text style={styles.sectionHeader}>Friend Requests</Text>
          });
          sections.push({
            type: 'requests',
            content: friendRequests
          });
        }

        // 3. Add friends section
        sections.push({
          type: 'friendsHeader',
          content: <Text style={styles.sectionHeader}>Your Friends</Text>
        });
        sections.push({
          type: 'friends',
          content: filteredFriends
        });

        // Render the Friends tab with a single top-level FlatList
        const renderFriendsSection = () => (
          <View style={{flex: 1}}>
            <FlatList
              key="friends-sections" /* Adding key to fix numColumns change error */
              data={sections}
              keyExtractor={(item, index) => item.type + index}
              scrollEnabled={false}
              renderItem={({ item }) => {
                switch (item.type) {
                  case 'header':
                    return item.content;
                    
                  case 'requestsHeader':
                  case 'friendsHeader':
                    return <View style={styles.sectionHeaderContainer}>{item.content}</View>;
                    
                  case 'requests':
                    return (
                      <View 
                        style={[styles.requestsContainer, styles.requestsContentContainer]}
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
                      </View>
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
            
            {/* Friend Details Modal */}
            <Modal
              visible={!!selectedFriend}
              transparent
              animationType="slide"
              onRequestClose={() => setSelectedFriend(null)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  {selectedFriend && (
                    <>
                      <View style={styles.modalUserHeader}>
                        <Image source={{ uri: selectedFriend.avatar }} style={styles.modalUserAvatar} />
                        <Text style={styles.modalUserName}>{selectedFriend.name}</Text>
                      </View>
                      
                      <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.modalActionBtn} onPress={() => {
                          setSelectedFriend(null);
                          // TODO: Navigate to chat screen with this friend
                          navigation.navigate('ChatScreen', { friendId: selectedFriend.id });
                        }}>
                          <Text style={styles.modalActionBtnText}>Chat</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modalActionBtn} onPress={() => {
                          setSelectedFriend(null);
                          setShowGroupChatModal(true);
                        }}>
                          <Text style={styles.modalActionBtnText}>Group Chat</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedFriend(null)}>
                    <Text style={styles.closeModalBtnText}>Close</Text>
                  </TouchableOpacity>
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
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Start a Group Chat</Text>
                  <Text style={{marginBottom:14}}>Select friends to add to group chat (feature coming soon!)</Text>
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowGroupChatModal(false)}>
                    <Text style={styles.closeModalBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            
            {/* Users Tray Modal - Shows all users from user_profiles */}
            <Modal
              visible={showUsersTray}
              transparent
              animationType="slide"
              onRequestClose={() => setShowUsersTray(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { height: '70%' }]}>
                  <Text style={styles.modalTitle}>Find Friends</Text>
                  <Text style={styles.modalSubTitle}>Browse users and send friend requests</Text>
                  
                  {loadingUsers ? (
                    <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
                  ) : (
                    <FlatList
                      key="users-tray-list" /* Adding key to fix numColumns change error */
                      data={allUsers.filter(user => user.id !== currentUser?.id)}
                      keyExtractor={item => item.id}
                      scrollEnabled={true} /* This FlatList should scroll since it's in a modal */
                      renderItem={({ item }) => {
                        const isAlreadyFriend = isFriend(item.id);
                        return (
                          <View style={styles.userItem}>
                            <Image 
                              source={{ 
                                uri: item.avatar_url || 'https://via.placeholder.com/50'
                              }} 
                              style={styles.userAvatar} 
                            />
                            <View style={styles.userInfo}>
                              <Text style={styles.userName}>{item.full_name || 'User'}</Text>
                              <Text style={styles.userUsername}>@{item.username || 'username'}</Text>
                            </View>
                            <View style={styles.userActions}>
                              <TouchableOpacity 
                                style={styles.chatBtn}
                                onPress={() => startChat(item.id)}
                              >
                                <Text style={styles.chatBtnText}>Chat</Text>
                              </TouchableOpacity>
                              
                              {isAlreadyFriend ? (
                                <View style={styles.friendIndicator}>
                                  <Text style={styles.friendIndicatorText}>Friends</Text>
                                </View>
                              ) : (
                                <TouchableOpacity 
                                  style={styles.addFriendBtn}
                                  onPress={() => sendFriendRequest(item.id)}
                                >
                                  <Text style={styles.addFriendBtnText}>Add</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      }}
                    />
                  )}
                  
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowUsersTray(false)}>
                    <Text style={styles.closeModalBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );
        
      default:
        return null;
    }
  };

  // Get the action button based on the selected tab
  const renderActionButton = () => {
    // Create a truly floating action button that doesn't scroll with content
    switch (selectedTab) {
      case 'Posts':
        return (
          <ActionButton
            onPress={() => setShowCreatePostModal(true)}
            iconName="add"
            color="#007AFF"
            size={56}
          />
        );
      case 'Groups':
        return (
          <ActionButton
            onPress={() => navigation.navigate('GroupsListScreen')}
            iconName="add"
            color="#007AFF"
            size={56}
          />
        );
      case 'Bookings':
        return (
          <ActionButton
            onPress={() => navigation.navigate('Explore', { screen: 'ProviderDiscovery' })}
            iconName="add"
            color="#007AFF"
            size={56}
          />
        );
      case 'Friends':
        return (
          <ActionButton
            onPress={() => setShowUsersTray(true)}
            iconName="add"
            color="#007AFF"
            size={56}
          />
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
      
      {/* Floating Action Button - Fixed Position */}
      <Animated.View style={[styles.floatingActionButton, {
        opacity: fadeAnim
      }]}>
        {renderActionButton()}
      </Animated.View>
      
      <Animated.ScrollView 
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: true,
            listener: () => {
              // Clear any existing timer
              if (scrollEndTimer.current) {
                clearTimeout(scrollEndTimer.current);
              }
              
              // If not already scrolling, animate button fade out
              if (!isScrolling) {
                setIsScrolling(true);
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }
              
              // Set a timer to detect when scrolling stops
              scrollEndTimer.current = setTimeout(() => {
                setIsScrolling(false);
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 500, // Slower fade in
                  useNativeDriver: true,
                }).start();
              }, 200);
            }
          }
        )}
      >
        {/* Profile Header */}
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
        
        <Text style={styles.userBio}>{userProfile?.bio || 'No bio yet. Tap Edit Profile to add one.'}</Text>
        
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
      
      {/* Tab Bar */}
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
      
      {/* Tab Content */}
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>
      </Animated.ScrollView>
      
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
  floatingActionButton: {
    position: 'absolute',
    bottom: 20, // Reduced distance from bottom navbar (much closer)
    right: 16, // Equal padding (16px) from right edge
    zIndex: 1000, // Ensure it's above all content
  },
  mainScrollView: {
    flex: 1,
  },
  // Styles for the Users Tray Modal
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userUsername: {
    fontSize: 14,
    color: '#777',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  chatBtnText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  friendIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#e6f7e6',
  },
  friendIndicatorText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  addFriendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  addFriendBtnText: {
    color: '#fff',
    fontWeight: '500',
  },
  // User item styles for the Users Tray
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userUsername: {
    fontSize: 14,
    color: '#777',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  chatBtnText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  friendIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#e6f7e6',
  },
  friendIndicatorText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Instagram-style scroll view and container
  scrollView: {
    flex: 1,
  },
  
  // Posts tab styles
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
