import { useEffect, useRef } from 'react';
import { Image } from 'expo-image';
import { getValidImageUrl, getOptimizedImageUrl } from '../utils/imageHelper';

/**
 * Custom hook for efficient image preloading with batching and priority
 */
export const useImagePreloader = () => {
  const preloadQueue = useRef([]);
  const isProcessing = useRef(false);
  const processedUrls = useRef(new Set());

  const processQueue = async () => {
    if (isProcessing.current || preloadQueue.current.length === 0) return;
    
    isProcessing.current = true;
    
    // Process up to 5 images at a time
    const batch = preloadQueue.current.splice(0, 5);
    
    try {
      await Promise.allSettled(
        batch.map(({ url, priority }) => {
          if (processedUrls.current.has(url)) {
            return Promise.resolve();
          }
          
          processedUrls.current.add(url);
          
          // Higher priority images get loaded first
          return Image.prefetch(url, { priority: priority || 'normal' })
            .catch(() => {/* Silently fail */});
        })
      );
    } finally {
      isProcessing.current = false;
      
      // Process next batch if queue has more items
      if (preloadQueue.current.length > 0) {
        setTimeout(processQueue, 100);
      }
    }
  };

  const preloadImages = (images, bucket = 'housingimages', priority = 'normal') => {
    if (!images || images.length === 0) return;
    
    const newUrls = images
      .filter(item => item?.media_urls?.length > 0)
      .slice(0, 10) // Limit to first 10 items
      .map(item => {
        const url = getValidImageUrl(item.media_urls[0], bucket);
        return {
          url: getOptimizedImageUrl(url, 400, 85),
          priority
        };
      })
      .filter(({ url }) => !processedUrls.current.has(url));
    
    if (newUrls.length > 0) {
      preloadQueue.current.push(...newUrls);
      processQueue();
    }
  };

  const clearCache = () => {
    preloadQueue.current = [];
    processedUrls.current.clear();
    isProcessing.current = false;
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      clearCache();
    };
  }, []);

  return { preloadImages, clearCache };
};

export default useImagePreloader;