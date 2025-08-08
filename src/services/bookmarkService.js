import { supabase } from '../lib/supabaseClient';

/**
 * Add a bookmark for a post
 * @param {string} userId - The user's ID
 * @param {string} postId - The post's ID
 * @returns {Promise<{data, error}>}
 */
export const addBookmark = async (userId, postId) => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        post_id: postId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding bookmark:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in addBookmark:', error);
    return { data: null, error };
  }
};

/**
 * Remove a bookmark for a post
 * @param {string} userId - The user's ID
 * @param {string} postId - The post's ID
 * @returns {Promise<{data, error}>}
 */
export const removeBookmark = async (userId, postId) => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
      .select();

    if (error) {
      console.error('Error removing bookmark:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in removeBookmark:', error);
    return { data: null, error };
  }
};

/**
 * Check if a post is bookmarked by the user
 * @param {string} userId - The user's ID
 * @param {string} postId - The post's ID
 * @returns {Promise<{isBookmarked: boolean, error}>}
 */
export const isPostBookmarked = async (userId, postId) => {
  try {
    console.log('[BookmarkService] Checking bookmark for user:', userId, 'post:', postId);
    
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (error) {
      console.error('[BookmarkService] Error checking bookmark status:', error);
      return { isBookmarked: false, error };
    }

    const isBookmarked = !!data;
    console.log('[BookmarkService] Bookmark check result - data:', data, 'isBookmarked:', isBookmarked);
    
    return { isBookmarked, error: null };
  } catch (error) {
    console.error('[BookmarkService] Error in isPostBookmarked:', error);
    return { isBookmarked: false, error };
  }
};

/**
 * Get all bookmarked posts for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<{data, error}>}
 */
export const getUserBookmarks = async (userId) => {
  try {
    // Step 1: Get bookmarks with post IDs
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('id, created_at, post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      console.error('Error fetching bookmarks:', bookmarksError);
      return { data: null, error: bookmarksError };
    }

    if (!bookmarks || bookmarks.length === 0) {
      return { data: [], error: null };
    }

    // Step 2: Get posts data for bookmarked posts
    const postIds = bookmarks.map(bookmark => bookmark.post_id);
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        post_id,
        caption,
        media_urls,
        created_at,
        user_id
      `)
      .in('post_id', postIds);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return { data: null, error: postsError };
    }

    // Step 3: Get user profiles for post authors
    const userIds = [...new Set(posts?.map(post => post.user_id) || [])];
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return { data: null, error: profilesError };
    }

    // Step 4: Combine all data
    const transformedData = bookmarks.map(bookmark => {
      const post = posts?.find(p => p.post_id === bookmark.post_id);
      const userProfile = userProfiles?.find(u => u.id === post?.user_id);
      
      return {
        ...post,
        bookmark_id: bookmark.id,
        bookmarked_at: bookmark.created_at,
        user_profiles: userProfile || null
      };
    }).filter(item => item.post_id); // Filter out any items where post wasn't found

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error in getUserBookmarks:', error);
    return { data: null, error };
  }
};

/**
 * Toggle bookmark status for a post
 * @param {string} userId - The user's ID
 * @param {string} postId - The post's ID
 * @returns {Promise<{isBookmarked: boolean, error}>}
 */
export const toggleBookmark = async (userId, postId) => {
  try {
    // First check if the post is already bookmarked
    const { isBookmarked, error: checkError } = await isPostBookmarked(userId, postId);
    
    if (checkError) {
      return { isBookmarked: false, error: checkError };
    }

    if (isBookmarked) {
      // Remove bookmark
      const { error: removeError } = await removeBookmark(userId, postId);
      if (removeError) {
        return { isBookmarked: true, error: removeError };
      }
      return { isBookmarked: false, error: null };
    } else {
      // Add bookmark
      const { error: addError } = await addBookmark(userId, postId);
      if (addError) {
        return { isBookmarked: false, error: addError };
      }
      return { isBookmarked: true, error: null };
    }
  } catch (error) {
    console.error('Error in toggleBookmark:', error);
    return { isBookmarked: false, error };
  }
};
