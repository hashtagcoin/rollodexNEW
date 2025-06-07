import React, { useState, useEffect } from 'react';
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
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown'; 
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader'; 
import Button from '../../components/common/Button';
import Card from '../../components/common/Card'; 
import ModernImagePicker from '../../components/ModernImagePicker'; 
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { HOUSING_TYPES, SDA_CATEGORIES, ACCESSIBILITY_FEATURES, PROPERTY_FEATURES } from '../../constants/formOptions';

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

const EditHousingListingScreen = ({ route, navigation }) => {
  const { housingId } = route.params;
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]); 
  const [existingImageUrls, setExistingImageUrls] = useState([]); 
  const [imagesToDelete, setImagesToDelete] = useState([]); 
  // const [uploadingImages, setUploadingImages] = useState(false); // Removed uploadingImages state
  const [availableDay, setAvailableDay] = useState('');
  const [availableMonth, setAvailableMonth] = useState('');
  const [availableYear, setAvailableYear] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    housingType: HOUSING_TYPES[0],
    bedrooms: '',
    bathrooms: '',
    price: '', 
    bondAmount: '',
    ndisEligible: false,
    sdaApproved: false,
    sdaCategory: '',
    ndisCommission: '',
    address: '', 
    addressSuburb: '', 
    addressState: '',  
    addressPostcode: '', 
    available: true,
    availableFrom: '',
    accessibilityFeatures: [],
    propertyFeatures: [],
  });

  useEffect(() => {
    fetchHousingDetails();
  }, [housingId]);

  const fetchHousingDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('housing_listings')
        .select('*')
        .eq('id', housingId)
        .single();
      
      if (error) throw error;
      
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Fetched housing data:', JSON.stringify(data));
      
      const { data: providerData } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      
      if (data.provider_id !== providerData.id) {
        Alert.alert('Error', 'You do not have permission to edit this housing listing');
        navigation.goBack();
        return;
      }
      
      setFormData({
        title: data.title || '',
        description: data.description || '',
        housingType: data.property_type || HOUSING_TYPES[0], // Changed from housing_type to property_type to match DB schema
        bedrooms: data.bedrooms ? data.bedrooms.toString() : '',
        bathrooms: data.bathrooms ? data.bathrooms.toString() : '',
        price: data.weekly_rent ? data.weekly_rent.toString() : '', // Changed from price_per_week to weekly_rent to match DB schema
        bondAmount: data.bond_amount ? data.bond_amount.toString() : '',
        ndisEligible: data.ndis_supported || false,
        sdaApproved: data.is_sda_certified || false,
        sdaCategory: data.sda_category || '',
        ndisCommission: data.ndis_commission ? data.ndis_commission.toString() : '',
        address: data.address || '', 
        addressSuburb: data.suburb || '', 
        addressState: data.state || '',  
        addressPostcode: data.postcode || '', 
        available: data.available !== undefined ? data.available : true, // Include the available field from database
        accessibilityFeatures: data.accessibility_features || [],
        propertyFeatures: data.features || [],
      });
      
      // Log media URLs for debugging
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Media URLs:', data.media_urls);
      
      if (data.media_urls && Array.isArray(data.media_urls)) {
        // Ensure all URLs are full public URLs and include userId subfolder if not already
        const processedUrls = data.media_urls.map(url => {
          if (url.startsWith('http')) {
            return url;
          }
          // Insert userId subfolder if missing (for legacy paths)
          const profileId = profile?.id;
          if (profileId && !url.includes(`housing-images/${profileId}/`)) {
            // Assume url is just filename, e.g. 'housing-images/abc.jpg' or 'housing-images/12345_abc.jpg'
            const fileName = url.split('/').pop();
            return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housing-images/${profileId}/${fileName}`;
          }
          // Otherwise, construct full URL
          return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/${url}`;
        });
        setExistingImageUrls(processedUrls);
      }
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Set existing image URLs:', data.media_urls);
      
      if (data.available_from) {
        const [yearPart, monthPart, dayPart] = data.available_from.split('T')[0].split('-');
        setAvailableYear(yearPart || '');
        setAvailableMonth(monthPart || '');
        setAvailableDay(dayPart || '');
      }
    } catch (error) {
      // console.error('Error fetching housing details:', error);
      Alert.alert('Error', 'Failed to load housing details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

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
    
    if (!formData.address.trim() || 
        !formData.addressSuburb.trim() || 
        !formData.addressState.trim() || 
        !formData.addressPostcode.trim()) {
      Alert.alert('Error', 'Full address information is required');
      return false;
    }
    
    if (formData.sdaApproved && !formData.sdaCategory.trim()) {
      Alert.alert('Error', 'SDA Category is required for SDA approved properties');
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
    
    return true;
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

  // ModernImagePicker now handles image selection directly with setImages

  const removeImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const handleDeleteExistingImage = (url) => {
    setImagesToDelete(prevUrls => [...prevUrls, url]);
  };

  const handleDeleteNewImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const uploadImages = async () => {
    try {
      const uploadedUrls = [];
      // Ensure profile.id is available in this scope
      const profileId = profile?.id; 

      if (!profileId) {
        // console.error('User profile ID not found for image upload path.');
        Alert.alert('Error', 'Could not upload images: User session error.');
        return []; 
      }

      for (const imageAsset of images) { 
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Processing image for upload:', imageAsset.uri);
        
        // Generate a unique filename using user ID for organization
        const timestamp = new Date().getTime();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const extension = imageAsset.uri.split('.').pop().toLowerCase() || 'jpg';
        const fileName = `housing-images/${profileId}/${timestamp}_${randomStr}.${extension}`;
        let base64Data;
        const contentType = 
          extension === 'png' ? 'image/png' : 
          extension === 'gif' ? 'image/gif' : 'image/jpeg';
        
        // Handle image data extraction
        if (imageAsset.base64) {
          // Use the base64 data directly if available
          base64Data = imageAsset.base64;
        } else if (imageAsset.uri) {
          try {
            // Use expo-file-system to read the file as base64
            base64Data = await FileSystem.readAsStringAsync(imageAsset.uri, {
              encoding: FileSystem.EncodingType.Base64
            });
            // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Successfully read file as base64, length:', base64Data.length);
          } catch (error) {
            // console.error('Error reading file:', error);
            Alert.alert('Upload Issue', 'Could not read image file. Please try a different image.');
            continue;
          }
        } else {
          // console.error('No valid image data found');
          continue;
        }
        
        // Convert base64 to array buffer for upload
        try {
          const arrayBuffer = decode(base64Data);
          // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Successfully converted base64 to array buffer');
          
          // Upload to Supabase storage
          const { data, error } = await supabase.storage
            .from('housing')
            .upload(fileName, arrayBuffer, {
              contentType,
              cacheControl: '3600',
              upsert: true
            });
    
          if (error) {
            // console.error('Supabase storage upload error:', error);
            throw error;
          }
          
          // Get public URL for the uploaded image
          const { data: urlData } = supabase.storage
            .from('housing')
            .getPublicUrl(fileName);
            
          if (urlData && urlData.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
            // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Successfully uploaded image:', urlData.publicUrl);
          } else {
            throw new Error('Failed to get public URL for uploaded image');
          }
        } catch (error) {
          // console.error('Error in upload process:', error);
          Alert.alert(
            'Upload Issue',
            'There was a problem uploading one of your images. Please try a different image.',
            [{ text: 'OK' }]
          );
        }
      }
      return uploadedUrls;
    } catch (error) {
      // console.error('Error uploading images:', error);
      Alert.alert('Error', 'An error occurred while uploading images. Please try again.');
      throw error; 
    }
  };

  // Function to update housing listing with changes
  const updateHousingListing = async () => {
    try {
      // Field validation
      if (!formData.title) {
        Alert.alert('Error', 'Please enter a title for your listing');
        return;
      }

      if (!formData.address || !formData.addressSuburb || !formData.addressState || !formData.addressPostcode) {
        Alert.alert('Error', 'Please complete all address fields');
        return;
      }

      setSaving(true);

      // Upload any new images
      let uploadedUrls = [];
      if (images.length > 0) {
        uploadedUrls = await uploadImages();
      }

      // Get existing image URLs not marked for deletion
      const remainingImageUrls = existingImageUrls.filter(url => !imagesToDelete.includes(url));

      // Combine with newly uploaded images
      const finalImageUrls = [...remainingImageUrls, ...uploadedUrls];

      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Final image URLs:', finalImageUrls);

      // Format the availableFrom date if all parts are provided
      let availableFromDate = null;
      if (availableYear && availableMonth && availableDay) {
        availableFromDate = `${availableYear}-${availableMonth}-${availableDay}T00:00:00Z`;
      }

      // Update the database record with field names matching database schema
      const { error } = await supabase
        .from('housing_listings')
        .update({
          title: formData.title,
          description: formData.description,
          property_type: formData.housingType, // Changed from housing_type to property_type to match DB schema
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          weekly_rent: formData.price ? parseFloat(formData.price) : null, // Changed from price_per_week to weekly_rent to match DB schema
          bond_amount: formData.bondAmount ? parseFloat(formData.bondAmount) : null,
          ndis_supported: formData.ndisEligible,
          is_sda_certified: formData.sdaApproved,
          sda_category: formData.sdaCategory || null,
          ndis_commission: formData.ndisCommission ? parseFloat(formData.ndisCommission) : null,
          address: formData.address,
          suburb: formData.addressSuburb,
          state: formData.addressState,
          postcode: formData.addressPostcode,
          available: formData.available, // Include the available field to control visibility in discovery
          available_from: availableFromDate,
          accessibility_features: formData.accessibilityFeatures,
          features: formData.propertyFeatures,
          media_urls: finalImageUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', housingId);

      if (error) {
        // console.error('Database error:', error);
        throw error;
      }

      Alert.alert('Success', 'Housing listing updated successfully!');
      navigation.goBack();
    } catch (error) {
      // console.error('Error updating housing listing:', error);
      Alert.alert('Error', 'Failed to update housing listing. ' + error.message);
    } finally {
      setSaving(false);
    }
  };

// ... (rest of the code remains the same)
  const deleteHousingListing = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('housing_listings')
        .delete()
        .eq('id', housingId);
      
      if (error) throw error;
      
      navigation.navigate('ManageListings');
      Alert.alert('Success', 'Housing listing deleted successfully');
    } catch (error) {
      // console.error('Error deleting housing listing:', error);
      Alert.alert('Error', 'Failed to delete housing listing');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <AppHeader
        title="Edit Housing Listing"
        navigation={navigation}
        showBackButton={true}
        onBackPressOverride={() => navigation.navigate('ManageListings')}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Image source={require('../../assets/loading.gif')} style={styles.loadingGif} />
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent} 
        >
          <Card style={styles.formCard}>
            <Text style={styles.screenTitle}>Edit Housing Listing</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter housing title"
                value={formData.title}
                onChangeText={(text) => handleChange('title', text)}
                maxLength={80}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description*</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the property in detail"
                value={formData.description}
                onChangeText={(text) => handleChange('description', text)}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {formData.description.length}/1000
              </Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Housing Type*</Text>
              <Dropdown
                style={[styles.dropdown, { zIndex: 3000 }]} 
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle} 
                iconStyle={styles.iconStyle} 
                data={HOUSING_TYPES.map(type => ({ label: type, value: type }))}
                search 
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={!formData.housingType ? 'Select housing type' : '...'}
                searchPlaceholder="Search..." 
                value={formData.housingType}
                onChange={item => {
                  handleChange('housingType', item.value);
                }}
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
                <Text style={styles.label}>Weekly Rent (AUD)*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={formData.price}
                  onChangeText={(text) => handleChange('price', text)}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Bond Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={formData.bondAmount}
                  onChangeText={(text) => handleChange('bondAmount', text)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Available From</Text>
              <View style={styles.formRow}>
                <Dropdown
                  style={[styles.dropdown, styles.dateDropdown, { flex: 1, marginRight: 8, zIndex: 1500 }]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={DAYS}
                  maxHeight={200}
                  labelField="label"
                  valueField="value"
                  placeholder="Day"
                  value={availableDay}
                  onChange={item => setAvailableDay(item.value)}
                />
                <Dropdown
                  style={[styles.dropdown, styles.dateDropdown, { flex: 1.5, marginRight: 8, zIndex: 1500 }]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={MONTHS}
                  maxHeight={200}
                  labelField="label"
                  valueField="value"
                  placeholder="Month"
                  value={availableMonth}
                  onChange={item => setAvailableMonth(item.value)}
                />
                <Dropdown
                  style={[styles.dropdown, styles.dateDropdown, { flex: 1.2, zIndex: 1500 }]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={YEARS}
                  maxHeight={200}
                  labelField="label"
                  valueField="value"
                  placeholder="Year"
                  value={availableYear}
                  onChange={item => setAvailableYear(item.value)}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>NDIS Information</Text>
              
              <View style={styles.switchRow}>
                <Text style={styles.label}>NDIS Eligible</Text> 
                <Switch
                  value={formData.ndisEligible}
                  onValueChange={(value) => handleChange('ndisEligible', value)}
                  trackColor={{ false: '#D1D1D6', true: COLORS.primaryLight }}
                  thumbColor={formData.ndisEligible ? COLORS.primary : '#F4F3F4'}
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.label}>SDA Approved</Text> 
                <Switch
                  value={formData.sdaApproved}
                  onValueChange={(value) => handleChange('sdaApproved', value)}
                  trackColor={{ false: '#D1D1D6', true: COLORS.primaryLight }}
                  thumbColor={formData.sdaApproved ? COLORS.primary : '#F4F3F4'}
                />
              </View>
              
              {formData.sdaApproved && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>SDA Category*</Text>
                  <Dropdown
                    style={[styles.dropdown, { zIndex: 2000 }]} 
                    placeholderStyle={styles.placeholderStyle} 
                    selectedTextStyle={styles.selectedTextStyle} 
                    inputSearchStyle={styles.inputSearchStyle} 
                    iconStyle={styles.iconStyle} 
                    data={SDA_CATEGORIES} 
                    search
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder={!formData.sdaCategory ? 'Select SDA category' : '...'}
                    searchPlaceholder="Search..."
                    value={formData.sdaCategory}
                    onChange={item => {
                      handleChange('sdaCategory', item.value);
                    }}
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
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.sectionTitle}>Property Address*</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Address (Number & Street)*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 123 Main St"
                  value={formData.address} 
                  onChangeText={(text) => handleChange('address', text)}
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
              <Text style={styles.sectionTitle}>Move-in Date</Text>
              <Text style={styles.helperText}>When will this property be available for tenants?</Text>
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
                    value={availableDay}
                    position="top"
                    onChange={item => setAvailableDay(item.value)}
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
                    value={availableMonth}
                    position="top"
                    onChange={item => setAvailableMonth(item.value)}
                  />
                </View>
                <View style={{flex: 1.2, marginLeft: 4}}>
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
                    value={availableYear}
                    position="top"
                    onChange={item => setAvailableYear(item.value)}
                  />
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>Accessibility Features</Text>
              <View style={styles.featuresList}>
                {ACCESSIBILITY_FEATURES.map((feature) => (
                  <TouchableOpacity 
                    key={feature}
                    style={[
                      styles.featureItem,
                      formData.accessibilityFeatures.includes(feature) && styles.featureSelected
                    ]}
                    onPress={() => toggleFeature(feature, 'accessibilityFeatures')}
                  >
                    <Text 
                      style={[
                        styles.featureText,
                        formData.accessibilityFeatures.includes(feature) && styles.featureTextSelected
                      ]}
                    >
                      {feature}
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
                    key={feature}
                    style={[
                      styles.featureItem,
                      formData.propertyFeatures.includes(feature) && styles.featureSelected
                    ]}
                    onPress={() => toggleFeature(feature, 'propertyFeatures')}
                  >
                    <Text 
                      style={[
                        styles.featureText,
                        formData.propertyFeatures.includes(feature) && styles.featureTextSelected
                      ]}
                    >
                      {feature}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.imageUploadContainer}>
              <Text style={styles.sectionTitle}>Property Images</Text>
              <Text style={styles.helperText}>Add up to 10 images to showcase your property</Text>
              <View style={styles.imagesContainer}>
                <View style={styles.imagePickerContainer}>
                  <TouchableOpacity 
                    style={styles.addImageButton}
                    onPress={async () => {
                      // Check if we've reached the maximum number of images
                      if ((images.length + existingImageUrls.length - imagesToDelete.length) >= 10) {
                        Alert.alert('Maximum images reached', 'You can upload a maximum of 10 images (including existing ones).');
                        return;
                      }

                      // No permissions request is necessary for launching the image library
                      // The picker will handle permission requests internally
                      let result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: false,
                        quality: 0.8,
                        base64: true, // Request base64 data for reliable upload
                        exif: false   // Skip exif data to reduce payload size
                      });

                      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Image picker result:', result);
                      
                      if (!result.canceled && result.assets && result.assets.length > 0) {
                        const selectedAsset = result.assets[0];
                        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// [LOG]'Selected image:', selectedAsset.uri);
                        
                        // Store both URI and base64 data for reliable upload
                        setImages(prevImages => [...prevImages, { 
                          uri: selectedAsset.uri,
                          base64: selectedAsset.base64,
                          width: selectedAsset.width,
                          height: selectedAsset.height,
                          type: selectedAsset.type || 'image/jpeg'
                        }]);
                      }
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <>
                        <MaterialIcons name="add-photo-alternate" size={24} color="#007AFF" />
                        <Text style={styles.addImageText}>Add Image</Text>
                        <Text style={styles.imageCountText}>
  {`${images.length + existingImageUrls.length - imagesToDelete.length}/10`}
</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
                  {existingImageUrls.filter(url => !imagesToDelete.includes(url)).map((url, index) => (
                    <View key={`existing-${index}`} style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: url }} 
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity 
                        onPress={() => handleDeleteExistingImage(url)} 
                        style={styles.removeButton}
                      >
                        <Text style={{color: 'white', fontWeight: 'bold'}}>X</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {images.map((image, index) => (
                    <View key={`new-${index}`} style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: image.uri }} 
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity 
                        onPress={() => handleDeleteNewImage(index)} 
                        style={styles.removeButton}
                      >
                        <Text style={{color: 'white', fontWeight: 'bold'}}>X</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Availability</Text>
              <Text style={styles.helperText}>Set listing visibility in discovery</Text>
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
                    Visible
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
                    Hidden
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title="Save Changes"
              onPress={updateHousingListing}
              loading={saving} // Removed uploadingImages from loading state
              style={styles.submitButton}
            />
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  "Delete Housing Listing",
                  "Are you sure you want to delete this housing listing? This action cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Delete", 
                      style: "destructive",
                      onPress: deleteHousingListing
                    }
                  ]
                );
              }}
            >
              <Text style={styles.deleteButtonText}>Delete Listing</Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGif: {
    width: 100,
    height: 100,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 12, // More pronounced Airbnb-style card corners
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 12,
    color: COLORS.text,
  },
  helperText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
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
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  dropdown: {
    height: 50,
    borderColor: COLORS.lightGray, // Changed from gray to lightGray for softer look
    borderWidth: 1, // Changed from 0.5 to 1 for better definition
    borderRadius: 8,
    paddingHorizontal: 12, // Increased padding
    backgroundColor: 'white', // Ensure background is white
    marginBottom: 10, // Added margin bottom for spacing in form groups
  },
  placeholderStyle: {
    fontSize: 16,
    color: COLORS.gray, // Ensure placeholder color is distinct
  },
  selectedTextStyle: {
    fontSize: 16,
    color: COLORS.black, // Ensure selected text color is clear
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 8, // Added border radius to search input
    borderColor: COLORS.lightGray, // Added border color
    borderWidth: 1, // Added border width
    paddingHorizontal: 10, // Added padding
  },
  dateDropdown: {
    // Specific styles for date dropdowns if needed, mostly handled by flex in formRow
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
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
  addressContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  imagePickerContainer: {
    marginBottom: 16,
  },
  addImageButton: {
    width: 120, 
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    marginRight: 10,
  },
  addImageText: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 4,
  },
  imageCountText: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  imagesContainer: {
    flexDirection: 'row', // Instagram-style horizontal list
    flexWrap: 'wrap',
    marginTop: 12,
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
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
  },
  addImageText: {
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '500',
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
  submitButton: {
    marginTop: 16,
  },
  deleteButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#D32F2F',
    fontWeight: '500',
    fontSize: 16,
  },
  instructionText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginVertical: 20,
  }
});

export default EditHousingListingScreen;
