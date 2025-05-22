import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Linking, 
  Platform 
} from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

// Status filter options
const FILTERS = ['All', 'Active', 'Expired', 'Revoked'];



const ServiceAgreementsScreen = ({ navigation }) => {
  const [agreements, setAgreements] = useState([]);
  const [filteredAgreements, setFilteredAgreements] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  
  // Fetch user's agreements from global variable
  const fetchAgreements = async () => {
    try {
      setLoading(true);
      
      // Get agreements from global variable (demo approach)
      // In a production app, these would come from Supabase
      const agreementsData = global.participantAgreements || [];
      
      console.log('Fetched agreements:', agreementsData);
      setAgreements(agreementsData);
      
      // Apply filters
      filterAgreements(agreementsData, selectedFilter);
    } catch (error) {
      console.error('Error fetching agreements:', error.message);
      Alert.alert('Error', 'Could not load your service agreements. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Filter agreements based on status
  const filterAgreements = (agreements, filter) => {
    if (filter === 'All') {
      setFilteredAgreements(agreements);
      return;
    }
    
    const filtered = agreements.filter(a => a.status.toLowerCase() === filter.toLowerCase());
    setFilteredAgreements(filtered);
  };
  
  // Handle filter selection
  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    filterAgreements(agreements, filter);
  };
  
  // View agreement in full screen
  const handleViewAgreement = (agreement) => {
    // Navigate to a dedicated viewer screen with the agreement content
    navigation.navigate('ServiceAgreement', { 
      viewOnly: true, 
      agreementId: agreement.id,
      agreementContent: agreement.agreement_content,
      serviceId: agreement.service_id
    });
  };
  
  // Share agreement
  const handleShareAgreement = async (agreement) => {
    try {
      setDownloadingId(agreement.id);
      
      // Share options
      const title = agreement.agreement_title;
      const message = `My service agreement with ${agreement.service_providers?.business_name} for ${agreement.services?.title}`;
      
      // For demo purposes, we'll just show a success message
      setTimeout(() => {
        Alert.alert(
          'Agreement Shared',
          'Your agreement has been shared successfully.',
          [{ text: 'OK' }]
        );
      }, 1000);
    } catch (error) {
      console.error('Error sharing agreement:', error);
      Alert.alert('Error', 'Could not share the agreement. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchAgreements();
  }, []);
  
  // Filter when selection changes
  useEffect(() => {
    filterAgreements(agreements, selectedFilter);
  }, [selectedFilter]);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAgreements();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.screenContainer}>
        <AppHeader title="Service Agreements" navigation={navigation} canGoBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading your agreements...</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.screenContainer}>
      <AppHeader title="Service Agreements" navigation={navigation} canGoBack={true} />
      
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, selectedFilter === f && styles.filterBtnActive]}
            onPress={() => handleFilterSelect(f)}
          >
            <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <FlatList
        data={filteredAgreements}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Feather name="file-text" size={22} color="#2E7D32" />
              <Text style={styles.cardTitle}>{item.agreement_title}</Text>
              <View style={[
                styles.statusBadge, 
                item.status === 'active' ? styles.activeBadge : 
                item.status === 'expired' ? styles.expiredBadge : 
                styles.revokedBadge
              ]}>
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.cardSubText}>
              Provider: {item.service_providers?.business_name || 'Unknown Provider'}
            </Text>
            
            <Text style={styles.cardSubText}>
              Service: {item.services?.title || 'Unknown Service'}
            </Text>
            
            <Text style={styles.cardSubText}>
              Signed: {new Date(item.signed_at).toLocaleDateString('en-AU', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
            
            <View style={styles.agreementActionsRow}>
              {/* View Button */}
              <TouchableOpacity 
                style={styles.agreementBtn}
                onPress={() => handleViewAgreement(item)}
              >
                <Feather name="eye" size={16} color="#2E7D32" style={styles.actionIcon} />
                <Text style={styles.agreementBtnText}>View</Text>
              </TouchableOpacity>
              
              {/* Share Button */}
              <TouchableOpacity 
                style={styles.agreementBtn}
                onPress={() => handleShareAgreement(item)}
                disabled={downloadingId === item.id}
              >
                {downloadingId === item.id ? (
                  <ActivityIndicator size="small" color="#2E7D32" />
                ) : (
                  <>
                    <Feather name="share-2" size={16} color="#2E7D32" style={styles.actionIcon} />
                    <Text style={styles.agreementBtnText}>Share</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="file-text" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No agreements found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter !== 'All' 
                ? `Try selecting a different filter` 
                : `You don't have any service agreements yet`}
            </Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    paddingHorizontal: 10,
    flexWrap: 'wrap',
    gap: 10,
  },
  filterBtn: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    minWidth: 60,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#2E7D32',
  },
  filterText: {
    color: '#222',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 18,
    paddingBottom: 80, // Extra padding for bottom navbar
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
    color: '#222',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  expiredBadge: {
    backgroundColor: '#FFF8E1',
  },
  revokedBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardSubText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  agreementActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  agreementBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 6,
  },
  agreementBtnText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ServiceAgreementsScreen;
