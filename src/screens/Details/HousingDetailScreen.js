import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Linking, 
  ActivityIndicator,
  Dimensions,
  FlatList,
  Animated,
  Share
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Feather, MaterialIcons, Ionicons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import { CardStyles, ConsistentHeightTitle } from '../../constants/CardStyles';
import ShareTrayModal from '../../components/common/ShareTrayModal';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 300;

const HousingDetailScreen = ({ route }) => {
  const { item } = route.params || {};
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [loading, setLoading] = useState(false);
  const [housingData, setHousingData] = useState(item);
  const [housingGroups, setHousingGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('Details');
  const [saved, setSaved] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for forcing re-fetch
  
  // Add a focus listener to refresh data when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HousingDetailScreen focused - refreshing groups and favorite status');
      setRefreshKey(prevKey => prevKey + 1); // Increment refresh key to trigger re-fetch
    });
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, [navigation]);
  
  // Fetch housing groups related to this listing with member profiles
  useEffect(() => {
    const checkIfSaved = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('item_id', housingData.id)
          .eq('item_type', 'housing_listing')
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking favorites:', error);
          return;
        }
        
        setSaved(!!data); // Convert to boolean
      } catch (error) {
        console.error('Error checking if listing is saved:', error);
      }
    };
    
    const fetchHousingGroups = async () => {
      setLoading(true);
      try {
        // Get current user for checking membership
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;
        
        // First get the housing groups for this listing
        const { data: groupsData, error: groupsError } = await supabase
          .from('housing_groups')
          .select(`
            id, name, max_members, current_members, move_in_date, description, avatar_url,
            gender_preference, support_needs,
            housing_group_members(id, user_id, status)
          `)
          .eq('listing_id', housingData.id)
          .eq('is_active', true);
        
        if (groupsError) throw groupsError;
        
        // If we have groups, fetch the member profiles for avatars
        if (groupsData && groupsData.length > 0) {
          const enhancedGroups = await Promise.all(groupsData.map(async (group) => {
            // Extract user_ids from group members
            const memberIds = group.housing_group_members
              .filter(member => member.status === 'approved')
              .map(member => member.user_id);
            
            // Check if current user is a member of this group
            const isUserMember = currentUserId && group.housing_group_members
              .some(member => member.user_id === currentUserId && member.status === 'approved');
            
            if (memberIds.length > 0) {
              // Fetch user profiles for these members
              const { data: profilesData, error: profilesError } = await supabase
                .from('user_profiles')
                .select('id, username, full_name, avatar_url')
                .in('id', memberIds);
              
              if (profilesError) throw profilesError;
              
              // Map member user_ids to their profiles
              const memberProfiles = {};
              profilesData.forEach(profile => {
                memberProfiles[profile.id] = profile;
              });
              
              // Enhance group members with profile data
              const enhancedMembers = group.housing_group_members.map(member => ({
                ...member,
                profile: memberProfiles[member.user_id] || {
                  username: 'Anonymous',
                  avatar_url: null
                }
              }));
              
              return {
                ...group,
                housing_group_members: enhancedMembers,
                isUserMember // Add flag indicating if current user is a member
              };
            }
            
            return {
              ...group,
              isUserMember // Add flag indicating if current user is a member
            };
          }));
          
          setHousingGroups(enhancedGroups);
        } else {
          setHousingGroups([]);
        }
      } catch (error) {
        console.error('Error fetching housing groups with profiles:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHousingGroups();
    checkIfSaved();
  }, [housingData.id, refreshKey]); // Add refreshKey to dependency array to trigger refresh
  
  // Format price
  const formatPrice = (price) => {
    return price ? `$${price.toLocaleString()}` : 'N/A';
  };
  
  // Format features
  const formatFeatures = (features) => {
    return features && Array.isArray(features) ? features.join(', ') : 'None listed';
  };
  
  // Toggle share modal to share with friends
  const handleShare = () => {
    setShareModalVisible(true);
  };
  
  // Toggle share modal close
  const handleCloseShareModal = () => {
    setShareModalVisible(false);
  };
  
  // Save listing to favorites
  const handleSave = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert('Please log in to save favorites');
        return;
      }
      
      const isCurrentlySaved = saved;
      const itemId = housingData.id;
      const itemType = 'housing_listing';
      
      console.log(`[HousingDetail] Toggling favorite: Item ID: ${itemId}, Currently saved: ${isCurrentlySaved}`);
      
      if (isCurrentlySaved) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', itemId)
          .eq('item_type', itemType);
          
        if (error) {
          console.error('[HousingDetail] Error removing from favorites:', error);
          return;
        }
        
        console.log('[HousingDetail] Successfully removed from favorites');
        setSaved(false);
      } else {
        // Add to favorites with upsert to handle potential conflicts
        const { error } = await supabase
          .from('favorites')
          .upsert({
            user_id: user.id,
            item_id: itemId,
            item_type: itemType,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,item_id,item_type',
            ignoreDuplicates: true
          });
          
        if (error) {
          console.error('[HousingDetail] Error adding to favorites:', error);
          return;
        }
        
        console.log('[HousingDetail] Successfully added to favorites');
        setSaved(true);
      }
    } catch (error) {
      console.error('[HousingDetail] Error in handleSave:', error);
    }
  };
  
  // Apply for housing
  const handleApply = () => {
    // Navigate to application form
    navigation.navigate('HousingApplicationForm', { listingId: housingData.id });
  };
  
  // Contact landlord/provider
  const handleContact = () => {
    // Open chat with provider
    navigation.navigate('ChatScreen', { recipientId: housingData.provider_id });
  };
  
  // Join housing group and automatically favorite it
  const handleJoinGroup = async (groupId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Notify user they need to log in
        alert('Please log in to join a housing group');
        return;
      }
      
      // Add to favorites table using upsert to avoid duplicates (favorites sync fix)
      const { error: favoriteError } = await supabase
        .from('favorites')
        .upsert({
          user_id: user.id,
          item_id: groupId,
          item_type: 'housing_group',
          created_at: new Date()
        }, {
          onConflict: 'user_id,item_id,item_type',
          ignoreDuplicates: true
        });
      
      if (favoriteError) {
        console.error('Error favoriting housing group:', favoriteError);
        // Continue with navigation even if favoriting fails
      } else {
        console.log('Housing group automatically favorited');
      }
      
      // Navigate to housing group detail screen
      navigation.navigate('HousingGroupDetailScreen', { groupId });
    } catch (error) {
      console.error('Error joining housing group:', error);
    }
  };
  
  // Create new housing group
  const handleCreateGroup = () => {
    // Navigate to the CreateHousingGroup screen with the listing ID
    navigation.navigate('CreateHousingGroup', { listingId: housingData.id });
  };
  
  // Fade in header on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT - 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading housing details...</Text>
      </View>
    );
  }
  
  const renderImageGallery = () => {
    const images = housingData.media_urls || [];
    
    if (images.length === 0) {
      return (
        <View style={styles.heroContainer}>
          <Image 
            source={require('../../assets/images/housing-placeholder.jpg')} 
            style={styles.heroImage} 
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']} 
            style={styles.heroGradient}
          />
        </View>
      );
    }
    
    return (
      <View style={styles.heroContainer}>
        <Image 
          source={{ uri: images[0] }}
          style={styles.heroImage} 
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']} 
          style={styles.heroGradient}
        />
        
        {/* Property badges */}
        <View style={styles.badgesContainer}>
          {housingData.ndis_supported && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NDIS Supported</Text>
            </View>
          )}
          {housingData.is_sda_certified && (
            <View style={[styles.badge, styles.sdaBadge]}>
              <Text style={styles.badgeText}>SDA Certified</Text>
            </View>
          )}
        </View>
        
        {/* Save button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          {saved ? (
            <Ionicons name="heart" size={24} color="#FF385C" />
          ) : (
            <Feather name="heart" size={24} color="white" />
          )}
        </TouchableOpacity>
        
        {/* Image count */}
        {images.length > 1 && (
          <View style={styles.imageCounter}>
            <Feather name="camera" size={14} color="white" style={{ marginRight: 4 }} />
            <Text style={styles.imageCountText}>{images.length}</Text>
          </View>
        )}
      </View>
    );
  };
  
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {['Details', 'Features', 'Location', 'Groups'].map((tab) => (
        <TouchableOpacity 
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Details':
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.propertyDetailRow}>
              <View style={styles.propertyDetailItem}>
                <Feather name="home" size={20} color="#2E7D32" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Property Type</Text>
                <Text style={styles.detailValue}>{housingData.property_type || 'Not specified'}</Text>
              </View>
              
              <View style={styles.propertyDetailItem}>
                <Feather name="users" size={20} color="#2E7D32" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Bedrooms</Text>
                <Text style={styles.detailValue}>{housingData.bedrooms || 'N/A'}</Text>
              </View>
              
              <View style={styles.propertyDetailItem}>
                <Feather name="droplet" size={20} color="#2E7D32" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Bathrooms</Text>
                <Text style={styles.detailValue}>{housingData.bathrooms || 'N/A'}</Text>
              </View>
            </View>
            
            <View style={styles.propertyDetailRow}>
              <View style={styles.propertyDetailItem}>
                <Feather name="calendar" size={20} color="#2E7D32" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Available From</Text>
                <Text style={styles.detailValue}>
                  {housingData.available_from ? new Date(housingData.available_from).toLocaleDateString() : 'Now'}
                </Text>
              </View>
              
              <View style={styles.propertyDetailItem}>
                <Feather name="dollar-sign" size={20} color="#2E7D32" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Weekly Rent</Text>
                <Text style={styles.detailValue}>{formatPrice(housingData.weekly_rent)}</Text>
              </View>
              
              <View style={styles.propertyDetailItem}>
                <Feather name="shield" size={20} color="#2E7D32" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Bond</Text>
                <Text style={styles.detailValue}>{formatPrice(housingData.bond_amount)}</Text>
              </View>
            </View>
            
            <View style={styles.separator} />
            
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{housingData.description}</Text>
            
            <View style={styles.separator} />
            
            {housingData.sda_category && (
              <View style={styles.sdaContainer}>
                <Text style={styles.sectionTitle}>SDA Information</Text>
                <View style={styles.sdaInfoBox}>
                  <FontAwesome5 name="house-user" size={24} color="#2E7D32" style={styles.sdaIcon} />
                  <View style={styles.sdaTextContainer}>
                    <Text style={styles.sdaCategory}>{housingData.sda_category.replace('_', ' ').toUpperCase()}</Text>
                    <Text style={styles.sdaDescription}>This housing meets the Specialist Disability Accommodation requirements for this design category.</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
        
      case 'Features':
        return (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Property Features</Text>
            <View style={styles.featuresList}>
              {housingData.features && housingData.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Feather name="check-circle" size={18} color="#2E7D32" style={styles.featureIcon} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.separator} />
            
            <Text style={styles.sectionTitle}>Accessibility Features</Text>
            <View style={styles.featuresList}>
              {housingData.accessibility_features && housingData.accessibility_features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <FontAwesome5 name="wheelchair" size={18} color="#2E7D32" style={styles.featureIcon} />
                  <Text style={styles.featureText}>{feature.replace('_', ' ')}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.additionalInfo}>
              <View style={styles.infoItem}>
                <Feather name="check-circle" size={20} color={housingData.pets_allowed ? "#2E7D32" : "#aaa"} />
                <Text style={[styles.infoText, !housingData.pets_allowed && styles.disabledText]}>Pets Allowed</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Feather name="check-circle" size={20} color={housingData.ndis_supported ? "#2E7D32" : "#aaa"} />
                <Text style={[styles.infoText, !housingData.ndis_supported && styles.disabledText]}>NDIS Supported</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Feather name="check-circle" size={20} color={housingData.has_virtual_tour ? "#2E7D32" : "#aaa"} />
                <Text style={[styles.infoText, !housingData.has_virtual_tour && styles.disabledText]}>Virtual Tour Available</Text>
              </View>
            </View>
          </View>
        );
        
      case 'Location':
        return (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.addressContainer}>
              <Feather name="map-pin" size={20} color="#2E7D32" style={{marginRight: 8}} />
              <Text style={styles.addressText}>
                {housingData.address}, {housingData.suburb}, {housingData.state} {housingData.postcode}
              </Text>
            </View>
            
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Map View</Text>
              <Text style={styles.mapPlaceholderSubtext}>Exact location shown after booking</Text>
            </View>
            
            <View style={styles.separator} />
            
            <Text style={styles.sectionTitle}>Neighborhood</Text>
            <Text style={styles.neighborhoodText}>
              {housingData.suburb} is a vibrant area with access to medical facilities, shopping centers, and public transport options.
            </Text>
          </View>
        );
        
      case 'Groups':
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.groupsHeaderContainer}>
              <Text style={styles.sectionTitle}>Housing Groups</Text>
            </View>
            
            <View style={styles.groupsSubheaderContainer}>
              <Text style={styles.groupsDescription}>
                Join others looking for housemates for this property or create your own group.
              </Text>
              
              <TouchableOpacity style={styles.createGroupButton} onPress={handleCreateGroup}>
                <Feather name="plus-circle" size={16} color="white" style={styles.buttonIcon} />
                <Text style={styles.createGroupText}>Create Group</Text>
              </TouchableOpacity>
            </View>
            
            {housingGroups.length > 0 ? (
              <FlatList
                data={housingGroups}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={[CardStyles.listCardContainer, styles.prominentGroupCard]}>
                    <View style={CardStyles.listCardInner}>
                      <View style={styles.groupAvatarContainer}>
                        {item.avatar_url ? (
                          <Image 
                            source={{ uri: item.avatar_url }} 
                            style={styles.groupAvatarImage} 
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.groupAvatarCircle}>
                            <Feather name="users" size={22} color={COLORS.primary} />
                          </View>
                        )}
                      </View>
                      
                      <View style={CardStyles.listContentContainer}>
                        <View style={CardStyles.topSection}>
                          <ConsistentHeightTitle 
                            title={item.name} 
                            style={CardStyles.title} 
                            numberOfLines={1} 
                          />
                        </View>
                        
                        <Text style={[CardStyles.subtitle, styles.groupDescription]} numberOfLines={2}>
                          {item.description}
                        </Text>
                        
                        <View style={CardStyles.bottomSection}>
                          <Text style={styles.moveInDate}>
                            Move in: {new Date(item.move_in_date).toLocaleDateString()}
                          </Text>
                          
                          {/* Member avatars - Instagram style */}
                          <View style={styles.memberContainer}>
                            <View style={styles.memberAvatars}>
                              {item.housing_group_members && item.housing_group_members
                                .filter(member => member.status === 'approved')
                                .slice(0, 3).map((member, index) => (
                                  <View key={index} style={[styles.avatarContainer, { zIndex: 10 - index, marginLeft: index > 0 ? -10 : 0 }]}>
                                    {member.profile && member.profile.avatar_url ? (
                                      <Image 
                                        source={{ uri: member.profile.avatar_url }} 
                                        style={styles.memberAvatar}
                                      />
                                    ) : (
                                      <View style={[styles.memberAvatar, { backgroundColor: COLORS.primary + (80 + (index * 10)).toString(16) }]}>
                                        <Text style={styles.memberInitial}>
                                          {member.profile && member.profile.full_name 
                                            ? member.profile.full_name.charAt(0).toUpperCase() 
                                            : (member.profile && member.profile.username 
                                              ? member.profile.username.charAt(0).toUpperCase() 
                                              : '?')}
                                        </Text>
                                      </View>
                                    )}
                                    {index === 0 && member.is_admin && (
                                      <View style={styles.adminBadge}>
                                        <Feather name="star" size={8} color="white" />
                                      </View>
                                    )}
                                  </View>
                                ))}
                              
                              {item.housing_group_members && 
                               item.housing_group_members.filter(member => member.status === 'approved').length > 3 && (
                                <View style={[styles.avatarContainer, { marginLeft: -10, zIndex: 1 }]}>
                                  <View style={styles.moreAvatars}>
                                    <Text style={styles.moreAvatarsText}>
                                      +{item.housing_group_members.filter(member => member.status === 'approved').length - 3}
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </View>
                            
                            <View style={styles.membersContainerProminent}>
                              <Feather name="users" size={14} color="white" />
                              <Text style={styles.membersTextProminent}>{item.current_members}/{item.max_members}</Text>
                            </View>
                          </View>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.joinGroupButton}
                          onPress={() => item.isUserMember ? 
                            navigation.navigate('HousingGroupDetailScreen', { groupId: item.id }) : 
                            handleJoinGroup(item.id)
                          }
                        >
                          <Feather 
                            name={item.isUserMember ? "eye" : "users"} 
                            size={16} 
                            color="white" 
                            style={styles.buttonIcon} 
                          />
                          <Text style={styles.joinGroupText}>
                            {item.isUserMember ? "View" : "Join Group"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View style={styles.emptyGroupsContainer}>
                <Feather name="users" size={50} color="#ddd" />
                <Text style={styles.emptyGroupsText}>No housing groups yet</Text>
                <Text style={styles.emptyGroupsSubtext}>Be the first to create a group for this property</Text>
                <TouchableOpacity style={styles.emptyCreateButton} onPress={handleCreateGroup}>
                  <Text style={styles.emptyCreateText}>Create a Group</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <View style={styles.screenContainer}>
      {/* Standard AppHeader with fixed title */}
      <AppHeader
        title="Listing Details"
        navigation={navigation}
        canGoBack={true}
      />
      
      <Animated.ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {renderImageGallery()}
        
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{housingData.title}</Text>
            <Text style={styles.location}>
              {housingData.suburb}, {housingData.state}
            </Text>
          </View>
          
          {renderTabs()}
          {renderTabContent()}
        </View>
      </Animated.ScrollView>
      
      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(housingData.weekly_rent)}</Text>
          <Text style={styles.priceUnit}>per week</Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleContact}>
            <Feather name="message-circle" size={20} color="#2E7D32" />
            <Text style={styles.actionButtonText}>Contact</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Feather name="share-2" size={20} color="#2E7D32" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Share Tray Modal */}
      <ShareTrayModal
        visible={shareModalVisible}
        onClose={handleCloseShareModal}
        itemToShare={{
          item_id: housingData.id,
          item_type: 'housing_listing',
          item_title: housingData.title
        }}
        highlightSharedUsers={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  heroContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  badgesContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: 'rgba(46, 125, 50, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  sdaBadge: {
    backgroundColor: 'rgba(63, 81, 181, 0.8)',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saveButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCountText: {
    color: 'white',
    fontSize: 12,
  },
  contentContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding for bottom bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  groupCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  groupsSubheaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupsDescription: {
    fontSize: 14,
    color: '#717171',
    lineHeight: 20,
    flex: 1,
    marginRight: 12,
  },
  prominentGroupCard: {
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    marginBottom: 20,
    elevation: 4,
  },
  groupAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  membersContainerProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  membersTextProminent: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  adminBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  groupButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  buttonIcon: {
    marginRight: 6,
  },
  joinGroupButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
  },
  joinGroupText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  viewGroupButton: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewGroupText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 4,
  },
  createGroupButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  createGroupText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  titleContainer: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  location: {
    fontSize: 16,
    color: '#484848',
    marginBottom: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
    paddingBottom: 2,
    justifyContent: 'space-between',
  },
  tab: {
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 16,
    color: '#717171',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#222',
  },
  propertyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
  },
  propertyDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailIcon: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#717171',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#484848',
    letterSpacing: 0.2,
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 6,
  },
  featureIcon: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#444',
    flex: 1,
  },
  memberContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  memberAvatars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  moreAvatars: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  moreAvatarsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 30, // Extra padding for bottom inset
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  priceUnit: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 4,
  },
  applyButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 16,
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default HousingDetailScreen;
