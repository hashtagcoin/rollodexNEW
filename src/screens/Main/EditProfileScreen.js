import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ username: '', full_name: '', bio: '', avatar_url: '' });
  const [avatar, setAvatar] = useState(null);

  // Fetch current user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'Could not get user info');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        Alert.alert('Error', 'Could not fetch profile');
      } else {
        setProfile(data);
        setAvatar(data.avatar_url);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Pick and upload avatar
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      // Upload to Supabase Storage
      const filename = `avatar_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { data, error } = await supabase.storage.from('avatars').upload(filename, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) {
        Alert.alert('Upload Error', error.message);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filename);
      setProfile((p) => ({ ...p, avatar_url: publicUrlData.publicUrl }));
    }
  };

  // Save profile
  const saveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const updates = { ...profile, id: user.id, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('user_profiles').upsert(updates, { onConflict: ['id'] });
    setSaving(false);
    if (error) {
      Alert.alert('Save Error', error.message);
    } else {
      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.screenContainer}>
      <AppHeader title="Edit Profile" canGoBack navigation={navigation} />
      <View style={styles.content}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>Add Photo</Text></View>
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={profile.username}
          onChangeText={text => setProfile(p => ({ ...p, username: text }))}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={profile.full_name}
          onChangeText={text => setProfile(p => ({ ...p, full_name: text }))}
        />
        <TextInput
          style={[styles.input, {height: 80}]}
          placeholder="Bio"
          value={profile.bio}
          onChangeText={text => setProfile(p => ({ ...p, bio: text }))}
          multiline
        />
        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7F3',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#888',
    fontSize: 16,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 18,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});
