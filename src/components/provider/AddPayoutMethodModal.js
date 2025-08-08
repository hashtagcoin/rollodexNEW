import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';

const AddPayoutMethodModal = ({ visible, onClose, onSuccess, currentMethods, profileId }) => {
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('bank');
  
  // Bank account fields for Australian banks
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    bsb: '',
    accountNumber: '',
    bankName: ''
  });
  
  // PayPal fields
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState({});

  const resetForm = () => {
    setBankDetails({
      accountName: '',
      bsb: '',
      accountNumber: '',
      bankName: ''
    });
    setPaypalEmail('');
    setErrors({});
    setSelectedType('bank');
  };

  const validateBankDetails = () => {
    const newErrors = {};
    
    if (!bankDetails.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
    }
    
    // BSB validation (6 digits in format XXX-XXX)
    const bsbDigits = bankDetails.bsb.replace(/[^0-9]/g, '');
    if (!bsbDigits || bsbDigits.length !== 6) {
      newErrors.bsb = 'BSB must be 6 digits';
    }
    
    // Account number validation (6-10 digits for Australian banks)
    const accountDigits = bankDetails.accountNumber.replace(/[^0-9]/g, '');
    if (!accountDigits || accountDigits.length < 6 || accountDigits.length > 10) {
      newErrors.accountNumber = 'Account number must be 6-10 digits';
    }
    
    if (!bankDetails.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePayPal = () => {
    const newErrors = {};
    
    if (!paypalEmail.trim()) {
      newErrors.paypalEmail = 'PayPal email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
      newErrors.paypalEmail = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatBSB = (text) => {
    // Remove all non-digits
    const digits = text.replace(/[^0-9]/g, '');
    
    // Format as XXX-XXX
    if (digits.length <= 3) {
      return digits;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
    }
  };

  const handleSave = async () => {
    // Check if user already has 3 methods
    if (currentMethods && currentMethods.length >= 3) {
      Alert.alert('Limit Reached', 'You can only have up to 3 payout methods.');
      return;
    }
    
    // Validate based on type
    let isValid = false;
    if (selectedType === 'bank') {
      isValid = validateBankDetails();
    } else if (selectedType === 'paypal') {
      isValid = validatePayPal();
    }
    
    if (!isValid) return;
    
    setLoading(true);
    
    try {
      let payoutMethodData = {
        provider_id: profileId,
        type: selectedType,
        is_default: !currentMethods || currentMethods.length === 0,
        is_active: true
      };
      
      if (selectedType === 'bank') {
        const accountDigits = bankDetails.accountNumber.replace(/[^0-9]/g, '');
        payoutMethodData.name = `${bankDetails.bankName} - ${bankDetails.accountName}`;
        payoutMethodData.last4 = accountDigits.slice(-4);
        payoutMethodData.details = {
          account_name: bankDetails.accountName,
          bsb: bankDetails.bsb.replace(/[^0-9]/g, ''),
          account_number_masked: `****${accountDigits.slice(-4)}`,
          bank_name: bankDetails.bankName,
          country: 'AU'
        };
      } else if (selectedType === 'paypal') {
        payoutMethodData.name = 'PayPal';
        payoutMethodData.details = {
          email: paypalEmail,
          type: 'paypal'
        };
      }
      
      const { data, error } = await supabase
        .from('provider_payout_methods')
        .insert(payoutMethodData)
        .select()
        .single();
        
      if (error) {
        console.error('Error saving payout method:', error);
        
        // Handle RLS error
        if (error.code === '42501') {
          Alert.alert(
            'Permission Error',
            'You do not have permission to add payout methods. Please ensure you are logged in as a provider.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            error.message || 'Failed to save payout method. Please try again.',
            [{ text: 'OK' }]
          );
        }
        return;
      }
      
      Alert.alert('Success', 'Payout method added successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            resetForm();
            onClose();
            if (onSuccess) onSuccess();
          }
        }
      ]);
      
    } catch (error) {
      console.error('Error saving payout method:', error);
      Alert.alert('Error', 'Failed to save payout method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderBankForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Australian Bank Account Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Account Name</Text>
        <TextInput
          style={[styles.input, errors.accountName && styles.inputError]}
          value={bankDetails.accountName}
          onChangeText={(text) => setBankDetails({...bankDetails, accountName: text})}
          placeholder="John Smith"
          placeholderTextColor="#999"
        />
        {errors.accountName && <Text style={styles.errorText}>{errors.accountName}</Text>}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>BSB</Text>
        <TextInput
          style={[styles.input, errors.bsb && styles.inputError]}
          value={bankDetails.bsb}
          onChangeText={(text) => setBankDetails({...bankDetails, bsb: formatBSB(text)})}
          placeholder="123-456"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={7}
        />
        {errors.bsb && <Text style={styles.errorText}>{errors.bsb}</Text>}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Account Number</Text>
        <TextInput
          style={[styles.input, errors.accountNumber && styles.inputError]}
          value={bankDetails.accountNumber}
          onChangeText={(text) => setBankDetails({...bankDetails, accountNumber: text})}
          placeholder="123456789"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={10}
        />
        {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bank Name</Text>
        <TextInput
          style={[styles.input, errors.bankName && styles.inputError]}
          value={bankDetails.bankName}
          onChangeText={(text) => setBankDetails({...bankDetails, bankName: text})}
          placeholder="Commonwealth Bank"
          placeholderTextColor="#999"
        />
        {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
      </View>
      
      <View style={styles.bankInfo}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.bankInfoText}>
          Your bank details are encrypted and stored securely. We never store full account numbers.
        </Text>
      </View>
    </View>
  );

  const renderPayPalForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>PayPal Account</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>PayPal Email</Text>
        <TextInput
          style={[styles.input, errors.paypalEmail && styles.inputError]}
          value={paypalEmail}
          onChangeText={setPaypalEmail}
          placeholder="your@email.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.paypalEmail && <Text style={styles.errorText}>{errors.paypalEmail}</Text>}
      </View>
      
      <View style={styles.bankInfo}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.bankInfoText}>
          Make sure this is the email associated with your PayPal account.
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Payout Method</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Method Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'bank' && styles.typeButtonActive]}
                onPress={() => setSelectedType('bank')}
              >
                <MaterialCommunityIcons 
                  name="bank" 
                  size={24} 
                  color={selectedType === 'bank' ? COLORS.primary : '#666'} 
                />
                <Text style={[styles.typeButtonText, selectedType === 'bank' && styles.typeButtonTextActive]}>
                  Bank Account
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'paypal' && styles.typeButtonActive]}
                onPress={() => setSelectedType('paypal')}
              >
                <Ionicons 
                  name="logo-paypal" 
                  size={24} 
                  color={selectedType === 'paypal' ? COLORS.primary : '#666'} 
                />
                <Text style={[styles.typeButtonText, selectedType === 'paypal' && styles.typeButtonTextActive]}>
                  PayPal
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Form based on selected type */}
            {selectedType === 'bank' ? renderBankForm() : renderPayPalForm()}
          </ScrollView>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.saveButton, loading && styles.disabledButton]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Add Method</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    ...FONTS.h3,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  typeButtonActive: {
    backgroundColor: '#E8F3FF',
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    ...FONTS.body3,
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: COLORS.primary,
  },
  formContainer: {
    marginBottom: 20,
  },
  formTitle: {
    ...FONTS.body2,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...FONTS.body4,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    ...FONTS.body5,
    color: '#FF3B30',
    marginTop: 4,
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  bankInfoText: {
    ...FONTS.body5,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default AddPayoutMethodModal;