import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator, 
  Alert, 
  Dimensions,
  FlatList,
  Platform
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Temporarily disable chart import to fix server error
// import { LineChart } from 'react-native-chart-kit';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';
import AddPayoutMethodModal from '../../components/provider/AddPayoutMethodModal';
import PayoutMethodCard from '../../components/provider/PayoutMethodCard';

const screenWidth = Dimensions.get('window').width;

const ProviderWalletScreen = () => {
  const navigation = useNavigation();
  const { profile } = useUser();
  const scrollViewRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Financial data states
  const [financialData, setFinancialData] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    pendingPayouts: 0,
    availableBalance: 0,
    lastPayout: null,
    nextPayout: null
  });
  
  const [revenueData, setRevenueData] = useState({
    labels: [],
    datasets: [{
      data: []
    }]
  });
  
  const [transactions, setTransactions] = useState([]);
  const [serviceBreakdown, setServiceBreakdown] = useState([]);
  const [payoutMethods, setPayoutMethods] = useState([]);
  const [error, setError] = useState(null);
  const [showAddPayoutModal, setShowAddPayoutModal] = useState(false);

  // Reset scroll on focus
  useFocusEffect(
    useCallback(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      fetchFinancialData();
      setActiveTab('overview');
    }, [])
  );

  const fetchFinancialData = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get provider record
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
        
      if (providerError || !providerData) {
        throw new Error('Provider profile not found');
      }
      
      const providerId = providerData.id;
      
      // Fetch all completed bookings for revenue calculation
      const { data: bookings, error: bookingsError } = await supabase
        .from('service_bookings')
        .select(`
          id,
          total_price,
          created_at,
          status,
          payment_status,
          services!inner(
            id,
            title,
            provider_id
          )
        `)
        .eq('services.provider_id', providerId)
        .order('created_at', { ascending: false });
        
      if (bookingsError) throw bookingsError;
      
      // Calculate financial metrics
      const now = new Date();
      const monthStart = startOfMonth(now);
      
      let totalEarnings = 0;
      let monthlyEarnings = 0;
      let pendingPayouts = 0;
      let availableBalance = 0;
      
      const monthlyRevenue = Array(6).fill(0);
      const serviceRevenue = {};
      
      bookings?.forEach(booking => {
        if (booking.status === 'completed' && booking.payment_status === 'paid') {
          const amount = booking.total_price || 0;
          totalEarnings += amount;
          
          // Check if booking is from current month
          const bookingDate = new Date(booking.created_at);
          if (bookingDate >= monthStart) {
            monthlyEarnings += amount;
          }
          
          // Calculate monthly revenue for chart (last 6 months)
          const monthIndex = 5 - Math.floor((now - bookingDate) / (30 * 24 * 60 * 60 * 1000));
          if (monthIndex >= 0 && monthIndex < 6) {
            monthlyRevenue[monthIndex] += amount;
          }
          
          // Track revenue by service
          const serviceTitle = booking.services?.title || 'Unknown Service';
          serviceRevenue[serviceTitle] = (serviceRevenue[serviceTitle] || 0) + amount;
        }
        
        // Calculate pending payouts (completed but not yet paid out)
        if (booking.status === 'completed' && booking.payment_status === 'pending_provider_payout') {
          pendingPayouts += booking.total_price || 0;
        }
      });
      
      // Available balance = pending payouts (ready to withdraw)
      availableBalance = pendingPayouts;
      
      // Prepare revenue chart data
      const chartLabels = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        chartLabels.push(format(date, 'MMM'));
      }
      
      setRevenueData({
        labels: chartLabels,
        datasets: [{
          data: monthlyRevenue
        }]
      });
      
      // Prepare service breakdown
      const breakdown = Object.entries(serviceRevenue)
        .map(([service, revenue]) => ({
          service,
          revenue,
          percentage: totalEarnings > 0 ? (revenue / totalEarnings * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Top 5 services
      
      setServiceBreakdown(breakdown);
      
      // Set financial data
      setFinancialData({
        totalEarnings,
        monthlyEarnings,
        pendingPayouts,
        availableBalance,
        lastPayout: null, // Would come from a payouts table
        nextPayout: new Date(now.getFullYear(), now.getMonth() + 1, 1) // First of next month
      });
      
      // Set transactions (recent bookings)
      setTransactions(
        bookings?.filter(b => b.status === 'completed')
          .slice(0, 20)
          .map(booking => ({
            id: booking.id,
            date: booking.created_at,
            service: booking.services?.title || 'Service',
            amount: booking.total_price || 0,
            status: booking.payment_status,
            type: 'earning'
          })) || []
      );
      
      // Fetch payout methods
      const { data: methods, error: methodsError } = await supabase
        .from('provider_payout_methods')
        .select('*')
        .eq('provider_id', providerId);
        
      if (!methodsError) {
        setPayoutMethods(methods || []);
      }
      
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFinancialData();
  };

  const handleRequestPayout = async () => {
    if (financialData.availableBalance <= 0) {
      Alert.alert('No Available Balance', 'You need a positive balance to request a payout.');
      return;
    }
    
    if (payoutMethods.length === 0) {
      Alert.alert('No Payout Method', 'Please add a payout method first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Method', onPress: handleAddPayoutMethod }
      ]);
      return;
    }
    
    // Get the default payout method
    const defaultMethod = payoutMethods.find(method => method.is_default) || payoutMethods[0];
    
    Alert.alert(
      'Request Payout',
      `Request payout of $${financialData.availableBalance.toFixed(2)} to ${defaultMethod.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request', 
          onPress: async () => {
            try {
              // Create payout request in provider_payouts table
              const { error } = await supabase
                .from('provider_payouts')
                .insert({
                  provider_id: profile.id,
                  payout_method_id: defaultMethod.id,
                  amount: financialData.availableBalance,
                  status: 'pending',
                  type: 'manual',
                  scheduled_date: new Date().toISOString().split('T')[0], // Today's date
                  notes: 'Manual payout request from provider wallet'
                });
                
              if (error) throw error;
              
              Alert.alert(
                'Payout Request Submitted', 
                `Your payout request of $${financialData.availableBalance.toFixed(2)} has been submitted successfully. You will receive funds within 2-3 business days.`,
                [{ text: 'OK' }]
              );
              
              // Refresh data to show updated balance
              fetchFinancialData();
            } catch (error) {
              console.error('Error requesting payout:', error);
              Alert.alert('Error', 'Failed to submit payout request. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleExportTransactions = () => {
    if (transactions.length === 0) {
      Alert.alert('No Data', 'No transactions available to export.');
      return;
    }
    
    Alert.alert('Export Transactions', 'Choose export format:', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'CSV', 
        onPress: () => exportTransactionsAsCSV()
      },
      { 
        text: 'PDF', 
        onPress: () => exportTransactionsAsPDF()
      }
    ]);
  };

  const exportTransactionsAsCSV = async () => {
    try {
      // Create CSV content
      const csvHeader = 'Date,Service,Amount,Status,Type\n';
      const csvData = transactions.map(transaction => {
        const date = format(parseISO(transaction.date), 'yyyy-MM-dd');
        const service = `"${transaction.service}"`; // Wrap in quotes to handle commas
        const amount = transaction.amount.toFixed(2);
        const status = transaction.status;
        const type = transaction.type;
        return `${date},${service},${amount},${status},${type}`;
      }).join('\n');
      
      const csvContent = csvHeader + csvData;
      
      // Create filename with current date
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const filename = `transactions_${currentDate}.csv`;
      
      if (Platform.OS === 'web') {
        // For web, create a download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert('Export Complete', 'CSV file has been downloaded.');
      } else {
        // For mobile, save to device and share
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        
        // Check if sharing is available
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Save Transaction Export',
          });
        } else {
          Alert.alert('Export Complete', `CSV file saved to: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Export Failed', 'Unable to export transactions. Please try again.');
    }
  };

  const exportTransactionsAsPDF = async () => {
    try {
      // Create HTML content for PDF
      const currentDate = format(new Date(), 'MMMM dd, yyyy');
      const totalEarnings = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #333; }
            .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
            .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .summary-label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .amount { text-align: right; }
            .status-completed { color: #28a745; }
            .status-pending { color: #ffc107; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Transaction Report</div>
            <div class="subtitle">Generated on ${currentDate}</div>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">Total Transactions:</span>
              <span>${transactions.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Earnings:</span>
              <span>$${totalEarnings.toFixed(2)}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Report Period:</span>
              <span>All Time</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Status</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(transaction => `
                <tr>
                  <td>${format(parseISO(transaction.date), 'MMM dd, yyyy')}</td>
                  <td>${transaction.service}</td>
                  <td class="status-${transaction.status}">${transaction.status}</td>
                  <td class="amount">$${transaction.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This report was generated automatically by Rollodex Provider Dashboard</p>
          </div>
        </body>
      </html>`;
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Transaction Report',
        });
      } else {
        Alert.alert('Export Complete', `PDF report saved to: ${uri}`);
      }
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Export Failed', 'Unable to generate PDF report. Please try again.');
    }
  };

  const handleViewStatements = () => {
    Alert.alert(
      'Monthly Statements',
      'Choose a statement period:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Current Month', onPress: () => generateStatement('current') },
        { text: 'Previous Month', onPress: () => generateStatement('previous') },
        { text: 'Custom Period', onPress: () => generateStatement('custom') }
      ]
    );
  };

  const generateStatement = async (period) => {
    try {
      let startDate, endDate, periodLabel;
      
      switch (period) {
        case 'current':
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          periodLabel = format(new Date(), 'MMMM yyyy');
          break;
        case 'previous':
          const lastMonth = subMonths(new Date(), 1);
          startDate = startOfMonth(lastMonth);
          endDate = endOfMonth(lastMonth);
          periodLabel = format(lastMonth, 'MMMM yyyy');
          break;
        case 'custom':
          // For now, default to last 3 months
          startDate = subMonths(new Date(), 3);
          endDate = new Date();
          periodLabel = 'Last 3 Months';
          break;
        default:
          return;
      }
      
      // Filter transactions for the period
      const periodTransactions = transactions.filter(transaction => {
        const transactionDate = parseISO(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
      
      // Calculate statement data
      const totalEarnings = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalTransactions = periodTransactions.length;
      const avgTransactionValue = totalTransactions > 0 ? totalEarnings / totalTransactions : 0;
      
      // Group by service type
      const serviceBreakdown = {};
      periodTransactions.forEach(transaction => {
        if (!serviceBreakdown[transaction.service]) {
          serviceBreakdown[transaction.service] = { count: 0, total: 0 };
        }
        serviceBreakdown[transaction.service].count++;
        serviceBreakdown[transaction.service].total += transaction.amount;
      });
      
      // Create statement HTML
      const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #007AFF; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #007AFF; margin-bottom: 10px; }
            .title { font-size: 20px; font-weight: bold; }
            .period { font-size: 16px; color: #666; margin-top: 5px; }
            
            .provider-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .info-label { font-weight: bold; }
            
            .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .summary-card { background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
            .summary-value { font-size: 24px; font-weight: bold; color: #007AFF; }
            .summary-label { font-size: 14px; color: #666; margin-top: 5px; }
            
            .section-title { font-size: 18px; font-weight: bold; margin-top: 40px; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .amount { text-align: right; font-weight: bold; }
            .service-breakdown { background-color: #f8f9fa; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
            .disclaimer { font-style: italic; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Rollodex</div>
            <div class="title">Provider Earnings Statement</div>
            <div class="period">${periodLabel}</div>
          </div>
          
          <div class="provider-info">
            <div class="info-row">
              <span class="info-label">Provider Name:</span>
              <span>${profile?.full_name || 'Provider'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Statement Date:</span>
              <span>${format(new Date(), 'MMMM dd, yyyy')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Statement Period:</span>
              <span>${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}</span>
            </div>
          </div>
          
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-value">$${totalEarnings.toFixed(2)}</div>
              <div class="summary-label">Total Earnings</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${totalTransactions}</div>
              <div class="summary-label">Total Transactions</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">$${avgTransactionValue.toFixed(2)}</div>
              <div class="summary-label">Average Transaction</div>
            </div>
          </div>
          
          <div class="section-title">Service Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Service Type</th>
                <th>Transactions</th>
                <th class="amount">Total Earnings</th>
                <th class="amount">Average Value</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(serviceBreakdown).map(([service, data]) => `
                <tr class="service-breakdown">
                  <td>${service}</td>
                  <td>${data.count}</td>
                  <td class="amount">$${data.total.toFixed(2)}</td>
                  <td class="amount">$${(data.total / data.count).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="section-title">Transaction Details</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Status</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${periodTransactions.map(transaction => `
                <tr>
                  <td>${format(parseISO(transaction.date), 'MMM dd, yyyy')}</td>
                  <td>${transaction.service}</td>
                  <td>${transaction.status}</td>
                  <td class="amount">$${transaction.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p><strong>Rollodex Provider Services</strong></p>
            <p>This statement was generated automatically on ${format(new Date(), 'MMMM dd, yyyy')}</p>
            <div class="disclaimer">
              This statement reflects earnings during the specified period. 
              For questions about this statement, please contact provider support.
            </div>
          </div>
        </body>
      </html>`;
      
      // Generate and share PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${periodLabel} Statement`,
        });
      } else {
        Alert.alert('Statement Generated', `Statement saved to: ${uri}`);
      }
      
    } catch (error) {
      console.error('Error generating statement:', error);
      Alert.alert('Statement Failed', 'Unable to generate statement. Please try again.');
    }
  };

  const handleViewAllServices = () => {
    Alert.alert(
      'Service Revenue Details',
      serviceBreakdown.map(service => 
        `${service.service}: $${service.revenue.toLocaleString()} (${service.percentage}%)`
      ).join('\n') || 'No service data available'
    );
  };

  const handleAddPayoutMethod = () => {
    if (payoutMethods.length >= 3) {
      Alert.alert(
        'Limit Reached',
        'You can only have up to 3 payout methods. Please remove an existing method to add a new one.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowAddPayoutModal(true);
  };


  const handleDownload1099 = () => {
    Alert.alert(
      'Download 1099',
      'Your 1099 form will be emailed to you within 24 hours.',
      [
        { text: 'OK' }
      ]
    );
  };

  const handleTaxSummary = () => {
    const currentYear = new Date().getFullYear();
    Alert.alert(
      'Tax Summary Report',
      `Tax Year: ${currentYear}\n\nTotal Earnings: $${financialData.totalEarnings.toLocaleString()}\nTotal Deductions: $0\nTaxable Income: $${financialData.totalEarnings.toLocaleString()}\n\nDetailed report will be emailed to you.`
    );
  };


  const handleMakeDefaultPayoutMethod = async (methodId) => {
    try {
      // First, set all methods to non-default
      await supabase
        .from('provider_payout_methods')
        .update({ is_default: false })
        .eq('provider_id', profile.id);
      
      // Then set the selected method as default
      const { error } = await supabase
        .from('provider_payout_methods')
        .update({ is_default: true })
        .eq('id', methodId);
        
      if (error) throw error;
      
      Alert.alert('Success', 'Default payout method updated.');
      fetchFinancialData(); // Refresh data
    } catch (error) {
      console.error('Error updating default payout method:', error);
      Alert.alert('Error', 'Failed to update default payout method.');
    }
  };

  const handleRemovePayoutMethod = async (methodId) => {
    Alert.alert(
      'Remove Payout Method',
      'Are you sure you want to remove this payout method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('provider_payout_methods')
                .delete()
                .eq('id', methodId);
                
              if (error) throw error;
              
              Alert.alert('Success', 'Payout method removed.');
              fetchFinancialData(); // Refresh data
            } catch (error) {
              console.error('Error removing payout method:', error);
              Alert.alert('Error', 'Failed to remove payout method.');
            }
          }
        }
      ]
    );
  };

  const renderTransaction = ({ item }) => {
    const statusColor = item.status === 'paid' ? '#34C759' : 
                       item.status === 'pending_provider_payout' ? '#FF9500' : '#8E8E93';
    
    return (
      <TouchableOpacity style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionService} numberOfLines={1}>{item.service}</Text>
          <Text style={styles.transactionDate}>
            {format(parseISO(item.date), 'MMM d, yyyy')}
          </Text>
        </View>
        <View style={styles.transactionRight}>
          <Text style={styles.transactionAmount}>+${item.amount.toFixed(2)}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Provider Wallet"
        navigation={navigation}
        canGoBack={true}
      />
      
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons name="analytics-outline" size={18} color={activeTab === 'overview' ? COLORS.primary : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Ionicons name="list-outline" size={18} color={activeTab === 'transactions' ? COLORS.primary : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'payouts' && styles.activeTab]}
          onPress={() => setActiveTab('payouts')}
        >
          <Ionicons name="cash-outline" size={18} color={activeTab === 'payouts' ? COLORS.primary : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'payouts' && styles.activeTabText]}>
            Payouts
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
            <Text style={styles.loadingText}>Loading financial data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                {/* Earnings Overview Card */}
                <LinearGradient
                  colors={['#1E3A8A', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.earningsCard}
                >
                  <View style={styles.earningsContent}>
                    <View style={styles.earningsRow}>
                      <View style={styles.earningsStat}>
                        <Text style={styles.earningsLabel}>Total Earnings</Text>
                        <Text style={styles.earningsValue}>${financialData.totalEarnings.toLocaleString()}</Text>
                      </View>
                      <View style={styles.earningsStat}>
                        <Text style={styles.earningsLabel}>This Month</Text>
                        <Text style={styles.earningsValue}>${financialData.monthlyEarnings.toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.earningsRow}>
                      <View style={styles.earningsStat}>
                        <Text style={styles.earningsLabel}>Pending Payout</Text>
                        <Text style={styles.pendingValue}>${financialData.pendingPayouts.toLocaleString()}</Text>
                      </View>
                      <View style={styles.earningsStat}>
                        <Text style={styles.earningsLabel}>Available</Text>
                        <Text style={styles.availableValue}>${financialData.availableBalance.toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                  <TouchableOpacity style={styles.quickActionButton} onPress={handleRequestPayout}>
                    <View style={[styles.quickActionIcon, { backgroundColor: '#E8F3FF' }]}>
                      <Ionicons name="arrow-down-circle-outline" size={20} color={COLORS.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Request Payout</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.quickActionButton} onPress={handleExportTransactions}>
                    <View style={[styles.quickActionIcon, { backgroundColor: '#FFF2E8' }]}>
                      <Ionicons name="download-outline" size={20} color="#FF9500" />
                    </View>
                    <Text style={styles.quickActionText}>Export</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.quickActionButton} onPress={handleViewStatements}>
                    <View style={[styles.quickActionIcon, { backgroundColor: '#E8FFF0' }]}>
                      <Ionicons name="document-text-outline" size={20} color="#34C759" />
                    </View>
                    <Text style={styles.quickActionText}>Statements</Text>
                  </TouchableOpacity>
                </View>

                {/* Revenue Chart */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Revenue Trend</Text>
                    <Text style={styles.sectionSubtitle}>Last 6 months</Text>
                  </View>
                  
                  {revenueData.datasets[0].data.some(val => val > 0) ? (
                    <View style={styles.chartPlaceholder}>
                      <Text style={styles.chartPlaceholderText}>Revenue Chart</Text>
                      <Text style={styles.chartNote}>Chart functionality temporarily disabled</Text>
                    </View>
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Text style={styles.noDataText}>No revenue data available</Text>
                    </View>
                  )}
                </View>

                {/* Service Breakdown */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Top Services</Text>
                    <TouchableOpacity onPress={handleViewAllServices}>
                      <Text style={styles.sectionActionText}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {serviceBreakdown.length > 0 ? (
                    <View style={styles.serviceList}>
                      {serviceBreakdown.map((item, index) => (
                        <View key={index} style={styles.serviceItem}>
                          <View style={styles.serviceInfo}>
                            <Text style={styles.serviceName} numberOfLines={1}>{item.service}</Text>
                            <Text style={styles.serviceRevenue}>${item.revenue.toLocaleString()}</Text>
                          </View>
                          <View style={styles.serviceBarContainer}>
                            <View 
                              style={[
                                styles.serviceBar, 
                                { width: `${item.percentage}%` }
                              ]} 
                            />
                          </View>
                          <Text style={styles.servicePercentage}>{item.percentage}%</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No service data available</Text>
                  )}
                </View>
              </>
            )}

            {activeTab === 'transactions' && (
              <View style={styles.transactionsContainer}>
                <View style={styles.transactionsHeader}>
                  <Text style={styles.sectionTitle}>Transaction History</Text>
                  <TouchableOpacity onPress={handleExportTransactions}>
                    <Ionicons name="download-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                
                {transactions.length > 0 ? (
                  <FlatList
                    data={transactions}
                    renderItem={renderTransaction}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons name="receipt-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyStateText}>No transactions yet</Text>
                    <Text style={styles.emptyStateSubText}>Your earnings will appear here</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'payouts' && (
              <>
                {/* Payout Schedule */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Payout Schedule</Text>
                  </View>
                  
                  <View style={styles.payoutSchedule}>
                    <View style={styles.scheduleItem}>
                      <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleLabel}>Next Payout</Text>
                        <Text style={styles.scheduleValue}>
                          {financialData.nextPayout ? format(financialData.nextPayout, 'MMMM d, yyyy') : 'Not scheduled'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.scheduleItem}>
                      <Ionicons name="time-outline" size={24} color="#34C759" />
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleLabel}>Frequency</Text>
                        <Text style={styles.scheduleValue}>Monthly</Text>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity style={styles.requestPayoutButton} onPress={handleRequestPayout}>
                    <Text style={styles.requestPayoutText}>Request Immediate Payout</Text>
                  </TouchableOpacity>
                </View>

                {/* Payout Methods */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Payout Methods</Text>
                    <TouchableOpacity onPress={handleAddPayoutMethod}>
                      <Text style={styles.sectionActionText}>Add New</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {payoutMethods.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payoutMethodsScroll}>
                      {payoutMethods.map((method) => (
                        <PayoutMethodCard
                          key={method.id}
                          method={method}
                          isDefault={method.is_default}
                          onPress={() => {
                            // Show method details or allow selection
                            Alert.alert(
                              method.name || 'Payment Method',
                              `This is your ${method.is_default ? 'default ' : ''}payout method.`,
                              [{ text: 'OK' }]
                            );
                          }}
                          onSetDefault={() => handleMakeDefaultPayoutMethod(method.id)}
                          onRemove={() => handleRemovePayoutMethod(method.id)}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <TouchableOpacity style={styles.addPaymentButton} onPress={handleAddPayoutMethod}>
                      <Ionicons name="add-circle-outline" size={32} color={COLORS.primary} />
                      <Text style={styles.addPaymentText}>Add a payout method</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Tax Documents */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Tax Documents</Text>
                  </View>
                  
                  <TouchableOpacity style={styles.taxDocumentItem} onPress={handleDownload1099}>
                    <Ionicons name="document-text-outline" size={24} color="#666" />
                    <Text style={styles.taxDocumentText}>Download 1099 Form</Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.taxDocumentItem} onPress={handleTaxSummary}>
                    <Ionicons name="calculator-outline" size={24} color="#666" />
                    <Text style={styles.taxDocumentText}>Tax Summary Report</Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
      
      {/* Add Payout Method Modal */}
      <AddPayoutMethodModal
        visible={showAddPayoutModal}
        onClose={() => setShowAddPayoutModal(false)}
        onSuccess={() => {
          fetchFinancialData();
          setShowAddPayoutModal(false);
        }}
        currentMethods={payoutMethods}
        profileId={profile?.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
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
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  contentScrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 32,
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
  earningsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsContent: {
    flex: 1,
    padding: 20,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsStat: {
    flex: 1,
  },
  earningsLabel: {
    ...FONTS.body4,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  earningsValue: {
    ...FONTS.h2,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  pendingValue: {
    ...FONTS.h3,
    color: '#FCD34D',
    fontWeight: '600',
  },
  availableValue: {
    ...FONTS.h3,
    color: '#86EFAC',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    ...FONTS.body4,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
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
    marginBottom: 16,
  },
  sectionTitle: {
    ...FONTS.h4,
    fontWeight: '600',
    color: '#333',
  },
  sectionSubtitle: {
    ...FONTS.body4,
    color: '#666',
  },
  sectionActionText: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '500',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    ...FONTS.body3,
    color: '#999',
  },
  chartPlaceholder: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginVertical: 8,
  },
  chartPlaceholderText: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  chartNote: {
    ...FONTS.body5,
    color: '#999',
  },
  serviceList: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceInfo: {
    flex: 0.4,
  },
  serviceName: {
    ...FONTS.body4,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  serviceRevenue: {
    ...FONTS.body5,
    color: '#666',
  },
  serviceBarContainer: {
    flex: 0.5,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  serviceBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  servicePercentage: {
    ...FONTS.body5,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  emptyText: {
    ...FONTS.body3,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  transactionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionService: {
    ...FONTS.body3,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    ...FONTS.body5,
    color: '#666',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyStateContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyStateSubText: {
    ...FONTS.body4,
    color: '#999',
    marginTop: 4,
  },
  payoutSchedule: {
    gap: 16,
    marginBottom: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleLabel: {
    ...FONTS.body5,
    color: '#666',
    marginBottom: 2,
  },
  scheduleValue: {
    ...FONTS.body3,
    fontWeight: '500',
    color: '#333',
  },
  requestPayoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  requestPayoutText: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    ...FONTS.body3,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  paymentDetails: {
    ...FONTS.body4,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#E8F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    ...FONTS.body5,
    color: COLORS.primary,
    fontWeight: '500',
  },
  addPaymentButton: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addPaymentText: {
    ...FONTS.body3,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 8,
  },
  taxDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  taxDocumentText: {
    ...FONTS.body3,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  payoutMethodsScroll: {
    marginHorizontal: -16,
    paddingVertical: 8,
  },
});

export default ProviderWalletScreen;