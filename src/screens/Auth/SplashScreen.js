import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, TouchableWithoutFeedback, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation, route }) => {
  const { isAuthenticated, userRole } = route.params || {};
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [minDisplayTimeReached, setMinDisplayTimeReached] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;
  const gifOpacity = useRef(new Animated.Value(1)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const gifTranslateY = useRef(new Animated.Value(50)).current; // Start 50px lower

  const taglineText = "Connect. Explore. Thrive.";

  useEffect(() => {
    // Show GIF immediately
    setShowGif(true);
    
    // Set minimum display time (6 seconds total)
    setTimeout(() => {
      setMinDisplayTimeReached(true);
    }, 6000);

    // New animation sequence:
    // 1. GIF plays immediately and stops on last frame
    // 2. After 3 seconds, logo appears
    // 3. 1 second after logo (4s total), text appears
    
    // Show logo after 1.5 seconds (reduced by 50%)
    setTimeout(() => {
      setShowLogo(true);
      Animated.parallel([
        Animated.timing(logoFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        // Smoothly move GIF to its final position
        Animated.timing(gifTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start pulse animation for the logo
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }, 1500); // Logo appears after 1.5 seconds (50% faster)
    
    // Show text 1 second after logo appears (2.5s total)
    setTimeout(() => {
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 1500, // 1.5 second fade-in for text
        useNativeDriver: true,
      }).start(() => {
        setAnimationComplete(true);
      });
    }, 2500); // Text appears after 2.5 seconds total

    // Heartbeat animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeatAnim, {
          toValue: 1.2,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1.15,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1500), // Pause between heartbeats
      ])
    ).start();
  }, []);

  const handleScreenPress = () => {
    if (animationComplete && minDisplayTimeReached) {
      navigation.replace('WelcomeScreen');
    }
  };

  const handleSkip = () => {
    // Navigate directly to the main app based on user role
    if (userRole === 'provider') {
      navigation.navigate('ProviderStack');
    } else {
      navigation.navigate('MainApp');
    }
  };


  return (
    <TouchableWithoutFeedback onPress={handleScreenPress}>
      <LinearGradient
        colors={['#25D0CF', '#25D0CF']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Main content container with GIF, logo and text in vertical flow */}
        <View style={styles.mainContentContainer}>
          {/* Animated GIF that plays once and stops on last frame */}
          {showGif && (
            <Animated.View
              style={[
                styles.gifContainer,
                {
                  opacity: gifOpacity,
                  transform: [{ translateY: gifTranslateY }],
                },
              ]}
            >
              <Image 
                source={require('../../assets/images/Animation.gif')}
                style={styles.animatedLogo}
                contentFit="contain"
                // Use expo-image with autoplay false to control GIF playback
                autoplay={true}
                loop={false} // This makes the GIF play once and stop
                cachePolicy="memory-disk"
                transition={0} // No transition for immediate display
                onLoad={() => {
                  console.log('GIF loaded and playing once');
                }}
              />
            </Animated.View>
          )}

          {/* Logo and text content */}
          {showLogo && (
            <Animated.View
              style={[
                styles.logoContentContainer,
                {
                  opacity: logoFadeAnim,
                  transform: [
                    { scale: scaleAnim },
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [{ scale: Animated.multiply(pulseAnim, heartbeatAnim) }],
                  },
                ]}
              >
                <Image 
                  source={require('../../assets/images/logo.png')}
                  style={styles.iconImage}
                  contentFit="contain"
                />
              </Animated.View>
              
              <Animated.Text
                style={[
                  styles.tagline,
                  {
                    opacity: messageOpacity,
                  },
                ]}
              >
                {taglineText}
              </Animated.Text>
            </Animated.View>
          )}
        </View>

        {animationComplete && (
          <Animated.View
            style={[
              styles.bottomContainer,
              {
                opacity: logoFadeAnim,
              },
            ]}
          >
            <View style={styles.progressDots}>
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
            
            <Text style={styles.tapPrompt}>Tap anywhere to begin</Text>
          </Animated.View>
        )}

        <View style={styles.backgroundDecoration}>
          <Animated.View
            style={[
              styles.circle1,
              {
                opacity: logoFadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.circle2,
              {
                opacity: logoFadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          />
        </View>

        {/* Skip button for authenticated users */}
        {isAuthenticated && (
          <Animated.View
            style={[
              styles.skipButtonContainer,
              {
                opacity: logoFadeAnim,
              },
            ]}
          >
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip to Dashboard</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  gifContainer: {
    alignItems: 'center',
    marginBottom: 5, // Small gap between GIF and logo
  },
  logoContentContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40, // 40px to the text below
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 250,
    height: 80,
    marginBottom: 20,
  },
  iconImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  tagline: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 1,
  },
  animatedLogo: {
    width: 250,
    height: 80,
    alignSelf: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: '8%',
    left: '50%',
    transform: [{ translateX: -50 }],
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  tapPrompt: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  backgroundDecoration: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -100,
    left: -100,
  },
  circle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    bottom: -150,
    right: -150,
  },
  skipButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default SplashScreen;