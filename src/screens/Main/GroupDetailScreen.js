import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Share } from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import AppHeader from '../../components/layout/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';

const MOCK_POSTS = [
  { id: '1', user: 'Sarah', text: 'Welcome to the group!', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' },
  { id: '2', user: 'John', text: 'Looking forward to our next meetup.', image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80' },
];
const MOCK_MEMBERS = [
  { id: '1', name: 'Sarah', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: '2', name: 'John', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: '3', name: 'Lisa', avatar: 'https://randomuser.me/api/portraits/women/45.jpg' },
  { id: '4', name: 'Mike', avatar: 'https://randomuser.me/api/portraits/men/33.jpg' },
];

const GroupDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { group } = route.params || { group: { name: 'Group', desc: 'Description', image: '' } };
  const [tab, setTab] = useState('posts');
  const [isFavourited, setIsFavourited] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out the group: ${group.name}`,
      });
    } catch (error) {}
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader title={group.name} navigation={navigation} canGoBack={true} />
      <Image source={{ uri: group.image }} style={styles.headerImage} />
      <View style={styles.headerRow}>
        <Text style={styles.groupTitle}>{group.name}</Text>
        <TouchableOpacity onPress={() => setIsFavourited(f => !f)}>
          {isFavourited ? (
            <AntDesign name="star" size={26} color="#FFD700" />
          ) : (
            <AntDesign name="staro" size={26} color="#888" />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={{marginLeft: 14}}>
          <Feather name="share-2" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.leaveBtn}>
          <Feather name="log-out" size={18} color="#fff" />
          <Text style={styles.leaveBtnText}>Leave</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.groupDesc}>{group.desc}</Text>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'posts' && styles.tabBtnActive]} onPress={() => setTab('posts')}>
          <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'members' && styles.tabBtnActive]} onPress={() => setTab('members')}>
          <Text style={[styles.tabText, tab === 'members' && styles.tabTextActive]}>Members</Text>
        </TouchableOpacity>
      </View>
      {tab === 'posts' ? (
        <FlatList
          data={MOCK_POSTS}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <Image source={{ uri: item.image }} style={styles.postImage} />
              <Text style={styles.postUser}>{item.user}</Text>
              <Text style={styles.postText}>{item.text}</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={MOCK_MEMBERS}
          keyExtractor={item => item.id}
          horizontal
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={styles.memberAvatarBox}>
              <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
              <Text style={styles.memberName}>{item.name}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#f8f8f8' },
  headerImage: { width: '100%', height: 120, backgroundColor: '#eaeaea' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginTop: -24, marginBottom: 6 },
  groupTitle: { fontSize: 22, fontWeight: '700', color: '#222', flex: 1 },
  groupDesc: { color: '#666', fontSize: 14, marginLeft: 14, marginBottom: 10 },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e74c3c', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, marginLeft: 14 },
  leaveBtnText: { color: '#fff', marginLeft: 5, fontWeight: '600' },
  tabBar: { flexDirection: 'row', marginBottom: 8, marginTop: 4, marginHorizontal: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: '#eaeaea' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff' },
  tabText: { fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#007AFF' },
  postCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  postImage: { width: '100%', height: 120, borderRadius: 10, marginBottom: 6, backgroundColor: '#eaeaea' },
  postUser: { fontWeight: '700', color: '#333' },
  postText: { color: '#444', fontSize: 14, marginTop: 2 },
  memberAvatarBox: { alignItems: 'center', marginRight: 18 },
  memberAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#eaeaea' },
  memberName: { fontSize: 13, color: '#444', marginTop: 4, fontWeight: '600' },
});

export default GroupDetailScreen;
