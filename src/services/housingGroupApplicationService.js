import { supabase } from '../lib/supabaseClient';

/**
 * Submit an application to join a housing group
 * @param {string} housingGroupId - ID of the housing group
 * @param {string} applicantId - User ID of the applicant
 * @param {string} message - Optional message from applicant
 * @returns {Object} - Application data
 */
export const applyToHousingGroup = async (housingGroupId, applicantId, message = '') => {
  try {
    // Check if user already applied
    const { data: existingApplication, error: checkError } = await supabase
      .from('housing_group_applications')
      .select('*')
      .eq('housing_group_id', housingGroupId)
      .eq('applicant_id', applicantId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw checkError;
    }
    
    // If application already exists, update it (if previously declined, set back to pending)
    if (existingApplication) {
      if (existingApplication.status === 'declined') {
        const { data, error } = await supabase
          .from('housing_group_applications')
          .update({
            status: 'pending',
            applicant_message: message,
            admin_comment: null,
            admin_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingApplication.id)
          .select();
        
        if (error) throw error;
        return { data, isUpdate: true };
      }
      
      // Return existing application if not declined
      return { data: existingApplication, isExisting: true };
    }
    
    // Create new application
    const { data, error } = await supabase
      .from('housing_group_applications')
      .insert({
        housing_group_id: housingGroupId,
        applicant_id: applicantId,
        applicant_message: message,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    return { data, isNew: true };
  } catch (error) {
    console.error('Error applying to housing group:', error);
    throw error;
  }
};

/**
 * Get all applications for a housing group
 * @param {string} housingGroupId - ID of the housing group
 * @param {string} status - Optional filter by status
 * @returns {Array} - Applications with user details
 */
export const getHousingGroupApplications = async (housingGroupId, status = null) => {
  try {
    let query = supabase
      .from('housing_group_applications_with_details')
      .select('*')
      .eq('housing_group_id', housingGroupId)
      .order('created_at', { ascending: false });
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching housing group applications:', error);
    throw error;
  }
};

/**
 * Process an application (accept or decline)
 * @param {string} applicationId - ID of the application
 * @param {string} status - New status ('accepted' or 'declined')
 * @param {string} adminId - User ID of the admin processing the application
 * @param {string} comment - Optional comment from the admin
 * @returns {Object} - Updated application
 */
export const processApplication = async (applicationId, status, adminId, comment = '') => {
  try {
    if (!['accepted', 'declined'].includes(status)) {
      throw new Error('Invalid status. Must be either "accepted" or "declined".');
    }
    
    // Start a transaction
    const { data: application, error: fetchError } = await supabase
      .from('housing_group_applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('housing_group_applications')
      .update({
        status,
        admin_comment: comment,
        admin_id: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select();
    
    if (updateError) throw updateError;
    
    // If accepted, add user to housing group members
    if (status === 'accepted') {
      const { error: memberError } = await supabase
        .from('housing_group_members')
        .insert({
          housing_group_id: application.housing_group_id,
          member_id: application.applicant_id,
          is_admin: false, // New members are not admins by default
          joined_at: new Date().toISOString()
        });
      
      if (memberError) throw memberError;
    }
    
    return updatedApplication;
  } catch (error) {
    console.error('Error processing housing group application:', error);
    throw error;
  }
};

/**
 * Get application status for a specific user
 * @param {string} housingGroupId - ID of the housing group
 * @param {string} userId - User ID to check
 * @returns {Object} - Application status data or null if not found
 */
export const getUserApplicationStatus = async (housingGroupId, userId) => {
  try {
    const { data, error } = await supabase
      .from('housing_group_applications_with_details')
      .select('*')
      .eq('housing_group_id', housingGroupId)
      .eq('applicant_id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') { // No rows returned
      return null;
    }
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting user application status:', error);
    throw error;
  }
};

/**
 * Cancel a pending application to a housing group
 * @param {string} housingGroupId - ID of the housing group
 * @param {string} applicantId - User ID of the applicant
 * @returns {boolean} - Success status
 */
export const cancelApplication = async (housingGroupId, applicantId) => {
  try {
    // Verify there is a pending application
    const { data, error: checkError } = await supabase
      .from('housing_group_applications')
      .select('id, status')
      .eq('housing_group_id', housingGroupId)
      .eq('applicant_id', applicantId)
      .eq('status', 'pending')
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') { // No rows found
        return { success: false, message: 'No pending application found' };
      }
      throw checkError;
    }
    
    // Delete the application
    const { error: deleteError } = await supabase
      .from('housing_group_applications')
      .delete()
      .eq('id', data.id);
    
    if (deleteError) throw deleteError;
    
    return { success: true };
  } catch (error) {
    console.error('Error cancelling housing group application:', error);
    throw error;
  }
};

/**
 * Record when a user leaves a housing group
 * @param {string} housingGroupId - ID of the housing group
 * @param {string} userId - User ID who is leaving
 * @returns {Object} - Updated application or new application with 'left' status
 */
export const recordUserLeftGroup = async (housingGroupId, userId) => {
  try {
    // Check if there's an existing application
    const { data: existingApplication, error: checkError } = await supabase
      .from('housing_group_applications')
      .select('*')
      .eq('housing_group_id', housingGroupId)
      .eq('applicant_id', userId)
      .single();
    
    // Update existing application
    if (existingApplication && !checkError) {
      const { data, error } = await supabase
        .from('housing_group_applications')
        .update({
          status: 'left',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingApplication.id)
        .select();
        
      if (error) throw error;
      return data;
    } 
    
    // Create new 'left' record if no existing application
    const { data: adminData, error: adminError } = await supabase
      .from('housing_group_members')
      .select('member_id')
      .eq('housing_group_id', housingGroupId)
      .eq('is_admin', true)
      .single();
    
    if (adminError && adminError.code !== 'PGRST116') throw adminError;
    
    const adminId = adminData?.member_id || null;
    
    // Create new application with 'left' status
    const { data, error } = await supabase
      .from('housing_group_applications')
      .insert({
        housing_group_id: housingGroupId,
        applicant_id: userId,
        status: 'left',
        admin_id: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording user left group:', error);
    throw error;
  }
};
