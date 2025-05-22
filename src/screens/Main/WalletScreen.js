import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
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
    <View style={styles.screenContainer}>
      <AppHeader
        title="Wallet"
        navigation={navigation}
        canGoBack={true}
        onBackPressOverride={handleBackToDashboard}
      />
      <TouchableOpacity
        style={styles.viewClaimsBtn}
        onPress={() => navigation.navigate('ViewClaimsScreen')}
      >
        <Text style={styles.viewClaimsBtnText}>View All Claims</Text>
      </TouchableOpacity>
      <ScrollView
        style={styles.contentScrollView}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#3A5E49" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : wallet ? (
          <>
            {/* Total Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Total NDIS Balance</Text>
              <Text style={styles.balanceValue}>${Math.floor(wallet.total_balance)?.toLocaleString() || '0'}</Text>
            </View>

            {/* Submit New Claim Button */}
            <TouchableOpacity style={styles.submitClaimButton} onPress={handleNavigateToSubmitClaim}>
              <Text style={styles.submitClaimButtonText}>Submit New Claim</Text>
              <Feather name="plus-circle" size={20} color={COLORS.white} style={{ marginLeft: 8 }}/>
            </TouchableOpacity>

            {/* Category Breakdown with Minimalist Horizontal Bar Graph */}
            <View style={styles.categoryBreakdownCard}>
              <Text style={styles.sectionTitle}>Category Breakdown</Text>
              <View style={styles.barGraphContainer}>
                {(() => {
                  const breakdown = wallet.category_breakdown || {};
                  const total = Object.values(breakdown).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0) || 1;
                  const colorMap = [COLORS.primary, COLORS.DARK_GREEN, COLORS.secondary];
                  return Object.entries(breakdown).map(([key, value], idx) => {
                    const percent = Math.round(((typeof value === 'number' ? value : 0) / total) * 100);
                    return (
                      <View key={key} style={styles.barGraphRow}>
                        <Text style={styles.barLabelAbove}>{CATEGORY_LABELS[key] || key}</Text>
                        <View style={styles.barTrackWithValueRow}>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: colorMap[idx % colorMap.length] }]} />
                          </View>
                          <Text style={styles.barValue}>${value?.toLocaleString() || '0.00'}</Text>
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
            </View>
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
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  viewClaimsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    margin: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewClaimsBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentScrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: SIZES.padding * 2,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 1.5,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    ...FONTS.body3,
    color: COLORS.white,
    marginBottom: SIZES.base,
  },
  balanceValue: {
    ...FONTS.h1,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  submitClaimButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    paddingVertical: SIZES.padding * 0.75,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding * 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  submitClaimButtonText: {
    ...FONTS.h4,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  categoryBreakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding * 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  claimsCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding * 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  claimItemCard: {
    backgroundColor: COLORS.lightGray2,
    borderRadius: SIZES.radius * 0.75,
    padding: SIZES.padding * 0.75,
    marginBottom: SIZES.padding * 0.75,
    borderWidth: 1,
    borderColor: COLORS.gray2,
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
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.base / 2,
    borderRadius: SIZES.radius * 0.5,
    color: COLORS.white,
    textTransform: 'capitalize',
    overflow: 'hidden',
  },
  pending: { backgroundColor: COLORS.orange },
  approved: { backgroundColor: COLORS.green },
  rejected: { backgroundColor: COLORS.red },
  requires_information: { backgroundColor: COLORS.blue },
  processing: { backgroundColor: COLORS.purple },
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
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding * 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
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
