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

const MAX_RETRIES = 3;
const RETRY_DELAY = 500; // ms

// Helper function to attempt preloading with retries
const attemptPreload = (uri, tag, retriesLeft) => {
  return new Promise((resolve) => {
    Image.prefetch(uri)
      .then(() => {
        if (__DEV__) {
          console.log(`[ImagePreloader][${tag}] Successfully preloaded: ${uri.substring(0, 60)}...`);
        }
        globalImageCache.add(uri);
        prefetchPromises.delete(uri);
        resolve(true);
      })
      .catch((error) => {
        if (retriesLeft > 0) {
          if (__DEV__) {
            console.warn(`[ImagePreloader][${tag}] Failed to preload, ${retriesLeft} retries left. Retrying in ${RETRY_DELAY}ms...`, uri.substring(0, 60));
          }
          setTimeout(() => {
            resolve(attemptPreload(uri, tag, retriesLeft - 1));
          }, RETRY_DELAY);
        } else {
          console.error(`[ImagePreloader][${tag}] Failed to preload after ${MAX_RETRIES} retries: ${uri.substring(0, 60)}...`, error?.message || 'Unknown error');
          // Mark as failed to prevent further attempts in this session
          globalImageCache.add(uri);
          prefetchPromises.delete(uri);
          resolve(false);
        }
      });
  });
};

export const preloadImage = (uri, tag = 'default') => {
  if (!uri) {
    if (__DEV__) console.warn('[ImagePreloader] Attempted to preload undefined or null URI');
    return Promise.resolve(false);
  }

  // Validate the URL before attempting to preload
  if (!isValidImageUrl(uri)) {
    if (__DEV__) console.warn(`[ImagePreloader][${tag}] Invalid image URL: ${uri?.substring?.(0, 60)}...`);
    return Promise.resolve(false);
  }

  // If already cached or a download is in progress, don't start another
  if (globalImageCache.has(uri)) {
    // Add explicit logging for skipped images
    if (__DEV__) console.log(`[ImagePreloader][${tag}] Skipped: Image already in global cache set. URI: ${uri.substring(0, 60)}...`);
    return Promise.resolve(true);
  }
  if (prefetchPromises.has(uri)) {
    if (__DEV__) console.log(`[ImagePreloader][${tag}] Skipped: Image prefetch already in progress. URI: ${uri.substring(0, 60)}...`);
    return prefetchPromises.get(uri);
  }

  const prefetchPromise = attemptPreload(uri, tag, MAX_RETRIES);
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

/**
 * Clear the image preload cache
 * Resets the preloader's state by clearing the cache and in-progress promises
 */
export const clearImagePreloadCache = () => {
  const clearedPromiseCount = prefetchPromises.size;
  const clearedCacheCount = globalImageCache.size;

  prefetchPromises.clear();
  globalImageCache.clear();

  if (__DEV__) {
    console.log(`[ImagePreloader] Cache cleared. Removed ${clearedPromiseCount} in-progress promises and ${clearedCacheCount} cached URIs.`);
  }
};

export default {
  preloadImage,
  preloadImages,
  isImageCached,
  getCacheStats,
  clearFromCache,
  clearCache,
  clearImagePreloadCache
};
