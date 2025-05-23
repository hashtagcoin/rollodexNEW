import React, { useState, useEffect, memo, useRef } from 'react';
import { Image, ActivityIndicator, StyleSheet, View } from 'react-native';
import imageCache from '../../utils/ImageCache';

// Global tracking of loaded images across component remounts
const globalLoadedImages = new Set();

// For debugging
const DEBUG_IMAGES = true;
const logImage = (componentId, action, details) => {
  if (DEBUG_IMAGES) {
    // Truncate long URLs for readability
    if (details && details.uri) {
      details.uri = details.uri.substring(0, 40) + '...';
    }
    console.log(`[IMAGE-DEBUG][${componentId}] ${action}`, details);
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
  const componentId = useRef(`img-${Date.now()}-${Math.floor(Math.random() * 1000)}`).current;
  const [loading, setLoading] = useState(true);
  const [imageSource, setImageSource] = useState(null);
  const [error, setError] = useState(false);

  // Track which URI is currently being loaded to prevent duplicate loads
  const loadingUri = useRef('');
  const hasLoaded = useRef({});

  useEffect(() => {
    let isMounted = true;
    
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
      imageCache.memoryCache[source.uri]
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
      return;
    }
    
    setLoading(true);
    setError(false);

    const loadImage = async () => {
      // If source is not a URL, use it directly
      if (!source || !source.uri) {
        if (isMounted) {
          setImageSource(source);
          setLoading(false);
        }
        return;
      }

      const url = source.uri;
      
      // Prevent concurrent loads of the same image
      if (loadingUri.current === url) {
        return;
      }
      
      loadingUri.current = url;
      
      try {
        // Try to get from cache first
        let cachedUri = await imageCache.get(url);
        
        if (!cachedUri) {
          // Not in cache, set original URL as source
          if (isMounted) {
            setImageSource(source);
          }
        } else {
          // Use cached version
          if (isMounted) {
            setImageSource({ uri: cachedUri });
            setLoading(false);
            hasLoaded.current[url] = true;
            globalLoadedImages.add(url);
            
            // Log a debug message that we're using a cached image
            console.log(`[CachedImage] Using cached image: ${url.substring(0, 50)}...`);
          }
        }
      } catch (e) {
        console.error('Error in CachedImage:', e);
        if (isMounted) {
          setImageSource(source);
          setError(true);
        }
      } finally {
        if (loadingUri.current === url) {
          loadingUri.current = '';
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [source, skipImageDownload]);  // Only depend on the URI, not the entire source object

  const handleLoad = () => {
    setLoading(false);
    
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
      
      logImage(componentId, 'IMAGE LOADED', { 
        uri: source?.uri, 
        globalCacheSize: globalLoadedImages.size,
        localCacheKeys: Object.keys(hasLoaded.current).length
      });
      
      // Log successful image load for debugging
      if (onLoad) {
        // This callback can be used by parent components for tracking
        onLoad(source.uri);
      }
      
      // Store in persistent cache
      imageCache.set(source.uri, source.uri).catch(err => {
        console.warn('Error caching image:', err);
      });
    } else if (onLoad) {
      onLoad();
    }
  };

  const handleError = (e) => {
    setLoading(false);
    setError(true);
    if (onError) onError(e);
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
