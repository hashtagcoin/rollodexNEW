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
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { COLORS, FONTS } from '../../constants/theme';

const HOUSING_TYPES = [
  'Apartment',
  'House',
  'Unit',
  'Townhouse',
  'Villa',
  'Shared Accommodation',
  'Supported Living',
  'SDA',
  'Other',
];

const ACCESSIBILITY_FEATURES = [
  'Wheelchair Accessible',
  'Step-free Access',
  'Accessible Bathroom',
  'Accessible Kitchen',
  'Hoists Available',
  'Visual Aids',
  'Auditory Aids',
  'Sensory Room',
  'Quiet Space',
];

const PROPERTY_FEATURES = [
  'Furnished',
  'Air Conditioning',
  'Heating',
  'Parking',
  'Laundry',
  'Internet',
  'Pets Allowed',
  'Outdoor Area',
  'Public Transport',
];

const EditHousingListingScreen = ({ route, navigation }) => {
  const { housingId } = route.params;
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]);
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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
    addressNumber: '',
    addressStreet: '',
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
      
      // Check if the current user is the provider of this housing listing
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
      
      // Set the form data from the retrieved housing listing
      setFormData({
        title: data.title || '',
        description: data.description || '',
        housingType: data.housing_type || HOUSING_TYPES[0],
        bedrooms: data.bedrooms ? data.bedrooms.toString() : '',
        bathrooms: data.bathrooms ? data.bathrooms.toString() : '',
        price: data.price ? data.price.toString() : '',
        bondAmount: data.bond_amount ? data.bond_amount.toString() : '',
        ndisEligible: data.ndis_eligible || false,
        sdaApproved: data.sda_approved || false,
        sdaCategory: data.sda_category || '',
        ndisCommission: data.ndis_commission ? data.ndis_commission.toString() : '',
        addressNumber: data.address_number || '',
        addressStreet: data.address_street || '',
        addressSuburb: data.address_suburb || '',
        addressState: data.address_state || '',
        addressPostcode: data.address_postcode || '',
        available: data.available !== undefined ? data.available : true,
        availableFrom: data.available_from ? new Date(data.available_from).toISOString().split('T')[0] : '',
        accessibilityFeatures: data.accessibility_features || [],
        propertyFeatures: data.property_features || [],
      });
      
      // Set existing image URLs
      if (data.media_urls && Array.isArray(data.media_urls)) {
        setExistingImageUrls(data.media_urls);
      }
    } catch (error) {
      console.error('Error fetching housing details:', error);
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
    
    if (!formData.addressStreet.trim() || 
        !formData.addressSuburb.trim() || 
        !formData.addressState.trim() || 
        !formData.addressPostcode.trim()) {
      Alert.alert('Error', 'Address is required');
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
        const filePath = `housing-images/${fileName}`;
        
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
  
  const updateHousingListing = async () => {
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
      
      // Update the housing listing
      const { error } = await supabase
        .from('housing_listings')
        .update({
          title: formData.title,
          description: formData.description,
          housing_type: formData.housingType,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          price: parseFloat(formData.price),
          bond_amount: formData.bondAmount ? parseFloat(formData.bondAmount) : null,
          ndis_eligible: formData.ndisEligible,
          sda_approved: formData.sdaApproved,
          sda_category: formData.sdaApproved ? formData.sdaCategory : null,
          ndis_commission: formData.ndisCommission ? parseFloat(formData.ndisCommission) : null,
          address_number: formData.addressNumber,
          address_street: formData.addressStreet,
          address_suburb: formData.addressSuburb,
          address_state: formData.addressState,
          address_postcode: formData.addressPostcode,
          available: formData.available,
          available_from: formData.availableFrom ? new Date(formData.availableFrom) : null,
          accessibility_features: formData.accessibilityFeatures,
          property_features: formData.propertyFeatures,
          media_urls: allMediaUrls,
          updated_at: new Date(),
        })
        .eq('id', housingId);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Housing listing updated successfully', [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('ManageListings')
        }
      ]);
    } catch (error) {
      console.error('Error updating housing listing:', error);
      Alert.alert('Error', error.message || 'Failed to update housing listing');
    } finally {
      setSaving(false);
    }
  };

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
      console.error('Error deleting housing listing:', error);
      Alert.alert('Error', 'Failed to delete housing listing');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <AppHeader
        title="Edit Housing Listing"
        showBack
        onBack={() => navigation.goBack()}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          <Card style={styles.formCard}>
            <Text style={styles.screenTitle}>Edit Housing Listing</Text>
            {/* Form content will be added in next chunks */}
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
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.housingType}
                  style={styles.picker}
                  onValueChange={(value) => handleChange('housingType', value)}
                >
                  {HOUSING_TYPES.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
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
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.availableFrom}
                onChangeText={(text) => handleChange('availableFrom', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>NDIS Information</Text>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>NDIS Eligible</Text>
                <Switch
                  value={formData.ndisEligible}
                  onValueChange={(value) => handleChange('ndisEligible', value)}
                  trackColor={{ false: '#D1D1D6', true: COLORS.primaryLight }}
                  thumbColor={formData.ndisEligible ? COLORS.primary : '#F4F3F4'}
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>SDA Approved</Text>
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
                  <TextInput
                    style={styles.input}
                    placeholder="Enter SDA category"
                    value={formData.sdaCategory}
                    onChangeText={(text) => handleChange('sdaCategory', text)}
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Property Images</Text>
              
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

              {(existingImageUrls.length + images.length) < 10 && (
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
              onPress={updateHousingListing}
              loading={saving || uploadingImages}
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
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
  imagesContainer: {
    flexDirection: 'row', // Instagram-style horizontal list
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
