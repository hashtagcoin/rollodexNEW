import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  const scrollViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [allUserClaims, setAllUserClaims] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Performance optimization refs for caching and fetch control
  const cacheRef = useRef({
    wallet: null,
    claims: null,
    timestamp: null
  });
  const fetchInProgressRef = useRef(false);
  
  // Cache timeout (5 minutes)
  const CACHE_TIMEOUT = 5 * 60 * 1000;

  const debugTiming = (operation, startTime) => {
    const duration = Date.now() - startTime;
    console.log(`[Wallet] ${operation}: ${duration}ms`);
  };

  // Reset scroll position when tab is focused
  useFocusEffect(
    useCallback(() => {
      console.log('[WalletScreen] Focus effect: scrolling to top');
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      
      // Check cache for instant loading on focus
      const cache = cacheRef.current;
      const cacheValid = cache.timestamp && Date.now() - cache.timestamp < CACHE_TIMEOUT;
      
      if (cache.wallet && cache.claims && cacheValid) {
        console.log('[Wallet] Using cached data for instant loading');
        setWallet(cache.wallet);
        setAllUserClaims(cache.claims);
        setLoading(false);
        setActiveTab('overview');
      } else {
        // Only fetch if no valid cache
        fetchWalletAndClaims();
      }
      
      setActiveTab('overview');
    }, [])
  );
  
  // Original AppHeader approach

  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  const fetchWalletAndClaims = useCallback(async () => {
    const startTime = Date.now();
    if (fetchInProgressRef.current) {
      console.log('[Wallet] Skipping fetch due to ongoing request');
      return;
    }
    fetchInProgressRef.current = true;

    // Check cache
    if (cacheRef.current.timestamp && Date.now() - cacheRef.current.timestamp < CACHE_TIMEOUT) {
      console.log('[Wallet] Loading from cache');
      setWallet(cacheRef.current.wallet);
      setAllUserClaims(cacheRef.current.claims);
      setLoading(false);
      setRefreshing(false);
      fetchInProgressRef.current = false;
      debugTiming('Cache load', startTime);
      return;
    }

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

      // Update cache
      cacheRef.current.wallet = walletData;
      cacheRef.current.claims = claimsData;
      cacheRef.current.timestamp = Date.now();

    } catch (err) {
      setError(err.message || 'Failed to load wallet info');
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetchInProgressRef.current = false;
      debugTiming('Fetch and cache update', startTime);
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
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="wallet-outline" 
            size={18} 
            color={activeTab === 'overview' ? COLORS.primary : '#8E8E93'} 
            style={styles.tabIcon}
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'overview' && styles.activeTabText
          ]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'claims' && styles.activeTab]}
          onPress={() => setActiveTab('claims')}
        >
          <Ionicons 
            name="document-text-outline" 
            size={18} 
            color={activeTab === 'claims' ? COLORS.primary : '#8E8E93'} 
            style={styles.tabIcon}
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'claims' && styles.activeTabText
          ]}>
            Claims
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
          onPress={() => setActiveTab('payment')}
        >
          <Ionicons 
            name="card-outline" 
            size={18} 
            color={activeTab === 'payment' ? COLORS.primary : '#8E8E93'} 
            style={styles.tabIcon}
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'payment' && styles.activeTabText
          ]}>
            Payment
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={scrollViewRef}
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

                {/* Category Breakdown with Modern Cards */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Category Breakdown</Text>
                    <TouchableOpacity style={styles.sectionAction}>
                      <Text style={styles.sectionActionText}>Details</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.categoryList}>
                    {wallet.category_breakdown && Object.entries(wallet.category_breakdown).map(([key, value]) => (
                      <View key={key} style={styles.categoryCard}>
                        <View style={[styles.categoryIndicator, { backgroundColor: key === 'core_support' ? '#4CAF50' : key === 'capacity_building' ? '#2196F3' : '#FF9800' }]} />
                        <View style={styles.categoryContent}>
                          <Text style={styles.categoryLabel}>{CATEGORY_LABELS[key]}</Text>
                          <View style={styles.categoryValueRow}>
                            <Text style={styles.categoryAmount}>${value?.toLocaleString() || '0'}</Text>
                            <Text style={styles.categoryPercentage}>
                              {Math.round((value / wallet.total_balance) * 100)}%
                            </Text>
                          </View>
                        </View>
                        <View style={styles.progressContainer}>
                          <View 
                            style={[
                              styles.progressBar, 
                              { width: `${Math.min(100, Math.round((value / wallet.total_balance) * 100))}%`, backgroundColor: key === 'core_support' ? '#4CAF50' : key === 'capacity_building' ? '#2196F3' : '#FF9800' }
                            ]} 
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </>)}
            
            {activeTab === 'claims' && (
              <>
                {/* My Claims */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Claims</Text>
                    <TouchableOpacity style={styles.sectionAction}>
                      <Text style={styles.sectionActionText}>View All</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  {allUserClaims.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="document-text-outline" size={60} color="#DADADA" />
                      <Text style={styles.emptyTitle}>No claims found</Text>
                      <Text style={styles.emptySubtitle}>You haven't submitted any claims yet</Text>
                      <TouchableOpacity 
                        style={styles.emptyButton}
                        onPress={handleNavigateToSubmitClaim}
                      >
                        <Text style={styles.emptyButtonText}>Submit a Claim</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      {allUserClaims.map((claim) => {
                        const statusColor = claim.status === 'approved' ? '#34C759' : 
                                           claim.status === 'pending' ? '#FF9500' : 
                                           claim.status === 'rejected' ? '#FF3B30' : '#8E8E93';
                        
                        return (
                          <TouchableOpacity 
                            key={claim.id} 
                            style={styles.claimCard}
                            onPress={() => Alert.alert('View Claim', `Details for claim: ${claim.claim_title || 'Claim'}`)} 
                            activeOpacity={0.8}
                          > 
                            <View style={styles.claimDateColumn}>
                              <Text style={styles.claimDate}>
                                {claim.service_date ? new Date(claim.service_date).toLocaleDateString('en-US', {day: '2-digit', month: 'short'}) : 'N/A'}
                              </Text>
                              <Text style={styles.claimAmount}>${claim.amount?.toFixed(2) || '0.00'}</Text>
                              <View style={[styles.statusChip, { backgroundColor: `${statusColor}20` }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                  {claim.status?.charAt(0).toUpperCase() + claim.status?.slice(1) || 'Unknown'}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={styles.claimContentColumn}>
                              <Text style={styles.claimTitle} numberOfLines={1}>{claim.claim_title || 'Claim'}</Text>
                              {claim.ndis_category && (
                                <Text style={styles.claimCategory} numberOfLines={1}>Category: {claim.ndis_category}</Text>
                              )}
                              
                              <View style={styles.claimDetails}>
                                <View style={styles.claimDetailItem}>
                                  <Ionicons name="time-outline" size={14} color="#666" style={styles.detailIcon} />
                                  <Text style={styles.detailText}>
                                    {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'}
                                  </Text>
                                </View>
                                {claim.document_url && (
                                  <View style={styles.claimDetailItem}>
                                    <Ionicons name="document-outline" size={14} color="#666" style={styles.detailIcon} />
                                    <Text style={styles.detailText}>Receipt attached</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            
                            <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
            </>
            )}
            {activeTab === 'payment' && (
              <>
                {/* Payment Methods */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Payment Methods</Text>
                    <TouchableOpacity style={styles.sectionAction}>
                      <Text style={styles.sectionActionText}>Manage</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.paymentMethodsList}>
                    {paymentMethods.map((method, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.paymentMethodCard}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.paymentIconContainer, { backgroundColor: `${method.iconColor}15` }]}>
                          <Feather name={method.icon} size={22} color={method.iconColor} />
                        </View>
                        <View style={styles.paymentContentColumn}>
                          <Text style={styles.paymentMethodTitle}>{method.textPrimary}</Text>
                          {method.textSecondary ? (
                            <Text style={styles.paymentMethodSubtitle}>{method.textSecondary}</Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron} />
                      </TouchableOpacity>
                    ))}
                    
                    <TouchableOpacity style={styles.addPaymentButton}>
                      <View style={styles.addIconContainer}>
                        <Ionicons name="add" size={22} color={COLORS.primary} />
                      </View>
                      <Text style={styles.addPaymentText}>Add payment method</Text>
                    </TouchableOpacity>
                  </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
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
  // Section Container Styles
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    ...FONTS.h4,
    fontWeight: '600',
    color: '#333',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginRight: 4,
  },
  
  // Category Card Styles
  categoryList: {
    padding: 16,
  },
  categoryCard: {
    marginBottom: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
  },
  categoryIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 16,
  },
  categoryContent: {
    marginLeft: 10,
    marginBottom: 10,
  },
  categoryLabel: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryAmount: {
    ...FONTS.h4,
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoryPercentage: {
    ...FONTS.body4,
    color: '#666',
  },
  progressContainer: {
    height: 6,
    width: '100%',
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  
  // Claims Card Styles
  claimCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
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
  
  // Payment Methods
  paymentMethodsList: {
    padding: 16,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentContentColumn: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderStyle: 'dashed',
  },
  addIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    marginRight: 16,
  },
  addPaymentText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
  },
  emptyText: {
    ...FONTS.body3,
    color: COLORS.darkgray,
    textAlign: 'center',
    paddingVertical: SIZES.padding,
  },
  errorText: {
    ...FONTS.body3,
    color: COLORS.RED,
    textAlign: 'center',
    marginVertical: 20,
  }
});

export default WalletScreen;
