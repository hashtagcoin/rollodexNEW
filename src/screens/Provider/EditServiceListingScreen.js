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
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabaseClient';

// Function to generate a random string for filenames
const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { COLORS, FONTS } from '../../constants/theme';

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

const EditServiceListingScreen = ({ route, navigation }) => {
  const { serviceId } = route.params;
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]);
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const [removedImageUrls, setRemovedImageUrls] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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

  useEffect(() => {
    fetchServiceDetails();
    // We don't need to call loadUserProfile() as it doesn't exist
    // The profile is already available via useUser() context
    
    // Log any existing image URLs for debugging
    if (existingImageUrls.length > 0) {
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Existing images on load:', existingImageUrls);
    }
  }, []);
  
  // This effect refreshes the UI when we navigate back to this screen
  useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    if (serviceId) {
      setImages([]); // Clear unsaved images to avoid grey squares
      fetchServiceDetails();
    }
  });
  return unsubscribe;
}, [navigation, serviceId]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();
      
      if (error) throw error;
      
      // Check if the current user is the provider of this service
      const { data: providerData } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      
      if (data.provider_id !== providerData.id) {
        Alert.alert('Error', 'You do not have permission to edit this service');
        navigation.goBack();
        return;
      }
      
      // Set the form data from the retrieved service
      setFormData({
        title: data.title || '',
        description: data.description || '',
        category: data.category || SERVICE_CATEGORIES[0],
        format: data.format || SERVICE_FORMATS[0],
        price: data.price ? data.price.toString() : '',
        addressNumber: data.address_number || '',
        addressStreet: data.address_street || '',
        addressSuburb: data.address_suburb || '',
        addressState: data.address_state || '',
        addressPostcode: data.address_postcode || '',
        available: data.available !== undefined ? data.available : true,
      });
      
      // Set existing image URLs
      if (data.media_urls && Array.isArray(data.media_urls)) {
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'[EditServiceListingScreen] Raw DB media_urls:', data.media_urls);
        // Ensure all URLs are full paths with correct user subfolder structure
        const processedUrls = data.media_urls.filter(url => url && typeof url === 'string').map(url => {
          if (url.startsWith('http')) {
            return url;
          }
          // Insert userId subfolder if missing (for legacy paths)
          const profileId = profile?.id;
          if (profileId && !url.includes(`service-images/${profileId}/`)) {
            const fileName = url.split('/').pop();
            return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/service-images/${profileId}/${fileName}`;
          }
          // Otherwise, construct full URL
          return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/${url}`;
        });
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'[EditServiceListingScreen] Processed image URLs:', processedUrls);
        setExistingImageUrls(processedUrls);
        setTimeout(() => {
          // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'[EditServiceListingScreen] State existingImageUrls:', processedUrls);
        }, 500);
      }
    } catch (error) {
      // [LOG] (Removed error logs except for Alert/critical errors)'Error fetching service details:', error);
      Alert.alert('Error', 'Failed to load service details');
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

  const pickImage = async () => {
    try {
      // No need to request permissions explicitly as ImagePicker now handles this internally
      const maxImages = 10 - (existingImageUrls.length + images.length);
      
      if (maxImages <= 0) {
        Alert.alert('Image Limit', 'You have reached the maximum number of images allowed (10).');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
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
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Image picker result:', result.canceled ? 'Canceled' : `Selected ${result.assets?.length || 0} image(s)`);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
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
    } catch (error) {
      // [LOG] (Removed error logs except for Alert/critical errors)'Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const removeImage = (index) => {
    // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Removing new image at index:', index);
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
    Alert.alert('Image Removed', 'The selected image has been removed');
  };

  const removeExistingImage = (index) => {
    // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Removing existing image at index:', index);
    const imageUrl = existingImageUrls[index];
    // Add to removed images list
    setRemovedImageUrls(prev => [...prev, imageUrl]);
    // Remove from UI
    setExistingImageUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
    Alert.alert('Image Removed', 'The existing image has been removed and will be deleted when you save');
  };

  const uploadImages = async () => {
    if (images.length === 0) return [];
    
    setUploadingImages(true);
    const uploadedUrls = [];
    
    try {
      // Get the profile ID for use in the folder path
      if (!profile) {
        throw new Error('User profile not found');
      }
      const profileId = profile.id;
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Using profile ID for uploads:', profileId);
      
      // Create the service-images folder first to ensure it exists
      try {
        await supabase.storage
          .from('providerimages')
          .upload('service-images/.emptyFolderPlaceholder', new Uint8Array(0), {
            contentType: 'text/plain',
            upsert: true
          });
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Verified service-images folder access');
    } catch (folderError) {
      // If error is about the file already existing, that's fine
      if (!folderError.message.includes('already exists')) {
        // console.log(warn('Error creating service-images folder:', folderError);
      }
    }
    
    // Create the user-specific folder
    const userFolderPath = `service-images/${profileId}`;
    try {
      await supabase.storage
        .from('providerimages')
        .upload(`${userFolderPath}/.emptyFolderPlaceholder`, new Uint8Array(0), {
          contentType: 'text/plain',
          upsert: true
        });
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Created user folder placeholder');
    } catch (folderErr) {
      if (!folderErr.message.includes('already exists')) {
        // console.log(warn('Error creating user folder:', folderErr);
      }
    }
    
    // Process and upload each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const timestamp = new Date().getTime();
      const randomString = generateRandomString(16);
      const uri = image.uri;
      const fileExt = uri.split('.').pop().toLowerCase();
      let uploadData = null;
      let uploadContentType = 'application/octet-stream';

      // Prepare image data
      try {
        if (image.base64) {
          uploadData = decode(image.base64);
          uploadContentType = `image/${fileExt}` === 'image/jpg' ? 'image/jpeg' : `image/${fileExt}`;
        } else {
          try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64
            });
            uploadData = decode(base64);
            uploadContentType = `image/${fileExt}` === 'image/jpg' ? 'image/jpeg' : `image/${fileExt}`;
          } catch (fileReadErr) {
            try {
              const response = await fetch(uri);
              uploadData = await response.blob();
              uploadContentType = uploadData.type;
            } catch (blobErr) {
              Alert.alert('Error', `Failed to prepare image ${i+1}: ${blobErr.message}`);
              continue;
            }
          }
        }
        if (uploadData instanceof ArrayBuffer && uploadData.byteLength === 0) {
          Alert.alert('Error', `Image ${i+1} appears to be corrupted or empty. Please select a different image.`);
          continue;
        }
        if (uploadData instanceof Blob && uploadData.size === 0) {
          Alert.alert('Error', `Image ${i+1} appears to be corrupted or empty. Please select a different image.`);
          continue;
        }
      } catch (dataErr) {
        Alert.alert('Error', `Failed to prepare image ${i+1}: ${dataErr.message}`);
        continue;
      }

      // Upload with retry logic
      let fileName = `${userFolderPath}/${timestamp}_${randomString}.${fileExt}`;
      let uploadSuccess = false;
      let attempts = 0;
      let maxAttempts = 3;
      let uploadCompleted = false;
      try {
        while (!uploadCompleted && attempts < maxAttempts) {
          attempts++;
          const { data, error } = await supabase.storage
            .from('providerimages')
            .upload(fileName, uploadData, {
              contentType: uploadContentType,
              cacheControl: '3600',
              upsert: false
            });
          if (error) {
            if (error.message.includes('already exists')) {
              const newRandomString = generateRandomString(16);
              fileName = `${userFolderPath}/${timestamp}_${newRandomString}.${fileExt}`;
              continue;
            }
            throw error;
          }
          uploadCompleted = true;
          // Get the public URL for the successfully uploaded image
          const { data: { publicUrl } } = supabase.storage
            .from('providerimages')
            .getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
          setExistingImageUrls(prev => [...prev, publicUrl]);
        }
        if (!uploadCompleted) {
          throw new Error('Failed after maximum upload attempts');
        }
      } catch (uploadError) {
        Alert.alert('Upload Error', uploadError.message || 'Failed to upload image');
        continue;
      }
    }
      
      // Clear the images array since they've been uploaded and moved to existingImageUrls
      setImages([]);
      
      return uploadedUrls;
    } catch (err) {
      // [LOG] (Removed error logs except for Alert/critical errors)'Error during image upload:', err);
      Alert.alert('Upload Error', err.message || 'An error occurred during image upload');
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const updateService = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Starting service update process...');
      
      // Upload new images if any
      let newMediaUrls = [];
      if (images.length > 0) {
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]`Uploading ${images.length} new images...`);
        newMediaUrls = await uploadImages();
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Uploaded image URLs:', newMediaUrls);
      }
      
      // Filter out any removed images and combine with new media URLs
      // Make sure we filter by URL without worrying about parameter differences
      const filteredExistingUrls = existingImageUrls.filter(url => {
        // Check if this URL isn't in the removedImageUrls list
        return !removedImageUrls.some(removedUrl => {
          // Compare base URLs without query parameters
          const baseUrl = url.split('?')[0];
          const baseRemovedUrl = removedUrl.split('?')[0];
          return baseUrl === baseRemovedUrl;
        });
      });
      
      // Combine filtered existing URLs with new uploaded URLs
      const allMediaUrls = [...filteredExistingUrls, ...newMediaUrls];
      
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Removed image URLs:', removedImageUrls);
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Filtered existing URLs:', filteredExistingUrls);
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'New media URLs:', newMediaUrls);
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'All media URLs to save:', allMediaUrls);
      
      // Prepare update object
      const updateData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        format: formData.format,
        price: parseFloat(formData.price),
        media_urls: allMediaUrls,
        address_number: formData.addressNumber,
        address_street: formData.addressStreet,
        address_suburb: formData.addressSuburb,
        address_state: formData.addressState,
        address_postcode: formData.addressPostcode,
        available: formData.available
      };
      
      // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Updating service record with data:', updateData);
      
      // Update the service
      const { data, error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', serviceId)
        .select();
      
      if (error) throw error;
      
      // Update the existing image URLs to match what's in the database
      if (data && data[0] && data[0].media_urls) {
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Database returned media_urls:', data[0].media_urls);
        
        // Ensure all URLs in the database are full URLs
        const processedUrls = data[0].media_urls.filter(url => url && typeof url === 'string').map(url => {
          // If the URL is already a full URL, return it as is
          if (url.startsWith('http')) {
            return url;
          }
          
          // Otherwise, construct the full URL with the Supabase storage URL
          return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/${url}`;
        });
        
        // [LOG] Only keep logs for:
// 1. URL saved to Supabase on upload
// 2. URL displayed on screen when rendering
// Remove all other logs.
//
// (Below, all logs will be removed except those two cases)
//
// [LOG]'Processed URLs after update:', processedUrls);
        setExistingImageUrls(processedUrls);
        setRemovedImageUrls([]);
      }
      
      Alert.alert('Success', 'Service listing updated successfully', [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('ManageListings')
        }
      ]);
    } catch (error) {
      // [LOG] (Removed error logs except for Alert/critical errors)'Error updating service listing:', error);
      Alert.alert('Error', error.message || 'Failed to update service listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AppHeader
          title="Edit Service Listing"
          showBack
          onBack={() => navigation.goBack()}
        />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Edit Service Listing"
        navigation={navigation}
        showBackButton={true}
      />

      <ScrollView style={styles.scrollContainer}>
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
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.category}
                style={styles.picker}
                onValueChange={(value) => handleChange('category', value)}
              >
                {SERVICE_CATEGORIES.map((category) => (
                  <Picker.Item key={category} label={category} value={category} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Format*</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.format}
                style={styles.picker}
                onValueChange={(value) => handleChange('format', value)}
              >
                {SERVICE_FORMATS.map((format) => (
                  <Picker.Item key={format} label={format} value={format} />
                ))}
              </Picker>
            </View>
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

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Service Images</Text>
              <Text style={styles.imageCount}>{existingImageUrls.length + images.length}/10 images</Text>
            </View>
            
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false} 
              style={styles.imagesScrollView}
              contentContainerStyle={styles.imagesScrollContent}
            >
              {/* Existing Images */}
              {existingImageUrls.map((url, index) => (
                <View key={`existing-${index}`} style={styles.imageCard}>
                  <Image source={{ uri: url }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeExistingImage(index)}
                  >
                    <Feather name="x-circle" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* New Images */}
              {images.map((image, index) => (
                <View key={`new-${index}`} style={styles.imageCard}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <View style={styles.newImageBadge}>
                    <Text style={styles.newImageText}>New</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Feather name="x-circle" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Add Image Button */}
              {(existingImageUrls.length + images.length) < 10 && (
                <TouchableOpacity 
                  style={styles.addImageCard} 
                  onPress={pickImage}
                  disabled={uploadingImages}
                >
                  {uploadingImages ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Feather name="plus" size={32} color={COLORS.primary} />
                      <Text style={styles.addImageText}>Add Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
            
            <Text style={styles.helperText}>
              Tip: High-quality images help attract more clients to your service
            </Text>
          </View>

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

          <Button
            title="Save Changes"
            onPress={updateService}
            loading={saving || uploadingImages}
            style={styles.submitButton}
          />
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                "Delete Service",
                "Are you sure you want to delete this service? This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                      try {
                        setSaving(true);
                        const { error } = await supabase
                          .from('services')
                          .delete()
                          .eq('id', serviceId);
                        
                        if (error) throw error;
                        
                        navigation.navigate('ManageListings');
                        Alert.alert('Success', 'Service deleted successfully');
                      } catch (error) {
                        // [LOG] (Removed error logs except for Alert/critical errors)'Error deleting service:', error);
                        Alert.alert('Error', 'Failed to delete service');
                      } finally {
                        setSaving(false);
                      }
                    } 
                  }
                ]
              );
            }}
          >
            <Text style={styles.deleteButtonText}>Delete Service</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
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
    backgroundColor: '#F8F8F8',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    padding: 16,
    marginBottom: 20,
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
    marginBottom: 8,
    marginTop: 4,
    color: COLORS.gray,
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
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  addressContainer: {
    marginTop: 8,
    marginBottom: 8,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageCount: {
    fontSize: 14,
    color: COLORS.gray,
    fontFamily: FONTS.regular,
  },
  imagesScrollView: {
    marginVertical: 10,
  },
  imagesScrollContent: {
    paddingRight: 16,
  },
  imageCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  addImageCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  addImageText: {
    marginTop: 8,
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  newImageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  newImageText: {
    color: 'white',
    fontSize: 10,
    fontFamily: FONTS.bold,
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
});

export default EditServiceListingScreen;
