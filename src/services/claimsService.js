import { supabase } from '../lib/supabaseClient'; // Adjust path if supabaseClient is elsewhere
import { Alert } from 'react-native';

/**
 * Submits a new claim, including uploading an optional document.
 * @param {object} claimData - The core data for the claim.
 * @param {object|null} documentAsset - The asset object from DocumentPicker (expo-document-picker).
 * @returns {Promise<object>} The newly created claim data from Supabase.
 */
export const submitClaimWithDocument = async (claimData, documentAsset) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    Alert.alert('Authentication Error', 'You must be logged in to submit a claim. ' + (authError?.message || ''));
    throw new Error('User not authenticated: ' + (authError?.message || 'No user session'));
  }

  let documentUrl = null;
  let uploadedFilePath = null;

  if (documentAsset && documentAsset.uri) {
    const fileUri = documentAsset.uri;
    const fileName = documentAsset.name || fileUri.split('/').pop();
    const fileExt = fileName.split('.').pop().toLowerCase();
    const uniqueFileName = `${user.id}/${new Date().getTime()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const documentStoragePath = uniqueFileName;

    console.log(`Attempting to upload: ${fileName} to bucket 'claims-documents' at path: ${documentStoragePath} with MIME type: ${documentAsset.mimeType}`);

    // Fetch the file as a blob
    const response = await fetch(fileUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch file for upload: ${response.statusText}`);
    }
    const blob = await response.blob();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('claims-documents') // Ensure this bucket exists and has RLS/policies set up
      .upload(documentStoragePath, blob, {
        contentType: documentAsset.mimeType || 'application/octet-stream',
        upsert: false, // Set to true if you want to overwrite, false to prevent
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw new Error(`Failed to upload document: ${uploadError.message}`);
    }

    uploadedFilePath = documentStoragePath; // Store the path for potential direct use or if public URL fails
    console.log('Document uploaded successfully to path:', documentStoragePath, uploadData);

    // Get public URL for the uploaded file
    const { data: urlData, error: urlError } = supabase.storage
      .from('claims-documents')
      .getPublicUrl(documentStoragePath);

    if (urlError) {
      console.warn('Error getting public URL for document, but upload succeeded. Storing path.', urlError.message);
      documentUrl = documentStoragePath; // Fallback: store the raw path if public URL retrieval fails
    } else {
      documentUrl = urlData?.publicUrl;
    }
    console.log('Public URL for document:', documentUrl);
  }

  // Calculate expiry_date as 14 days after service_date
  // Always set expiryDate: from service_date if present, else from today
  let expiryDate = null;
  let baseDate;
  if (claimData.service_date) {
    baseDate = new Date(claimData.service_date);
  } else {
    baseDate = new Date();
  }
  const expiryDateObj = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  expiryDate = expiryDateObj.toISOString().slice(0, 10);

  console.log('claimData:', claimData);
  console.log('service_date:', claimData.service_date, 'expiryDate:', expiryDate);

  // Emergency fallback: if expiryDate is still null, set it to 14 days from today
  if (!expiryDate) {
    const fallbackDateObj = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    expiryDate = fallbackDateObj.toISOString().slice(0, 10);
    console.error('expiryDate was null, using fallback:', expiryDate);
  }

  const claimToInsert = {
    ...claimData,
    user_id: user.id,
    document_url: documentUrl,
    expiry_date: expiryDate,
    // 'status' will default to 'pending' in the database schema
  };

  if (!claimToInsert.expiry_date) {
    throw new Error('expiry_date is missing from claimToInsert!');
  }

  // DEBUG: Show the claim object in an alert before submitting
  Alert.alert('DEBUG', JSON.stringify(claimToInsert, null, 2));

  console.log('FINAL claimToInsert:', claimToInsert);

  const { data: insertedClaim, error: insertError } = await supabase
    .from('claims')
    .insert([claimToInsert])
    .select()
    .single(); // Assuming you want the single inserted record back

  if (insertError) {
    console.error('Supabase insert claim error:', insertError);
    // If insert fails after upload, consider deleting the uploaded file
    if (uploadedFilePath) {
        console.warn('Claim insert failed after document upload. Consider manual cleanup of:', uploadedFilePath);
        // Optionally, try to delete the orphaned file:
        // await supabase.storage.from('claims-documents').remove([uploadedFilePath]);
    }
    throw new Error(`Failed to save claim details: ${insertError.message}`);
  }

  console.log('Claim successfully submitted and saved:', insertedClaim);
  return insertedClaim;
};

/**
 * Fetches all claims for the currently logged-in user.
 * @returns {Promise<Array<object>>} A list of claims.
 */
export const getUserClaims = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn('No authenticated user found when trying to fetch claims.', authError?.message);
    // Depending on desired behavior, you might want to Alert here too or let the calling screen handle it.
    return []; // Or throw new Error('User not authenticated: ' + (authError?.message || 'No user session'));
  }

  const { data, error } = await supabase
    .from('claims')
    .select('*') // Select all columns, or specify needed ones: 'id, claim_title, amount, status, service_date, ndis_category, document_url, created_at'
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user claims:', error);
    Alert.alert('Error', 'Could not fetch your claims: ' + error.message);
    return []; // Return empty array on error to prevent UI crashes
  }

  console.log('Fetched user claims:', data);
  return data || [];
};
