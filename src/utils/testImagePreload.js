import ImagePreloadService from '../services/ImagePreloadService';

/**
 * Test the image preloading functionality
 * This can be called from a screen or component to verify preloading is working
 */
export const testImagePreloading = async () => {
  console.log('=== Starting Image Preload Test ===');
  
  // Test 1: Check if service is initialized
  console.log('Test 1: Service initialized:', !!ImagePreloadService);
  
  // Test 2: Check preloaded categories
  const categories = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];
  categories.forEach(category => {
    const isPreloaded = ImagePreloadService.isCategoryPreloaded(category);
    console.log(`Test 2: ${category} preloaded:`, isPreloaded);
  });
  
  // Test 3: Get preloaded URLs for a category
  const housingUrls = ImagePreloadService.getPreloadedUrls('Housing');
  console.log('Test 3: Housing URLs count:', housingUrls.length);
  if (housingUrls.length > 0) {
    console.log('Sample Housing URL:', housingUrls[0]);
  }
  
  // Test 4: Check failed URLs
  console.log('Test 4: Failed URLs count:', ImagePreloadService.failedUrls.size);
  
  // Test 5: Manual preload test
  try {
    console.log('Test 5: Attempting manual preload of Therapy category...');
    await ImagePreloadService.preloadCategory('Therapy', false);
    console.log('Test 5: Manual preload completed');
  } catch (error) {
    console.error('Test 5: Manual preload failed:', error);
  }
  
  console.log('=== Image Preload Test Complete ===');
  
  return {
    serviceInitialized: !!ImagePreloadService,
    preloadedCategories: Array.from(ImagePreloadService.preloadedCategories),
    failedUrlsCount: ImagePreloadService.failedUrls.size,
    housingUrlsCount: housingUrls.length
  };
};