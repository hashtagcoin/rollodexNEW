import React, { useState } from 'react';
import { Image, StyleSheet, View, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';

/**
 * FallbackImage - A component that handles image loading failures gracefully
 * 
 * @param {Object} props - Component props
 * @param {string} props.source - Primary image source URI
 * @param {string} props.fallbackSource - Fallback image to show on error (defaults to placeholder)
 * @param {Object} props.style - Style for the image
 * @param {Object} props.imageProps - Additional props to pass to the Image component
 * @param {Function} props.onLoad - Optional callback when image loads successfully
 * @param {Function} props.onError - Optional callback when image fails to load
 */
const FallbackImage = ({ 
  source, 
  fallbackSource = 'https://via.placeholder.com/300',
  style, 
  imageProps = {},
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Process the source to ensure it's in the correct format for Image component
  const processSource = (src) => {
    if (typeof src === 'string') {
      return { uri: src };
    } else if (src && src.uri) {
      // Already a proper source object with URI
      return src;
    }
    // Default fallback
    return { uri: fallbackSource };
  };
  
  const handleLoad = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };
  
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (onError) onError();
  };
  
  return (
    <View style={[styles.container, style]}>
      {!hasError ? (
        <Image
          source={processSource(source)}
          style={[styles.image, style]}
          onLoad={handleLoad}
          onError={handleError}
          {...imageProps}
        />
      ) : (
        <Image
          source={processSource(fallbackSource)}
          style={[styles.image, style]}
          onLoad={() => setIsLoading(false)}
          {...imageProps}
        />
      )}
      
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLORS.DARK_GREEN} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.5)',
  }
});

export default FallbackImage;
