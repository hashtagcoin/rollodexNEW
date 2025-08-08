import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Share, Platform  } from 'react-native';
import { Alert } from '../../utils/alert';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { getUserProfile } from '../../utils/authUtils';
import ApplicationsList from '../../components/HousingGroup/ApplicationsList';
import { applyToHousingGroup, getUserApplicationStatus, cancelApplication } from '../../services/housingGroupApplicationService';

const HousingGroupDetailScreen = ({ route }) => {
  const { groupId, fromJoinButton } = route.params || {};
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Scroll to top when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }, [])
  );
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HousingGroupDetailScreen focused - refreshing data and favorite status');
      setRefreshKey(prevKey => prevKey + 1);
    });
    return unsubscribe;
  }, [navigation]);
  
  // Progressive loading states for different sections
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(true);
  const [loadingHousingListing, setLoadingHousingListing] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  
  // Data states
  const [groupDetails, setGroupDetails] = useState(null);
  const [housingListing, setHousingListing] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCurrentUserMember, setIsCurrentUserMember] = useState(false);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [isJoinRequestPending, setIsJoinRequestPending] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loadingApplicationStatus, setLoadingApplicationStatus] = useState(false);
  
  // Error states
  const [groupDetailsError, setGroupDetailsError] = useState(null);
  const [housingListingError, setHousingListingError] = useState(null);
  const [membersError, setMembersError] = useState(null);
  const [applicationError, setApplicationError] = useState(null);

  // Define fetch functions outside useEffect so they can be referenced elsewhere
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error.message);
    }
  };
  
  // Check if the group is in favorites
  const checkFavoriteStatus = async () => {
    try {
      if (!currentUser || !groupId) return;
      
      const { data, error } = await supabase
        .from('favorites')
        .select('favorite_id')
        .eq('user_id', currentUser.id)
        .eq('item_id', groupId)
        .eq('item_type', 'housing_group');
        
      if (error) throw error;
      
      setIsFavorited(data && data.length > 0);
      if (data && data.length > 0) {
        setFavoriteId(data[0].favorite_id);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error.message);
    }
  };
  
  // Define fetch functions for group details, housing listing, and members
  const fetchGroupDetails = async () => {
    // Reset error states
    setGroupDetailsError(null);
    setLoadingGroupDetails(true);
    
    try {
      // Fetch group details
      const { data: group, error: groupError } = await supabase
        .from('housing_groups')
        .select('*')
        .eq('id', groupId);
        
      if (groupError) {
        setGroupDetailsError('Could not load group details');
        console.error('Error fetching group details:', groupError.message);
        return;
      }
      
      // Check if group was found
      if (!group || group.length === 0) {
        setGroupDetailsError('Group not found');
        Alert.alert('Error', 'Group not found');
        navigation.goBack();
        return;
      }
      
      setGroupDetails(group[0]);
      return group[0]; // Return the group details for chaining
    } catch (error) {
      console.error('Error fetching group details:', error.message);
      setGroupDetailsError('Could not load group details');
    } finally {
      setLoadingGroupDetails(false);
    }
  };
  
  const fetchHousingListing = async (listingId) => {
    if (!listingId) {
      setLoadingHousingListing(false);
      return;
    }
    
    setHousingListingError(null);
    setLoadingHousingListing(true);
    
    try {
      const { data: listing, error: listingError } = await supabase
        .from('housing_listings')
        .select('*')
        .eq('id', listingId)
        .limit(1);
        
      if (listingError) {
        console.error('Error fetching listing:', listingError.message);
        setHousingListingError('Could not load housing listing');
        return;
      }
      
      if (listing && listing.length > 0) {
        setHousingListing(listing[0]);
      } else {
        console.warn('No listing found for group with listing ID:', listingId);
        setHousingListingError('Housing listing not found');
      }
    } catch (error) {
      console.error('Error fetching housing listing:', error.message);
      setHousingListingError('Could not load housing listing');
    } finally {
      setLoadingHousingListing(false);
    }
  };
  
  const fetchMembers = async () => {
    setMembersError(null);
    setLoadingMembers(true);
    
    try {
      // Fetch group members
      const { data: memberData, error: membersError } = await supabase
        .from('housing_group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'approved');
        
      if (membersError) {
        console.error('Error fetching members:', membersError.message);
        setMembersError('Could not load group members');
        return;
      }
      
      // Fetch all relevant user profiles in one go to reduce API calls
      if (memberData.length > 0) {
        const userIds = memberData.map(member => member.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url, bio, age')
          .in('id', userIds);
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError.message);
          // Continue with members but without profiles
        }
        
        // Match profiles to members
        const membersWithProfiles = memberData.map(member => {
          const profile = profiles?.find(p => p.id === member.user_id) || null;
          return {
            ...member,
            user_profiles: profile
          };
        });
        
        setMembers(membersWithProfiles);
        
        // Check if current user is a member and if they're an admin
        if (currentUser) {
          const userMembership = memberData.find(member => member.member_id === currentUser.id);
          const isMember = !!userMembership;
          setIsCurrentUserMember(isMember);
          
          // Set admin status if the user is a member
          if (isMember && userMembership) {
            setIsCurrentUserAdmin(userMembership.is_admin === true);
          } else {
            setIsCurrentUserAdmin(false);
          }
        }
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching members:', error.message);
      setMembersError('Could not load group members');
    } finally {
      setLoadingMembers(false);
    }
  };
  
  const checkApplicationStatus = async () => {
    if (!currentUser || !groupId) return;
    
    setLoadingApplicationStatus(true);
    setApplicationError(null);
    
    try {
      const applicationData = await getUserApplicationStatus(groupId, currentUser.id);
      
      setApplicationStatus(applicationData);
      setIsJoinRequestPending(applicationData && applicationData.status === 'pending');
    } catch (error) {
      console.error('Error checking application status:', error);
      setApplicationError('Could not check application status');
    } finally {
      setLoadingApplicationStatus(false);
    }
  };
  
  // Legacy function - keeping for backward compatibility
  const checkJoinRequestStatus = async () => {
    if (!currentUser) return;
    
    try {
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('housing_group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)
        .eq('status', 'pending')
        .limit(1);
        
      if (pendingError) {
        console.error('Error checking join request:', pendingError.message);
        return;
      }
      
      // Check if there's a pending request in the old system
      const oldSystemPending = pendingRequests && pendingRequests.length > 0;
      
      // Only set pending from old system if we don't have application status from new system
      if (!applicationStatus) {
        setIsJoinRequestPending(oldSystemPending);
      }
    } catch (error) {
      console.error('Error checking join request:', error.message);
    }
  };
  
  // Use effects to fetch data
  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  useEffect(() => {
    if (currentUser) {
      checkFavoriteStatus();
    }
  }, [currentUser, groupId]);

  // Initialize data loading when component mounts or groupId changes
  useEffect(() => {
    if (!groupId) return;
    
    // Start loading all data
    const initializeData = async () => {
      try {
        // Fetch group details first
        const groupData = await fetchGroupDetails();
        
        // After group details are loaded, fetch housing listing if available
        if (groupData?.listing_id) {
          fetchHousingListing(groupData.listing_id);
        } else {
          setLoadingHousingListing(false);
        }
        
        // These can be fetched in parallel
        fetchMembers();
        if (currentUser) {
          // Check application status with our new system
          checkApplicationStatus();
          // Also check legacy system for backward compatibility
          checkJoinRequestStatus();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };
    
    initializeData();
    
  }, [groupId, currentUser]);
  
  // Auto-join the group if coming from join button
  useEffect(() => {
    if (fromJoinButton && currentUser && groupId && !isJoinRequestPending && !isCurrentUserMember) {
      // Only execute if we know the user is not already a member and doesn't have a pending request
      handleJoinRequest();
    }
  }, [fromJoinButton, currentUser, groupId, isJoinRequestPending, isCurrentUserMember]);

  const handleJoinRequest = async () => {
    if (!currentUser || !groupDetails) {
      Alert.alert('Error', 'Please try again later');
      return;
    }
    
    setActionLoading(true);
    
    try {
      // Create a join request using our new application system
      const result = await applyToHousingGroup(groupId, currentUser.id);
        
      if (result.isExisting) {
        Alert.alert('Application Exists', 'You have already applied to this housing group.');
      } else if (result.isUpdate) {
        Alert.alert('Application Updated', 'Your previous application has been updated to pending status.');
      } else {
        Alert.alert('Success', 'Your application has been submitted! You\'ll be notified when it\'s reviewed.');
      }
      
      // Refresh application status
      await checkApplicationStatus();
    } catch (error) {
      console.error('Error sending application:', error);
      Alert.alert('Error', 'Failed to submit application. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleCancelJoinRequest = async () => {
    if (!currentUser) return;
    
    setActionLoading(true);
    try {
      // Cancel the application using our new system
      const result = await cancelApplication(groupId, currentUser.id);
      
      if (result.success) {
        // Also check for legacy join requests and delete them if they exist
        const { error } = await supabase
          .from('housing_group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', currentUser.id)
          .eq('status', 'pending');
          
        if (error) console.error('Error deleting legacy join request:', error.message);
        
        // Update UI state
        setIsJoinRequestPending(false);
        setApplicationStatus(null);
        Alert.alert('Success', 'Your application has been withdrawn');
      } else {
        console.log('No pending application found to cancel:', result.message);
        // Check if we need to clean up legacy requests
        await checkJoinRequestStatus();
      }

      // Refresh application status
      await checkApplicationStatus();
    } catch (error) {
      console.error('Error cancelling application:', error);
      Alert.alert('Error', 'Could not cancel your application. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleToggleFavorite = async () => {
    try {
      const userId = currentUser?.id;
      if (!userId) {
        Alert.alert('Authentication Required', 'Please log in to favorite this group.');
        return;
      }

      if (isFavorited) {
        // Remove from favorites (use correct table)
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', groupId)
          .eq('item_type', 'housing_group');
        if (deleteError) {
          console.error('Error removing favorite:', deleteError);
          throw deleteError;
        }
        setIsFavorited(false);
      } else {
        // Check if the favorite already exists
        const { data: existingFavorite, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('item_id', groupId)
          .eq('item_type', 'housing_group')
          .single();

        if (existingFavorite) {
          // If it exists (but somehow UI shows not favorited), just update the state
          console.log('Favorite already exists, updating UI state');
          setIsFavorited(true);
          return;
        }

        // Add to favorites using upsert (correct table and schema)
        const { error: insertError } = await supabase
          .from('favorites')
          .upsert({
            user_id: userId,
            item_id: groupId,
            item_type: 'housing_group',
            created_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,item_id,item_type',
            ignoreDuplicates: true
          });
        if (insertError) {
          console.error('Error favoriting housing group:', insertError);
          throw insertError;
        }
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      Alert.alert('Error', 'Failed to update favorite status. Please try again.');
    }
  };
  
  const handleShare = async () => {
    if (!groupDetails) return;
    
    try {
      const message = `Check out this housing group: ${groupDetails.name}\n\nDescription: ${groupDetails.description}\n\nLooking for ${groupDetails.max_members - groupDetails.current_members} more people to join!`;
      
      await Share.share({
        message,
        title: `Housing Group: ${groupDetails.name}`
      });
    } catch (error) {
      console.error('Error sharing housing group:', error.message);
    }
  };
  
  const renderMemberItem = (member) => {
    const profile = member.user_profiles;
    
    return (
      <View key={member.id} style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={[styles.avatar, !profile?.avatar_url && styles.defaultAvatar]}>
            {profile?.avatar_url ? (
              <Image 
                source={{ uri: profile.avatar_url }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={styles.avatarInitial}>
                {(profile?.full_name?.charAt(0) || '?').toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{profile?.full_name || 'Anonymous'}</Text>
            <View style={styles.ageGenderContainer}>
              {profile?.age && (
                <View style={styles.ageBadge}>
                  <FontAwesome name="birthday-cake" size={10} color="#00838F" style={{marginRight: 4}} />
                  <Text style={styles.ageText}>{profile.age}</Text>
                </View>
              )}
              {member.age_range && <Text style={styles.ageGender}>{member.age_range}</Text>}
              {member.gender && <Text style={styles.ageGender}>{member.gender}</Text>}
              <View style={[styles.supportBadge, 
                member.support_level === 'high' ? styles.highSupport : 
                member.support_level === 'moderate' ? styles.moderateSupport : 
                styles.lightSupport
              ]}>
                <Text style={styles.supportText}>{member.support_level?.charAt(0).toUpperCase() + member.support_level?.slice(1)} Support</Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.memberBio}>{member.bio || 'No bio provided'}</Text>
      </View>
    );
  };

  // Render skeleton placeholders for group details
  const renderGroupDetailsSkeleton = () => (
    <View style={styles.groupDetailsContainer}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonText} />
      <View style={[styles.skeletonText, { width: '60%' }]} />
      
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <View style={[styles.skeletonText, { width: '40%' }]} />
          <View style={[styles.skeletonText, { width: '30%' }]} />
        </View>
        <View style={styles.detailItem}>
          <View style={[styles.skeletonText, { width: '40%' }]} />
          <View style={[styles.skeletonText, { width: '50%' }]} />
        </View>
      </View>
    </View>
  );
  
  // Render skeleton placeholders for housing listing
  const renderHousingListingSkeleton = () => (
    <View style={styles.housingCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.housingInfo}>
        <View style={[styles.skeletonText, { width: '70%' }]} />
        <View style={[styles.skeletonText, { width: '90%' }]} />
        <View style={[styles.skeletonText, { width: '60%' }]} />
      </View>
    </View>
  );
  
  // Render skeleton placeholders for members
  const renderMembersSkeleton = () => (
    <View style={styles.membersSection}>
      <View style={[styles.skeletonText, { width: '80%', height: 24 }]} />
      <View style={[styles.skeletonText, { width: '60%' }]} />
      
      {[1, 2].map(i => (
        <View key={`skeleton-member-${i}`} style={styles.memberCard}>
          <View style={styles.memberHeader}>
            <View style={[styles.avatar, styles.skeletonAvatar]} />
            <View style={styles.memberInfo}>
              <View style={[styles.skeletonText, { width: '60%' }]} />
              <View style={styles.ageGenderContainer}>
                <View style={[styles.skeletonText, { width: '20%', marginRight: 8 }]} />
                <View style={[styles.skeletonText, { width: '20%', marginRight: 8 }]} />
                <View style={[styles.skeletonBadge]} />
              </View>
            </View>
          </View>
          <View style={[styles.skeletonText]} />
          <View style={[styles.skeletonText, { width: '90%' }]} />
          <View style={[styles.skeletonText, { width: '70%' }]} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Housing Group" showBackButton={true} navigation={navigation} />
      <FlatList
        ref={scrollViewRef}
        data={[{ key: 'content' }]}
        renderItem={() => (
          <>


            {/* Group Details Section */}
            {loadingGroupDetails ? (
              // Skeleton loader for group details
              renderGroupDetailsSkeleton()
            ) : groupDetailsError ? (
              // Error state for group details
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={24} color="#FF4B4B" />
                <Text style={styles.errorText}>{groupDetailsError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => fetchGroupDetails()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : groupDetails && (
              // Group details content
              <View style={styles.groupDetailsContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.groupName}>{groupDetails.name}</Text>
                  <View style={styles.titleActions}>
                    <TouchableOpacity 
                      style={styles.titleActionButton} 
                      onPress={handleToggleFavorite}
                      disabled={actionLoading}
                    >
                      <Ionicons 
                        name={isFavorited ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isFavorited ? "#FF4B4B" : COLORS.black} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.titleActionButton} 
                      onPress={handleShare}
                      disabled={actionLoading}
                    >
                      <Ionicons name="share-social-outline" size={24} color={COLORS.black} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.description}>{groupDetails.description}</Text>
                
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Members</Text>
                    <Text style={styles.detailValue}>{groupDetails.current_members}/{groupDetails.max_members}</Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Move-in Date</Text>
                    <Text style={styles.detailValue}>
                      {groupDetails.move_in_date ? new Date(groupDetails.move_in_date).toLocaleDateString() : 'Flexible'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Housing Listing Section */}
            {loadingHousingListing ? (
              // Skeleton loader for housing listing
              renderHousingListingSkeleton()
            ) : housingListingError ? (
              // Error state for housing listing
              <View style={styles.errorCard}>
                <Text style={styles.errorCardText}>{housingListingError}</Text>
              </View>
            ) : housingListing && (
              // Housing listing content
              <View style={styles.housingCard}>
                <TouchableOpacity 
                  style={styles.housingImageContainer}
                  onPress={() => navigation.navigate('HousingDetail', { item: housingListing })}
                >
                  {housingListing.media_urls?.[0] ? (
                    <Image 
                      source={{ uri: housingListing.media_urls[0] }} 
                      style={styles.housingImage} 
                      // Add fade-in animation
                      onLoadStart={() => {}}
                      onLoadEnd={() => {}}
                      // Add fallback for image loading errors
                      onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
                    />
                  ) : (
                    <View style={styles.defaultHousingImage}>
                      <Text style={styles.defaultImageText}>No Image Available</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.housingInfo}>
                  <Text style={styles.housingTitle}>{housingListing.title}</Text>
                  <Text style={styles.housingAddress}>{housingListing.address}</Text>
                  <Text style={styles.housingPrice}>${housingListing.weekly_rent}/wk | Available from {new Date(housingListing.available_from).toLocaleDateString()}</Text>
                </View>
              </View>
            )}
            
            {/* Members Section */}
            {loadingMembers ? (
              // Skeleton loader for members
              renderMembersSkeleton()
            ) : membersError ? (
              // Error state for members
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={24} color="#FF4B4B" />
                <Text style={styles.errorText}>{membersError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => fetchMembers()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : members.length > 0 && groupDetails ? (
              // Members content
              <View style={styles.membersSection}>
                <Text style={styles.sectionTitle}>
                  Looking for {groupDetails.max_members - groupDetails.current_members} more 
                  {(groupDetails.max_members - groupDetails.current_members) === 1 ? ' person' : ' people'}
                </Text>
                <Text style={styles.moveInBy}>
                  Hoping to move in by {groupDetails.move_in_date ? new Date(groupDetails.move_in_date).toLocaleDateString() : 'flexible date'}
                </Text>
                
                {/* Member Cards */}
                {members.map(member => renderMemberItem(member))}
              </View>
            ) : (
              // No members state
              <View style={styles.noMembersContainer}>
                <Text style={styles.noMembersText}>No members in this group yet</Text>
                <Text style={styles.noMembersSubtext}>Be the first to join!</Text>
              </View>
            )}
            
            {/* Applications Section */}
            {currentUser && (
              <ApplicationsList
                housingGroupId={groupId}
                currentUserId={currentUser.id}
                isAdmin={isCurrentUserAdmin}
                isMember={isCurrentUserMember}
              />
            )}
            
            {/* Apply to Join Button */}
            {!isCurrentUserMember && !isJoinRequestPending && groupDetails && (
              <TouchableOpacity style={styles.joinButton} onPress={handleJoinRequest} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.joinButtonText}>Apply to Join Group</Text>
                )}
              </TouchableOpacity>
            )}
            
            {isJoinRequestPending && (
              <View style={styles.pendingContainer}>
                <Text style={styles.pendingText}>Your application is pending approval</Text>
                {applicationStatus && applicationStatus.applicant_message && (
                  <Text style={styles.applicationMessage}>Your message: "{applicationStatus.applicant_message}"</Text>
                )}
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleCancelJoinRequest}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FF4B4B" />
                  ) : (
                    <Text style={styles.cancelButtonText}>Withdraw Application</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.bottomSpace} />
          </>
        )}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{
          ...styles.scrollContainer,
          paddingBottom: 100 // Add bottom padding to ensure scrolling to the end
        }}
        key={refreshKey}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  // Skeleton styles
  skeletonTitle: {
    height: 24,
    width: '70%',
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonText: {
    height: 16,
    width: '100%',
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#EEEEEE',
  },
  skeletonAvatar: {
    backgroundColor: '#EEEEEE',
  },
  skeletonBadge: {
    width: 80,
    height: 20,
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
  },
  // Error styles
  errorContainer: {
    padding: 16,
    margin: 16,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF4B4B',
    textAlign: 'center',
    marginVertical: 8,
  },
  retryButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  errorCard: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
  },
  errorCardText: {
    color: '#FF4B4B',
    textAlign: 'center',
  },
  // No members state
  noMembersContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  noMembersText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  noMembersSubtext: {
    fontSize: 14,
    color: COLORS.gray,
  },
  scrollContainer: {
    // Removed flex: 1 to allow FlatList content to scroll naturally
  },
  housingCard: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  housingImageContainer: {
    width: '100%',
    height: 150,
  },
  housingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultHousingImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultImageText: {
    color: COLORS.darkGray,
    fontSize: 16,
  },
  housingInfo: {
    padding: 12,
  },
  housingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  housingAddress: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  housingPrice: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  // Title row with action buttons
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  groupDetailsContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 16,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.black,
  },
  membersSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  moveInBy: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 16,
  },
  memberCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    overflow: 'hidden',
  },
  defaultAvatar: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: COLORS.black,
  },
  ageGenderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  ageGender: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginRight: 8,
  },
  ageBadge: {
    backgroundColor: '#E0F7FA',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00838F',
  },
  supportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  highSupport: {
    backgroundColor: '#FFEEEE',
  },
  moderateSupport: {
    backgroundColor: '#FFF5E6',
  },
  lightSupport: {
    backgroundColor: '#E6F7FF',
  },
  supportText: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberBio: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
    marginTop: 8,
  },
  joinButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  applicationMessage: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  cancelButton: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FF4B4B',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  bottomSpace: {
    height: 80,
  },
});

export default HousingGroupDetailScreen;
