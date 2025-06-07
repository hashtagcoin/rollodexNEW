import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppHeader from '../../components/layout/AppHeader';
import ChatModal from '../../components/chat/ChatModal';
import { useUser } from '../../context/UserContext'; // To get the currently logged-in user
import { getUserPosts } from '../../services/postService'; // Assuming this can take a userId

const TABS = ['Posts', 'Friends'];
const windowWidth = Dimensions.get('window').width;

const UserProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  console.log('UserProfileScreen route params:', route.params); // Debug log
  const { user: loggedInUser } = useUser(); // Logged-in user

  // Defensive: Check for missing or malformed params
  if (!route.params || !route.params.userId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: 'red', fontWeight: 'bold', marginBottom: 10 }}>Error: No user specified.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const viewedUserId = route.params.userId; // ID of the profile being viewed

  const [viewedUserProfile, setViewedUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedTab, setSelectedTab] = useState('Posts');
  const scrollViewRef = useRef(null);

  // Posts state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Friends state
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);

  // Fetch viewed user's profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!viewedUserId) return;
      setLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', viewedUserId)
          .single();
        if (error) throw error;
        setViewedUserProfile(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Could not load user profile.');
        navigation.goBack();
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [viewedUserId]);

  // Fetch posts and friends when profile is loaded or tab changes
  useEffect(() => {
    if (!viewedUserProfile) return;

    const fetchDataForTab = async () => {
      if (selectedTab === 'Posts') {
        setLoadingPosts(true);
        try {
          const userPosts = await getUserPosts(viewedUserProfile.id);
          setPosts(userPosts || []);
        } catch (error) {
          console.error('Error fetching posts:', error);
        } finally {
          setLoadingPosts(false);
        }
      } else if (selectedTab === 'Friends') {
        setLoadingFriends(true);
        try {
          // Fetch accepted friendships for the viewed user
          const { data, error } = await supabase
            .from('friendships_with_profiles') // Assuming this view exists and is structured appropriately
            .select('*')
            .or(`requester_id.eq.${viewedUserProfile.id},addressee_id.eq.${viewedUserProfile.id}`)
            .eq('status', 'accepted');
          if (error) throw error;

          const formattedFriends = data
            .map(friendship => {
              const isRequester = friendship.requester_id === viewedUserProfile.id;
              return {
                id: friendship.id, // Friendship ID
                userId: isRequester ? friendship.addressee_id : friendship.requester_id,
                name: isRequester ? (friendship.addressee_name || 'User') : (friendship.requester_name || 'User'),
                avatar: isRequester ? (friendship.addressee_avatar || 'https://via.placeholder.com/150') : (friendship.requester_avatar || 'https://via.placeholder.com/150'),
              };
            })
            .filter(f => !!f.userId); // Only keep friends with a valid userId
          setFriendsList(formattedFriends);
        } catch (error) {
          console.error('Error fetching friends list:', error);
        } finally {
          setLoadingFriends(false);
        }
      }
    };

    fetchDataForTab();
  }, [viewedUserProfile, selectedTab]);

  useFocusEffect(
    React.useCallback(() => {
      // Reset scroll position and selected tab on focus if needed
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      // Optionally refetch data or reset state if necessary when screen comes into focus
      // For now, data fetching is tied to viewedUserProfile and selectedTab changes.
      return () => {};
    }, [])
  );

  const handleChatPress = () => {
    if (viewedUserProfile) {
      setShowChatModal(true);
    }
  };

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainerFullPage}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!viewedUserProfile && !loadingProfile) {
    return (
      <View style={styles.loadingContainerFullPage}>
        <Text>User not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{color: COLORS.primary, marginTop: 10}}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPosts = () => {
    if (loadingPosts) {
      return <ActivityIndicator style={{ marginTop: 20 }} size="small" color={COLORS.primary} />;
    }
    if (posts.length === 0) {
      return <Text style={styles.emptyTabText}>No posts yet.</Text>;
    }
    // Simplified post item for now
    return (
      <FlatList
        data={posts}
        keyExtractor={(item, idx) => (item.id ? item.id.toString() : `post-${idx}`)}
        renderItem={({ item }) => (
          <View style={styles.postItemContainer}>
            {item.image_url && 
              <Image source={{ uri: item.image_url }} style={styles.postImage_small} resizeMode="cover" />
            }
            <Text style={styles.postText_small}>{item.content}</Text>
          </View>
        )}
        numColumns={3} // Instagram-style grid
        columnWrapperStyle={styles.postGridRow}
        listKey={`user-${viewedUserId}-posts`}
      />
    );
  };

  const renderFriends = () => {
    if (loadingFriends) {
      return <ActivityIndicator style={{ marginTop: 20 }} size="small" color={COLORS.primary} />;
    }
    if (friendsList.length === 0) {
      return <Text style={styles.emptyTabText}>No friends yet.</Text>;
    }
    // Simplified friend item for now
    return (
      <FlatList
        data={friendsList}
        keyExtractor={(item, idx) => (item.userId ? item.userId.toString() : `friend-${idx}`)} // Robust keyExtractor
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.friendItemContainer} onPress={() => navigation.push('UserProfileScreen', { userId: item.userId })}>
            <Image source={{ uri: item.avatar }} style={styles.friendAvatar_small} />
            <Text style={styles.friendName_small} numberOfLines={1}>{item.name}</Text>
          </TouchableOpacity>
        )}
        numColumns={3} // Grid style for friends
        columnWrapperStyle={styles.friendsGridRow}
        listKey={`user-${viewedUserId}-friends`}
      />
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Posts':
        return renderPosts();
      case 'Friends':
        return renderFriends();
      default:
        return null;
    }
  };

  // Helper to render profile header and tab bar as a single header component
  const renderListHeader = () => (
    <>
      <View style={styles.profileHeaderContainer}>
        <View style={styles.profileTopSection}>
          <TouchableOpacity
            onPress={() => {
              if (loggedInUser && viewedUserProfile && viewedUserProfile.id === loggedInUser.id) {
                navigation.navigate('ProfileScreen');
              }
            }}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: viewedUserProfile?.avatar_url || 'https://via.placeholder.com/150' }} 
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{viewedUserProfile?.full_name || 'User'}</Text>
            <Text style={styles.username}>@{viewedUserProfile?.username || 'username'}</Text>
          </View>
        </View>
        <Text style={styles.userBio}>{viewedUserProfile?.bio || 'No bio available.'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statNumber}>{posts.length}</Text><Text style={styles.statLabel}>Posts</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{friendsList.length}</Text><Text style={styles.statLabel}>Friends</Text></View>
        </View>
        {loggedInUser && viewedUserId !== loggedInUser.id && (
          <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.white} />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.tabBarContainer}>
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
      </View>
    </>
  );

  // Choose data and renderItem based on selectedTab
  const listData = selectedTab === 'Posts' ? posts : friendsList;
  const renderItem = selectedTab === 'Posts'
    ? ({ item }) => (
        <View style={styles.postItemContainer}>
          {item.image_url && 
            <Image source={{ uri: item.image_url }} style={styles.postImage_small} resizeMode="cover" />
          }
          <Text style={styles.postText_small}>{item.content}</Text>
        </View>
      )
    : ({ item }) => (
        <TouchableOpacity style={styles.friendItemContainer} onPress={() => navigation.push('UserProfileScreen', { userId: item.userId })}>
          <Image source={{ uri: item.avatar }} style={styles.friendAvatar_small} />
          <Text style={styles.friendName_small} numberOfLines={1}>{item.name}</Text>
        </TouchableOpacity>
      );
  const keyExtractor = selectedTab === 'Posts'
    ? (item, idx) => (item.id ? item.id.toString() : `post-${idx}`)
    : (item, idx) => (item.userId ? item.userId.toString() : `friend-${idx}`);

  return (
    <View style={styles.safeArea}>
      <AppHeader title={viewedUserProfile?.username || 'User Profile'} showBackButton={true} onBack={() => navigation.goBack()} />
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={{ paddingBottom: 40, backgroundColor: COLORS.lightGray }}
        ListEmptyComponent={
          selectedTab === 'Posts'
            ? <Text style={styles.emptyTabText}>No posts yet.</Text>
            : <Text style={styles.emptyTabText}>No friends yet.</Text>
        }
        showsVerticalScrollIndicator={false}
      />
      <ChatModal 
        visible={showChatModal} 
        onClose={() => setShowChatModal(false)} 
        initialUser={viewedUserProfile ? { id: viewedUserProfile.id, name: viewedUserProfile.full_name || viewedUserProfile.username, avatar_url: viewedUserProfile.avatar_url } : null} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGray, // Or your app's background color
  },
  loadingContainerFullPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: COLORS.white, // Ensure background for scroll content
  },
  profileHeaderContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray2,
    alignItems: 'center', // Center avatar and basic info
  },
  profileTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...FONTS.h2, 
    color: COLORS.black,
    fontWeight: 'bold',
  },
  username: {
    ...FONTS.body3,
    color: COLORS.darkGray,
  },
  userBio: {
    ...FONTS.body3,
    color: COLORS.black,
    textAlign: 'center', // Or 'left' if preferred
    marginBottom: 15,
    paddingHorizontal: 10, // Add some padding if centered
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.lightGray2,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    ...FONTS.h3,
    color: COLORS.black,
    fontWeight: 'bold',
  },
  statLabel: {
    ...FONTS.body4,
    color: COLORS.darkGray,
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    width: '80%', // Make chat button prominent
    alignSelf: 'center',
  },
  chatButtonText: {
    ...FONTS.h4,
    color: COLORS.white,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  tabBarContainer: {
    backgroundColor: COLORS.white, // Important for sticky header to have a background
    // borderBottomWidth: 1, // Optional: if you want a line under the sticky tabs
    // borderBottomColor: COLORS.lightGray2,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray2,
    backgroundColor: COLORS.white, // Tab bar background
    paddingVertical: 10,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12, // Give some horizontal space to tabs
    alignItems: 'center',
    flex: 1, // Distribute space equally
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...FONTS.h4,
    color: COLORS.darkGray,
  },
  tabTextActive: {
    ...FONTS.h4,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    padding: 5, // Add slight padding around tab content area
    backgroundColor: COLORS.lightGray, // Background for the content area below tabs
    minHeight: 200, // Ensure tab content has some minimum height to be scrollable if needed
  },
  emptyTabText: {
    textAlign: 'center',
    marginTop: 50,
    ...FONTS.body3,
    color: COLORS.darkGray,
  },
  // Post item styles (Instagram-like grid)
  postItemContainer: {
    width: windowWidth / 3 - 4, // Accounting for padding/margin around tabContent and item margin
    height: windowWidth / 3 - 4,
    margin: 2,
    backgroundColor: COLORS.lightGray2, // Placeholder color
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage_small: {
    width: '100%',
    height: '100%',
  },
  postText_small: { // If you want to overlay text, position it absolutely
    position: 'absolute',
    bottom: 5,
    left: 5,
    right: 5,
    color: COLORS.white,
    ...FONTS.caption,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 3,
    borderRadius: 3,
    textAlign: 'center',
  },
  postGridRow: {
    // justifyContent: 'space-between', // Handled by item width and margin
  },
  // Friend item styles (Grid)
  friendItemContainer: {
    width: windowWidth / 3 - 14, // Accounting for padding/margin and item margin
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
    margin: 5,
    backgroundColor: COLORS.white,
    borderRadius: 8, // Airbnb-style card corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  friendAvatar_small: {
    width: windowWidth / 3 - 60, // Adjust size based on numColumns and padding
    height: windowWidth / 3 - 60,
    borderRadius: (windowWidth / 3 - 60) / 2,
    marginBottom: 8,
    backgroundColor: COLORS.lightGray, // Placeholder if avatar fails to load
  },
  friendName_small: {
    ...FONTS.caption, // Smaller font for grid view
    textAlign: 'center',
    color: COLORS.black,
    fontWeight: '500',
  },
  friendsGridRow: {
    // justifyContent: 'space-between', // Handled by item width and margin
  },
});

export default UserProfileScreen;
