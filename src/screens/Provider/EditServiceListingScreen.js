import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import { standardizeServiceImageUrls } from '../../utils/imageHelper';
import ModernImagePicker from '../../components/ModernImagePicker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
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

const SERVICE_FORMATS = ['In-Person', 'Remote', 'Group', 'Hybrid'];

console.log('[DEBUG] EditServiceListingScreen - React hooks imported');

const EditServiceListingScreen = ({ route, navigation }) => {
  console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - Component function executing`);

  // Test useRef availability immediately
  try {
    console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - Testing useRef`);
    const testRef = useRef(null);
    console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - useRef is available`);
  } catch (error) {
    console.error(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - useRef ERROR:`, error);
  }

  const { serviceId } = route.params;
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]); // New images selected by user
  const [existingImageUrls, setExistingImageUrls] = useState([]); // URLs from DB
  const [removedImageUrls, setRemovedImageUrls] = useState([]); // Existing URLs marked for removal
  const [uploadingImages, setUploadingImages] = useState(false); // For ModernImagePicker loading state

  // Handle image loading errors to prevent TurboModule crashes
  const handleImageError = (error, uri, imageType) => {
    if (__DEV__) {
      console.warn('EditServiceListingScreen: Image failed to load', {
        imageType,
        uri: uri?.substring(0, 50) + '...',
        error: error?.nativeEvent || error,
        platform: Platform.OS
      });
    }
  };

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
    console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - Initial useEffect executing`);
    console.log('[AUTH_DEBUG] User Profile ID:', profile?.id);
    console.log('[AUTH_DEBUG] User Properties:', JSON.stringify(profile, null, 2));
    
    // Debug Supabase session to verify auth
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log('[AUTH_DEBUG] Error getting auth session:', error.message);
      } else {
        console.log('[AUTH_DEBUG] Session user ID:', data?.session?.user?.id);
        console.log('[AUTH_DEBUG] Session expires at:', data?.session?.expires_at);
      }
    };
    checkAuth();
    
    fetchServiceDetails();
    // Profile is available via useUser() context

    return () => {
      console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - Initial useEffect cleanup`);
    };
  }, []); // serviceId is not needed here as it's constant for the screen's lifetime once loaded

  useEffect(() => {
    console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - Navigation focus useEffect executing`);
    const unsubscribe = navigation.addListener('focus', () => {
      console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - Navigation FOCUS event fired`);
      if (serviceId) {
        setImages([]); // Clear any unsaved new images
        fetchServiceDetails(); // Re-fetch to ensure data is fresh
      }
    });

    const blurSubscription = navigation.addListener('blur', () => {
      console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - Navigation BLUR event fired`);
    });

    return () => {
      console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - Navigation useEffect cleanup`);
      unsubscribe();
      blurSubscription();
    };
  }, [navigation, serviceId]);

  const fetchServiceDetails = async () => {
    console.log(`[DEBUG][${new Date().toISOString()}] EditServiceListingScreen - fetchServiceDetails starting`);
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) throw error;
      if (!data) {
        Alert.alert('Error', 'Service not found.');
        navigation.goBack();
        return;
      }

      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (providerError || !providerData || data.provider_id !== providerData.id) {
        Alert.alert('Permission Denied', 'You do not have permission to edit this service.');
        navigation.goBack();
        return;
      }

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

      if (data.media_urls && Array.isArray(data.media_urls)) {
        const processedUrls = standardizeServiceImageUrls(data.media_urls, profile?.id, 'EditServiceListingScreen-Fetch');
        setExistingImageUrls(processedUrls);
      } else {
        setExistingImageUrls([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load service details: ' + error.message);
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
      Alert.alert('Validation Error', 'Title is required.');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Description is required.');
      return false;
    }
    if (!formData.price.trim() || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      Alert.alert('Validation Error', 'A valid, non-negative price is required.');
      return false;
    }
    if (formData.format === 'In-Person' && (!formData.addressStreet.trim() || !formData.addressSuburb.trim() || !formData.addressState.trim() || !formData.addressPostcode.trim())) {
      Alert.alert('Validation Error', 'A complete address is required for in-person services.');
      return false;
    }
    return true;
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    const urlToRemove = existingImageUrls[indexToRemove];
    setRemovedImageUrls(prev => [...prev, urlToRemove]);
    setExistingImageUrls(prevUrls => prevUrls.filter((_, i) => i !== indexToRemove));
  };

  const removeNewImage = (indexToRemove) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== indexToRemove));
  };

  const uploadImages = async () => {
    setUploadingImages(true);
    const newImages = images; // These are from ModernImagePicker state
    const profileId = profile?.id; // Ensure profile is loaded and has id
    const uploadedUrls = [];

    console.log('[AUTH_DEBUG] Starting uploadImages with profileId:', profileId);
    
    // Double-check auth session before upload
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('[AUTH_DEBUG] Current auth session userId:', sessionData?.session?.user?.id);
    console.log('[AUTH_DEBUG] Session matches profile?', sessionData?.session?.user?.id === profileId);

    if (!profileId) {
      Alert.alert('Upload Error', 'User profile not available. Cannot upload images.');
      setUploadingImages(false);
      return [];
    }

    for (const imageAsset of newImages) { // Renamed 'image' to 'imageAsset' for clarity
      try {
        console.log(`[IMAGE_DEBUG] Processing image for upload: ${imageAsset.uri}`);
        const timestamp = new Date().getTime();
        const randomStr = Math.random().toString(36).substring(2, 8);
        
        let fileExt;
        if (imageAsset.uri) {
            const uriParts = imageAsset.uri.split('.');
            fileExt = uriParts[uriParts.length - 1].toLowerCase();
        }
        if (!fileExt && imageAsset.mimeType) { 
            fileExt = imageAsset.mimeType.split('/')[1];
        }
        fileExt = fileExt || 'jpg';

        const fileName = `service-images/${profileId}/${timestamp}_${randomStr}.${fileExt}`;
        console.log('[PATH_DEBUG] Constructed fileName path:', fileName);
        
        const contentType = imageAsset.mimeType || 
                            (fileExt === 'png' ? 'image/png' : 
                             fileExt === 'gif' ? 'image/gif' : 'image/jpeg');
        
        let base64Data;
        if (imageAsset.base64) {
          console.log(`[IMAGE_DEBUG] Using provided base64 data for ${imageAsset.uri}, length: ${imageAsset.base64.length}`);
          base64Data = imageAsset.base64;
        } else if (imageAsset.uri) {
          console.log(`[IMAGE_DEBUG] Reading file as base64 from URI: ${imageAsset.uri}`);
          try {
            base64Data = await FileSystem.readAsStringAsync(imageAsset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            console.log(`[IMAGE_DEBUG] Successfully read file as base64, length: ${base64Data.length}`);
          } catch (fsError) {
            console.error(`[IMAGE_DEBUG] Error reading file system for ${imageAsset.uri}:`, fsError);
            Alert.alert('Upload Issue', `Could not read image file: ${imageAsset.uri}. Please try a different image.`);
            continue; 
          }
        } else {
          console.warn(`[IMAGE_DEBUG] No valid image data (base64 or URI) found for an image asset.`);
          Alert.alert('Upload Warning', 'An image asset was missing data and could not be uploaded.');
          continue; 
        }

        if (!base64Data || base64Data.length === 0) {
            console.warn(`[IMAGE_DEBUG] Base64 data is empty for ${imageAsset.uri}. Skipping upload.`);
            Alert.alert('Upload Warning', `Image data for ${imageAsset.uri} appears to be empty and was not uploaded.`);
            continue;
        }

        const arrayBuffer = decode(base64Data);
        console.log(`[IMAGE_DEBUG] Converted base64 to arrayBuffer for ${fileName}, size: ${arrayBuffer.byteLength}`);

        if (arrayBuffer.byteLength === 0) {
            console.warn(`[IMAGE_DEBUG] ArrayBuffer is 0 bytes for ${fileName}. Skipping upload.`);
            Alert.alert('Upload Warning', `Processed image data for ${fileName} is empty. The image was not uploaded.`);
            continue;
        }

        // Get storage bucket policies before upload for debugging
        console.log('[RLS_DEBUG] Attempting to upload to path:', fileName);
        console.log('[RLS_DEBUG] Content type:', contentType);
        console.log('[RLS_DEBUG] ArrayBuffer size:', arrayBuffer.byteLength);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('providerimages') 
          .upload(fileName, arrayBuffer, {
            contentType,
            cacheControl: '3600',
            upsert: true, 
          });

        if (uploadError) {
          console.error(`[IMAGE_DEBUG] Supabase storage upload error for ${fileName}:`, uploadError);
          console.log('[RLS_DEBUG] Upload error details:', JSON.stringify(uploadError, null, 2));
          
          // Check if this is the RLS policy error
          if (uploadError.message?.includes('row-level security policy')) {
            console.log('[RLS_DEBUG] RLS policy violation detected');
            console.log('[RLS_DEBUG] Path components:', {
              bucket: 'providerimages',
              folder1: 'service-images',
              folder2: profileId,
              filename: `${timestamp}_${randomStr}.${fileExt}`
            });
          }
          
          Alert.alert('Upload Error', `Failed to upload ${fileName}: ${uploadError.message}`);
          continue; 
        }
        
        console.log(`[IMAGE_DEBUG] Successfully uploaded ${fileName} to Supabase.`);
        const { data: publicUrlData } = supabase.storage.from('providerimages').getPublicUrl(fileName);

        if (publicUrlData && publicUrlData.publicUrl) {
          console.log('[IMAGE_DEBUG][UPLOAD] Supabase URL:', publicUrlData.publicUrl);
          uploadedUrls.push(publicUrlData.publicUrl);
        } else {
          console.error(`[IMAGE_DEBUG] Uploaded ${fileName} but failed to get public URL.`);
          Alert.alert('Upload Issue', `Image ${fileName} uploaded but could not retrieve its URL.`);
        }
      } catch (error) {
        console.error(`[IMAGE_DEBUG] Error processing or uploading an image (${imageAsset.uri}):`, error);
        Alert.alert('Image Processing Error', `An error occurred while preparing an image for upload: ${error.message}`);
      }
    }
    setUploadingImages(false);
    return uploadedUrls;
  };

  const deleteStoredImages = async (urlsToDelete) => {
    if (!urlsToDelete || urlsToDelete.length === 0) return;

    const filesToRemove = urlsToDelete.map(fullUrl => {
        try {
            const url = new URL(fullUrl);
            const bucketName = 'providerimages';
            const pathPrefix = `/storage/v1/object/public/${bucketName}/`;
            if (url.pathname.startsWith(pathPrefix)) {
                return url.pathname.substring(pathPrefix.length);
            }
        } catch (e) {
            console.error("Invalid URL for deletion:", fullUrl, e);
        }
        return null;
    }).filter(path => path !== null);

    if (filesToRemove.length > 0) {
        console.log("Attempting to delete files from Supabase storage:", filesToRemove);
        const { data, error } = await supabase.storage
            .from('providerimages')
            .remove(filesToRemove);

        if (error) {
            console.error('Error deleting images from Supabase storage:', error);
            Alert.alert("Deletion Error", "Some images scheduled for removal could not be deleted from storage. Please check manually or try again.");
        } else {
            console.log('Images successfully deleted from Supabase storage:', data);
        }
    }
  };

  const updateService = async () => {
    if (!validateForm()) {
      return;
    }
    setSaving(true);

    try {
      const profileId = profile?.id;
      if (!profileId) {
        Alert.alert('Save Error', 'User session error. Cannot save service.');
        setSaving(false);
        return;
      }

      let newUploadedMediaUrls = [];
      if (images.length > 0) {
        newUploadedMediaUrls = await uploadImages();
      }

      if (removedImageUrls.length > 0) {
        await deleteStoredImages(removedImageUrls, profile?.id);
      }
      
      const rawMediaUrls = Array.from(new Set([...existingImageUrls, ...newUploadedMediaUrls]));
      console.log('[IMAGE_DEBUG][SAVE] Raw media URLs:', rawMediaUrls);
      
      const finalMediaUrls = standardizeServiceImageUrls(rawMediaUrls, profile?.id, 'EditServiceListingScreen-Save');
      console.log('[IMAGE_DEBUG][SAVE] Final standardized URLs:', finalMediaUrls);

      const serviceUpdateData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        format: formData.format,
        price: parseFloat(formData.price),
        address_number: formData.addressNumber,
        address_street: formData.addressStreet,
        address_suburb: formData.addressSuburb,
        address_state: formData.addressState,
        address_postcode: formData.addressPostcode,
        available: formData.available,
        media_urls: finalMediaUrls,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedService, error: updateError } = await supabase
        .from('services')
        .update(serviceUpdateData)
        .eq('id', serviceId)
        .select()
        .single();

      if (updateError) throw updateError;

      Alert.alert('Success', 'Service listing updated successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('ManageListings') },
      ]);

      setImages([]);
      setRemovedImageUrls([]);
      if (updatedService?.media_urls) {
        const updatedUrls = standardizeServiceImageUrls(updatedService.media_urls, profileId, 'EditServiceListingScreen-UpdateSuccess');
        setExistingImageUrls(updatedUrls);
      }

    } catch (error) {
      Alert.alert('Update Error', error.message || 'Failed to update service listing.');
    } finally {
      setSaving(false);
      setUploadingImages(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AppHeader
          title="Edit Service Listing"
          showBackButton={true}
          navigation={navigation}
        />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }}/>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
      <AppHeader
        title="Edit Service Listing"
        showBackButton={true}
        navigation={navigation}
        onBackPressOverride={() => navigation.navigate('ManageListings')}
      />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Service Images</Text>
          <ModernImagePicker
            images={images}
            setImages={setImages}
            existingImages={existingImageUrls}
            onRemoveExisting={handleRemoveExistingImage}
            onRemoveNew={removeNewImage}
            maxImages={10}
            loading={uploadingImages}
            containerStyle={{ marginBottom: 12 }}
          />
          {/* 
            This block is a fallback for displaying existing images if you find
            that the ModernImagePicker component doesn't handle showing them.
            It is currently disabled to avoid duplicating images.
          */}
          {false && existingImageUrls.length > 0 && (
            <View style={styles.existingImagesContainer}>
              <Text style={styles.subLabel}>Current Images:</Text>
              {existingImageUrls.map((url, idx) => (
                  <View key={`${url}-${idx}`} style={styles.existingImageWrapper}>
                    <Image 
                      source={{ uri: url }} 
                      style={styles.existingImage}
                      onError={(error) => handleImageError(error, url, 'existing_image')}
                      onLoadStart={() => {
                        if (__DEV__) {
                          console.log('EditServiceListingScreen: Existing image loading started', { imageIndex: idx });
                        }
                      }}
                      onPartialLoad={() => {
                        if (__DEV__) {
                          console.log('EditServiceListingScreen: Existing image partial load', { imageIndex: idx });
                        }
                      }}
                      defaultSource={require('../../../assets/placeholder-image.png')}
                      loadingIndicatorSource={require('../../../assets/placeholder-image.png')}
                      fadeDuration={0}
                      progressiveRenderingEnabled={true}
                    />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveExistingImage(idx)}
                    >
                      <Feather name="x-circle" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                )
              )}
            </View>
          )}
        </Card>

        <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Service Details</Text>
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
            <Dropdown
                style={styles.pickerContainerStyle}
                placeholderStyle={styles.pickerPlaceholderStyle}
                selectedTextStyle={styles.pickerSelectedTextStyle}
                inputSearchStyle={styles.pickerInputSearchStyle}
                iconStyle={styles.pickerIconStyle}
                data={SERVICE_CATEGORIES.map(cat => ({ label: cat, value: cat }))}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={!formData.category ? 'Select category' : formData.category}
                searchPlaceholder="Search..."
                value={formData.category}
                onChange={item => handleChange('category', item.value)}
            />
            </View>

            <View style={styles.formGroup}>
            <Text style={styles.label}>Format*</Text>
            <Dropdown
                style={styles.pickerContainerStyle}
                placeholderStyle={styles.pickerPlaceholderStyle}
                selectedTextStyle={styles.pickerSelectedTextStyle}
                inputSearchStyle={styles.pickerInputSearchStyle}
                iconStyle={styles.pickerIconStyle}
                data={SERVICE_FORMATS.map(fmt => ({ label: fmt, value: fmt }))}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={!formData.format ? 'Select format' : formData.format}
                searchPlaceholder="Search..."
                value={formData.format}
                onChange={item => handleChange('format', item.value)}
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
                <Text style={styles.sectionTitle}>Service Location (for In-Person)</Text>
                
                <View style={styles.formGroup}>
                <Text style={styles.label}>Street Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., 123"
                    value={formData.addressNumber}
                    onChangeText={(text) => handleChange('addressNumber', text)}
                />
                </View>
                
                <View style={styles.formGroup}>
                <Text style={styles.label}>Street Name*</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Main Street"
                    value={formData.addressStreet}
                    onChangeText={(text) => handleChange('addressStreet', text)}
                />
                </View>
                
                <View style={styles.formGroup}>
                <Text style={styles.label}>Suburb*</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Sydney"
                    value={formData.addressSuburb}
                    onChangeText={(text) => handleChange('addressSuburb', text)}
                />
                </View>
                
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.label}>State*</Text>
                      <TextInput
                      style={styles.input}
                      placeholder="e.g., NSW"
                      value={formData.addressState}
                      onChangeText={(text) => handleChange('addressState', text)}
                      maxLength={3}
                      />
                  </View>
                  
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.label}>Postcode*</Text>
                      <TextInput
                      style={styles.input}
                      placeholder="e.g., 2000"
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
            <Text style={styles.label}>Availability</Text>
            <View style={styles.switchContainer}>
                <TouchableOpacity
                style={[styles.switchOption, formData.available && styles.switchActive]}
                onPress={() => handleChange('available', true)}
                >
                <Text style={[styles.switchText, formData.available && styles.switchTextActive]}>
                    Available
                </Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={[styles.switchOption, !formData.available && styles.switchActive]}
                onPress={() => handleChange('available', false)}
                >
                <Text style={[styles.switchText, !formData.available && styles.switchTextActive]}>
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
              disabled={saving || uploadingImages}
            />
            
            <TouchableOpacity 
              style={styles.deleteButton}
              disabled={saving || uploadingImages}
              onPress={() => {
                  Alert.alert(
                  "Delete Service",
                  "Are you sure you want to delete this service listing? This action cannot be undone and will remove all associated data and images.",
                  [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Delete", 
                        style: "destructive",
                        onPress: async () => {
                            try {
                              setSaving(true);
                              if (existingImageUrls.length > 0) {
                                  await deleteStoredImages(existingImageUrls);
                              }

                              const { error } = await supabase
                                  .from('services')
                                  .delete()
                                  .eq('id', serviceId);
                              
                              if (error) throw error;
                              
                              Alert.alert('Success', 'Service deleted successfully.');
                              navigation.navigate('ManageListings');
                            } catch (error) {
                              Alert.alert('Deletion Error', `Failed to delete service: ${error.message}`);
                            } finally {
                              setSaving(false);
                            }
                        } 
                      }
                  ],
                  { cancelable: true }
                  );
              }}
            >
              <Text style={styles.deleteButtonText}>Delete Service</Text>
            </TouchableOpacity>
        </Card>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  formCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 18,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    marginBottom: 8,
    color: COLORS.text,
  },
  subLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginBottom: 8,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    marginBottom: 16,
    color: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
    paddingBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.inputBackground,
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  pickerContainerStyle: {
    height: 50,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: COLORS.inputBackground,
  },
  pickerPlaceholderStyle: {
    fontSize: 16,
    color: COLORS.placeholder,
    fontFamily: FONTS.regular,
  },
  pickerSelectedTextStyle: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  pickerInputSearchStyle: {
    height: 40,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  pickerIconStyle: {
    width: 20,
    height: 20,
  },
  addressContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  existingImagesContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  existingImageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  existingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    padding: 2,
  },
  switchContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  switchOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  switchTextActive: {
    color: COLORS.white,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
});

export default EditServiceListingScreen;