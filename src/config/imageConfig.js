/**
 * Global configuration for expo-image to ensure consistent caching behavior
 */

export const IMAGE_CONFIG = {
  // Default image props for all images
  default: {
    cachePolicy: 'memory-disk',
    transition: false,
    allowDownscaling: false,
    contentFit: 'cover',
    responsivePolicy: 'static', // Prevent re-fetching on size changes
  },
  
  // Housing-specific configuration
  housing: {
    grid: {
      width: 300,
      height: 200,
      quality: 85,
      priority: 'high',
    },
    list: {
      width: 240,
      height: 160,
      quality: 85,
      priority: 'high',
    },
    swipe: {
      width: 600,
      height: 400,
      quality: 90,
      priority: 'high',
    }
  },
  
  // Cache configuration
  cache: {
    maxMemorySize: 150 * 1024 * 1024, // 150MB
    maxDiskSize: 500 * 1024 * 1024, // 500MB
  }
};

/**
 * Get image props for a specific display mode
 */
export const getImageProps = (displayMode = 'grid', recyclingKey) => {
  return {
    ...IMAGE_CONFIG.default,
    recyclingKey,
    priority: IMAGE_CONFIG.housing[displayMode]?.priority || 'normal',
  };
};

/**
 * Configure expo-image globally
 */
export const configureImageCache = () => {
  // This would be called in your app initialization
  // Image.setCacheLimit(IMAGE_CONFIG.cache.maxMemorySize, IMAGE_CONFIG.cache.maxDiskSize);
};

export default IMAGE_CONFIG;