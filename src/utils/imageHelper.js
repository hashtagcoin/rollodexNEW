/**
 * Image helper utility for handling Supabase image URLs
 */

const SUPABASE_URL = 'https://smtckdlpdfvdycocwoip.supabase.co';
const DEBUG_ENABLED = true;

// Define default image paths for fallbacks
// Using placeholder.com as a fallback since Supabase buckets are not configured
const DEFAULT_IMAGES = {
  service: 'https://via.placeholder.com/400x300/E6F2FF/003366?text=Service',
  housing: 'https://via.placeholder.com/400x300/E6F2FF/003366?text=Housing',
  user: 'https://via.placeholder.com/150x150/E6F2FF/003366?text=User',
  post: 'https://via.placeholder.com/400x300/E6F2FF/003366?text=Post',
  event: 'https://via.placeholder.com/400x300/E6F2FF/003366?text=Event',
  group: 'https://via.placeholder.com/400x300/E6F2FF/003366?text=Group',
};

/**
 * Log image processing for debugging
 * @param {string} source - Source component/function calling this
 * @param {string} from - Original URL
 * @param {string} to - Processed URL
 * @param {boolean} isError - Whether this is an error case
 */
const logImageProcessing = (source, from, to, isError = false) => {
  if (!DEBUG_ENABLED) return;
  const prefix = isError ? '[IMAGE_URL_ERROR]' : '[IMAGE_URL_DEBUG]';
  console.log(`${prefix}[${source}] FROM: "${from}" TO: "${to}"`);
};

/**
 * Ensures a URL is properly formatted for Supabase storage
 * @param {string} url The URL to format
 * @param {string} bucket The storage bucket name (default: 'postsimages')
 * @param {string} source Source component for logging
 * @param {string} userId Optional user ID for path construction
 * @param {string} type Content type for fallback image (service, housing, etc)
 * @returns {string} The properly formatted URL
 */
export const getValidImageUrl = (url, bucket = 'postsimages', source = 'unknown', userId = null, type = 'service') => {
  try {
    // Handle null/undefined/empty URLs
    if (!url || url === 'null' || url === 'undefined') {
      const fallbackUrl = DEFAULT_IMAGES[type] || DEFAULT_IMAGES.service;
      logImageProcessing(source, url, fallbackUrl, true);
      return fallbackUrl;
    }
    
    // If it's already a complete URL, return it but do a basic validation check
    if (url.startsWith('http')) {
      // Make sure the URL doesn't have invalid characters
      if (url.includes('\\') || url.includes('"') || url.includes('\'')) {
        const sanitizedUrl = url
          .replace(/\\/g, '/')
          .replace(/"/g, '')
          .replace(/'/g, '');
        logImageProcessing(source, url, sanitizedUrl, true);
        return sanitizedUrl;
      }
      logImageProcessing(source, url, url);
      return url;
    }

    // Check if it's a file:// URL which won't work from remote servers
    if (url.startsWith('file://')) {
      const fileName = url.split('/').pop();
      const result = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
      logImageProcessing(source, url, result);
      return result;
    }

    // Handle service images in subfolders with userId
    if (url.includes('service-images/') && userId) {
      // Check if userId already in path
      if (!url.includes(`service-images/${userId}/`)) {
        // Check if we have a different folder structure
        const parts = url.split('/');
        if (parts.length >= 3) { // Has at least service-images/something/file.jpg
          // Don't modify if it already has a user subfolder
        } else {
          // Insert userId after service-images/
          const newUrl = url.replace('service-images/', `service-images/${userId}/`);
          const result = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${newUrl}`;
          logImageProcessing(source, url, result);
          return result;
        }
      }
    }

    // If it's a relative path
    if (url.startsWith('/')) {
      const result = `${SUPABASE_URL}/storage/v1/object${url}`;
      logImageProcessing(source, url, result);
      return result;
    }

    // Default case - assume it's just a filename or path
    const result = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${url}`;
    logImageProcessing(source, url, result);
    return result;
  } catch (error) {
    const fallbackUrl = DEFAULT_IMAGES[type] || DEFAULT_IMAGES.service;
    logImageProcessing(source, url, fallbackUrl, true);
    console.error(`[IMAGE_ERROR][${source}] Error processing URL: ${error.message}`);
    return fallbackUrl;
  }
};

/**
 * Standardize service image URLs for consistent handling
 * @param {Array|string} urls The URLs to standardize
 * @param {string} userId The user ID for path construction
 * @param {string} source Source component for logging
 * @returns {Array} Array of standardized URLs
 */
export const standardizeServiceImageUrls = (urls, userId = null, source = 'unknown') => {
  try {
    // Handle null/undefined case with empty array
    if (!urls) {
      logImageProcessing(source, 'null/undefined urls', '[]', true);
      return [];
    }
    
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    const standardizedUrls = urlArray
      .filter(url => {
        // Filter out null, undefined, or non-string URLs
        if (!url || typeof url !== 'string') {
          logImageProcessing(source, String(url), 'filtered out', true);
          return false;
        }
        return true;
      })
      .map(url => {
        try {
          // Already a complete URL, check for malformed content
          if (url.startsWith('http')) {
            // Sanitize the URL if needed
            if (url.includes('\\') || url.includes('"') || url.includes('\'')) {
              const sanitizedUrl = url
                .replace(/\\/g, '/')
                .replace(/"/g, '')
                .replace(/'/g, '');
              logImageProcessing(source, url, sanitizedUrl, true);
              return sanitizedUrl;
            }
            logImageProcessing(source, url, url);
            return url;
          }
          
          // Make sure path includes service-images/
          let path = url;
          if (!path.includes('service-images/')) {
            path = `service-images/${path}`;
          }
          
          // Insert userId if needed and not already present
          if (userId && !path.includes(`service-images/${userId}`)) {
            path = path.replace('service-images/', `service-images/${userId}/`);
          }
          
          const result = `${SUPABASE_URL}/storage/v1/object/public/providerimages/${path}`;
          logImageProcessing(source, url, result);
          return result;
        } catch (itemError) {
          // If processing of an individual URL fails, use default
          const fallbackUrl = DEFAULT_IMAGES.service;
          logImageProcessing(source, url, fallbackUrl, true);
          console.error(`[IMAGE_ERROR][${source}] Error processing URL item: ${itemError.message}`);
          return fallbackUrl;
        }
      });
      
    // If no valid URLs were found, return a default
    if (standardizedUrls.length === 0) {
      const fallbackUrl = DEFAULT_IMAGES.service;
      return [fallbackUrl];
    }
    
    return standardizedUrls;
  } catch (error) {
    // If the whole function fails, return at least one default image
    console.error(`[IMAGE_ERROR][${source}] Failed to standardize URLs: ${error.message}`);
    return [DEFAULT_IMAGES.service];
  }
};

/**
 * Get a default image URL for fallback
 * @param {string} type Type of content (post, user, housing, service, event, group)
 * @returns {object} The image source object with uri property
 */
export const getDefaultImage = (type) => {
  try {
    // Use DEFAULT_IMAGES constants for consistency
    const imageUrl = DEFAULT_IMAGES[type] || DEFAULT_IMAGES.post;
    return { uri: imageUrl };
  } catch (error) {
    console.error(`[IMAGE_ERROR][getDefaultImage] Error getting default image: ${error.message}`);
    // Ultimate fallback - hardcoded default
    return { uri: DEFAULT_IMAGES.post };
  }
};

// NEW: Utility to request CDN-optimised variants (webp, resized)
// ---------------------------------------------------------------------------
/**
 * Append Supabase image transformation parameters so the CDN returns a resized / compressed
 * variant suited to list and grid thumbnails. If the URL already has query params we leave it.
 * Use sparingly – full-size URLs should still be used on detail screens.
 *
 * @param {string} url – fully resolved public URL (output of getValidImageUrl)
 * @param {number} width – desired width in px (height will auto scale). Default 400.
 * @param {number} quality – jpeg/webp quality (1-100). Default 70.
 * @returns {string}
 */
export const getOptimizedImageUrl = (url, width = 400, quality = 70) => {
  try {
    if (!url || typeof url !== 'string') return url;

    // Skip if a transformation is already applied (presence of ?width or format)
    if (url.includes('?width=') || url.includes('?quality=')) return url;

    // Use different quality settings based on width
    const finalQuality = width <= 200 ? 60 : width <= 400 ? quality : 85;
    
    // For Supabase Storage v2, append transformation parameters
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      // Append transformation parameters to the original URL
      const params = `?width=${width}&quality=${finalQuality}`;
      return `${url}${params}`;
    }
    
    // For other URLs, append standard query params
    const params = `?width=${width}&quality=${finalQuality}`;
    return `${url}${params}`;
  } catch (err) {
    // On error just return original
    return url;
  }
};
