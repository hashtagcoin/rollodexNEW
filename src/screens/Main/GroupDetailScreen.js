import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, ScrollView, Share, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TabView, TabBar } from 'react-native-tab-view';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import ActionButton from '../../components/common/ActionButton';
import { shareGroup } from '../../services/shareService';
import PostCreationModal from '../../components/social/PostCreationModal';

const initialLayout = { width: Dimensions.get('window').width };

const PostsScene = ({ route, groupId, onAddPost, posts, loading, error, onRefresh, refreshing, currentUser }) => {
  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.DARK_GREEN} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPostItem = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image 
          source={{ uri: item.author?.avatar_url || 'https://via.placeholder.com/40' }} 
          style={styles.postAvatar}
        />
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>
            {item.author?.full_name || item.author?.username || 'User'}
          </Text>
          <Text style={styles.postTime}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </View>
      <Text style={styles.postContent}>{item.content}</Text>
      {item.media_url && (
        <Image 
          source={{ uri: item.media_url }} 
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="heart-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="share-social-outline" size={20} color="#666" />
          <Text style={styles.postActionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.postsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.DARK_GREEN]}
            tintColor={COLORS.DARK_GREEN}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubText}>Be the first to post in this group!</Text>
          </View>
        }
      />
    </View>
  );
};

const MembersScene = ({ route, members, loading, error, onRefresh, refreshing }) => {
  const renderMemberItem = ({ item }) => (
    <View style={styles.memberItem}>
      <Image
        source={{ uri: item.avatarUrl || 'https://via.placeholder.com/50' }}
        style={styles.memberAvatar}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.fullName || item.username}
          {item.role === 'admin' && (
            <Text style={styles.memberRole}> • Admin</Text>
          )}
        </Text>
        {item.bio && (
          <Text style={styles.memberBio} numberOfLines={2}>
            {item.bio}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={members}
      renderItem={renderMemberItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.membersList}
      scrollEnabled={false}
      nestedScrollEnabled={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.DARK_GREEN]}
          tintColor={COLORS.DARK_GREEN}
        />
      }
      ListEmptyComponent={
        <View style={styles.centeredContainer}>
          <Text style={styles.emptyText}>No members found</Text>
        </View>
      }
    />
  );
};

const GroupDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;
  const [showPostModal, setShowPostModal] = useState(false);
    const [user, setUser] = useState(null);

  useEffect(() => {
    // Get the current user when component mounts
    const getCurrentUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const [groupDetails, setGroupDetails] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavourited, setIsFavourited] = useState(false);

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

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
      fetchGroupPosts();
      fetchGroupMembers();
      checkIfFavorited();
    }
  }, [groupId]);

  const checkIfFavorited = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', groupId)
        .eq('item_type', 'group')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsFavourited(!!data);
    } catch (e) {
      console.error('Error checking favorite status:', e);
    }
  };

  const toggleFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to save favorites');
        return;
      }

      if (isFavourited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', groupId)
          .eq('item_type', 'group');
        
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert([{ 
            user_id: user.id, 
            item_id: groupId, 
            item_type: 'group',
            created_at: new Date() 
          }]);
        
        if (error) throw error;
      }
      
      // Toggle the local state
      setIsFavourited(!isFavourited);
    } catch (e) {
      console.error('Error updating favorite status:', e);
      alert('Failed to update favorite status');
    }
  };

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
          id,
          role,
          joined_at,
          user:user_profiles!inner(
            id,
            username,
            full_name,
            avatar_url,
            bio,
            created_at
          )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (membersFetchError) throw membersFetchError;
      
      // Transform data to make it easier to work with
      const formattedMembers = (data || []).map(member => ({
        id: member.user.id,
        username: member.user.username,
        fullName: member.user.full_name,
        avatarUrl: member.user.avatar_url,
        bio: member.user.bio,
        role: member.role,
        joinDate: member.joined_at,
      }));
      
      setMembers(formattedMembers);
      setMemberCount(formattedMembers.length);
    } catch (e) {
      console.error('Error fetching group members:', e);
      setMembersError(e.message || 'Failed to load members.');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await shareGroup({
        id: groupId,
        name: groupDetails?.name || 'Group',
        description: groupDetails?.description || ''
      });
    } catch (error) {
      console.error('Error sharing group:', error);
      alert('Failed to share group. Please try again.');
    }
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

  // Safely access group details with null checks
  const placeholderImage = 'https://via.placeholder.com/400x150.png?text=Group+Image';
  const displayImage = groupDetails?.imageurl || groupDetails?.avatar_url || groupDetails?.cover_image_url || placeholderImage;
  const displayName = groupDetails?.name || 'Group';
  const displayDesc = groupDetails?.description || 'No description available.';

  const handlePostCreated = useCallback((newPost) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
  }, []);

  const renderSceneCallback = useCallback(({ route, jumpTo }) => {
    switch (route.key) {
      case 'posts':
        return (
          <PostsScene
            route={route}
            jumpTo={jumpTo}
            groupId={groupId}
            onAddPost={() => setShowPostModal(true)}
            posts={posts}
            loading={postsLoading}
            error={postsError}
            onRefresh={onRefreshPosts}
            refreshing={refreshingPosts}
            currentUser={user}
          />
        );
      case 'members':
        return (
          <MembersScene
            route={route}
            members={members}
            loading={membersLoading}
            error={membersError}
            onRefresh={onRefreshMembers}
            refreshing={refreshingMembers}
          />
        );
      default:
        return null;
    }
  }, [members, membersLoading, membersError, onRefreshMembers, refreshingMembers]);

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

  if (error || !groupDetails || !groupDetails.id) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.errorMessage}>{error || 'Group not found.'}</Text>
        <TouchableOpacity onPress={fetchGroupDetails} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <Image 
          source={{ uri: item.avatarUrl || 'https://via.placeholder.com/60' }} 
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {item.fullName || item.username || 'User'}
            </Text>
            {item.role === 'admin' && (
              <View style={styles.adminBadge}>
                <MaterialIcons name="admin-panel-good" size={14} color="#fff" />
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>
          {item.bio && (
            <Text style={styles.memberBio} numberOfLines={2}>
              {item.bio}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  // Render the header content for the FlatList
  const renderHeader = () => (
    <>
      <View style={styles.heroContainer}>
        <Image 
          source={{ uri: displayImage || placeholderImage }} 
          style={styles.headerImage}
          onError={(e) => {
            e.target.source = { uri: placeholderImage };
          }}
        />
        <View style={styles.overlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{displayName}</Text>
        </View>
      </View>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="users" size={16} color="#666" style={{ marginRight: 6 }} />
              <Text style={{ color: '#666', marginRight: 12 }}>{memberCount} members</Text>
              {groupDetails?.is_public && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                  <Feather name="globe" size={12} color="#2E7D32" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#2E7D32', fontSize: 12, fontWeight: '500' }}>Public</Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={toggleFavorite} 
              style={[styles.favoriteButton, { marginRight: 8 }]}
            >
              <Ionicons 
                name={isFavourited ? 'heart' : 'heart-outline'} 
                size={24} 
                color={isFavourited ? '#E53935' : '#666'} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare}>
              <Feather name="share-2" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
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
          <TouchableOpacity 
            style={[styles.actionButton, styles.joinButton]} 
            onPress={handleJoinGroup}
          >
            <Feather name="user-plus" size={16} color="#fff" style={styles.joinIcon} />
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
        style={{ flex: 1, minHeight: 400 }}
      />
    </>
  );


};

const styles = StyleSheet.create({
  screenContainer: { 
    flex: 1, 
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  actionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 999,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 0,
  },
  favoriteButton: {
    padding: 8,
    marginLeft: 8,
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  postActionText: {
    marginLeft: 6,
    color: '#666',
  },
  postsList: {
    padding: 12,
  },


  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    maxWidth: '70%',
  },
  memberBio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.DARK_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  adminText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'normal',
  },
  memberBio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  membersList: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100, // Extra padding at the bottom for better scrolling
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    marginBottom: 0,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eaeaea',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMembers: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerContent: {
    position: 'relative',
    padding: 16,
    paddingTop: 0,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  headerTextContainer: {
    position: 'relative',
    zIndex: 1,
  },
  headerActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  headerRow: { 
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 0,
  },
  groupTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#222', 
    flex: 1, 
    marginBottom: 2,
  },
  groupDesc: { 
    color: '#555', 
    fontSize: 15, 
    lineHeight: 22, 
    padding: 16,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 1,
  },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e74c3c', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, marginLeft: 14 },
  leaveBtnText: { color: '#fff', marginLeft: 5, fontWeight: '600' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 80,
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
    backgroundColor: COLORS.DARK_GREEN,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  joinIcon: {
    marginRight: 4,
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
