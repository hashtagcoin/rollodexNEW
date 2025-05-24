/**
 * Image helper utility for handling Supabase image URLs
 */

const SUPABASE_URL = 'https://smtckdlpdfvdycocwoip.supabase.co';

/**
 * Ensures a URL is properly formatted for Supabase storage
 * @param {string} url The URL to format
 * @param {string} bucket The storage bucket name (default: 'postsimages')
 * @returns {string} The properly formatted URL
 */
export const getValidImageUrl = (url, bucket = 'postsimages') => {
  if (!url) return null;
  
  // If it's already a complete URL, return it
  if (url.startsWith('http')) {
    return url;
  }

  // Check if it's a file:// URL which won't work from remote servers
  if (url.startsWith('file://')) {
    const fileName = url.split('/').pop();
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
  }

  // If it's a relative path
  if (url.startsWith('/')) {
    return `${SUPABASE_URL}/storage/v1/object${url}`;
  }

  // Default case - assume it's just a filename
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${url}`;
};

/**
 * Get a default image URL for fallback
 * @param {string} type Type of content (post, user, housing, service)
 * @returns {object} The image source object with uri property
 */
export const getDefaultImage = (type) => {
  // Use direct Supabase URLs instead of require()
  switch (type) {
    case 'user':
      return { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-avatar.png' };
    case 'housing':
      return { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-housing.png' };
    case 'service':
      return { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png' };
    case 'post':
    default:
      return { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-post.png' };
  }
};
