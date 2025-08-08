import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS } from '../../constants/theme';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';
import { format } from 'date-fns';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VideoScreen = ({ navigation }) => {
  const route = useRoute();
  const { bookingId } = route.params || {};
  const { profile } = useUser();
  
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);

  // Handle image loading errors to prevent TurboModule crashes
  const handleImageError = (error, uri, imageType) => {
    if (__DEV__) {
      console.warn('VideoScreen: Image failed to load', {
        imageType,
        uri: uri?.substring(0, 50) + '...',
        error: error?.nativeEvent || error,
        platform: Platform.OS
      });
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [videoUri, setVideoUri] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionEndTime, setSessionEndTime] = useState(null);
  const [savedVideoUri, setSavedVideoUri] = useState(null);
  const [connectedUser, setConnectedUser] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [screenshots, setScreenshots] = useState([]);
  
  const cameraRef = useRef(null);
  const recordingInterval = useRef(null);
  const screenshotInterval = useRef(null);

  useEffect(() => {
    (async () => {
      const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();
      setHasMediaLibraryPermission(mediaLibraryStatus === 'granted');
    })();
  }, []);

  // Request permissions if not granted
  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted) {
      requestCameraPermission();
    }
    if (microphonePermission && !microphonePermission.granted) {
      requestMicrophonePermission();
    }
  }, [cameraPermission, microphonePermission]);

  // Format duration for display
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Capture screenshot
  const captureScreenshot = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: false, // We don't need base64 since we can upload using URI
          skipProcessing: true,
          width: 480, // Smaller size for thumbnails
        });
        
        const timestamp = new Date();
        const screenshotData = {
          uri: photo.uri,
          timestamp: timestamp.toISOString(),
          timeString: format(timestamp, 'HH:mm:ss'),
          dateString: format(timestamp, 'MMM dd, yyyy'),
          relativeTime: formatDuration(recordingDuration)
        };
        
        setScreenshots(prev => [...prev, screenshotData]);
      } catch (error) {
        console.error('Error capturing screenshot:', error);
      }
    }
  };

  // Start recording
  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        setRecordingDuration(0);
        setSessionStartTime(new Date());
        setScreenshots([]); // Clear previous screenshots
        
        // Start duration counter
        recordingInterval.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        
        // Start screenshot capture every 3 seconds
        screenshotInterval.current = setInterval(() => {
          captureScreenshot();
        }, 3000);
        
        const video = await cameraRef.current.recordAsync({
          maxDuration: 300, // 5 minutes max
          maxFileSize: 100 * 1024 * 1024, // 100MB max
        });
        
        if (video && video.uri) {
          setVideoUri(video.uri);
          setSavedVideoUri(video.uri);
          console.log('Video recorded successfully:', video.uri);
        } else {
          console.warn('No video URI returned from recording');
        }
      } catch (error) {
        console.error('Error recording video:', error);
        if (error.message !== 'Recording was stopped') {
          Alert.alert('Error', 'Failed to record video');
        }
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      setSessionEndTime(new Date());
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      
      if (screenshotInterval.current) {
        clearInterval(screenshotInterval.current);
        screenshotInterval.current = null;
      }
      
      // Show summary modal after stopping
      setTimeout(() => {
        setShowSummaryModal(true);
      }, 500);
    }
  };

  // Process and upload screenshots to Supabase
  const processScreenshots = async () => {
    const processedScreenshots = [];
    const sessionId = Date.now().toString();
    
    console.log(`Processing ${screenshots.length} screenshots for upload...`);
    
    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      
      try {
        // Create file path
        const fileName = `screenshot_${i + 1}.jpg`;
        const filePath = `${bookingId}/${sessionId}/${fileName}`;
        
        console.log(`Uploading screenshot ${i + 1} to path: ${filePath}`);
        
        // For React Native, upload using the URI directly
        // Supabase handles the image upload when given a URI object
        // Using avatars bucket with subfolder since it has working permissions
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(`booking-screenshots/${filePath}`, {
            uri: screenshot.uri  // Use the local URI from the screenshot
          }, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          console.error(`Error uploading screenshot ${i}:`, error);
          processedScreenshots.push({
            index: i,
            timestamp: screenshot.timestamp,
            relative_time: screenshot.relativeTime,
            thumbnail_url: screenshot.uri, // Fallback to local URI
            error: true,
            error_message: error.message
          });
        } else {
          // Get public URL for the uploaded image
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(`booking-screenshots/${filePath}`);
          
          console.log(`Screenshot ${i + 1} uploaded successfully`);
          
          processedScreenshots.push({
            index: i,
            timestamp: screenshot.timestamp,
            relative_time: screenshot.relativeTime,
            thumbnail_url: urlData.publicUrl,
            width: 480,
            height: 360
          });
        }
      } catch (error) {
        console.error(`Error processing screenshot ${i}:`, error);
        processedScreenshots.push({
          index: i,
          timestamp: screenshot.timestamp,
          relative_time: screenshot.relativeTime,
          thumbnail_url: screenshot.uri, // Fallback to local URI
          error: true,
          error_message: error.message
        });
      }
    }
    
    console.log(`Processed ${processedScreenshots.length} screenshots`);
    return { sessionId, screenshots: processedScreenshots };
  };

  // Save session data without video file
  const saveVideoSession = async () => {
    setIsProcessing(true);
    
    try {
      console.log('Saving session with', screenshots.length, 'screenshots');
      console.log('Booking ID:', bookingId);
      console.log('User profile:', profile);
      
      if (!bookingId) {
        throw new Error('No booking ID provided');
      }
      
      if (!profile?.id) {
        throw new Error('No user profile found');
      }
      
      // Process and upload screenshots
      const { sessionId, screenshots: screenshotsData } = await processScreenshots();
      
      // Prepare the data to insert
      const dataToInsert = {
        booking_id: bookingId,
        user_id: profile?.id,
        session_start_time: sessionStartTime?.toISOString(),
        session_end_time: sessionEndTime?.toISOString(),
        duration_seconds: recordingDuration,
        screenshot_count: screenshots.length,
        screenshots_data: JSON.stringify(screenshotsData), // Convert to JSON string
        video_url: `session_${sessionId}`, // Just a reference ID, not actual video
        // Remove created_at as it might be auto-generated
      };
      
      console.log('Data to insert:', JSON.stringify(dataToInsert, null, 2));
      console.log('Screenshots data type:', typeof screenshotsData);
      console.log('Screenshots data length:', screenshotsData?.length);
      
      // Save session metadata only (no video file)
      const { data: insertedData, error } = await supabase
        .from('booking_videos')
        .insert(dataToInsert)
        .select();
      
      if (error) {
        console.error('Database error:', JSON.stringify(error, null, 2));
        console.error('Error details:', error.message, error.code, error.details, error.hint);
        console.error('Full error object properties:', Object.keys(error));
        
        // Try to provide more specific error information
        if (error.code === '23505') {
          throw new Error('A video session already exists for this booking');
        } else if (error.code === '23503') {
          throw new Error('Invalid booking ID or user ID');
        } else if (error.code === '22P02') {
          throw new Error('Invalid data format for one of the fields');
        }
        
        throw error;
      }
      
      console.log('Successfully saved video session:', insertedData);
      
      Alert.alert(
        'Success',
        `Session recorded! ${screenshots.length} proof-of-service images saved.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving session:', JSON.stringify(error, null, 2));
      console.error('Full error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      Alert.alert('Error', `Failed to save session: ${error?.message || error?.code || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };


  // Toggle camera facing
  const toggleCameraFacing = () => {
    setCameraFacing(current => current === 'back' ? 'front' : 'back');
  };

  // Handle user selection from ShareTrayModal
  const handleUserSelection = (user) => {
    setConnectedUser(user);
    setShowShareModal(false);
    // Here you would typically initiate the video connection
    Alert.alert('User Connected', `Connected with ${user.full_name || user.username}`);
  };

  // Handle phone number connection
  const handlePhoneConnect = () => {
    if (phoneNumber.length >= 10) {
      // Here you would typically search for user by phone number
      setConnectedUser({
        username: phoneNumber,
        full_name: `User ${phoneNumber}`,
        avatar_url: null
      });
      setShowPhoneInput(false);
      setPhoneNumber('');
      Alert.alert('Phone Connected', `Attempting to connect with ${phoneNumber}`);
    } else {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (screenshotInterval.current) {
        clearInterval(screenshotInterval.current);
      }
    };
  }, []);

  const allPermissionsGranted = 
    cameraPermission?.granted && 
    microphonePermission?.granted && 
    hasMediaLibraryPermission;

  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.container}>
        <AppHeader title="Video Recording" onBackPressOverride={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!allPermissionsGranted) {
    return (
      <View style={styles.container}>
        <AppHeader title="Video Recording" onBackPressOverride={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Ionicons name="videocam-off" size={60} color="#999" />
          <Text style={styles.noPermissionText}>Camera permission is required</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={async () => {
              await requestCameraPermission();
              await requestMicrophonePermission();
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Video Recording" onBackPressOverride={() => navigation.goBack()} />
      
      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera} 
          facing={cameraFacing}
          mode="video"
        />
        
        {/* Camera Overlay - positioned absolutely over the camera */}
        <View style={styles.cameraOverlay}>
          {/* Picture in Picture - Remote User */}
          <TouchableOpacity 
            style={styles.pipContainer}
            onPress={() => !connectedUser && setShowShareModal(true)}
            activeOpacity={connectedUser ? 1 : 0.8}
          >
            {connectedUser ? (
              connectedUser.avatar_url ? (
                <Image 
                  source={{ uri: connectedUser.avatar_url }} 
                  style={styles.pipImage}
                />
              ) : (
                <View style={styles.pipPlaceholder}>
                  <Ionicons name="person" size={40} color="#fff" />
                </View>
              )
            ) : (
              <View style={styles.pipPlaceholder}>
                <Ionicons name="person-add" size={30} color="#fff" />
                <Text style={styles.pipPlaceholderText}>Add User</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setShowPhoneInput(!showPhoneInput)}
              disabled={isRecording}
            >
              <Ionicons name="call" size={24} color="white" />
            </TouchableOpacity>
            
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>REC {formatDuration(recordingDuration)}</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleCameraFacing}
              disabled={isRecording}
            >
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Phone Input */}
          {showPhoneInput && (
            <View style={styles.phoneInputContainer}>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              <TouchableOpacity 
                style={styles.phoneConnectButton}
                onPress={handlePhoneConnect}
              >
                <Text style={styles.phoneConnectText}>Connect</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? (
                <View style={styles.stopIcon} />
              ) : (
                <View style={styles.recordIcon} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.processingText}>Processing video...</Text>
        </View>
      )}
      
      {/* Video Summary Modal */}
      <Modal
        visible={showSummaryModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <MaterialIcons name="videocam" size={40} color="white" />
              </View>
              <Text style={styles.modalTitle}>Video Session Complete</Text>
            </View>
            
            <ScrollView style={styles.modalScrollContent}>
              <View style={styles.summaryContainer}>
                {/* Duration */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Session Duration</Text>
                  <View style={styles.durationDisplay}>
                    <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
                  </View>
                </View>
                
                {/* Start Time */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Feather name="play-circle" size={20} color="#4CAF50" />
                    <View style={styles.summaryItemText}>
                      <Text style={styles.summaryLabel}>Started</Text>
                      <Text style={styles.summaryValue}>
                        {sessionStartTime ? format(sessionStartTime, 'h:mm a') : '-'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* End Time */}
                  <View style={styles.summaryItem}>
                    <Feather name="stop-circle" size={20} color="#FF5252" />
                    <View style={styles.summaryItemText}>
                      <Text style={styles.summaryLabel}>Ended</Text>
                      <Text style={styles.summaryValue}>
                        {sessionEndTime ? format(sessionEndTime, 'h:mm a') : '-'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Date */}
                <View style={styles.dateSection}>
                  <Feather name="calendar" size={20} color="#666" />
                  <Text style={styles.dateText}>
                    {sessionStartTime ? format(sessionStartTime, 'EEEE, MMMM d, yyyy') : '-'}
                  </Text>
                </View>
                
                {/* Session Info */}
                <View style={styles.videoInfoSection}>
                  <Text style={styles.videoInfoTitle}>Session Details</Text>
                  <View style={styles.videoInfoRow}>
                    <Text style={styles.videoInfoLabel}>Type:</Text>
                    <Text style={styles.videoInfoValue}>Proof of Service</Text>
                  </View>
                  <View style={styles.videoInfoRow}>
                    <Text style={styles.videoInfoLabel}>Screenshots:</Text>
                    <Text style={styles.videoInfoValue}>{screenshots.length} captured</Text>
                  </View>
                  <View style={styles.noteRow}>
                    <Feather name="info" size={16} color="#FF9500" />
                    <Text style={styles.noteText}>Only screenshots will be saved (no video file)</Text>
                  </View>
                </View>
                
                {/* Screenshot Strip */}
                {screenshots.length > 0 && (
                  <View style={styles.screenshotSection}>
                    <Text style={styles.screenshotTitle}>Session Captures</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.screenshotStrip}
                    >
                      {screenshots.map((screenshot, index) => (
                        <View key={index} style={styles.screenshotContainer}>
                          <Image 
                            source={{ uri: screenshot.uri }} 
                            style={styles.screenshotImage}
                          />
                          <View style={styles.screenshotTimestamp}>
                            <Text style={styles.screenshotTime}>{screenshot.timeString}</Text>
                            <Text style={styles.screenshotDate}>{screenshot.dateString}</Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>
            
            {/* Modal Buttons */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setShowSummaryModal(false);
                  saveVideoSession(); // Save only session data and screenshots
                }}
              >
                <Text style={styles.modalPrimaryButtonText}>Save Session</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowSummaryModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.modalSecondaryButtonText}>Discard Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Simple User Selection Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.userSelectModalOverlay}>
          <View style={styles.userSelectModalContent}>
            <View style={styles.userSelectHeader}>
              <Text style={styles.userSelectTitle}>Select User to Call</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.userList}>
              {/* Sample users - in production this would be fetched from database */}
              {[
                { id: 1, username: 'john_doe', full_name: 'John Doe', avatar_url: null },
                { id: 2, username: 'jane_smith', full_name: 'Jane Smith', avatar_url: null },
                { id: 3, username: 'support_team', full_name: 'Support Team', avatar_url: null },
              ].map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userItem}
                  onPress={() => handleUserSelection(user)}
                >
                  <View style={styles.userAvatar}>
                    {user.avatar_url ? (
                      <Image 
                        source={{ uri: user.avatar_url }} 
                        style={styles.userAvatarImage}
                        onError={(error) => handleImageError(error, user.avatar_url, 'user_avatar')}
                        onLoadStart={() => {
                          if (__DEV__) {
                            console.log('VideoScreen: User avatar loading started', { userId: user.id });
                          }
                        }}
                        onPartialLoad={() => {
                          if (__DEV__) {
                            console.log('VideoScreen: User avatar partial load', { userId: user.id });
                          }
                        }}
                        defaultSource={require('../../../assets/placeholder-image.png')}
                        loadingIndicatorSource={require('../../../assets/placeholder-image.png')}
                        fadeDuration={0}
                        progressiveRenderingEnabled={true}
                      />
                    ) : (
                      <Ionicons name="person-circle" size={40} color="#999" />
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.full_name}</Text>
                    <Text style={styles.userUsername}>@{user.username}</Text>
                  </View>
                  <Ionicons name="videocam" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noPermissionText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderButton: {
    width: 44,
    height: 44,
  },
  pipContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pipImage: {
    width: '100%',
    height: '100%',
  },
  pipPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pipPlaceholderText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
  phoneInputContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: 'white',
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  phoneConnectButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  phoneConnectText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 6,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: 'rgba(255,0,0,0.3)',
    borderColor: '#FF0000',
  },
  recordIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF0000',
  },
  stopIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#FF0000',
    borderRadius: 4,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.9,
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    backgroundColor: COLORS.primary,
    padding: 20,
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 25,
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  modalScrollContent: {
    maxHeight: 400,
  },
  summaryContainer: {
    padding: 20,
  },
  summarySection: {
    marginBottom: 25,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  durationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  summaryItemText: {
    marginLeft: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  videoInfoSection: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
  },
  videoInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  videoInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  videoInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  videoInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  noteText: {
    fontSize: 13,
    color: '#FF9500',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  modalButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalPrimaryButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalSecondaryButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  userSelectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  userSelectModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  userSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userSelectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userAvatar: {
    marginRight: 15,
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  screenshotSection: {
    marginTop: 20,
  },
  screenshotTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  screenshotStrip: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  screenshotContainer: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  screenshotImage: {
    width: 120,
    height: 160,
    backgroundColor: '#333',
  },
  screenshotTimestamp: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  screenshotTime: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  screenshotDate: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
  },
});

export default VideoScreen;