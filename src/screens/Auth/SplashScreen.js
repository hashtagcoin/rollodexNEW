import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Dimensions, TouchableWithoutFeedback } from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const [animationComplete, setAnimationComplete] = useState(false);
  const bgFadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Start background fade in immediately
  useEffect(() => {
    Animated.timing(bgFadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      // After background fades in, start the rest of the animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        // After placeholder fades in, slide down the logo
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        ]).start(() => {
          setAnimationComplete(true);
        });
      });
    });
  }, [bgFadeAnim, fadeAnim, slideAnim, scaleAnim]);

  const handleScreenPress = () => {
    if (animationComplete) {
      navigation.replace('SignIn');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleScreenPress}>
      <View style={styles.container}>
        {/* Background Image with fade in */}
        <Animated.Image 
          source={require('../../assets/images/splash.png')} 
          style={[
            styles.backgroundImage,
            { opacity: bgFadeAnim }
          ]}
          resizeMode="cover"
        />
        
        {/* Animated Placeholder */}
        <Animated.View 
          style={[
            styles.placeholderContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Image 
            source={require('../../assets/images/placeholder.png')} 
            style={styles.placeholderImage}
            resizeMode="contain"
          />
        </Animated.View>
        
        {/* Animated Logo */}
        <Animated.Image 
          source={require('../../assets/images/rollodex-title.png')} 
          style={[
            styles.logoImage,
            {
              opacity: slideAnim,
              transform: [
                { translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0]
                }) },
                { scale: scaleAnim }
              ]
            }
          ]}
          resizeMode="contain"
        />
        
        {/* Tap to continue prompt (only shows after animation completes) */}
        {animationComplete && (
          <Animated.Text style={[styles.tapPrompt, { opacity: fadeAnim }]}>
            Tap to continue
          </Animated.Text>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    // Ensure the full height is visible by adjusting the image aspect ratio
    resizeMode: 'contain',
  },
  placeholderContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    // Reduced size by 50%
    width: 100,
    height: 100,
  },
  logoImage: {
    position: 'absolute',
    // Reduced size by 50%
    width: 150,
    height: 60,
    bottom: 80,
  },
  tapPrompt: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default SplashScreen;
