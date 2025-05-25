import { supabase } from '../lib/supabaseClient';
import { Share } from 'react-native';

/**
 * Share a post with optional caption
 * @param {string} postId - Original post ID to share
 * @param {string} userId - User ID of the sharer
 * @param {string} caption - Optional caption for the shared post
 * @returns {Object} - The created shared post data
 */
export const sharePost = async (postId, userId, caption = '') => {
  try {
    // Create shared post entry
    const { data, error } = await supabase
      .from('shared_posts')
      .insert({
        original_post_id: postId,
        user_id: userId,
        caption: caption,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // Increment share count for the original post
    await supabase.rpc('increment_post_shares', { post_id: postId });
    
    return data;
  } catch (error) {
    console.error('Error sharing post:', error);
    throw error;
  }
};

/**
 * Share a group with a message
 * @param {Object} group - Group data to share
 * @param {string} message - Optional message to include with the share
 */
export const shareGroup = async (group, message = '') => {
  try {
    const shareUrl = `https://yourapp.com/groups/${group.id}`;
    const shareMessage = `${message}\n\n${group.name}\n${shareUrl}`;
    
    const result = await Share.share({
      message: shareMessage,
      title: `Check out ${group.name} on Rollodex`,
      url: shareUrl
    });
    
    // Track successful shares in your analytics if needed
    if (result.action === Share.sharedAction) {
      // Share was successful
      if (result.activityType) {
        // Shared with activity type (e.g., Messages, Mail, etc.)
        console.log(`Shared with activity type: ${result.activityType}`);
      } else {
        // Shared
        console.log('Shared successfully');
      }
    } else if (result.action === Share.dismissedAction) {
      // Dismissed
      console.log('Share dismissed');
    }
    
    return result;
  } catch (error) {
    console.error('Error sharing group:', error);
    throw error;
  }
};

/**
 * Get users who have shared a post
 * @param {string} postId - The post ID
 * @returns {Array} - Array of users who shared the post
 */
export const getPostShares = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('shared_posts')
      .select(`
        id,
        caption,
        created_at,
        user_id,
        user_profiles:user_id (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('original_post_id', postId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting post shares:', error);
    throw error;
  }
};

/**
 * Share post to social media platforms
 * This is a mock function - in a real app, this would integrate with
 * platform-specific sharing APIs
 * @param {string} platform - Platform to share to (instagram, facebook, twitter, etc)
 * @param {Object} postData - Post data to share
 * @returns {Object} - Result of the share operation
 */
export const shareToSocialMedia = async (platform, postData) => {
  try {
    // This would be replaced with actual integration code
    console.log(`Sharing to ${platform}:`, postData);
    
    // Simulate API call
    return {
      success: true,
      platform,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error sharing to ${platform}:`, error);
    throw error;
  }
};
