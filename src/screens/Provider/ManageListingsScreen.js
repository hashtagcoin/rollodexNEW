import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import AppHeader from '../../components/layout/AppHeader';

const ManageListingsScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [listings, setListings] = useState({
    services: [],
    housing: []
  });
  const [activeTab, setActiveTab] = useState('services');
  const [loading, setLoading] = useState(true);
  
  // Fetch listings when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [profile])
  );
  
  // Fetch provider's service listings
  const fetchListings = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // First, get the service_provider_id for the current user
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id) // Assuming 'user_id' in service_providers links to auth.users.id
        .single();

      if (providerError) throw providerError;
      if (!providerData) {
        // Handle case where user is not a service provider or record not found
        console.warn('Service provider record not found for this user.');
        setListings({ services: [], housing: [] });
        setLoading(false);
        return;
      }
      const serviceProviderId = providerData.id;

      // Get services provided by this service_provider_id
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', serviceProviderId) // Use serviceProviderId
        .order('created_at', { ascending: false });
        
      if (serviceError) throw serviceError;
      
      // Get housing listings provided by this service_provider_id
      const { data: housingData, error: housingError } = await supabase
        .from('housing_listings')
        .select('*')
        .eq('provider_id', serviceProviderId) // Use serviceProviderId
        .order('created_at', { ascending: false });
        
      if (housingError) throw housingError;
      
      setListings({
        services: serviceData || [],
        housing: housingData || []
      });
    } catch (err) {
      console.error('Error fetching provider listings:', err);
      Alert.alert('Error', 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle listing availability
  const toggleAvailability = async (id, type, currentStatus) => {
    try {
      setLoading(true);
      
      const tableName = type === 'service' ? 'services' : 'housing_listings';
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from(tableName)
        .update({ available: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state - safely handle potentially undefined arrays
      setListings(prev => {
        // Ensure the array exists before trying to map it
        const itemsArray = prev[type + 's'] || [];
        
        return {
          ...prev,
          [type + 's']: itemsArray.map(item => 
            item.id === id ? { ...item, available: newStatus } : item
          )
        };
      });
      
      Alert.alert(
        'Status Updated', 
        `Your ${type} is now ${newStatus ? 'available' : 'unavailable'} to clients.`
      );
      
      // Refresh listings to ensure state is consistent
      fetchListings();
    } catch (err) {
      console.error('Error updating listing availability:', err);
      Alert.alert('Error', 'Failed to update listing status');
    } finally {
      setLoading(false);
    }
  };
  
  // Create new listing
  const handleNewListing = (type) => {
    if (type === 'service') {
      navigation.navigate('CreateServiceListing');
    } else {
      navigation.navigate('CreateHousingListing');
    }
  };
  
  // Render service listing item
  const renderServiceItem = ({ item }) => (
    <View style={styles.listingCard}>
      <Image
        source={{ 
          uri: item.media_urls && item.media_urls.length > 0 
            ? item.media_urls[0] 
            : 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png'
        }}
        style={styles.listingImage}
      />
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle}>{item.title || 'Service Title'}</Text>
        <Text style={styles.listingPrice}>${item.price}</Text>
        <View style={styles.listingStatusContainer}>
          <View style={[styles.listingStatusIndicator, { 
            backgroundColor: item.available ? '#4CAF50' : '#F44336' 
          }]} />
          <Text style={styles.listingStatusText}>
            {item.available ? 'Available' : 'Not Available'}
          </Text>
        </View>
      </View>
      <View style={styles.listingActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditServiceListing', { serviceId: item.id })}
        >
          <Feather name="edit-2" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleAvailability(item.id, 'service', item.available)}
        >
          <MaterialIcons 
            name={item.available ? "visibility" : "visibility-off"} 
            size={22} 
            color={item.available ? '#4CAF50' : '#F44336'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Render housing listing item
  const renderHousingItem = ({ item }) => (
    <View style={styles.listingCard}>
      <Image
        source={{ 
          uri: item.media_urls && item.media_urls.length > 0 
            ? item.media_urls[0] 
            : 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.jpg'
        }}
        style={styles.listingImage}
      />
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle}>{item.title || 'Housing Listing'}</Text>
        <Text style={styles.listingPrice}>${item.weekly_rent}/week</Text>
        <View style={styles.listingStatusContainer}>
          <View style={[styles.listingStatusIndicator, { 
            backgroundColor: item.available ? '#4CAF50' : '#F44336' 
          }]} />
          <Text style={styles.listingStatusText}>
            {item.available ? 'Available' : 'Not Available'}
          </Text>
        </View>
      </View>
      <View style={styles.listingActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditHousingListing', { housingId: item.id })}
        >
          <Feather name="edit-2" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleAvailability(item.id, 'housing', item.available)}
        >
          <MaterialIcons 
            name={item.available ? "visibility" : "visibility-off"} 
            size={22} 
            color={item.available ? '#4CAF50' : '#F44336'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <AppHeader
        title="Manage Listings"
        navigation={navigation}
        showBackButton={true}
      />
      
      {/* Tab buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'services' && styles.activeTabButton]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            Services ({listings.services.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'housing' && styles.activeTabButton]}
          onPress={() => setActiveTab('housing')}
        >
          <Text style={[styles.tabText, activeTab === 'housing' && styles.activeTabText]}>
            Housing ({listings.housing.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Listings */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : activeTab === 'services' ? (
        <>
          <FlatList
            data={listings.services}
            keyExtractor={item => `service-${item.id}`}
            renderItem={renderServiceItem}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="ios-briefcase-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>You haven't created any services yet</Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => handleNewListing('service')}
                >
                  <Text style={styles.createButtonText}>Create Service</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={listings.services.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          />
          {listings.services.length > 0 && (
            <TouchableOpacity 
              style={styles.floatingButton}
              onPress={() => handleNewListing('service')}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <FlatList
            data={listings.housing}
            keyExtractor={item => `housing-${item.id}`}
            renderItem={renderHousingItem}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="ios-home-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>You haven't created any housing listings yet</Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => handleNewListing('housing')}
                >
                  <Text style={styles.createButtonText}>Create Housing Listing</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={listings.housing.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          />
          {listings.housing.length > 0 && (
            <TouchableOpacity 
              style={styles.floatingButton}
              onPress={() => handleNewListing('housing')}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
  },
  tabContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listingImage: {
    width: 100,
    height: 100,
  },
  listingContent: {
    flex: 1,
    padding: 12,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  listingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  listingStatusText: {
    fontSize: 12,
    color: '#666',
  },
  listingActions: {
    width: 50,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 8,
  },
  actionButton: {
    padding: 6,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ManageListingsScreen;
