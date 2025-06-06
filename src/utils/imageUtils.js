/**
 * Utilities for image processing and dynamic image selection
 */
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Calculate the average brightness of an image
 * @param {string} imageUri - URI of the image to analyze
 * @returns {Promise<number>} - Value between 0 (black) and 255 (white)
 */
export const calculateImageBrightness = async (imageUri) => {
  try {
    // First resize to a smaller image for faster processing
    const resizedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 50 } }],
      { format: SaveFormat.JPEG }
    );
    
    // Get image data
    const base64 = await FileSystem.readAsStringAsync(resizedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Simulate analysis by checking every 10th byte in base64 string
    // This is a simplified approach - a full pixel analysis would be more accurate
    // but also much more resource-intensive
    const sample = Math.min(base64.length, 1000);
    let totalBrightness = 0;
    let count = 0;
    
    for (let i = 0; i < base64.length; i += 10) {
      if (count >= sample) break;
      const charCode = base64.charCodeAt(i);
      totalBrightness += charCode;
      count++;
    }
    
    // Normalize to 0-255 range
    const avgBrightness = Math.min(255, Math.max(0, (totalBrightness / count) - 50));
    console.log(`[IMAGE_DEBUG] Analyzed brightness: ${avgBrightness}`);
    return avgBrightness;
  } catch (error) {
    console.error('Error calculating image brightness:', error);
    // Default to middle brightness on error
    return 128;
  }
};

/**
 * Check if a background is considered dark based on brightness
 * @param {number} brightness - Brightness value (0-255)
 * @returns {boolean} - True if the background is dark
 */
export const isDarkBackground = (brightness) => {
  return brightness < 130; // Threshold for considering a background dark
};

/**
 * Preload images for faster rendering
 * @param {Array<string>} imageRequires - Array of image requires to preload
 */
export const preloadImages = (imageRequires) => {
  imageRequires.forEach(img => {
    if (typeof img === 'number') {
      Image.prefetch(Image.resolveAssetSource(img).uri);
    }
  });
};
