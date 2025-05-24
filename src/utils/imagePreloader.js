/**
 * Global image preloading and caching service
 * Handles image preloading, caching, and status tracking across the app
 */

import { Image } from 'react-native';
import { Platform } from 'react-native';

// Global cache to track which images have been successfully loaded
const globalImageCache = new Set();

// Cache for prefetch promises to avoid redundant prefetching
const prefetchPromises = new Map();

// Debugging counters
let totalLoadAttempts = 0;
let successfulLoads = 0;
let failedLoads = 0;

/**
 * Preload an image into the cache
 * @param {string} uri The image URI to preload
 * @param {string} tag Optional tag for logging/debugging (e.g. 'SwipeCard', 'Profile')
 * @returns {Promise} Promise that resolves when image is loaded
 */
/**
 * Validates if a string is a valid image URL
 * @param {string} url The URL to validate
 * @returns {boolean} True if the URL is valid
 */
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Basic URL validation
  try {
    // Check if it's a well-formed URL
    new URL(url);
    
    // Check if it has a valid image extension or is from a known image service
    const hasImageExtension = /\.(jpg|jpeg|png|gif|bmp|webp|svg)($|\?)/i.test(url);
    const isStorageUrl = url.includes('supabase.co/storage') || url.includes('cloudinary.com');
    
    return hasImageExtension || isStorageUrl;
  } catch (e) {
    return false;
  }
};

export const preloadImage = (uri, tag = 'default') => {
  if (!uri) {
    console.warn('[ImagePreloader] Attempted to preload undefined or null URI');
    return Promise.resolve(false);
  }
  
  // Validate the URL before attempting to preload
  if (!isValidImageUrl(uri)) {
    console.warn(`[ImagePreloader][${tag}] Invalid image URL: ${uri?.substring?.(0, 30)}...`);
    return Promise.resolve(false);
  }
  
  // If already loaded, return resolved promise
  if (globalImageCache.has(uri)) {
    console.log(`[ImagePreloader][${tag}] Image already cached: ${uri.substring(0, 30)}...`);
    return Promise.resolve(true);
  }
  
  // If already being fetched, return the existing promise
  if (prefetchPromises.has(uri)) {
    return prefetchPromises.get(uri);
  }
  
  totalLoadAttempts++;
  
  // Create and store the prefetch promise
  const prefetchPromise = new Promise((resolve) => {
    // Use a timeout to prevent blocking the JS thread
    setTimeout(() => {
      Image.prefetch(uri)
        .then(() => {
          globalImageCache.add(uri);
          successfulLoads++;
          console.log(`[ImagePreloader][${tag}] Successfully preloaded: ${uri.substring(0, 30)}...`);
          resolve(true);
        })
        .catch(error => {
          failedLoads++;
          // Log but don't throw to prevent app crashes - image loading failures are common
          console.log(`[ImagePreloader][${tag}] Failed to preload: ${uri.substring(0, 30)}...`, 
            error?.message || 'Unknown error');
          // Still consider this cached to prevent repeated failures
          globalImageCache.add(uri);
          resolve(false);
        })
        .finally(() => {
          // Remove from in-progress map
          prefetchPromises.delete(uri);
        });
    }, 0);
  });
  
  prefetchPromises.set(uri, prefetchPromise);
  return prefetchPromise;
};

/**
 * Preload multiple images at once
 * @param {Array<string>} uris Array of image URIs to preload
 * @param {string} tag Optional tag for logging/debugging
 * @returns {Promise} Promise that resolves when all images are loaded
 */
export const preloadImages = (uris, tag = 'batch') => {
  if (!uris || !Array.isArray(uris) || uris.length === 0) {
    return Promise.resolve([]);
  }
  
  console.log(`[ImagePreloader][${tag}] Preloading batch of ${uris.length} images`);
  return Promise.all(
    uris.filter(Boolean).map(uri => preloadImage(uri, tag))
  );
};

/**
 * Check if an image is already cached
 * @param {string} uri The image URI to check
 * @returns {boolean} True if the image is cached
 */
export const isImageCached = (uri) => {
  return globalImageCache.has(uri);
};

/**
 * Get cache statistics
 * @returns {Object} Statistics about the image cache
 */
export const getCacheStats = () => {
  return {
    totalCached: globalImageCache.size,
    totalLoadAttempts,
    successfulLoads,
    failedLoads,
    inProgress: prefetchPromises.size
  };
};

/**
 * Clear specific images from cache
 * @param {Array<string>} uris Array of image URIs to remove from cache
 */
export const clearFromCache = (uris) => {
  if (!uris || !Array.isArray(uris)) return;
  
  uris.forEach(uri => {
    if (uri) globalImageCache.delete(uri);
  });
};

/**
 * Clear entire image cache
 * Warning: Use sparingly, as this will cause all images to reload
 */
export const clearCache = () => {
  globalImageCache.clear();
  console.log('[ImagePreloader] Image cache cleared');
};

export default {
  preloadImage,
  preloadImages,
  isImageCached,
  getCacheStats,
  clearFromCache,
  clearCache
};
