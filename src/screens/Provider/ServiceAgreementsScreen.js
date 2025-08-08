import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform  } from 'react-native';
import { Alert } from '../../utils/alert';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { COLORS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import AppHeader from '../../components/layout/AppHeader';

const ServiceAgreementsScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [agreements, setAgreements] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisteredProvider, setIsRegisteredProvider] = useState(true);
  
  // Fetch agreements when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAgreements();
      fetchTemplates();
    }, [profile, activeTab])
  );
  
  // Fetch provider's service agreements
  const fetchAgreements = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      // First get the provider ID from service_providers table
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (providerError) {
        console.error('Error fetching provider ID:', providerError);
        setAgreements([]);
        return;
      }
      
      if (!providerData) {
        // User is not registered as a service provider
        console.log('User is not registered as a service provider');
        setAgreements([]);
        setIsRegisteredProvider(false);
        return;
      }
      
      setIsRegisteredProvider(true);
      
      // Get service agreements provided by this user
      let query = supabase
        .from('service_agreements')
        .select('*, services(title)')
        .eq('provider_id', providerData.id);
      
      if (activeTab === 'active') {
        query = query.in('status', ['active', 'pending']);
      } else if (activeTab === 'completed') {
        query = query.eq('status', 'completed');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch client details separately for each agreement
      const agreementsWithClients = await Promise.all((data || []).map(async (agreement) => {
        if (agreement.client_id) {
          const { data: clientData } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', agreement.client_id)
            .single();
          
          return {
            ...agreement,
            client: clientData || { full_name: 'Unknown Client' }
          };
        }
        return agreement;
      }));
      
      setAgreements(agreementsWithClients);
    } catch (err) {
      console.error('Error fetching service agreements:', err);
      // Silent error handling - no alert when agreements fail to load
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch agreement templates
  const fetchTemplates = async () => {
    if (!profile?.id) return;
    
    try {
      // First get the provider ID from service_providers table
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (providerError) {
        console.error('Error fetching provider ID:', providerError);
        setTemplates([]);
        return;
      }
      
      if (!providerData) {
        // User is not registered as a service provider
        console.log('User is not registered as a service provider');
        setTemplates([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('service_agreement_templates')
        .select('*')
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching agreement templates:', err);
    }
  };
  
  // Upload new agreement template
  const uploadTemplate = async () => {
    try {
      const document = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      
      if (document.canceled) {
        return;
      }
      
      setLoading(true);
      
      // First get the provider ID from service_providers table
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      
      if (providerError || !providerData) {
        throw new Error('Unable to find your service provider profile');
      }
      
      // Create a unique file name
      const fileName = `${profile.id}_${Date.now()}.pdf`;
      
      // Upload to Supabase Storage
      const fileUri = document.assets[0].uri;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }
      
      const { data, error } = await supabase.storage
        .from('service_agreements')
        .upload(fileName, {
          uri: fileUri,
          type: 'application/pdf',
          name: fileName,
        });
        
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('service_agreements')
        .getPublicUrl(fileName);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Could not get public URL for template');
      }
      
      // Save template record in the database
      const { error: templateError } = await supabase
        .from('service_agreement_templates')
        .insert({
          provider_id: providerData.id,
          title: document.assets[0].name || 'New Agreement Template',
          file_url: urlData.publicUrl,
          file_name: fileName
        });
        
      if (templateError) throw templateError;
      
      // Refresh templates
      fetchTemplates();
      
      Alert.alert('Success', 'Template uploaded successfully');
    } catch (err) {
      console.error('Error uploading template:', err);
      Alert.alert('Error', 'Failed to upload template');
    } finally {
      setLoading(false);
    }
  };
  
  // Create new agreement
  const createNewAgreement = () => {
    if (templates.length === 0) {
      Alert.alert(
        'No Templates',
        'You need to upload a template first before creating a service agreement.',
        [
          { text: 'Cancel' },
          { text: 'Upload Template', onPress: uploadTemplate }
        ]
      );
      return;
    }
    
    navigation.navigate('CreateServiceAgreement', { templates });
  };
  
  // Filter agreements based on search query
  const filteredAgreements = Array.isArray(agreements) ? agreements.filter(agreement => {
    if (!agreement) return false;
    
    const lowerCaseQuery = searchQuery?.toLowerCase() || '';
    return (
      (agreement.services?.title || '').toLowerCase().includes(lowerCaseQuery) ||
      (agreement.client?.full_name || '').toLowerCase().includes(lowerCaseQuery) ||
      (agreement.agreement_number || '').toLowerCase().includes(lowerCaseQuery)
    );
  }) : [];
  
  // Render agreement item
  const renderAgreementItem = ({ item }) => {
    // Format date
    const createdDate = new Date(item.created_at);
    const formattedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
    
    return (
      <TouchableOpacity 
        style={styles.agreementCard}
        onPress={() => navigation.navigate('ServiceAgreementDetail', { agreementId: item.id })}
      >
        <View style={styles.agreementHeader}>
          <Text style={styles.agreementTitle}>{item.services?.title || 'Service Agreement'}</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: 
              item.status === 'active' ? '#4CAF50' : 
              item.status === 'pending' ? '#FF9800' : 
              item.status === 'completed' ? '#9C27B0' : 
              '#9E9E9E'
          }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.agreementClient}>
          <Ionicons name="person-outline" size={16} color="#666" /> {item.client?.full_name || 'Client'}
        </Text>
        
        <Text style={styles.agreementNumber}>
          <MaterialCommunityIcons name="identifier" size={16} color="#666" /> Agreement #: {item.agreement_number || 'N/A'}
        </Text>
        
        <Text style={styles.agreementDate}>
          <Ionicons name="calendar-outline" size={16} color="#666" /> Created: {formattedDate}
        </Text>
        
        <View style={styles.signatureStatus}>
          <Text style={styles.signatureLabel}>Signatures:</Text>
          <View style={styles.signatureBadges}>
            <View style={[styles.signatureBadge, { backgroundColor: item.provider_signed ? '#4CAF50' : '#F44336' }]}>
              <Text style={styles.signatureBadgeText}>Provider</Text>
              <Ionicons name={item.provider_signed ? "checkmark" : "close"} size={12} color="#FFFFFF" />
            </View>
            <View style={[styles.signatureBadge, { backgroundColor: item.client_signed ? '#4CAF50' : '#F44336' }]}>
              <Text style={styles.signatureBadgeText}>Client</Text>
              <Ionicons name={item.client_signed ? "checkmark" : "close"} size={12} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
      <AppHeader
        title="Service Agreements"
        navigation={navigation}
        showBackButton={true}
      />
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search agreements..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Tab buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'active' && styles.activeTabButton]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'completed' && styles.activeTabButton]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'templates' && styles.activeTabButton]}
          onPress={() => setActiveTab('templates')}
        >
          <Text style={[styles.tabText, activeTab === 'templates' && styles.activeTabText]}>
            Templates
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Show message if user is not registered as provider */}
      {!isRegisteredProvider ? (
        <View style={styles.emptyContainer}>
          <Feather name="alert-circle" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            You need to be registered as a service provider to access this feature.
          </Text>
          <Text style={[styles.emptyText, { fontSize: 14, marginTop: 8 }]}>
            Please complete your provider registration first.
          </Text>
        </View>
      ) : (
      <>
      {/* Agreements List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : activeTab === 'templates' ? (
        <View style={styles.templateContainer}>
          <Text style={styles.templateTitle}>Agreement Templates</Text>
          <Text style={styles.templateDescription}>
            Upload your service agreement templates here to use when creating new agreements for clients.
          </Text>
          
          {templates.length > 0 ? (
            <FlatList
              data={templates}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.templateItem}>
                  <Feather name="file-text" size={24} color={COLORS.primary} />
                  <View style={styles.templateDetails}>
                    <Text style={styles.templateName}>{item.title}</Text>
                    <Text style={styles.templateDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="eye" size={24} color="#666" />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.templateList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No templates uploaded yet</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={uploadTemplate}
          >
            <Text style={styles.primaryButtonText}>Upload Template</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAgreements}
          keyExtractor={item => item.id}
          renderItem={renderAgreementItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No agreements match your search' : 
                  (activeTab === 'active' ? 'No active agreements' : 'No completed agreements')}
              </Text>
              {!searchQuery && activeTab === 'active' && (
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={createNewAgreement}
                >
                  <Text style={styles.primaryButtonText}>Create New Agreement</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
      
      {/* Floating action button for creating new agreement */}
      {activeTab !== 'templates' && filteredAgreements.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={createNewAgreement}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      </>
      )}
      </View>
    </KeyboardAvoidingView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
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
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  agreementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agreementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  agreementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  agreementClient: {
    fontSize: 15,
    color: '#444',
    marginBottom: 8,
  },
  agreementNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  agreementDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  signatureStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  signatureLabel: {
    fontSize: 14,
    color: '#444',
    marginRight: 8,
  },
  signatureBadges: {
    flexDirection: 'row',
  },
  signatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  signatureBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginRight: 4,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    flex: 1,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  templateContainer: {
    flex: 1,
    padding: 16,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  templateList: {
    marginBottom: 16,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateDetails: {
    flex: 1,
    marginLeft: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  templateDate: {
    fontSize: 14,
    color: '#666',
  },
});

export default ServiceAgreementsScreen;
