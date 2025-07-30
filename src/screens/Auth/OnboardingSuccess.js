import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const OnboardingSuccess = ({ navigation, route }) => {
  const { userType, onboardingData, profileData } = route.params || { userType: 'participant' };
  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate elements
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Start button pulse animation for explore services button
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulseAnim, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const handleContinue = async () => {
    setLoading(true);
    
    try {
      // Check if user is authenticated and has a profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch the user profile to ensure it's loaded
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          // Save profile to AsyncStorage for immediate access
          await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
        } else if (profileData) {
          // Use the profile data passed from AccountSetup
          await AsyncStorage.setItem('user_profile', JSON.stringify(profileData));
        }
      }
      
      // Navigate to the appropriate dashboard
      if (userType === 'provider') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProviderStack' }]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }]
        });
      }
    } catch (error) {
      console.error('Error navigating to dashboard:', error);
      // Navigate anyway
      if (userType === 'provider') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProviderStack' }]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }]
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkipProfile = async () => {
    setLoading(true);
    
    try {
      // Check if user is authenticated and has a profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch the user profile to ensure it's loaded
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          // Save profile to AsyncStorage for immediate access
          await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
        } else if (profileData) {
          // Use the profile data passed from AccountSetup
          await AsyncStorage.setItem('user_profile', JSON.stringify(profileData));
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    
    // Navigate to dashboard
    if (userType === 'provider') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ProviderStack' }]
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }]
      });
    }
    
    setLoading(false);
  };

  const getSuccessContent = () => {
    if (userType === 'participant') {
      return {
        title: "Welcome to your community!",
        subtitle: "Your journey to independence starts now",
        features: [
          {
            icon: 'calendar-check',
            title: 'Book services',
            description: 'Find and schedule support that fits your needs',
          },
          {
            icon: 'home-search',
            title: 'Explore housing',
            description: 'Discover accessible homes in your area',
          },
          {
            icon: 'account-group',
            title: 'Join groups',
            description: 'Connect with others who share your interests',
          },
        ],
        primaryButton: "Explore services",
        secondaryButton: "Complete my profile",
        gradient: ['#1E90FF', '#4A6FA5', '#6495ED'],
      };
    } else {
      return {
        title: "Welcome to Rollodex!",
        subtitle: "Start making a difference today",
        features: [
          {
            icon: 'account-star',
            title: 'Get discovered',
            description: 'Participants can now find your services',
          },
          {
            icon: 'calendar-clock',
            title: 'Manage bookings',
            description: 'Accept requests and schedule appointments',
          },
          {
            icon: 'chart-line',
            title: 'Grow your impact',
            description: 'Track your performance and expand your reach',
          },
        ],
        primaryButton: "View my dashboard",
        secondaryButton: "Edit my services",
        gradient: ['#FF6347', '#FF7F50', '#FFA07A'],
      };
    }
  };

  const content = getSuccessContent();

  return (
    <LinearGradient
      colors={content.gradient}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.successIcon,
              {
                transform: [
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <Image 
              source={require('../../assets/images/placeholder.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {content.features.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateX: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-50, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons name={feature.icon} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [{ scale: buttonPulseAnim }],
              }}
            >
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleContinue}
                activeOpacity={0.8}
                disabled={loading}
              >
              {loading ? (
                <ActivityIndicator color={content.gradient[0]} size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>{content.primaryButton}</Text>
                  <Ionicons name="arrow-forward" size={20} color={content.gradient[0]} />
                </>
              )}
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={[styles.secondaryButton, loading && styles.disabledButton]}
              onPress={handleSkipProfile}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>{content.secondaryButton}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.encouragement,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <MaterialCommunityIcons name="star" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.encouragementText}>
              You're amazing! Thanks for joining our community
            </Text>
            <MaterialCommunityIcons name="star" size={20} color="rgba(255,255,255,0.8)" />
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textDecorationLine: 'underline',
  },
  encouragement: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  encouragementText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 8,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default OnboardingSuccess;