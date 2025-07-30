import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const ParticipantOnboarding = ({ navigation, route }) => {
  console.log('ParticipantOnboarding screen rendered');
  const { isAuthenticated, userRole } = route.params || {};
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    preferredName: '',
    mainGoals: [],
    supportNeeds: [],
    accessibilityNeeds: [],
    comfortPreferences: [],
    interests: [],
    communicationPreferences: [],
  });
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.25)).current;

  const totalSteps = 4;

  const handleSkip = () => {
    // Navigate directly to the main app
    navigation.navigate('MainApp');
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: currentStep / totalSteps,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      navigation.navigate('AccountSetup', { userType: 'participant', formData });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };


  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const toggleArrayItem = (field, item) => {
    const array = formData[field];
    if (array.includes(item)) {
      updateFormData(field, array.filter(i => i !== item));
    } else {
      updateFormData(field, [...array, item]);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <Step2 formData={formData} toggleArrayItem={toggleArrayItem} />;
      case 3:
        return <Step3 formData={formData} toggleArrayItem={toggleArrayItem} />;
      case 4:
        return <Step4 formData={formData} toggleArrayItem={toggleArrayItem} />;
      default:
        return null;
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
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.stepIndicator}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>

          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {renderStep()}
          </Animated.View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1E90FF', '#4A6FA5']}
                style={styles.buttonGradient}
              >
                <Text style={styles.continueButtonText}>
                  {currentStep === totalSteps ? "Let's get started!" : 'Continue'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const Step1 = ({ formData, updateFormData }) => {
  const goals = [
    { id: 'independence', label: 'Live more independently', icon: 'home-heart', color: '#EC4899' },
    { id: 'social', label: 'Make new friends', icon: 'account-group', color: '#3B82F6' },
    { id: 'skills', label: 'Learn new skills', icon: 'school', color: '#10B981' },
    { id: 'work', label: 'Find work opportunities', icon: 'briefcase', color: '#F59E0B' },
    { id: 'health', label: 'Improve my health', icon: 'heart-pulse', color: '#EF4444' },
    { id: 'fun', label: 'Have more fun', icon: 'party-popper', color: '#8B5CF6' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.stepContainer}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome! Let's get to know you</Text>
        <Text style={styles.welcomeSubtitle}>
          First, what should we call you?
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>First name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your first name"
          value={formData.firstName}
          onChangeText={(text) => updateFormData('firstName', text)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Preferred name (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="What would you like us to call you?"
          value={formData.preferredName}
          onChangeText={(text) => updateFormData('preferredName', text)}
          autoCapitalize="words"
        />
        <Text style={styles.inputHint}>
          This could be a nickname or how you'd like to be addressed
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What brings you to Rollodex?</Text>
        <Text style={styles.sectionSubtitle}>Select all that apply</Text>
        
        <View style={styles.optionsGrid}>
          {goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.optionCard,
                formData.mainGoals.includes(goal.id) && styles.selectedOption,
              ]}
              onPress={() => updateFormData('mainGoals', 
                formData.mainGoals.includes(goal.id) 
                  ? formData.mainGoals.filter(g => g !== goal.id)
                  : [...formData.mainGoals, goal.id]
              )}
            >
              <View style={[styles.optionIcon, { backgroundColor: `${goal.color}20` }]}>
                <MaterialCommunityIcons name={goal.icon} size={24} color={goal.color} />
              </View>
              <Text style={styles.optionText}>{goal.label}</Text>
              {formData.mainGoals.includes(goal.id) && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const Step2 = ({ formData, toggleArrayItem }) => {
  const supportTypes = [
    { id: 'daily', label: 'Daily living support', icon: 'home-assistant', description: 'Help with everyday tasks' },
    { id: 'therapy', label: 'Therapy services', icon: 'heart-plus', description: 'Speech, OT, physio, psychology' },
    { id: 'social', label: 'Social activities', icon: 'account-group-outline', description: 'Groups, events, outings' },
    { id: 'respite', label: 'Respite care', icon: 'coffee', description: 'Short-term relief for carers' },
    { id: 'transport', label: 'Transport assistance', icon: 'car', description: 'Getting around safely' },
    { id: 'housing', label: 'Housing support', icon: 'home-search', description: 'Finding the right home' },
    { id: 'employment', label: 'Employment support', icon: 'briefcase-check', description: 'Job seeking and workplace help' },
    { id: 'equipment', label: 'Equipment & technology', icon: 'devices', description: 'Assistive devices and aids' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.stepContainer}>
      <View style={styles.welcomeSection}>
        <Text style={styles.stepTitle}>What kind of support are you looking for?</Text>
        <Text style={styles.stepSubtitle}>
          This helps us show you the most relevant services
        </Text>
      </View>

      <View style={styles.supportList}>
        {supportTypes.map((support) => (
          <TouchableOpacity
            key={support.id}
            style={[
              styles.supportCard,
              formData.supportNeeds.includes(support.id) && styles.selectedSupportCard,
            ]}
            onPress={() => toggleArrayItem('supportNeeds', support.id)}
          >
            <View style={styles.supportCardContent}>
              <View style={[
                styles.supportIcon,
                formData.supportNeeds.includes(support.id) && styles.selectedSupportIcon,
              ]}>
                <MaterialCommunityIcons 
                  name={support.icon} 
                  size={28} 
                  color={formData.supportNeeds.includes(support.id) ? '#FFFFFF' : '#7C3AED'} 
                />
              </View>
              <View style={styles.supportTextContainer}>
                <Text style={[
                  styles.supportTitle,
                  formData.supportNeeds.includes(support.id) && styles.selectedSupportTitle,
                ]}>
                  {support.label}
                </Text>
                <Text style={[
                  styles.supportDescription,
                  formData.supportNeeds.includes(support.id) && styles.selectedSupportDescription,
                ]}>
                  {support.description}
                </Text>
              </View>
              {formData.supportNeeds.includes(support.id) && (
                <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.encouragementBox}>
        <MaterialCommunityIcons name="information" size={20} color="#7C3AED" />
        <Text style={styles.encouragementText}>
          Don't worry if you're not sure - you can always update these later!
        </Text>
      </View>
    </ScrollView>
  );
};

const Step3 = ({ formData, toggleArrayItem }) => {
  const accessibilityOptions = [
    { id: 'wheelchair', label: 'Wheelchair accessible', icon: 'wheelchair-accessibility' },
    { id: 'parking', label: 'Accessible parking', icon: 'car-brake-parking' },
    { id: 'quiet', label: 'Quiet spaces', icon: 'volume-off' },
    { id: 'visual', label: 'Visual aids', icon: 'eye-check' },
    { id: 'hearing', label: 'Hearing support', icon: 'ear-hearing' },
    { id: 'easy-read', label: 'Easy read materials', icon: 'file-document-edit' },
  ];

  const comfortOptions = [
    { id: 'animals', label: 'Love animals', icon: 'dog' },
    { id: 'outdoors', label: 'Enjoy outdoors', icon: 'tree' },
    { id: 'small-groups', label: 'Prefer small groups', icon: 'account-group-outline' },
    { id: 'one-on-one', label: 'One-on-one support', icon: 'account-heart' },
    { id: 'routine', label: 'Like routine', icon: 'calendar-check' },
    { id: 'flexible', label: 'Flexible timing', icon: 'clock-outline' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.stepContainer}>
      <View style={styles.welcomeSection}>
        <Text style={styles.stepTitle}>Let's make sure you're comfortable</Text>
        <Text style={styles.stepSubtitle}>
          Tell us about your accessibility needs and preferences
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accessibility needs</Text>
        <View style={styles.chipContainer}>
          {accessibilityOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.chip,
                formData.accessibilityNeeds.includes(option.id) && styles.selectedChip,
              ]}
              onPress={() => toggleArrayItem('accessibilityNeeds', option.id)}
            >
              <MaterialCommunityIcons 
                name={option.icon} 
                size={18} 
                color={formData.accessibilityNeeds.includes(option.id) ? '#FFFFFF' : '#6B7280'} 
              />
              <Text style={[
                styles.chipText,
                formData.accessibilityNeeds.includes(option.id) && styles.selectedChipText,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What makes you comfortable?</Text>
        <View style={styles.chipContainer}>
          {comfortOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.chip,
                formData.comfortPreferences.includes(option.id) && styles.selectedChip,
              ]}
              onPress={() => toggleArrayItem('comfortPreferences', option.id)}
            >
              <MaterialCommunityIcons 
                name={option.icon} 
                size={18} 
                color={formData.comfortPreferences.includes(option.id) ? '#FFFFFF' : '#6B7280'} 
              />
              <Text style={[
                styles.chipText,
                formData.comfortPreferences.includes(option.id) && styles.selectedChipText,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.privacyNote}>
        <Ionicons name="lock-closed" size={16} color="#7C3AED" />
        <Text style={styles.privacyText}>
          Your preferences are private and only shared with providers you choose
        </Text>
      </View>
    </ScrollView>
  );
};

const Step4 = ({ formData, toggleArrayItem }) => {
  const interests = [
    { id: 'sports', label: 'Sports & Fitness', icon: 'basketball', color: '#EF4444' },
    { id: 'arts', label: 'Arts & Crafts', icon: 'palette', color: '#8B5CF6' },
    { id: 'music', label: 'Music', icon: 'music', color: '#3B82F6' },
    { id: 'cooking', label: 'Cooking', icon: 'chef-hat', color: '#F59E0B' },
    { id: 'gaming', label: 'Gaming', icon: 'gamepad-variant', color: '#10B981' },
    { id: 'reading', label: 'Reading', icon: 'book-open-variant', color: '#EC4899' },
    { id: 'nature', label: 'Nature', icon: 'flower', color: '#10B981' },
    { id: 'technology', label: 'Technology', icon: 'laptop', color: '#6366F1' },
    { id: 'volunteering', label: 'Volunteering', icon: 'hand-heart', color: '#EC4899' },
    { id: 'travel', label: 'Travel', icon: 'airplane', color: '#3B82F6' },
    { id: 'movies', label: 'Movies & TV', icon: 'movie-open', color: '#8B5CF6' },
    { id: 'social', label: 'Social Events', icon: 'party-popper', color: '#F59E0B' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.stepContainer}>
      <View style={styles.welcomeSection}>
        <Text style={styles.stepTitle}>What are you interested in?</Text>
        <Text style={styles.stepSubtitle}>
          We'll help you find groups and activities you'll love
        </Text>
      </View>

      <View style={styles.interestsGrid}>
        {interests.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[
              styles.interestCard,
              formData.interests.includes(interest.id) && styles.selectedInterestCard,
            ]}
            onPress={() => toggleArrayItem('interests', interest.id)}
          >
            <View style={[
              styles.interestIcon,
              { backgroundColor: `${interest.color}20` },
              formData.interests.includes(interest.id) && { backgroundColor: interest.color },
            ]}>
              <MaterialCommunityIcons 
                name={interest.icon} 
                size={32} 
                color={formData.interests.includes(interest.id) ? '#FFFFFF' : interest.color} 
              />
            </View>
            <Text style={[
              styles.interestLabel,
              formData.interests.includes(interest.id) && styles.selectedInterestLabel,
            ]}>
              {interest.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.finalMessage}>
        <View style={styles.celebrationIcon}>
          <MaterialCommunityIcons name="party-popper" size={32} color="#7C3AED" />
        </View>
        <Text style={styles.finalMessageTitle}>Almost there!</Text>
        <Text style={styles.finalMessageText}>
          You're doing great! Just tap continue to start exploring everything Rollodex has to offer.
        </Text>
      </View>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
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
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E90FF',
    borderRadius: 3,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  continueButton: {
    width: '100%',
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
  stepContainer: {
    flex: 1,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  optionCard: {
    width: '50%',
    padding: 8,
  },
  selectedOption: {
    transform: [{ scale: 0.98 }],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportList: {
    marginBottom: 24,
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedSupportCard: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  supportCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedSupportIcon: {
    backgroundColor: '#7C3AED',
  },
  supportTextContainer: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedSupportTitle: {
    color: '#5B21B6',
  },
  supportDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedSupportDescription: {
    color: '#6D28D9',
  },
  encouragementBox: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  encouragementText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#5B21B6',
    lineHeight: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedChip: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  chipText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#374151',
  },
  selectedChipText: {
    color: '#FFFFFF',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  privacyText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#5B21B6',
    lineHeight: 18,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  interestCard: {
    width: '33.33%',
    padding: 6,
    alignItems: 'center',
  },
  selectedInterestCard: {
    transform: [{ scale: 0.95 }],
  },
  interestIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  interestLabel: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  selectedInterestLabel: {
    fontWeight: '600',
  },
  finalMessage: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  celebrationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  finalMessageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  finalMessageText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});

export default ParticipantOnboarding;