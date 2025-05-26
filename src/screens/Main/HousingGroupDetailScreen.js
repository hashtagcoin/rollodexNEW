import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Share, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getUserProfile } from '../../utils/authUtils';

const HousingGroupDetailScreen = ({ route }) => {
  const { groupId } = route.params || {};
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [groupDetails, setGroupDetails] = useState(null);
  const [housingListing, setHousingListing] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCurrentUserMember, setIsCurrentUserMember] = useState(false);
  const [isJoinRequestPending, setIsJoinRequestPending] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = await getUserProfile();
      setCurrentUser(user);
    };

    fetchUserProfile();
  }, []);

  // Check if group is favorited
  useEffect(() => {
    if (!groupId || !currentUser) return;
    
    const checkIfFavorited = async () => {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('favorite_id')
          .eq('user_id', currentUser.id)
          .eq('item_id', groupId)
          .eq('item_type', 'housing_group')
          .limit(1);
          
        if (data && data.length > 0) {
          setIsFavorited(true);
          setFavoriteId(data[0].favorite_id);
        } else {
          setIsFavorited(false);
          setFavoriteId(null);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error.message);
      }
    };
    
    checkIfFavorited();
  }, [groupId, currentUser]);

  useEffect(() => {
    if (!groupId) return;
    
    const fetchGroupDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch group details
        const { data: group, error: groupError } = await supabase
          .from('housing_groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError) throw groupError;
        setGroupDetails(group);
        
        // Fetch housing listing details
        if (group.listing_id) {
          const { data: listing, error: listingError } = await supabase
            .from('housing_listings')
            .select('*')
            .eq('id', group.listing_id)
            .single();
            
          if (listingError) throw listingError;
          setHousingListing(listing);
        }
        
        // Fetch group members
        const { data: memberData, error: membersError } = await supabase
          .from('housing_group_members')
          .select('*')
          .eq('group_id', groupId)
          .eq('status', 'approved');
          
        if (membersError) throw membersError;
        
        // For each member, fetch their user profile
        const membersWithProfiles = await Promise.all(
          memberData.map(async (member) => {
            try {
              // Changed to use .limit(1) instead of .single() to avoid errors
              const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('id, full_name, avatar_url, bio')
                .eq('id', member.user_id)
                .limit(1);
                
              if (profileError) {
                console.error('Error fetching profile:', profileError.message);
                return {
                  ...member,
                  user_profiles: null
                };
              }
              
              // Use the first profile if available, or null if no profiles found
              const profile = profiles && profiles.length > 0 ? profiles[0] : null;
              
              return {
                ...member,
                user_profiles: profile
              };
            } catch (error) {
              console.error('Error in profile fetch:', error.message);
              return {
                ...member,
                user_profiles: null
              };
            }
          })
        );
        
        setMembers(membersWithProfiles);
        
        // Check if current user is a member
        if (currentUser) {
          const isMember = memberData.some(member => member.user_id === currentUser.id);
          setIsCurrentUserMember(isMember);
          
          // Check if user has a pending join request
          const { data: pendingRequests, error: pendingError } = await supabase
            .from('housing_group_members')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', currentUser.id)
            .eq('status', 'pending')
            .limit(1);
            
          setIsJoinRequestPending(pendingRequests && pendingRequests.length > 0);
        }
      } catch (error) {
        console.error('Error fetching group details:', error.message);
        Alert.alert('Error', 'Could not load group details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroupDetails();
  }, [groupId, currentUser]);

  const handleJoinRequest = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please sign in to join this group');
      return;
    }
    
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('housing_group_members')
        .insert({
          group_id: groupId,
          user_id: currentUser.id,
          status: 'pending',
          bio: currentUser.bio || '',
          support_level: 'moderate', // Default value
          is_admin: false
        });
        
      if (error) throw error;
      
      setIsJoinRequestPending(true);
      Alert.alert('Success', 'Your request to join this group has been sent!');
    } catch (error) {
      console.error('Error sending join request:', error.message);
      Alert.alert('Error', 'Could not send join request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleCancelJoinRequest = async () => {
    if (!currentUser) return;
    
    setActionLoading(true);
    try {
      // Delete the pending join request
      const { error } = await supabase
        .from('housing_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)
        .eq('status', 'pending');
        
      if (error) throw error;
      
      setIsJoinRequestPending(false);
      Alert.alert('Success', 'Your join request has been cancelled');
    } catch (error) {
      console.error('Error cancelling join request:', error.message);
      Alert.alert('Error', 'Could not cancel your request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const toggleFavorite = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please sign in to favorite this group');
      return;
    }
    
    setActionLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('favorite_id', favoriteId);
          
        if (error) throw error;
        
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        // Add to favorites
        const { data, error } = await supabase
          .from('favorites')
          .insert({
            user_id: currentUser.id,
            item_id: groupId,
            item_type: 'housing_group'
          })
          .select('favorite_id')
          .single();
          
        if (error) throw error;
        
        setIsFavorited(true);
        setFavoriteId(data.favorite_id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error.message);
      Alert.alert('Error', 'Could not update favorites. Please try again.');
    } finally {
      setActionLoading(false);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading group details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Housing Group" showBackButton={true} navigation={navigation} />
      <ScrollView style={styles.scrollContainer}>
        {/* Action buttons (Share and Favorite) */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleShare}
            disabled={actionLoading}
          >
            <Ionicons name="share-social-outline" size={24} color={COLORS.black} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={toggleFavorite}
            disabled={actionLoading}
          >
            <Ionicons 
              name={isFavorited ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorited ? "#FF4B4B" : COLORS.black} 
            />
            <Text style={styles.actionButtonText}>{isFavorited ? 'Favorited' : 'Favorite'}</Text>
          </TouchableOpacity>
        </View>
        {/* Housing Listing Card */}
        {housingListing && (
          <View style={styles.housingCard}>
            <TouchableOpacity 
              style={styles.housingImageContainer}
              onPress={() => navigation.navigate('HousingDetail', { item: housingListing })}
            >
              {housingListing.media_urls?.[0] ? (
                <Image 
                  source={{ uri: housingListing.media_urls[0] }} 
                  style={styles.housingImage} 
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
        
        {/* Group Details */}
        {groupDetails && (
          <View style={styles.groupDetailsContainer}>
            <Text style={styles.groupName}>{groupDetails.name}</Text>
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
        
        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Looking for {groupDetails?.max_members - groupDetails?.current_members} more {(groupDetails?.max_members - groupDetails?.current_members) === 1 ? 'person' : 'people'}</Text>
          <Text style={styles.moveInBy}>Hoping to move in by {groupDetails?.move_in_date ? new Date(groupDetails.move_in_date).toLocaleDateString() : 'flexible date'}</Text>
          
          {/* Member Cards */}
          {members.map(member => renderMemberItem(member))}
        </View>
        
        {/* Join Request Button */}
        {!isCurrentUserMember && !isJoinRequestPending && (
          <TouchableOpacity style={styles.joinButton} onPress={handleJoinRequest}>
            <Text style={styles.joinButtonText}>Request to Join Group</Text>
          </TouchableOpacity>
        )}
        
        {isJoinRequestPending && (
          <View style={styles.pendingContainer}>
            <Text style={styles.pendingText}>Your join request is pending approval</Text>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancelJoinRequest}
              disabled={actionLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel Join Request</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.bottomSpace} />
      </ScrollView>
      {/* BottomNavBar removed as requested */}
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
  scrollContainer: {
    flex: 1,
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
    fontSize: 14,
    color: COLORS.darkGray,
    marginRight: 8,
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
    padding: 16,
    margin: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '500',
    marginBottom: 12,
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
