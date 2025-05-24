import React, { useState, useEffect, memo, useRef } from 'react';
import { Image, ActivityIndicator, StyleSheet, View } from 'react-native';
import imageCache from '../../utils/ImageCache';

// Global tracking of loaded images across component remounts
const globalLoadedImages = new Set();

// Export the global set for other components to use
export { globalLoadedImages };

// Advanced image metrics tracking
const imageLoadTimes = {};
const imageRenderTimes = {};
const failedImageLoads = new Set();
const glitchReports = [];
const imageLoadCounts = {}; // Track how many times each image has been loaded

// For debugging
const DEBUG_IMAGES = true;
const logImage = (componentId, action, details) => {
  if (DEBUG_IMAGES) {
    const timestamp = Date.now();
    const formattedTime = new Date(timestamp).toISOString().split('T')[1].split('Z')[0];
    
    // Truncate long URLs for readability
    if (details && details.uri) {
      const originalUri = details.uri;
      details.uri = details.uri.substring(0, 40) + '...';
      details.uriHash = hashString(originalUri);
    }
    
    // Add timing information
    const enhancedDetails = {
      timestamp,
      ...details,
    };
    
    console.log(`[IMAGE-DEBUG][${formattedTime}][${componentId}] ${action}`, enhancedDetails);
    
    // Track potential glitches
    if (action.includes('ERROR') || action.includes('UNMOUNTED_WHILE_LOADING')) {
      glitchReports.push({
        timestamp,
        componentId,
        action,
        ...details
      });
    }
  }
};

// Simple string hashing for URI tracking
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16); // convert to hex string
};

// Helper function to process Supabase URLs
const processSupabaseUrl = (url) => {
  if (!url) return url;
  
  try {
    // 1. Remove any query parameters
    let processedUrl = url.split('?')[0];
    
    // 2. Fix common encoding issues
    processedUrl = processedUrl.replace(/\+/g, '%20');
    
    // 3. Make sure URL has proper protocol
    if (!processedUrl.startsWith('http')) {
      processedUrl = `https://${processedUrl}`;
    }
    
    // 4. Fix double slashes issue in path (except after protocol)
    processedUrl = processedUrl.replace(/(https?:\/\/)(.+)/, (match, protocol, path) => {
      return protocol + path.replace(/\/\//g, '/');
    });
    
    // 5. Ensure proper URL encoding for special characters
    // We don't want to re-encode the entire URL, just fix known issues
    processedUrl = processedUrl.replace(/\s/g, '%20');
    
    return processedUrl;
  } catch (error) {
    console.warn('Error processing Supabase URL:', error);
    return url; // Return original if processing fails
  }
};

/**
 * A component that displays images with caching
 */
const CachedImage = ({
  source,
  style,
  placeholderSource,
  resizeMode = 'cover',
  onLoad,
  onError,
  indicatorColor = '#3A5E49',
  indicatorSize = 'small',
  skipImageDownload = false,
  ...props
}) => {
  // Create a unique ID for this component instance for tracking
  const componentId = useRef(`img-inst-${Date.now()}-${Math.floor(Math.random() * 1000)}`).current;
  const [loading, setLoading] = useState(true);
  const [imageSource, setImageSource] = useState(null);
  const [error, setError] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  
  // More robust tracking of load state to prevent race conditions
  const mountedRef = useRef(true);
  const loadStartedRef = useRef(false);
  const loadCompletedRef = useRef(false);
  
  // Track which URI is currently being loaded to prevent duplicate loads
  const loadingUri = useRef('');
  const hasLoaded = useRef({});
  
  // Track render count to detect unnecessary re-renders
  const renderCount = useRef(0);

  // Update the mounted ref when component mounts/unmounts
  useEffect(() => {
    mountedRef.current = true;
    renderCount.current++;
    
    logImage(componentId, 'COMPONENT MOUNTED', { 
      uri: source?.uri,
      uriHash: source?.uri ? hashString(source.uri) : 'none'
    });
    
    return () => {
      mountedRef.current = false;
      loadStartedRef.current = false;
      logImage(componentId, 'COMPONENT UNMOUNTED', { 
        uri: source?.uri,
        uriHash: source?.uri ? hashString(source.uri) : 'none'
      });
    };
  }, []);
  
  // Memoize URI comparison to prevent unnecessary re-renders
  const prevUriRef = useRef('');
  useEffect(() => {
    if (source?.uri && prevUriRef.current === source.uri) {
      logImage(componentId, 'MemoCheck', {
        prevUri: prevUriRef.current,
        nextUri: source.uri,
        result: 'Preventing re-render'
      });
      return; // Skip re-render if URI hasn't changed
    }
    
    prevUriRef.current = source?.uri || '';
    renderCount.current++;
    
    if (!mountedRef.current) return;
    
    logImage(componentId, 'EFFECT TRIGGERED', { 
      uri: source?.uri,
      alreadyLoadedLocally: source?.uri ? hasLoaded.current[source.uri] : false,
      alreadyLoadedGlobally: source?.uri ? globalLoadedImages.has(source.uri) : false,
      globalCacheSize: globalLoadedImages.size,
      inMemoryCacheSize: Object.keys(imageCache.memoryCache).length
    });
    
    // Enhanced caching check - look in all possible caches
    const isAlreadyCached = source && source.uri && (
      hasLoaded.current[source.uri] || 
      globalLoadedImages.has(source.uri) || 
      imageCache.memoryCache[source.uri] ||
      loadCompletedRef.current
    );
    
    // Skip re-loading if we already have this image
    if (isAlreadyCached) {
      // Update component-level tracking to ensure it's consistent
      if (source && source.uri && !hasLoaded.current[source.uri]) {
        hasLoaded.current[source.uri] = true;
      }
      
      // Also ensure it's in the global set
      if (source && source.uri && !globalLoadedImages.has(source.uri)) {
        globalLoadedImages.add(source.uri);
      }
      
      setImageSource(source);
      setLoading(false);
      loadCompletedRef.current = true;
      
      logImage(componentId, 'USING CACHED IMAGE', { 
        uri: source?.uri, 
        fromGlobalSet: source?.uri ? globalLoadedImages.has(source.uri) : false,
        fromLocalCache: source?.uri ? !!hasLoaded.current[source.uri] : false,
        fromMemoryCache: source?.uri ? !!imageCache.memoryCache[source.uri] : false
      });
      return;
    }
    
    // If skipImageDownload is true and we have a URI, just use the URI directly without caching
    if (skipImageDownload && source && source.uri) {
      setImageSource(source);
      setLoading(false);
      hasLoaded.current[source.uri] = true;
      globalLoadedImages.add(source.uri);
      loadCompletedRef.current = true;
      return;
    }
    
    // Skip loading if we've already attempted it and are in the middle of loading
    if (loadStartedRef.current && !loadCompletedRef.current && source?.uri && loadingUri.current === source.uri) {
      logImage(componentId, 'SKIPPING DUPLICATE LOAD', {
        uri: source?.uri,
        loadStarted: loadStartedRef.current,
        loadCompleted: loadCompletedRef.current
      });
      return;
    }
    
    setLoading(true);
    setError(false);
    setHasAttemptedLoad(true);

    const loadImage = async () => {
      // If source is not a URL, use it directly
      if (!source || !source.uri) {
        if (mountedRef.current) {
          setImageSource(source);
          setLoading(false);
          loadCompletedRef.current = true;
        }
        return;
      }

      const url = source.uri;
      
      // Mark as loading to prevent duplicate requests
      loadStartedRef.current = true;
      
      // Prevent concurrent loads of the same image
      if (loadingUri.current === url) {
        return;
      }
      
      loadingUri.current = url;
      
      try {
        // Try to get from cache first
        let cachedUri = await imageCache.get(url);
        
        // Special handling for Supabase URLs - more robust check
        const isSupabaseUrl = url && (
          url.includes('supabase.co') || 
          url.includes('supabase.in') || 
          url.includes('smtckdlpdfvdycocwoip')
        );
        
        // Process Supabase URLs before caching attempt
        let processedUrl = url;
        if (isSupabaseUrl) {
          // Make sure URL is properly formatted for Supabase storage
          processedUrl = processSupabaseUrl(url);
          logImage(componentId, 'PROCESSED SUPABASE URL', {
            originalUri: url,
            processedUri: processedUrl
          });
        }
        
        if (!cachedUri) {
          // Not in cache, set processed URL as source
          if (mountedRef.current) {
            setImageSource({ uri: processedUrl });
          }
        } else {
          // Use cached version
          if (mountedRef.current) {
            setImageSource({ uri: cachedUri });
            setLoading(false);
            hasLoaded.current[url] = true;
            globalLoadedImages.add(url);
            loadCompletedRef.current = true;
            
            // Log a debug message that we're using a cached image
            logImage(componentId, 'CACHED IMAGE LOADED', {
              uri: url,
              fromCache: true
            });
          }
        }
      } catch (e) {
        console.error('Error in CachedImage:', e);
        if (mountedRef.current) {
          // For Supabase URLs, try with direct URL as fallback
          const isSupabaseUrl = url && (
            url.includes('supabase.co') || 
            url.includes('supabase.in') || 
            url.includes('smtckdlpdfvdycocwoip')
          );
          
          if (isSupabaseUrl) {
            const processedUrl = processSupabaseUrl(url);
            setImageSource({ uri: processedUrl });
            logImage(componentId, 'ATTEMPTING FALLBACK WITH PROCESSED URL', {
              originalUri: url,
              processedUri: processedUrl,
              error: e.message
            });
          } else {
            setImageSource(source);
            setError(true);
            logImage(componentId, 'IMAGE LOAD ERROR', {
              uri: url,
              error: e.message
            });
          }
        }
      } finally {
        if (loadingUri.current === url) {
          loadingUri.current = '';
        }
      }
    };

    loadImage();

  }, [source, skipImageDownload, componentId]);  // Only depend on the URI, not the entire source object

  const handleLoad = () => {
    if (!mountedRef.current) return; // Don't update state if component is unmounting
    
    setLoading(false);
    loadCompletedRef.current = true;
    
    // Check if image is already cached to prevent redundant processing
    const isAlreadyCached = source && source.uri && (
      hasLoaded.current[source.uri] || 
      globalLoadedImages.has(source.uri)
    );
    
    // Skip further processing if already cached (prevents redundant load events)
    if (isAlreadyCached && !error) {
      logImage(componentId, 'LOAD EVENT SKIPPED (ALREADY CACHED)', { 
        uri: source?.uri
      });
      return;
    }
    
    // If source has uri, cache it for future use
    if (source && source.uri && !error) {
      // Mark as loaded in both component ref and global set
      hasLoaded.current[source.uri] = true;
      globalLoadedImages.add(source.uri);
      
      // Track the number of times this image has been loaded globally
      const imageUri = source.uri;
      if (!imageLoadCounts[imageUri]) {
        imageLoadCounts[imageUri] = 1;
      } else {
        imageLoadCounts[imageUri]++;
      }
      
      // Log warning if image loaded multiple times
      if (imageLoadCounts[imageUri] > 1) {
        console.log(`[IMAGE-LOAD-DEBUG] Image loaded: ${imageUri.substring(0, 40)}... (${imageLoadCounts[imageUri]} times) | Total loads: ${Object.values(imageLoadCounts).reduce((a, b) => a + b, 0)}`);
        
        if (imageLoadCounts[imageUri] > 3) {
          console.warn(`[IMAGE-LOAD-DEBUG] WARNING: Image loaded multiple times: ${imageUri.substring(0, 40)}... (${imageLoadCounts[imageUri]} times)`);
        }
      }
      
      logImage(componentId, 'IMAGE LOADED', { 
        uri: source?.uri, 
        globalCacheSize: globalLoadedImages.size,
        localCacheKeys: Object.keys(hasLoaded.current).length,
        loadCount: imageLoadCounts[imageUri] || 1
      });
      
      // Log successful image load for debugging
      if (onLoad && mountedRef.current) {
        // This callback can be used by parent components for tracking
        onLoad(source.uri);
      }
      
      // Store in persistent cache
      imageCache.set(source.uri, source.uri).catch(err => {
        console.warn('Error caching image:', err);
      });
    } else if (onLoad && mountedRef.current) {
      onLoad();
    }
  };
  
  // Handle load errors more gracefully
  const handleError = (error) => {
    if (!mountedRef.current) return; // Don't update state if component is unmounting
    
    setError(true);
    setLoading(false);
    
    logImage(componentId, 'IMAGE LOAD ERROR', {
      uri: source?.uri,
      error: error?.message || 'Unknown error'
    });
    
    if (onError && mountedRef.current) {
      onError(error);
    }
  };

  // Use placeholder if there's an error or no source
  const finalSource = error || !imageSource ? placeholderSource : imageSource;

  // Determine if we should suppress loading indicator for cached images
  const isAlreadyCached = source && source.uri && (
    hasLoaded.current[source.uri] || 
    globalLoadedImages.has(source.uri) ||
    imageCache.memoryCache[source.uri]
  );
  
  // For cached images, we can optimize by not showing the loading indicator at all
  const shouldShowLoading = loading && !isAlreadyCached;
  
  return (
    <View style={[styles.container, style]}>
      <Image
        source={finalSource}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onLoadStart={() => isAlreadyCached ? null : setLoading(true)}
        onLoad={handleLoad}
        onLoadEnd={() => setLoading(false)}
        onError={handleError}
        {...props}
      />
      {shouldShowLoading && (
        <ActivityIndicator
          style={styles.loader}
          size={indicatorSize}
          color={indicatorColor}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.3)',
  },
});

// Use memo to prevent unnecessary re-renders with more comprehensive comparison
// Wrap with debugging info for remounting
const MemoizedCachedImage = memo(CachedImage, (prevProps, nextProps) => {
  // Debug when comparison is triggered
  if (DEBUG_IMAGES && prevProps.source?.uri) {
    const isSame = prevProps.source?.uri === nextProps.source?.uri;
    logImage('MemoCheck', isSame ? 'PROPS UNCHANGED' : 'PROPS CHANGED', {
      prevUri: prevProps.source?.uri,
      nextUri: nextProps.source?.uri,
      result: isSame ? 'Preventing re-render' : 'Will re-render'
    });
  }
  // Only re-render if source URI changes or essential props change
  // First check if both have URI sources
  if (prevProps.source?.uri && nextProps.source?.uri) {
    // If URI is the same, check style changes (which might affect layout)
    const sameUri = prevProps.source.uri === nextProps.source.uri;
    if (!sameUri) return false;
    
    // Also check if resizeMode changed (important for rendering)
    if (prevProps.resizeMode !== nextProps.resizeMode) return false;
    
    // Check if placeholder changed (affects fallback rendering)
    if (prevProps.placeholderSource !== nextProps.placeholderSource) return false;
    
    // Most other prop changes shouldn't trigger a re-render if the URI is the same
    return true;
  }
  
  // For non-URI sources or if only one has a URI, do a simple reference check
  return prevProps.source === nextProps.source;
});

// Component wrapper to detect mounting/unmounting
const CachedImageWithLifecycle = (props) => {
  const instanceId = useRef(`img-inst-${Date.now()}-${Math.floor(Math.random() * 1000)}`).current;
  
  useEffect(() => {
    logImage(instanceId, 'COMPONENT MOUNTED', { uri: props.source?.uri });
    return () => {
      logImage(instanceId, 'COMPONENT UNMOUNTED', { uri: props.source?.uri });
    };
  }, []);
  
  return <MemoizedCachedImage {...props} />;
};

export default CachedImageWithLifecycle;
