import React, { useState, useEffect, useCallback } from 'react';
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

// Helper to get current user ID
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

const ServiceAgreementsScreen = ({ navigation }) => {
  const [agreements, setAgreements] = useState([]);
  const [filteredAgreements, setFilteredAgreements] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null); // Keep this for UI feedback

  const fetchAgreements = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) {
        Alert.alert('Error', 'Could not identify user. Please log in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from('participant_agreements')
        .select(`
          *,
          services (title, description),
          service_providers (business_name)
        `)
        .eq('user_id', userId)
        .order('signed_at', { ascending: false });

      if (error) {
        console.error('Error fetching agreements from Supabase:', error.message);
        Alert.alert('Error', 'Could not load your service agreements. Please try again.');
        throw error;
      }
      
      setAgreements(data || []);
      filterAgreements(data || [], selectedFilter); // Apply initial filter

    } catch (error) {
      // Error already handled by alerts above or in the specific call
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]); // Add selectedFilter to dependencies if filterAgreements is called inside

  // Filter agreements based on status
  const filterAgreements = (agreementsToFilter, filter) => {
    if (filter === 'All') {
      setFilteredAgreements(agreementsToFilter);
      return;
    }
    const lowerCaseFilter = filter.toLowerCase();
    const filtered = agreementsToFilter.filter(a => a.status && a.status.toLowerCase() === lowerCaseFilter);
    setFilteredAgreements(filtered);
  };

  // Handle filter selection
  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    filterAgreements(agreements, filter);
  };

  // View agreement (using agreement_url)
  const handleViewAgreement = async (agreement) => {
    if (agreement.agreement_url) {
      try {
        if (Platform.OS === 'web') {
          window.open(agreement.agreement_url, '_blank');
        } else {
          // Use Expo WebBrowser to open the PDF in the system's browser on native
          await WebBrowser.openBrowserAsync(agreement.agreement_url);
        }
      } catch (error) {
        console.error('Error opening PDF:', error);
        Alert.alert('Error', 'Could not open the agreement PDF. Please ensure you have a PDF viewer or web browser installed.');
      }
    } else {
      Alert.alert('No PDF Available', 'The agreement PDF is not available for viewing.');
      // Optional: Fallback to navigating with HTML content if that's a desired behavior for non-PDF cases
      // navigation.navigate('ServiceAgreement', { 
      //   viewOnly: true, 
      //   agreementId: agreement.id,
      //   agreementContent: agreement.agreement_content, // This might be HTML
      //   serviceId: agreement.service_id,
      //   agreementTitle: agreement.agreement_title
      // });
    }
  };

  // Share agreement (using agreement_url)
  const handleShareAgreement = async (agreement) => {
    if (!agreement.agreement_url) {
      Alert.alert('Error', 'Agreement PDF URL not found.');
      return;
    }
    try {
      setDownloadingId(agreement.id);
      if (Platform.OS === 'web') {
        // Web share API or simple link sharing
        if (navigator.share) {
          await navigator.share({
            title: agreement.agreement_title,
            text: `Service agreement: ${agreement.agreement_title}`,
            url: agreement.agreement_url,
          });
        } else {
          Alert.alert('Share', `You can share this link: ${agreement.agreement_url}`);
        }
        setDownloadingId(null);
        return;
      }

      // Native sharing
      const fileName = `${agreement.agreement_title.replace(/\s+/g, '_') || 'ServiceAgreement'}_${agreement.id.substring(0,8)}.pdf`;
      const localFileUri = FileSystem.documentDirectory + fileName;
      
      Alert.alert('Download Started', 'Downloading agreement PDF for sharing...');
      const { uri: downloadedUri, status } = await FileSystem.downloadAsync(agreement.agreement_url, localFileUri);

      if (status !== 200) {
          throw new Error('Failed to download PDF.');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${agreement.agreement_title}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error sharing agreement:', error);
      Alert.alert('Error', `Could not share the agreement: ${error.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Initial data load and on focus
  useEffect(() => {
    fetchAgreements();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAgreements(); // Refetch when screen comes into focus
    });
    return unsubscribe; // Cleanup listener on unmount
  }, [fetchAgreements, navigation]);

  // Filter when selection changes or agreements data updates
  useEffect(() => {
    filterAgreements(agreements, selectedFilter);
  }, [selectedFilter, agreements]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAgreements(); // This will set refreshing to false in its finally block
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
              Provider: {item.service_providers?.business_name || item.provider_name || 'Unknown Provider'}
            </Text>
            
            <Text style={styles.cardSubText}>
              Service: {item.services?.title || item.service_name || 'Unknown Service'}
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
                style={[styles.agreementBtn, downloadingId === item.id && styles.agreementBtnDisabled]}
                onPress={() => handleShareAgreement(item)}
                disabled={downloadingId === item.id}
              >
                {downloadingId === item.id ? (
                  <ActivityIndicator size="small" color="#2E7D32" style={styles.actionIcon} />
                ) : (
                  <Feather name="share-2" size={16} color="#2E7D32" style={styles.actionIcon} />
                )}
                <Text style={styles.agreementBtnText}>{downloadingId === item.id ? 'Sharing...' : 'Share'}</Text>
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
  agreementBtnDisabled: {
    opacity: 0.5,
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
