import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, ActivityIndicator, Alert } from 'react-native';
import ActionButton from '../../components/common/ActionButton';
import { Feather, Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/layout/AppHeader';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import { getValidImageUrl } from '../../utils/imageHelper';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'interest', label: 'Interest' },
  { key: 'support', label: 'Support' },
];

const GroupsListScreen = () => {
  const navigation = useNavigation();
  const [filter, setFilter] = useState('all');
  const [groupsData, setGroupsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState({});

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef(null);
  
  // Get current user's ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    fetchCurrentUser();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
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
        
        console.log('Housing group image URL:', imageUrl); // Debug log
        
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
      setGroupsData(allGroups);
      
      // Fetch membership status for housing groups if user is logged in
      if (userId) {
        fetchUserMembershipStatus(housingGroups.map(g => g.id));
      }
    } catch (e) {
      console.error('Error fetching groups:', e);
      setError(e.message || 'Failed to fetch groups.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch user's membership status for housing groups
  const fetchUserMembershipStatus = async (housingGroupIds) => {
    if (!userId || housingGroupIds.length === 0) return;
    
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
      
      setMembershipStatus(statusMap);
    } catch (e) {
      console.error('Error fetching membership status:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchGroups();
    }, [])
  );

  const filteredGroups = filter === 'all' 
    ? groupsData 
    : filter === 'housing'
      ? groupsData.filter(g => g.is_housing_group)
      : groupsData.filter(g => !g.is_housing_group && g.category === filter);

  const GroupCard = React.memo(({ item, navigation }) => {
    const [isFavorited, setIsFavorited] = useState(false); 

    const toggleFavorite = useCallback(() => {
      setIsFavorited(prev => !prev);
      alert(`Group ${item.name} ${!isFavorited ? 'added to' : 'removed from'} favorites (UI only)`);
    }, [isFavorited, item.name]);
    
    // Get membership button text and style based on status
    const getMembershipButtonInfo = () => {
      if (!item.is_housing_group) {
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
    
    const handleJoinGroup = async () => {
      if (!item.is_housing_group) {
        alert('Join feature coming soon!');
        return;
      }
      
      if (!userId) {
        Alert.alert('Sign in required', 'Please sign in to join this housing group');
        return;
      }
      
      try {
        // First check if the user is already a member of this housing group
        const { data: existingMembership, error: checkError } = await supabase
          .from('housing_group_members')
          .select('status')
          .eq('group_id', item.id)
          .eq('user_id', userId)
          .single();
          
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is 'not found' error
          throw checkError;
        }
        
        // If membership exists, inform the user and update the UI
        if (existingMembership) {
          console.log('Membership already exists, status:', existingMembership.status);
          
          // Update local state to reflect current status
          setMembershipStatus(prev => ({
            ...prev,
            [item.id]: existingMembership.status
          }));
          
          // Inform the user based on status
          if (existingMembership.status === 'pending') {
            Alert.alert('Already Applied', 'Your request to join this group is still pending');
          } else if (existingMembership.status === 'approved') {
            Alert.alert('Already a Member', 'You are already a member of this housing group');
          } else if (existingMembership.status === 'declined') {
            Alert.alert('Application Declined', 'Your previous request to join this group was declined');
          }
          
          return;
        }
        
        // If no existing membership, create a new one
        const { error: insertError } = await supabase
          .from('housing_group_members')
          .insert({
            group_id: item.id,
            user_id: userId,
            status: 'pending',
            join_date: new Date().toISOString()
          });
          
        if (insertError) throw insertError;
        
        // Update local state
        setMembershipStatus(prev => ({
          ...prev,
          [item.id]: 'pending'
        }));
        
        Alert.alert('Success', 'Your request to join this housing group has been submitted');
      } catch (error) {
        console.error('Error joining housing group:', error);
        Alert.alert('Error', 'Unable to process your request');
      }
    };
    
    const { text: membershipButtonText, buttonStyle, textStyle, disabled } = getMembershipButtonInfo();

    return (
      <TouchableOpacity 
        onPress={() => {
          if (item.is_housing_group) {
            navigation.navigate('HousingGroupDetailScreen', { groupId: item.id });
          } else {
            navigation.navigate('GroupDetail', { groupId: item.id });
          }
        }} 
        style={styles.card}
      >
        <Image 
          source={{ uri: item.image || 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housing/exterior/alejandra-cifre-gonzalez-ylyn5r4vxcA-unsplash.jpg' }} 
          style={styles.cardImage}
          onError={(e) => console.log('Image load error for:', item.image, e.nativeEvent.error)}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteIconContainer}>
              <Ionicons 
                name={isFavorited ? 'heart' : 'heart-outline'} 
                size={24} 
                color={isFavorited ? 'red' : '#888'} 
              />
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

  const renderGroupCard = useCallback(({ item }) => (
    <GroupCard item={item} navigation={navigation} />
  ), [navigation]);

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
        <ActionButton
          onPress={() => alert('Create new group feature coming soon!')}
          iconName="add"
          color="#007AFF"
          size={56}
        />
      </Animated.View>
      <AppHeader title="Groups" navigation={navigation} canGoBack={true} />
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'housing' && styles.filterBtnActive]}
            onPress={() => setFilter('housing')}
          >
            <Text style={[styles.filterBtnText, filter === 'housing' && styles.filterBtnTextActive]}>Housing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'social' && styles.filterBtnActive]}
            onPress={() => setFilter('social')} 
          >
            <Text style={[styles.filterBtnText, filter === 'social' && styles.filterBtnTextActive]}>Social</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'interest' && styles.filterBtnActive]}
            onPress={() => setFilter('interest')}
          >
            <Text style={[styles.filterBtnText, filter === 'interest' && styles.filterBtnTextActive]}>Interest</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'support' && styles.filterBtnActive]}
            onPress={() => setFilter('support')}
          >
            <Text style={[styles.filterBtnText, filter === 'support' && styles.filterBtnTextActive]}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Animated.FlatList
        data={filteredGroups}
        renderItem={renderGroupCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: true,
            listener: () => {
              if (scrollEndTimer.current) {
                clearTimeout(scrollEndTimer.current);
              }
              
              if (!isScrolling) {
                setIsScrolling(true);
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }
              
              scrollEndTimer.current = setTimeout(() => {
                setIsScrolling(false);
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 500, 
                  useNativeDriver: true,
                }).start();
              }, 200);
            }
          }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
    color: '#00b894',
    fontSize: 9,
    fontWeight: 'bold',
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
    paddingLeft: 8, 
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
