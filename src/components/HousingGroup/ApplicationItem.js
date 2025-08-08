import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Alert } from '../../utils/alert';

import { Ionicons } from '@expo/vector-icons';
import { processApplication } from '../../services/housingGroupApplicationService';
import { DARK_GREEN, COLORS } from '../../constants/theme';
const MEDIUM_GREY = COLORS.gray; // Using gray from theme
const LIGHT_GREY = COLORS.lightGray; // Using lightGray from theme
const RED = COLORS.RED; // Using RED from theme
const OFF_WHITE = COLORS.white; // Using white from theme as closest equivalent

const ApplicationItem = ({ 
  application, 
  isAdmin = false, 
  currentUserId,
  onApplicationProcessed,
  showCommentInput = false 
}) => {
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComment, setShowComment] = useState(false);
  
  // Determine if this is the current user's application
  const isOwnApplication = application.applicant_id === currentUserId;
  
  // Only admin or the applicant can see this item
  if (!isAdmin && !isOwnApplication) {
    return null;
  }
  
  const handleProcess = async (status) => {
    try {
      if (isProcessing) return;
      
      setIsProcessing(true);
      
      const result = await processApplication(
        application.id, 
        status, 
        currentUserId, 
        comment
      );
      
      setIsProcessing(false);
      setComment('');
      
      if (onApplicationProcessed) {
        onApplicationProcessed(result);
      }
      
      Alert.alert(
        'Success', 
        `Application ${status === 'accepted' ? 'accepted' : 'declined'} successfully`
      );
    } catch (error) {
      console.error('Error processing application:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process application. Please try again.');
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return DARK_GREEN;
      case 'declined': return RED;
      case 'left': return MEDIUM_GREY;
      default: return MEDIUM_GREY;
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted': return 'checkmark-circle';
      case 'declined': return 'close-circle';
      case 'left': return 'exit-outline';
      default: return 'time-outline';
    }
  };
  
  // Format the application date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  return (
    <View style={styles.container}>
      {/* User info section - Instagram style */}
      <View style={styles.userInfoContainer}>
        <Image 
          source={{ uri: application.applicant_avatar || 'https://via.placeholder.com/50' }} 
          style={styles.avatar} 
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {application.applicant_name || 'Anonymous'}{' '}
            <Text style={styles.userAge}>{application.applicant_age ? `• ${application.applicant_age}` : ''}</Text>
          </Text>
          <Text style={styles.timestamp}>Applied on {formatDate(application.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
          <Ionicons name={getStatusIcon(application.status)} size={12} color="#FFF" />
          <Text style={styles.statusText}>
            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
          </Text>
        </View>
      </View>
      
      {/* Bio section - Only visible to admin */}
      {(isAdmin || isOwnApplication) && application.applicant_bio && (
        <Text style={styles.bio}>{application.applicant_bio}</Text>
      )}
      
      {/* Applicant message if any */}
      {application.applicant_message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{application.applicant_message}</Text>
        </View>
      )}
      
      {/* Admin comment if any */}
      {application.admin_comment && (
        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>Admin comment:</Text>
          <Text style={styles.commentText}>{application.admin_comment}</Text>
        </View>
      )}
      
      {/* Action buttons - Only visible to admin for pending applications */}
      {isAdmin && application.status === 'pending' && (
        <View style={styles.actionsContainer}>
          {showCommentInput && (
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              value={comment}
              onChangeText={setComment}
              multiline
            />
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleProcess('accepted')}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleProcess('declined')}
              disabled={isProcessing}
            >
              <Text style={[styles.actionButtonText, styles.declineButtonText]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.commentButton}
              onPress={() => setShowComment(!showComment)}
            >
              <Ionicons name={showComment ? "chatbubble" : "chatbubble-outline"} size={24} color={DARK_GREEN} />
            </TouchableOpacity>
          </View>
          
          {showComment && (
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment for the applicant"
              value={comment}
              onChangeText={setComment}
              multiline
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    fontSize: 16,
  },
  userAge: {
    color: MEDIUM_GREY,
    fontWeight: '400',
  },
  timestamp: {
    color: MEDIUM_GREY,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  bio: {
    fontSize: 14,
    color: MEDIUM_GREY,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  messageContainer: {
    backgroundColor: OFF_WHITE,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
  },
  commentContainer: {
    backgroundColor: LIGHT_GREY,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentLabel: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
  },
  actionsContainer: {
    marginTop: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: DARK_GREEN,
  },
  declineButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: RED,
  },
  actionButtonText: {
    fontWeight: '600',
    color: '#FFF',
  },
  declineButtonText: {
    color: RED,
  },
  commentButton: {
    padding: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: LIGHT_GREY,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default ApplicationItem;
