import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  Alert,
  Image
} from 'react-native';
import BookingConfirmationModal from '../../components/bookings/BookingConfirmationModal';
import { WebView } from 'react-native-webview';
import SignatureScreen from 'react-native-signature-canvas';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';
import { Feather } from '@expo/vector-icons';

const ServiceAgreementScreen = ({ route, navigation }) => {
  const { serviceId, viewOnly, agreementId, agreementContent, exploreParams } = route.params;
  const [loading, setLoading] = useState(true);
  const [serviceData, setServiceData] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [agreementHtml, setAgreementHtml] = useState('');
  const [signature, setSignature] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [showBookingConfirmationModal, setShowBookingConfirmationModal] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [bookingCreated, setBookingCreated] = useState(false);
  const webViewRef = useRef(null);
  const signatureRef = useRef(null);
  
  useEffect(() => {
    // Get current timestamp
    setTimestamp(new Date().toISOString());
    
    // Get IP address
    const getIpAddress = async () => {
      try {
        const ip = await Network.getIpAddressAsync();
        setIpAddress(ip);
      } catch (error) {
        console.error('Error getting IP address:', error);
        setIpAddress('Unknown');
      }
    };
    
    getIpAddress();
    
    // If we're viewing an existing agreement, just set the HTML directly
    if (viewOnly && agreementContent) {
      setAgreementHtml(agreementContent);
      setLoading(false);
    } else {
      // Otherwise fetch the service and provider data
      fetchData();
    }
  }, [serviceId, viewOnly, agreementContent]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch service data
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*, service_providers(*)')
        .eq('id', serviceId)
        .single();
        
      if (serviceError) throw serviceError;
      
      if (serviceData) {
        setServiceData(serviceData);
        setProviderData(serviceData.service_providers);
      }
      
      // 2. Fetch current user profile (using the test user from memory)
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', 'sarahconor@gmail.com')
        .single();
        
      if (userError) throw userError;
      
      if (userData) {
        setUserData(userData);
      }
      
      // Generate the agreement HTML with the data
      if (serviceData && userData) {
        generateAgreementHtml(serviceData, serviceData.service_providers, userData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Could not load service agreement data.');
    } finally {
      setLoading(false);
    }
  };
  
  const generateAgreementHtml = (service, provider, user) => {
    // Format the date
    const currentDate = new Date().toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Build a simple support table based on the service
    const supportTable = `
      <tr>
        <td>${service.title}</td>
        <td>${service.description}</td>
        <td>As needed</td>
        <td>Per session</td>
        <td>${service.format}</td>
        <td>$${service.price}</td>
      </tr>
    `;
    
    // Full agreement HTML with placeholders replaced
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            color: #2E7D32;
            margin-bottom: 30px;
          }
          h2 {
            color: #2E7D32;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-top: 25px;
          }
          .party-info {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .signature-area {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            border-top: 1px solid #000;
            margin-top: 50px;
            width: 45%;
          }
          .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .verification-info {
            margin-top: 30px;
            font-size: 11px;
            color: #666;
            text-align: left;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <h1>NDIS Service Agreement</h1>
        
        <h2>Between:</h2>
        <div class="party-info">
          <p><strong>Service Provider:</strong> ${provider.business_name}</p>
          <p><strong>NDIS Provider Number:</strong> [Provider NDIS Number]</p>
          <p><strong>ABN:</strong> ${provider.abn || '[Not provided]'}</p>
          <p><strong>Address:</strong> ${provider.service_area || '[Not provided]'}</p>
          <p><strong>Contact Details:</strong> [Contact details not provided]</p>
        </div>
        
        <h2>And:</h2>
        <div class="party-info">
          <p><strong>Participant Name:</strong> ${user.full_name}</p>
          <p><strong>NDIS Number:</strong> ${user.ndis_number || '[Not provided]'}</p>
          <p><strong>Date of Birth:</strong> [Not provided]</p>
          <p><strong>Contact Details:</strong> ${user.email || '[Not provided]'}</p>
        </div>
        
        <h2>1. Purpose of this Agreement</h2>
        <p>This Service Agreement is made for the purpose of providing NDIS supports and services under the participant's NDIS plan. It outlines the terms of service, responsibilities, and expectations of both parties.</p>
        
        <h2>2. Supports and Services to be Provided</h2>
        <p>The Provider agrees to deliver the following supports:</p>
        
        <table>
          <tr>
            <th>Support Name</th>
            <th>Description</th>
            <th>Frequency</th>
            <th>Duration</th>
            <th>Location</th>
            <th>Cost (per hour or session)</th>
          </tr>
          ${supportTable}
        </table>
        
        <p>Costs are in line with the current NDIS Price Guide.</p>
        
        <h2>3. Responsibilities</h2>
        <p><strong>The Provider agrees to:</strong></p>
        <ul>
          <li>Provide services as agreed in a safe, respectful and professional manner.</li>
          <li>Communicate openly and honestly.</li>
          <li>Issue regular invoices.</li>
          <li>Protect the participant's privacy and confidential information.</li>
          <li>Comply with NDIS Practice Standards and relevant legislation.</li>
        </ul>
        
        <p><strong>The Participant or Nominee agrees to:</strong></p>
        <ul>
          <li>Provide accurate information and communicate needs clearly.</li>
          <li>Respect the provider's staff and processes.</li>
          <li>Inform the provider of any changes to the NDIS plan or funding.</li>
          <li>Pay invoices on time (if self or plan managed).</li>
        </ul>
        
        <h2>4. Plan Management and Payments</h2>
        <table>
          <tr>
            <th>Funding Type</th>
            <th>Who Manages It?</th>
            <th>Invoicing To</th>
            <th>Payment Terms</th>
          </tr>
          <tr>
            <td>Core Supports</td>
            <td>NDIS</td>
            <td>NDIA</td>
            <td>7 days</td>
          </tr>
        </table>
        
        <p>The Provider will claim funds via:</p>
        <p>☒ NDIA Portal (Agency Managed)</p>
        
        <h2>5. Changes to the Agreement</h2>
        <p>This Agreement may be reviewed and amended by mutual consent. Changes must be agreed in writing and signed by both parties.</p>
        
        <h2>6. Cancellations and Missed Appointments</h2>
        <p>Cancellations must be made at least 24 hours in advance. Short notice cancellations or no-shows may incur full charges in accordance with the NDIS Price Guide.</p>
        
        <h2>7. Ending the Agreement</h2>
        <p>Either party may end this agreement with 14 days' written notice. Immediate termination may occur for breaches of safety, abuse, or unethical conduct.</p>
        
        <h2>8. Feedback, Complaints and Disputes</h2>
        <p>Feedback and complaints should first be raised with the Provider:</p>
        <p>Contact: ${provider.business_name}</p>
        
        <p>If unresolved, you may contact the NDIS Quality and Safeguards Commission:</p>
        <p>Phone: 1800 035 544</p>
        <p>Online: https://www.ndiscommission.gov.au</p>
        
        <h2>9. Privacy and Confidentiality</h2>
        <p>The Provider agrees to protect your privacy in accordance with the Privacy Act 1988 and the NDIS Act 2013, and will not disclose personal information without consent unless required by law.</p>
        
        <h2>10. Signatures</h2>
        <div class="signature-area">
          <div class="signature-box">
            <p><strong>Participant or Nominee</strong></p>
            <p>Name: ${user.full_name}</p>
            <p>Date: ${currentDate}</p>
            ${signature ? `<img src="${signature}" width="200" />` : '<p>[Signature Pending]</p>'}
          </div>
          
          <div class="signature-box">
            <p><strong>Service Provider</strong></p>
            <p>Name: ${provider.business_name}</p>
            <p>Date: ${currentDate}</p>
            <p>[Provider Signature]</p>
          </div>
        </div>
        
        <div class="verification-info">
          <p>IP Address: ${ipAddress}</p>
          <p>Timestamp: ${timestamp}</p>
          <p>Agreement ID: ${serviceId}</p>
        </div>
      </body>
      </html>
    `;
    
    setAgreementHtml(html);
  };
  
  // Handle signature
  const handleSignature = (signature) => {
    setSignature(signature);
    setShowSignatureModal(false);
  };
  
  // Clear signature
  const handleClear = () => {
    setSignature(null);
  };
  
  // Handle WebView messages
  const handleWebViewMessage = (event) => {
    // You can handle messages from the WebView here if needed
    console.log('Message from WebView:', event.nativeEvent.data);
  };
  
  // Navigate back to Explore screen with the same filters
  const navigateToExplore = () => {
    // Close the booking confirmation modal
    setShowBookingConfirmationModal(false);
    
    // Get category from the serviceData or default to 'Therapy'
    const category = serviceData?.category || 'Therapy';
    
    // Navigate back to the Explore stack and reset to ProviderDiscovery
    navigation.reset({
      index: 0,
      routes: [{ 
        name: 'ProviderDiscovery',
        params: {
          initialCategory: category,
          ...(exploreParams || {}) // Include any additional params that might have been passed
        }
      }],
    });
  };

  // Save agreement and booking using the admin function that bypasses RLS policies
  const saveAgreement = async () => {
    if (!signature) {
      Alert.alert('Missing Signature', 'Please sign the agreement before submitting.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a timestamp for the agreement
      const timestamp = new Date().toISOString();
      
      // Calculate NDIS coverage (85% for demo purposes)
      const totalPrice = Number(serviceData.price) || 0;
      const ndisCoveredAmount = totalPrice * 0.85;
      const gapPayment = totalPrice - ndisCoveredAmount;
      
      // Generate a placeholder URL for the agreement - in a real app you'd upload to storage
      const agreementUrl = `https://rollodex-agreements.storage.supabase.co/agreements/${userData.id}/${serviceId}/${new Date().getTime()}.pdf`;

      // Create a date 3 days from now for the booking
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 3);
      
      // Create the provider checklist JSON
      const providerChecklist = JSON.stringify([
        { item: 'Service Agreement Signed', checked: true, timestamp: timestamp },
        { item: 'Payment Method', value: 'NDIS', timestamp: timestamp }
      ]);
      
      // Prepare the notes
      const notes = `Service agreement signed on ${new Date(timestamp).toLocaleString()}. Payment method: NDIS.`;
      const providerNotes = `Participant signed service agreement. Agreement version: 1`;

      // Use the admin function to save both the agreement and booking
      // This bypasses RLS policies by using SECURITY DEFINER
      const { data, error } = await supabase
        .rpc('admin_save_agreement_and_booking', {
          user_id: userData.id,
          provider_id: providerData.id,
          service_id: serviceId,
          agreement_title: `Service Agreement - ${serviceData.title}`,
          agreement_version: 1,
          ip_address: ipAddress,
          agreement_url: agreementUrl,
          scheduled_at: scheduledAt.toISOString(),
          total_price: totalPrice,
          ndis_covered_amount: ndisCoveredAmount,
          gap_payment: gapPayment,
          notes: notes,
          provider_notes: providerNotes,
          provider_checklist: providerChecklist
        });

      if (error) {
        console.error('Error saving agreement and booking:', error);
        throw error;
      }
      
      // Fetch the created booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('id', data.booking_id)
        .single();

      if (bookingError) {
        console.error('Error fetching booking details:', bookingError);
        throw bookingError;
      }
      
      // No need to fetch booking details again since we already have them
      
      // Prepare the data for the confirmation modal
      const confirmationData = {
        ...bookingData,
        service_title: serviceData.title,
        service_description: serviceData.description,
        provider_name: providerData.business_name,
        service_media_url: serviceData.media_urls && serviceData.media_urls.length > 0 
          ? serviceData.media_urls[0] 
          : 'https://via.placeholder.com/400x200'
      };
      
      // Set the booking data for the modal
      setBookingData(confirmationData);
      setBookingCreated(true);
      
      // Show the booking confirmation modal
      setShowBookingConfirmationModal(true);
      
    } catch (error) {
      console.error('Error saving agreement and creating booking:', error);
      Alert.alert('Error', 'Could not complete your booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading service agreement...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <AppHeader
        title={viewOnly ? "View Agreement" : "Service\nAgreement"}
        navigation={navigation}
        canGoBack={true}
      />
      
      <View style={styles.pdfContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: agreementHtml }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
        />
      </View>
      
      {!viewOnly && (
        <View style={styles.actionButtons}>
          {!signature ? (
            <TouchableOpacity
              style={styles.signButton}
              onPress={() => setShowSignatureModal(true)}
            >
              <Text style={styles.signButtonText}>Sign Agreement</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
              >
                <Text style={styles.clearButtonText}>Clear Signature</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={saveAgreement}
              >
                <Text style={styles.submitButtonText}>Submit Agreement</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      
      {/* Signature Modal */}
      <Modal
        visible={showSignatureModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.signatureContainer}>
            <Text style={styles.signatureTitle}>Please sign below</Text>
            
            <View style={styles.signaturePadContainer}>
              <SignatureScreen
                ref={signatureRef}
                onOK={handleSignature}
                onEmpty={() => Alert.alert('Signature Required', 'Please provide your signature')}
                descriptionText="Sign above"
                clearText="Clear"
                confirmText=""
                autoClear={false}
                imageType="image/png"
                webStyle={`
                  .m-signature-pad--footer { display: none; }
                  .m-signature-pad--body { border-bottom: 1px solid #eee; }
                `}
              />
            </View>
            
            <View style={styles.signatureButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSignatureModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  if (signatureRef.current) {
                    signatureRef.current.readSignature();
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Accept & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        visible={showBookingConfirmationModal}
        onClose={() => setShowBookingConfirmationModal(false)}
        bookingData={bookingData}
        navigateToExplore={navigateToExplore}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
  pdfContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  webView: {
    flex: 1,
    backgroundColor: 'white',
  },
  actionButtons: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  signButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  signButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    flex: 1,
  },
  clearButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  signatureContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    height: 420,
  },
  signaturePadContainer: {
    height: 280,
    width: '100%',
    marginBottom: 20,
  },
  signatureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  signatureButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    flex: 1.5,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default ServiceAgreementScreen;
