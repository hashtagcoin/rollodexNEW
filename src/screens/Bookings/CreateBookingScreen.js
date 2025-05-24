import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import AppHeader from '../../components/layout/AppHeader';

const CreateBookingScreen = ({ route, navigation }) => {
  const { serviceId, serviceData } = route.params;
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('9:00 AM');
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('ndis'); // ndis, visa, mastercard
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  
  // Compliance modal state
  const [isComplianceModalVisible, setComplianceModalVisible] = useState(false);
  const [planAlignmentChecked, setPlanAlignmentChecked] = useState(false);
  const [ndisConsentChecked, setNdisConsentChecked] = useState(false);
  
  // Service agreement modal state
  const [isAgreementModalVisible, setAgreementModalVisible] = useState(false);
  
  // Calculate costs
  const [costs, setCosts] = useState({
    totalCost: 0,
    ndisCoverage: 0,
    gapPayment: 0
  });

  useEffect(() => {
    const fetchServiceDetails = async () => {
      try {
        if (serviceData) {
          setService(serviceData);
          setLoading(false);

          // Calculate costs based on service price
          const totalCost = Number(serviceData.price) || 0;
          const ndisCoverage = totalCost * 0.85; // Assume NDIS covers 85%
          const gapPayment = totalCost - ndisCoverage;
          
          setCosts({
            totalCost,
            ndisCoverage,
            gapPayment
          });
          
          return;
        }
        
        setLoading(true);
        
        // If no serviceData provided, fetch it using serviceId
        const { data, error } = await supabase
          .from('services')
          .select(`
            id, title, description, category, format, price, available, media_urls,
            service_providers!inner(
              business_name, credentials, verified, service_area, business_description, logo_url
            )
          `)
          .eq('id', serviceId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setService({
            id: data.id,
            title: data.title,
            description: data.description,
            category: data.category,
            format: data.format,
            price: data.price,
            available: data.available,
            media_urls: data.media_urls,
            business_name: data.service_providers.business_name,
            logo_url: data.service_providers.logo_url,
          });
          
          // Calculate costs based on service price
          const totalCost = Number(data.price) || 0;
          const ndisCoverage = totalCost * 0.85; // Assume NDIS covers 85%
          const gapPayment = totalCost - ndisCoverage;
          
          setCosts({
            totalCost,
            ndisCoverage,
            gapPayment
          });
        }
      } catch (err) {
        console.error('Error fetching service details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Set service title as provider
    setProvider({
      id: '123',
      name: serviceData?.title || 'Service'
    });
    
    fetchServiceDetails();
  }, [serviceId, serviceData]);
  
  // Simple functions to handle date changes with predefined options
  const handleSelectDate = (daysToAdd = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    setSelectedDate(date);
    setDateModalVisible(false);
  };
  
  const handleSelectTime = (timeStr) => {
    setSelectedTime(timeStr);
    setTimeModalVisible(false);
  };
  
  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    
    return `${dayName}, ${monthName} ${day}`;
  };
  
  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
  };
  
  const handleConfirmBooking = () => {
    // Show compliance modal first
    setComplianceModalVisible(true);
  };
  
  const handleComplianceConfirm = () => {
    // Only proceed if both checkboxes are checked
    if (planAlignmentChecked && ndisConsentChecked) {
      setComplianceModalVisible(false);
      
      // Show service agreement modal after compliance is confirmed
      setTimeout(() => {
        setAgreementModalVisible(true);
      }, 300); // Small delay for better UX
    } else {
      // Alert user that they need to check both boxes
      alert('Please confirm both compliance items before proceeding.');
    }
  };
  
  const handleReviewAgreement = () => {
    // Get the category from service data to maintain filter when returning to explore
    const category = service?.category || 'Therapy';
    
    // Close the agreement modal
    setAgreementModalVisible(false);
    
    // Navigate to service agreement with explore parameters to return to the same view
    navigation.navigate('ServiceAgreement', { 
      serviceId: serviceId,
      exploreParams: {
        initialCategory: category,
        // Add any other filter parameters here that should be preserved
      }
    });
  };
  
  const handleCancelBooking = () => {
    // Close modals and return to service detail
    setAgreementModalVisible(false);
    navigation.goBack();
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <AppHeader 
        title="Booking"
        canGoBack={true}
        navigation={navigation}
      />
      
      <ScrollView 
        style={styles.scrollView}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
          
          if (isCloseToBottom && !showConfirmButton) {
            setShowConfirmButton(true);
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Service Title */}
        <View style={styles.serviceTitleContainer}>
          <Text style={styles.serviceTitleText}>{service?.title || 'Service'}</Text>
        </View>
        
        {/* Date Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity 
            style={styles.selectionContainer}
            onPress={() => setDateModalVisible(true)}
          >
            <Text style={styles.selectionText}>{formatDate(selectedDate)}</Text>
            <Feather name="calendar" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* Time Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Time</Text>
          <TouchableOpacity 
            style={styles.selectionContainer}
            onPress={() => setTimeModalVisible(true)}
          >
            <Text style={styles.selectionText}>{selectedTime}</Text>
            <Feather name="chevron-right" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* Cost Calculation */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Cost Breakdown</Text>
          <View style={styles.costTable}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Service Fee</Text>
              <Text style={styles.costValue}>${costs.totalCost.toFixed(2)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>NDIS Coverage</Text>
              <Text style={styles.costValuePositive}>-${costs.ndisCoverage.toFixed(2)}</Text>
            </View>
            {costs.gapPayment > 0 && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Gap Payment</Text>
                <Text style={[styles.costValue, styles.gapPayment]}>${costs.gapPayment.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.costRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>You Pay</Text>
              <Text style={styles.totalValue}>${costs.gapPayment.toFixed(2)}</Text>
            </View>
          </View>
        </View>
        
        {/* Payment Method */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Payment</Text>
          
          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              paymentMethod === 'ndis' && styles.selectedPaymentOption
            ]}
            onPress={() => handlePaymentMethodSelect('ndis')}
          >
            <View style={styles.paymentOptionContent}>
              <View style={styles.ndisBox}>
                <Text style={styles.ndisText}>NDIS</Text>
              </View>
              <Text style={styles.paymentMethodText}>NDIS</Text>
            </View>
            
            {paymentMethod === 'ndis' && (
              <MaterialIcons name="check-circle" size={24} color="#2E7D32" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              paymentMethod === 'visa' && styles.selectedPaymentOption
            ]}
            onPress={() => handlePaymentMethodSelect('visa')}
          >
            <View style={styles.paymentOptionContent}>
              <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/800px-Visa_Inc._logo.svg.png' }}
                style={styles.cardImage}
                resizeMode="contain"
              />
              <Text style={styles.paymentMethodText}>•••• 4242</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              paymentMethod === 'mastercard' && styles.selectedPaymentOption
            ]}
            onPress={() => handlePaymentMethodSelect('mastercard')}
          >
            <View style={styles.paymentOptionContent}>
              <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/800px-Mastercard-logo.svg.png' }}
                style={styles.cardImage}
                resizeMode="contain"
              />
              <Text style={styles.paymentMethodText}>•••• 523 5004</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* Spacing for button */}
        <View style={{ height: 100 }} />
        
        {!showConfirmButton && (
          <View style={styles.scrollIndicatorContainer}>
            <Text style={styles.scrollIndicatorText}>Scroll down to continue</Text>
            <Feather name="chevrons-down" size={24} color="#666" style={{ marginTop: 8 }} />
          </View>
        )}
      </ScrollView>
      
      {/* Confirm Booking Button - only shown when scrolled to bottom */}
      {showConfirmButton && (
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmBooking}
          activeOpacity={0.8}
        >
          <Feather name="check-circle" size={22} color="white" />
          <Text style={styles.confirmButtonText}>Confirm Booking</Text>
        </TouchableOpacity>
      )}
      
      {/* Date Selection Modal */}
      <Modal
        visible={isDateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(0)}>
              <Text style={styles.modalOptionText}>{formatDate(new Date())}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(1)}>
              <Text style={styles.modalOptionText}>{formatDate(new Date(new Date().setDate(new Date().getDate() + 1)))}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(2)}>
              <Text style={styles.modalOptionText}>{formatDate(new Date(new Date().setDate(new Date().getDate() + 2)))}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(3)}>
              <Text style={styles.modalOptionText}>{formatDate(new Date(new Date().setDate(new Date().getDate() + 3)))}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectDate(7)}>
              <Text style={styles.modalOptionText}>{formatDate(new Date(new Date().setDate(new Date().getDate() + 7)))}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDateModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Time Selection Modal */}
      <Modal
        visible={isTimeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('9:00 AM')}>
              <Text style={styles.modalOptionText}>9:00 AM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('10:00 AM')}>
              <Text style={styles.modalOptionText}>10:00 AM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('11:00 AM')}>
              <Text style={styles.modalOptionText}>11:00 AM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('1:00 PM')}>
              <Text style={styles.modalOptionText}>1:00 PM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('2:00 PM')}>
              <Text style={styles.modalOptionText}>2:00 PM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectTime('3:00 PM')}>
              <Text style={styles.modalOptionText}>3:00 PM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setTimeModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Compliance Modal */}
      <Modal
        visible={isComplianceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setComplianceModalVisible(false)}
      >
        <View style={styles.complianceOverlay}>
          <View style={styles.complianceContainer}>
            <Text style={styles.complianceTitle}>Booking Compliance</Text>
            
            <View style={styles.warningContainer}>
              <Text style={styles.warningIcon}>⚠</Text>
              <Text style={styles.warningText}>Before proceeding, please confirm the following:</Text>
            </View>
            
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox} 
                onPress={() => setPlanAlignmentChecked(!planAlignmentChecked)}
              >
                <View style={styles.checkboxSquare}>
                  {planAlignmentChecked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>This service aligns with my plan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.checkbox} 
                onPress={() => setNdisConsentChecked(!ndisConsentChecked)}
              >
                <View style={styles.checkboxSquare}>
                  {ndisConsentChecked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>I consent to claiming this under NDIS funding</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleComplianceConfirm}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Service Agreement Modal */}
      <Modal
        visible={isAgreementModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAgreementModalVisible(false)}
      >
        <View style={styles.complianceOverlay}>
          <View style={styles.agreementContainer}>
            <View style={styles.agreementIconContainer}>
              <Feather name="file-text" size={40} color="#2E7D32" />
              <View style={styles.checkCircle}>
                <Feather name="check" size={16} color="white" />
              </View>
            </View>
            
            <Text style={styles.agreementTitle}>This Service Requires an Agreement</Text>
            
            <Text style={styles.agreementText}>
              Before booking, you must review and sign the agreement with this provider. 
              This ensures both parties are clear on responsibilities, support terms, and 
              cancellation policies.
            </Text>
            
            <Text style={styles.agreementNote}>
              You'll only need to sign this once unless changes are made.
            </Text>
            
            <TouchableOpacity 
              style={styles.reviewButton}
              onPress={handleReviewAgreement}
            >
              <Text style={styles.reviewButtonText}>Review Agreement</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelBooking}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollIndicatorContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  scrollIndicatorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  serviceTitleContainer: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceTitleText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
  selectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectionText: {
    fontSize: 16,
    color: '#333',
  },
  costTable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  costLabel: {
    fontSize: 16,
    color: '#555',
  },
  costValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  costValuePositive: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '500',
  },
  gapPayment: {
    color: '#E53935',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedPaymentOption: {
    borderColor: '#2E7D32',
    borderWidth: 2,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ndisBox: {
    backgroundColor: '#312783',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  ndisText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardImage: {
    width: 40,
    height: 25,
    marginRight: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#333',
  },
  confirmButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 16,
    left: 16,
    right: 16,
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: 'row',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  modalCancelButton: {
    marginTop: 15,
    paddingVertical: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  // Compliance modal styles
  complianceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  complianceContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  complianceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 20,
    color: '#F6B704',
    marginRight: 8,
  },
  warningText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  checkboxContainer: {
    marginBottom: 24,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxSquare: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#2E7D32',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Service Agreement Modal styles
  agreementContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  agreementIconContainer: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  agreementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  agreementText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  agreementNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  reviewButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default CreateBookingScreen;
