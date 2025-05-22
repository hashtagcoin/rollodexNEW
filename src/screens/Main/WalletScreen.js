import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';
import { getUserClaims } from '../../services/claimsService';
import { COLORS, SIZES, FONTS } from '../../constants/theme';

const CATEGORY_LABELS = {
  core_support: 'Core Support',
  capacity_building: 'Capacity Building',
  capital_support: 'Capital Support',
};

const WalletScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [allUserClaims, setAllUserClaims] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Original AppHeader approach

  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  const fetchWalletAndClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Unable to fetch user');
      
      // Fetch wallet
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('total_balance, category_breakdown')
        .eq('user_id', user.id)
        .maybeSingle();
      // If wallet doesn't exist, create one with defaults
      if (!walletData) {
        const defaultWalletData = {
          user_id: user.id,
          total_balance: 15000,
          category_breakdown: {
            core_support: 8000,
            capacity_building: 5000,
            capital_support: 2000,
          },
        };
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert(defaultWalletData)
          .select('total_balance, category_breakdown')
          .maybeSingle();
        if (createError) throw createError;
        walletData = newWallet;
      }
      setWallet(walletData);

      // Fetch all claims for the user
      const claimsData = await getUserClaims();
      setAllUserClaims(claimsData || []);

    } catch (err) {
      setError(err.message || 'Failed to load wallet info');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletAndClaims();
  }, [fetchWalletAndClaims]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletAndClaims();
  };

  const handleNavigateToSubmitClaim = () => {
    navigation.navigate('SubmitClaimScreen');
  };

  // Payment methods are static, as in original
  const paymentMethods = [
    {
      icon: 'check-circle',
      textPrimary: 'Fully covered',
      textSecondary: 'Auto-claim',
      iconColor: '#28A745',
    },
    {
      icon: 'plus-circle',
      textPrimary: 'Partially covered',
      textSecondary: 'Gap payment prompt',
      iconColor: '#FFC107',
    },
    {
      icon: 'credit-card',
      textPrimary: 'Manual (for non-funded items)',
      textSecondary: '',
      iconColor: '#6C757D',
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader
        title="Wallet"
        navigation={navigation}
        canGoBack={true}
        onBackPressOverride={handleBackToDashboard}
      />
      {/* Wallet Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'overview' && styles.activeTabButton]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="wallet-outline" 
            size={18} 
            color={activeTab === 'overview' ? COLORS.primary : '#8E8E93'} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'claims' && styles.activeTabButton]}
          onPress={() => setActiveTab('claims')}
        >
          <Ionicons 
            name="document-text-outline" 
            size={18} 
            color={activeTab === 'claims' ? COLORS.primary : '#8E8E93'} 
          />
          <Text style={[styles.tabText, activeTab === 'claims' && styles.activeTabText]}>Claims</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'payment' && styles.activeTabButton]}
          onPress={() => setActiveTab('payment')}
        >
          <Ionicons 
            name="card-outline" 
            size={18} 
            color={activeTab === 'payment' ? COLORS.primary : '#8E8E93'} 
          />
          <Text style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>Payment</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.contentScrollView}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} colors={[COLORS.primary]} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your wallet...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : wallet ? (
          <>
            {activeTab === 'overview' && (
              <>
                {/* Total Balance Card */}
                <LinearGradient
                  colors={['#3A76F0', '#1E90FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.balanceCard}
                >
                  <View style={styles.balanceCardContent}>
                    <Text style={styles.balanceLabel}>Total NDIS Balance</Text>
                    <Text style={styles.balanceValue}>${Math.floor(wallet.total_balance)?.toLocaleString() || '0'}</Text>
                    <View style={styles.balanceCardChip}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.white} />
                      <Text style={styles.balanceCardChipText}>Updated Today</Text>
                    </View>
                  </View>
                  <View style={styles.balanceCardIllustration}>
                    <Ionicons name="wallet" size={48} color="rgba(255,255,255,0.2)" />
                  </View>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                  <TouchableOpacity 
                    style={styles.quickActionButton} 
                    onPress={handleNavigateToSubmitClaim}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#E8F3FF' }]}>
                      <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                    </View>
                    <Text style={styles.quickActionText} numberOfLines={1}>New Claim</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => navigation.navigate('ViewClaimsScreen')}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#FFF2E8' }]}>
                      <Ionicons name="document-text-outline" size={20} color="#FF9500" />
                    </View>
                    <Text style={styles.quickActionText} numberOfLines={1}>View Claims</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.quickActionButton}>
                    <View style={[styles.quickActionIcon, { backgroundColor: '#E8FFF0' }]}>
                      <Ionicons name="analytics-outline" size={20} color="#34C759" />
                    </View>
                    <Text style={styles.quickActionText} numberOfLines={1}>History</Text>
                  </TouchableOpacity>
                </View>

            {/* Category Breakdown with Modern Horizontal Bar Graph */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Category Breakdown</Text>
                <TouchableOpacity style={styles.cardAction}>
                  <Text style={styles.cardActionText}>Details</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.barGraphContainer}>
                {(() => {
                  const breakdown = wallet.category_breakdown || {};
                  const total = Object.values(breakdown).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0) || 1;
                  const colorMap = ['#007AFF', '#34C759', '#FF9500'];
                  const iconMap = ['briefcase-outline', 'school-outline', 'medical-outline'];
                  
                  return Object.entries(breakdown).map(([key, value], idx) => {
                    const percent = Math.round(((typeof value === 'number' ? value : 0) / total) * 100);
                    return (
                      <View key={key} style={styles.barGraphRow}>
                        {/* Category Label */}
                        <Text style={styles.barLabel}>{CATEGORY_LABELS[key] || key}</Text>
                        
                        {/* Simplified Bar Graph */}
                        <View style={styles.barGraphDetails}>
                          <View style={styles.lineTrack}>
                            <View 
                              style={[styles.lineFill, { 
                                width: `${percent}%`, 
                                backgroundColor: colorMap[idx % colorMap.length],
                              }]} 
                            />
                          </View>
                          
                          {/* Dollar Amount */}
                          <Text style={styles.barValue}>${value?.toLocaleString() || '0.00'}</Text>
                        </View>
                        
                        {/* Percentage Indicator */}
                        <Text style={styles.barPercent}>{percent}% of total</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </View>
            </>)}
            
            {activeTab === 'claims' && (
              <>
                {/* My Claims */}
                <View style={styles.claimsCard}>
                  <Text style={styles.sectionTitle}>My Claims</Text>
              {allUserClaims.length === 0 ? (
                <Text style={styles.emptyText}>You haven't submitted any claims yet.</Text>
              ) : (
                allUserClaims.map((claim) => (
                  <View key={claim.id} style={styles.claimItemCard}> 
                    <View style={styles.claimItemHeader}>
                        <Text style={styles.claimTitle}>{claim.claim_title || 'Claim'}</Text>
                        <Text style={[styles.claimStatusBadge, styles[claim.status?.toLowerCase()]]}>
                            {claim.status?.replace('_', ' ') || 'Unknown'}
                        </Text>
                    </View>
                    <View style={styles.claimItemRow}>
                        <Feather name="dollar-sign" size={16} color={COLORS.darkgray} />
                        <Text style={styles.claimDetailText}>Amount: ${claim.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</Text>
                    </View>
                    <View style={styles.claimItemRow}>
                        <Feather name="calendar" size={16} color={COLORS.darkgray} />
                        <Text style={styles.claimDetailText}>Service Date: {claim.service_date ? new Date(claim.service_date).toLocaleDateString() : 'N/A'}</Text>
                    </View>
                    {claim.ndis_category && (
                        <View style={styles.claimItemRow}>
                            <Feather name="tag" size={16} color={COLORS.darkgray} />
                            <Text style={styles.claimDetailText}>Category: {claim.ndis_category}</Text>
                        </View>
                    )}
                    <View style={styles.claimItemRow}>
                        <Feather name="clock" size={16} color={COLORS.darkgray} />
                        <Text style={styles.claimDetailText}>Submitted: {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'}</Text>
                    </View>
                    {claim.document_url && (
                         <TouchableOpacity onPress={() => Alert.alert('Open Document', `Would open: ${claim.document_url}`)} style={styles.documentLink}>
                            <Feather name="file-text" size={16} color={COLORS.primary} />
                            <Text style={styles.documentLinkText}>View Document</Text>
                        </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
              </View>
            </>
            )}
            {activeTab === 'payment' && (
              <>
                {/* Payment Methods */}
                <View style={styles.paymentMethodsCard}>
                  <Text style={styles.sectionTitle}>Payment Methods</Text>
              {paymentMethods.map((method, idx) => (
                <View key={idx} style={styles.paymentMethodRow}>
                  <Feather name={method.icon} size={22} color={method.iconColor} style={styles.paymentMethodIcon} />
                  <View style={styles.paymentMethodTextContainer}>
                    <Text style={styles.paymentMethodTextPrimary}>{method.textPrimary}</Text>
                    {method.textSecondary ? (
                      <Text style={styles.paymentMethodTextSecondary}>→ {method.textSecondary}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
                </View>
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: `${COLORS.primary}10`,
  },
  tabText: {
    ...FONTS.body4,
    marginLeft: 4,
    color: '#8E8E93',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Content Area
  contentScrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 32,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    ...FONTS.body3,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...FONTS.body3,
    color: '#FF3B30',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '500',
  },
  
  // Balance Card
  balanceCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceCardContent: {
    flex: 3,
    padding: 20,
  },
  balanceCardIllustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    ...FONTS.body3,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceValue: {
    ...FONTS.h1,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 32,
    marginBottom: 12,
  },
  balanceCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  balanceCardChipText: {
    ...FONTS.body5,
    color: COLORS.white,
    marginLeft: 4,
  },
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10, // Reduced from 16
    paddingHorizontal: 8, // Reduced horizontal padding
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 36, // Reduced from 48
    height: 36, // Reduced from 48
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6, // Reduced from 8
  },
  quickActionText: {
    ...FONTS.body4,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center', // Ensure centered text
    width: '100%', // Ensure text takes full width for proper centering
  },
  
  // Cards
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    ...FONTS.h4,
    color: '#333',
    fontWeight: '600',
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginRight: 4,
  },
  claimsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: '#333',
    marginBottom: 16,
    fontWeight: '600',
  },
  claimItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  claimItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  claimTitle: {
    ...FONTS.h5,
    color: COLORS.black,
    fontWeight: '600',
  },
  claimStatusBadge: {
    ...FONTS.body5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    color: COLORS.white,
    textTransform: 'capitalize',
    fontWeight: '500',
    overflow: 'hidden',
  },
  pending: { backgroundColor: '#F5A623' },
  approved: { backgroundColor: '#34C759' },
  rejected: { backgroundColor: '#FF3B30' },
  requires_information: { backgroundColor: '#007AFF' },
  processing: { backgroundColor: '#5856D6' },
  barGraphContainer: {
    marginTop: 8,
  },
  barGraphRow: {
    marginBottom: 22,
  },
  barLabel: {
    ...FONTS.h4,  // 50% larger than body4
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  barGraphDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barPercent: {
    ...FONTS.body4, // Increased from body5
    color: '#8E8E93',
    marginTop: 4,
  },
  barValue: {
    ...FONTS.h4, // 50% larger than body4
    color: '#333',
    fontWeight: '600',
    minWidth: 100, // More space for larger text
    textAlign: 'right',
    marginLeft: 12,
  },
  
  // Line graph styles
  lineGraphContainer: {
    marginTop: 4,
    marginBottom: 16,
  },
  lineTrack: {
    height: 12, // Increased from 4 to 12 - significantly thicker
    backgroundColor: '#F2F2F7',
    borderRadius: 8, // Increased rounded corners
    overflow: 'hidden', // Changed from visible to hidden to enforce rounded corners
    position: 'relative',
    marginBottom: 8,
    flex: 1,
    marginRight: 16,
  },
  lineFill: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 8, // Matching border radius for rounded corners
  },
  lineMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -2,
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  scaleText: {
    ...FONTS.body5,
    color: '#8E8E93',
    fontSize: 10,
  },
  claimItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base / 2,
  },
  claimDetailText: {
    ...FONTS.body4,
    color: COLORS.darkgray,
    marginLeft: SIZES.base,
  },
  documentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.base,
  },
  documentLinkText: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginLeft: SIZES.base / 2,
    textDecorationLine: 'underline',
  },
  emptyText: {
    ...FONTS.body3,
    color: COLORS.darkgray,
    textAlign: 'center',
    paddingVertical: SIZES.padding,
  },
  paymentMethodsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 4,
  },
  paymentMethodIcon: {
    marginRight: 10,
  },
  paymentMethodTextContainer: {
    flex: 1,
  },
  paymentMethodTextPrimary: {
    ...FONTS.body4,
    color: COLORS.black,
    fontWeight: '600',
  },
  paymentMethodTextSecondary: {
    ...FONTS.body5,
    color: COLORS.gray,
  },
  errorText: {
    ...FONTS.body3,
    color: COLORS.RED,
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default WalletScreen;
