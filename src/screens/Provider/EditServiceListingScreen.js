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
  Platform, // Platform is imported but not used
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import ModernImagePicker from '../../components/ModernImagePicker';
import { Feather } from '@expo/vector-icons'; // MaterialIcons was imported but not used
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from 'expo-image-picker'; // ImagePicker is used in the (now removed) pickImage function, ModernImagePicker likely uses it internally
import { v4 as uuidv4 } from 'uuid'; // Note: uuidv4 is imported but not used
import { supabase } from '../../lib/supabaseClient';

// Function to generate a random string for filenames (currently not used in this file)
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
  const [images, setImages] = useState([]); // New images selected by user
  const [existingImageUrls, setExistingImageUrls] = useState([]); // URLs from DB
  const [removedImageUrls, setRemovedImageUrls] = useState([]); // Existing URLs marked for removal
  const [uploadingImages, setUploadingImages] = useState(false); // For ModernImagePicker loading state

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
    // Profile is available via useUser() context
  }, []); // serviceId is not needed here as it's constant for the screen's lifetime once loaded

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (serviceId) {
        setImages([]); // Clear any unsaved new images
        // setRemovedImageUrls([]); // Optionally clear this too, or let user confirm removals on save
        fetchServiceDetails(); // Re-fetch to ensure data is fresh
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
        const processedUrls = data.media_urls.filter(url => url && typeof url === 'string').map(url => {
          if (url.startsWith('http')) {
            // [LOG] URL displayed on screen when rendering (already a full URL)
            // console.log('[EditServiceListingScreen] Displaying existing image (full URL):', url);
            return url;
          }
          const profileId = profile?.id;
          // Handle potential legacy paths or construct full URL if relative
          const fileName = url.split('/').pop();
          let fullUrl = `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/service-images/${profileId}/${fileName}`;

          if (profileId && !url.includes(`service-images/${profileId}/`)) {
            // Assuming it's a legacy path that should now be in the user's folder
             // fullUrl is already constructed for this case
          } else if (!url.includes(`service-images/`)) {
            // If it's an even older path, relative to providerimages bucket root
             fullUrl = `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/${url}`;
          }
          // [LOG] URL displayed on screen when rendering (constructed URL)
          // console.log('[EditServiceListingScreen] Displaying existing image (constructed URL):', fullUrl);
          return fullUrl;
        });
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
    if (formData.format === 'In-Person' &&
        (!formData.addressStreet.trim() ||
         !formData.addressSuburb.trim() ||
         !formData.addressState.trim() ||
         !formData.addressPostcode.trim())) {
      Alert.alert('Validation Error', 'A complete address is required for in-person services.');
      return false;
    }
    return true;
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    const urlToRemove = existingImageUrls[indexToRemove];
    setRemovedImageUrls(prev => [...prev, urlToRemove]);
    setExistingImageUrls(prevUrls => prevUrls.filter((_, i) => i !== indexToRemove));
    // Alert.alert('Image Marked for Removal', 'The image will be deleted from storage when you save changes.');
  };

  const removeNewImage = (indexToRemove) => { // Renamed from removeImage for clarity
    setImages(prevImages => prevImages.filter((_, i) => i !== indexToRemove));
    // ModernImagePicker should handle its own visual removal, this syncs state
  };

  const uploadImages = async () => {
    if (!profile?.id) {
      Alert.alert('Upload Error', 'User session error. Cannot upload images.');
      return [];
    }
    setUploadingImages(true);
    const profileId = profile.id;
    const uploadedUrls = [];

    // Ensure base folder exists (optional, Supabase creates paths on upload)
    // but can be good for explicit creation if needed for specific policies
    try {
      await supabase.storage
        .from('providerimages')
        .upload(`service-images/${profileId}/.placeholder`, new ArrayBuffer(0), { // empty file
          contentType: 'application/octet-stream',
          upsert: true, // don't error if it exists
        });
    } catch (folderError) {
        // Non-critical, upload will likely create path anyway
    }

    for (const image of images) { // `images` are new images from ModernImagePicker
      try {
        const timestamp = new Date().getTime();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileExt = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const contentType = image.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
        
        let baseFileName = `${timestamp}_${randomStr}`;
        let fileName = `service-images/${profileId}/${baseFileName}.${fileExt}`;
        
        let fileData;
        if (image.base64) {
          fileData = decode(image.base64);
        } else if (image.uri) {
          const base64 = await FileSystem.readAsStringAsync(image.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileData = decode(base64);
        } else {
          continue; // Skip if no image data
        }

        let attempts = 0;
        const maxAttempts = 3;
        let uploadSuccessful = false;

        while(attempts < maxAttempts && !uploadSuccessful) {
          attempts++;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('providerimages')
            .upload(fileName, fileData, {
              contentType,
              cacheControl: '3600',
              upsert: false, // Important: set to false to detect name collisions
            });

          if (uploadError) {
            if (uploadError.message && (uploadError.message.includes('Duplicate') || uploadError.message.includes('already exists'))) {
              // console.warn(`Filename collision for ${fileName}, retrying with new name... Attempt: ${attempts}`);
              const newRandomStr = Math.random().toString(36).substring(2, 10);
              fileName = `service-images/${profileId}/${timestamp}_${newRandomStr}.${fileExt}`; // Regenerate filename
              if (attempts >= maxAttempts) {
                 // console.error(`Failed to upload ${image.uri} after ${maxAttempts} collision retries.`);
              }
              continue; // Retry with the new filename
            }
            throw uploadError; // Non-collision error
          }
          
          // Successful upload
          const { data: publicUrlData } = supabase.storage.from('providerimages').getPublicUrl(fileName);
          if (publicUrlData && publicUrlData.publicUrl) {
            // [LOG] URL saved to Supabase on upload
            console.log('[EditServiceListingScreen] Image uploaded to Supabase:', publicUrlData.publicUrl);
            uploadedUrls.push(publicUrlData.publicUrl);
            uploadSuccessful = true;
          } else {
            // This case should ideally not happen if upload was successful and no error
            // console.error('Uploaded successfully but failed to get public URL for:', fileName);
            if (attempts >= maxAttempts) {
                // console.error(`Failed to get public URL for ${fileName} after ${maxAttempts} attempts.`);
            }
          }
        } // end while attempts
        if (!uploadSuccessful) {
            // console.warn(`Failed to upload image ${image.uri} after all attempts.`);
        }
      } catch (error) {
        // console.error('Error processing or uploading an image:', error.message, image.uri);
        // Optionally, inform user about specific image failure
      }
    }
    setUploadingImages(false);
    return uploadedUrls;
  };

  const deleteStoredImages = async (urlsToDelete) => {
    if (!urlsToDelete || urlsToDelete.length === 0) return;

    const filesToRemove = urlsToDelete.map(fullUrl => {
        // Extract path from full public URL: https://<project_ref>.supabase.co/storage/v1/object/public/<bucket_name>/<path_to_file>
        try {
            const url = new URL(fullUrl);
            // Pathname will be /storage/v1/object/public/providerimages/service-images/userid/filename.jpg
            // We need to remove the prefix up to the bucket name
            const bucketName = 'providerimages';
            const pathPrefix = `/storage/v1/object/public/${bucketName}/`;
            if (url.pathname.startsWith(pathPrefix)) {
                return url.pathname.substring(pathPrefix.length);
            }
        } catch (e) {
            // console.error("Invalid URL for deletion:", fullUrl, e);
        }
        return null;
    }).filter(path => path !== null);

    if (filesToRemove.length > 0) {
        // console.log("Attempting to delete files from Supabase storage:", filesToRemove);
        const { data, error } = await supabase.storage
            .from('providerimages')
            .remove(filesToRemove);

        if (error) {
            // console.error('Error deleting images from Supabase storage:', error);
            // Alert.alert("Deletion Error", "Some images scheduled for removal could not be deleted from storage. Please check manually or try again.");
        } else {
            // console.log('Images successfully deleted from Supabase storage:', data);
        }
    }
  };


  const updateService = async () => {
    if (!validateForm()) {
      return;
    }
    setSaving(true);

    try {
      let newUploadedMediaUrls = [];
      if (images.length > 0) {
        newUploadedMediaUrls = await uploadImages();
      }

      // Delete images marked for removal from Supabase Storage
      if (removedImageUrls.length > 0) {
        await deleteStoredImages(removedImageUrls);
      }
      
      // Current existing URLs are already filtered by `handleRemoveExistingImage`
      // So `existingImageUrls` state already reflects URLs that should be kept
      const finalMediaUrls = Array.from(new Set([...existingImageUrls, ...newUploadedMediaUrls]));

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

      // Reset states post-successful update
      setImages([]);
      setRemovedImageUrls([]);
      if (updatedService && updatedService.media_urls) {
         // Update existingImageUrls to reflect the true state from DB
         // This ensures any URLs that failed to upload or were malformed aren't shown
        setExistingImageUrls(updatedService.media_urls.filter(url => url && typeof url === 'string').map(url => {
            if (url.startsWith('http')) return url;
            // Basic reconstruction if not full URL, assuming it's from providerimages root for safety
            // Ideally, storage should always return full URLs or consistent relative paths.
            return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/${url}`;
        }));

      }

    } catch (error) {
      Alert.alert('Update Error', error.message || 'Failed to update service listing.');
    } finally {
      setSaving(false);
      setUploadingImages(false); // Ensure this is reset
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
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }}/>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Edit Service Listing"
        navigation={navigation} // Pass navigation for back button functionality
        showBackButton={true} // Assuming AppHeader uses this prop
        // onBack={() => navigation.goBack()} // Or provide onBack directly if AppHeader supports it
      />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Service Images</Text>
          <ModernImagePicker
            images={images} // Pass the local state for new images
            setImages={setImages} // Pass the setter for ModernImagePicker to update
            existingImages={existingImageUrls} // Pass existing images for display
            onRemoveExisting={handleRemoveExistingImage} // Pass handler for removing existing images
            onRemoveNew={removeNewImage} // Pass handler for removing new images (if ModernImagePicker allows/needs it)
            maxImages={10}
            loading={uploadingImages}
            containerStyle={{ marginBottom: 12 }}
          />
          {/* Displaying existing images might be handled by ModernImagePicker itself if it supports `existingImages` prop
              If not, the original mapping for existingImageUrls can be used here, but ensure ModernImagePicker accounts for them in maxImages.
              For simplicity, assuming ModernImagePicker can show existing images and provide removal for them.
              If ModernImagePicker only handles *new* images, then the explicit rendering of existingImageUrls is needed:
          */}
          {existingImageUrls.length > 0 && !ModernImagePicker.showsExisting && ( // Conditional render if ModernImagePicker doesn't show them
            <View style={styles.existingImagesContainer}>
              <Text style={styles.subLabel}>Current Images:</Text>
              {existingImageUrls.map((url, idx) => {
                // [LOG] URL displayed on screen when rendering
                // console.log(`[EditServiceListingScreen] Rendering existing image ${idx}: ${url}`);
                return (
                  <View key={`${url}-${idx}`} style={styles.existingImageWrapper}>
                    <Image source={{ uri: url }} style={styles.existingImage} onError={(e) => console.warn("Failed to load image:", url, e.nativeEvent.error)} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveExistingImage(idx)}
                    >
                      <Feather name="x-circle" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
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
                style={[styles.pickerContainerStyle, { minHeight: 48 }]} // Renamed from pickerContainer to avoid conflict if used elsewhere
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
                style={[styles.pickerContainerStyle, { minHeight: 48 }]}
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
                    <TextInput // Consider a Picker/Dropdown for states for consistency
                    style={styles.input}
                    placeholder="e.g., NSW"
                    value={formData.addressState}
                    onChangeText={(text) => handleChange('addressState', text)}
                    maxLength={3} // Or more if needed
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
                </View> {/* Corrected closing tag for formRow */}
            </View>
            )}

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
                        setSaving(true); // Use saving state to disable buttons
                        // First, delete associated images from storage if any
                        if (existingImageUrls.length > 0) {
                            await deleteStoredImages(existingImageUrls);
                        }

                        const { error } = await supabase
                            .from('services')
                            .delete()
                            .eq('id', serviceId);
                        
                        if (error) throw error;
                        
                        Alert.alert('Success', 'Service deleted successfully.');
                        navigation.navigate('ManageListings'); // Or appropriate screen
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
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Use theme color
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
    backgroundColor: COLORS.cardBackground, // Use theme color
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
    marginBottom: 18, // Added margin to formRow as well
  },
  label: {
    fontSize: 16,
    fontFamily: FONTS.medium, // Use theme font
    marginBottom: 8,
    color: COLORS.text,
  },
  subLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginBottom: 8,
    color: COLORS.textMuted, // Use theme color
  },
  sectionTitle: {
    fontSize: 20, // Slightly larger
    fontFamily: FONTS.bold, // Use theme font
    marginBottom: 16,
    color: COLORS.primary, // Use theme color
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder, // Use theme color
    paddingBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14, // Increased padding
    paddingVertical: 12,  // Increased padding
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
  // Styles for react-native-element-dropdown
  pickerContainerStyle: { // Renamed to avoid conflict
    height: 50, // Standard height
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: COLORS.inputBackground,
  },
  pickerPlaceholderStyle: {
    fontSize: 16,
    color: COLORS.placeholder, // Use theme color
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
    marginTop: 16, // Add some space before address section
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  // Existing Images Display (if ModernImagePicker doesn't handle them)
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
    width: 80, // Smaller previews for existing
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
  // Switch Toggle Styles
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
    color: COLORS.white, // Use theme white
  },
  submitButton: {
    marginTop: 24, // More space before button
    backgroundColor: COLORS.primary, // Ensure button uses theme
  },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 12, // Make it feel like a button
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error, // Use theme error color
  },
  deleteButtonText: {
    color: COLORS.error,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
});

export default EditServiceListingScreen;