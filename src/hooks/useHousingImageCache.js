import { useEffect, useRef, useCallback } from 'react';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getValidImageUrl, getOptimizedImageUrl } from '../utils/imageHelper';

const CACHE_KEY = 'housing_image_cache_v1';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hook to manage housing image caching with persistent storage
 */
export const useHousingImageCache = () => {
  const cacheRef = useRef(new Map());
  const loadingRef = useRef(new Set());
  
  // Load cache from AsyncStorage on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const stored = await AsyncStorage.getItem(CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const now = Date.now();
          
          // Filter out expired entries
          Object.entries(parsed).forEach(([key, data]) => {
            if (data.timestamp && (now - data.timestamp) < CACHE_EXPIRY) {
              cacheRef.current.set(key, data);
            }
          });
        }
      } catch (error) {
        console.error('Failed to load image cache:', error);
      }
    };
    
    loadCache();
  }, []);
  
  // Save cache to AsyncStorage
  const saveCache = useCallback(async () => {
    try {
      const cacheObj = {};
      cacheRef.current.forEach((value, key) => {
        cacheObj[key] = value;
      });
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
    } catch (error) {
      console.error('Failed to save image cache:', error);
    }
  }, []);
  
  // Preload multiple sizes for a housing item
  const preloadHousingItem = useCallback(async (item) => {
    if (!item?.media_urls?.length || !item.id) return;
    
    const baseUrl = getValidImageUrl(item.media_urls[0], 'housingimages');
    const sizes = [
      { width: 300, key: 'grid' },
      { width: 240, key: 'list' },
      { width: 600, key: 'swipe' }
    ];
    
    const promises = sizes.map(async ({ width, key }) => {
      const cacheKey = `housing_${item.id}_${key}`;
      
      // Skip if already cached or loading
      if (cacheRef.current.has(cacheKey) || loadingRef.current.has(cacheKey)) {
        return;
      }
      
      loadingRef.current.add(cacheKey);
      
      try {
        const url = getOptimizedImageUrl(baseUrl, width, 85);
        await Image.prefetch(url, { 
          priority: 'high',
          cachePolicy: 'memory-disk'
        });
        
        // Mark as cached
        cacheRef.current.set(cacheKey, {
          url,
          timestamp: Date.now()
        });
      } catch (error) {
        console.debug(`Failed to prefetch ${cacheKey}:`, error.message);
      } finally {
        loadingRef.current.delete(cacheKey);
      }
    });
    
    await Promise.allSettled(promises);
  }, []);
  
  // Batch preload housing items
  const preloadHousingItems = useCallback(async (items, priority = 'normal') => {
    if (!items || items.length === 0) return;
    
    // Process in batches of 3
    const batchSize = 3;
    for (let i = 0; i < Math.min(items.length, 10); i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(preloadHousingItem));
      
      // Small delay between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Save cache after batch completion
    saveCache();
  }, [preloadHousingItem, saveCache]);
  
  // Get cached URL for a housing item
  const getCachedUrl = useCallback((itemId, displayAs = 'grid') => {
    const cacheKey = `housing_${itemId}_${displayAs}`;
    return cacheRef.current.get(cacheKey)?.url;
  }, []);
  
  // Check if item is cached
  const isCached = useCallback((itemId, displayAs = 'grid') => {
    const cacheKey = `housing_${itemId}_${displayAs}`;
    return cacheRef.current.has(cacheKey);
  }, []);
  
  // Clear expired cache entries
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    let hasChanges = false;
    
    cacheRef.current.forEach((value, key) => {
      if (!value.timestamp || (now - value.timestamp) > CACHE_EXPIRY) {
        cacheRef.current.delete(key);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      saveCache();
    }
  }, [saveCache]);
  
  return {
    preloadHousingItems,
    preloadHousingItem,
    getCachedUrl,
    isCached,
    clearExpiredCache,
    cacheStats: {
      size: cacheRef.current.size,
      loading: loadingRef.current.size
    }
  };
};

export default useHousingImageCache;