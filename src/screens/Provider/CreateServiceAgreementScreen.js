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
  Platform
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { COLORS } from '../../constants/theme';

const CreateServiceAgreementScreen = ({ route, navigation }) => {
  const { clientId, serviceId } = route.params || {};
  const { profile } = useUser();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: clientId || '',
    serviceId: serviceId || '',
    title: '',
    startDate: new Date(),
    endDate: (() => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1); // Safely add 1 year
      return date;
    })(), // Default 1 year duration
    templateId: '',
    customTerms: '',
    useTemplate: true,
  });
  
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      
      // Get the service provider ID for the current user
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      
      if (providerError) {
        throw new Error('Unable to find your service provider account.');
      }
      
      const providerId = providerData.id;
      
      // Fetch agreement templates
      const { data: templateData, error: templateError } = await supabase
        .from('service_agreement_templates')
        .select('id, title')
        .eq('provider_id', providerId)
        .eq('active', true);
      
      if (templateError) throw templateError;
      setTemplates(templateData || []);
      
      // Fetch clients from bookings
      const { data: clientData, error: clientError } = await supabase
        .from('bookings_with_provider_details')
        .select('client_id, client_name')
        .eq('provider_id', providerId)
        .order('client_name');
      
      if (clientError) throw clientError;
      // Remove duplicates based on client_id
      const uniqueClients = clientData ? 
        Array.from(new Map(clientData.map(client => [client.client_id, client])).values()) : 
        [];
      setClients(uniqueClients);
      
      // Fetch services
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, title')
        .eq('provider_id', providerId);
      
      if (serviceError) throw serviceError;
      setServices(serviceData || []);
      
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', error.message || 'Failed to load necessary data');
    } finally {
      setInitialLoading(false);
    }
  };
  
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDateChange = (event, selectedDate, dateType) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    }
    
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        [dateType]: selectedDate
      }));
    }
  };
  
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        return;
      }
      
      const file = result.assets[0];
      
      if (file.size > 5000000) { // 5MB limit
        Alert.alert('File Too Large', 'Please select a file smaller than 5MB');
        return;
      }
      
      setSelectedDocument(file);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };
  
  const uploadDocument = async () => {
    if (!selectedDocument) return null;
    
    try {
      // Create a file name with uuid to avoid conflicts
      const fileName = `${uuidv4()}_${selectedDocument.name}`;
      const filePath = `service-agreements/${fileName}`;
      
      // Read the file as base64
      const fileContent = await FileSystem.readAsStringAsync(selectedDocument.uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, fileContent, {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get the public URL
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      return {
        url: data.publicUrl,
        name: selectedDocument.name
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };
  
  const fetchTemplateContent = async (templateId) => {
    try {
      const { data, error } = await supabase
        .from('service_agreement_templates')
        .select('file_url, file_name')
        .eq('id', templateId)
        .single();
      
      if (error) throw error;
      
      return {
        url: data.file_url,
        name: data.file_name
      };
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  };
  
  const validateForm = () => {
    if (!formData.clientId) {
      Alert.alert('Error', 'Please select a client');
      return false;
    }
    
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter an agreement title');
      return false;
    }
    
    if (formData.useTemplate && !formData.templateId) {
      Alert.alert('Error', 'Please select a template or use custom terms');
      return false;
    }
    
    if (!formData.useTemplate && !selectedDocument && !formData.customTerms.trim()) {
      Alert.alert('Error', 'Please either upload a document or enter custom terms');
      return false;
    }
    
    if (formData.endDate < formData.startDate) {
      Alert.alert('Error', 'End date cannot be before start date');
      return false;
    }
    
    return true;
  };
  
  const createAgreement = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Get the service provider ID for the current user
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      
      if (providerError) {
        throw new Error('Unable to find your service provider account.');
      }
      
      const providerId = providerData.id;
      
      // Generate a unique agreement number
      const agreementNumber = `SA-${Math.floor(100000 + Math.random() * 900000)}`;
      
      let fileInfo = null;
      let terms = null;
      
      if (formData.useTemplate) {
        // Use selected template
        fileInfo = await fetchTemplateContent(formData.templateId);
      } else if (selectedDocument) {
        // Upload custom document
        fileInfo = await uploadDocument();
      } else {
        // Use custom terms text
        terms = formData.customTerms;
      }
      
      // Create the service agreement
      const { data, error } = await supabase
        .from('service_agreements')
        .insert({
          provider_user_id: profile.id,
          client_user_id: formData.clientId,
          service_id: formData.serviceId || null,
          agreement_number: agreementNumber,
          status: 'pending',
          start_date: formData.startDate,
          end_date: formData.endDate,
          file_url: fileInfo?.url || null,
          terms: terms,
          provider_signed: false,
          client_signed: false
        })
        .select();
      
      if (error) throw error;
      
      Alert.alert(
        'Success', 
        'Service agreement created successfully',
        [
          { 
            text: 'OK',
            onPress: () => navigation.navigate('ServiceAgreementDetail', { agreementId: data[0].id })
          }
        ]
      );
    } catch (error) {
      console.error('Error creating agreement:', error);
      Alert.alert('Error', error.message || 'Failed to create service agreement');
    } finally {
      setLoading(false);
    }
  };
  
  if (initialLoading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Create Service Agreement"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <AppHeader
        title="Create Service Agreement"
        showBack
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollContainer}>
        <Card style={styles.card}>
          <Text style={styles.screenTitle}>New Service Agreement</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Client*</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.clientId}
                style={styles.picker}
                onValueChange={(value) => handleChange('clientId', value)}
                enabled={!clientId} // Disable if clientId was passed as a param
              >
                <Picker.Item label="Select a client" value="" />
                {clients.map((client) => (
                  <Picker.Item
                    key={client.client_id}
                    label={client.client_name}
                    value={client.client_id}
                  />
                ))}
              </Picker>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Related Service (Optional)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.serviceId}
                style={styles.picker}
                onValueChange={(value) => handleChange('serviceId', value)}
                enabled={!serviceId} // Disable if serviceId was passed as a param
              >
                <Picker.Item label="None" value="" />
                {services.map((service) => (
                  <Picker.Item
                    key={service.id}
                    label={service.title}
                    value={service.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Agreement Title*</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter agreement title"
              value={formData.title}
              onChangeText={(text) => handleChange('title', text)}
              maxLength={100}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Start Date*</Text>
            <TouchableOpacity
              style={styles.dateInputContainer}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateInputText}>
                {format(formData.startDate, 'dd/MM/yyyy')}
              </Text>
              <Feather name="calendar" size={20} color={COLORS.gray} />
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={formData.startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => handleDateChange(event, date, 'startDate')}
                minimumDate={new Date()}
              />
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>End Date*</Text>
            <TouchableOpacity
              style={styles.dateInputContainer}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateInputText}>
                {format(formData.endDate, 'dd/MM/yyyy')}
              </Text>
              <Feather name="calendar" size={20} color={COLORS.gray} />
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={formData.endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => handleDateChange(event, date, 'endDate')}
                minimumDate={formData.startDate}
              />
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Agreement Content</Text>
            
            <View style={styles.contentTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.contentTypeOption,
                  formData.useTemplate ? styles.contentTypeSelected : null
                ]}
                onPress={() => handleChange('useTemplate', true)}
              >
                <Text
                  style={[
                    styles.contentTypeText,
                    formData.useTemplate ? styles.contentTypeTextSelected : null
                  ]}
                >
                  Use Template
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.contentTypeOption,
                  !formData.useTemplate ? styles.contentTypeSelected : null
                ]}
                onPress={() => handleChange('useTemplate', false)}
              >
                <Text
                  style={[
                    styles.contentTypeText,
                    !formData.useTemplate ? styles.contentTypeTextSelected : null
                  ]}
                >
                  Custom Content
                </Text>
              </TouchableOpacity>
            </View>
            
            {formData.useTemplate ? (
              <View style={[styles.formGroup, { marginTop: 16 }]}>
                <Text style={styles.subLabel}>Select Template</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.templateId}
                    style={styles.picker}
                    onValueChange={(value) => handleChange('templateId', value)}
                  >
                    <Picker.Item label="Select a template" value="" />
                    {templates.map((template) => (
                      <Picker.Item
                        key={template.id}
                        label={template.title}
                        value={template.id}
                      />
                    ))}
                  </Picker>
                </View>
                
                {templates.length === 0 && (
                  <TouchableOpacity
                    style={styles.createTemplateButton}
                    onPress={() => navigation.navigate('ServiceAgreements')}
                  >
                    <Text style={styles.createTemplateText}>Create a template first</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.formGroup, { marginTop: 16 }]}>
                <View style={styles.uploadContainer}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickDocument}
                  >
                    <Feather name="upload" size={20} color={COLORS.primary} />
                    <Text style={styles.uploadText}>Upload PDF</Text>
                  </TouchableOpacity>
                  
                  {selectedDocument && (
                    <View style={styles.selectedFileContainer}>
                      <Feather name="file" size={16} color={COLORS.gray} style={styles.fileIcon} />
                      <Text style={styles.fileName} numberOfLines={1}>
                        {selectedDocument.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeFileButton}
                        onPress={() => setSelectedDocument(null)}
                      >
                        <Feather name="x" size={16} color={COLORS.gray} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <Text style={styles.orText}>or</Text>
                
                <Text style={styles.subLabel}>Enter Custom Terms</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter the agreement terms and conditions"
                  value={formData.customTerms}
                  onChangeText={(text) => handleChange('customTerms', text)}
                  multiline
                  numberOfLines={8}
                />
              </View>
            )}
          </View>
          
          <Button
            title="Create Agreement"
            onPress={createAgreement}
            loading={loading}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    // Airbnb-style card
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  formGroup: {
    marginBottom: 16,
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
    color: COLORS.gray,
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
    minHeight: 120,
    textAlignVertical: 'top',
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
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  dateInputText: {
    fontSize: 16,
    color: COLORS.text,
  },
  contentTypeContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    overflow: 'hidden',
  },
  contentTypeOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  contentTypeSelected: {
    backgroundColor: COLORS.primary,
  },
  contentTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  contentTypeTextSelected: {
    color: 'white',
  },
  uploadContainer: {
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  uploadText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 8,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  fileIcon: {
    marginRight: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  removeFileButton: {
    padding: 4,
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.gray,
    marginVertical: 10,
  },
  createTemplateButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  createTemplateText: {
    color: COLORS.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  submitButton: {
    marginTop: 16,
  },
});

export default CreateServiceAgreementScreen;
