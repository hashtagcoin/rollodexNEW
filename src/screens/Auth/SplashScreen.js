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
  const [gifPlayComplete, setGifPlayComplete] = useState(false);
  const [minDisplayTimeReached, setMinDisplayTimeReached] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;
  const gifFadeAnim = useRef(new Animated.Value(1)).current;

  const taglineText = "Connect. Explore. Thrive.";

  useEffect(() => {
    // Show GIF immediately - no delay to prevent slow loading
    setShowGif(true);
    
    // Set minimum display time (3 seconds)
    setTimeout(() => {
      setMinDisplayTimeReached(true);
    }, 3000);

    // Animation sequence:
    // 1. GIF appears instantly and starts playing immediately
    // 2. GIF plays for 2 seconds then stops
    // 3. 2-second delay after GIF stops
    // 4. Logo appears and starts pulsing
    // 5. Text fades in 0.5 seconds after logo
    
    // GIF stops playing after 2 seconds
    setTimeout(() => {
      setGifPlayComplete(true);
    }, 2000); // GIF plays for 2 seconds then stops
    
    // Show logo 2 seconds after GIF stops (2s + 2s = 4s)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
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
    }, 4000); // 2 seconds after GIF stops (2000 + 2000)
    
    // Show text 0.5 seconds after logo appears (4s + 0.5s = 4.5s)
    setTimeout(() => {
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 1500, // 1.5 second fade-in for text
        useNativeDriver: true,
      }).start(() => {
        setAnimationComplete(true);
      });
    }, 4500); // 0.5 seconds after logo appears (4000 + 500)

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
        {/* Main content that includes GIF, logo and text */}
        <Animated.View
          style={[
            styles.centerContent,
            {
              opacity: fadeAnim,
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
          {/* Animated GIF Logo that plays once then stops */}
          {showGif && (
            <Image 
              key={gifPlayComplete ? "static-gif" : "animated-gif"}
              source={require('../../assets/images/Animation.gif')}
              style={[
                styles.animatedLogo,
                {
                  marginLeft: 20, // 20px to the right
                  marginBottom: 20, // Space before logo
                }
              ]}
              contentFit="contain"
              // Use expo-image for better GIF control
              cachePolicy="memory-disk"
              transition={200}
              onLoad={() => {
                console.log('GIF loaded and will continue playing');
              }}
            />
          )}
        </Animated.View>

        {/* Logo and text content */}
        <Animated.View
          style={[
            styles.centerContent,
            {
              opacity: fadeAnim,
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

        {animationComplete && (
          <Animated.View
            style={[
              styles.bottomContainer,
              {
                opacity: fadeAnim,
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
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.circle2,
              {
                opacity: fadeAnim,
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
                opacity: fadeAnim,
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
  centerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    marginTop: 20, // Space from the GIF above
    marginBottom: 40, // Space to the text below
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
    width: 200,
    height: 60,
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