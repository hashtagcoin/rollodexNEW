import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Share,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, FONTS } from '../../constants/theme';
import { format } from 'date-fns';
import { getValidImageUrl } from '../../utils/imageHelper';

const { width } = Dimensions.get('window');

const HousingGroupDetailScreen = ({ route }) => {
  const { groupId } = route.params;
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [housingGroup, setHousingGroup] = useState(null);
  const [housingListing, setHousingListing] = useState(null);
  const [members, setMembers] = useState([]);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);

  // Fetch the current user ID on mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  // Fetch housing group and related data
  useEffect(() => {
    const fetchHousingGroupData = async () => {
      if (!groupId) return;
      
      try {
        setLoading(true);
        
        // Fetch housing group details
        const { data: groupData, error: groupError } = await supabase
          .from('housing_groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError) throw groupError;
        setHousingGroup(groupData);
        
        // Fetch housing listing if available
        if (groupData.listing_id) {
          const { data: listingData, error: listingError } = await supabase
            .from('housing_listings')
            .select('*')
            .eq('id', groupData.listing_id)
            .single();
            
          if (!listingError) {
            setHousingListing(listingData);
          }
        }
        
        // Fetch group members
        const { data: membersData, error: membersError } = await supabase
          .from('housing_group_members')
          .select(`
            id,
            status,
            join_date,
            user_id,
            user_profiles:user_id (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('group_id', groupId)
          .order('join_date', { ascending: false });
          
        if (!membersError) {
          setMembers(membersData);
        }
        
        // Check if current user is a member
        if (userId) {
          const { data: membershipData, error: membershipError } = await supabase
            .from('housing_group_members')
            .select('status')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();
            
          if (!membershipError && membershipData) {
            setMembershipStatus(membershipData.status);
          }
          
          // Check if this group is favorited
          const { data: favoriteData, error: favoriteError } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('item_id', groupId)
            .eq('item_type', 'housing_group')
            .single();
            
          setIsFavorited(!!favoriteData);
        }
      } catch (error) {
        console.error('Error fetching housing group data:', error);
        Alert.alert('Error', 'Unable to load housing group details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHousingGroupData();
  }, [groupId, userId]);

  // Handle joining or leaving the group
  const handleMembershipAction = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to join this housing group');
      return;
    }
    
    try {
      if (membershipStatus === 'approved') {
        // Leave the group
        const { error } = await supabase
          .from('housing_group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', userId);
          
        if (error) throw error;
        setMembershipStatus(null);
        
        // Update the members count in the housing_groups table
        if (housingGroup) {
          await supabase
            .from('housing_groups')
            .update({ current_members: Math.max(0, (housingGroup.current_members || 1) - 1) })
            .eq('id', groupId);
        }
      } else if (!membershipStatus) {
        // Join the group
        const { error } = await supabase
          .from('housing_group_members')
          .insert({
            group_id: groupId,
            user_id: userId,
            status: 'pending',
            join_date: new Date().toISOString()
          });
          
        if (error) throw error;
        setMembershipStatus('pending');
      }
    } catch (error) {
      console.error('Error handling membership action:', error);
      Alert.alert('Error', 'Unable to process your request');
    }
  };

  // Handle toggling favorite status
  const handleToggleFavorite = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to favorite this housing group');
      return;
    }
    
    try {
      if (isFavorited) {
        // Remove from favorites
        const { error: deleteError } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', groupId)
          .eq('item_type', 'housing_group');
          
        if (deleteError) throw deleteError;
        setIsFavorited(false);
      } else {
        // Check if the favorite already exists
        const { data: existingFavorite } = await supabase
          .from('user_favorites')
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
        
        // Add to favorites using upsert to avoid constraint violations
        const { error: insertError } = await supabase
          .from('user_favorites')
          .upsert({
            user_id: userId,
            item_id: groupId,
            item_type: 'housing_group',
            created_at: new Date().toISOString()
          }, { onConflict: 'user_id,item_id,item_type' });
          
        if (insertError) throw insertError;
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error favoriting housing group:', error);
      Alert.alert('Error', 'Unable to update favorites');
    }
  };

  // Handle sharing the housing group
  const handleShare = async () => {
    try {
      const groupName = housingGroup?.name || 'Housing Group';
      const message = `Check out this housing group: ${groupName}`;
      
      await Share.share({
        message,
        title: groupName,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Format the move-in date
  const formatMoveInDate = (dateString) => {
    if (!dateString) return 'Flexible';
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  // Get membership button text and style
  const getMembershipButtonInfo = () => {
    if (membershipStatus === 'approved') {
      return {
        text: 'Leave Group',
        buttonStyle: styles.leaveButton,
        textStyle: styles.leaveButtonText,
        disabled: false
      };
    } else if (membershipStatus === 'pending') {
      return {
        text: 'Membership Pending',
        buttonStyle: styles.pendingButton,
        textStyle: styles.pendingButtonText,
        disabled: true
      };
    } else {
      return {
        text: 'Join Group',
        buttonStyle: styles.joinButton,
        textStyle: styles.joinButtonText,
        disabled: false
      };
    }
  };
  
  // Get image source
  const getImageSource = () => {
    // First try to get image from housing listing
    if (housingListing?.media_urls && housingListing.media_urls.length > 0) {
      return { uri: getValidImageUrl(housingListing.media_urls[0], 'housingimages') };
    }
    
    // Otherwise use group avatar
    if (housingGroup?.avatar_url) {
      return { uri: getValidImageUrl(housingGroup.avatar_url, 'housinggroupavatar') };
    }
    
    // Fallback
    return { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.png' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!housingGroup) {
    return (
      <View style={styles.container}>
        <AppHeader 
          title="Housing Group" 
          navigation={navigation} 
          canGoBack={true} 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Housing group not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { text: membershipButtonText, buttonStyle: membershipButtonStyle, textStyle: membershipTextStyle, disabled: membershipButtonDisabled } = getMembershipButtonInfo();

  return (
    <View style={styles.container}>
      <AppHeader 
        title={housingGroup.name} 
        navigation={navigation} 
        canGoBack={true} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image */}
        <View style={styles.coverImageContainer}>
          <Image 
            source={getImageSource()} 
            style={styles.coverImage}
            resizeMode="cover"
          />
          
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleToggleFavorite}
            >
              <Ionicons 
                name={isFavorited ? "heart" : "heart-outline"} 
                size={24} 
                color={isFavorited ? COLORS.error : COLORS.white} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Group Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.groupName}>{housingGroup.name}</Text>
          
          {housingListing && (
            <Text style={styles.location}>
              {housingListing.suburb || ''}{housingListing.suburb && housingListing.state ? ', ' : ''}{housingListing.state || ''}
            </Text>
          )}
          
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="people" size={20} color={COLORS.darkGray} />
              <Text style={styles.detailText}>
                {housingGroup.current_members || 0}/{housingGroup.max_members || 'Unlimited'} Members
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={20} color={COLORS.darkGray} />
              <Text style={styles.detailText}>
                Move In: {formatMoveInDate(housingGroup.move_in_date)}
              </Text>
            </View>
          </View>
          
          {housingGroup.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>About This Group</Text>
              <Text style={styles.descriptionText}>{housingGroup.description}</Text>
            </View>
          )}
          
          {/* Housing details if available */}
          {housingListing && (
            <View style={styles.housingDetailsContainer}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              
              <View style={styles.housingDetailsRow}>
                {housingListing.bedrooms && (
                  <View style={styles.housingDetailItem}>
                    <FontAwesome name="bed" size={18} color={COLORS.darkGray} />
                    <Text style={styles.housingDetailText}>{housingListing.bedrooms} Beds</Text>
                  </View>
                )}
                
                {housingListing.bathrooms && (
                  <View style={styles.housingDetailItem}>
                    <FontAwesome name="bath" size={18} color={COLORS.darkGray} />
                    <Text style={styles.housingDetailText}>{housingListing.bathrooms} Baths</Text>
                  </View>
                )}
                
                {housingListing.weekly_rent && (
                  <View style={styles.housingDetailItem}>
                    <MaterialIcons name="attach-money" size={18} color={COLORS.darkGray} />
                    <Text style={styles.housingDetailText}>${housingListing.weekly_rent}/wk</Text>
                  </View>
                )}
              </View>
              
              {/* NDIS/SDA badges */}
              {(housingListing.ndis_supported || housingListing.is_sda_certified) && (
                <View style={styles.badgesContainer}>
                  {housingListing.ndis_supported && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>NDIS Supported</Text>
                    </View>
                  )}
                  
                  {housingListing.is_sda_certified && (
                    <View style={[styles.badge, styles.sdaBadge]}>
                      <Text style={styles.badgeText}>SDA Certified</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          
          {/* Members list */}
          <View style={styles.membersContainer}>
            <Text style={styles.sectionTitle}>Members</Text>
            
            {members.length > 0 ? (
              <View style={styles.membersList}>
                {members.filter(member => member.status === 'approved').map((member, index) => (
                  <View key={member.id} style={styles.memberItem}>
                    <Image 
                      source={{ uri: member.user_profiles?.avatar_url || 'https://via.placeholder.com/40' }} 
                      style={styles.memberAvatar}
                    />
                    <Text style={styles.memberName}>{member.user_profiles?.username || 'User'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noMembersText}>No members yet</Text>
            )}
          </View>
          
          {/* Join/Leave button */}
          <TouchableOpacity
            style={[styles.membershipButton, membershipButtonStyle]}
            onPress={handleMembershipAction}
            disabled={membershipButtonDisabled}
          >
            <Text style={[styles.membershipButtonText, membershipTextStyle]}>
              {membershipButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  coverImageContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  actionButtonsContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  infoContainer: {
    padding: 16,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  location: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginLeft: 6,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
  housingDetailsContainer: {
    marginBottom: 20,
  },
  housingDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  housingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  housingDetailText: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginLeft: 6,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  sdaBadge: {
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  membersContainer: {
    marginBottom: 20,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  memberItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 12,
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  noMembersText: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  membershipButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  membershipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: COLORS.primary,
  },
  joinButtonText: {
    color: '#FFFFFF',
  },
  leaveButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  leaveButtonText: {
    color: COLORS.darkGray,
  },
  pendingButton: {
    backgroundColor: '#FFF9C4',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  pendingButtonText: {
    color: '#F57F17',
  },
});

export default HousingGroupDetailScreen;
