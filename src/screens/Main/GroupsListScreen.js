import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, ActivityIndicator, ScrollView  } from 'react-native';
import { Alert } from '../../utils/alert';

import ActionButton from '../../components/common/ActionButton';
import { Feather, Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/layout/AppHeader';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import { getValidImageUrl, getOptimizedImageUrl } from '../../utils/imageHelper';

// Performance tracking for diagnostics
const performanceTracker = {
  componentId: `GLS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  mountTime: null,
  renders: 0,
  fetchTimes: {},
  filterChanges: {},
  focusEvents: 0
};

const debugTiming = (action, details = {}) => {
  const timestamp = Date.now();
  const elapsed = performanceTracker.mountTime ? timestamp - performanceTracker.mountTime : 0;
  console.log(`[GROUPS-TIMING][${performanceTracker.componentId}][${elapsed}ms] ${action}`, {
    timestamp,
    elapsed,
    ...details
  });
};

// Debug logger – stripped in production
const debug = (...args) => {
  if (__DEV__) console.log(...args);
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'groups', label: 'Groups' },
  { key: 'housing_groups', label: 'Housing Groups' },
  { key: 'social', label: 'Social' },
  { key: 'interest', label: 'Interest' },
];

const GroupsListScreen = () => {
  debug('[GroupsListScreen] --- Component Mounting/Rendering ---');
  const navigation = useNavigation();
  const [filter, setFilter] = useState('all');
  const [groupsData, setGroupsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState({});
  const [userGroupRoles, setUserGroupRoles] = useState({}); // Stores { groupId: role }
  
  // Performance optimization refs
  const fetchInProgressRef = useRef(false);
  const cacheRef = useRef({}); // Cache by filter type
  const membershipCacheRef = useRef({}); // Cache membership status
  const rolesCacheRef = useRef({}); // Cache user roles
  const fetchCounterRef = useRef(0);
  const isMounted = useRef(true);

  // Add cache timeout (5 minutes like other screens)
  const CACHE_TIMEOUT = 5 * 60 * 1000;
  const globalCacheRef = useRef({
    groups: null,
    timestamp: null
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef(null);
  
  // Track component lifecycle
  useEffect(() => {
    performanceTracker.mountTime = Date.now();
    debugTiming('COMPONENT_MOUNTED', {
      componentId: performanceTracker.componentId
    });
    
    return () => {
      isMounted.current = false;
      debugTiming('COMPONENT_UNMOUNTING', {
        totalFocusEvents: performanceTracker.focusEvents,
        totalRenders: performanceTracker.renders,
        totalFilterChanges: Object.keys(performanceTracker.filterChanges).length
      });
    };
  }, []);
  
  // Track renders
  performanceTracker.renders++;
  debugTiming('RENDER', {
    renderCount: performanceTracker.renders,
    filter,
    groupCount: groupsData.length,
    loading,
    hasCachedData: !!cacheRef.current[filter]
  });
  
  // Get current user's ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      console.log('[GroupsListScreen] fetchCurrentUser: Attempting to get user...');
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('[GroupsListScreen] fetchCurrentUser: Auth error while getting user:', authError.message);
          setUserId(null); // Ensure userId is null on error
          return;
        }

        if (user) {
          console.log('[GroupsListScreen] fetchCurrentUser: User found, ID:', user.id);
          setUserId(user.id);
        } else {
          console.log('[GroupsListScreen] fetchCurrentUser: No user object returned (user is null/undefined). Session might be invalid or expired.');
          setUserId(null); // Ensure userId is null
        }
      } catch (e) {
        console.error('[GroupsListScreen] fetchCurrentUser: Exception caught while trying to get user:', e.message);
        setUserId(null); // Ensure userId is null on exception
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Fetch user's roles in different groups
  const fetchUserGroupRoles = useCallback(async () => {
    if (!userId) {
      setUserGroupRoles({}); // Clear roles if no user
      return;
    }
    
    // Check cache first
    if (rolesCacheRef.current[userId]) {
      debugTiming('ROLES_FROM_CACHE', { userId });
      setUserGroupRoles(rolesCacheRef.current[userId]);
      return;
    }
    
    console.log('[GroupsListScreen] fetchUserGroupRoles: Fetching roles for user:', userId);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', userId);

      if (error) {
        console.error('[GroupsListScreen] fetchUserGroupRoles: Error fetching group roles:', error.message);
        setUserGroupRoles({});
        return;
      }

      const rolesMap = {};
      if (data) {
        data.forEach(membership => {
          rolesMap[membership.group_id] = membership.role;
        });
      }
      console.log('[GroupsListScreen] fetchUserGroupRoles: Roles map:', rolesMap);
      
      // Cache the roles
      rolesCacheRef.current[userId] = rolesMap;
      setUserGroupRoles(rolesMap);
    } catch (e) {
      console.error('[GroupsListScreen] fetchUserGroupRoles: Exception fetching group roles:', e.message);
      setUserGroupRoles({});
    }
  }, [userId]);

  // Effect to fetch group roles when userId changes
  useEffect(() => {
    fetchUserGroupRoles();
  }, [userId, fetchUserGroupRoles]);
  


  const fetchGroups = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgressRef.current && !forceRefresh) {
      debugTiming('FETCH_PREVENTED_DUPLICATE', {
        filter,
        forceRefresh
      });
      return;
    }
    
    const fetchStart = Date.now();
    const fetchId = ++fetchCounterRef.current;
    
    if (!isMounted.current) return;
    
    fetchInProgressRef.current = true;
    
    debugTiming('FETCH_GROUPS_START', {
      filter,
      forceRefresh,
      fetchId,
      hasCachedData: !!cacheRef.current[filter]
    });
    
    try {
      // Only show loading if no cache
      if (!cacheRef.current[filter]) {
        setLoading(true);
      }
      setError(null);
      
      // First fetch regular groups
      const { data: regularGroups, error: regularGroupsError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          avatar_url, 
          imageurl,  
          category, 
          is_public,
          group_members ( count )
        `);

      if (regularGroupsError) throw regularGroupsError;

      // Then fetch housing groups with their linked listing data
      const { data: housingGroups, error: housingGroupsError } = await supabase
        .from('housing_groups')
        .select(`
          id,
          name,
          description,
          avatar_url,
          current_members,
          max_members,
          created_at,
          listing_id,
          housing_listings:listing_id (
            id,
            media_urls
          )
        `);

      if (housingGroupsError) throw housingGroupsError;

      // Format regular groups
      const formattedRegularGroups = regularGroups.map(group => ({
        ...group,
        members: group.group_members && group.group_members.length > 0 ? group.group_members[0].count : 0,
        type: group.category,
        image: group.imageurl || group.avatar_url, 
        desc: group.description,
        is_housing_group: false
      }));
      
      // Format housing groups
      const formattedHousingGroups = housingGroups.map(group => {
        // Get the listing images if available
        let imageUrl = null;
        
        // Try to get the first image from the linked housing listing
        if (group.housing_listings && group.housing_listings.media_urls && group.housing_listings.media_urls.length > 0) {
          const listingImage = group.housing_listings.media_urls[0];
          if (listingImage.startsWith('http')) {
            imageUrl = listingImage;
          } else {
            // Format the listing image URL - these are typically stored in the housingimages bucket
            const cleanFilename = listingImage.startsWith('/') ? listingImage.substring(1) : listingImage;
            imageUrl = `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/${cleanFilename}`;
          }
        }
        
        // Fallback 1: If no listing image, use group avatar
        if (!imageUrl && group.avatar_url) {
          if (group.avatar_url.startsWith('http')) {
            imageUrl = group.avatar_url;
          } else {
            const cleanFilename = group.avatar_url.startsWith('/') ? group.avatar_url.substring(1) : group.avatar_url;
            imageUrl = `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housinggroupavatar/${cleanFilename}`;
          }
        }
        
        // Fallback 2: If no images at all, use default
        if (!imageUrl) {
          imageUrl = 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housing/exterior/alejandra-cifre-gonzalez-ylyn5r4vxcA-unsplash.jpg';
        }
        
        // Housing group image URL debug
        
        return {
          ...group,
          members: group.current_members || 0,
          max_members: group.max_members,
          type: 'housing',
          image: imageUrl,
          desc: group.description,
          is_public: true,
          is_housing_group: true
        };
      });
      
      // Combine both group types
      const allGroups = [...formattedRegularGroups, ...formattedHousingGroups];
      
      const fetchTime = Date.now() - fetchStart;
      performanceTracker.fetchTimes[`${filter}-${fetchId}`] = fetchTime;
      
      debugTiming('FETCH_GROUPS_COMPLETE', {
        groupCount: allGroups.length,
        regularGroupCount: formattedRegularGroups.length,
        housingGroupCount: formattedHousingGroups.length,
        fetchTimeMs: fetchTime,
        fetchId,
        isStale: fetchId !== fetchCounterRef.current
      });
      
      if (!isMounted.current) return;
      
      // Ignore if a newer fetch started
      if (fetchId !== fetchCounterRef.current) {
        debugTiming('STALE_FETCH_IGNORED', { fetchId, currentFetchId: fetchCounterRef.current });
        return;
      }
      
      // Cache all groups data before filtering
      cacheRef.current['all'] = allGroups;
      
      // Apply filter and set data
      const filteredData = getFilteredGroups(allGroups, filter);
      setGroupsData(filteredData);
      
      // Cache filtered data
      cacheRef.current[filter] = filteredData;
      
      debugTiming('CACHE_UPDATED', {
        filter,
        cachedGroupCount: filteredData.length
      });
      
      // Fetch membership status for housing groups if user is logged in
      if (userId) {
        fetchUserMembershipStatus(housingGroups.map(g => g.id));
      }
    } catch (e) {
      console.error('[GroupsListScreen] Error fetching groups:', e);
      debugTiming('FETCH_ERROR', {
        error: e.message
      });
      setError(e.message || 'Failed to fetch groups.');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  }, [filter, userId, fetchUserMembershipStatus]);
  
  // Helper function to filter groups based on selected filter
  const getFilteredGroups = (allGroups, filterType) => {
    switch (filterType) {
      case 'all':
        return allGroups;
      case 'groups':
        return allGroups.filter(g => !g.is_housing_group);
      case 'housing_groups':
        return allGroups.filter(g => g.is_housing_group);
      case 'social':
        return allGroups.filter(g => !g.is_housing_group && g.type === 'social');
      case 'interest':
        return allGroups.filter(g => !g.is_housing_group && g.type === 'interest');
      default:
        return allGroups;
    }
  };
  
  // Fetch user's membership status for housing groups
  const fetchUserMembershipStatus = useCallback(async (housingGroupIds) => {
    if (!userId || housingGroupIds.length === 0) return;
    
    // Check cache first
    const cacheKey = `${userId}-housing`;
    if (membershipCacheRef.current[cacheKey]) {
      debugTiming('MEMBERSHIP_FROM_CACHE', { userId });
      setMembershipStatus(membershipCacheRef.current[cacheKey]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('housing_group_members')
        .select('group_id, status')
        .eq('user_id', userId)
        .in('group_id', housingGroupIds);
        
      if (error) throw error;
      
      // Convert to object with group_id as key
      const statusMap = {};
      data.forEach(membership => {
        statusMap[membership.group_id] = membership.status;
      });
      
      // Cache the membership status
      membershipCacheRef.current[cacheKey] = statusMap;
      setMembershipStatus(statusMap);
      
      debugTiming('MEMBERSHIP_FETCHED', {
        membershipCount: Object.keys(statusMap).length
      });
    } catch (e) {
      console.error('[GroupsListScreen] Error fetching membership status:', e);
    }
  }, [userId]);

  // Handle filter changes
  useEffect(() => {
    const filterChangeStart = Date.now();
    debugTiming('FILTER_CHANGE_START', {
      newFilter: filter,
      hasCachedData: !!cacheRef.current[filter]
    });
    
    performanceTracker.filterChanges[filter] = (performanceTracker.filterChanges[filter] || 0) + 1;
    
    // If we have all groups cached, just filter them
    if (cacheRef.current['all']) {
      const filteredData = getFilteredGroups(cacheRef.current['all'], filter);
      
      // Check if we have cached data for this specific filter
      if (cacheRef.current[filter]) {
        setGroupsData(cacheRef.current[filter]);
        setLoading(false);
        debugTiming('CACHED_FILTER_APPLIED', {
          filter,
          groupCount: cacheRef.current[filter].length,
          timeMs: Date.now() - filterChangeStart
        });
      } else {
        // Apply filter to all cached groups
        setGroupsData(filteredData);
        cacheRef.current[filter] = filteredData;
        setLoading(false);
        debugTiming('FILTER_APPLIED_FROM_ALL_CACHE', {
          filter,
          groupCount: filteredData.length,
          timeMs: Date.now() - filterChangeStart
        });
      }
    } else {
      // No cache, need to fetch
      debugTiming('NO_CACHE_FETCHING_FOR_FILTER', { filter });
      fetchGroups();
    }
  }, [filter, fetchGroups]);

  useFocusEffect(
    React.useCallback(() => {
      performanceTracker.focusEvents++;
      debugTiming('SCREEN_FOCUSED', {
        focusCount: performanceTracker.focusEvents,
        hasCachedData: !!cacheRef.current[filter]
      });
      
      // Only fetch if we don't have cached data
      if (!cacheRef.current[filter] && !cacheRef.current['all']) {
        debugTiming('NO_CACHE_ON_FOCUS_FETCHING');
        fetchGroups();
      } else {
        debugTiming('USING_CACHED_DATA_ON_FOCUS', {
          filter,
          cachedGroupCount: cacheRef.current[filter]?.length || 0
        });
        
        // Optional: Background refresh after delay to get fresh data
        const timer = setTimeout(() => {
          if (isMounted.current) {
            fetchGroups(true); // Force refresh in background
          }
        }, 2000);
        
        return () => {
          clearTimeout(timer);
          debugTiming('SCREEN_UNFOCUSED');
        };
      }
    }, [filter, fetchGroups])
  );

  const GroupCard = React.memo(({ item, navigation, userId, userRole }) => {
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    
    // Check if this group is already favorited when component mounts
    useEffect(() => {
      const checkIfFavorited = async () => {
        if (!userId) return;
        
        try {
          const { data, error } = await supabase
            .from('favorites')
            .select('favorite_id')
            .eq('user_id', userId)
            .eq('item_id', item.id)
            .eq('item_type', 'group')
            .maybeSingle(); // Use maybeSingle to avoid PGRST116 error
          
          if (error) {
            // Error checking favorite status
            return;
          }
          
          setIsFavorited(!!data);
        } catch (error) {
          // Error in favorite check
        }
      };
      
      checkIfFavorited();
    }, [userId, item.id]); // Now correctly depends on the userId prop

    const toggleFavorite = useCallback(async (e) => {
      e.stopPropagation(); // Prevent card navigation when clicking favorite
      // Toggling favorite for group
      
      // Use the userId from state for consistency
      if (!userId) {
        // No user ID available, cannot toggle favorite
        Alert.alert('Error', 'Please sign in to favorite groups');
        return;
      }
      
      setFavoriteLoading(true);
      try {
        if (isFavorited) {
          // Removing from favorites...
          // Remove from favorites
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('item_id', item.id)
            .eq('item_type', 'group');
          
          if (error) {
            // Error removing favorite
            throw error;
          }
          
          // Successfully removed from favorites
          setIsFavorited(false);
        } else {
          // Adding to favorites...
          // Add to favorites
          const favoriteData = {
            user_id: userId,
            item_id: item.id,
            item_type: 'group',
            created_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('favorites')
            .insert(favoriteData)
            .select();
          
          if (error) {
            // Error adding favorite
            throw error;
          }
          
          // Successfully added to favorites
          setIsFavorited(true);
        }
      } catch (error) {
        // Error in favorite check
      } finally {
        // It's good practice to handle loading state in a finally for checkIfFavorited too, if it had one.
        // For now, this is primarily for toggleFavorite's loading state.
        setFavoriteLoading(false); // Ensure loading is set to false in finally
      }
    }, [isFavorited, item.id, userId]); // Correctly close useCallback and add dependencies

    const getMembershipButtonInfo = () => {
      if (!item.is_housing_group) {
        if (userRole === 'admin') {
          return {
            text: 'Admin',
            buttonStyle: styles.adminBtn, // New style
            textStyle: styles.adminBtnText, // New style
            disabled: false // Admin should be able to navigate
          };
        } else if (userRole === 'member') {
          return {
            text: 'Member',
            buttonStyle: styles.memberBtn, // New style
            textStyle: styles.memberBtnText, // New style
            disabled: false // Member should be able to navigate (or true if just an indicator)
          };
        }
        // Default for non-member, non-housing group
        return {
          text: 'Join',
          buttonStyle: styles.joinBtn,
          textStyle: styles.joinBtnText,
          disabled: false
        };
      }
      
      const status = membershipStatus[item.id];
      
      if (status === 'approved') {
        return {
          text: 'Approved',
          buttonStyle: styles.approvedBtn,
          textStyle: styles.approvedBtnText,
          disabled: true
        };
      } else if (status === 'pending') {
        return {
          text: 'Pending',
          buttonStyle: styles.pendingBtn,
          textStyle: styles.pendingBtnText,
          disabled: true
        };
      } else if (status === 'declined') {
        return {
          text: 'Declined',
          buttonStyle: styles.declinedBtn,
          textStyle: styles.declinedBtnText,
          disabled: true
        };
      } else {
        return {
          text: 'Join Group',
          buttonStyle: styles.joinBtn,
          textStyle: styles.joinBtnText,
          disabled: false
        };
      }
    };
    
    const handleJoinGroup = () => {
      if (item.is_housing_group) {
        // Navigate to the housing group detail screen for housing groups
        navigation.navigate('HousingGroupDetailScreen', { groupId: item.id });
      } else {
        // For regular groups, navigate to GroupDetailScreen with joinFlow parameters
        navigation.navigate('GroupDetail', {
          groupId: item.id,
          joinFlow: true, // Indicate that the user is coming from the 'Join' button
          groupName: item.name, // Pass group name for the popup message
          userRole: userRole // Pass user's role
        });
      }
    };
    
    const { text: membershipButtonText, buttonStyle, textStyle, disabled } = getMembershipButtonInfo();

    // Optimised thumbnail URL
    const thumbUrl = useMemo(() => getOptimizedImageUrl(item.image, 400, 70), [item.image]);

    return (
      <TouchableOpacity 
        onPress={() => {
          if (item.is_housing_group) {
            navigation.navigate('HousingGroupDetailScreen', { groupId: item.id });
          } else {
            navigation.navigate('GroupDetail', { groupId: item.id, userRole: userRole });
          }
        }} 
        style={styles.card}
      >
        <Image 
          source={{ uri: thumbUrl || 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housing/exterior/alejandra-cifre-gonzalez-ylyn5r4vxcA-unsplash.jpg' }} 
          style={styles.cardImage}
          onError={(e) => {/* Image load error handling */}}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            {userRole === 'admin' && !item.is_housing_group && (
              <View style={styles.adminBadgeContainer}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
            <TouchableOpacity onPress={(e) => toggleFavorite(e)} style={styles.favoriteIconContainer} disabled={favoriteLoading}>
              {favoriteLoading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons 
                  name={isFavorited ? 'heart' : 'heart-outline'} 
                  size={24} 
                  color={isFavorited ? COLORS.RED : '#888'} 
                />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Feather name="users" size={14} color="#888" />
              <Text style={styles.membersText}>
                {item.is_housing_group && item.max_members 
                  ? `${item.members}/${item.max_members} members` 
                  : `${item.members} members`
                }
              </Text>
              {item.is_housing_group && <View style={styles.housingBadge}><Text style={styles.housingBadgeText}>Housing</Text></View>}
              {!item.is_housing_group && item.is_public && <View style={styles.publicBadge}><Text style={styles.publicBadgeText}>Public</Text></View>}
            </View>
            <TouchableOpacity 
              style={buttonStyle} 
              onPress={handleJoinGroup}
              disabled={disabled}
            >
              <Text style={textStyle}>{membershipButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  const renderGroupCard = useCallback(({ item }) => {
    const userRole = userGroupRoles[item.id]; // Get role for this specific group
    return <GroupCard item={item} navigation={navigation} userId={userId} userRole={userRole} />;
  }, [navigation, userId, userGroupRoles]);

  // Prefetch thumbnails to smooth scrolling
  useEffect(() => {
    if (!groupsData || groupsData.length === 0) return;
    const urls = groupsData.slice(0, 12).map(g => getOptimizedImageUrl(g.image, 400, 70)).filter(Boolean);
    urls.forEach(u => Image.prefetch(u));
  }, [groupsData]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading groups...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchGroups} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Animated.View style={[styles.floatingActionButton, {
        opacity: fadeAnim
      }]}>
      </Animated.View>
      <AppHeader title="Groups" navigation={navigation} canGoBack={true} />
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filterItem) => (
            <TouchableOpacity
              key={filterItem.key}
              style={[styles.filterBtn, filter === filterItem.key && styles.filterBtnActive]}
              onPress={() => setFilter(filterItem.key)}
            >
              <Text style={[styles.filterBtnText, filter === filterItem.key && styles.filterBtnTextActive]}>{filterItem.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <Animated.FlatList
        data={groupsData}
        keyExtractor={(item) => item.id}
        renderItem={renderGroupCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={11}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (event) => {
              setIsScrolling(true);
              // Fade out quickly to 30%
              Animated.timing(fadeAnim, {
                toValue: 0.3,
                duration: 120,
                useNativeDriver: false,
              }).start();
              if (scrollEndTimer.current) {
                clearTimeout(scrollEndTimer.current);
              }
              scrollEndTimer.current = setTimeout(() => {
                setIsScrolling(false);
                // Fade back in gradually to 100%
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: false,
                }).start();
              }, 180);
            }
          }
        )}
        scrollEventThrottle={16}
      />
      {/* Floating Create Group FAB */}
      <ActionButton
        onPress={() => navigation.navigate('CreateSocialGroup')}
        iconName="add"
        color="#007AFF"
        size={56}
        style={styles.fab}
        accessibilityLabel="Create Group"
        opacity={fadeAnim}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 100,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 20, 
    right: 16, 
    zIndex: 1000, 
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#f1f1f1',
  },
  approvedBtn: {
    backgroundColor: '#e6f7e6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  approvedBtnText: {
    color: '#28a745',
    fontWeight: '500',
    fontSize: 13,
  },
  pendingBtn: {
    backgroundColor: '#fff3cd',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  pendingBtnText: {
    color: '#ffc107',
    fontWeight: '500',
    fontSize: 13,
  },
  declinedBtn: {
    backgroundColor: '#f8d7da',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  declinedBtnText: {
    color: '#dc3545',
    fontWeight: '500',
    fontSize: 13,
  },
  housingBadge: {
    backgroundColor: '#e7f9f7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  housingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  adminBadgeContainer: {
    backgroundColor: COLORS.PRIMARY, // Or a distinct admin color
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  adminBtn: {
    backgroundColor: COLORS.PRIMARY, // Example admin button style
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  adminBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberBtn: {
    backgroundColor: COLORS.LIGHT_GREY, // Example member button style
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  memberBtnText: {
    color: COLORS.DARK_GREY,
    fontSize: 12,
    fontWeight: '500',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f2f4fa',
    marginRight: 6,
  },
  filterBtnActive: {
    backgroundColor: '#007AFF',
  },
  filterBtnText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 14,
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  actionButtonCustom: {
    marginLeft: 'auto',
    marginRight: 10,
  },
  listContainer: {
    padding: 14,
  },
  card: { 
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8, 
    marginVertical: 6,
    marginHorizontal: 8, 
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, 
    shadowRadius: 3,
    elevation: 2, 
  },
  cardImage: { 
    width: 70, 
    height: 70,
    borderRadius: 35, 
    marginRight: 12,
    backgroundColor: '#e0e0e0', 
  },
  cardContent: {
    flex: 1, 
    justifyContent: 'center',
  },
  cardHeader: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17, 
    fontWeight: '600', 
    color: '#222',
    flex: 1, 
  },
  favoriteIconContainer: { 
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 5,
    marginLeft: 5,
  },
  cardDesc: {
    fontSize: 13,
    color: '#777',
    marginBottom: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  membersText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
    marginRight: 8, 
  },
  joinBtn: {
    backgroundColor: '#EFEFF4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  joinBtnText: {
    color: '#007AFF',
    fontWeight: '500',
    fontSize: 13,
  },
  publicBadge: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  publicBadgeText: {
    color: '#007AFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  centeredContainer: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: { 
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: { 
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: { 
    color: '#fff',
    fontSize: 16,
  },
});

export default GroupsListScreen;
