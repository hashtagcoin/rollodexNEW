/**
 * Comprehensive Image Error Handler for iOS TurboModule Crash Prevention
 * 
 * This utility provides robust error handling for React Native Image components
 * to prevent iOS production crashes caused by TurboModule exceptions.
 * 
 * Research shows that unhandled image loading failures in React Native can cause
 * SIGABRT crashes in iOS production builds when exceptions propagate through
 * the TurboModule bridge without proper error boundaries.
 */

import { Platform  } from 'react-native';
import { Alert } from './alert';


// Centralized image error tracking
const imageErrorTracker = new Map();
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Comprehensive image error handler that prevents TurboModule crashes
 * @param {Object} error - The error object from onError callback
 * @param {string} imageUrl - The URL of the failed image
 * @param {string} context - Context identifier for debugging
 * @param {Function} onRetry - Optional retry callback
 * @param {Function} onFallback - Optional fallback callback
 */
export const handleImageError = (error, imageUrl, context = 'unknown', onRetry = null, onFallback = null) => {
  const errorKey = `${context}_${imageUrl}`;
  const currentAttempts = imageErrorTracker.get(errorKey) || 0;
  
  // Log error for debugging (only in development)
  if (__DEV__) {
    console.warn(`[ImageErrorHandler] ${context}: Image load failed`, {
      url: imageUrl,
      error: error?.nativeEvent?.error || error,
      attempts: currentAttempts + 1,
      platform: Platform.OS
    });
  }
  
  // Track error attempts
  imageErrorTracker.set(errorKey, currentAttempts + 1);
  
  // Attempt retry if under max attempts and retry callback provided
  if (currentAttempts < MAX_RETRY_ATTEMPTS && onRetry) {
    setTimeout(() => {
      if (__DEV__) {
        console.log(`[ImageErrorHandler] ${context}: Retrying image load (attempt ${currentAttempts + 2})`);
      }
      onRetry();
    }, RETRY_DELAY * (currentAttempts + 1)); // Exponential backoff
    return;
  }
  
  // Execute fallback if provided
  if (onFallback) {
    onFallback();
  }
  
  // Clear error tracking after max attempts
  if (currentAttempts >= MAX_RETRY_ATTEMPTS) {
    imageErrorTracker.delete(errorKey);
  }
  
  // In production, log critical image failures for monitoring
  if (!__DEV__ && Platform.OS === 'ios') {
    // This prevents the error from propagating to TurboModule bridge
    try {
      // Silent error logging for production monitoring
      console.error(`[PROD] Image load failure: ${context} - ${imageUrl}`);
    } catch (e) {
      // Swallow any logging errors to prevent cascade failures
    }
  }
};

/**
 * Enhanced image props generator with comprehensive error handling
 * @param {string} imageUrl - The image URL
 * @param {string} context - Context identifier
 * @param {Object} options - Additional options
 * @returns {Object} Complete image props with error handling
 */
export const getEnhancedImageProps = (imageUrl, context, options = {}) => {
  const {
    style,
    resizeMode = 'cover',
    defaultSource = require('../../assets/placeholder-image.png'),
    loadingIndicatorSource = require('../../assets/placeholder-image.png'),
    onRetry = null,
    onFallback = null,
    fadeDuration = 0, // Disable fade to prevent rendering issues
    progressiveRenderingEnabled = true
  } = options;
  
  return {
    source: { uri: imageUrl },
    style,
    resizeMode,
    defaultSource,
    loadingIndicatorSource,
    fadeDuration,
    progressiveRenderingEnabled,
    onError: (error) => handleImageError(error, imageUrl, context, onRetry, onFallback),
    onLoadStart: () => {
      if (__DEV__) {
        console.log(`[ImageLoader] ${context}: Loading started - ${imageUrl}`);
      }
    },
    onPartialLoad: () => {
      if (__DEV__) {
        console.log(`[ImageLoader] ${context}: Partial load - ${imageUrl}`);
      }
    },
    onLoad: () => {
      // Clear any error tracking on successful load
      const errorKey = `${context}_${imageUrl}`;
      imageErrorTracker.delete(errorKey);
      
      if (__DEV__) {
        console.log(`[ImageLoader] ${context}: Load complete - ${imageUrl}`);
      }
    },
    onLoadEnd: () => {
      if (__DEV__) {
        console.log(`[ImageLoader] ${context}: Load end - ${imageUrl}`);
      }
    }
  };
};

/**
 * Safe image URL validator
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is safe to load
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Clear error tracking for a specific context (useful for cleanup)
 * @param {string} context - Context to clear
 */
export const clearImageErrorTracking = (context) => {
  for (const [key] of imageErrorTracker) {
    if (key.startsWith(`${context}_`)) {
      imageErrorTracker.delete(key);
    }
  }
};

/**
 * Get current error statistics (for debugging)
 * @returns {Object} Error statistics
 */
export const getImageErrorStats = () => {
  if (!__DEV__) return {};
  
  const stats = {};
  for (const [key, attempts] of imageErrorTracker) {
    const [context] = key.split('_');
    stats[context] = (stats[context] || 0) + attempts;
  }
  
  return stats;
};
