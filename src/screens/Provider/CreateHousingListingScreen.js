import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback, // Note: This import is present but not used in the component. Not a syntax error, but linters might flag it.
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from 'expo-image-picker';

// Function to generate a random string for filenames
const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card'; // Card component is imported
import { COLORS, FONTS } from '../../constants/theme';
import { HOUSING_TYPES, SDA_CATEGORIES, ACCESSIBILITY_FEATURES, PROPERTY_FEATURES } from '../../constants/formOptions';

// const HOUSING_TYPES = [ /* Content moved to formOptions.js */ ]; // Moved to formOptions.js

// SDA categories
// const SDA_CATEGORIES = [ /* Content moved to formOptions.js */ ]; // Moved to formOptions.js

// Date dropdown options
const DAYS = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: String(i + 1).padStart(2, '0') }));
const MONTHS = [
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];
const YEARS = Array.from({ length: 6 }, (_, i) => {
  const year = new Date().getFullYear() + i;
  return { label: String(year), value: String(year) };
});

// const ACCESSIBILITY_FEATURES = [ /* Content moved to formOptions.js */ ]; // Moved to formOptions.js

// const PROPERTY_FEATURES = [ /* Content moved to formOptions.js */ ]; // Moved to formOptions.js

const CreateHousingListingScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);

  // Handle image loading errors to prevent TurboModule crashes
  const handleImageError = (error, uri, imageType) => {
    if (__DEV__) {
      console.warn('CreateHousingListingScreen: Image failed to load', {
        imageType,
        uri: uri?.substring(0, 50) + '...',
        error: error?.nativeEvent || error,
        platform: Platform.OS
      });
    }
  };
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    housingType: HOUSING_TYPES[0].value,
    bedrooms: '',
    bathrooms: '',
    price: '',
    bondAmount: '',
    ndisEligible: false,
    sdaApproved: false,
    sdaCategory: '',
    ndisCommission: '',
    addressNumber: '',
    addressStreet: '',
    addressSuburb: '',
    addressState: '',
    addressPostcode: '',
    available: true,
    availableDay: new Date().getDate().toString().padStart(2, '0'),
    availableMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    availableYear: new Date().getFullYear().toString(),
    accessibilityFeatures: [],
    propertyFeatures: [],
  });

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value,
    }));
  };

  const toggleFeature = (feature, list) => {
    const updatedList = [...formData[list]];
    const index = updatedList.indexOf(feature);
    
    if (index === -1) {
      updatedList.push(feature);
    } else {
      updatedList.splice(index, 1);
    }
    
    setFormData(prevData => ({
      ...prevData,
      [list]: updatedList,
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
    
    if (!formData.price) {
      Alert.alert('Error', 'Weekly rent is required');
      return false;
    }
    
    if (isNaN(parseFloat(formData.price))) {
      Alert.alert('Error', 'Weekly rent must be a valid number');
      return false;
    }
    
    if (formData.bedrooms && isNaN(parseInt(formData.bedrooms))) {
      Alert.alert('Error', 'Bedrooms must be a valid number');
      return false;
    }
    
    if (formData.bathrooms && isNaN(parseInt(formData.bathrooms))) {
      Alert.alert('Error', 'Bathrooms must be a valid number');
      return false;
    }
    
    if (formData.bondAmount && isNaN(parseFloat(formData.bondAmount))) {
      Alert.alert('Error', 'Bond amount must be a valid number');
      return false;
    }
    
    if (formData.sdaApproved && !formData.sdaCategory) {
      Alert.alert('Error', 'SDA Category is required when SDA Approved is enabled');
      return false;
    }
    
    if (!formData.addressStreet.trim() || !formData.addressSuburb.trim() || !formData.addressState.trim() || !formData.addressPostcode.trim()) {
      Alert.alert('Error', 'Complete address is required');
      return false;
    }
    
    // Validate date format if provided (Note: formData.availableFrom is not directly in state, but constructed later. This check might be for an older version or a field not present in the current formData structure.)
    // If you have a specific 'availableFrom' text input, this validation is relevant. Currently, date is handled by dropdowns.
    // if (formData.availableFrom && formData.availableFrom.trim()) {
    //   const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    //   if (!dateRegex.test(formData.availableFrom.trim())) {
    //     Alert.alert('Error', 'Available From date must be in YYYY-MM-DD format');
    //     return false;
    //   }
    // }
    
    return true;
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant permission to access your photo library');
          return;
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        let mimeType = selectedAsset.mimeType;
        if (!mimeType && selectedAsset.uri) {
          const uriParts = selectedAsset.uri.split('.');
          const extension = uriParts.pop().toLowerCase();
          if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
          else if (extension === 'png') mimeType = 'image/png';
          else if (extension === 'gif') mimeType = 'image/gif';
          else if (extension === 'webp') mimeType = 'image/webp';
          else mimeType = 'application/octet-stream'; // Fallback
        }
        if (!mimeType) mimeType = 'application/octet-stream'; // Ensure it's set

        setImages(prevImages => [...prevImages, { 
          uri: selectedAsset.uri, 
          mimeType: mimeType,
          fileName: selectedAsset.fileName || `image.${mimeType.split('/')[1] || 'jpg'}` // Store original filename or a generated one
        }]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
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
      
      for (const imageAsset of images) { // imageAsset is now { uri, mimeType, fileName }
        const contentType = imageAsset.mimeType || 'application/octet-stream';

        // Use a unique name for storage, can use original extension from mimeType or fileName
        const fileExt = imageAsset.fileName ? imageAsset.fileName.split('.').pop() : contentType.split('/')[1] || 'jpg';
        const randomString = generateRandomString(32);
        const storageFileName = `${randomString}.${fileExt}`;
        const filePath = `housing-images/${storageFileName}`;
        
        const response = await fetch(imageAsset.uri);
        const blob = await response.blob();

        if (blob.size === 0) {
          console.warn(`Skipping 0-byte blob for image: ${imageAsset.uri}`);
          Alert.alert('Upload Warning', `An image (${imageAsset.fileName || 'selected image'}) appears to be empty and was not uploaded.`);
          continue; // Skip this image
        }
        
        const { data, error } = await supabase.storage
          .from('housing')
          .upload(filePath, blob, {
            contentType: contentType,
            cacheControl: '3600',
          });
        
        if (error) {
          console.error('Supabase upload error for:', imageAsset.uri, error);
          throw error;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('housing')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }
      
      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const createHousingListing = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      if (!profile || !profile.id) {
        Alert.alert('Error', 'User profile not loaded. Please try again.');
        setLoading(false);
        return;
      }

      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      
      if (providerError) {
        console.error('Error fetching provider ID:', providerError);
        throw new Error('Unable to find your service provider profile. Please ensure you are registered as a service provider.');
      }

      if (!providerData) {
        throw new Error('No service provider profile found. Please create a service provider profile first.');
      }
      
      const providerId = providerData.id;
      
      let mediaUrls = [];
      if (images.length > 0) {
        mediaUrls = await uploadImages();
      }
      
      const currentDate = new Date().toISOString(); // Use ISO string for timestamp fields
      const availableFromDate = `${formData.availableYear}-${formData.availableMonth}-${formData.availableDay}`;

      const { error } = await supabase
        .from('housing_listings')
        .insert({
          provider_id: providerId,
          title: formData.title,
          description: formData.description,
          property_type: formData.housingType,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
          weekly_rent: parseFloat(formData.price),
          bond_amount: formData.bondAmount ? parseFloat(formData.bondAmount) : null,
          ndis_supported: formData.ndisEligible,
          is_sda_certified: formData.sdaApproved,
          sda_category: formData.sdaApproved ? formData.sdaCategory : 'not_applicable', // Send 'not_applicable' if not approved
          address: `${formData.addressNumber} ${formData.addressStreet}`.trim(),
          suburb: formData.addressSuburb,
          state: formData.addressState,
          postcode: formData.addressPostcode,
          available_from: availableFromDate,
          accessibility_features: formData.accessibilityFeatures,
          features: formData.propertyFeatures,
          media_urls: mediaUrls,
          // created_at and updated_at are usually handled by DB triggers (DEFAULT now())
          // last_updated: currentDate, // If you have this field, ensure it's a timestamp
          pets_allowed: formData.propertyFeatures.includes('Pets Allowed'),
          coordinates: null, // This will be set using a geocoding service later
        });
      
      if (error) throw error;
      
      Alert.alert('Success', 'Housing listing created successfully', [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('ManageListings')
        }
      ]);
    } catch (error) {
      console.error('Error creating housing listing:', error);
      Alert.alert('Error', error.message || 'Failed to create housing listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <AppHeader 
        title="Create Housing Listing"
        navigation={navigation}
        canGoBack={true}
      />
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.scrollContent}>
            <Card style={styles.card}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Listing Title*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter property title"
                  value={formData.title}
                  onChangeText={(text) => handleChange('title', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description*</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the property..."
                  value={formData.description}
                  onChangeText={(text) => handleChange('description', text)}
                  multiline
                  numberOfLines={5}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Housing Type*</Text>
                <Dropdown
                  style={[styles.dropdown, { zIndex: 3000 }]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={HOUSING_TYPES}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Select housing type"
                  value={formData.housingType}
                  onChange={item => handleChange('housingType', item.value)}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Bedrooms</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.bedrooms}
                    onChangeText={(text) => handleChange('bedrooms', text)}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Bathrooms</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.bathrooms}
                    onChangeText={(text) => handleChange('bathrooms', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Weekly Rent*</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$"
                    value={formData.price}
                    onChangeText={(text) => handleChange('price', text)}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Bond Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$"
                    value={formData.bondAmount}
                    onChangeText={(text) => handleChange('bondAmount', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>NDIS Eligible</Text>
                  <Switch
                    value={formData.ndisEligible}
                    onValueChange={(value) => handleChange('ndisEligible', value)}
                    trackColor={{ false: '#D1D1D6', true: COLORS.primaryLight }}
                    thumbColor={formData.ndisEligible ? COLORS.primary : '#F4F3F4'}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>SDA Approved</Text>
                  <Switch
                    value={formData.sdaApproved}
                    onValueChange={(value) => handleChange('sdaApproved', value)}
                    trackColor={{ false: '#D1D1D6', true: COLORS.primaryLight }}
                    thumbColor={formData.sdaApproved ? COLORS.primary : '#F4F3F4'}
                  />
                </View>
              </View>

              {formData.sdaApproved && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>SDA Category*</Text>
                  <Dropdown
                    style={[styles.dropdown, { zIndex: 2000 }]}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    data={SDA_CATEGORIES.map(category => ({ label: category.label, value: category.value }))}
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder="Select SDA category"
                    value={formData.sdaCategory}
                    onChange={item => handleChange('sdaCategory', item.value)}
                  />
                </View>
              )}

              {formData.ndisEligible && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>NDIS Commission (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 10"
                    value={formData.ndisCommission}
                    onChangeText={(text) => handleChange('ndisCommission', text)}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </Card>

            <View style={styles.addressContainer}>
              <Text style={styles.sectionTitle}>Property Address*</Text>
              
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

            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>Accessibility Features</Text>
              <View style={styles.featuresList}>
                {ACCESSIBILITY_FEATURES.map((feature) => (
                  <TouchableOpacity 
                    key={feature.value}
                    style={[
                      styles.featureItem,
                      formData.accessibilityFeatures.includes(feature.value) ? styles.featureSelected : null
                    ]}
                    onPress={() => toggleFeature(feature.value, 'accessibilityFeatures')}
                  >
                    <Text 
                      style={[
                        styles.featureText,
                        formData.accessibilityFeatures.includes(feature.value) ? styles.featureTextSelected : null
                      ]}
                    >
                      {feature.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>Property Features</Text>
              <View style={styles.featuresList}>
                {PROPERTY_FEATURES.map((feature) => (
                  <TouchableOpacity 
                    key={feature.value}
                    style={[
                      styles.featureItem,
                      formData.propertyFeatures.includes(feature.value) ? styles.featureSelected : null
                    ]}
                    onPress={() => toggleFeature(feature.value, 'propertyFeatures')}
                  >
                    <Text 
                      style={[
                        styles.featureText,
                        formData.propertyFeatures.includes(feature.value) ? styles.featureTextSelected : null
                      ]}
                    >
                      {feature.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Property Images</Text>
              <Text style={styles.helperText}>Add up to 10 images to showcase the property</Text>

              <View style={styles.imagesContainer}>
                {images.map((image, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image 
                      source={{ uri: image.uri }} 
                      style={styles.imagePreview}
                      onError={(error) => handleImageError(error, image.uri, 'image_preview')}
                      onLoadStart={() => {
                        if (__DEV__) {
                          console.log('CreateHousingListingScreen: Image preview loading started', { imageIndex: index });
                        }
                      }}
                      onPartialLoad={() => {
                        if (__DEV__) {
                          console.log('CreateHousingListingScreen: Image preview partial load', { imageIndex: index });
                        }
                      }}
                      defaultSource={require('../../../assets/placeholder-image.png')}
                      loadingIndicatorSource={require('../../../assets/placeholder-image.png')}
                      fadeDuration={0}
                      progressiveRenderingEnabled={true}
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(index)}
                    >
                      <Feather name="x" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < 10 && (
                  <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                    <Feather name="plus" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Availability</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[
                    styles.switchOption,
                    formData.available ? styles.switchActive : undefined
                  ]}
                  onPress={() => handleChange('available', true)}
                >
                  <Text
                    style={[
                      styles.switchText,
                      formData.available ? styles.switchTextActive : undefined
                    ]}
                  >
                    Available
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.switchOption,
                    !formData.available ? styles.switchActive : undefined
                  ]}
                  onPress={() => handleChange('available', false)}
                >
                  <Text
                    style={[
                      styles.switchText,
                      !formData.available ? styles.switchTextActive : undefined
                    ]}
                  >
                    Not Available
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {formData.available && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Available From*</Text>
                <View style={styles.formRow}>
                  <View style={{flex: 1, marginRight: 4}}>
                    <Text style={styles.helperText}>Day</Text>
                    <Dropdown
                      style={[styles.dropdown, { zIndex: 1500 }]}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      data={DAYS}
                      maxHeight={250}
                      labelField="label"
                      valueField="value"
                      placeholder="Day"
                      value={formData.availableDay}
                      onChange={item => handleChange('availableDay', item.value)}
                    />
                  </View>
                  <View style={{flex: 2, marginHorizontal: 4}}>
                    <Text style={styles.helperText}>Month</Text>
                    <Dropdown
                      style={[styles.dropdown, { zIndex: 1500 }]}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      data={MONTHS}
                      maxHeight={250}
                      labelField="label"
                      valueField="value"
                      placeholder="Month"
                      value={formData.availableMonth}
                      onChange={item => handleChange('availableMonth', item.value)}
                    />
                  </View>
                  <View style={{flex: 1, marginLeft: 4}}>
                    <Text style={styles.helperText}>Year</Text>
                    <Dropdown
                      style={[styles.dropdown, { zIndex: 1500 }]}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      data={YEARS}
                      maxHeight={200}
                      labelField="label"
                      valueField="value"
                      placeholder="Year"
                      value={formData.availableYear}
                      onChange={item => handleChange('availableYear', item.value)}
                    />
                  </View>
                </View>
              </View>
            )}

            <Button
              title="Create Housing Listing"
              onPress={createHousingListing}
              loading={loading || uploadingImages}
              style={styles.submitButton}
            />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContent: { // This style is now correctly referenced
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32, // Added more padding at bottom for scrollability
  },
  card: { // This style is used by the <Card> component
    backgroundColor: 'white', // Assuming Card might not have default background
    borderRadius: 8, // Assuming Card might need styling
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000', // Optional: add some shadow for card effect
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
    marginBottom: 16,
    marginTop: 8,
    color: COLORS.text,
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
  charCount: { // This style is defined but not used in the JSX. Not a syntax error.
    alignSelf: 'flex-end',
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  dropdown: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    // marginBottom: 8, // Can be removed if formGroup handles bottom margin
    // zIndex: 1000, // zIndex is applied inline in JSX where needed
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: COLORS.text,
  },
  datePickerContainer: { // This style is defined but not used directly in the JSX for date pickers (using Dropdown).
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  datePickerItem: { // This style is defined but not used.
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: { // This style is defined but not used.
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 4,
    fontWeight: '500',
  },
  inputSearchStyle: { // This style is for Dropdown search input, if enabled.
    height: 40,
    fontSize: 16,
  },
  iconStyle: { // This style is for Dropdown icon.
    width: 20,
    height: 20,
  },
  dropdownIcon: { // This style is defined but not explicitly used (Dropdown might use it internally or via props).
    marginRight: 8,
  },
  pickerContainer: { // This style is defined but not used (using Dropdown, not Picker).
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: { // This style is defined but not used.
    height: 50,
  },
  addressContainer: {
    marginTop: 8, // Or manage via Card's marginBottom
    marginBottom: 8,
    // If you want address also in a card, wrap it with <Card style={styles.card}>
    // padding: 16, // Add padding if it's not inside a card
    // backgroundColor: 'white', // Add background if not inside a card
    // borderRadius: 8,
    // ... (similar to card style if desired)
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: 12, // Handled by formGroup
    paddingVertical: 4,
  },
  // switchLabel: { // This style is defined but seems like styles.label is used instead.
  //   fontSize: 16,
  //   color: COLORS.text,
  // },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  featureItem: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    margin: 4,
  },
  featureSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  featureTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imageWrapper: {
    position: 'relative',
    margin: 4,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    backgroundColor: '#F9F9F9',
  },
  switchContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    overflow: 'hidden',
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
  submitButton: {
    marginTop: 16,
    marginBottom: 16, // Added margin at bottom for better spacing when scrolled
  },
});

export default CreateHousingListingScreen;