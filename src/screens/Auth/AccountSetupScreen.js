import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/theme';

const AccountSetupScreen = ({ navigation, route }) => {
  console.log('[AccountSetupScreen] Screen rendered');
  console.log('[AccountSetupScreen] Route params:', route.params);
  const { userType, formData } = route.params || {};
  console.log('[AccountSetupScreen] UserType:', userType);
  console.log('[AccountSetupScreen] FormData received:', formData);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Helper function to check if username exists
  const checkUsernameExists = async (username) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is what we want
        throw error;
      }
      
      return !!data; // Returns true if username exists, false if not
    } catch (error) {
      if (error.code === 'PGRST116') {
        return false; // Username doesn't exist
      }
      throw error;
    }
  };

  // Helper function to generate a unique username
  const generateUniqueUsername = async (baseUsername) => {
    let username = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, ''); // Clean username
    let counter = 0;
    let isUnique = false;
    
    // If username is too short, use email prefix
    if (username.length < 3) {
      username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    
    let candidateUsername = username;
    
    while (!isUnique) {
      const exists = await checkUsernameExists(candidateUsername);
      if (!exists) {
        isUnique = true;
        username = candidateUsername;
      } else {
        counter++;
        candidateUsername = `${username}${counter}`;
      }
      
      // Safety check to prevent infinite loops
      if (counter > 999) {
        candidateUsername = `${username}${Date.now()}`;
        break;
      }
    }
    
    return candidateUsername;
  };

  const handleCreateAccount = async () => {
    // Validation
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Generate a base username from the form data or email
      const baseUsername = formData?.preferredName || formData?.firstName || email.split('@')[0];
      const fullName = formData?.firstName || formData?.preferredName || baseUsername;
      
      // Generate a unique username
      const username = await generateUniqueUsername(baseUsername);
      
      console.log('[AccountSetupScreen] Generating user data:');
      console.log('[AccountSetupScreen] - Username:', username);
      console.log('[AccountSetupScreen] - Full name:', fullName);
      console.log('[AccountSetupScreen] - First name from form:', formData?.firstName);
      console.log('[AccountSetupScreen] - Preferred name from form:', formData?.preferredName);

      // Create new user with Supabase Auth
      console.log('[AccountSetupScreen] Creating auth user with metadata:', {
        username,
        full_name: fullName,
        role: userType
      });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            role: userType,
          },
        },
      });

      if (error) throw error;

      if (!data?.user?.id) {
        throw new Error('User creation failed - no user ID returned');
      }

      // Set the initial provider mode preference
      const isProvider = userType === 'provider';
      await AsyncStorage.setItem('provider_mode', JSON.stringify(isProvider));

      // Wait a brief moment to ensure auth is fully processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create user profile with onboarding data mapped to appropriate columns
      const profileData = {
        id: data.user.id,
        username,
        full_name: fullName,
        email,
        role: userType,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('[AccountSetupScreen] Initial profile data before mapping:', profileData);

      // Map onboarding data to appropriate columns if available
      if (formData) {
        // For participants
        if (userType === 'participant' && formData) {
          if (formData.mainGoals) profileData.preferred_categories = formData.mainGoals;
          if (formData.supportNeeds) profileData.support_level = formData.supportNeeds[0] || 'moderate';
          if (formData.accessibilityNeeds) profileData.accessibility_preferences = { needs: formData.accessibilityNeeds };
          if (formData.comfortPreferences) profileData.comfort_traits = formData.comfortPreferences;
          if (formData.interests) profileData.preferred_service_formats = formData.interests;
        }
        // For providers
        if (userType === 'provider' && formData) {
          if (formData.contactName) {
            profileData.full_name = formData.contactName;
          }
          // Store basic provider preferences in user_profiles
          const providerPreferences = {
            providerType: formData.providerType || null,
            ndisRegistered: formData.ndisRegistered || false,
            registrationNumber: formData.registrationNumber || null,
            autoConfirm: false,
            defaultView: 'appointments',
            notifications: true
          };
          profileData.provider_dashboard_preferences = providerPreferences;
        }
      }

      console.log('[AccountSetupScreen] Saving profile to Supabase with data:', profileData);
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) {
        console.error('[AccountSetupScreen] Profile save error:', profileError);
        
        // Handle specific duplicate username error
        if (profileError.code === '23505' && profileError.message.includes('user_profiles_username_key')) {
          Alert.alert(
            'Username Already Taken',
            `The username "${username}" is already taken. Please try again.`,
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
        
        throw profileError;
      }
      
      console.log('[AccountSetupScreen] Profile saved successfully to Supabase');

      // Create service_providers record for providers
      if (userType === 'provider' && formData) {
        console.log('[AccountSetupScreen] Creating service_providers record for provider');
        
        const serviceProviderData = {
          user_id: data.user.id,
          business_name: formData.businessName || 'Unnamed Business',
          business_description: formData.businessDescription || null,
          service_categories: formData.serviceTypes || [],
          service_formats: formData.interests || [],
          service_area: formData.serviceAreas ? formData.serviceAreas.join(', ') : null,
          credentials: formData.specializations || [],
          verified: false,
          dashboard_preferences: {
            autoConfirm: false,
            defaultView: 'appointments',
            notifications: true
          }
        };
        
        console.log('[AccountSetupScreen] Service provider data:', serviceProviderData);
        
        const { error: providerError } = await supabase
          .from('service_providers')
          .insert(serviceProviderData);
        
        if (providerError) {
          console.error('[AccountSetupScreen] Service provider creation error:', providerError);
          // Don't throw here - profile is already created, just log the error
          Alert.alert(
            'Warning',
            'Your account was created but there was an issue setting up your provider profile. You can complete this later in settings.',
            [{ text: 'OK' }]
          );
        } else {
          console.log('[AccountSetupScreen] Service provider record created successfully');
        }
      }

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Save profile to AsyncStorage immediately for quick access
      console.log('[AccountSetupScreen] Saving profile to AsyncStorage cache:', profileData);
      await AsyncStorage.setItem('user_profile', JSON.stringify(profileData));
      
      // Also set a flag to indicate this is a new user
      await AsyncStorage.setItem('is_new_user', 'true');
      console.log('[AccountSetupScreen] Set new user flag in AsyncStorage');

      // Navigate to success screen with profile data
      navigation.navigate('OnboardingSuccess', { 
        userType, 
        profileData 
      });

    } catch (error) {
      console.error('Account creation error:', error);
      if (error.message?.includes('already registered')) {
        Alert.alert('Error', 'This email is already registered. Please use a different email or sign in.');
      } else {
        Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F0F4FF', '#E0E7FF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Create Your Account</Text>
                <Text style={styles.subtitle}>
                  One last step! Set up your login details to save your progress and access all features.
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Create a password"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password-new"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={22}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hint}>Must be at least 6 characters</Text>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your password"
                      placeholderTextColor="#999"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="password-new"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.passwordToggle}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={22}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Your account includes:</Text>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Save your preferences and progress</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Access your data from any device</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Connect with providers and services</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.createButton, loading && styles.disabledButton]}
                onPress={handleCreateAccount}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#1E90FF', '#4A6FA5']}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Create Account & Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.privacyText}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
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
  content: {
    flex: 1,
    marginTop: 100,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
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
  formContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 55,
    color: '#333',
    fontSize: 16,
  },
  passwordToggle: {
    padding: 10,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 4,
  },
  benefitsContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  createButton: {
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
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  privacyText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default AccountSetupScreen;