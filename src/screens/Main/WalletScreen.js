import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

// Placeholder Data (mimicking the design)
const walletData = {
  totalNdisBalance: '18,200.00',
  categoryBreakdown: [
    { name: 'Assistive Tech', amount: '7.500' }, // Assuming design meant 7,500
    { name: 'Social & Rec', amount: '3.000' },
    { name: 'Transport', amount: '3.000' },
    { name: 'Support', amount: '4.700' },
  ],
  pendingClaims: [
    {
      supplier: 'Wheelone Supplies Pty Ltd',
      expiresIn: 'Expires in 30 days',
      amount: '250.00',
    },
  ],
  paymentMethods: [
    {
      icon: 'check-circle',
      textPrimary: 'Fully covered',
      textSecondary: 'Auto-claim',
      iconColor: '#28A745', // Green for success/check
    },
    {
      icon: 'plus-circle',
      textPrimary: 'Partially covered',
      textSecondary: 'Gap payment prompt',
      iconColor: '#FFC107', // Yellow/Orange for warning/info
    },
    {
      icon: 'credit-card',
      textPrimary: 'Manual (for non-funded items)',
      textSecondary: '',
      iconColor: '#6C757D', // Grey for neutral/manual
    },
  ],
};

const WalletScreen = ({ navigation }) => { // navigation prop will be passed by navigator
  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.screenContainer} contentContainerStyle={styles.scrollContentContainer}>
        {/* Total NDIS Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceCardTitle}>Total NDIS Balance</Text>
          <Text style={styles.balanceCardAmount}>${walletData.totalNdisBalance}</Text>
        </View>

        {/* Category Breakdown Section */}
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={styles.card}>
          {walletData.categoryBreakdown.map((item, index) => (
            <View key={index} style={[styles.listItem, index === walletData.categoryBreakdown.length - 1 && styles.lastListItem]}>
              <Text style={styles.listItemText}>{item.name}</Text>
              <Text style={styles.listItemAmount}>${item.amount}</Text>
            </View>
          ))}
        </View>

        {/* Pending Claims Section */}
        <Text style={styles.sectionTitle}>Pending Claims</Text>
        {walletData.pendingClaims.map((claim, index) => (
          <View key={index} style={[styles.card, styles.claimCard]}>
            <View style={styles.claimHeader}>
                <Text style={styles.claimSupplier}>{claim.supplier}</Text>
                <Text style={styles.claimAmount}>${claim.amount}</Text>
            </View>
            <Text style={styles.claimExpires}>{claim.expiresIn}</Text>
          </View>
        ))}

        {/* Payment Methods Section */}
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.card}>
          {walletData.paymentMethods.map((method, index) => (
            <View key={index} style={[styles.listItem, styles.paymentMethodItem, index === walletData.paymentMethods.length - 1 && styles.lastListItem]}>
              <Feather name={method.icon} size={22} color={method.iconColor} style={styles.paymentMethodIcon} />
              <View style={styles.paymentMethodTextContainer}>
                <Text style={styles.paymentMethodTextPrimary}>{method.textPrimary}</Text>
                {method.textSecondary ? (
                  <Text style={styles.paymentMethodTextSecondary}> → {method.textSecondary}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7F3', // Light cream/off-white background from design
  },
  screenContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 30, // Ensure space for last element
  },
  balanceCard: {
    backgroundColor: '#3A5E49', // Dark green from design
    borderRadius: 12,
    padding: 25,
    marginHorizontal: 20,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  balanceCardTitle: {
    fontSize: 16,
    color: '#E0E0E0', // Light text for dark background
    marginBottom: 8,
  },
  balanceCardAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 20,
    marginTop: 25,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    // paddingVertical: 10, // Vertical padding will be handled by list items if needed
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  lastListItem: {
    borderBottomWidth: 0, // No border for the last item
  },
  listItemText: {
    fontSize: 16,
    color: '#333333',
  },
  listItemAmount: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  claimCard: {
    paddingVertical: 15,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  claimSupplier: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  claimAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  claimExpires: {
    fontSize: 13,
    color: '#777777',
  },
  paymentMethodItem: {
    justifyContent: 'flex-start', // Align items to the start for this specific list
  },
  paymentMethodIcon: {
    marginRight: 15,
  },
  paymentMethodTextContainer: {
    flexDirection: 'row', // Keep primary and secondary text on the same line
    flexWrap: 'wrap', // Allow wrapping if text is too long
    alignItems: 'center',
  },
  paymentMethodTextPrimary: {
    fontSize: 16,
    color: '#333333',
  },
  paymentMethodTextSecondary: {
    fontSize: 15,
    color: '#555555', 
  },
});

export default WalletScreen;
