import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Animated, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  Picker,
  Switch,
  Alert
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import AppHeader from '../../components/layout/AppHeader';
import { format, isValid, parseISO } from 'date-fns';
import BookingAvailabilityScreen from './BookingAvailabilityScreen';

// Safe date parser to handle potentially invalid date strings
const safelyCreateDate = (dateInput) => {
  try {
    // If it's already a Date object
    if (dateInput instanceof Date) {
      return isValid(dateInput) ? dateInput : new Date();
    }
    
    // If it's a string
    if (typeof dateInput === 'string') {
      const parsedDate = parseISO(dateInput);
      return isValid(parsedDate) ? parsedDate : new Date();
    }
    
    // Default to current date
    return new Date();
  } catch (error) {
    console.error('Error creating date:', error);
    return new Date(); // Fallback to current date
  }
};

const CreateBookingScreen = ({ route, navigation }) => {
  // --- Booking Availability Modal Integration ---
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null); // { date, time, rate }
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  // Get all parameters passed from ServiceDetailScreen
  const { 
    serviceId, 
    serviceName, 
    serviceProviderName, 
    servicePrice, 
    selectedDate: passedDate, 
    selectedTime: passedTime, 
    selectedTimeDisplay: passedTimeDisplay, 
    location: passedLocation 
  } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [selectedDate, setSelectedDate] = useState(passedDate ? safelyCreateDate(passedDate) : safelyCreateDate(new Date()));
  const [selectedTime, setSelectedTime] = useState(passedTimeDisplay || '9:00 AM');
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);
  const [isDurationModalVisible, setDurationModalVisible] = useState(false);
  const [primaryPayment, setPrimaryPayment] = useState('ndis');
  const [gapPayment, setGapPayment] = useState(null); // ndis, visa, mastercard
  const [selectedDuration, setSelectedDuration] = useState('1 hour');
  const [isOnline, setIsOnline] = useState(false);
  
  // Duration options from 15 mins to 24 hours
  const durationOptions = [
    '15 mins', '30 mins', '45 mins', '1 hour', '1.5 hours', 
    '2 hours', '3 hours', '4 hours', '6 hours', '8 hours',
    '12 hours', '24 hours'
  ];
  
  const toggleFormat = () => {
    setIsOnline(previousState => !previousState);
  };
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [pastPaymentSection, setPastPaymentSection] = useState(false);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  
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
        // If we have service data from passed parameters
        if (serviceName && serviceProviderName) {
          // Create service object from passed parameters
          const serviceObj = {
            id: serviceId,
            title: serviceName,
            business_name: serviceProviderName,
            price: servicePrice || 0,
            location: passedLocation
          };
          
          setService(serviceObj);
          setLoading(false);

          // Calculate costs based on service price
          const totalCost = Number(servicePrice) || 0;
          const ndisCoverage = totalCost * 0.85; // Assume NDIS covers 85%
          const gapPayment = totalCost - ndisCoverage;
          
          setCosts({
            totalCost,
            ndisCoverage,
            gapPayment
          });
          
          return;
        }
        // Fall back to using serviceId to fetch data
        else {
          // Fetch service details using the serviceId
          if (!serviceId) {
            console.error('No service ID or data provided');
            setLoading(false);
            return;
          }
          
          // Fetch from Supabase using serviceId
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
          
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching service details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Set service provider
    setProvider({
      id: '123',
      name: serviceProviderName || 'Service'
    });
    
    fetchServiceDetails();
  }, [serviceId, serviceName, serviceProviderName, servicePrice, passedLocation]);
  
  // --- Handler for opening the availability modal ---
  const handleOpenAvailability = () => {
    setShowAvailabilityModal(true);
  };

  // --- Handler for slot selection ---
  const handleSlotSelected = ({ date, time, rate }) => {
    setPendingBooking({ date, time, rate });
    setShowAvailabilityModal(false);
  };

  // --- Render selected booking details ---
  const renderPendingBooking = () => {
    if (!pendingBooking) return null;
    return (
      <View style={styles.pendingBookingCard}>
        <Text style={styles.pendingBookingTitle}>Selected Slot</Text>
        <Text style={styles.pendingBookingDetail}>Date: {pendingBooking.date}</Text>
        <Text style={styles.pendingBookingDetail}>Time: {pendingBooking.time}</Text>
        <Text style={styles.pendingBookingDetail}>Charge: ${pendingBooking.rate}</Text>
      </View>
    );
  };

  // Simple functions to handle date changes with predefined options
  const handleSelectDate = (daysToAdd = 0) => {
    try {
      // Create a new safe date
      const date = new Date();
      
      // Validate date before manipulating
      if (isValid(date)) {
        date.setDate(date.getDate() + daysToAdd);
        
        // Make sure the resulting date is valid
        if (isValid(date)) {
          setSelectedDate(date);
        } else {
          console.error('Invalid date after adding days');
          setSelectedDate(new Date()); // Fallback to current date
        }
      } else {
        console.error('Invalid initial date');
        setSelectedDate(new Date()); // Fallback to current date
      }
    } catch (error) {
      console.error('Error in handleSelectDate:', error);
      setSelectedDate(new Date()); // Fallback to current date
    }
    
    setDateModalVisible(false);
  };
  
  const handleSelectTime = (timeStr) => {
    setSelectedTime(timeStr);
    setTimeModalVisible(false);
  };
  
  const handleSelectDuration = (duration) => {
    setSelectedDuration(duration);
    setDurationModalVisible(false);
  };
  
  const formatDate = (date) => {
    try {
      // Make sure we have a valid date
      const safeDate = safelyCreateDate(date);
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const dayName = days[safeDate.getDay()];
      const monthName = months[safeDate.getMonth()];
      const day = safeDate.getDate();
      
      return `${dayName}, ${monthName} ${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };
  
  const handlePrimaryPaymentSelect = (method) => {
    setPrimaryPayment(method);
  };
  
  const handleGapPaymentSelect = (method) => {
    setGapPayment(method);
  };
  
  const handleConfirmBooking = () => {
    // Validate that we have both payment methods selected if needed
    if (costs.gapPayment > 0 && !gapPayment) {
      // Show alert if gap payment is needed but no method selected
      Alert.alert(
        'Payment Method Required',
        'Please select a payment method for your gap payment.',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }
    
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
    try {
      if (!serviceId) {
        console.error('Cannot proceed: serviceId is undefined');
        Alert.alert('Error', 'Service information is missing. Please try again.');
        return;
      }
      
      // Hide the agreement modal
      setAgreementModalVisible(false);
      
      // Navigate to the ServiceAgreementScreen
      navigation.navigate('ServiceAgreementScreen', {
        serviceId: serviceId,
        providerId: service?.provider_id,
        serviceName: service?.title,
        providerName: provider?.name || service?.business_name,
        fromBooking: true
      });

      // Get the category from service data to maintain filter when returning to explore
      const category = service?.category || 'Therapy';
      
      // Close the agreement modal
      setAgreementModalVisible(false);
      
      // Prepare booking details with serialized date
      const bookingDetails = {
        serviceId: serviceId,
        date: selectedDate && isValid(selectedDate) ? selectedDate.toISOString() : new Date().toISOString(),
        time: selectedTime || '12:00',
        duration: selectedDuration || 60,
        format: isOnline ? 'Online' : 'In-Person',
        provider: provider?.name || 'Service Provider',
        serviceTitle: service?.title || 'Service',
        price: costs?.totalCost || 0,
        ndisCoverage: costs?.ndisCoverage || 0,
        gapPayment: costs?.gapPayment || 0,
        primaryPayment: primaryPayment || 'ndis',
        gapPaymentMethod: gapPayment || null,
      };
      
      // Do not navigate to BookingsScreen
      // navigation.navigate('BookingsScreen', { 
        // serviceId: serviceId, // Pass serviceId at the root level for easier access
        // bookingDetails,
        // exploreParams: {
          // initialCategory: category,
        // }
      // });
    } catch (error) {
      console.error('Error in handleReviewAgreement:', error);
      Alert.alert('Error', 'Failed to proceed to agreement. Please try again.');
    }
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
        title="Create Booking"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, styles.horizontalPadding]}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          
          // Payment section is roughly 60% down the content - show button after that
          const paymentSectionEnd = contentSize.height * 0.6;
          const hasPassedPaymentSection = contentOffset.y > paymentSectionEnd;
          
          // Check if we're near the bottom of the scroll view
          const paddingToBottom = 20;
          const isCloseToBottom = 
            layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
            
          // Show button when either condition is met
          const shouldShowButton = hasPassedPaymentSection || isCloseToBottom;
          
          // Update button visibility state
          if (shouldShowButton !== showConfirmButton) {
            setShowConfirmButton(shouldShowButton);
            
            // Always animate button immediately
            Animated.timing(buttonOpacity, {
              toValue: shouldShowButton ? 1 : 0,
              duration: 150, // Faster animation for immediate feedback
              useNativeDriver: true
            }).start();
          }
          
          // Track payment section state separately for component updates
          if (hasPassedPaymentSection !== pastPaymentSection) {
            setPastPaymentSection(hasPassedPaymentSection);
          }
        }}
        scrollEventThrottle={200}
      >
        {/* Service Title */}
        <View style={[styles.serviceTitleContainer, styles.horizontalPadding]}>
          <Text style={styles.serviceTitleText}>{service?.title || 'Service'}</Text>
          <Text style={styles.serviceProviderText}>Provider: {service?.business_name || serviceProviderName || 'Unknown'}</Text>
          {passedLocation && <Text style={styles.locationText}>Location: {passedLocation}</Text>}
        </View>
        
        {/* Date Selection */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: '#000' }]}>Date</Text>
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
          <Text style={[styles.sectionTitle, { color: '#000' }]}>Time</Text>
          <TouchableOpacity 
            style={styles.selectionContainer}
            onPress={() => setTimeModalVisible(true)}
          >
            <Text style={[styles.selectionText, { color: '#000' }]}>{selectedTime}</Text>
            <Feather name="chevron-right" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        {/* Duration Selection */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: '#000' }]}>Duration</Text>
          <TouchableOpacity 
            style={styles.selectionContainer}
            onPress={() => setDurationModalVisible(true)}
          >
            <Text style={[styles.selectionText, { color: '#000' }]}>{selectedDuration}</Text>
            <Feather name="chevron-right" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        {/* Format Selection */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: '#000' }]}>Format</Text>
          <View style={styles.formatContainer}>
            <Text style={[styles.formatText, !isOnline && styles.formatTextActive]}>
              In-Person
            </Text>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isOnline ? '#2E7D32' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleFormat}
              value={isOnline}
              style={styles.formatSwitch}
            />
            <Text style={[styles.formatText, isOnline && styles.formatTextActive]}>
              Online
            </Text>
          </View>
          <Text style={styles.formatHelpText}>
            {isOnline 
              ? 'A meeting link will be provided after booking.' 
              : 'Service will be provided at the selected location.'}
          </Text>
        </View>
        
        {/* Cost Calculation */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: '#000' }]}>Cost Breakdown</Text>
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
        
        {/* Primary Payment Method */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: '#000' }]}>Primary Payment</Text>
          
          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              primaryPayment === 'ndis' && styles.selectedPaymentOption
            ]}
            onPress={() => handlePrimaryPaymentSelect('ndis')}
          >
            <View style={styles.paymentOptionContent}>
              <View style={styles.ndisBox}>
                <Text style={styles.ndisText}>NDIS</Text>
              </View>
              <Text style={styles.paymentMethodText}>NDIS</Text>
            </View>
            
            {primaryPayment === 'ndis' && (
              <MaterialIcons name="check-circle" size={24} color="#2E7D32" />
            )}
          </TouchableOpacity>
        </View>
          
        {/* Gap Payment Section */}
        {costs.gapPayment > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: '#000' }]}>Gap Payment - ${costs.gapPayment.toFixed(2)}</Text>
            <Text style={styles.gapPaymentInfo}>Select a payment method for your gap payment:</Text>
            
            <TouchableOpacity 
              style={[
                styles.paymentOption, 
                gapPayment === 'visa' && styles.selectedPaymentOption
              ]}
              onPress={() => handleGapPaymentSelect('visa')}
            >
              <View style={styles.paymentOptionContent}>
                <Image 
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/800px-Visa_Inc._logo.svg.png' }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <Text style={styles.paymentMethodText}>•••• 4242</Text>
              </View>
              {gapPayment === 'visa' && (
                <MaterialIcons name="check-circle" size={24} color="#2E7D32" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.paymentOption, 
                gapPayment === 'mastercard' && styles.selectedPaymentOption
              ]}
              onPress={() => handleGapPaymentSelect('mastercard')}
            >
              <View style={styles.paymentOptionContent}>
                <Image 
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/800px-Mastercard-logo.svg.png' }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <Text style={styles.paymentMethodText}>•••• 5235</Text>
              </View>
              {gapPayment === 'mastercard' && (
                <MaterialIcons name="check-circle" size={24} color="#2E7D32" />
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Spacing for button */}
        <View style={{ height: 100 }} />
        
        {!showConfirmButton && (
          <View style={styles.scrollIndicatorContainer}>
            <Text style={styles.scrollIndicatorText}>Scroll down to continue</Text>
            <Feather name="chevrons-down" size={24} color="#666" style={{ marginTop: 8 }} />
          </View>
        )}
      </ScrollView>
      
      {/* Confirm Booking Button - with animated fade in/out */}
      <Animated.View style={[styles.confirmButtonContainer, { opacity: buttonOpacity }]}>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmBooking}
          activeOpacity={0.8}
          disabled={!showConfirmButton}
        >
          <Feather name="check-circle" size={22} color="white" />
          <Text style={styles.confirmButtonText}>Confirm Booking</Text>
        </TouchableOpacity>
      </Animated.View>
      
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
      
      {/* Duration Selection Modal */}
      <Modal
        visible={isDurationModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDurationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Duration</Text>
            {durationOptions.map((duration) => (
              <TouchableOpacity 
                key={duration} 
                style={styles.modalOption} 
                onPress={() => handleSelectDuration(duration)}
              >
                <Text style={styles.modalOptionText}>{duration}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.modalCancelButton} 
              onPress={() => setDurationModalVisible(false)}
            >
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
  gapPaymentInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  horizontalPadding: {
    paddingHorizontal: 16,
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
  },
  serviceTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  serviceProviderText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
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
    color: '#000',
    flex: 1,
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
    fontSize: 15,
    color: '#000',
  },
  costValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  costValuePositive: {
    color: '#2E7D32',
    fontSize: 15,
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
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
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
  confirmButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  confirmButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  // Format Selection styles
  formatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  formatText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  formatTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  formatSwitch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
    marginHorizontal: 10,
  },
  formatHelpText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginLeft: 8,
    fontStyle: 'italic',
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
  scrollContent: {
    paddingVertical: 16,
  },
});

export default CreateBookingScreen;
