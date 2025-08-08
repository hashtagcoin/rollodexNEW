import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Alert } from '../../utils/alert';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabaseClient'; // Ensure this path is correct

const SubmitClaimScreen = ({ navigation }) => {
  const [claimTitle, setClaimTitle] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [ndisCategory, setNdisCategory] = useState('');
  const [document, setDocument] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Placeholder - ideally fetch from DB or config
  const ndisCategories = ['Core Supports', 'Capacity Building', 'Capital Supports', 'Other'];

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'], // Allow PDFs and images
        copyToCacheDirectory: true,
      });

      console.log('DocumentPicker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setDocument(asset);
        console.log('Document picked:', asset.uri, asset.name, asset.size, asset.mimeType);
      } else if (result.canceled) {
        console.log('Document picking was canceled');
      } else {
        console.log('No document picked or assets array is empty/undefined.');
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleSubmitClaim = async () => {
    if (!claimTitle || !amount || !serviceDate || !ndisCategory) {
      Alert.alert('Validation Error', 'Please fill in all required fields: Title, Amount, Service Date, and NDIS Category.');
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid positive amount.');
        return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Authentication Error', 'You must be logged in to submit a claim.');
        setIsSubmitting(false);
        // Potentially navigate to login: navigation.navigate('LoginScreen');
        return;
      }

      let documentUrl = null;
      let documentName = null;

      if (document && document.uri) {
        let fileUri = document.uri;
        const fileName = document.name || fileUri.split('/').pop();
        const fileExt = fileName.split('.').pop();
        const documentStoragePath = `${user.id}/${Date.now()}.${fileExt}`;
        documentName = fileName;

        // Log picked document details
        console.log('Picked document:', document);
        if (!fileUri.startsWith('file://')) {
          if (fileUri.startsWith('content://')) {
            const destPath = FileSystem.cacheDirectory + fileName;
            await FileSystem.copyAsync({ from: fileUri, to: destPath });
            fileUri = destPath;
            console.log('Copied content:// to cache, new URI:', fileUri);
          } else {
            Alert.alert('File Error', 'Unsupported file URI scheme.');
            setIsSubmitting(false);
            return;
          }
        }

        // Log file info
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log('File info:', fileInfo);
        if (!fileInfo.exists || fileInfo.size === 0) {
          Alert.alert('File Error', 'The selected file is empty or cannot be accessed.');
          setIsSubmitting(false);
          return;
        }

        // Read file as base64
        let base64;
        try {
          base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        } catch (err) {
          console.error('Failed to read file as base64:', err);
          Alert.alert('File Error', 'Failed to read file as base64.');
          setIsSubmitting(false);
          return;
        }

        // Convert base64 to ArrayBuffer
        let arrayBuffer;
        try {
          arrayBuffer = decode(base64);
        } catch (err) {
          console.error('Failed to decode base64 to ArrayBuffer:', err);
          Alert.alert('File Error', 'Failed to decode file for upload.');
          setIsSubmitting(false);
          return;
        }
        console.log('ArrayBuffer byteLength:', arrayBuffer.byteLength);

        // Upload to Supabase
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('claims-documents')
          .upload(documentStoragePath, arrayBuffer, {
            contentType: document.mimeType || (fileExt === 'pdf' ? 'application/pdf' : 'image/*'),
            upsert: true,
          });
        if (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Error', uploadError.message);
          setIsSubmitting(false);
          return;
        }

        // Get public URL
        const { data: urlData, error: urlError } = supabase.storage
          .from('claims-documents')
          .getPublicUrl(documentStoragePath);
          
        if (urlError) {
          console.warn('Error getting public URL, but upload might have succeeded. Storing path instead.', urlError.message);
          documentUrl = documentStoragePath;
        } else {
          documentUrl = urlData?.publicUrl;
          console.log('File uploaded! Public URL:', documentUrl);
        }
      }
        console.log('Document uploaded:', documentUrl);
      // End of document upload block

      const claimToInsert = {
        user_id: user.id,
        claim_title: claimTitle,
        claim_description: claimDescription,
        service_date: serviceDate.toISOString().split('T')[0], 
        amount: parseFloat(amount),
        ndis_category: ndisCategory,
        document_url: documentUrl,
      };

      console.log('Inserting claim:', claimToInsert);

      const { data, error } = await supabase.from('claims').insert([claimToInsert]).select();

      if (error) throw error;
      
      Alert.alert('Success', 'Claim submitted successfully!');
      console.log('Claim submitted:', data);
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting claim:', error, error?.stack);
      Alert.alert('Submission Error', 'Failed to submit claim: ' + (error.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Submit New Claim</Text>

      <Text style={styles.label}>Claim Title*</Text>
      <TextInput
        style={styles.input}
        value={claimTitle}
        onChangeText={setClaimTitle}
        placeholder="e.g., Physiotherapy Session"
      />

      <Text style={styles.label}>Description (Optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={claimDescription}
        onChangeText={setClaimDescription}
        placeholder="Details about the service or expense"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Service Date*</Text>
      <TextInput
        style={styles.input}
        value={serviceDate.toISOString().split('T')[0]}
        onChangeText={(text) => setServiceDate(new Date(text))} 
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>Amount ($)*</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="e.g., 150.00"
        keyboardType="numeric"
      />

      <Text style={styles.label}>NDIS Category*</Text>
      <TextInput
        style={styles.input}
        value={ndisCategory}
        onChangeText={setNdisCategory}
        placeholder={`e.g., ${ndisCategories[0]}`}
      />

      <Text style={styles.label}>Upload Document (PDF/Image)</Text>
      <TouchableOpacity style={styles.documentButton} onPress={handlePickDocument}>
        <Text style={styles.documentButtonText}>{document ? (document.name || 'File Selected') : 'Select Document'}</Text>
      </TouchableOpacity>
      {document && <Text style={styles.fileNameText}>Selected: {document.name}</Text>}

      <Button
        title={isSubmitting ? 'Submitting...' : 'Submit Claim'}
        onPress={handleSubmitClaim}
        disabled={isSubmitting}
        color="#007bff"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
    marginTop: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  documentButton: {
    backgroundColor: '#e9ecef',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  documentButtonText: {
    fontSize: 16,
    color: '#495057',
  },
  fileNameText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default SubmitClaimScreen;
