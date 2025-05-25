import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Share,
  Alert,
  Platform,
  Clipboard,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
  PanResponder
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../context/UserContext';

const { width, height } = Dimensions.get('window');

const ShareTray = ({ 
  visible, 
  onClose, 
  item,
  itemType = 'post', // Can be 'post', 'group', 'housing', 'event', 'profile', 'comment'
  additionalOptions = []
}) => {
  // Get current user from context
  const { user } = useUser();
  
  // State for friends list
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Pan gesture handler for drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5; // Only respond to downward gestures
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward movement
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) { // Threshold to dismiss
          onClose();
        } else {
          // Snap back to original position
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
  // Generate a share URL based on item type and id
  const getShareUrl = () => {
    const baseUrl = 'https://rollodex.app/';
    let path = '';
    
    switch (itemType) {
      case 'post':
        path = `post/${item.id}`;
        break;
      case 'group':
        path = `group/${item.id}`;
        break;
      case 'housing':
        path = `housing/${item.id}`;
        break;
      case 'event':
        path = `event/${item.id}`;
        break;
      case 'profile':
        path = `profile/${item.id}`;
        break;
      default:
        path = '';
    }
    
    return baseUrl + path;
  };
  
  // Generate share message based on item type
  const getShareMessage = () => {
    let title = '';
    let description = '';
    let url = getShareUrl();
    
    switch (itemType) {
      case 'post':
        title = `Check out this post on Rollodex`;
        description = item.content ? item.content.substring(0, 100) + '...' : '';
        break;
      case 'group':
        title = `Join ${item.name || 'this group'} on Rollodex`;
        description = item.description ? item.description.substring(0, 100) + '...' : '';
        break;
      case 'housing':
        title = `Check out this housing on Rollodex`;
        description = `${item.title || ''} - ${item.price ? '$' + item.price : ''} ${item.location || ''}`;
        break;
      case 'event':
        title = `Join this event on Rollodex`;
        description = `${item.title || ''} - ${item.date ? new Date(item.date).toLocaleDateString() : ''} ${item.location || ''}`;
        break;
      case 'profile':
        title = `Check out ${item.full_name || 'this profile'} on Rollodex`;
        description = `@${item.username || ''}`;
        break;
      default:
        title = 'Check out Rollodex';
        description = '';
    }
    
    return `${title}\n${description}\n${url}`;
  };
  
  // Fetch friends when tray becomes visible
  useEffect(() => {
    if (visible && user) {
      fetchFriends();
    }
  }, [visible, user]);
  
  // Fetch user's friends from Supabase using friendships_with_profiles view
  const fetchFriends = async () => {
    if (!user) return;
    
    setLoadingFriends(true);
    
    try {
      // Query for accepted friendships where current user is either requester or addressee
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships_with_profiles')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');
      
      if (friendshipsError) throw friendshipsError;
      
      // Format the data to get a clean list of friends
      const formattedFriends = friendshipsData.map(friendship => {
        // Determine which profile is the friend (not the current user)
        const isRequester = friendship.requester_id === user.id;
        
        return {
          id: isRequester ? friendship.addressee_id : friendship.requester_id,
          username: isRequester ? null : friendship.requester_name,  // We don't have username in the view
          fullName: isRequester ? friendship.addressee_name : friendship.requester_name,
          avatarUrl: isRequester ? friendship.addressee_avatar : friendship.requester_avatar,
          friendship_id: friendship.id
        };
      });
      
      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };
  
  // Share with a specific friend via direct message
  const handleShareWithFriend = async (friendId) => {
    try {
      // In a real app, this would create a chat message or notification
      // For now, we'll just show an alert
      Alert.alert('Success', 'Shared with friend!');
      
      // You could create a chat message or notification in Supabase here
      // const { error } = await supabase
      //   .from('chat_messages')
      //   .insert({
      //     sender_id: user.id,
      //     recipient_id: friendId,
      //     content: getShareMessage(),
      //     shared_item_id: item.id,
      //     shared_item_type: itemType,
      //     created_at: new Date().toISOString()
      //   });
      
      onClose();
    } catch (error) {
      console.error('Error sharing with friend:', error);
      Alert.alert('Error', 'Failed to share with friend. Please try again.');
    }
  };
  
  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  // Generate share options
  const defaultOptions = [
    {
      id: 'copy',
      label: 'Copy Link',
      icon: 'copy',
      iconType: 'feather',
      action: () => {
        Clipboard.setString(getShareUrl());
        Alert.alert('Success', 'Link copied to clipboard!');
      }
    },
    {
      id: 'message',
      label: 'Message',
      icon: 'chatbubble-outline',
      iconType: 'ionicons',
      action: () => {
        // Open messaging app if available
        onClose();
        Alert.alert('Opening Messages', 'This would open the messaging app');
      }
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: 'whatsapp',
      iconType: 'fontawesome',
      action: async () => {
        const message = encodeURIComponent(getShareMessage());
        const url = `whatsapp://send?text=${message}`;
        
        try {
          const supported = await Linking.canOpenURL(url);
          
          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert('Error', 'WhatsApp is not installed on your device');
          }
        } catch (error) {
          Alert.alert('Error', 'Could not open WhatsApp');
        }
      }
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: 'instagram',
      iconType: 'fontawesome',
      action: () => {
        // Instagram sharing would go here
        onClose();
        Alert.alert('Sharing to Instagram', 'This would open Instagram');
      }
    },
    {
      id: 'twitter',
      label: 'Twitter',
      icon: 'twitter',
      iconType: 'fontawesome',
      action: async () => {
        const message = encodeURIComponent(getShareMessage());
        const url = `twitter://post?message=${message}`;
        
        try {
          const supported = await Linking.canOpenURL(url);
          
          if (supported) {
            await Linking.openURL(url);
          } else {
            // Try web URL as fallback
            await Linking.openURL(`https://twitter.com/intent/tweet?text=${message}`);
          }
        } catch (error) {
          Alert.alert('Error', 'Could not open Twitter');
        }
      }
    },
    {
      id: 'more',
      label: 'More',
      icon: 'dots-horizontal',
      iconType: 'material',
      action: async () => {
        try {
          await Share.share({
            message: getShareMessage(),
            url: getShareUrl(),
            title: 'Share via'
          });
        } catch (error) {
          Alert.alert('Error', 'Could not open share dialog');
        }
      }
    }
  ];
  
  // Combine default and additional options
  const allOptions = [...defaultOptions, ...additionalOptions];
  
  // Render content preview based on item type
  const renderPreview = () => {
    switch (itemType) {
      case 'post':
        return (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: item.author?.avatar_url || item.user_profile?.avatar_url || 'https://via.placeholder.com/50' }} 
              style={styles.previewAvatar} 
              resizeMode="cover"
            />
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>
                {item.author?.full_name || item.author?.username || item.user_profile?.full_name || 'User'}
              </Text>
              <Text style={styles.previewText} numberOfLines={2}>
                {item.content || 'Post content'}
              </Text>
            </View>
          </View>
        );
      
      case 'group':
        return (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: item.imageurl || 'https://via.placeholder.com/50' }} 
              style={styles.previewImage} 
              resizeMode="cover"
            />
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>{item.name || 'Group Name'}</Text>
              <Text style={styles.previewText} numberOfLines={2}>
                {item.description || 'Group description'}
              </Text>
            </View>
          </View>
        );
      
      case 'housing':
        return (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: item.images?.[0] || 'https://via.placeholder.com/50' }} 
              style={styles.previewImage} 
              resizeMode="cover"
            />
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>{item.title || 'Housing Listing'}</Text>
              <Text style={styles.previewText}>
                {item.price ? `$${item.price}` : ''} {item.location || ''}
              </Text>
            </View>
          </View>
        );
      
      case 'event':
        return (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: item.image || 'https://via.placeholder.com/50' }} 
              style={styles.previewImage} 
              resizeMode="cover"
            />
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>{item.title || 'Event Title'}</Text>
              <Text style={styles.previewText}>
                {item.date ? new Date(item.date).toLocaleDateString() : ''} {item.location || ''}
              </Text>
            </View>
          </View>
        );
      
      case 'profile':
        return (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }} 
              style={styles.previewAvatar} 
            />
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>{item.full_name || 'User'}</Text>
              <Text style={styles.previewText}>@{item.username || 'username'}</Text>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };
  
  if (!visible) return null;
  
  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: backdropOpacity }
        ]}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      
      {/* Share Tray */}
      <Animated.View
        style={[
          styles.tray,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.trayContent}>
          {/* Handle bar for drag gesture */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          {/* Content preview */}
          {renderPreview()}
          
          {/* Share options */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Share to</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionsContainer}
            >
              {allOptions.map(option => (
                <TouchableOpacity 
                  key={option.id} 
                  style={styles.option}
                  onPress={option.action}
                >
                  <View style={styles.iconContainer}>
                    {option.iconType === 'ionicons' && (
                      <Ionicons name={option.icon} size={24} color="#fff" />
                    )}
                    {option.iconType === 'feather' && (
                      <Feather name={option.icon} size={24} color="#fff" />
                    )}
                    {option.iconType === 'fontawesome' && (
                      <FontAwesome name={option.icon} size={24} color="#fff" />
                    )}
                    {option.iconType === 'fontawesome5' && (
                      <FontAwesome5 name={option.icon} size={24} color="#fff" />
                    )}
                    {option.iconType === 'material' && (
                      <MaterialCommunityIcons name={option.icon} size={24} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Friends section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Share with friends</Text>
            {loadingFriends ? (
              <ActivityIndicator color={COLORS.DARK_GREEN} style={styles.loadingIndicator} />
            ) : friends.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.friendsContainer}
              >
                {friends.map(friend => (
                  <TouchableOpacity 
                    key={friend.id} 
                    style={styles.friendOption}
                    onPress={() => handleShareWithFriend(friend.id)}
                  >
                    <Image 
                      source={{ uri: friend.avatarUrl || 'https://via.placeholder.com/50' }} 
                      style={styles.friendAvatar} 
                    />
                    <Text style={styles.friendName} numberOfLines={1}>
                      {friend.fullName || friend.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyFriendsText}>No friends to share with</Text>
            )}
          </View>
          
          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  tray: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxHeight: height * 0.7,
  },
  trayContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#aaa',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 16,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  option: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.DARK_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  cancelButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  previewContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#333',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    color: '#ccc',
  },
  friendsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  friendOption: {
    alignItems: 'center',
    marginHorizontal: 12,
    width: 70,
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.DARK_GREEN,
  },
  friendName: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    width: 70,
  },
  emptyFriendsText: {
    color: '#999',
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14,
  },
  loadingIndicator: {
    marginVertical: 16,
  },
});

export default ShareTray;
