import { supabase } from '../lib/supabaseClient';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

/**
 * Creates a new post with optional images
 * @param {string} userId - User ID of the post creator
 * @param {string} caption - Post caption
 * @param {Array} images - Array of image objects from the image picker
 * @returns {Object} - Created post data
 */
export const createPost = async (userId, caption, images = []) => {
  try {
    // Upload images if provided
    const mediaUrls = [];
    if (images.length > 0) {
      for (const image of images) {
        const publicUrl = await uploadPostImage(image);
        mediaUrls.push(publicUrl);
      }
    }
    
    // Create post in database
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        caption: caption,
        media_urls: mediaUrls,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

/**
 * Uploads an image to the postsimages bucket in Supabase Storage
 * @param {Object} imageData - The image object from the image picker
 * @returns {Object} - Path and public URL of the uploaded image
 */
export const uploadPostImage = async (imageData) => {
  try {
    // Check if we're authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // No longer auto-logging in with default credentials
      // User must be logged in to use this functionality
      throw new Error('Authentication required to perform this action');
    }

    // Generate a unique filename using user ID (if available) for organization
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.jpg`;
    let base64Data;
    let contentType = 'image/jpeg';
    
    // Handle images from expo-image-picker
    if (imageData.base64) {
      // Use the base64 data directly if available
      base64Data = imageData.base64;
    } else if (imageData.uri) {
      try {
        // Use expo-file-system to read the file
        const FileSystem = require('expo-file-system');
        base64Data = await FileSystem.readAsStringAsync(imageData.uri, {
          encoding: FileSystem.EncodingType.Base64
        });
      } catch (error) {
        console.error('Error reading file:', error);
        throw new Error('Failed to read image data');
      }
    } else {
      throw new Error('No valid image data found');
    }
    
    // Convert base64 to array buffer for upload
    const arrayBuffer = decode(base64Data);
    
    // Upload to Supabase storage with explicit error logging
    const { data, error } = await supabase.storage
      .from('postsimages')
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw error;
    }
    
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('postsimages')
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Fetches posts for a specific user
 * @param {string} userId - The user ID to fetch posts for
 * @returns {Promise} - Array of posts or error
 */
export const getUserPosts = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to fetch user posts:', error);
    throw error;
  }
};

/**
 * Likes or unlikes a post
 * @param {string} userId - The user ID performing the action
 * @param {string} postId - The post ID to like/unlike
 * @returns {Promise} - Success status or error
 */
export const toggleLikePost = async (userId, postId) => {
  try {
    // Check if user already liked the post
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking like status:', checkError);
      throw checkError;
    }
    
    // If like exists, remove it (unlike)
    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id);
      
      if (deleteError) {
        console.error('Error unliking post:', deleteError);
        throw deleteError;
      }
      
      return { liked: false };
    }
    
    // Otherwise, add a new like
    const { error: insertError } = await supabase
      .from('post_likes')
      .insert({
        user_id: userId,
        post_id: postId,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error liking post:', insertError);
      throw insertError;
    }
    
    return { liked: true };
  } catch (error) {
    console.error('Toggle like failed:', error);
    throw error;
  }
};

/**
 * Toggles bookmark status for a post
 * @param {string} userId - The user ID
 * @param {string} postId - The post ID
 * @returns {Promise} - Success status or error
 */
export const toggleBookmark = async (userId, postId) => {
  try {
    // Check if bookmark already exists
    const { data: existingBookmark, error: checkError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking bookmark status:', checkError);
      throw checkError;
    }
    
    // If bookmark exists, remove it
    if (existingBookmark) {
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', existingBookmark.id);
      
      if (deleteError) {
        console.error('Error removing bookmark:', deleteError);
        throw deleteError;
      }
      
      return { bookmarked: false };
    }
    
    // Otherwise, add a new bookmark
    const { error: insertError } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        post_id: postId,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error adding bookmark:', insertError);
      throw insertError;
    }
    
    return { bookmarked: true };
  } catch (error) {
    console.error('Toggle bookmark failed:', error);
    throw error;
  }
};

/**
 * Adds a reaction to a post
 * @param {string} userId - The user ID
 * @param {string} postId - The post ID
 * @param {string} reactionType - The type of reaction (e.g., 'love', 'laugh', etc.)
 * @returns {Promise} - Success status or error
 */
export const addPostReaction = async (userId, postId, reactionType) => {
  try {
    // Check if user already reacted to this post
    const { data: existingReaction, error: checkError } = await supabase
      .from('post_reactions')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking reaction status:', checkError);
      throw checkError;
    }
    
    // If reaction exists with same type, remove it
    // If reaction exists with different type, update it
    if (existingReaction) {
      if (existingReaction.reaction_type === reactionType) {
        const { error: deleteError } = await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existingReaction.id);
        
        if (deleteError) {
          console.error('Error removing reaction:', deleteError);
          throw deleteError;
        }
        
        return { reacted: false, type: null };
      } else {
        const { error: updateError } = await supabase
          .from('post_reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existingReaction.id);
        
        if (updateError) {
          console.error('Error updating reaction:', updateError);
          throw updateError;
        }
        
        return { reacted: true, type: reactionType };
      }
    }
    
    // Otherwise, add a new reaction
    const { error: insertError } = await supabase
      .from('post_reactions')
      .insert({
        user_id: userId,
        post_id: postId,
        reaction_type: reactionType,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error adding reaction:', insertError);
      throw insertError;
    }
    
    return { reacted: true, type: reactionType };
  } catch (error) {
    console.error('Post reaction failed:', error);
    throw error;
  }
};

/**
 * Get user details by user ID
 * @param {string} userId - The user ID to get details for
 * @returns {Object} - User details object
 */
export const getUserDetails = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null; // Return null instead of throwing to avoid breaking UI
  }
};

/**
 * Get post creator details
 * @param {string} userId - The user ID of the post creator
 * @returns {Object} - User profile data
 */
export const getPostCreator = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching post creator:', error);
    return null; // Return null instead of throwing to avoid breaking UI
  }
};

/**
 * Check if a user has liked a post
 * @param {string} postId - The post ID to check
 * @param {string} userId - Optional user ID, will get current user if not provided
 * @returns {Object} - Object with isLiked boolean
 */
export const checkIfUserLikedPost = async (postId, userId = null) => {
  try {
    // If userId not provided, get current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isLiked: false };
      userId = user.id;
    }
    
    // Check if user has liked the post
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .match({ post_id: postId, user_id: userId });
      
    if (error) throw error;
    
    return { 
      isLiked: data && data.length > 0,
      likeId: data && data.length > 0 ? data[0].id : null
    };
  } catch (error) {
    console.error('Error checking like status:', error);
    return { isLiked: false };
  }
};

/**
 * Get all likes for a post with user details
 * @param {string} postId - The post ID to get likes for
 * @returns {Object} - Object with likes data and count
 */
export const getPostLikes = async (postId) => {
  try {
    // Get all likes for the post
    const { data: likes, error } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // If no likes, return empty array
    if (!likes || likes.length === 0) {
      return { data: [], count: 0 };
    }
    
    // Process likes to include user details - fetch each user profile separately
    const processedLikes = [];
    
    for (const like of likes) {
      // Get user profile
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', like.user_id)
        .single();
      
      processedLikes.push({
        id: like.id,
        user_id: like.user_id,
        post_id: like.post_id,
        created_at: like.created_at,
        username: userData?.username || 'User',
        avatar_url: userData?.avatar_url,
      });
    }
    
    return { 
      data: processedLikes, 
      count: processedLikes.length 
    };
  } catch (error) {
    console.error('Error fetching post likes:', error);
    return { data: [], count: 0 };
  }
};

/**
 * Process user tags in text and extract mentioned users
 * This provides Instagram-style @mentions functionality
 * @param {string} text - The text to process for tags
 * @returns {Object} - Object with processed text and array of mentioned users
 */
export const processTagsInText = async (text) => {
  if (!text) return { processedText: '', mentionedUsers: [] };
  
  try {
    // Extract usernames from text (format: @username)
    const mentionRegex = /@([\w\d_]+)/g;
    const mentions = text.match(mentionRegex) || [];
    
    // Remove @ symbol and get unique usernames
    const mentionedUsernames = [...new Set(mentions.map(mention => mention.substring(1)))];
    
    // If no mentions, return original text
    if (mentionedUsernames.length === 0) {
      return { processedText: text, mentionedUsers: [] };
    }
    
    // Get user IDs for mentioned usernames
    const mentionedUsers = [];
    
    for (const username of mentionedUsernames) {
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, username, avatar_url')
        .eq('username', username)
        .single();
      
      if (userData) {
        mentionedUsers.push({
          id: userData.id,
          username: userData.username,
          avatar_url: userData.avatar_url
        });
      }
    }
    
    // Return processed text and mentioned users
    return {
      processedText: text,
      mentionedUsers
    };
  } catch (error) {
    console.error('Error processing tags in text:', error);
    return { processedText: text, mentionedUsers: [] };
  }
};

/**
 * Get comments for a specific post
 * @param {string} postId - The post ID to get comments for
 * @returns {Array} - Array of comments with user details
 */
export const getPostComments = async (postId) => {
  try {
    // Fetch comments for the post
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    // Fetch user details for each comment
    const commentsWithUserDetails = await Promise.all(
      comments.map(async (comment) => {
        try {
          const userDetails = await getUserDetails(comment.user_id);
          return {
            ...comment,
            username: userDetails?.username || 'User',
            user_avatar: userDetails?.avatar_url || null
          };
        } catch (error) {
          console.error('Error fetching comment user details:', error);
          return {
            ...comment,
            username: 'User',
            user_avatar: null
          };
        }
      })
    );
    
    return commentsWithUserDetails;
  } catch (error) {
    console.error('Error fetching post comments:', error);
    return [];
  }
};

/**
 * Add a comment to a post
 * @param {string} postId - The post ID to comment on
 * @param {string} userId - The user ID making the comment
 * @param {string} comment - The comment text
 * @returns {Object} - The created comment
 */
export const addComment = async (postId, userId, comment) => {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        comment: comment,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Like a post
 * @param {string} postId - The post ID to like
 * @param {string} userId - The user ID liking the post
 * @returns {Object} - The created like
 */
export const likePost = async (postId, userId) => {
  try {
    // Check if already liked to prevent duplicates
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();
      
    if (existingLike) return existingLike; // Already liked
    
    // Create new like
    const { data, error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    // Ignore not found error, which is expected if not already liked
    if (!error.message || !error.message.includes('No rows found')) {
      console.error('Error liking post:', error);
      throw error;
    }
  }
};

/**
 * Unlike a post
 * @param {string} postId - The post ID to unlike
 * @param {string} userId - The user ID unliking the post
 * @returns {boolean} - Success status
 */
export const unlikePost = async (postId, userId) => {
  try {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unliking post:', error);
    throw error;
  }
};

/**
 * Add a reaction to a post
 * @param {string} postId - The post ID to react to
 * @param {string} userId - The user ID reacting to the post
 * @param {string} reactionType - The type of reaction (emoji)
 * @returns {Object} - The created reaction
 */
export const addReaction = async (postId, userId, reactionType) => {
  try {
    const { data, error } = await supabase
      .from('post_reactions')
      .insert({
        post_id: postId,
        user_id: userId,
        reaction_type: reactionType,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
};

/**
 * Bookmark a post for a user
 * @param {string} postId - The post ID to bookmark
 * @param {string} userId - The user ID bookmarking the post
 * @returns {Object} - The created bookmark
 */
export const bookmarkPost = async (postId, userId) => {
  try {
    // Check if already bookmarked to prevent duplicates
    const { data: existingBookmark } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();
      
    if (existingBookmark) return existingBookmark; // Already bookmarked
    
    // Create new bookmark
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    // Ignore not found error, which is expected if not already bookmarked
    if (!error.message || !error.message.includes('No rows found')) {
      console.error('Error bookmarking post:', error);
      throw error;
    }
  }
};

/**
 * Remove a bookmark for a post
 * @param {string} postId - The post ID to unbookmark
 * @param {string} userId - The user ID removing the bookmark
 * @returns {boolean} - Success status
 */
export const unbookmarkPost = async (postId, userId) => {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
};

/**
 * Check if a post is bookmarked by a user
 * @param {string} postId - The post ID to check
 * @param {string} userId - The user ID to check for
 * @returns {boolean} - Whether the post is bookmarked by the user
 */
export const isPostBookmarked = async (postId, userId) => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();
      
    return !!data; // Convert to boolean
  } catch (error) {
    // Ignore not found error, which means not bookmarked
    if (!error.message || !error.message.includes('No rows found')) {
      console.error('Error checking bookmark status:', error);
    }
    return false;
  }
};

/**
 * Get all bookmarked posts for a user
 * @param {string} userId - The user ID to get bookmarks for
 * @returns {Array} - Array of bookmarked posts
 */
export const getBookmarkedPosts = async (userId) => {
  try {
    // Get all bookmark entries for the user
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', userId);
      
    if (bookmarksError) throw bookmarksError;
    
    // If no bookmarks, return empty array
    if (!bookmarks || bookmarks.length === 0) return [];
    
    // Get the actual posts
    const postIds = bookmarks.map(bookmark => bookmark.post_id);
    
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('post_id', postIds)
      .order('created_at', { ascending: false });
      
    if (postsError) throw postsError;
    
    return posts;
  } catch (error) {
    console.error('Error fetching bookmarked posts:', error);
    return [];
  }
};

/**
 * Create a new collection for saving posts
 * @param {string} userId - The user ID creating the collection
 * @param {string} name - Collection name
 * @param {string} description - Collection description
 * @returns {Object} - The created collection
 */
export const createCollection = async (userId, name, description = '') => {
  try {
    const { data, error } = await supabase
      .from('post_collections')
      .insert({
        user_id: userId,
        name,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
};

/**
 * Get all collections for a user
 * @param {string} userId - The user ID to get collections for
 * @returns {Array} - Array of collections
 */
export const getUserCollections = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('post_collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user collections:', error);
    return [];
  }
};

/**
 * Get a single collection by ID
 * @param {string} collectionId - The collection ID
 * @returns {Object} - The collection details
 */
export const getCollectionById = async (collectionId) => {
  try {
    const { data, error } = await supabase
      .from('post_collections')
      .select('*')
      .eq('id', collectionId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
};

/**
 * Get all posts in a collection
 * @param {string} collectionId - The collection ID
 * @returns {Array} - Array of posts in the collection
 */
export const getCollectionPosts = async (collectionId) => {
  try {
    // Get all post IDs in the collection
    const { data: collectionPosts, error: collectionError } = await supabase
      .from('collection_posts')
      .select('post_id')
      .eq('collection_id', collectionId);
    
    if (collectionError) throw collectionError;
    
    // If no posts in collection, return empty array
    if (!collectionPosts || collectionPosts.length === 0) return [];
    
    // Get the actual posts
    const postIds = collectionPosts.map(item => item.post_id);
    
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('post_id', postIds)
      .order('created_at', { ascending: false });
    
    if (postsError) throw postsError;
    
    return posts || [];
  } catch (error) {
    console.error('Error fetching collection posts:', error);
    return [];
  }
};

/**
 * Add a post to a collection
 * @param {string} collectionId - The collection ID
 * @param {string} postId - The post ID
 * @param {string} userId - The user ID
 * @returns {Object} - The created collection post entry
 */
export const addPostToCollection = async (collectionId, postId, userId) => {
  try {
    const { data, error } = await supabase
      .from('collection_posts')
      .insert({
        collection_id: collectionId,
        post_id: postId,
        user_id: userId,
        added_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding post to collection:', error);
    throw error;
  }
};

/**
 * Remove a post from a collection
 * @param {string} collectionId - The collection ID
 * @param {string} postId - The post ID
 * @returns {boolean} - Success status
 */
export const removePostFromCollection = async (collectionId, postId) => {
  try {
    const { error } = await supabase
      .from('collection_posts')
      .delete()
      .match({ collection_id: collectionId, post_id: postId });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing post from collection:', error);
    return false;
  }
};

/**
 * Check if a post is in a collection
 * @param {string} collectionId - The collection ID
 * @param {string} postId - The post ID
 * @returns {boolean} - Whether the post is in the collection
 */
export const isPostInCollection = async (collectionId, postId) => {
  try {
    const { data, error } = await supabase
      .from('collection_posts')
      .select('id')
      .match({ collection_id: collectionId, post_id: postId });
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking if post is in collection:', error);
    return false;
  }
};

/**
 * Delete a collection
 * @param {string} collectionId - The collection ID
 * @returns {boolean} - Success status
 */
export const deleteCollection = async (collectionId) => {
  try {
    const { error } = await supabase
      .from('post_collections')
      .delete()
      .eq('id', collectionId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting collection:', error);
    return false;
  }
};
