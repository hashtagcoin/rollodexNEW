import { Image } from 'expo-image';
import { supabase } from '../lib/supabaseClient';
import { getValidImageUrl, getOptimizedImageUrl } from '../utils/imageHelper';

class ImagePreloadService {
  constructor() {
    this.preloadedCategories = new Set();
    this.preloadingInProgress = new Map();
    this.imageCache = new Map(); // Store URLs by category
    this.categories = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
  }

  /**
   * Initialize preloading on app startup
   */
  async initializePreloading() {
    console.log('[ImagePreload] Starting background preload for all categories');
    
    // Start preloading all categories in parallel
    const preloadPromises = this.categories.map(category => 
      this.preloadCategory(category, true)
    );
    
    // Don't await - let it run in background
    Promise.all(preloadPromises).then(() => {
      console.log('[ImagePreload] All categories preloaded successfully');
    }).catch(error => {
      console.error('[ImagePreload] Error during initialization:', error);
    });
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
        .limit(30); // Preload top 30 items per category
      
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
          const imageUrl = getValidImageUrl(rawUrl, bucket);
          
          // Get optimized URLs for different sizes
          const thumbUrl = getOptimizedImageUrl(imageUrl, 400, 70); // Grid/List size
          const largeUrl = getOptimizedImageUrl(imageUrl, 800, 70); // Swipe size
          
          if (thumbUrl) imageUrls.push(thumbUrl);
          if (largeUrl && largeUrl !== thumbUrl) imageUrls.push(largeUrl);
        }
      });

      // Store URLs in cache
      this.imageCache.set(category, imageUrls);

      // Preload images in batches
      const batchSize = 5;
      for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        const preloadPromises = batch.map(url => 
          Image.prefetch(url, 'immutable').catch(err => {
            console.warn(`[ImagePreload] Failed to preload: ${url.substring(0, 50)}...`);
            return null;
          })
        );
        
        // Wait for batch to complete before starting next
        await Promise.all(preloadPromises);
        
        // Add small delay between batches if background preloading
        if (isBackground && i + batchSize < imageUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`[ImagePreload] Successfully preloaded ${imageUrls.length} images for ${category}`);
      this.preloadedCategories.add(category);

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
   * Clear preloaded images for memory management
   */
  clearPreloadedImages() {
    this.preloadedCategories.clear();
    this.imageCache.clear();
    console.log('[ImagePreload] Cleared all preloaded images');
  }
}

// Export singleton instance
export default new ImagePreloadService();
