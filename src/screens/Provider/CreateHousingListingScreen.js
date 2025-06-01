import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
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

const CreateHousingListingScreen = ({ navigation }) => {
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
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

  const createHousingListing = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Get the service provider ID for the current user
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      
      if (providerError) {
        throw new Error('Unable to find your service provider account. Please ensure you are registered as a service provider.');
      }
      
      const providerId = providerData.id;
      
      // Upload images if any
      let mediaUrls = [];
      if (images.length > 0) {
        mediaUrls = await uploadImages();
      }
      
      // Create the housing listing
      const { error } = await supabase
        .from('housing_listings')
        .insert({
          provider_id: providerId,
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
          media_urls: mediaUrls,
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
    <View style={styles.container}>
      <AppHeader
        title="Create Housing Listing"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollContainer}>
        <Card style={styles.formCard}>
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
            <Text style={styles.helperText}>Add up to 10 images to showcase the property</Text>

            <View style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
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
            title="Create Housing Listing"
            onPress={createHousingListing}
            loading={loading || uploadingImages}
            style={styles.submitButton}
          />
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
  },
});

export default CreateHousingListingScreen;
