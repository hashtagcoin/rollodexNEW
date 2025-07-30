import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  // FlatList, // Not directly used in the final JSX, renderPostsTab/renderMembersTab use .map
  // Dimensions, // windowWidth was unused
} from 'react-native';
import ShareTray from '../../components/common/ShareTray';
import CommentTray from '../../components/common/CommentTray';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import PostCreationModal from '../../components/social/PostCreationModal';
import { useUser } from '../../context/UserContext';
import ActionButton from '../../components/common/ActionButton'; // Assuming this is a FAB-capable button

const TABS = ['Posts', 'Members'];

const GroupDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const { groupId, joinFlow, groupName, userRole: routeUserRole, groupType: routeGroupType } = params;
  const { user } = useUser();

  const isMounted = useRef(false);
  const initialFetchDone = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [group, setGroup] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTab, setSelectedTab] = useState('Posts');
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [isGroupMember, setIsGroupMember] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(null);

  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);

  // Effect for managing component mount state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Effect to set the current user's role from route params
  useEffect(() => {
    if (routeUserRole) {
      console.log('[GroupDetailScreen] User role passed via params:', routeUserRole);
      setCurrentUserRole(routeUserRole);
    } else {
      setCurrentUserRole(null);
      console.log('[GroupDetailScreen] User role not in params or undefined.');
    }
  }, [routeUserRole]);


  // Fetch group data
  const fetchGroupData = useCallback(async () => {
    if (!groupId) return;
    console.log('[GroupDetailScreen] Fetching group data for:', groupId, 'Type hint:', routeGroupType);
    try {
      setLoading(true); // For the main group shell
      setError(null);
      
      const groupTypeToQuery = routeGroupType || (group?.type); // Prefer route param, then existing group type, then default
      let data, errorResult;
      
      if (groupTypeToQuery === 'housing_group') {
        const result = await supabase
          .from('housing_groups')
          .select('*, housing_group_members(count)')
          .eq('id', groupId)
          .maybeSingle();
        data = result.data;
        errorResult = result.error;
        if (data) data.type = 'housing_group';
      } else {
        const result = await supabase
          .from('groups')
          .select('*, group_members(count)')
          .eq('id', groupId)
          .maybeSingle();
        data = result.data;
        errorResult = result.error;
        if (data) data.type = 'group';
      }
      
      if (errorResult) throw errorResult;
      
      if (!data) {
        if (isMounted.current) setError('Group not found or no longer available.');
        return;
      }
      
      if (isMounted.current) {
        setGroup(data);
        // Adjust member count key based on actual table structure if different
        const currentMemberCount = data.group_members?.[0]?.count || data.housing_group_members?.[0]?.count || 0;
        setMemberCount(currentMemberCount);
      }
    } catch (err) {
      console.error('Error fetching group:', err);
      if (isMounted.current) setError('Failed to load group details.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [groupId, routeGroupType, group?.type]); // group.type helps if routeGroupType is not passed but group object already exists

  // Fetch group posts
  const fetchGroupPosts = useCallback(async () => {
    if (!groupId) return;
    console.log('[GroupDetailScreen] Fetching posts for:', groupId);
    try {
      setPostsLoading(true);
      setPostsError(null);
      
      const groupTypeToQuery = routeGroupType || group?.type || 'group';
      let postData, postError;
      
      const query = supabase
        .from('group_posts')
        .select('*, author:user_profiles(id, username, full_name, avatar_url)')
        .eq(groupTypeToQuery === 'housing_group' ? 'housing_group_id' : 'group_id', groupId)
        .order('created_at', { ascending: false });
        
      const result = await query;
      postData = result.data;
      postError = result.error;
            
      if (postError) throw postError;
      
      if (isMounted.current) {
        setPosts(postData || []);
        if (user && postData?.length > 0) {
          const { data: likesData, error: likesError } = await supabase
            .from('group_post_likes')
            .select('group_post_id')
            .eq('user_id', user.id)
            .in('group_post_id', postData.map(p => p.id));
          
          if (!likesError && likesData && isMounted.current) {
            const newLikedPosts = {};
            likesData.forEach(like => { newLikedPosts[like.group_post_id] = true; });
            setLikedPosts(newLikedPosts);
          }
        } else if (isMounted.current) {
            setLikedPosts({}); // Clear likes if no user or no posts
        }
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      if (isMounted.current) setPostsError('Failed to load posts.');
    } finally {
      if (isMounted.current) setPostsLoading(false);
    }
  }, [groupId, user, routeGroupType, group?.type]);

  // Fetch group members
  const fetchGroupMembers = useCallback(async () => {
    if (!groupId) return;
    console.log('[GroupDetailScreen] Fetching members for:', groupId);
    try {
      setMembersLoading(true);
      setMembersError(null);
      
      const groupTypeToQuery = routeGroupType || group?.type || 'group';
      const memberTable = groupTypeToQuery === 'housing_group' ? 'housing_group_members' : 'group_members';
      
      const { data, error } = await supabase
        .from(memberTable)
        .select('*, user_profiles(id, username, full_name, avatar_url, bio)')
        .eq('group_id', groupId); // Both tables use 'group_id' for the FK to the group
            
      if (error) throw error;
      
      if (isMounted.current) {
        const formattedMembers = (data || []).map(member => ({
          id: member.user_profiles.id,
          username: member.user_profiles.username,
          fullName: member.user_profiles.full_name,
          avatarUrl: member.user_profiles.avatar_url,
          bio: member.user_profiles.bio,
          role: member.role,
          joinedAt: member.created_at
        }));
        setMembers(formattedMembers);

        if (user) { // Update current user's role within this group
          const currentUserMemberInfo = formattedMembers.find(m => m.id === user.id);
          if (currentUserMemberInfo) {
            setCurrentUserRole(currentUserMemberInfo.role);
          } else if (isGroupMember) { // Was member, but not in list (e.g. removed)
             setIsGroupMember(false); // Sync state
             setCurrentUserRole(null);
          } else {
             setCurrentUserRole(null); // Not a member
          }
        }
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      if (isMounted.current) setMembersError('Failed to load members.');
    } finally {
      if (isMounted.current) setMembersLoading(false);
    }
  }, [groupId, user, isGroupMember, routeGroupType, group?.type]);

  // Check if user is a member
  const checkMembership = useCallback(async () => {
    if (!user || !groupId || !group) return; // Ensure group is loaded to know its type
    console.log('[GroupDetailScreen] Checking membership for user:', user.id, 'in group:', groupId);
    try {
      const memberTable = group.type === 'housing_group' ? 'housing_group_members' : 'group_members';
      const { data, error } = await supabase
        .from(memberTable)
        .select('id, role') // Fetch role as well
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (isMounted.current) {
        setIsGroupMember(!!data);
        if (data) {
          setCurrentUserRole(data.role); // Update role from direct check
        } else {
          setCurrentUserRole(null); // Not a member, no role
        }
      }
    } catch (err) {
      console.error('Error checking group membership:', err);
    }
  }, [user, groupId, group]);

  // Check favorite status
  const checkFavorite = useCallback(async () => {
    if (!user || !groupId) return;
    console.log('[GroupDetailScreen] Checking favorite status for user:', user.id, 'item:', groupId);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('favorite_id')
        .eq('user_id', user.id)
        .eq('item_id', groupId)
        .eq('item_type', 'group') // Assuming item_type distinguishes between group and housing_group if necessary, or use group.type
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (isMounted.current) setIsFavorite(!!data);
    } catch (err) {
      console.error('Error checking favorite status:', err);
    }
  }, [user, groupId]);

  // Effect to reset states when groupId changes
  useEffect(() => {
    console.log('[GroupDetailScreen] GroupId changed to:', groupId, ". Resetting states.");
    initialFetchDone.current = false;
    setLastUpdateTimestamp(null);
    setGroup(null);
    setPosts([]);
    setMembers([]);
    setError(null);
    setPostsError(null);
    setMembersError(null);
    setLoading(true); // Set loading true until new group data is fetched
    setSelectedTab('Posts'); // Reset to default tab
    setIsGroupMember(false);
    setIsFavorite(false);
    setCurrentUserRole(null);
  }, [groupId]);

  // Main data fetching effect (initial load for current groupId and on explicit update)
  useEffect(() => {
    if (!groupId) {
      if (isMounted.current) {
        setError('No Group ID provided.');
        setLoading(false);
      }
      return;
    }

    const loadAllData = async () => {
      console.log('[GroupDetailScreen] Loading all data for groupId:', groupId);
      if (!isMounted.current) return; // Guard against unmounted updates
      
      // Fetch group data first to determine type if not passed by route
      await fetchGroupData(); // Sets group, which checkMembership might use for type

      // Subsequent fetches can run in parallel if group.type is now set or was passed
      // Or fetchGroupData resolves and then these are called sequentially or based on group state.
      // For simplicity, let's assume fetchGroupData finishes and sets group.type,
      // or routeGroupType is reliable. The useCallback deps for fetchers handle this.
      
      // Await all critical initial loads
      await Promise.all([
        // fetchGroupData is already called
        fetchGroupPosts(),
        fetchGroupMembers(),
        // checkMembership and checkFavorite depend on `group` being set by fetchGroupData
        // so they are called after fetchGroupData resolves or in a separate effect depending on `group`
      ]);
      
      if (isMounted.current) {
        initialFetchDone.current = true;
      }
    };
    
    if (route.params?.updated && route.params.updated !== lastUpdateTimestamp) {
      console.log('[GroupDetailScreen] Detected update, refreshing all data...');
      if (isMounted.current) setLastUpdateTimestamp(route.params.updated);
      loadAllData();
    } else if (!initialFetchDone.current) {
      console.log('[GroupDetailScreen] Initial data load for current groupId:', groupId);
      loadAllData();
    }
  }, [groupId, route.params?.updated, lastUpdateTimestamp, fetchGroupData, fetchGroupPosts, fetchGroupMembers]);
  
  // Effect for checkMembership and checkFavorite, runs when group data is available
  useEffect(() => {
    if (group && user && initialFetchDone.current) { // Ensure group data is loaded and it's not part of initial chaos
        checkMembership();
        checkFavorite();
    }
  }, [group, user, checkMembership, checkFavorite, initialFetchDone.current]);


  // Effect to handle the join flow popup
  useEffect(() => {
    if (joinFlow && groupName && user && groupId && group) { // Ensure group is loaded for context
      Alert.alert(
        `Join ${groupName}?`,
        `Welcome to ${groupName}! This is a ${group.is_public ? 'public' : 'private'} group. To post comments and fully engage with other members, please join. We encourage respectful interaction. Enjoy your time here!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join Group', onPress: () => joinGroup(true) },
        ],
        { cancelable: true }
      );
    }
  }, [joinFlow, groupName, user, groupId, group, joinGroup]); // Added group and joinGroup

  // Handle joining or leaving a group
  const joinGroup = useCallback(async (autoJoin = false) => {
    if (!user || !groupId || !group) {
      if (!autoJoin) Alert.alert("Error", "Cannot perform action: User or group data missing.");
      return;
    }
    console.log(`[GroupDetailScreen] ${isGroupMember ? 'Leaving' : 'Joining'} group:`, groupId, 'AutoJoin:', autoJoin);

    const memberTable = group.type === 'housing_group' ? 'housing_group_members' : 'group_members';

    try {
      if (isGroupMember && !autoJoin) {
        // Leave logic unchanged
        Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave', style: 'destructive',
            onPress: async () => {
              const { error: leaveError } = await supabase.from(memberTable).delete()
                .eq('group_id', groupId).eq('user_id', user.id);
              if (leaveError) throw leaveError;
              if (isMounted.current) {
                setIsGroupMember(false);
                setCurrentUserRole(null);
                Alert.alert('Success', 'You have left the group.');
                fetchGroupData();
                fetchGroupMembers();
              }
            },
          },
        ]);
        return;
      }

      // Always check for existing membership before inserting
      const { data: existingMembership, error: checkError } = await supabase
        .from(memberTable)
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMembership) {
        if (isMounted.current) {
          setIsGroupMember(true);
          setCurrentUserRole(existingMembership.role || 'member');
          if (!autoJoin) Alert.alert('Info', 'You are already a member of this group');
        }
        return;
      }

      // Not a member, try to insert
      const { error: joinError } = await supabase.from(memberTable).insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString(),
      });
      if (joinError) {
        // If duplicate error (23505), treat as success
        if (joinError.code === '23505') {
          if (isMounted.current) {
            setIsGroupMember(true);
            setCurrentUserRole('member');
            if (!autoJoin) Alert.alert('Info', 'You are already a member of this group');
          }
        } else {
          throw joinError;
        }
      } else {
        if (isMounted.current) {
          setIsGroupMember(true);
          setCurrentUserRole('member');
          if (!autoJoin) Alert.alert('Success', 'You have joined this group!');
        }
      }
      // Always refresh
      fetchGroupData();
      fetchGroupMembers();
    } catch (err) {
      console.error('Error handling group membership:', err);
      if (!autoJoin && isMounted.current) Alert.alert('Error', 'Failed to process your request. Please try again.');
    }
  }, [user, groupId, group, isGroupMember, fetchGroupData, fetchGroupMembers]);

  // Check for auto-join when group data (specifically auto_join flag) is loaded
  useEffect(() => {
    if (group && group.auto_join && user && !isGroupMember && initialFetchDone.current) {
      console.log('[GroupDetailScreen] Auto-joining group:', group.name);
      joinGroup(true); // true indicates this is an auto-join
    }
  }, [group, user, isGroupMember, joinGroup, initialFetchDone.current]);
  
  // Track if we've already fetched posts/members for this tab in this group session
  const [didFetchPosts, setDidFetchPosts] = useState(false);
  const [didFetchMembers, setDidFetchMembers] = useState(false);

  // Reset fetch flags when groupId changes
  useEffect(() => {
    setDidFetchPosts(false);
    setDidFetchMembers(false);
  }, [groupId]);

  // Handle tab changes - only fetch once per tab per group session
  useEffect(() => {
    if (!initialFetchDone.current) return;

    if (selectedTab === 'Posts' && !didFetchPosts) {
      setDidFetchPosts(true);
      fetchGroupPosts();
    } else if (selectedTab === 'Members' && !didFetchMembers) {
      setDidFetchMembers(true);
      fetchGroupMembers();
    }
  }, [selectedTab, initialFetchDone.current, fetchGroupPosts, fetchGroupMembers, didFetchPosts, didFetchMembers]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    console.log('[GroupDetailScreen] Manual refresh triggered.');
    setRefreshing(true);
    // Re-fetch all primary data. fetchGroupData also updates member count.
    await fetchGroupData(); 
    if (selectedTab === 'Posts') {
      await fetchGroupPosts();
    } else {
      await fetchGroupMembers();
    }
    // Membership and favorite status might also need refresh if relevant actions occurred outside.
    if (user && group) { // only if user and group context exist
        await checkMembership();
        await checkFavorite();
    }
    setRefreshing(false);
  }, [fetchGroupData, fetchGroupPosts, fetchGroupMembers, selectedTab, user, group, checkMembership, checkFavorite]);


  // Post interactions
  const [likedPosts, setLikedPosts] = useState({});
  
  const handlePostCreated = useCallback((newPost) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
    // Optionally, could also increment a local post count if displayed
  }, []);
  
  const handleLikePost = useCallback(async (postId) => {
    if (!user) return;
    
    const wasLiked = !!likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !wasLiked })); // Optimistic update
    
    try {
      if (wasLiked) {
        const { error } = await supabase.from('group_post_likes').delete()
          .eq('group_post_id', postId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('group_post_likes').insert({
          group_post_id: postId, user_id: user.id, created_at: new Date().toISOString()
        });
        if (error) throw error;
      }
      // fetchGroupPosts(); // Re-fetch all posts to update like counts from DB (can be heavy)
      // Or, update post's like_count locally if available and API returns new count
    } catch (err) {
      console.error('Error toggling like:', err);
      setLikedPosts(prev => ({ ...prev, [postId]: wasLiked })); // Revert on error
      if (isMounted.current) Alert.alert('Error', 'Failed to process like. Please try again.');
    }
  }, [user, likedPosts]);
  
  const handleCommentPost = useCallback((post) => {
    setCommentItem(post);
    setCommentVisible(true);
  }, []);
  
  const handleCommentAdded = useCallback(() => {
    fetchGroupPosts(); // Refresh posts to show updated comment count
  }, [fetchGroupPosts]);
  
  const [shareVisible, setShareVisible] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [shareItemType, setShareItemType] = useState('post');
  
  const handleSharePost = useCallback((post) => {
    setShareItem(post);
    setShareItemType('post');
    setShareVisible(true);
  }, []);
  
  const handleEditGroup = useCallback(() => {
    if (!group) return;
    console.log('[GroupDetailScreen] Navigating to EditGroupScreen for group ID:', group.id);
    navigation.navigate('EditGroup', { 
      groupId: group.id, 
      initialData: {
        name: group.name,
        description: group.description,
        imageurl: group.imageurl,
        is_public: group.is_public, // Pass other relevant fields
        // ... other group fields
      },
      groupType: group.type, // Pass group type
    });
  }, [group, navigation]);

  const handleShareGroup = useCallback(() => {
    if (!group) return;
    setShareItem(group);
    setShareItemType('group'); // Make sure ShareTray handles 'group' type
    setShareVisible(true);
  }, [group]);

  const toggleFavorite = useCallback(async () => {
    if (!user || !groupId || !group) return;
    
    try {
      const newIsFavorite = !isFavorite;
      setIsFavorite(newIsFavorite); // Optimistic update

      if (!newIsFavorite) { // Was favorite, now unfavoriting
        const { error } = await supabase.from('favorites').delete()
          .eq('user_id', user.id).eq('item_id', groupId).eq('item_type', 'group'); // or group.type
        if (error) throw error;
        if (isMounted.current) Alert.alert('Success', 'Removed from favorites');
      } else { // Was not favorite, now favoriting
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id, item_id: groupId, item_type: 'group', created_at: new Date().toISOString()
        });
        if (error) throw error;
        if (isMounted.current) Alert.alert('Success', 'Added to favorites');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      if (isMounted.current) {
        setIsFavorite(isFavorite); // Revert optimistic update
        Alert.alert('Error', 'Failed to update favorite status.');
      }
    }
  }, [user, groupId, group, isFavorite]);

  // Render functions for tab content
  const renderPostsTab = () => {
    if (postsLoading && !refreshing && posts.length === 0) {
      return <View style={styles.centeredContainer}><ActivityIndicator size="large" color={COLORS.DARK_GREEN} /></View>;
    }
    if (postsError && !refreshing) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{postsError}</Text>
          <TouchableOpacity onPress={fetchGroupPosts} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No posts yet in this group.</Text>
          {isGroupMember && <Text style={styles.emptySubText}>Be the first to post!</Text>}
        </View>
      );
    }
    return (
      <View style={styles.postsContainer}>
        {posts.map(item => (
          <View key={item.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image 
                source={{ uri: item.author?.avatar_url || 'https://via.placeholder.com/40' }} 
                style={styles.postAvatar}
              />
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthorName}>{item.author?.full_name || item.author?.username || 'User'}</Text>
                <Text style={styles.postTime}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </View>
            <Text style={styles.postContent}>{item.content}</Text>
            {item.media_url && <Image source={{ uri: item.media_url }} style={styles.postImage} resizeMode="cover" />}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.postAction} onPress={() => handleLikePost(item.id)}>
                <Ionicons name={likedPosts[item.id] ? "heart" : "heart-outline"} size={20} color={likedPosts[item.id] ? COLORS.DARK_GREEN : "#666"} />
                <Text style={[styles.postActionText, likedPosts[item.id] && styles.postActionTextActive]}>Like</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postAction} onPress={() => handleCommentPost(item)}>
                <Ionicons name="chatbubble-outline" size={20} color="#666" />
                <Text style={styles.postActionText}>Comment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postAction} onPress={() => handleSharePost(item)}>
                <Ionicons name="share-social-outline" size={20} color="#666" />
                <Text style={styles.postActionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderMembersTab = () => {
    if (membersLoading && !refreshing && members.length === 0) {
      return <View style={styles.centeredContainer}><ActivityIndicator size="large" color={COLORS.DARK_GREEN} /></View>;
    }
    if (membersError && !refreshing) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{membersError}</Text>
          <TouchableOpacity onPress={fetchGroupMembers} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (members.length === 0) {
      return <View style={styles.emptyContainer}><Text style={styles.emptyText}>No members found.</Text></View>;
    }
    return (
      <View style={styles.membersContainer}>
        {members.map(item => (
          <View key={item.id} style={styles.memberItem}>
            <Image source={{ uri: item.avatarUrl || 'https://via.placeholder.com/50' }} style={styles.memberAvatar} />
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={styles.memberName}>{item.fullName || item.username}</Text>
                {item.role === 'admin' && (
                  <View style={styles.adminBadge}>
                    <MaterialIcons name="admin-panel-settings" size={12} color="#fff" />
                    <Text style={styles.adminText}>Admin</Text>
                  </View>
                )}
              </View>
              {item.bio && <Text style={styles.memberBio} numberOfLines={1}>{item.bio}</Text>}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Posts': return renderPostsTab();
      case 'Members': return renderMembersTab();
      default: return null;
    }
  };

  // Comment tray state
  const [commentVisible, setCommentVisible] = useState(false);
  const [commentItem, setCommentItem] = useState(null);

  // Main component render
  return (
    <SafeAreaView style={[styles.container, {paddingTop: 0, marginTop: 0}]}> 
      <AppHeader
        title={group?.name || 'Group'}
        navigation={navigation}
        canGoBack={true}
        style={{
          paddingTop: Platform.OS === 'android' ? 9 : 12.5,
          paddingBottom: 3,
          minHeight: Platform.OS === 'android' ? 22.5 : 27.5,
          marginTop: 0,
          borderTopWidth: 0,
        }}
      />
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && !group && !error && (
          <View style={styles.centeredContainer}><ActivityIndicator size="large" color={COLORS.DARK_GREEN} /></View>
        )}
        {error && !group && (
          <View style={styles.centeredContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchGroupData} style={styles.retryButton}>
               <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {group && (
          <>
            <View style={styles.heroContainer}>
              <Image source={{ uri: group.imageurl || 'https://via.placeholder.com/400x180.png?text=Group+Cover' }} style={styles.coverImage} />
              <View style={styles.groupInfoCard}>
                <View style={styles.groupNameRow}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <View style={styles.headerIconsContainer}>
                    <TouchableOpacity 
                      onPress={handleShareGroup} 
                      style={styles.headerIconButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-social-outline" size={22} color={COLORS.PRIMARY || '#007AFF'} />
                    </TouchableOpacity>
                    {(currentUserRole === 'admin' || user?.id === group.created_by) && (
                      <TouchableOpacity onPress={handleEditGroup} style={styles.headerIconButton}>
                        <Feather name="edit-2" size={20} color={COLORS.DARK_GRAY} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.groupTypeContainer}>
                  <Ionicons name={group.is_public ? "lock-open-outline" : "lock-closed-outline"} size={16} color={COLORS.DARK_GREEN} />
                  <Text style={styles.groupType}>{group.is_public ? 'Public Group' : 'Private Group'}</Text>
                  {group.type === 'housing_group' && (
                     <View style={styles.publicBadge}>
                        <MaterialIcons name="house" size={12} color="#fff" />
                        <Text style={styles.publicText}>Housing</Text>
                     </View>
                  )}
                </View>
                <Text style={styles.groupDescription} numberOfLines={3}>{group.description}</Text>
                <View style={styles.groupMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={16} color="#666" />
                    <Text style={styles.metaText}>{memberCount} Members</Text>
                  </View>
                </View>
                <View style={styles.actionButtonsRow}>
                  {user && (
                    <TouchableOpacity
                      style={isGroupMember ? styles.leaveButton : styles.joinButton}
                      onPress={() => joinGroup(false)}
                      disabled={!group} // Disable if group info not loaded
                    >
                      <Text style={isGroupMember ? styles.leaveButtonText : styles.joinButtonText}>
                        {isGroupMember ? 'Leave Group' : 'Join Group'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {user && (
                     <ActionButton
                        iconName={isFavorite ? "heart" : "heart-outline"}
                        onPress={toggleFavorite}
                        style={styles.iconButton} // Generic style for small icon buttons
                        iconColor={isFavorite ? COLORS.RED : COLORS.DARK_GRAY}
                        disabled={!group}
                     />
                  )}
                </View>
              </View>
            </View>

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
            <View style={styles.tabContentContainer}>{renderTabContent()}</View>
          </>
        )}
      </ScrollView>

      {showCreatePostModal && group && user && (
        <PostCreationModal
          isVisible={showCreatePostModal}
          onClose={() => setShowCreatePostModal(false)}
          onPostCreated={(newPostData) => {
            const newPostWithAuthorInfo = {
              ...newPostData, // newPostData should contain content, media_url, group_id etc.
              id: newPostData.id || Date.now(), // Ensure it has an ID for key prop, DB will assign final one
              author: {
                id: user.id,
                username: user.user_metadata?.username,
                full_name: user.user_metadata?.full_name,
                avatar_url: user.user_metadata?.avatar_url,
              },
              created_at: new Date().toISOString(),
              // Ensure other necessary fields like like_count, comment_count are defaulted if needed
              like_count: 0, 
              comment_count: 0,
            };
            handlePostCreated(newPostWithAuthorInfo);
            setShowCreatePostModal(false);
          }}
          groupId={groupId}
          groupType={group.type}
        />
      )}
      {shareVisible && shareItem && (
        <ShareTray
          visible={shareVisible}
          item={shareItem}
          itemType={shareItemType}
          onClose={() => { setShareVisible(false); setShareItem(null); }}
        />
      )}
      {commentVisible && commentItem && user && (
        <CommentTray
          isVisible={commentVisible}
          itemType="group_post"
          itemId={commentItem.id}
          onClose={() => { setCommentVisible(false); setCommentItem(null); }}
          onCommentAdded={handleCommentAdded}
        />
      )}
      {isGroupMember && selectedTab === 'Posts' && user && group && (
        <View style={styles.fabContainer}>
          <ActionButton
            isFab={true} // Prop to style it as a FAB
            iconName="add"
            onPress={() => setShowCreatePostModal(true)}
            style={styles.fabStyle} // Apply specific FAB styling
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: '#f0f2f5', // Light gray background for scroll area
  },
  scrollViewContent: {
    paddingBottom: 80, // Space for FAB and content
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200, // Ensure it takes some space
  },
  errorText: {
    fontSize: 16,
    color: COLORS.RED, // Use defined color
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.DARK_GREEN,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  heroContainer: {
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#e0e0e0', // Placeholder color
  },
  groupInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: -50, // Overlap cover image
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1, // Allow text to take space before icon
  },
  editIconContainer: {
    padding: 8, // Make tappable area larger
  },
  headerIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  groupTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupType: {
    fontSize: 14,
    color: COLORS.DARK_GREEN,
    fontWeight: '500',
    marginLeft: 4,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.DARK_BLUE, // Different color for type badge
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  publicText: {
    marginLeft: 4,
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  groupDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Distribute space for 2-3 buttons
    alignItems: 'center',
  },
  joinButton: {
    backgroundColor: COLORS.DARK_GREEN,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // Take available space
    marginRight: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  leaveButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  leaveButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  iconButton: { // Style for smaller icon buttons like Favorite, Share
    padding: 8,
    // No background, just icon, or minimal border/background
    // Adjust margin as needed if they are too close or too far
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#e9e9e9',
    borderRadius: 8,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    color: '#555',
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.DARK_GREEN,
    fontWeight: 'bold',
  },
  tabContentContainer: {
    paddingHorizontal: 0, // Posts/Members containers can have their own padding if needed
  },
  postsContainer: {
    paddingHorizontal: 16, // Add padding here if not in tabContentContainer
  },
  membersContainer: {
    paddingHorizontal: 0, // MemberItem has its own padding
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
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
    backgroundColor: '#f0f0f0',
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#777',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200, // Adjust as needed
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#e0e0e0',
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20, // More spacing
  },
  postActionText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#555',
  },
  postActionTextActive: {
    color: COLORS.DARK_GREEN,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff', // Give items a background if overall container is colored
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    fontWeight: 'bold',
    fontSize: 15,
    color: '#333',
    marginRight: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.DARK_GREEN,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 3,
    fontWeight: 'bold',
  },
  memberBio: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 17,
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  fabStyle: { // Example style for ActionButton if isFab prop isn't enough
    backgroundColor: COLORS.DARK_GREEN,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
});

export default GroupDetailScreen;