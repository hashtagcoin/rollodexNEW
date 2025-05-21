import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';

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
  const [recentClaims, setRecentClaims] = useState([]);
  const [error, setError] = useState(null);

  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user
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
      // Fetch recent claims
      const { data: claimsData, error: claimsError } = await supabase
        .from('claims')
        .select('id, amount, status, expiry_date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (claimsError) throw claimsError;
      setRecentClaims(claimsData || []);
    } catch (err) {
      setError(err.message || 'Failed to load wallet info');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
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
            {/* Recent Claims */}
            <View style={styles.claimsCard}>
              <Text style={styles.sectionTitle}>Recent Claims</Text>
              {recentClaims.length === 0 ? (
                <Text style={styles.emptyText}>No recent claims.</Text>
              ) : (
                recentClaims.map((claim) => (
                  <View key={claim.id} style={styles.claimRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.claimAmount}>${claim.amount?.toLocaleString() || '0.00'}</Text>
                      <Text style={styles.claimStatus}>Status: {claim.status}</Text>
                      <Text style={styles.claimDate}>Expires: {claim.expiry_date ? new Date(claim.expiry_date).toLocaleDateString() : 'N/A'}</Text>
                    </View>
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

import { COLORS, SIZES, FONTS } from '../../constants/theme';

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  contentScrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: SIZES.padding,
    paddingBottom: SIZES.padding * 2,
  },
  balanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    padding: SIZES.padding,
    marginBottom: SIZES.base * 2,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  balanceLabel: {
    ...FONTS.body3,
    color: COLORS.gray,
    marginBottom: 4,
  },
  balanceValue: {
    ...FONTS.h1,
    color: COLORS.primary,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  categoryBreakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    padding: SIZES.padding,
    marginBottom: SIZES.base * 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    ...FONTS.h3,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.base,
    letterSpacing: 0.5,
  },
  barGraphContainer: {
    marginTop: SIZES.base,
    marginBottom: SIZES.base,
    gap: 10,
  },
  barGraphRow: {
    marginBottom: 18,
  },
  barLabelAbove: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginBottom: 4,
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  barTrackWithValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    display: 'none', // deprecated, now using barLabelAbove
  },
  barTrack: {
    flex: 4,
    height: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 5,
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
  },
  barValue: {
    flex: 1,
    ...FONTS.body4,
    color: COLORS.black,
    textAlign: 'right',
    fontWeight: '600',
  },
  claimsCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    padding: SIZES.padding,
    marginBottom: SIZES.base * 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyText: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginVertical: 10,
  },
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.lightGray,
  },
  claimAmount: {
    ...FONTS.body3,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  claimStatus: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginTop: 2,
  },
  claimDate: {
    ...FONTS.body5,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  paymentMethodsCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    padding: SIZES.padding,
    marginBottom: SIZES.base * 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
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
