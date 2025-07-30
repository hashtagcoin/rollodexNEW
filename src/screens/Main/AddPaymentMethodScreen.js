import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const AddPaymentMethodScreen = () => {
  const navigation = useNavigation();
  const { profile } = useUser();
  const flipAnimation = useRef(new Animated.Value(0)).current;
  
  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardType, setCardType] = useState('');
  
  // Animation values
  const frontAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg']
        })
      }
    ]
  };
  
  const backAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg']
        })
      }
    ]
  };
  
  // Detect card type based on number
  useEffect(() => {
    if (cardNumber.startsWith('4')) {
      setCardType('visa');
    } else if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) {
      setCardType('mastercard');
    } else if (cardNumber.startsWith('3')) {
      setCardType('amex');
    } else {
      setCardType('');
    }
  }, [cardNumber]);
  
  // Flip card animation
  const flipCard = (toBack) => {
    Animated.timing(flipAnimation, {
      toValue: toBack ? 1 : 0,
      duration: 600,
      useNativeDriver: true
    }).start();
    setIsFlipped(toBack);
  };
  
  // Format card number with spaces
  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };
  
  // Format expiry date
  const formatExpiryDate = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };
  
  // Handle card number input
  const handleCardNumberChange = (text) => {
    const cleaned = text.replace(/\s/g, '');
    if (cleaned.length <= 16) {
      setCardNumber(formatCardNumber(cleaned));
    }
  };
  
  // Handle expiry date input
  const handleExpiryDateChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      setExpiryDate(formatExpiryDate(text));
    }
  };
  
  // Handle CVV input
  const handleCvvChange = (text) => {
    if (text.length <= 4) {
      setCvv(text);
    }
  };
  
  // Validate card details
  const validateCard = () => {
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number');
      return false;
    }
    
    if (!cardHolder.trim()) {
      Alert.alert('Invalid Name', 'Please enter the cardholder name');
      return false;
    }
    
    const [month, year] = expiryDate.split('/');
    if (!month || !year || parseInt(month) > 12 || parseInt(month) < 1) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY)');
      return false;
    }
    
    if (cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV');
      return false;
    }
    
    return true;
  };
  
  // Save payment method
  const handleSaveCard = async () => {
    if (!validateCard()) return;
    
    setLoading(true);
    try {
      // In a real app, you would tokenize the card with a payment processor
      // For demo, we'll save a masked version
      const maskedNumber = cardNumber.slice(0, 4) + ' **** **** ' + cardNumber.slice(-4);
      
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: profile.id,
          type: cardType,
          last_four: cardNumber.slice(-4),
          masked_number: maskedNumber,
          cardholder_name: cardHolder,
          expiry_month: expiryDate.split('/')[0],
          expiry_year: '20' + expiryDate.split('/')[1],
          is_default: true
        });
        
      if (error) throw error;
      
      Alert.alert(
        'Success',
        'Payment method added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving payment method:', error);
      Alert.alert('Error', 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <AppHeader 
        title="Add Payment Method" 
        navigation={navigation} 
        canGoBack={true}
      />
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Credit Card Preview */}
          <View style={styles.cardContainer}>
            <Animated.View style={[styles.card, frontAnimatedStyle]}>
              <LinearGradient
                colors={cardType === 'visa' ? ['#1A1F71', '#1A1F71'] : 
                        cardType === 'mastercard' ? ['#EB001B', '#F79E1B'] : 
                        ['#333', '#555']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardChip} />
                  <View style={styles.cardTypeIcon}>
                    {cardType === 'visa' && (
                      <Text style={styles.visaText}>VISA</Text>
                    )}
                    {cardType === 'mastercard' && (
                      <View style={styles.mastercardIcon}>
                        <View style={[styles.circle, { backgroundColor: '#EB001B' }]} />
                        <View style={[styles.circle, { backgroundColor: '#F79E1B', marginLeft: -8 }]} />
                      </View>
                    )}
                  </View>
                </View>
                
                <Text style={styles.cardNumber}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </Text>
                
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardLabel}>CARD HOLDER</Text>
                    <Text style={styles.cardValue}>
                      {cardHolder.toUpperCase() || 'YOUR NAME'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>EXPIRES</Text>
                    <Text style={styles.cardValue}>
                      {expiryDate || 'MM/YY'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
            
            {/* Card Back */}
            <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
              <LinearGradient
                colors={['#333', '#555']}
                style={styles.cardGradient}
              >
                <View style={styles.magneticStripe} />
                <View style={styles.cvvContainer}>
                  <View style={styles.cvvStripe}>
                    <Text style={styles.cvvText}>{cvv || '•••'}</Text>
                  </View>
                  <Text style={styles.cvvLabel}>CVV</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
          
          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Card Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  keyboardType="numeric"
                  maxLength={19}
                />
                <MaterialCommunityIcons 
                  name="credit-card-outline" 
                  size={20} 
                  color="#999" 
                  style={styles.inputIcon}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cardholder Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  autoCapitalize="words"
                />
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color="#999" 
                  style={styles.inputIcon}
                />
              </View>
            </View>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Expiry Date</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChangeText={handleExpiryDateChange}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color="#999" 
                    style={styles.inputIcon}
                  />
                </View>
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>CVV</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    value={cvv}
                    onChangeText={handleCvvChange}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    onFocus={() => flipCard(true)}
                    onBlur={() => flipCard(false)}
                  />
                  <MaterialCommunityIcons 
                    name="lock-outline" 
                    size={20} 
                    color="#999" 
                    style={styles.inputIcon}
                  />
                </View>
              </View>
            </View>
            
            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={16} color="#34C759" />
              <Text style={styles.securityText}>
                Your payment information is encrypted and secure
              </Text>
            </View>
            
            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSaveCard}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Save Payment Method</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cardContainer: {
    height: 220,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
  },
  cardGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  cardChip: {
    width: 45,
    height: 35,
    backgroundColor: '#F0C14B',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardTypeIcon: {
    height: 40,
    justifyContent: 'center',
  },
  visaText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  mastercardIcon: {
    flexDirection: 'row',
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0.8,
  },
  cardNumber: {
    color: '#FFF',
    fontSize: 22,
    letterSpacing: 2,
    marginBottom: 30,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#FFF',
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 4,
  },
  cardValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  magneticStripe: {
    height: 50,
    backgroundColor: '#000',
    marginTop: 20,
  },
  cvvContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  cvvStripe: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
  cvvText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cvvLabel: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  inputIcon: {
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  securityText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#34C759',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default AddPaymentMethodScreen;