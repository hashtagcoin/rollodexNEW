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
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabaseClient';
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
  }, [serviceId]);

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
        setExistingImageUrls(data.media_urls);
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
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
      // Request permissions
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
      
      if (!result.canceled) {
        // Add the new image to the list of images
        setImages([...images, result.assets[0]]);
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

  const removeExistingImage = (index) => {
    const updatedUrls = [...existingImageUrls];
    updatedUrls.splice(index, 1);
    setExistingImageUrls(updatedUrls);
  };

  const uploadImages = async () => {
    try {
      setUploadingImages(true);
      const uploadedUrls = [];
      
      for (const image of images) {
        // Create a file name with uuid to avoid conflicts
        const fileExt = image.uri.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `service-images/${fileName}`;
        
        // Convert the image to blob
        const response = await fetch(image.uri);
        const blob = await response.blob();
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('media')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            cacheControl: '3600',
          });
        
        if (error) {
          throw error;
        }
        
        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media')
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

  const updateService = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Upload new images if any
      let newMediaUrls = [];
      if (images.length > 0) {
        newMediaUrls = await uploadImages();
      }
      
      // Combine existing and new media URLs
      const allMediaUrls = [...existingImageUrls, ...newMediaUrls];
      
      // Update the service
      const { error } = await supabase
        .from('services')
        .update({
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
        })
        .eq('id', serviceId);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Service listing updated successfully', [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('ManageListings')
        }
      ]);
    } catch (error) {
      console.error('Error updating service listing:', error);
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
        showBack
        onBack={() => navigation.goBack()}
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
            <Text style={styles.label}>Service Images</Text>
            
            {existingImageUrls.length > 0 && (
              <View>
                <Text style={styles.subLabel}>Current Images</Text>
                <View style={styles.imagesContainer}>
                  {existingImageUrls.map((url, index) => (
                    <View key={`existing-${index}`} style={styles.imageWrapper}>
                      <Image source={{ uri: url }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeExistingImage(index)}
                      >
                        <Feather name="x" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {images.length > 0 && (
              <View>
                <Text style={styles.subLabel}>New Images</Text>
                <View style={styles.imagesContainer}>
                  {images.map((image, index) => (
                    <View key={`new-${index}`} style={styles.imageWrapper}>
                      <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeImage(index)}
                      >
                        <Feather name="x" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(existingImageUrls.length + images.length) < 5 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Feather name="plus" size={24} color={COLORS.primary} />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
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
                        console.error('Error deleting service:', error);
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
