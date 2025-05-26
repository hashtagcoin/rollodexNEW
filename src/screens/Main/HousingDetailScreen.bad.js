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
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Feather, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, SIZES } from '../../constants/theme';
import { ConsistentHeightTitle } from '../../constants/CardStyles';

const HousingDetailScreen = ({ route }) => {
  const { item } = route.params;
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [housingGroups, setHousingGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('Details');
  
  const tabs = ['Details', 'Groups', 'Apply'];
  
  // Fetch housing groups related to this listing
  useEffect(() => {
    fetchHousingGroups();
  }, [item.id]);
  
  const fetchHousingGroups = async () => {
    console.log('Fetching housing groups for listing ID:', item.id);
    try {
      setLoading(true);
      
      // Get housing groups with members for this listing
      const { data, error } = await supabase
        .from('housing_groups_with_members')
        .select('*')
        .eq('listing_id', item.id)
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching housing groups:', error);
        return;
      }
      
      console.log(`Found ${data?.length || 0} housing groups for listing ${item.id}`);
      setHousingGroups(data || []);
    } catch (error) {
      console.error('Exception fetching housing groups:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchHousingGroups().then(() => setRefreshing(false));
  };
  
  // Format price
  const formatPrice = (price) => {
    return price ? `$${price.toLocaleString()}` : 'N/A';
  };
  
  // Create new housing group
  const handleCreateGroup = () => {
    // Navigate to create group screen
    navigation.navigate('CreateHousingGroup', { listingId: item.id });
  };
  
  // Render a housing group card
  const renderGroupCard = ({ item: group }) => {
    return (
      <TouchableOpacity 
        style={styles.groupCard}
        onPress={() => navigation.navigate('HousingGroupDetail', { groupId: group.id })}
        activeOpacity={0.8}
      >
        <View style={styles.groupCardContent}>
          <View style={styles.groupCardHeader}>
            <ConsistentHeightTitle
              title={group.name}
              style={styles.groupTitle}
              numberOfLines={2}
            />
          </View>
          
          <View style={styles.groupCardBody}>
            <View style={styles.groupDetailRow}>
              <Ionicons name="people-outline" size={16} color="#666" style={styles.groupIcon} />
              <Text style={styles.groupDetailText}>
                {group.current_members}/{group.max_members} members
              </Text>
            </View>
            
            <View style={styles.groupDetailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" style={styles.groupIcon} />
              <Text style={styles.groupDetailText}>
                {group.move_in_date ? new Date(group.move_in_date).toLocaleDateString() : 'Flexible'}
              </Text>
            </View>
            
            <Text 
              style={styles.groupDescription} 
              numberOfLines={2}
            >
              {group.description || 'No description available'}
            </Text>
            
            {/* Member avatars would go here */}
          </View>
          
          <View style={styles.groupCardFooter}>
            <TouchableOpacity 
              style={styles.modernJoinButton}
              onPress={() => {
                console.log('Join Group button pressed, navigating to HousingGroupDetail with groupId:', group.id);
                navigation.navigate('HousingGroupDetail', { groupId: group.id, joining: true });
              }}
            >
              <Ionicons name="enter-outline" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.modernJoinButtonText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Details tab content
  const renderDetailsTab = () => {
    return (
      <ScrollView 
        style={styles.tabContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Title:</Text>
            <Text style={styles.detailValue}>{item?.title || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{item?.suburb || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Property Type:</Text>
            <Text style={styles.detailValue}>{item?.property_type || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bedrooms:</Text>
            <Text style={styles.detailValue}>{item?.bedrooms || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bathrooms:</Text>
            <Text style={styles.detailValue}>{item?.bathrooms || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rent:</Text>
            <Text style={styles.detailValue}>
              ${item?.rent_amount || 'N/A'} per {item?.rent_frequency || 'week'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Available From:</Text>
            <Text style={styles.detailValue}>
              {item?.available_from ? new Date(item.available_from).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };
  
  // Separate function for Apply tab
  const renderApplyTab = () => {
    return (
      <ScrollView 
        style={styles.tabContent}
        contentContainerStyle={styles.applyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.applyTitle}>Apply for this Property</Text>
        <Text style={styles.applyDescription}>
          You can apply directly for this property or join an existing housing group.
        </Text>
        
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={() => {
            console.log('Apply for Property button pressed, navigating to Application form with listingId:', item.id);
            navigation.navigate('HousingApplicationForm', { listingId: item.id });
          }}
        >
          <Text style={styles.applyButtonText}>Apply for Property</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.applyButton, styles.secondaryButton]}
          onPress={() => {
            setActiveTab('Groups');
          }}
        >
          <Text style={[styles.applyButtonText, styles.secondaryButtonText]}>View Housing Groups</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };
  
  // Render tab content - excluding Groups tab which is handled separately
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Details':
        return renderDetailsTab();
      case 'Apply':
        return renderApplyTab();
      default:
        return null;
    }
  };
  
  // Separate render function for Groups tab to avoid nesting FlatList in ScrollView
  const renderGroupsTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.groupsHeaderContainer}>
          <Text style={styles.sectionTitle}>Housing Groups</Text>
          <TouchableOpacity style={styles.modernButton} onPress={handleCreateGroup}>
            <Ionicons name="people" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.modernButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.groupsDescription}>
          Join others looking for housemates for this property or create your own group.
        </Text>
        
        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
        ) : housingGroups.length === 0 ? (
          <ScrollView 
            contentContainerStyle={styles.emptyStateContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Ionicons name="people-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyStateText}>No housing groups available</Text>
            <Text style={styles.emptyStateSubtext}>Be the first to create a group for this property</Text>
            <TouchableOpacity 
              style={styles.modernButton}
              onPress={() => {
                console.log('Create Group button pressed, navigating to CreateHousingGroup with listingId:', item.id);
                navigation.navigate('CreateHousingGroup', { listingId: item.id });
              }}
            >
              <Ionicons name="people" size={18} color={COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.modernButtonText}>Create Group</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <FlatList
            data={housingGroups}
            renderItem={renderGroupCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.groupsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListFooterComponent={
              <TouchableOpacity 
                style={styles.modernButton}
                onPress={() => {
                  console.log('Create New Group button pressed, navigating to CreateHousingGroup with listingId:', item.id);
                  navigation.navigate('CreateHousingGroup', { listingId: item.id });
                }}
              >
                <Ionicons name="add-circle" size={18} color={COLORS.white} style={styles.buttonIcon} />
                <Text style={styles.modernButtonText}>Create New Group</Text>
              </TouchableOpacity>
            }
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Housing Details" showBackButton={true} navigation={navigation} />
      
      {/* Tab Navigation */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Tab Content - Conditionally render to avoid nested VirtualizedList warning */}
      {activeTab === 'Groups' ? (
        // For Groups tab, render directly to avoid nesting FlatList inside ScrollView
        renderGroupsTab()
      ) : (
        // For all other tabs, render normally through renderTabContent
        renderTabContent()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  detailsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.primary,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  detailLabel: {
    width: 120,
    fontSize: 16,
    color: COLORS.gray,
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  applyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  applyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.primary,
  },
  applyDescription: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: COLORS.gray,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  groupsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  groupsDescription: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    color: COLORS.gray,
  },
  modernButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },
  modernButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  groupsList: {
    padding: 16,
    paddingTop: 0,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  groupCardContent: {
    padding: 16,
  },
  groupCardHeader: {
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  groupCardBody: {
    marginBottom: 16,
  },
  groupDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupIcon: {
    marginRight: 8,
  },
  groupDetailText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  groupDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  groupCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modernJoinButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernJoinButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  loader: {
    marginTop: 40,
  }
});

export default HousingDetailScreen;
