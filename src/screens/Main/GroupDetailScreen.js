import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Share, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import AppHeader from '../../components/layout/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { TabView, TabBar } from 'react-native-tab-view';

const initialLayout = { width: Dimensions.get('window').width };

const PostsScene = ({ route, jumpTo }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
      <Text>Posts Tab Content</Text>
    </View>
  );
};

const MembersScene = ({ route, jumpTo }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
      <Text>Members Tab Content</Text>
    </View>
  );
};

const GroupDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;

  const [groupDetails, setGroupDetails] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(null);

  const [refreshingPosts, setRefreshingPosts] = useState(false);
  const [refreshingMembers, setRefreshingMembers] = useState(false);

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'posts', title: 'Posts' },
    { key: 'members', title: 'Members' },
  ]);

  const [isFavourited, setIsFavourited] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
      fetchGroupPosts();
      fetchGroupMembers();
    }
  }, [groupId]);

  const fetchGroupDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*, owner_profile:user_profiles!owner_id(id, username, avatar_url)')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroupDetails(groupData);

      const { count, error: countError } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (countError) throw countError;
      setMemberCount(count || 0);

      const { data: { user } } = await supabase.auth.getUser();
      if (user && groupData && user.id === groupData.owner_id) {
        setIsOwner(true);
      }
      if (user && groupData) {
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberError) {
          console.error('Error checking group membership:', memberError);
        } else if (memberData) {
          setIsMember(true);
        }
      }
    } catch (e) {
      console.error('Error fetching group details:', e);
      setError(e.message || 'Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  const onRefreshPosts = useCallback(async () => {
    setRefreshingPosts(true);
    await fetchGroupPosts();
    setRefreshingPosts(false);
  }, [groupId]);

  const fetchGroupPosts = async () => {
    if (!groupId) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const { data, error: postsFetchError } = await supabase
        .from('group_posts')
        .select(`
          id,
          created_at,
          group_id,
          user_id,
          content,
          media_url,
          media_type,
          author:user_profiles (id, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (postsFetchError) throw postsFetchError;
      setPosts(data || []);
    } catch (e) {
      console.error('Error fetching group posts:', e);
      setPostsError(e.message || 'Failed to load posts.');
    } finally {
      setPostsLoading(false);
    }
  };

  const onRefreshMembers = useCallback(async () => {
    setRefreshingMembers(true);
    await fetchGroupMembers();
    setRefreshingMembers(false);
  }, [groupId]);

  const fetchGroupMembers = async () => {
    if (!groupId) return;
    setMembersLoading(true);
    setMembersError(null);
    try {
      const { data, error: membersFetchError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          role,
          user:user_profiles (id, username, avatar_url, full_name)
        `)
        .eq('group_id', groupId);

      if (membersFetchError) throw membersFetchError;
      setMembers(data || []);
    } catch (e) {
      console.error('Error fetching group members:', e);
      setMembersError(e.message || 'Failed to load members.');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleShare = async () => {
    if (!groupDetails) return;
    try {
      await Share.share({
        message: `Check out the group: ${groupDetails.name}`,
      });
    } catch (error) { /* Handle error */ }
  };

  const handleJoinGroup = async () => {
    if (!groupDetails) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to join a group.');
      return;
    }

    try {
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id, role: 'member' });

      if (joinError) throw joinError;
      setIsMember(true);
      setMemberCount(prevCount => prevCount + 1);
      fetchGroupMembers();
      alert(`Successfully joined ${groupDetails.name}!`);
    } catch (e) {
      console.error('Error joining group:', e);
      alert(`Failed to join group: ${e.message}`);
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupDetails) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Error identifying user.');
      return;
    }

    try {
      const { error: leaveError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (leaveError) throw leaveError;
      setIsMember(false);
      setIsOwner(false);
      setMemberCount(prevCount => Math.max(0, prevCount - 1));
      fetchGroupMembers();
      alert(`Successfully left ${groupDetails.name}.`);
    } catch (e) {
      console.error('Error leaving group:', e);
      alert(`Failed to leave group: ${e.message}`);
    }
  };

  const displayImage = groupDetails.imageurl || groupDetails.avatar_url || groupDetails.cover_image_url || 'https://via.placeholder.com/400x150.png?text=Group+Image';
  const displayName = groupDetails.name || 'Group';
  const displayDesc = groupDetails.description || 'No description available.';

  const renderSceneCallback = useCallback(({ route, jumpTo }) => {
    switch (route.key) {
      case 'posts':
        return (
          <PostsScene
            route={route}
            jumpTo={jumpTo}
          />
        );
      case 'members':
        return (
          <MembersScene
            route={route}
            jumpTo={jumpTo}
          />
        );
      default:
        return null;
    }
  }, []);

  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: '#009966' }}
      style={{ backgroundColor: 'white' }}
      labelStyle={{ color: '#333', fontWeight: '600' }}
      activeColor={'#009966'}
      inactiveColor={'#888'}
    />
  );

  if (loading) {
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading group...</Text>
      </View>
    );
  }

  if (error || !groupDetails) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.errorMessage}>{error || 'Group not found.'}</Text>
        <TouchableOpacity onPress={fetchGroupDetails} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <AppHeader title={displayName} navigation={navigation} canGoBack={true} />
      <Image source={{ uri: displayImage }} style={styles.headerImage} />
      <View style={styles.headerRow}>
        <Text style={styles.groupTitle}>{displayName}</Text>
        <TouchableOpacity onPress={() => setIsFavourited(f => !f)}>
          {isFavourited ? (
            <AntDesign name="star" size={26} color="#FFD700" />
          ) : (
            <AntDesign name="staro" size={26} color="#888" />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={{ marginLeft: 14 }}>
          <Feather name="share-2" size={24} color="#007AFF" />
        </TouchableOpacity>
        {isOwner ? (
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => alert('Edit Group - Coming Soon!')}>
            <Feather name="edit-2" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        ) : isMember ? (
          <TouchableOpacity style={[styles.actionButton, styles.leaveButton]} onPress={handleLeaveGroup}>
            <Feather name="log-out" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Leave</Text>
          </TouchableOpacity>
        ) : groupDetails.is_public ? (
          <TouchableOpacity style={[styles.actionButton, styles.joinButton]} onPress={handleJoinGroup}>
            <Feather name="user-plus" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Join</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.groupDesc}>{displayDesc}</Text>
      <View style={styles.infoRow}>
        <Feather name="users" size={16} color="#555" />
        <Text style={styles.infoText}>{memberCount} Members</Text>
        {groupDetails.is_public && (
          <View style={styles.publicBadge}>
            <Feather name="globe" size={12} color="#007AFF" style={{ marginRight: 4 }} />
            <Text style={styles.publicBadgeText}>Public</Text>
          </View>
        )}
        {groupDetails.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{groupDetails.category.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderSceneCallback}
        onIndexChange={setIndex}
        initialLayout={initialLayout}
        renderTabBar={renderTabBar}
        style={{ flex: 1 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#f8f8f8' },
  headerImage: { width: '100%', height: 150, backgroundColor: '#eaeaea' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginTop: -30, marginBottom: 10 },
  groupTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', flex: 1, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 5 },
  groupDesc: { color: '#555', fontSize: 15, paddingHorizontal: 14, marginBottom: 12, lineHeight: 20 },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e74c3c', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, marginLeft: 14 },
  leaveBtnText: { color: '#fff', marginLeft: 5, fontWeight: '600' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 13,
  },
  editButton: {
    backgroundColor: '#009966',
  },
  joinButton: {
    backgroundColor: '#009966',
  },
  leaveButton: {
    backgroundColor: '#e74c3c',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#555',
    marginRight: 12,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  publicBadgeText: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    color: '#555',
    fontSize: 11,
    fontWeight: 'bold',
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorMessage: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButtonSmall: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tabBar: { flexDirection: 'row', marginBottom: 8, marginTop: 4, marginHorizontal: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: '#eaeaea' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff' },
  tabText: { fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#007AFF' },
  postCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  postImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 10, backgroundColor: '#eaeaea' },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#e0e0e0',
  },
  postAuthorName: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 15,
  },
  postDate: {
    fontSize: 12,
    color: '#888',
  },
  postText: { color: '#444', fontSize: 14, marginTop: 2, lineHeight: 20 },
  memberCard: {
    flex: 1,
    margin: 4,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    maxWidth: '48%',
  },
  memberGridRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eaeaea',
    marginBottom: 8,
  },
  memberInfo: {
    alignItems: 'center',
    width: '100%',
  },
  memberName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: '#009966',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  centeredContentMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  noContentText: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '600',
  },
  noContentSubText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#009966',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default GroupDetailScreen;
