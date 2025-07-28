import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const RoleSelectionScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const participantScale = useRef(new Animated.Value(1)).current;
  const providerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    console.log('selectedRole state changed to:', selectedRole);
  }, [selectedRole]);

  const handleRoleSelect = (role) => {
    console.log('Role selected:', role);
    console.log('Previous selectedRole:', selectedRole);
    setSelectedRole(role);
    console.log('Setting selectedRole to:', role);
    const scaleAnim = role === 'participant' ? participantScale : providerScale;
    
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate after animation completes
      console.log('Animation complete, navigating...');
      setTimeout(() => {
        if (role === 'participant') {
          console.log('Navigating to ParticipantOnboarding');
          navigation.navigate('ParticipantOnboarding');
        } else if (role === 'provider') {
          console.log('Navigating to ProviderOnboarding');
          navigation.navigate('ProviderOnboarding');
        }
      }, 300);
    });
  };

  const handleContinue = () => {
    console.log('Continue pressed with role:', selectedRole);
    if (selectedRole === 'participant') {
      console.log('Navigating to ParticipantOnboarding');
      navigation.navigate('ParticipantOnboarding');
    } else if (selectedRole === 'provider') {
      console.log('Navigating to ProviderOnboarding');
      navigation.navigate('ProviderOnboarding');
    }
  };

  const roles = [
    {
      id: 'participant',
      title: 'I need support',
      subtitle: 'Find services & connect with others',
      icon: 'hand-heart',
      iconType: 'MaterialCommunityIcons',
      gradient: ['#1E90FF', '#4169E1'],
      benefits: [
        'Discover NDIS services tailored to you',
        'Find accessible housing options',
        'Join supportive communities',
        'Track your NDIS budget easily',
      ],
    },
    {
      id: 'provider',
      title: 'I provide support',
      subtitle: 'Offer services & grow your business',
      icon: 'user-shield',
      iconType: 'FontAwesome5',
      gradient: ['#FF6347', '#FF7F50'],
      benefits: [
        'Connect with participants who need you',
        'Manage bookings efficiently',
        'Build your professional profile',
        'Grow your NDIS business',
      ],
    },
  ];

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F0F4FF', '#E0E7FF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>Let's get you started</Text>
            <Text style={styles.subtitle}>
              Choose the option that best describes you.{'\n'}
              This helps us personalize your experience.
            </Text>
          </Animated.View>

          <View style={styles.rolesContainer}>
            {roles.map((role, index) => (
              <Animated.View
                key={role.id}
                style={[
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50 * (index + 1), 0],
                        }),
                      },
                      {
                        scale: role.id === 'participant' ? participantScale : providerScale,
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === role.id && styles.selectedCard,
                  ]}
                  onPress={() => handleRoleSelect(role.id)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={selectedRole === role.id ? role.gradient : ['#FFFFFF', '#FFFFFF']}
                    style={styles.cardGradient}
                  >
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: selectedRole === role.id ? 'rgba(255,255,255,0.2)' : `${role.gradient[0]}20` },
                        ]}
                      >
                        {role.iconType === 'MaterialCommunityIcons' ? (
                          <MaterialCommunityIcons
                            name={role.icon}
                            size={32}
                            color={selectedRole === role.id ? '#FFFFFF' : role.gradient[0]}
                          />
                        ) : (
                          <FontAwesome5
                            name={role.icon}
                            size={28}
                            color={selectedRole === role.id ? '#FFFFFF' : role.gradient[0]}
                          />
                        )}
                      </View>
                      <View style={styles.titleContainer}>
                        <Text
                          style={[
                            styles.roleTitle,
                            selectedRole === role.id && styles.selectedText,
                          ]}
                        >
                          {role.title}
                        </Text>
                        <Text
                          style={[
                            styles.roleSubtitle,
                            selectedRole === role.id && styles.selectedSubtext,
                          ]}
                        >
                          {role.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.benefitsContainer}>
                      {role.benefits.map((benefit, idx) => (
                        <View key={idx} style={styles.benefitItem}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={selectedRole === role.id ? '#FFFFFF' : '#10B981'}
                          />
                          <Text
                            style={[
                              styles.benefitText,
                              selectedRole === role.id && styles.selectedBenefitText,
                            ]}
                          >
                            {benefit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          <Animated.View
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={{ color: 'red', fontSize: 18, textAlign: 'center', marginBottom: 10 }}>
              Selected: {selectedRole || 'none'}
            </Text>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !selectedRole && styles.disabledButton,
              ]}
              onPress={() => {
                console.log('Continue button pressed');
                handleContinue();
              }}
              disabled={!selectedRole}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedRole ? ['#1E90FF', '#4A6FA5'] : ['#E5E7EB', '#E5E7EB']}
                style={styles.buttonGradient}
              >
                <Text
                  style={[
                    styles.continueButtonText,
                    !selectedRole && styles.disabledButtonText,
                  ]}
                >
                  Continue
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={selectedRole ? '#FFFFFF' : '#9CA3AF'}
                />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.privacyText}>
              We'll never share your information without your permission
            </Text>
          </Animated.View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginTop: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  rolesContainer: {
    marginBottom: 32,
  },
  roleCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  selectedCard: {
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  selectedSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  benefitsContainer: {
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  selectedBenefitText: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  continueButton: {
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  privacyText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 20,
  },
});

export default RoleSelectionScreen;