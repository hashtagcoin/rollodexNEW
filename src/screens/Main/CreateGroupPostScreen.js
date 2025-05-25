import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import AppHeader from '../../components/layout/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient'; // Assuming you'll need this for submission

const CreateGroupPostScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;
  const onPostCreated = route.params?.onPostCreated; // Get the callback

  const [postContent, setPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState(''); // Optional: for image/video links
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitPost = async () => {
    if (!postContent.trim()) {
      Alert.alert('Empty Post', 'Please write something before posting.');
      return;
    }
    setSubmitting(true);
    // Placeholder for actual submission logic to Supabase
    console.log('Submitting post for group:', groupId);
    console.log('Content:', postContent);
    console.log('Media URL:', mediaUrl);

    // Simulate API call
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            Alert.alert('Error', 'You must be logged in to post.');
            setSubmitting(false);
            return;
        }

        const newPost = {
            group_id: groupId,
            user_id: user.id,
            content: postContent.trim(),
            media_url: mediaUrl.trim() || null,
            // likes_count and comments_count will default to 0 in DB or be handled by triggers
        };

        const { error } = await supabase.from('group_posts').insert(newPost);

        if (error) throw error;

        Alert.alert('Post Submitted!', 'Your post has been successfully submitted.');
        setPostContent('');
        setMediaUrl('');
        
        // Call the callback if it exists, to refresh the posts on the previous screen
        if (onPostCreated && typeof onPostCreated === 'function') {
          onPostCreated();
        }

        // Navigate back or to the group detail screen, potentially refreshing posts
        // For now, just go back. Consider passing a refresh callback or using event listeners.
        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    } catch (error) {
        console.error('Error submitting post:', error);
        Alert.alert('Error', 'Could not submit your post. Please try again. ' + error.message);
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader title="Create New Post" navigation={navigation} canGoBack={true} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.label}>What's on your mind?</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Share an update, ask a question, etc."
          multiline
          value={postContent}
          onChangeText={setPostContent}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Media URL (Optional)</Text>
        <TextInput
          style={styles.mediaInput}
          placeholder="https://example.com/image.png"
          value={mediaUrl}
          onChangeText={setMediaUrl}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        
        {/* Add image picker or other media upload options here later */}

        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitPost}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Post'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f4f4f8', // Light background for the whole screen
  },
  container: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 40, // Ensure space for the button at the bottom
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: '#fff',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingTop: 15, // Ensure padding at the top for multiline
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top', // For Android
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mediaInput: {
    backgroundColor: '#fff',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  submitButton: {
    backgroundColor: '#009966', // Theme color
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#a9d8c8', // Lighter theme color when disabled
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateGroupPostScreen;
