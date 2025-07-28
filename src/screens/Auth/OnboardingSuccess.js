import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const OnboardingSuccess = ({ navigation, route }) => {
  const { userType } = route.params || { userType: 'participant' };
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

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
                  { scale: pulseAnim },
                ],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <Image 
                source={require('../../assets/images/placeholder.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
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
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{content.primaryButton}</Text>
              <Ionicons name="arrow-forward" size={20} color={content.gradient[0]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.7}
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
    marginBottom: 32,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 32,
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
});

export default OnboardingSuccess;