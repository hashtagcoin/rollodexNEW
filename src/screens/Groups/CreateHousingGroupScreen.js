import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import ModernImagePicker from '../../components/ModernImagePicker';
import { useUser } from '../../context/UserContext';
import { CardStyles } from '../../constants/CardStyles';
import ShareTrayModal from '../../components/common/ShareTrayModal';
import { Picker } from '@react-native-picker/picker';

const CreateHousingGroupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { listingId } = route.params || {};
  const { user } = useUser();
  
  // Create a ref for the scrollview
  const scrollViewRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listing, setListing] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Group creation form state
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [genderPreference, setGenderPreference] = useState('Any');
  const [supportNeeds, setSupportNeeds] = useState('High');
  const [moveInDate, setMoveInDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [maxMembers, setMaxMembers] = useState(4);
  const [userBio, setUserBio] = useState('');
  
  // Share modal state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  
  // Fetch housing listing data
  useEffect(() => {
    const fetchListingData = async () => {
      if (!listingId) {
        navigation.goBack();
        return;
      }
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('housing_listings')
          .select('id, title, weekly_rent, address, suburb, state, postcode, available_from, media_urls')
          .eq('id', listingId)
          .single();
          
        if (error) throw error;
        setListing(data);
      } catch (error) {
        console.error('Error fetching listing:', error);
        Alert.alert('Error', 'Failed to load property details. Please try again.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    
    fetchListingData();
  }, [listingId, navigation]);
  
  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, username, full_name, avatar_url, bio, age, support_level, comfort_traits')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        setUserProfile(data);
        
        // Set user bio from profile data for editing
        if (data && data.bio) {
          setUserBio(data.bio);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  // Handle image pick
  const handleImagePick = (imageData) => {
    setGroupAvatar(imageData.uri);
  };
  
  // Upload image to Supabase storage
  const uploadImage = async (uri) => {
    try {
      setUploading(true);
      
      // Convert image URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Generate a unique file name
      const fileName = `group_${Date.now()}.jpg`;
      const filePath = `${fileName}`;
      
      // Upload to Supabase
      const { data, error } = await supabase
        .storage
        .from('housinggroupavatar')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('housinggroupavatar')
        .getPublicUrl(filePath);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };
  
  // Handle month selection
  const handleMonthChange = (month) => {
    const newDate = new Date(moveInDate);
    newDate.setMonth(month);
    setMoveInDate(newDate);
  };
  
  // Handle day selection
  const handleDayChange = (day) => {
    const newDate = new Date(moveInDate);
    newDate.setDate(day);
    setMoveInDate(newDate);
  };
  
  // Handle year selection
  const handleYearChange = (year) => {
    const newDate = new Date(moveInDate);
    newDate.setFullYear(year);
    setMoveInDate(newDate);
  };
  
  // Toggle share modal
  const toggleShareModal = () => {
    setShareModalVisible(!shareModalVisible);
  };
  
  // Create housing group
  const createGroup = async () => {
    if (!user || !listing) {
      Alert.alert('Error', 'Missing user or property information.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Upload avatar if provided
      let avatarUrl = null;
      if (groupAvatar) {
        avatarUrl = await uploadImage(groupAvatar);
      }
      
      // Create the housing group
      const { data: groupData, error: groupError } = await supabase
        .from('housing_groups')
        .insert([{
          name: `${userProfile?.full_name || 'Group'}'s Housing Group`,
          listing_id: listingId,
          creator_id: user.id,
          max_members: maxMembers,
          current_members: 1, // Start with creator
          move_in_date: moveInDate,
          description: `A group looking for housemates with ${supportNeeds.toLowerCase()} support needs and ${genderPreference.toLowerCase()} gender preference.`,
          is_active: true,
          // Add custom fields we might need
          avatar_url: avatarUrl,
          gender_preference: genderPreference,
          support_needs: supportNeeds
        }])
        .select()
        .single();
        
      if (groupError) throw groupError;
      
      // Add creator as member
      const { error: memberError } = await supabase
        .from('housing_group_members')
        .insert([{
          group_id: groupData.id,
          user_id: user.id,
          join_date: new Date(),
          status: 'approved',
          is_admin: true,
          bio: userBio, // Use the editable bio
          support_level: userProfile?.support_level || 'Medium'
        }]);
        
      if (memberError) throw memberError;
      
      // Navigate to the housing group detail page
      Alert.alert(
        'Success',
        'Your housing group has been created!',
        [
          { 
            text: 'View Group', 
            onPress: () => navigation.navigate('HousingGroupDetailScreen', { groupId: groupData.id }) 
          }
        ]
      );
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create housing group. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !listing) {
    return (
      <View style={styles.container}>
        <AppHeader 
          title="Create Group"
          navigation={navigation} 
          canGoBack={true} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading property details...</Text>
        </View>
      </View>
    );
  }
  
  // Function to handle input focus
  const handleInputFocus = (scrollToY) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: scrollToY, animated: true });
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Create Group"
        navigation={navigation} 
        canGoBack={true} 
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Property Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This group will apply for:</Text>
            <TouchableOpacity 
              style={CardStyles.listCardContainer}
              onPress={() => {
                if (listing?.id) {
                  navigation.navigate('HousingDetail', { item: listing });
                } else {
                  Alert.alert('Error', 'Property details are not available yet.');
                }
              }}
              disabled={!listing?.id}
            >
              <View style={CardStyles.listCardInner}>
                {listing?.media_urls && listing.media_urls.length > 0 ? (
                  <View style={CardStyles.listImageContainer}>
                    <Image 
                      source={{ uri: listing.media_urls[0] }} 
                      style={CardStyles.listImage} 
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View style={CardStyles.listImageContainer}>
                    <Feather name="home" size={24} color="#bbb" />
                  </View>
                )}
                <View style={CardStyles.listContentContainer}>
                  <View>
                    <Text style={CardStyles.title}>{listing?.title || 'Property'}</Text>
                    <Text style={CardStyles.subtitle}>${listing?.weekly_rent || '0'}/wk • 2.5 km away</Text>
                    <Text style={CardStyles.subtitle}>
                      Available from {listing?.available_from ? new Date(listing.available_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'soon'}
                    </Text>
                  </View>
                  <View style={CardStyles.bottomSection}>
                    <Feather name="chevron-right" size={22} color="#666" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Bio Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Bio</Text>
            <View style={CardStyles.listCardContainer}>
              <View style={[CardStyles.listCardInner, { alignItems: 'flex-start' }]}>
                <View style={styles.avatarContainer}>
                  {userProfile?.avatar_url ? (
                    <Image 
                      source={{ uri: userProfile.avatar_url }} 
                      style={styles.userAvatar} 
                    />
                  ) : (
                    <View style={styles.userAvatarPlaceholder}>
                      <Text style={styles.userInitials}>
                        {userProfile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={CardStyles.title}>{userProfile?.full_name || 'User'}</Text>
                  <View style={styles.bioTagsContainer}>
                    <View style={styles.ageTag}>
                      <Text style={styles.bioTagText}>{userProfile?.age ? `${userProfile.age} yrs` : '30 yrs'}</Text>
                    </View>
                    <View style={styles.supportTag}>
                      <Text style={styles.bioTagText}>{userProfile?.support_level || 'High'} Support</Text>
                    </View>
                  </View>
                  <TextInput
                    style={styles.bioInput}
                    placeholder="Tell your potential housemates about yourself"
                    placeholderTextColor="#999"
                    value={userBio}
                    onChangeText={setUserBio}
                    multiline
                    numberOfLines={3}
                    onFocus={() => handleInputFocus(200)}
                  />
                </View>
              </View>
            </View>
          </View>
          
          {/* Group Avatar */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Group Avatar</Text>
            <View style={CardStyles.listCardContainer}>
              <View style={[CardStyles.listCardInner, { flexDirection: 'column', alignItems: 'center' }]}>
                <ModernImagePicker
                  onPick={handleImagePick}
                  avatar={groupAvatar}
                  loading={uploading}
                  style={styles.groupAvatarPicker}
                />
                <View style={styles.avatarTextContainer}>
                  <Feather name="camera" size={18} color="#000" style={{marginRight: 8}} />
                  <Text style={styles.groupAvatarHint}>Choose photo</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            {/* Max Members */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Maximum number of members</Text>
              <View style={styles.buttonGroup}>
                {[2, 3, 4, 5, 6].map((num) => (
                  <TouchableOpacity 
                    key={num} 
                    style={[styles.countButton, maxMembers === num && styles.countButtonActive]}
                    onPress={() => setMaxMembers(num)}
                  >
                    <Text style={[styles.countButtonText, maxMembers === num && styles.countButtonTextActive]}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Roommate Gender Preference */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Roommate gender preference</Text>
              <View style={styles.buttonGroup}>
                {['Any', 'Male', 'Female', 'Non-binary'].map((gender) => (
                  <TouchableOpacity 
                    key={gender} 
                    style={[styles.prefButton, genderPreference === gender && styles.prefButtonActive]}
                    onPress={() => setGenderPreference(gender)}
                  >
                    <Text style={[styles.prefButtonText, genderPreference === gender && styles.prefButtonTextActive]}>{gender}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Support Needs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Support needs</Text>
              <View style={styles.buttonGroup}>
                {['None', 'Low', 'Medium', 'High'].map((level) => (
                  <TouchableOpacity 
                    key={level} 
                    style={[styles.prefButton, supportNeeds === level && styles.prefButtonActive]}
                    onPress={() => setSupportNeeds(level)}
                  >
                    <Text style={[styles.prefButtonText, supportNeeds === level && styles.prefButtonTextActive]}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Move-in Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Move-in date</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text style={styles.dateButtonText}>
                  {moveInDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
                <Feather name="calendar" size={20} color="#000" />
              </TouchableOpacity>
              
              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  {/* Month Picker */}
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Month</Text>
                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                      {Array.from({length: 12}, (_, i) => {
                        const month = new Date(2000, i, 1).toLocaleString('default', { month: 'long' });
                        return (
                          <TouchableOpacity 
                            key={i} 
                            style={[styles.datePickerItem, moveInDate.getMonth() === i && styles.datePickerItemActive]}
                            onPress={() => handleMonthChange(i)}
                          >
                            <Text style={[styles.datePickerItemText, moveInDate.getMonth() === i && styles.datePickerItemTextActive]}>
                              {month}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                  
                  {/* Day Picker */}
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Day</Text>
                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                      {Array.from({length: 31}, (_, i) => (
                        <TouchableOpacity 
                          key={i} 
                          style={[styles.datePickerItem, moveInDate.getDate() === (i + 1) && styles.datePickerItemActive]}
                          onPress={() => handleDayChange(i + 1)}
                        >
                          <Text style={[styles.datePickerItemText, moveInDate.getDate() === (i + 1) && styles.datePickerItemTextActive]}>
                            {i + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  {/* Year Picker */}
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Year</Text>
                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                      {Array.from({length: 3}, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <TouchableOpacity 
                            key={i} 
                            style={[styles.datePickerItem, moveInDate.getFullYear() === year && styles.datePickerItemActive]}
                            onPress={() => handleYearChange(year)}
                          >
                            <Text style={[styles.datePickerItemText, moveInDate.getFullYear() === year && styles.datePickerItemTextActive]}>
                              {year}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
            
            {/* Invite Friends */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Invite Friends (Optional)</Text>
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={toggleShareModal}
              >
                <FontAwesome5 name="user-friends" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.shareButtonText}>Invite Friends</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Create Button */}
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={createGroup}
            disabled={loading || uploading}
          >
            {loading || uploading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create Group Listing</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Share Modal */}
      <ShareTrayModal
        visible={shareModalVisible}
        onClose={toggleShareModal}
        itemToShare={{
          item_id: listing?.id || 'temp_id',
          item_type: 'housing_group',
          item_title: `${userProfile?.full_name || 'Group'}'s Housing Group`
        }}
        highlightSharedUsers={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100, // Extra padding at the bottom for better scrolling with keyboard
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  customTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#222',
  },
  avatarContainer: {
    marginRight: 16,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bioTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  ageTag: {
    backgroundColor: '#FFF3E0', // Light orange background
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  comfortTag: {
    backgroundColor: '#E3F2FD', // Light blue background
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#64B5F6',
  },
  supportTag: {
    backgroundColor: '#E8F5E9', // Light green background
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  bioTagText: {
    fontSize: 14, // 20% larger than before
    color: '#333', // Dark text
    fontWeight: '600',
  },
  bioInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginTop: 8,
    minHeight: 150, // Increased from 120 to 150
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  groupAvatarPicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    alignSelf: 'center',
    borderWidth: 1, // Reduced from 3 to 1
    borderColor: '#555555',
  },
  avatarTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  groupAvatarHint: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  prefButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  prefButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  prefButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  prefButtonTextActive: {
    color: 'white',
  },
  countButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  countButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  countButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  countButtonTextActive: {
    color: 'white',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#444',
  },
  datePickerContainer: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    height: 200,
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
  },
  datePickerScroll: {
    height: 150,
  },
  datePickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginBottom: 2,
  },
  datePickerItemActive: {
    backgroundColor: COLORS.primary + '20',
  },
  datePickerItemText: {
    fontSize: 16,
    color: '#444',
  },
  datePickerItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateHousingGroupScreen;
