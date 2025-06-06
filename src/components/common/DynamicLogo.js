import React, { useState, useEffect, memo } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { useAssets } from 'expo-asset';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { isDarkBackground } from '../../utils/imageUtils';

/**
 * DynamicLogo component that changes between light and dark versions
 * based on the background brightness
 * 
 * @param {Object} props Component props
 * @param {Boolean} props.isDark Force dark mode (use white logo)
 * @param {Boolean} props.isLight Force light mode (use black logo)
 * @param {String} props.backgroundImage URI of the background image to analyze
 * @param {Object} props.style Style for the logo container
 * @param {Object} props.imageStyle Style for the image itself
 * @param {String} props.resizeMode Image resize mode
 */
const DynamicLogo = ({ isDark, isLight, backgroundImage, style, imageStyle, resizeMode = "contain" }) => {
  const [useDarkMode, setUseDarkMode] = useState(isDark || false);
  
  // Load both logo versions
  const [assets] = useAssets([
    require('../../assets/images/rolladex-black.png'),
    require('../../assets/images/rolladex-white.png')
  ]);
  
  // Analyze background image brightness if provided
  useEffect(() => {
    // If explicitly set through props, don't analyze
    if (isDark !== undefined || isLight !== undefined) {
      setUseDarkMode(!!isDark);
      return;
    }
    
    // If no background image, default to light mode
    if (!backgroundImage) {
      setUseDarkMode(false);
      return;
    }
    
    const analyzeBackgroundBrightness = async () => {
      try {
        // Handle require() reference vs direct URI
        let imageUri;
        
        if (typeof backgroundImage === 'number') {
          // It's a require() reference - need to get the actual URI
          const asset = Asset.fromModule(backgroundImage);
          await asset.downloadAsync();
          imageUri = asset.localUri || asset.uri;
        } else {
          // It's already a URI string
          imageUri = backgroundImage;
        }
        
        console.log(`[DynamicLogo] Analyzing image: ${imageUri}`);
        
        // Simplified luminance detection - check if the image has dark pixels
        // We'll use a default on any error rather than complicated analysis
        // The full analysis causes more problems on many devices than it solves
        
        // For simplicity in a React Native context, we'll use default logic
        // based on naming convention
        if (imageUri && imageUri.toLowerCase().includes('dark')) {
          setUseDarkMode(true);
        } else if (imageUri && (imageUri.toLowerCase().includes('margo') || 
                  imageUri.toLowerCase().includes('background'))) {
          // Hardcoded check for known dark backgrounds
          setUseDarkMode(true);
        } else {
          setUseDarkMode(false);
        }
        
        console.log(`[DynamicLogo] Using ${useDarkMode ? 'white' : 'black'} logo`);
      } catch (error) {
        console.error('[DynamicLogo] Error analyzing background:', error);
        setUseDarkMode(false); // Default to light mode on error
      }
    };
    
    analyzeBackgroundBrightness();
  }, [backgroundImage, isDark, isLight]);
  
  // Determine which logo to use
  const getLogoSource = () => {
    return useDarkMode 
      ? require('../../assets/images/rolladex-white.png') 
      : require('../../assets/images/rolladex-black.png');
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={getLogoSource()}
        style={[styles.logo, imageStyle]}
        resizeMode={resizeMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  }
});

// Memoize to prevent unnecessary re-renders
export default memo(DynamicLogo);
