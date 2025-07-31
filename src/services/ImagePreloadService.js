import { Image } from 'expo-image';
import { supabase } from '../lib/supabaseClient';
import { getValidImageUrl } from '../utils/imageHelper';

class ImagePreloadService {
  constructor() {
    this.preloadedCategories = new Set();
    this.preloadingInProgress = new Map();
    this.imageCache = new Map(); // Store URLs by category
    this.categories = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
    this.failedUrls = new Set(); // Track failed URLs to avoid retrying
    this.preloadBatchSize = 3; // Smaller batch size for better performance
    this.maxImagesPerCategory = 20; // Reduced from 30 to prevent memory issues
  }

  /**
   * Initialize preloading on app startup
   */
  async initializePreloading() {
    console.log('[ImagePreload] Starting background preload for all categories');
    
    // Test connectivity first
    try {
      const testUrl = 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png';
      console.log('[ImagePreload] Testing connectivity with:', testUrl);
      
      const testResult = await Image.prefetch(testUrl, { cachePolicy: 'disk' });
      console.log('[ImagePreload] Connectivity test successful:', testResult);
    } catch (error) {
      console.error('[ImagePreload] Connectivity test failed:', error);
      console.error('[ImagePreload] Error details:', error.message, error.code);
    }
    
    // Add a small delay to ensure app is fully initialized
    setTimeout(() => {
      // Preload categories sequentially with delays to avoid overwhelming the system
      this.preloadCategoriesSequentially();
    }, 2000);
  }

  /**
   * Preload categories one by one with delays
   */
  async preloadCategoriesSequentially() {
    for (const category of this.categories) {
      try {
        await this.preloadCategory(category, true);
        // Add delay between categories to prevent memory pressure
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[ImagePreload] Failed to preload ${category}:`, error);
      }
    }
    console.log('[ImagePreload] Finished preloading all categories');
  }

  /**
   * Preload images for a specific category
   */
  async preloadCategory(category, isBackground = false) {
    // Skip if already preloaded or currently preloading
    if (this.preloadedCategories.has(category) || this.preloadingInProgress.has(category)) {
      return;
    }

    // Mark as preloading
    this.preloadingInProgress.set(category, true);

    try {
      console.log(`[ImagePreload] Preloading category: ${category}`);
      
      // Fetch data for the category
      const isHousing = category === 'Housing';
      const tableName = isHousing ? 'housing_listings' : 'services';
      
      let query = supabase.from(tableName)
        .select('id, media_urls')
        .eq('available', true)
        .limit(this.maxImagesPerCategory); // Use configurable limit
      
      if (!isHousing) {
        query = query.ilike('category', `%${category}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`[ImagePreload] Error fetching ${category} data:`, error);
        return;
      }

      if (!data || data.length === 0) {
        console.log(`[ImagePreload] No items found for ${category}`);
        return;
      }

      // Extract all image URLs
      const imageUrls = [];
      data.forEach(item => {
        if (item.media_urls && item.media_urls.length > 0) {
          const rawUrl = item.media_urls[0];
          const bucket = isHousing ? 'housingimages' : 'providerimages';
          const imageUrl = getValidImageUrl(rawUrl, bucket, 'ImagePreloadService');
          
          // Skip placeholder URLs and already failed URLs
          if (imageUrl.includes('placeholder.com') || this.failedUrls.has(imageUrl)) {
            return;
          }
          
          // Only preload the original URL without transformations
          // Transformations can cause issues with Supabase Storage v1
          imageUrls.push(imageUrl);
        }
      });

      // Store URLs in cache
      this.imageCache.set(category, imageUrls);

      console.log(`[ImagePreload] Found ${imageUrls.length} valid images for ${category}`);
      
      // Preload images in smaller batches
      let successCount = 0;
      for (let i = 0; i < imageUrls.length; i += this.preloadBatchSize) {
        const batch = imageUrls.slice(i, i + this.preloadBatchSize);
        const preloadPromises = batch.map(async (url) => {
          try {
            // Use prefetch with cachePolicy 'disk' for better performance
            await Image.prefetch(url, { cachePolicy: 'disk' });
            successCount++;
            return { url, success: true };
          } catch (err) {
            const errorDetails = {
              url: url.substring(0, 100),
              message: err.message || 'Unknown error',
              code: err.code || 'NO_CODE',
              stack: err.stack ? err.stack.substring(0, 200) : 'No stack trace'
            };
            console.warn('[ImagePreload] Failed to preload:', errorDetails);
            this.failedUrls.add(url); // Track failed URLs
            return { url, success: false, error: errorDetails };
          }
        });
        
        // Wait for batch to complete before starting next
        await Promise.all(preloadPromises);
        
        // Add delay between batches to prevent overwhelming the system
        if (isBackground && i + this.preloadBatchSize < imageUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`[ImagePreload] Successfully preloaded ${successCount}/${imageUrls.length} images for ${category}`);
      
      // Only mark as preloaded if we had some success
      if (successCount > 0) {
        this.preloadedCategories.add(category);
      }

    } catch (error) {
      console.error(`[ImagePreload] Error preloading ${category}:`, error);
    } finally {
      this.preloadingInProgress.delete(category);
    }
  }

  /**
   * Preload adjacent categories when user is viewing a specific category
   */
  async preloadAdjacentCategories(currentCategory) {
    const currentIndex = this.categories.indexOf(currentCategory);
    if (currentIndex === -1) return;

    const adjacentCategories = [];
    
    // Get previous and next categories
    if (currentIndex > 0) {
      adjacentCategories.push(this.categories[currentIndex - 1]);
    }
    if (currentIndex < this.categories.length - 1) {
      adjacentCategories.push(this.categories[currentIndex + 1]);
    }

    // Preload adjacent categories in background
    adjacentCategories.forEach(category => {
      this.preloadCategory(category, true);
    });
  }

  /**
   * Get preload status for a category
   */
  isCategoryPreloaded(category) {
    return this.preloadedCategories.has(category);
  }

  /**
   * Verify if an image URL is accessible
   */
  async verifyImageUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get preloaded URLs for a category
   */
  getPreloadedUrls(category) {
    return this.imageCache.get(category) || [];
  }

  /**
   * Clear preloaded images for memory management
   */
  clearPreloadedImages() {
    this.preloadedCategories.clear();
    this.imageCache.clear();
    this.failedUrls.clear();
    console.log('[ImagePreload] Cleared all preloaded images');
  }

  /**
   * Retry failed preloads for a category
   */
  async retryFailedPreloads(category) {
    const urls = this.getPreloadedUrls(category);
    const failedInCategory = urls.filter(url => this.failedUrls.has(url));
    
    if (failedInCategory.length === 0) return;
    
    console.log(`[ImagePreload] Retrying ${failedInCategory.length} failed images for ${category}`);
    
    // Clear failed URLs for retry
    failedInCategory.forEach(url => this.failedUrls.delete(url));
    
    // Retry preloading
    for (const url of failedInCategory) {
      try {
        await Image.prefetch(url, { cachePolicy: 'disk' });
        console.log(`[ImagePreload] Retry successful for ${url.substring(0, 50)}...`);
      } catch (err) {
        this.failedUrls.add(url);
      }
    }
  }

  /**
   * Clear all cached data - call this on logout or user change
   */
  clearAllCaches() {
    console.log('[ImagePreload] Clearing all caches');
    this.preloadedCategories.clear();
    this.preloadingInProgress.clear();
    this.imageCache.clear();
    this.failedUrls.clear();
  }
}

// Export singleton instance
export default new ImagePreloadService();
