import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Platform } from 'react-native';

// Keys for AsyncStorage
const IMAGE_CACHE_KEY = 'ROLLODEX_IMAGE_CACHE_';
const IMAGE_CACHE_TIMESTAMP_KEY = 'ROLLODEX_IMAGE_CACHE_TIMESTAMP_';
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const CACHE_VERSION = 'v2'; // Increment this when making significant changes to caching logic

/**
 * Utility class to handle image caching
 */
class ImageCache {
  // In-memory cache for fast access during current session
  memoryCache = {};
  
  // Track in-progress downloads to prevent duplicate requests
  pendingDownloads = {};
  
  // Initialize cache on load
  constructor() {
    this.initializeCache();
  }
  
  // Load cached images metadata from AsyncStorage on app startup
  async initializeCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(IMAGE_CACHE_KEY));
      
      if (cacheKeys.length > 0) {
        const values = await AsyncStorage.multiGet(cacheKeys);
        values.forEach(([key, value]) => {
          const url = key.replace(IMAGE_CACHE_KEY, '');
          if (value) {
            this.memoryCache[url] = value;
          }
        });
        console.log(`[ImageCache] Initialized with ${Object.keys(this.memoryCache).length} cached images`);
      }
    } catch (error) {
      console.warn('[ImageCache] Error initializing cache:', error);
    }
  }
  
  /**
   * Get cached image from memory or storage
   * @param {string} url The image URL to get
   * @returns {Promise<string|null>} The cached URI or null if not found
   */
  async get(url) {
    if (!url) return null;
    
    // Normalize URL to prevent cache misses due to encoding differences
    const normalizedUrl = this.normalizeUrl(url);
    
    // Check memory cache first for faster access
    if (this.memoryCache[normalizedUrl]) {
      return this.memoryCache[normalizedUrl];
    }
    
    // If there's a pending download, wait for it to complete
    if (this.pendingDownloads[normalizedUrl]) {
      try {
        await this.pendingDownloads[normalizedUrl];
        // After the download completes, check memory cache again
        if (this.memoryCache[normalizedUrl]) {
          return this.memoryCache[normalizedUrl];
        }
      } catch (error) {
        // Download failed, continue to check AsyncStorage
      }
    }
    
    try {
      // Check AsyncStorage
      const cachedUri = await AsyncStorage.getItem(`${IMAGE_CACHE_KEY}${normalizedUrl}`);
      const timestamp = await AsyncStorage.getItem(`${IMAGE_CACHE_TIMESTAMP_KEY}${normalizedUrl}`);
      
      // Check if cache is expired
      if (cachedUri && timestamp) {
        const cacheTime = parseInt(timestamp, 10);
        const now = Date.now();
        
        if (now - cacheTime <= CACHE_EXPIRY_TIME) {
          // Store in memory cache for faster access next time
          this.memoryCache[normalizedUrl] = cachedUri;
          return cachedUri;
        } else {
          // Cache expired, remove it
          await this.remove(normalizedUrl);
        }
      }
    } catch (error) {
      console.warn('[ImageCache] Error retrieving from image cache:', error);
    }
    
    return null;
  }
  
  /**
   * Normalize URL to prevent cache misses due to encoding differences
   * @param {string} url The URL to normalize
   * @returns {string} The normalized URL
   */
  normalizeUrl(url) {
    if (!url) return '';
    try {
      // Decode and then encode to normalize the URL
      const decoded = decodeURIComponent(url);
      return encodeURI(decoded);
    } catch (e) {
      // If there's an error (e.g., already properly encoded), return original
      return url;
    }
  }
  
  /**
   * Save image to cache
   * @param {string} url The URL of the image
   * @param {string} uri The local URI to save
   * @returns {Promise<void>}
   */
  async set(url, uri) {
    if (!url || !uri) return;
    
    // Normalize URL to prevent cache misses
    const normalizedUrl = this.normalizeUrl(url);
    
    try {
      // Save to AsyncStorage with timestamp
      const timestamp = Date.now().toString();
      await AsyncStorage.setItem(`${IMAGE_CACHE_KEY}${normalizedUrl}`, uri);
      await AsyncStorage.setItem(`${IMAGE_CACHE_TIMESTAMP_KEY}${normalizedUrl}`, timestamp);
      
      // Also save to memory cache
      this.memoryCache[normalizedUrl] = uri;
      
      // Clear any pending download for this URL
      delete this.pendingDownloads[normalizedUrl];
    } catch (error) {
      console.warn('[ImageCache] Error saving to image cache:', error);
      // Clean up pending downloads on error
      delete this.pendingDownloads[normalizedUrl];
    }
  }
  
  /**
   * Remove image from cache
   * @param {string} url The URL to remove
   * @returns {Promise<void>}
   */
  async remove(url) {
    if (!url) return;
    
    // Normalize URL to prevent cache misses
    const normalizedUrl = this.normalizeUrl(url);
    
    try {
      await AsyncStorage.removeItem(`${IMAGE_CACHE_KEY}${normalizedUrl}`);
      await AsyncStorage.removeItem(`${IMAGE_CACHE_TIMESTAMP_KEY}${normalizedUrl}`);
      
      // Also remove from memory cache
      delete this.memoryCache[normalizedUrl];
      // Clear any pending download
      delete this.pendingDownloads[normalizedUrl];
    } catch (error) {
      console.warn('[ImageCache] Error removing from image cache:', error);
    }
  }
  
  /**
   * Prefetch an image and store in cache
   * @param {string} url URL to prefetch
   * @returns {Promise<string|null>} The cached URI or null if prefetch failed
   */
  async prefetch(url) {
    if (!url) return null;
    
    // Normalize URL to prevent cache misses
    const normalizedUrl = this.normalizeUrl(url);
    
    try {
      // Check if already cached
      const cachedUri = await this.get(normalizedUrl);
      if (cachedUri) return cachedUri;
      
      // Check if already being downloaded
      if (this.pendingDownloads[normalizedUrl]) {
        await this.pendingDownloads[normalizedUrl];
        return normalizedUrl;
      }
      
      // Create a promise for this download and store it
      const downloadPromise = new Promise(async (resolve, reject) => {
        try {
          // Not cached, prefetch it
          const prefetchedUri = await Image.prefetch(normalizedUrl);
          if (prefetchedUri) {
            await this.set(normalizedUrl, normalizedUrl); // For network images, we use the original URL as the URI
            resolve(normalizedUrl);
          } else {
            reject(new Error('Prefetch returned falsy value'));
          }
        } catch (error) {
          reject(error);
        }
      });
      
      // Register the pending download
      this.pendingDownloads[normalizedUrl] = downloadPromise;
      
      // Wait for the download to complete
      try {
        await downloadPromise;
        return normalizedUrl;
      } catch (error) {
        console.warn('[ImageCache] Error prefetching image:', error);
        return null;
      } finally {
        // Clean up regardless of result
        delete this.pendingDownloads[normalizedUrl];
      }
    } catch (error) {
      console.warn('[ImageCache] Error in prefetch flow:', error);
      delete this.pendingDownloads[normalizedUrl];
      return null;
    }
  }
  
  /**
   * Clear all cached images
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(IMAGE_CACHE_KEY) || key.startsWith(IMAGE_CACHE_TIMESTAMP_KEY)
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`[ImageCache] Cleared ${cacheKeys.length} cached images`);
      }
      
      // Clear memory cache
      this.memoryCache = {};
      // Clear all pending downloads
      this.pendingDownloads = {};
    } catch (error) {
      console.warn('[ImageCache] Error clearing image cache:', error);
    }
  }
  
  /**
   * Get stats about the cache
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      const memoryItemCount = Object.keys(this.memoryCache).length;
      const pendingDownloadsCount = Object.keys(this.pendingDownloads).length;
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(IMAGE_CACHE_KEY));
      
      return {
        memoryItemCount,
        asyncStorageItemCount: cacheKeys.length,
        pendingDownloadsCount,
        version: CACHE_VERSION,
        platform: Platform.OS
      };
    } catch (error) {
      console.warn('[ImageCache] Error getting cache stats:', error);
      return {
        error: error.message,
        version: CACHE_VERSION,
        platform: Platform.OS
      };
    }
  }
}

// Create a singleton instance
const imageCache = new ImageCache();
export default imageCache;
