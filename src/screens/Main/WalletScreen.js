import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { Alert } from '../../utils/alert';
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
        // Don't fetch when we have valid cache
      } else {
        console.log('[Wallet] No valid cache, fetching fresh data');
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
              <View style={styles.claimsTabContainer}>
                {/* Claims Header with Stats */}
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.claimsHeaderCard}
                >
                  <View style={styles.claimsHeaderContent}>
                    <View style={styles.claimsStatsRow}>
                      <View style={styles.claimsStat}>
                        <Text style={styles.claimsStatNumber}>{allUserClaims.length}</Text>
                        <Text style={styles.claimsStatLabel}>Total Claims</Text>
                      </View>
                      <View style={styles.claimsStatDivider} />
                      <View style={styles.claimsStat}>
                        <Text style={styles.claimsStatNumber}>
                          {allUserClaims.filter(c => c.status === 'approved').length}
                        </Text>
                        <Text style={styles.claimsStatLabel}>Approved</Text>
                      </View>
                      <View style={styles.claimsStatDivider} />
                      <View style={styles.claimsStat}>
                        <Text style={styles.claimsStatNumber}>
                          ${allUserClaims.reduce((sum, claim) => sum + (claim.amount || 0), 0).toFixed(0)}
                        </Text>
                        <Text style={styles.claimsStatLabel}>Total Value</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>

                {/* Quick Actions for Claims */}
                <View style={styles.claimsActionsContainer}>
                  <TouchableOpacity 
                    style={styles.claimsActionButton}
                    onPress={handleNavigateToSubmitClaim}
                  >
                    <LinearGradient
                      colors={['#4facfe', '#00f2fe']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.claimsActionGradient}
                    >
                      <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                      <Text style={styles.claimsActionText}>New Claim</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.claimsActionButton}
                    onPress={() => navigation.navigate('ViewClaimsScreen')}
                  >
                    <View style={styles.claimsActionSecondary}>
                      <Ionicons name="eye-outline" size={24} color="#667eea" />
                      <Text style={styles.claimsActionSecondaryText}>View All</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Claims List */}
                {allUserClaims.length === 0 ? (
                  <View style={styles.claimsEmptyState}>
                    <View style={styles.emptyStateIcon}>
                      <Ionicons name="document-text-outline" size={64} color="#E1E5E9" />
                    </View>
                    <Text style={styles.emptyStateTitle}>No Claims Yet</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Start by submitting your first NDIS claim to track your expenses
                    </Text>
                    <TouchableOpacity 
                      style={styles.emptyStateButton}
                      onPress={handleNavigateToSubmitClaim}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.emptyStateButtonText}>Submit First Claim</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.claimsListContainer}>
                    <Text style={styles.claimsListTitle}>Recent Claims</Text>
                    {allUserClaims.slice(0, 5).map((claim, index) => {
                      const statusConfig = {
                        approved: { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle' },
                        pending: { color: '#F59E0B', bg: '#FEF3C7', icon: 'time' },
                        rejected: { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle' },
                        processing: { color: '#8B5CF6', bg: '#EDE9FE', icon: 'sync' }
                      };
                      
                      const status = statusConfig[claim.status] || statusConfig.processing;
                      
                      return (
                        <TouchableOpacity 
                          key={claim.id} 
                          style={[styles.modernClaimCard, { marginTop: index === 0 ? 0 : 12 }]}
                          onPress={() => Alert.alert('View Claim', `Details for claim: ${claim.claim_title || 'Claim'}`)}
                          activeOpacity={0.8}
                        > 
                          <View style={styles.claimCardHeader}>
                            <View style={styles.claimTitleRow}>
                              <Text style={styles.modernClaimTitle} numberOfLines={1}>
                                {claim.claim_title || 'Untitled Claim'}
                              </Text>
                              <View style={[styles.modernStatusChip, { backgroundColor: status.bg }]}>
                                <Ionicons name={status.icon} size={12} color={status.color} />
                                <Text style={[styles.modernStatusText, { color: status.color }]}>
                                  {claim.status?.charAt(0).toUpperCase() + claim.status?.slice(1) || 'Processing'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.modernClaimAmount}>${(claim.amount || 0).toFixed(2)}</Text>
                          </View>

                          <View style={styles.claimCardDetails}>
                            <View style={styles.claimDetailRow}>
                              <Ionicons name="calendar-outline" size={14} color="#64748B" />
                              <Text style={styles.modernDetailText}>
                                {claim.service_date ? new Date(claim.service_date).toLocaleDateString('en-US', { 
                                  month: 'short', day: 'numeric', year: 'numeric' 
                                }) : new Date(claim.created_at).toLocaleDateString('en-US', { 
                                  month: 'short', day: 'numeric', year: 'numeric' 
                                })}
                              </Text>
                            </View>
                            
                            {claim.ndis_category && (
                              <View style={styles.claimDetailRow}>
                                <Ionicons name="pricetag-outline" size={14} color="#64748B" />
                                <Text style={styles.modernDetailText}>{claim.ndis_category}</Text>
                              </View>
                            )}

                            {claim.document_url && (
                              <View style={styles.claimDetailRow}>
                                <Ionicons name="document-attach-outline" size={14} color="#10B981" />
                                <Text style={[styles.modernDetailText, { color: '#10B981' }]}>Receipt attached</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    
                    {allUserClaims.length > 5 && (
                      <TouchableOpacity 
                        style={styles.viewAllClaimsButton}
                        onPress={() => navigation.navigate('ViewClaimsScreen')}
                      >
                        <Text style={styles.viewAllClaimsText}>View All {allUserClaims.length} Claims</Text>
                        <Ionicons name="arrow-forward" size={16} color="#667eea" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
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
                    <TouchableOpacity 
                      style={styles.paymentMethodCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('TransactionList', { transactionType: 'fully_funded' })}
                    >
                      <View style={[styles.paymentIconContainer, { backgroundColor: '#28A74515' }]}>
                        <Feather name="check-circle" size={22} color="#28A745" />
                      </View>
                      <View style={styles.paymentContentColumn}>
                        <Text style={styles.paymentMethodTitle}>Fully covered</Text>
                        <Text style={styles.paymentMethodSubtitle}>Auto-claim</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.paymentMethodCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('TransactionList', { transactionType: 'partial_payment' })}
                    >
                      <View style={[styles.paymentIconContainer, { backgroundColor: '#FFC10715' }]}>
                        <Feather name="plus-circle" size={22} color="#FFC107" />
                      </View>
                      <View style={styles.paymentContentColumn}>
                        <Text style={styles.paymentMethodTitle}>Partially covered</Text>
                        <Text style={styles.paymentMethodSubtitle}>Gap payment prompt</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.paymentMethodCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('TransactionList', { transactionType: 'manual_payment' })}
                    >
                      <View style={[styles.paymentIconContainer, { backgroundColor: '#6C757D15' }]}>
                        <Feather name="credit-card" size={22} color="#6C757D" />
                      </View>
                      <View style={styles.paymentContentColumn}>
                        <Text style={styles.paymentMethodTitle}>Manual (for non-funded items)</Text>
                        <Text style={styles.paymentMethodSubtitle}></Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.addPaymentButton}
                      onPress={() => navigation.navigate('AddPaymentMethod')}
                    >
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
  
  // Enhanced Claims Card Styles
  claimCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
  },
  
  // Enhanced Claim Card Styles
  claimDateColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    paddingRight: 16,
  },
  claimDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  claimAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  claimContentColumn: {
    flex: 1,
    paddingRight: 12,
  },
  claimTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  claimCategory: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  claimDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  claimDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    alignSelf: 'center',
  },

  // Modern Claims Tab Styles
  claimsTabContainer: {
    paddingBottom: 20,
  },
  claimsHeaderCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  claimsHeaderContent: {
    alignItems: 'center',
  },
  claimsStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  claimsStat: {
    flex: 1,
    alignItems: 'center',
  },
  claimsStatNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  claimsStatLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  claimsStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },

  // Claims Actions
  claimsActionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  claimsActionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  claimsActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  claimsActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  claimsActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#667eea',
    borderRadius: 16,
    gap: 8,
  },
  claimsActionSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },

  // Empty State
  claimsEmptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Claims List
  claimsListContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  claimsListTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modernClaimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  claimCardHeader: {
    marginBottom: 12,
  },
  claimTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modernClaimTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  modernStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  modernStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modernClaimAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'left',
  },
  claimCardDetails: {
    gap: 8,
  },
  claimDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernDetailText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // View All Button
  viewAllClaimsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewAllClaimsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
});

export default WalletScreen;
