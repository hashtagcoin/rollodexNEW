import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { COLORS } from '../../constants/theme';

// Safe date parser to handle potentially invalid date strings
const safelyFormatDate = (dateString, formatStr = 'PPP') => {
  try {
    if (!dateString) return 'Not specified';
    
    // Try to parse the date string safely
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    
    // Check if the date is valid
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

const ServiceAgreementDetailScreen = ({ route, navigation }) => {
  const { agreementId } = route.params;
  const { profile } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [agreement, setAgreement] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  useEffect(() => {
    fetchAgreementDetails();
  }, [agreementId]);
  
  const fetchAgreementDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch the agreement
      const { data: agreementData, error: agreementError } = await supabase
        .from('service_agreements')
        .select('*')
        .eq('id', agreementId)
        .single();
      
      if (agreementError) throw agreementError;
      
      setAgreement(agreementData);
      
      // Fetch client details
      if (agreementData.client_user_id) {
        const { data: clientData, error: clientError } = await supabase
          .from('user_profiles')
          .select('id, username, full_name, avatar_url, ndis_number, ndis_verified')
          .eq('id', agreementData.client_user_id)
          .single();
        
        if (!clientError) {
          setClientDetails(clientData);
        }
      }
      
      // Fetch service details if applicable
      if (agreementData.service_id) {
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('id, title, category, format, price')
          .eq('id', agreementData.service_id)
          .single();
        
        if (!serviceError) {
          setServiceDetails(serviceData);
        }
      }
    } catch (error) {
      console.error('Error fetching agreement details:', error);
      Alert.alert('Error', 'Failed to load agreement details');
    } finally {
      setLoading(false);
    }
  };
  
  const updateAgreementStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      
      const { error } = await supabase
        .from('service_agreements')
        .update({ status: newStatus })
        .eq('id', agreementId);
      
      if (error) throw error;
      
      setAgreement(prev => ({ ...prev, status: newStatus }));
      Alert.alert('Success', `Agreement ${newStatus.toLowerCase()} successfully`);
    } catch (error) {
      console.error('Error updating agreement status:', error);
      Alert.alert('Error', 'Failed to update agreement status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSignAgreement = async () => {
    try {
      setUpdatingStatus(true);
      
      const providerSigned = true;
      const providerSignatureDate = new Date().toISOString();
      
      const { error } = await supabase
        .from('service_agreements')
        .update({ 
          provider_signed: providerSigned,
          provider_signature_date: providerSignatureDate
        })
        .eq('id', agreementId);
      
      if (error) throw error;
      
      // Update local state
      setAgreement(prev => ({ 
        ...prev, 
        provider_signed: providerSigned,
        provider_signature_date: providerSignatureDate
      }));
      
      Alert.alert('Success', 'You have signed the agreement');
    } catch (error) {
      console.error('Error signing agreement:', error);
      Alert.alert('Error', 'Failed to sign agreement');
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  const openAgreementFile = async () => {
    if (agreement?.file_url) {
      try {
        const supported = await Linking.canOpenURL(agreement.file_url);
        
        if (supported) {
          await Linking.openURL(agreement.file_url);
        } else {
          Alert.alert('Error', 'Cannot open the file URL');
        }
      } catch (error) {
        console.error('Error opening agreement file:', error);
        Alert.alert('Error', 'Failed to open agreement file');
      }
    } else {
      Alert.alert('Error', 'No agreement file available');
    }
  };
  
  const renderStatusBadge = () => {
    if (!agreement) return null;
    
    const statusColors = {
      'pending': { bg: '#FFF9C4', text: '#F57F17' },
      'active': { bg: '#E0F7FA', text: '#0097A7' },
      'completed': { bg: '#E8F5E9', text: '#388E3C' },
      'canceled': { bg: '#FFEBEE', text: '#D32F2F' }
    };
    
    const statusColor = statusColors[agreement.status.toLowerCase()] || { bg: '#F5F5F5', text: '#757575' };
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
        <Text style={[styles.statusText, { color: statusColor.text }]}>
          {agreement.status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderActionButtons = () => {
    if (!agreement) return null;
    
    // If provider has not signed yet, show sign button
    if (!agreement.provider_signed) {
      return (
        <Button
          title="Sign Agreement"
          onPress={handleSignAgreement}
          loading={updatingStatus}
          style={styles.actionButton}
        />
      );
    }
    
    // If agreement is pending and provider has signed
    if (agreement.status.toLowerCase() === 'pending' && agreement.provider_signed) {
      return (
        <View style={styles.actionButtons}>
          <Button
            title="Activate Agreement"
            onPress={() => updateAgreementStatus('active')}
            loading={updatingStatus}
            style={styles.actionButton}
          />
          <Button
            title="Cancel Agreement"
            onPress={() => updateAgreementStatus('canceled')}
            loading={updatingStatus}
            style={[styles.actionButton, styles.secondaryButton]}
            textStyle={{ color: COLORS.primary }}
            outlined
          />
        </View>
      );
    }
    
    // If agreement is active
    if (agreement.status.toLowerCase() === 'active') {
      return (
        <View style={styles.actionButtons}>
          <Button
            title="Complete Agreement"
            onPress={() => updateAgreementStatus('completed')}
            loading={updatingStatus}
            style={styles.actionButton}
          />
          <Button
            title="Cancel Agreement"
            onPress={() => updateAgreementStatus('canceled')}
            loading={updatingStatus}
            style={[styles.actionButton, styles.secondaryButton]}
            textStyle={{ color: COLORS.primary }}
            outlined
          />
        </View>
      );
    }
    
    return null;
  };
  
  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Agreement Details"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }
  
  if (!agreement) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Agreement Details"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={COLORS.gray} />
          <Text style={styles.errorText}>Agreement not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Agreement Details"
        showBack
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>
            {agreement.agreement_number || `Agreement #${agreement.id.slice(0, 8)}`}
          </Text>
          {renderStatusBadge()}
        </View>
        
        {/* Client Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Client Information</Text>
          </View>
          
          {clientDetails ? (
            <View style={styles.clientInfoContainer}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: clientDetails.avatar_url || 'https://via.placeholder.com/100' }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>{clientDetails.full_name}</Text>
                <Text style={styles.clientUsername}>@{clientDetails.username}</Text>
                {clientDetails.ndis_number && (
                  <View style={styles.ndisContainer}>
                    <Text style={styles.ndisLabel}>NDIS Number:</Text>
                    <Text style={styles.ndisValue}>{clientDetails.ndis_number}</Text>
                    {clientDetails.ndis_verified && (
                      <MaterialIcons name="verified" size={16} color="#4CAF50" style={styles.verifiedIcon} />
                    )}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Client information not available</Text>
            </View>
          )}
        </Card>
        
        {/* Agreement Details */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Agreement Details</Text>
          </View>
          
          <View style={styles.detailsContainer}>
            {serviceDetails && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <FontAwesome5 name="concierge-bell" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{serviceDetails.title}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Feather name="calendar" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Start Date</Text>
                <Text style={styles.detailValue}>
                  {safelyFormatDate(agreement.start_date)}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Feather name="calendar" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>End Date</Text>
                <Text style={styles.detailValue}>
                  {safelyFormatDate(agreement.end_date)}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Feather name="file-text" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Agreement File</Text>
                {agreement.file_url ? (
                  <TouchableOpacity onPress={openAgreementFile}>
                    <Text style={styles.fileLink}>View Document</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.detailValue}>No file attached</Text>
                )}
              </View>
            </View>
          </View>
        </Card>
        
        {/* Signatures */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Signatures</Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Feather name="user" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Provider Signature</Text>
              {agreement.provider_signed ? (
                <Text style={styles.signedText}>
                  Signed on {safelyFormatDate(agreement.provider_signature_date)}
                </Text>
              ) : (
                <Text style={styles.unsignedText}>Not signed yet</Text>
              )}
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Feather name="user" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Client Signature</Text>
              {agreement.client_signed ? (
                <Text style={styles.signedText}>
                  Signed on {safelyFormatDate(agreement.client_signature_date)}
                </Text>
              ) : (
                <Text style={styles.unsignedText}>Not signed yet</Text>
              )}
            </View>
          </View>
        </Card>
        
        {/* Terms */}
        {agreement.terms && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Terms & Conditions</Text>
            </View>
            
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>{agreement.terms}</Text>
            </View>
          </Card>
        )}
        
        {/* Action Buttons */}
        {renderActionButtons()}
        
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
    // Airbnb-style card shadow
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clientUsername: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  ndisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ndisLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginRight: 4,
  },
  ndisValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  placeholderContainer: {
    padding: 16,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  detailsContainer: {
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailIconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  fileLink: {
    fontSize: 16,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  termsContainer: {
    padding: 16,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  signedText: {
    fontSize: 16,
    color: '#388E3C',
  },
  unsignedText: {
    fontSize: 16,
    color: '#F57F17',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    margin: 4,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
});

export default ServiceAgreementDetailScreen;
