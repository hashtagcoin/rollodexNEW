import React, { useState, useEffect, useRef } from 'react';
import { standardizeServiceImageUrls } from '../../utils/imageHelper';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather, MaterialIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ModernImagePicker from '../../components/ModernImagePicker';
import AvailabilityCalendarModal from '../../components/calendar/AvailabilityCalendarModal.clean';
import { COLORS, FONTS } from '../../constants/theme';

// Function to generate a random string for filenames
const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const SERVICE_CATEGORIES = [
  'Health',
  'Social Support',
  'Transport',
  'Home Maintenance',
  'Therapy',
  'Education',
  'Recreation',
  'Other',
];

const SERVICE_FORMATS = [
  'In-Person',
  'Remote',
  'Group',
  'Hybrid',
];

const CustomDropdown = ({ options, selectedValue, onSelect, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option === selectedValue) || '';

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.dropdownButtonText}>
          {selectedOption || placeholder}
        </Text>
        <AntDesign 
          name={isOpen ? "up" : "down"} 
          size={16} 
          color={COLORS.primary} 
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownMenu}>
          <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.dropdownItem, selectedValue === option && styles.dropdownItemSelected]}
                onPress={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, selectedValue === option && styles.dropdownItemTextSelected]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const CreateServiceListingScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Calendar and availability state variables
  const [modalVisible, setModalVisible] = useState(false); // Main modal visibility
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false); // Legacy variable kept for compatibility
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceId, setServiceId] = useState(null);
  const [calendarServiceId, setCalendarServiceId] = useState(null); // For calendar component
  const [calendarProviderId, setCalendarProviderId] = useState(null); // For calendar component
  const [availabilityData, setAvailabilityData] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: SERVICE_CATEGORIES[0],
    format: SERVICE_FORMATS[0],
    price: '',
    addressNumber: '',
    addressStreet: '',
    addressSuburb: '',
    addressState: '',
    addressPostcode: '',
    available: true,
  });

  const handleChange = (field, value) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return false;
    }
    
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Description is required');
      return false;
    }
    
    if (!formData.price.trim() || isNaN(parseFloat(formData.price))) {
      Alert.alert('Error', 'Valid price is required');
      return false;
    }
    
    if (formData.format === 'In-Person' && 
        (!formData.addressStreet.trim() || 
         !formData.addressSuburb.trim() || 
         !formData.addressState.trim() || 
         !formData.addressPostcode.trim())) {
      Alert.alert('Error', 'Address is required for in-person services');
      return false;
    }
    
    return true;
  };

  const handleImagePicked = (imageData) => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 images.');
      return;
    }
    
    // Get file extension from URI or mimeType
    const fileExt = imageData.uri.split('.').pop() || 
                  (imageData.mimeType ? imageData.mimeType.split('/')[1] : 'jpg');
    
    // Create a proper file name that will be used during upload
    const fileName = `service_${Date.now()}_${generateRandomString(8)}.${fileExt}`;
    
    setImages([...images, {
      uri: imageData.uri,
      fileName: fileName,
      mimeType: imageData.mimeType,
      width: imageData.width,
      height: imageData.height,
      fileSize: imageData.fileSize
    }]);
  };

  const removeImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const uploadImages = async () => {
    try {
      setUploadingImages(true);
      const uploadedUrls = [];
      
      for (const imageAsset of images) {
        // Use exact same approach as the working housing listing implementation
        const contentType = imageAsset.mimeType || 'application/octet-stream';

        // Get file extension from filename or mimetype
        const fileExt = imageAsset.fileName 
          ? imageAsset.fileName.split('.').pop() 
          : contentType.split('/')[1] || 'jpg';
        
        // Generate a long random string exactly as in housing listing
        const randomString = generateRandomString(32);
        const storageFileName = `${randomString}.${fileExt}`;
        const filePath = `service-images/${storageFileName}`;
        
        // Fetch and create blob from image URI
        let response;
        let blob;
        try {
          response = await fetch(imageAsset.uri);
          blob = await response.blob();
          
          // CRITICAL: Check for 0-byte blob which causes the blank image issue
          if (blob.size === 0) {
            console.warn(`[IMAGE_DEBUG][CreateServiceListingScreen] Skipping 0-byte blob for image: ${imageAsset.uri}`);
            Alert.alert('Upload Warning', `An image (${imageAsset.fileName || 'selected image'}) appears to be empty and was not uploaded.`);
            continue; // Skip this image
          }
          
          // Log successful blob creation for tracking
          console.log(`[IMAGE_DEBUG][CreateServiceListingScreen] Successfully created blob with size: ${blob.size} bytes for ${imageAsset.uri}`);
        } catch (blobError) {
          console.error('[IMAGE_DEBUG][CreateServiceListingScreen] Error creating blob from image:', blobError);
          Alert.alert('Image Error', 'Could not process an image. Please try a different one.');
          continue; // Skip this image
        }
        
        // Log pre-upload information
        console.log(`[IMAGE_DEBUG][CreateServiceListingScreen] Attempting upload to path: ${filePath}, blob size: ${blob.size} bytes`);
        
        const { data, error } = await supabase.storage
          .from('providerimages')
          .upload(filePath, blob, {
            contentType: contentType,
            cacheControl: '3600',
          });
        
        if (error) {
          console.error('[IMAGE_DEBUG][CreateServiceListingScreen] Supabase upload error:', {
            error: error.message,
            filePath,
            imageUri: imageAsset.uri,
            blobSize: blob.size
          });
          Alert.alert('Upload Error', 'There was a problem uploading your image. Please try again.');
          throw error;
        }
        
        console.log('[IMAGE_DEBUG][CreateServiceListingScreen] Upload successful to path:', filePath);
        
        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('providerimages')
          .getPublicUrl(filePath);
        
        // Comprehensive logging of the public URL that will be saved to database
        console.log('[IMAGE_DEBUG][CreateServiceListingScreen][URL_CREATED]', {
          publicUrl,
          filePath,
          storageFileName,
          blobSize: blob.size,
          timestamp: new Date().toISOString()
        });
        
        // Make sure we have a valid URL before adding to our list
        if (!publicUrl) {
          console.error('[IMAGE_DEBUG][CreateServiceListingScreen] Missing public URL for uploaded file:', filePath);
          Alert.alert('Warning', 'An image was uploaded but could not be properly referenced. Please check your images.');
          continue;
        }
        
        uploadedUrls.push(publicUrl);
      }
      
      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error; // Throw error exactly as in housing listing
    } finally {
      setUploadingImages(false);
    }
  };



  // The older handleAvailabilityChange function has been completely removed and replaced with a new version below.

  // Handle availability changes from the calendar modal - Instagram-style interactions
  const handleAvailabilityChange = async (slot) => {
    console.log('handleAvailabilityChange called with slot:', slot);
    
    try {
      if (!calendarServiceId || !calendarProviderId || !selectedDate) {
        console.error('Missing required data for availability change');
        return;
      }
      
      // Check if this is an add or remove operation based on the availability data
      const existingSlot = availabilityData.find(
        item => item.date === selectedDate && item.time === slot.timeValue
      );
      
      if (existingSlot) {
        // This is a remove operation
        console.log('Removing availability slot');
        const { error } = await supabase
          .from('availability')
          .delete()
          .match({
            service_id: calendarServiceId,
            provider_id: calendarProviderId,
            date: selectedDate,
            time: slot.timeValue
          });
          
        if (error) {
          console.error('Error removing availability:', error);
          Alert.alert('Error', 'Failed to remove availability time slot');
          return;
        }
        
        // Update local state
        setAvailabilityData(prev => prev.filter(item => 
          !(item.date === selectedDate && item.time === slot.timeValue)
        ));
      } else {
        // This is an add operation
        console.log('Adding availability slot');
        const newSlot = {
          service_id: calendarServiceId,
          provider_id: calendarProviderId,
          date: selectedDate,
          time: slot.timeValue
        };
        
        const { data, error } = await supabase
          .from('availability')
          .insert(newSlot)
          .select();
          
        if (error) {
          console.error('Error adding availability:', error);
          Alert.alert('Error', 'Failed to save availability time slot');
          return;
        }
        
        // Update local state with the new slot
        setAvailabilityData(prev => [...prev, newSlot]);
      }
      
      // Show Instagram-style feedback toast (simulated with Alert for now)
      Alert.alert('Success', 'Availability updated!', [{ text: 'OK' }]);
      
    } catch (error) {
      console.error('Error in handleAvailabilityChange:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };
  
  // Handle service creation success and set the service ID
  const handleServiceCreated = (serviceId) => {
    console.log('handleServiceCreated called with serviceId:', serviceId);
    console.log('Current profile:', profile);
    
    if (!serviceId || !profile) {
      Alert.alert('Error', 'Could not set up availability calendar.');
      return;
    }
    
    // Store the service ID and provider ID for the calendar
    console.log('Setting calendar IDs for availability modal...');
    console.log('Setting calendarServiceId:', serviceId);
    console.log('Setting calendarProviderId:', profile.id);
    
    // Instead of immediately updating multiple states, use a cleaner approach
    // Store the IDs first
    setCalendarServiceId(serviceId);
    setCalendarProviderId(profile.id);
    
    // Show Instagram-style success message
    Alert.alert(
      'Service Created Successfully!',
      'Would you like to set your availability now?',
      [
        {
          text: 'Later',
          onPress: () => {
            console.log('User chose to set availability later');
            navigation.navigate('ManageListings');
          },
          style: 'cancel'
        },
        {
          text: 'Set Availability',
          onPress: () => {
            console.log('User chose to set availability now');
            // Use a longer delay to ensure state is updated
            setTimeout(() => {
              console.log('Opening availability modal...');
              setModalVisible(true);
            }, 500);
          }
        }
      ]
    );
  };

  // Ensure the user has a service provider account using a database function that bypasses RLS
  const ensureProviderAccount = async () => {
    try {
      if (!profile || !profile.id) {
        throw new Error('User profile not found. Please ensure you are logged in.');
      }
      
      console.log('Checking for existing provider account or creating a new one...');
      
      // Call the database function we created to handle service provider creation
      // This function bypasses Row Level Security policies
      const { data, error } = await supabase.rpc('create_service_provider', {
        p_user_id: profile.id,
        p_business_name: profile.full_name || 'Service Provider',
        p_service_categories: formData.category ? [formData.category] : [],
        p_service_formats: formData.format ? [formData.format] : []
      });
      
      if (error) {
        console.error('Error calling create_service_provider function:', error);
        throw new Error(`Unable to create service provider: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Provider account function returned no ID');
      }
      
      console.log('Provider account ensured, ID:', data);
      return data;
    } catch (error) {
      console.error('Error in ensureProviderAccount:', error);
      throw error;
    }
  };
  
  // Modified createService function with better error handling for each step
  const createService = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Step 1: Get or create a service provider account
      let providerId;
      try {
        providerId = await ensureProviderAccount();
        console.log('Successfully got provider ID:', providerId);
      } catch (providerError) {
        console.error('Provider account error:', providerError);
        Alert.alert('Provider Account Error', 'Could not set up your service provider account. Please try again.');
        return;
      }
      
      // Step 2: Upload images if any
      let mediaUrls = [];
      if (images.length > 0) {
        try {
          mediaUrls = await uploadImages();
          console.log('Uploaded images:', mediaUrls);
        } catch (imageError) {
          console.error('Image upload error:', imageError);
          
          // Ask the user if they want to continue without images
          const continueWithoutImages = await new Promise((resolve) => {
            Alert.alert(
              'Image Upload Error',
              'Could not upload images. Would you like to continue creating the service without images?',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Continue', onPress: () => resolve(true) }
              ]
            );
          });
          
          if (!continueWithoutImages) {
            return;
          }
          
          // Continue with empty media_urls if user chooses to proceed
          mediaUrls = [];
        }
      }
      
      // Step 3: Create the service with Instagram-style UI feedback
      console.log('Creating service with provider ID:', providerId);
      
      // Show processing message with Instagram-style feedback
      Alert.alert('Creating Service', 'Your service is being created...');
      
      // Standardize the URLs before saving to database
      console.log('[IMAGE_DEBUG][CreateServiceListingScreen][SAVE] Original media URLs:', mediaUrls);
      
      // Process image URLs to ensure they have consistent format in the database
      // This is critical to fix the blank images issue
      const standardizedUrls = standardizeServiceImageUrls(mediaUrls, profile?.id, 'CreateServiceListingScreen-Save');
      console.log('[IMAGE_DEBUG][CreateServiceListingScreen][SAVE] Standardized URLs for database:', standardizedUrls);
      
      // Use the create_service RPC function to bypass RLS
      console.log('Using create_service RPC function to bypass RLS');
      const price = parseFloat(formData.price) || 0;
      
      const { data: serviceId, error } = await supabase.rpc('create_service', {
        p_provider_id: providerId,
        p_title: formData.title,
        p_description: formData.description,
        p_category: formData.category,
        p_format: formData.format,
        p_price: price,
        p_media_urls: standardizedUrls, // Use standardized URLs
        p_address_number: formData.addressNumber || '',
        p_address_street: formData.addressStreet || '',
        p_address_suburb: formData.addressSuburb || '',
        p_address_state: formData.addressState || '',
        p_address_postcode: formData.addressPostcode || '',
        p_available: formData.available === undefined ? true : formData.available
      });
      
      if (error) {
        console.error('Service creation database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Fetch the full service data after creation
      let data = null;
      if (serviceId) {
        const { data: serviceData, error: fetchError } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();
          
        if (!fetchError) {
          data = [serviceData];
        } else {
          console.log('Could not fetch created service details:', fetchError);
        }
      }
      
      // Step 4: Handle success with proper navigation - Instagram style success UI
      if (data && data.length > 0) {
        console.log('Service created successfully:', data[0].id);
        // Show success message with Instagram-style confirmation
        Alert.alert(
          'Success!',
          'Your service has been created. Would you like to set your availability now?',
          [
            { text: 'Later', onPress: () => navigation.navigate('ManageListings') },
            { text: 'Set Availability', onPress: () => handleServiceCreated(data[0].id) }
          ]
        );
      } else if (serviceId) {
        // We have the ID but couldn't fetch full details - still success
        console.log('Service created successfully with ID:', serviceId);
        // Show success message with Instagram-style confirmation
        Alert.alert(
          'Success!',
          'Your service has been created. Would you like to set your availability now?',
          [
            { text: 'Later', onPress: () => navigation.navigate('ManageListings') },
            { text: 'Set Availability', onPress: () => handleServiceCreated(serviceId) }
          ]
        );
      } else {
        console.log('Service created but no ID returned');
        Alert.alert('Service Created', 'Your service has been created successfully!');
        navigation.navigate('ManageListings');
      }
    } catch (error) {
      console.error('Error creating service listing:', error);
      Alert.alert('Error', error.message || 'Failed to create service listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Create Service Listing"
        navigation={navigation}
        canGoBack={true}
      />
      
      {/* Instagram-style Availability Calendar Modal */}
      <AvailabilityCalendarModal
        visible={modalVisible}
        onClose={() => {
          console.log('Modal closing from parent onClose handler');
          setModalVisible(false);
          navigation.navigate('ManageListings');
        }}
        onDateChange={(date) => {
          console.log('Date changed to:', date);
          setSelectedDate(date);
        }}
        onTimeSlotToggle={handleAvailabilityChange}
        serviceId={calendarServiceId}
        providerId={calendarProviderId}
        initialDate={selectedDate}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={true}>
        <Card style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title*</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter service title"
              value={formData.title}
              onChangeText={(text) => handleChange('title', text)}
              maxLength={80}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description*</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your service"
              value={formData.description}
              onChangeText={(text) => handleChange('description', text)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>
              {formData.description.length}/500
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Category*</Text>
            <CustomDropdown
              options={SERVICE_CATEGORIES}
              selectedValue={formData.category}
              onSelect={(value) => handleChange('category', value)}
              placeholder="Select a category"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Format*</Text>
            <CustomDropdown
              options={SERVICE_FORMATS}
              selectedValue={formData.format}
              onSelect={(value) => handleChange('format', value)}
              placeholder="Select a format"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Price (AUD)*</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={formData.price}
              onChangeText={(text) => handleChange('price', text)}
              keyboardType="numeric"
            />
          </View>

          {formData.format === 'In-Person' && (
            <View style={styles.addressContainer}>
              <Text style={styles.sectionTitle}>Service Location</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Street Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Street Number"
                  value={formData.addressNumber}
                  onChangeText={(text) => handleChange('addressNumber', text)}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Street*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Street"
                  value={formData.addressStreet}
                  onChangeText={(text) => handleChange('addressStreet', text)}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Suburb*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Suburb"
                  value={formData.addressSuburb}
                  onChangeText={(text) => handleChange('addressSuburb', text)}
                />
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>State*</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="State"
                    value={formData.addressState}
                    onChangeText={(text) => handleChange('addressState', text)}
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Postcode*</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Postcode"
                    value={formData.addressPostcode}
                    onChangeText={(text) => handleChange('addressPostcode', text)}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Service Images Section */}
          <Card style={styles.formSection}>
            <Text style={styles.sectionTitle}>Images</Text>
            <Text style={styles.sectionDescription}>Upload images of your service (up to 5 images).</Text>
            
            <View style={styles.imageGrid}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Feather name="x-circle" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length < 5 && (
                <View style={styles.addImageContainer}>
                  <ModernImagePicker 
                    onPick={handleImagePicked}
                    style={styles.modernImagePicker}
                  />
                  <Text style={styles.addImageText}>Add Image</Text>
                </View>
              )}
            </View>
          </Card>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Availability</Text>
            <View style={styles.switchContainer}>
              <TouchableOpacity
                style={[
                  styles.switchOption,
                  formData.available ? styles.switchActive : null,
                ]}
                onPress={() => handleChange('available', true)}
              >
                <Text
                  style={[
                    styles.switchText,
                    formData.available ? styles.switchTextActive : null,
                  ]}
                >
                  Available
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.switchOption,
                  !formData.available ? styles.switchActive : null,
                ]}
                onPress={() => handleChange('available', false)}
              >
                <Text
                  style={[
                    styles.switchText,
                    !formData.available ? styles.switchTextActive : null,
                  ]}
                >
                  Not Available
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Availability help text */}
          <View style={styles.availabilitySection}>
            <Text style={styles.sectionTitle}>Service Availability</Text>
            <Text style={styles.helpText}>
              After creating your service, you will be able to set up your availability calendar.
              This will let clients know when they can book your services.
            </Text>
          </View>

          <Button
            title="Create Service"
            onPress={createService}
            loading={loading || uploadingImages}
            style={styles.submitButton}
          />
          
          {/* Extra padding at bottom to ensure scroll reaches the end */}
          <View style={{ height: 50 }} />
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  scrollContentContainer: {
    paddingBottom: 100, // Extra padding to ensure scrolling to bottom
  },
  formCard: {
    padding: 16,
    marginBottom: 20,
  },
  formSection: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: 'white',
    width: '100%',
    top: 56,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  dropdownItemTextSelected: {
    fontWeight: '500',
    color: COLORS.primary,
  },
  addressContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    margin: 4,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 3,
  },
  addImageContainer: {
    width: 100,
    height: 100,
    margin: 4,
    alignItems: 'center',
  },
  modernImagePicker: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addImageText: {
    color: COLORS.primary,
    marginTop: 4,
    fontSize: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  switchOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  switchTextActive: {
    color: 'white',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 8,
  },
  availabilitySection: {
    marginVertical: 16,
  },
  submitButton: {
    marginTop: 16,
  },
});

export default CreateServiceListingScreen;
