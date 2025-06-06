/**
 * Image URL Debug Logger
 * 
 * This utility helps track image URL handling across the service listing flow
 * to identify inconsistencies in URL formation and storage.
 */

const DEBUG_ENABLED = true;

/**
 * Log image URL details at different points in the app flow
 * @param {string} location - Component/screen where logging occurs
 * @param {string} action - What action is being performed
 * @param {string|Array} url - Image URL or array of URLs
 * @param {Object} metadata - Additional context
 */
export const logImageUrl = (location, action, url, metadata = {}) => {
  if (!DEBUG_ENABLED) return;
  
  const timestamp = new Date().toISOString();
  const urlsArray = Array.isArray(url) ? url : [url];
  
  console.log(`[IMAGE_DEBUG][${timestamp}][${location}][${action}]`, {
    urls: urlsArray,
    ...metadata
  });
};

/**
 * Analyze URL structure and report inconsistencies
 * @param {string} url - URL to analyze
 * @return {Object} Analysis results
 */
export const analyzeImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return { isValid: false, analysis: 'Invalid URL: Empty or not a string' };
  }
  
  try {
    // Check if it's a full URL
    const isFullUrl = url.startsWith('http');
    
    // Check if it has the expected Supabase domain
    const hasSupabaseDomain = url.includes('smtckdlpdfvdycocwoip.supabase.co');
    
    // Check if it references the correct bucket
    const hasCorrectBucket = url.includes('/providerimages/');
    
    // Check if it has the expected path structure
    const hasServiceImagesPath = url.includes('service-images/');
    
    // Analyze path structure
    let pathStructure = '';
    if (isFullUrl && hasSupabaseDomain) {
      const pathMatch = url.match(/providerimages\/(.*)/);
      pathStructure = pathMatch ? pathMatch[1] : 'Unknown';
    } else {
      pathStructure = url;
    }
    
    return {
      isValid: isFullUrl && hasSupabaseDomain && hasCorrectBucket,
      isFullUrl,
      hasSupabaseDomain,
      hasCorrectBucket,
      hasServiceImagesPath,
      pathStructure,
      fullUrl: url
    };
  } catch (error) {
    return { 
      isValid: false, 
      error: error.message,
      fullUrl: url
    };
  }
};

/**
 * Format a consistent image URL regardless of input format
 * @param {string} url - Raw URL from any source
 * @param {string} userId - User ID for path construction
 * @return {string} Properly formatted full URL
 */
export const getConsistentImageUrl = (url, userId = null) => {
  if (!url) return null;
  
  // Already a full URL
  if (url.startsWith('http')) {
    return url;
  }
  
  // Handle relative paths
  let path = url;
  
  // Make sure path has service-images prefix
  if (!path.includes('service-images/')) {
    path = `service-images/${path}`;
  }
  
  // Insert userId if provided and not already in path
  if (userId && !path.includes(`service-images/${userId}/`)) {
    // Check if path already has subfolder structure
    if (path.match(/service-images\/[^\/]+$/)) {
      // Just filename after service-images/
      path = path.replace('service-images/', `service-images/${userId}/`);
    } else if (!path.includes(`/${userId}/`)) {
      // Has deeper structure but no userId
      const parts = path.split('/');
      if (parts.length >= 2) {
        parts.splice(1, 0, userId);
        path = parts.join('/');
      }
    }
  }
  
  // Ensure path doesn't start with a slash
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  
  return `https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/${path}`;
};
