import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants/theme';

const PayoutMethodCard = ({ method, isDefault, onPress, onSetDefault, onRemove }) => {
  const isBankAccount = method.type === 'bank';
  const isPayPal = method.type === 'paypal';
  
  // Get display info based on method type
  const getDisplayInfo = () => {
    if (isBankAccount && method.details) {
      const bsb = method.details.bsb || '';
      const formattedBSB = bsb.length === 6 ? `${bsb.slice(0, 3)}-${bsb.slice(3)}` : bsb;
      return {
        icon: 'bank',
        iconType: 'MaterialCommunityIcons',
        title: method.details.bank_name || 'Bank Account',
        subtitle: method.details.account_name || 'Account',
        details: `BSB: ${formattedBSB} | Account: ****${method.last4 || method.details.account_number_masked?.slice(-4) || ''}`,
        gradientColors: ['#1E3A8A', '#3B82F6']
      };
    } else if (isPayPal && method.details) {
      return {
        icon: 'logo-paypal',
        iconType: 'Ionicons',
        title: 'PayPal',
        subtitle: method.details.email || 'PayPal Account',
        details: 'Instant transfers available',
        gradientColors: ['#003087', '#009CDE']
      };
    }
    
    // Default fallback
    return {
      icon: 'card-outline',
      iconType: 'Ionicons',
      title: method.name || 'Payment Method',
      subtitle: 'Payment method',
      details: method.type,
      gradientColors: ['#666', '#999']
    };
  };
  
  const displayInfo = getDisplayInfo();
  
  const handleLongPress = () => {
    const options = [];
    
    if (!isDefault) {
      options.push({
        text: 'Set as Default',
        onPress: onSetDefault
      });
    }
    
    options.push({
      text: 'Remove',
      onPress: () => {
        Alert.alert(
          'Remove Payment Method',
          'Are you sure you want to remove this payment method?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Remove', 
              style: 'destructive',
              onPress: onRemove
            }
          ]
        );
      },
      style: 'destructive'
    });
    
    options.push({
      text: 'Cancel',
      style: 'cancel'
    });
    
    Alert.alert('Payment Method Options', null, options);
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={displayInfo.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          {/* Icon Section */}
          <View style={styles.iconContainer}>
            {displayInfo.iconType === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={displayInfo.icon} size={32} color="#FFFFFF" />
            ) : (
              <Ionicons name={displayInfo.icon} size={32} color="#FFFFFF" />
            )}
          </View>
          
          {/* Info Section */}
          <View style={styles.infoContainer}>
            <Text style={styles.title}>{displayInfo.title}</Text>
            <Text style={styles.subtitle}>{displayInfo.subtitle}</Text>
            <Text style={styles.details}>{displayInfo.details}</Text>
          </View>
          
          {/* Status Section */}
          <View style={styles.statusContainer}>
            {isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </View>
        </View>
        
        {/* Card Design Elements */}
        <View style={styles.cardDesign}>
          <View style={styles.chipContainer}>
            <View style={styles.chip} />
          </View>
          <View style={styles.cardPattern}>
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={styles.patternLine} />
            ))}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  card: {
    borderRadius: 16,
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  title: {
    ...FONTS.h4,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    ...FONTS.body3,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  details: {
    ...FONTS.body5,
    color: 'rgba(255,255,255,0.7)',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  defaultBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  defaultText: {
    ...FONTS.body5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardDesign: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  chipContainer: {
    position: 'absolute',
    left: 20,
    bottom: 30,
  },
  chip: {
    width: 50,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
  },
  cardPattern: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    gap: 4,
  },
  patternLine: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

export default PayoutMethodCard;