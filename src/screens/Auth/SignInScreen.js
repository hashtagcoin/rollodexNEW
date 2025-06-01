import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SignInScreen = () => {
  const navigation = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState('participant'); // Default to participant
  
  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        // User is already logged in, redirect to dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }]
        });
      }
    };
    
    checkSession();
  }, [navigation]);
  
  // Handle login with email and password
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Get user profile to determine role
      if (data?.user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        if (!profileError && profileData) {
          // Set provider mode based on role
          const isProvider = profileData.role === 'provider';
          await AsyncStorage.setItem('provider_mode', JSON.stringify(isProvider));
        }
      }
      
      // Navigate to Dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }]
      });
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle signup with email and password
  const handleSignup = async () => {
    if (!email || !password || !username || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingUser) {
        Alert.alert('Error', 'Username is already taken. Please choose another one.');
        setLoading(false);
        return;
      }
      
      // We'll skip the problematic email check and rely on Supabase auth signup
      // to return the proper error if the email already exists
      
      // Create new user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            role: userType, // Store user type in auth metadata
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
      
      // Create user profile with upsert to handle potential duplicates
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: data.user.id,
          username,
          full_name: fullName,
          email,
          role: userType, // Use the selected user type as role
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      if (profileError) throw profileError;
      
      // Get the user that was just created
      const { data: checkUser } = await supabase.auth.getUser();
      
      if (checkUser?.user) {
        // Success! Directly navigate to the appropriate dashboard
        Alert.alert(
          'Registration Successful', 
          'Your account has been created!',
          [{ text: 'Continue', onPress: () => {
            // Navigate to Dashboard based on role
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp' }]
            });
          }}]
        );
      } else {
        // If for some reason the user wasn't properly created
        Alert.alert(
          'Registration Initiated', 
          'Account creation has been initiated. Please check your email to confirm your account and then log in.',
          [{ text: 'OK', onPress: () => setIsLogin(true) }]
        );
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Registration Failed', error.message || 'Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleForm = () => {
    setIsLogin(!isLogin);
    // Clear form fields when switching between login and signup
    setEmail('');
    setPassword('');
    setUsername('');
    setFullName('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logoicon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Image
            source={require('../../assets/images/rollodex-title.png')}
            style={styles.titleLogo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Connect. Explore. Thrive.</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Text>
          
          {!isLogin && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={22} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
              
              <Text style={styles.sectionLabel}>I am a:</Text>
              <View style={styles.userTypeContainer}>
                <TouchableOpacity 
                  style={[styles.userTypeButton, userType === 'participant' && styles.userTypeButtonActive]}
                  onPress={() => setUserType('participant')}
                >
                  <Ionicons 
                    name="person" 
                    size={24} 
                    color={userType === 'participant' ? COLORS.primary : '#888'} 
                    style={styles.userTypeIcon}
                  />
                  <View style={styles.userTypeTextContainer}>
                    <Text style={[styles.userTypeLabel, userType === 'participant' && styles.userTypeLabelActive]}>Participant</Text>
                    <Text style={styles.userTypeDescription}>Looking for services and support</Text>
                  </View>
                  {userType === 'participant' && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.userTypeButton, userType === 'provider' && styles.userTypeButtonActive]}
                  onPress={() => setUserType('provider')}
                >
                  <Ionicons 
                    name="briefcase-outline" 
                    size={24} 
                    color={userType === 'provider' ? COLORS.primary : '#888'} 
                    style={styles.userTypeIcon}
                  />
                  <View style={styles.userTypeTextContainer}>
                    <Text style={[styles.userTypeLabel, userType === 'provider' && styles.userTypeLabelActive]}>Provider</Text>
                    <Text style={styles.userTypeDescription}>Offering services and support</Text>
                  </View>
                  {userType === 'provider' && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color="#999" 
              />
            </TouchableOpacity>
          </View>
          
          {isLogin && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isLogin ? handleLogin : handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={toggleForm}>
              <Text style={styles.toggleLink}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  titleLogo: {
    width: 200,
    height: 60,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 12,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonDisabled: {
    backgroundColor: COLORS.primary + '80', // 50% opacity
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
  },
  toggleLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  userTypeContainer: {
    marginBottom: 20,
  },
  userTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  userTypeButtonActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  userTypeIcon: {
    marginRight: 15,
  },
  userTypeTextContainer: {
    flex: 1,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userTypeLabelActive: {
    color: COLORS.primary,
  },
  userTypeDescription: {
    fontSize: 12,
    color: '#777',
  },
  checkIcon: {
    marginLeft: 5,
  },
});

export default SignInScreen;
