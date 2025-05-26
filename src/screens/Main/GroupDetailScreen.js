import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, ScrollView, Dimensions, Alert, Platform, SafeAreaView } from 'react-native';
import ShareTray from '../../components/common/ShareTray';
import CommentTray from '../../components/common/CommentTray';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import PostCreationModal from '../../components/social/PostCreationModal';
import { useUser } from '../../context/UserContext';
import ActionButton from '../../components/common/ActionButton';

const TABS = ['Posts', 'Members'];
const windowWidth = Dimensions.get('window').width;

const GroupDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params || {};
  const { user } = useUser();
  
  // Use ref to track mounting and prevent duplicate API calls
  const isMounted = useRef(false);
  const initialFetchDone = useRef(false);
  
  // Group state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [group, setGroup] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI state
  const [selectedTab, setSelectedTab] = useState('Posts');
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [isGroupMember, setIsGroupMember] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Posts & Members state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(null);

  // Fetch group data - supports both regular groups and housing groups
  const fetchGroupData = useCallback(async () => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the group type from route params or default to 'group'
      const groupType = route.params?.groupType || 'group';
      
      // Determine which table to query based on group type
      let data, error;
      
      if (groupType === 'housing_group') {
        // Query housing_groups table for housing groups
        const result = await supabase
          .from('housing_groups')
          .select(`
            *,
            housing_group_members(count)
          `)
          .eq('id', groupId)
          .maybeSingle();
          
        data = result.data;
        error = result.error;
        
        // If data exists, transform it to match the expected structure
        if (data) {
          data.group_members = data.housing_group_members;
          data.type = 'housing_group';
        }
      } else {
        // Query regular groups table
        const result = await supabase
          .from('groups')
          .select(`
            *,
            group_members(count)
          `)
          .eq('id', groupId)
          .maybeSingle();
          
        data = result.data;
        error = result.error;
        data.type = 'group';
      }
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('Group not found');
      }
      
      // Only update state if component is still mounted
      if (isMounted.current && data) {
        setGroup(data);
        setMemberCount(data.group_members?.[0]?.count || 0);
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      if (isMounted.current) {
        setError('Failed to load group details');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [groupId]);

  // Fetch group posts
  const fetchGroupPosts = useCallback(async () => {
    if (!groupId) return;
    
    try {
      setPostsLoading(true);
      setPostsError(null);
      
      // Get the group type from route params or default to 'group'
      const groupType = route.params?.groupType || 'group';
      
      let data, error;
      
      // Fetch posts with author info based on group type
      if (groupType === 'housing_group') {
        // For housing groups, fetch from group_posts table with housing_group_id
        const result = await supabase
          .from('group_posts')
          .select(`
            *,
            author:user_profiles(id, username, full_name, avatar_url)
          `)
          .eq('housing_group_id', groupId)
          .order('created_at', { ascending: false });
          
        data = result.data;
        error = result.error;
      } else {
        // For regular groups, fetch from group_posts table with group_id
        const result = await supabase
          .from('group_posts')
          .select(`
            *,
            author:user_profiles(id, username, full_name, avatar_url)
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: false });
          
        data = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setPosts(data || []);
      }
      
      // If user is logged in, fetch their likes from group_post_likes table
      if (user && isMounted.current) {
        const { data: likesData, error: likesError } = await supabase
          .from('group_post_likes')
          .select('group_post_id')
          .eq('user_id', user.id)
          .in(
            'group_post_id', 
            (data || []).map(post => post.id)
          );
        
        if (!likesError && likesData && isMounted.current) {
          // Create a map of post_id -> true for liked posts
          const newLikedPosts = {};
          likesData.forEach(like => {
            newLikedPosts[like.group_post_id] = true;
          });
          setLikedPosts(newLikedPosts);
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (isMounted.current) {
        setPostsError('Failed to load posts');
      }
    } finally {
      if (isMounted.current) {
        setPostsLoading(false);
      }
    }
  }, [groupId, user]);

  // Fetch group members
  const fetchGroupMembers = useCallback(async () => {
    if (!groupId) return;
    
    try {
      setMembersLoading(true);
      setMembersError(null);
      
      // Get the group type from route params or default to 'group'
      const groupType = route.params?.groupType || 'group';
      
      let data, error;
      
      if (groupType === 'housing_group') {
        // For housing groups, fetch from housing_group_members table
        const result = await supabase
          .from('housing_group_members')
          .select(`
            *,
            user_profiles(id, username, full_name, avatar_url, bio)
          `)
          .eq('group_id', groupId);
          
        data = result.data;
        error = result.error;
      } else {
        // For regular groups, fetch from group_members table
        const result = await supabase
          .from('group_members')
          .select(`
            *,
            user_profiles(id, username, full_name, avatar_url, bio)
          `)
          .eq('group_id', groupId);
          
        data = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      
      // Only proceed if component is still mounted
      if (isMounted.current) {
        // Transform the data to a more usable format
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
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      if (isMounted.current) {
        setMembersError('Failed to load members');
      }
    } finally {
      if (isMounted.current) {
        setMembersLoading(false);
      }
    }
  }, [groupId]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchGroupData(),
      selectedTab === 'Posts' ? fetchGroupPosts() : fetchGroupMembers(),
    ]);
    setRefreshing(false);
  }, [fetchGroupData, fetchGroupPosts, fetchGroupMembers, selectedTab]);

  // Load initial data
  // Check if user is a member of this group
  const checkMembership = useCallback(async () => {
    if (!user || !groupId) return;
    
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking membership:', error);
        return;
      }
      
      // If data exists, user is a member
      setIsGroupMember(!!data);
    } catch (error) {
      console.error('Error checking group membership:', error);
    }
  }, [user, groupId]);
  
  // Check if group is in user's favorites
  const checkFavorite = useCallback(async () => {
    if (!user || !groupId) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('favorite_id')
        .eq('user_id', user.id)
        .eq('item_id', groupId)
        .eq('item_type', 'group')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite status:', error);
        return;
      }
      
      // If data exists, group is a favorite
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  }, [user, groupId]);
  
  // Toggle favorite status
  const toggleFavorite = useCallback(async () => {
    if (!user || !groupId) return;
    
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', groupId)
          .eq('item_type', 'group');
          
        if (error) throw error;
        
        setIsFavorite(false);
        Alert.alert('Success', 'Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            item_id: groupId,
            item_type: 'group',
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
        
        setIsFavorite(true);
        Alert.alert('Success', 'Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status. Please try again.');
    }
  }, [user, groupId, isFavorite]);
  
  useEffect(() => {
    // Mark component as mounted
    isMounted.current = true;
    
    // Only fetch data if it hasn't been fetched already
    if (!initialFetchDone.current && groupId) {
      fetchGroupData();
      fetchGroupPosts();
      fetchGroupMembers();
      checkMembership();
      checkFavorite();
      initialFetchDone.current = true;
    }
    
    // Cleanup function to mark component as unmounted
    return () => {
      isMounted.current = false;
    };
  }, [fetchGroupData, fetchGroupPosts, fetchGroupMembers, checkMembership, checkFavorite, groupId]);

  // Handle joining or leaving a group
  const joinGroup = useCallback(async (autoJoin = false) => {
    if (!user || !groupId) return;
    
    try {
      // Check if user is already a member
      const { data: existingMembership, error: checkError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      // If already a member and not an auto-join call, handle leave functionality
      if (existingMembership && !autoJoin) {
        // Show confirmation dialog
        Alert.alert(
          'Leave Group',
          'Are you sure you want to leave this group?',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: async () => {
                try {
                  // Delete the membership
                  const { error: leaveError } = await supabase
                    .from('group_members')
                    .delete()
                    .eq('id', existingMembership.id);
                    
                  if (leaveError) throw leaveError;
                  
                  // Update membership status
                  setIsGroupMember(false);
                  
                  // Show confirmation
                  Alert.alert('Success', 'You have left the group');
                  
                  // Refresh member count and list
                  fetchGroupData();
                  fetchGroupMembers();
                } catch (error) {
                  console.error('Error leaving group:', error);
                  Alert.alert('Error', 'Failed to leave group. Please try again.');
                }
              }
            }
          ]
        );
        return;
      }
      
      // If not a member and either auto-join is enabled or user manually requested to join
      if ((checkError && checkError.code === 'PGRST116') || !existingMembership) {
        // Join the group
        const { error: joinError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: user.id,
            role: 'member',
            created_at: new Date().toISOString()
          });
          
        if (joinError) throw joinError;
        
        // Update membership status
        setIsGroupMember(true);
        
        // Show confirmation if it was a manual join
        if (!autoJoin) {
          Alert.alert('Success', 'You have joined this group!');
        }
        
        // Refresh member count and list
        fetchGroupData();
        fetchGroupMembers();
      } else if (!autoJoin) {
        // If already a member, update the state just to be sure
        setIsGroupMember(true);
        Alert.alert('Info', 'You are already a member of this group');
      }
    } catch (error) {
      console.error('Error handling group membership:', error);
      if (!autoJoin) {
        Alert.alert('Error', 'Failed to process your request. Please try again.');
      }
    }
  }, [user, groupId, fetchGroupData, fetchGroupMembers]);
  
  // Check for auto-join when group data is loaded
  useEffect(() => {
    if (group && group.auto_join && user) {
      joinGroup(true); // true indicates this is an auto-join
    }
  }, [group, user, joinGroup]);
  
  // Handle tab changes
  useEffect(() => {
    if (selectedTab === 'Posts' && posts.length === 0 && !postsLoading) {
      fetchGroupPosts();
    } else if (selectedTab === 'Members' && members.length === 0 && !membersLoading) {
      fetchGroupMembers();
    }
  }, [selectedTab, fetchGroupPosts, fetchGroupMembers, posts.length, members.length, postsLoading, membersLoading]);

  // Post interactions
  const [likedPosts, setLikedPosts] = useState({});
  
  // Handle post creation
  const handlePostCreated = useCallback((newPost) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
  }, []);
  
  // Handle post like - now using group_post_likes table
  const handleLikePost = useCallback(async (postId) => {
    if (!user) return;
    
    // Toggle liked status in UI immediately for responsive feel
    setLikedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
    
    try {
      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('group_post_likes')
        .select('*')
        .eq('group_post_id', postId)
        .eq('user_id', user.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingLike) {
        // Unlike - delete the like
        const { error: deleteError } = await supabase
          .from('group_post_likes')
          .delete()
          .eq('id', existingLike.id);
          
        if (deleteError) throw deleteError;
      } else {
        // Like - insert new like
        const { error: insertError } = await supabase
          .from('group_post_likes')
          .insert({
            group_post_id: postId,
            user_id: user.id,
            created_at: new Date().toISOString()
          });
          
        if (insertError) throw insertError;
      }
      
      // Fetch updated post likes count
      fetchGroupPosts();
      
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert UI state on error
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !prev[postId]
      }));
      Alert.alert('Error', 'Failed to process like. Please try again.');
    }
  }, [user, fetchGroupPosts]);
  
  // Handle post comment
  const handleCommentPost = useCallback((post) => {
    setCommentItem(post);
    setCommentVisible(true);
  }, []);
  
  // Handle when a comment is added
  const handleCommentAdded = useCallback((newComment) => {
    // Refresh posts to show updated comment count
    fetchGroupPosts();
  }, [fetchGroupPosts]);
  
  // Share tray state
  const [shareVisible, setShareVisible] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [shareItemType, setShareItemType] = useState('post');
  
  // Comment tray state
  const [commentVisible, setCommentVisible] = useState(false);
  const [commentItem, setCommentItem] = useState(null);
  
  // Handle post share - now using ShareTray
  const handleSharePost = useCallback((post) => {
    setShareItem(post);
    setShareItemType('post');
    setShareVisible(true);
  }, []);
  
  // Handle group share
  const handleShareGroup = useCallback(() => {
    if (!group) return;
    
    setShareItem(group);
    setShareItemType('group');
    setShareVisible(true);
  }, [group]);

  // Render posts tab content
  const renderPostsTab = () => {
    if (postsLoading && !refreshing && posts.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.DARK_GREEN} />
        </View>
      );
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
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubText}>Be the first to post in this group!</Text>
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
              <TouchableOpacity 
                style={styles.postAction} 
                onPress={() => handleLikePost(item.id)}
              >
                <Ionicons 
                  name={likedPosts[item.id] ? "heart" : "heart-outline"} 
                  size={20} 
                  color={likedPosts[item.id] ? COLORS.DARK_GREEN : "#666"} 
                />
                <Text 
                  style={[styles.postActionText, likedPosts[item.id] && styles.postActionTextActive]}
                >
                  Like
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.postAction}
                onPress={() => handleCommentPost(item)}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#666" />
                <Text style={styles.postActionText}>Comment</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.postAction}
                onPress={() => handleSharePost(item)}
              >
                <Ionicons name="share-social-outline" size={20} color="#666" />
                <Text style={styles.postActionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render members tab content
  const renderMembersTab = () => {
    if (membersLoading && !refreshing && members.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.DARK_GREEN} />
        </View>
      );
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
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No members found</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.membersContainer}>
        {members.map(item => (
          <View key={item.id} style={styles.memberItem}>
            <Image
              source={{ uri: item.avatarUrl || 'https://via.placeholder.com/50' }}
              style={styles.memberAvatar}
            />
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
              {item.bio && (
                <Text style={styles.memberBio} numberOfLines={1}>{item.bio}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render tab content based on selected tab
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Posts':
        return renderPostsTab();
      case 'Members':
        return renderMembersTab();
      default:
        return null;
    }
  };

  // Render loading state
  if (loading && !refreshing && !group) {
    return (
      <View style={styles.container}>
        <AppHeader 
          title="Group"
          navigation={navigation}
          canGoBack={true}
        />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.DARK_GREEN} />
        </View>
      </View>
    );
  }

  // Render error state
  if (error && !refreshing) {
    return (
      <View style={styles.container}>
        <AppHeader 
          title="Group"
          navigation={navigation}
          canGoBack={true}
        />
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchGroupData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Single scrollable layout approach
  return (
    <View style={styles.container}>
      <AppHeader 
        title={group?.name || 'Group'}
        navigation={navigation}
        canGoBack={true}
      />
      
      {/* Floating Action Button for Post Creation - only shown for group members */}
      {selectedTab === 'Posts' && isGroupMember && (
        <View style={styles.fabContainer}>
          <ActionButton
            onPress={() => setShowCreatePostModal(true)}
            iconName="add"
            color={COLORS.DARK_GREEN}
            size={56}
          />
        </View>
      )}  
      
      {/* Main ScrollView for the entire content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.DARK_GREEN]}
            tintColor={COLORS.DARK_GREEN}
          />
        }
      >
        {/* Group Header/Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: group?.imageurl || 'https://picsum.photos/800/500' }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.groupInfoCard}>
            <Text style={styles.groupName}>{group?.name || 'Group Name'}</Text>
            <View style={styles.groupTypeContainer}>
              <Ionicons name="pricetag-outline" size={14} color={COLORS.DARK_GREEN} />
              <Text style={styles.groupType}>{group?.type || 'General'}</Text>
              
              {group?.is_public && (
                <View style={styles.publicBadge}>
                  <Ionicons name="earth" size={14} color="#fff" />
                  <Text style={styles.publicText}>Public</Text>
                </View>
              )}
            </View>
            <Text style={styles.groupDescription}>{group?.description || 'No description provided'}</Text>
            <View style={styles.groupMetaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{memberCount} Members</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.metaText}>
                  Created {new Date(group?.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={isGroupMember ? styles.leaveButton : styles.joinButton}
                onPress={() => joinGroup(false)} // false indicates manual join
              >
                <Text style={isGroupMember ? styles.leaveButtonText : styles.joinButtonText}>
                  {isGroupMember ? 'Leave Group' : 'Join Group'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleShareGroup}
              >
                <Ionicons name="share-social-outline" size={18} color={COLORS.DARK_GREEN} />
                <Text style={styles.secondaryButtonText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={toggleFavorite}
              >
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={18} 
                  color={isFavorite ? '#e74c3c' : COLORS.DARK_GREEN} 
                />
                <Text style={styles.secondaryButtonText}>
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </Text>
              </TouchableOpacity>
            </View>
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
        
        {/* Tab content */}
        <View style={styles.tabContentContainer}>
          {renderTabContent()}
        </View>
      </ScrollView>
      
      {/* Post Creation Modal */}
      <PostCreationModal
        visible={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={handlePostCreated}
        groupId={groupId}
      />
      
      {/* Share Tray */}
      <ShareTray
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        item={shareItem}
        itemType={shareItemType}
        additionalOptions={[
          // Add any additional options specific to your app
          // Example: { id: 'favorite', icon: 'star', label: 'Save', action: handleSave, iconType: 'ionicons' }
        ]}
      />
      
      {/* Comment Tray */}
      <CommentTray
        visible={commentVisible}
        onClose={() => setCommentVisible(false)}
        item={commentItem}
        itemType="post"
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollViewContent: {
    paddingBottom: 30, // Add padding at the bottom for better UX
  },
  tabContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  postsContainer: {
    paddingTop: 10,
  },
  membersContainer: {
    paddingTop: 10,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.DARK_GREEN,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  // Hero Section
  heroContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 180,
  },
  groupInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: -40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
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
    backgroundColor: COLORS.DARK_GREEN,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  publicText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
    lineHeight: 20,
  },
  groupMetaRow: {
    flexDirection: 'row',
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
    marginLeft: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  joinButton: {
    backgroundColor: COLORS.DARK_GREEN,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  leaveButton: {
    backgroundColor: '#e0e0e0', // Gray color
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leaveButtonText: {
    color: '#000', // Black text
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.DARK_GREEN,
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: COLORS.DARK_GREEN,
    marginLeft: 4,
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
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
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.DARK_GREEN,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Posts Tab
  postsList: {
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    fontWeight: 'bold',
    fontSize: 14,
  },
  postTime: {
    fontSize: 12,
    color: '#666',
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
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
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  postActionText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  postActionTextActive: {
    color: COLORS.DARK_GREEN,
    fontWeight: '500',
  },
  // Members Tab
  membersList: {
    paddingBottom: 20,
    paddingHorizontal: 16, // Add consistent horizontal padding
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16, // Add consistent padding on both sides
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginHorizontal: -16, // Offset the container padding to allow border to extend fully
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
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
    fontSize: 14,
    marginRight: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.DARK_GREEN,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
  },
  memberBio: {
    fontSize: 13,
    color: '#666',
  },
  // Empty States
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
});

export default GroupDetailScreen;
