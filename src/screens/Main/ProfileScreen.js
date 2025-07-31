import React, { useState, useEffect, useContext, useRef } from 'react';
import { Alert } from 'react-native';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ScrollView, Dimensions, TextInput, Modal, ActivityIndicator, Animated } from 'react-native';
import ActionButton from '../../components/common/ActionButton';
import ChatModal from '../../components/chat/ChatModal';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import CreatePostModal from '../../components/social/CreatePostModal';
import { getUserPosts } from '../../services/postService';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { useUser } from '../../context/UserContext';
import UserAvatar from '../../components/common/UserAvatar';

const TABS = ['Posts', 'Groups', 'Bookings', 'Friends'];
const windowWidth = Dimensions.get('window').width;

// We'll replace mockPosts with real data from Supabase
const mockGroups = Array.from({ length: 3 }, (_, i) => ({ id: i + '', name: `Group ${i+1}`, desc: 'Airbnb-style group card', image: `https://picsum.photos/seed/group${i}/400/200` }));
const mockBookings = Array.from({ length: 2 }, (_, i) => ({ id: i + '', title: `Booking ${i+1}`, location: 'Melbourne', date: '2025-06-0' + (i+1), image: `https://picsum.photos/seed/booking${i}/400/200` }));
// We'll fetch real friends data from Supabase instead of using mock data

const ProfileScreen = () => {
  const navigation = useNavigation();
  
  // Get user profile from context - move this to the top
  const { user, profile: userProfile } = useUser();
  
  // Log profile data
  console.log('[ProfileScreen] Rendering with profile:', userProfile);
  console.log('[ProfileScreen] Profile username:', userProfile?.username);
  console.log('[ProfileScreen] Profile full_name:', userProfile?.full_name);
  
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
      console.log('[ProfileScreen] Focus effect: scrolling to top');
      // When the screen is focused via BottomNavbar, reset to the first tab
      // and refresh posts
      setSelectedTab('Posts');
      
      // Reset scroll position
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      
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
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  // const [selectedFriend, setSelectedFriend] = useState(null); // Modal no longer used for this interaction
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [showUsersTray, setShowUsersTray] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [friendships, setFriendships] = useState([]);
  const [addFriendResults, setAddFriendResults] = useState([]);
  
  // Add state for Groups and Bookings tabs
  const [favoriteGroups, setFavoriteGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  
  // Handle navigation back to dashboard
  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  // Fetch posts using the user from context
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user) {
          setCurrentUser(user);
          
          // Fetch posts for the current user
          setLoadingPosts(true);
          try {
            const userPosts = await getUserPosts(user.id);
            setPosts(userPosts || []);
          } catch (error) {
            console.error('Error fetching posts:', error);
          } finally {
            setLoadingPosts(false);
          }
          
          // Fetch friend requests and friendships
          fetchFriendRequests();
          fetchFriendships();
          
          // Fetch favorite groups
          fetchFavoriteGroups();
          
          // Fetch upcoming bookings
          fetchUpcomingBookings();
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };
    
    fetchData();
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
      fetchFriendRequests();
    }
  }, [currentUser]);
  
  // Fetch favorite groups for the current user
  const fetchFavoriteGroups = async () => {
    if (!currentUser) return;
    
    setLoadingGroups(true);
    try {
      // Fetch both regular groups and housing groups that the user has favorited
      const { data: favoriteData, error } = await supabase
        .from('user_favorites_detailed')
        .select('*')
        .eq('user_id', currentUser.id)
        .or('item_type.eq.group,item_type.eq.housing_group,item_type.is.null');
      
      if (error) throw error;
      
      console.log('Favorite groups data:', favoriteData);
      
      // If no favorites found in the detailed view, try the regular favorites table
      if (!favoriteData || favoriteData.length === 0) {
        const { data: regularFavorites, error: regularError } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', currentUser.id)
          .or('item_type.eq.group,item_type.eq.housing_group');
        
        if (regularError) throw regularError;
        
        console.log('Regular favorites data:', regularFavorites);
        
        if (regularFavorites && regularFavorites.length > 0) {
          // We need to fetch the group details for these favorites
          const groupIds = regularFavorites.map(fav => fav.item_id);
          
          const { data: groupDetails, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .in('id', groupIds);
            
          if (groupError) throw groupError;
          
          console.log('Group details for favorites:', groupDetails);
          
          // Format these groups to match the user_favorites_detailed format
          const formattedGroups = groupDetails.map(group => {
            const favorite = regularFavorites.find(fav => fav.item_id === group.id);
            return {
              favorite_id: favorite.id,
              item_id: group.id,
              item_title: group.name,
              item_description: group.description,
              item_image_url: group.avatar_url || 'https://via.placeholder.com/300x200?text=Group',
              item_type: 'group', // Make sure to set the item_type
              favorited_at: favorite.created_at
            };
          });
          
          setFavoriteGroups(formattedGroups);
          return;
        }
      }
      
      // If we have data from user_favorites_detailed, use it
      setFavoriteGroups(favoriteData || []);
    } catch (error) {
      console.error('Error fetching favorite groups:', error);
      Alert.alert('Error', 'Failed to load favorite groups');
    } finally {
      setLoadingGroups(false);
    }
  };
  
  // Fetch upcoming bookings for the current user
  const fetchUpcomingBookings = async () => {
    if (!currentUser) return;
    
    setLoadingBookings(true);
    try {
      // Get upcoming bookings (scheduled time is in the future)
      const { data, error } = await supabase
        .from('bookings_with_details')
        .select('*')
        .eq('user_profile_id', currentUser.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      
      console.log('Upcoming bookings data:', data);
      setUpcomingBookings(data || []);
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      Alert.alert('Error', 'Failed to load upcoming bookings');
    } finally {
      setLoadingBookings(false);
    }
  };
  
  // Fetch friend requests (both incoming and outgoing)
  const fetchFriendRequests = async () => {
    if (!currentUser) return;
    
    setLoadingRequests(true);
    try {
      // Log the current user ID for debugging
      console.log('Fetching friend requests for user ID:', currentUser.id);
      
      // 1. Get incoming requests (where current user is the addressee/friend_id)
      const { data: incomingData, error: incomingError } = await supabase
        .from('friendships_with_profiles')
        .select('*')
        .eq('addressee_id', currentUser.id)
        .eq('status', 'pending');
      
      if (incomingError) {
        console.error('Error fetching incoming requests:', incomingError);
        throw incomingError;
      }
      
      console.log('Incoming requests data:', incomingData);
      
      // Format incoming requests for display
      const formattedIncoming = incomingData.map(request => ({
        id: request.id, // This ID will be used for accept/decline operations
        userId: request.requester_id,
        name: request.requester_name || 'User',
        avatar: request.requester_avatar || 'https://via.placeholder.com/150',
        timestamp: request.created_at,
        type: 'incoming'
      }));
      
      // 2. Get outgoing requests (where current user is the requester/user_id)
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('friendships_with_profiles')
        .select('*')
        .eq('requester_id', currentUser.id)
        .eq('status', 'pending');
      
      if (outgoingError) {
        console.error('Error fetching outgoing requests:', outgoingError);
        throw outgoingError;
      }
      
      console.log('Outgoing requests data:', outgoingData);
      
      // Format outgoing requests for display
      const formattedOutgoing = outgoingData.map(request => ({
        id: request.id, // This ID will be used for cancel operations
        userId: request.addressee_id,
        name: request.addressee_name || 'User',
        avatar: request.addressee_avatar || 'https://via.placeholder.com/150',
        timestamp: request.created_at,
        type: 'outgoing'
      }));
      
      setIncomingRequests(formattedIncoming);
      setOutgoingRequests(formattedOutgoing);
      
      console.log('Formatted incoming requests:', formattedIncoming);
      console.log('Formatted outgoing requests:', formattedOutgoing);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      Alert.alert('Error', 'Failed to load friend requests');
    } finally {
      setLoadingRequests(false);
    }
  };

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
    
    setLoadingFriends(true);
    try {
      // Get accepted friendships with profile details
      const { data, error } = await supabase
        .from('friendships_with_profiles')
        .select('*')
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');
      
      if (error) throw error;
      
      // Format the friends list for display
      const formattedFriends = data.map(friendship => {
        // Determine if the current user is the requester or addressee
        const isRequester = friendship.requester_id === currentUser.id;
        
        return {
          id: friendship.id,
          userId: isRequester ? friendship.addressee_id : friendship.requester_id,
          name: isRequester ? (friendship.addressee_name || 'User') : (friendship.requester_name || 'User'),
          avatar: isRequester ? (friendship.addressee_avatar || 'https://via.placeholder.com/150') : (friendship.requester_avatar || 'https://via.placeholder.com/150'),
          timestamp: friendship.created_at
        };
      });
      
      setFriendsList(formattedFriends);
      setFriendships(data || []);
    } catch (error) {
      console.error('Error fetching friendships:', error);
      Alert.alert('Error', 'Failed to load friends list');
    } finally {
      setLoadingFriends(false);
    }
  };

  // Check if a user is a friend of the current user
  const isFriend = (userId) => {
    if (!currentUser) return false;
    return friendships.some(
      f => (f.requester_id === currentUser.id && f.addressee_id === userId) || 
           (f.addressee_id === currentUser.id && f.requester_id === userId)
    );
  };
  
  // Handle accepting a friend request
  const handleAcceptFriendRequest = async (requestId) => {
    if (!currentUser) return;
    
    try {
      // First, get the original friendship request to know who the requester is
      const { data: friendRequest, error: fetchError } = await supabase
        .from('user_relationships')
        .select('*')
        .eq('user_relationships_id', requestId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!friendRequest) {
        throw new Error('Friend request not found');
      }
      
      // Update the relationship status to accepted
      const { error: updateError } = await supabase
        .from('user_relationships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('user_relationships_id', requestId);
      
      if (updateError) throw updateError;
      
      // Check if a reciprocal relationship already exists
      const { data: existingReciprocal, error: checkError } = await supabase
        .from('user_relationships')
        .select('*')
        .eq('requester_id', friendRequest.addressee_id)
        .eq('addressee_id', friendRequest.requester_id)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no row found
        throw checkError;
      }
      
      if (!existingReciprocal) {
        // No reciprocal relationship, insert one as accepted
        const { error: insertError } = await supabase
          .from('user_relationships')
          .insert({
            requester_id: friendRequest.addressee_id,
            addressee_id: friendRequest.requester_id,
            status: 'accepted',
            category: friendRequest.category || 'friend',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        if (insertError) throw insertError;
      } else if (existingReciprocal.status !== 'accepted') {
        // Reciprocal relationship exists but is not accepted, update it
        const { error: updateRecipError } = await supabase
          .from('user_relationships')
          .update({
            status: 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('user_relationships_id', existingReciprocal.user_relationships_id);
        if (updateRecipError) throw updateRecipError;
      }
      
      // Refresh friend requests and friendships
      fetchFriendRequests();
      fetchFriendships();
      
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };
  
  // Handle declining an incoming friend request
  const handleDeclineFriendRequest = async (requestId) => {
    if (!currentUser) return;
    
    try {
      // Delete the relationship record
      const { error } = await supabase
        .from('user_relationships')
        .delete()
        .eq('user_relationships_id', requestId);
      
      if (error) throw error;
      
      // Refresh friend requests
      fetchFriendRequests();
      
      Alert.alert('Success', 'Friend request declined.');
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    }
  };
  
  // Handle canceling an outgoing friend request
  const handleCancelFriendRequest = async (requestId) => {
    if (!currentUser) return;
    
    try {
      // Delete the relationship record
      const { error } = await supabase
        .from('user_relationships')
        .delete()
        .eq('user_relationships_id', requestId);
      
      if (error) throw error;
      
      // Refresh friend requests
      fetchFriendRequests();
      
      Alert.alert('Success', 'Friend request canceled.');
    } catch (error) {
      console.error('Error canceling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    }
  };

  // Send friend request
  const sendFriendRequest = async (userId) => {
    if (!currentUser) return;
    
    try {
      // First check if there's an existing relationship or request
      const { data: existingRelationship, error: checkError } = await supabase
        .from('friendships_with_profiles')
        .select('*')
        .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUser.id})`)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no row found, which is what we want
        throw checkError;
      }
      
      if (existingRelationship) {
        if (existingRelationship.status === 'accepted') {
          Alert.alert('Already Friends', 'You are already friends with this user.');
        } else if (existingRelationship.requester_id === currentUser.id) {
          Alert.alert('Request Pending', 'You have already sent a friend request to this user.');
        } else {
          Alert.alert('Request Received', 'This user has already sent you a friend request. Check your friend requests to accept.');
        }
        return;
      }
      
      // If no existing relationship, create a new one
      const { error } = await supabase
        .from('user_relationships')
        .insert({
          requester_id: currentUser.id,
          addressee_id: userId,
          status: 'pending',
          category: 'friend',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Refresh friend requests
      fetchFriendRequests();
      fetchAllUsers(); // Refresh users list as well
      
      Alert.alert('Success', 'Friend request sent successfully!');
      setShowUsersTray(false);
    } catch (error) {
      console.error('Error sending friend request:', error);
      
      // Show a more helpful error message
      if (error.code === '23505') {
        Alert.alert('Already Requested', 'You already have a pending friend request with this user.');
      } else {
        Alert.alert('Error', 'Failed to send friend request. Please try again.');
      }
    }
  };
  
  // Handle opening the friend modal
  /* // Modal no longer used for this interaction
  const handleOpenFriendModal = (friend) => {
    setSelectedFriend(friend);
  };
  */
  
  // Start a chat with a user
  const startChat = async (userId) => {
    // Find the user details to pass to the chat
    const user = allUsers.find(user => user.id === userId);
    if (user) {
      // Set the selected user and show the chat modal
      setSelectedChatUser({
        id: user.id,
        name: user.full_name || 'User',
        avatar: user.avatar_url || 'https://via.placeholder.com/50',
        username: user.username || 'username'
      });
      setShowChatModal(true);
      setShowUsersTray(false); // Close the user tray modal
    } else {
      Alert.alert('Error', 'Could not find user details');
    }
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
                      onPress={() => navigation.navigate('UserPostsFeedScreen', { 
                        userId: currentUser?.id, 
                        username: 'My Posts',
                        postId: item.post_id // Pass the specific post_id to navigate to
                      })}
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
            {loadingGroups ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading favorite groups...</Text>
              </View>
            ) : favoriteGroups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No favorite groups yet</Text>
                <Text style={styles.emptySubText}>Browse groups and mark your favorites</Text>
              </View>
            ) : (
              <FlatList
                key="groups-list"
                data={favoriteGroups}
                keyExtractor={(item, index) => item.favorite_id ? `${item.favorite_id}-${index}` : `group-${index}`}
                scrollEnabled={false} /* Disable scrolling to prevent nested scrolling issues */
                contentContainerStyle={styles.cardList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.airbnbCard}
                    onPress={() => {
                      // Determine where to navigate based on item_type
                      if (item.item_type === 'housing_group') {
                        navigation.navigate('HousingGroupDetailScreen', { groupId: item.item_id });
                      } else {
                        navigation.navigate('GroupDetail', { 
                          groupId: item.item_id,
                          groupType: item.item_type || 'group'
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Image 
                      source={{ uri: item.item_image_url || 'https://via.placeholder.com/300x200?text=Group' }} 
                      style={styles.cardImage} 
                    />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{item.item_title || 'Group'}</Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.item_description || 'No description available'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        );
        
      case 'Bookings':
        return (
          <View style={{ flex: 1 }}>
            {loadingBookings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading upcoming bookings...</Text>
              </View>
            ) : upcomingBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No upcoming bookings</Text>
                <Text style={styles.emptySubText}>Book services to see them here</Text>
              </View>
            ) : (
              <FlatList
                key="bookings-list"
                data={upcomingBookings}
                keyExtractor={item => item.booking_id}
                scrollEnabled={false} /* Disable scrolling to prevent nested scrolling issues */
                contentContainerStyle={styles.cardList}
                renderItem={({ item }) => {
                  // Format the date for display
                  const bookingDate = new Date(item.scheduled_at);
                  const formattedDate = bookingDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  
                  return (
                    <TouchableOpacity 
                      style={styles.airbnbCard}
                      onPress={() => navigation.navigate('BookingDetail', { bookingId: item.booking_id })}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={{ 
                          uri: item.service_media_urls && item.service_media_urls.length > 0
                            ? item.service_media_urls[0]
                            : 'https://via.placeholder.com/300x200?text=Service'
                        }} 
                        style={styles.cardImage} 
                      />
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{item.service_title || 'Booking'}</Text>
                        <Text style={styles.cardDesc}>
                          {item.service_category || 'Service'} • {formattedDate}
                        </Text>
                        <View style={styles.bookingStatusContainer}>
                          <Text style={[styles.bookingStatus, { backgroundColor: item.booking_status === 'confirmed' ? '#4CAF50' : '#FFC107' }]}>
                            {item.booking_status ? item.booking_status.charAt(0).toUpperCase() + item.booking_status.slice(1) : 'Pending'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        );
        
      case 'Friends':
        // Filter friends based on search
        const filteredFriends = friendsList.filter(f =>
          f.name.toLowerCase().includes(friendSearch.toLowerCase())
        );

        return (
          <View style={{flex: 1}}>
            {/* Search Header */}
            <View style={styles.friendSearchRow}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={18} color="#777" style={styles.searchIcon} />
                <TextInput
                  style={styles.friendSearchInput}
                  placeholder="Search friends..."
                  value={friendSearch}
                  onChangeText={setFriendSearch}
                  placeholderTextColor="#888"
                />
              </View>
              <TouchableOpacity 
                style={styles.addFriendBtn} 
                onPress={() => setShowUsersTray(true)}
              >
                <Text style={styles.addFriendBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {/* Friend Requests Section */}
            {loadingRequests ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading requests...</Text>
              </View>
            ) : (
              <>
                {/* Incoming Friend Requests */}
                {incomingRequests.length > 0 && (
                  <View>
                    <Text style={styles.sectionHeader}>Incoming Requests</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.requestsScrollView}
                      contentContainerStyle={styles.requestsContentContainer}
                    >
                      {incomingRequests.map(request => (
                        <View key={request.id} style={styles.friendRequestCard}>
                          <Image 
                            source={{ uri: request.avatar }} 
                            style={styles.friendAvatarSmall} 
                          />
                          <Text style={styles.friendNameSmall}>{request.name}</Text>
                          <View style={styles.friendRequestActions}>
                            <TouchableOpacity 
                              style={styles.acceptBtn}
                              onPress={() => handleAcceptFriendRequest(request.id)}
                            >
                              <Text style={styles.acceptBtnText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.declineBtn}
                              onPress={() => handleDeclineFriendRequest(request.id)}
                            >
                              <Text style={styles.declineBtnText}>Decline</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* Outgoing Friend Requests */}
                {outgoingRequests.length > 0 && (
                  <View>
                    <Text style={styles.sectionHeader}>Pending Requests</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.requestsScrollView}
                      contentContainerStyle={styles.requestsContentContainer}
                    >
                      {outgoingRequests.map(request => (
                        <View key={request.id} style={styles.friendRequestCard}>
                          <Image 
                            source={{ uri: request.avatar }} 
                            style={styles.friendAvatarSmall} 
                          />
                          <Text style={styles.friendNameSmall}>{request.name}</Text>
                          <View style={styles.pendingRequestStatus}>
                            <Text style={styles.pendingStatusText}>Pending</Text>
                            <TouchableOpacity 
                              style={styles.cancelRequestBtn}
                              onPress={() => handleCancelFriendRequest(request.id)}
                            >
                              <Text style={styles.cancelRequestBtnText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* No Requests Message */}
                {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                  <View style={styles.emptyRequestsContainer}>
                    <Text style={styles.emptyRequestsText}>No friend requests</Text>
                  </View>
                )}
              </>
            )}
            
            {/* Friends Section */}
            <Text style={styles.sectionHeader}>Your Friends</Text>
            {loadingFriends ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : filteredFriends.length > 0 ? (
              <View style={styles.friendsGridContainer}>
                {filteredFriends.map((friend) => (
                  <TouchableOpacity 
                    key={friend.id}
                    style={styles.friendGridItem} 
                    onPress={() => {
  console.log('Navigating to UserProfileScreen with:', friend.userId, friend);
  navigation.navigate('UserProfileScreen', { userId: friend.userId });
}}
                  >
                    <UserAvatar
                      userId={friend.userId}
                      avatarUrl={friend.avatar}
                      size={64}
                      style={styles.friendAvatar}
                    />
                    <Text style={styles.friendGridName} numberOfLines={1}>{friend.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyFriendsContainer}>
                <Text style={styles.emptyFriendsText}>You don't have any friends yet</Text>
                <Text style={styles.emptyFriendsSubText}>Tap the Add button to find friends</Text>
              </View>
            )}
            
            {/* Friend Details Modal - Commented out as friend items now navigate directly to UserProfileScreen 
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
                          // This would now be handled on the UserProfileScreen
                          // navigation.navigate('ChatScreen', { friendId: selectedFriend.id }); 
                        }}>
                          <Text style={styles.modalActionBtnText}>Chat</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modalActionBtn} onPress={() => {
                          setSelectedFriend(null);
                          setShowGroupChatModal(true); // This could remain if group chat is initiated differently
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
            */}
            
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
            source={userProfile?.avatar_url 
              ? { uri: userProfile.avatar_url } 
              : require('../../assets/images/default-avatar.png')
            } 
            style={styles.avatar}
            resizeMode="cover"
          />
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {(() => {
                const displayName = userProfile?.full_name || userProfile?.username || 'User';
                console.log('[ProfileScreen] Display name logic:');
                console.log('  - userProfile?.full_name:', userProfile?.full_name);
                console.log('  - userProfile?.username:', userProfile?.username);
                console.log('  - Final display name:', displayName);
                return displayName;
              })()}
            </Text>
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
          <View style={styles.statBox}><Text style={styles.statNumber}>{friendsList.length}</Text><Text style={styles.statLabel}>Friends</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{favoriteGroups.length}</Text><Text style={styles.statLabel}>Groups</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{upcomingBookings.length}</Text><Text style={styles.statLabel}>Bookings</Text></View>
        </View>
        
        <View style={styles.profileButtonRow}>
          <TouchableOpacity style={styles.rewardsButton} onPress={() => navigation.navigate('RewardsScreen')}>
            <Text style={styles.rewardsButtonText}>Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryProfileButton} onPress={() => navigation.navigate('BookingsScreen')}>
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
      
      {/* Chat Modal */}
      <ChatModal
        visible={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setSelectedChatUser(null);
        }}
        initialUser={selectedChatUser} // Pass selected user to initialize chat
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
  pendingRequestStatus: {
    marginTop: 8,
    alignItems: 'center',
  },
  pendingStatusText: {
    fontSize: 13,
    color: '#777',
    marginBottom: 6,
  },
  cancelRequestBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelRequestBtnText: {
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyRequestsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyRequestsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bookingStatusContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  bookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    overflow: 'hidden',
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
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },
  searchIcon: {
    marginRight: 8,
  },
  friendSearchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
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
  requestsScrollView: {
    marginBottom: 16,
  },
  requestsContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  friendRequestCard: {
    width: 120,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  friendAvatarSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    backgroundColor: '#f3f3f3',
  },
  friendNameSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyFriendsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
  },
  emptyFriendsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyFriendsSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginVertical: 12,
    marginHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  closeModalBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'center',
  },
  closeModalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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