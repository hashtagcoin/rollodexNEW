import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

const TRANSACTION_TYPES = {
  fully_funded: {
    title: 'Fully Funded',
    icon: 'checkmark-circle',
    color: '#28A745',
    description: 'NDIS covered transactions'
  },
  partial_payment: {
    title: 'Partial Payment',
    icon: 'pie-chart',
    color: '#FFC107',
    description: 'Gap payment transactions'
  },
  manual_payment: {
    title: 'Manual Payment',
    icon: 'card',
    color: '#6C757D',
    description: 'Out-of-pocket transactions'
  }
};

const TransactionListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { transactionType } = route.params || {};
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    count: 0
  });

  const fetchTransactions = useCallback(async () => {
    if (!transactionType) return;
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Unable to fetch user');
      
      // Fetch transactions filtered by type
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('transaction_type', transactionType)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setTransactions(data || []);
      
      // Calculate summary
      const totalAmount = data?.reduce((sum, transaction) => {
        return sum + (transaction.type === 'purchase' ? -transaction.amount : transaction.amount);
      }, 0) || 0;
      
      setSummary({
        totalAmount: Math.abs(totalAmount),
        count: data?.length || 0
      });
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [transactionType]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const renderTransaction = ({ item }) => {
    const isExpense = item.type === 'purchase';
    const amount = Math.abs(item.amount);
    
    return (
      <TouchableOpacity 
        style={styles.transactionCard}
        onPress={() => {
          Alert.alert(
            'Transaction Details',
            `${item.description || 'Transaction'}\n\nAmount: $${amount.toFixed(2)}\nDate: ${format(new Date(item.created_at), 'PPP')}\nType: ${TRANSACTION_TYPES[transactionType]?.title}`,
            [{ text: 'OK' }]
          );
        }}
      >
        <View style={styles.transactionLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${TRANSACTION_TYPES[transactionType]?.color}15` }]}>
            <Ionicons 
              name={isExpense ? 'arrow-down' : 'arrow-up'} 
              size={20} 
              color={isExpense ? '#FF3B30' : '#34C759'} 
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription} numberOfLines={1}>
              {item.description || 'Transaction'}
            </Text>
            <Text style={styles.transactionDate}>
              {format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}
            </Text>
          </View>
        </View>
        <Text style={[styles.transactionAmount, { color: isExpense ? '#FF3B30' : '#34C759' }]}>
          {isExpense ? '-' : '+'}${amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  const typeConfig = TRANSACTION_TYPES[transactionType] || {};

  return (
    <View style={styles.container}>
      <AppHeader
        title={typeConfig.title || 'Transactions'}
        navigation={navigation}
        canGoBack={true}
      />
      
      {/* Summary Card */}
      <View style={[styles.summaryCard, { borderLeftColor: typeConfig.color }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name={typeConfig.icon} size={32} color={typeConfig.color} />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>{typeConfig.description}</Text>
              <Text style={styles.summaryValue}>{summary.count} transactions</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryAmount}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={[styles.summaryValue, styles.amountText]}>
              ${summary.totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTransactions}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={typeConfig.icon} size={60} color="#DADADA" />
          <Text style={styles.emptyTitle}>No {typeConfig.title} transactions</Text>
          <Text style={styles.emptySubtitle}>
            Your {typeConfig.title.toLowerCase()} transactions will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryTextContainer: {
    marginLeft: 12,
  },
  summaryLabel: {
    ...FONTS.body4,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#333',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#EAEAEA',
    marginHorizontal: 16,
  },
  summaryAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 20,
    color: COLORS.primary,
  },
  listContainer: {
    paddingBottom: 24,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    ...FONTS.body3,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    ...FONTS.body5,
    color: '#666',
  },
  transactionAmount: {
    ...FONTS.body3,
    fontWeight: '600',
  },
  separator: {
    height: 8,
  },
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
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    ...FONTS.body4,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default TransactionListScreen;