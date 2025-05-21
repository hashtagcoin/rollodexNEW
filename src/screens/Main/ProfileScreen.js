import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions, TextInput, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';

const TABS = ['Posts', 'Groups', 'Bookings', 'Friends'];
const windowWidth = Dimensions.get('window').width;

const mockPosts = Array.from({ length: 12 }, (_, i) => ({ id: i + '', image: `https://picsum.photos/seed/post${i}/200` }));
const mockGroups = Array.from({ length: 3 }, (_, i) => ({ id: i + '', name: `Group ${i+1}`, desc: 'Airbnb-style group card', image: `https://picsum.photos/seed/group${i}/400/200` }));
const mockBookings = Array.from({ length: 2 }, (_, i) => ({ id: i + '', title: `Booking ${i+1}`, location: 'Melbourne', date: '2025-06-0' + (i+1), image: `https://picsum.photos/seed/booking${i}/400/200` }));
const mockFriends = Array.from({ length: 8 }, (_, i) => ({ id: i + '', name: `Friend ${i+1}`, avatar: `https://randomuser.me/api/portraits/men/${i+10}.jpg` }));

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState('Posts');
  const [friendSearch, setFriendSearch] = useState('');
  const [addFriendSearch, setAddFriendSearch] = useState('');
  const [friendRequests, setFriendRequests] = useState([
    { id: '1', name: 'Alex', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
    { id: '2', name: 'Jamie', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
  ]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [addFriendResults, setAddFriendResults] = useState([
    { id: '101', name: 'Taylor', avatar: 'https://randomuser.me/api/portraits/men/21.jpg' },
    { id: '102', name: 'Morgan', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' },
  ]);

  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Posts':
        return (
          <FlatList
            data={mockPosts}
            numColumns={3}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.postsList}
            renderItem={({ item }) => (
              <Image source={{ uri: item.image }} style={styles.postImage} />
            )}
          />
        );
      case 'Groups':
        return (
          <FlatList
            data={mockGroups}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.cardList}
            renderItem={({ item }) => (
              <View style={styles.airbnbCard}>
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>
              </View>
            )}
          />
        );
      case 'Bookings':
        return (
          <FlatList
            data={mockBookings}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.cardList}
            renderItem={({ item }) => (
              <View style={styles.airbnbCard}>
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.location} • {item.date}</Text>
                </View>
              </View>
            )}
          />
        );
      case 'Friends':
        // Filter friends based on search
        const filteredFriends = mockFriends.filter(f =>
          f.name.toLowerCase().includes(friendSearch.toLowerCase())
        );
        return (
          <View style={{flex: 1}}>
            {/* Search & Add Friends */}
            <View style={styles.friendSearchRow}>
              <TextInput
                style={styles.friendSearchInput}
                placeholder="Search friends or add new..."
                value={friendSearch}
                onChangeText={setFriendSearch}
              />
              <TouchableOpacity style={styles.addFriendBtn} onPress={() => setShowAddFriendModal(true)}>
                <Text style={styles.addFriendBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.groupChatBtn} onPress={() => setShowGroupChatModal(true)}>
                <Text style={styles.groupChatBtnText}>Group Chat</Text>
              </TouchableOpacity>
            </View>
            {/* Friend Requests Section */}
            {friendRequests.length > 0 && (
              <View style={styles.friendRequestsSection}>
                <Text style={styles.friendRequestsTitle}>Friend Requests</Text>
                <FlatList
                  data={friendRequests}
                  horizontal
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.friendRequestCard}>
                      <Image source={{ uri: item.avatar }} style={styles.friendAvatarSmall} />
                      <Text style={styles.friendNameSmall}>{item.name}</Text>
                      <View style={styles.friendRequestActions}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(item.id)}><Text style={styles.acceptBtnText}>Accept</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineRequest(item.id)}><Text style={styles.declineBtnText}>Decline</Text></TouchableOpacity>
                      </View>
                    </View>
                  )}
                  contentContainerStyle={{paddingVertical: 8}}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            )}
            {/* Friends List */}
            <FlatList
              data={filteredFriends}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.friendsListModern}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.friendModernCard} onPress={() => handleOpenFriendModal(item)}>
                  <Image source={{ uri: item.avatar }} style={styles.friendAvatarModern} />
                  <View style={{flex:1}}>
                    <Text style={styles.friendNameModern}>{item.name}</Text>
                    <Text style={styles.friendTypeBadge}>{item.type}</Text>
                  </View>
                  <TouchableOpacity style={styles.friendMenuBtn} onPress={() => handleOpenFriendModal(item)}>
                    <Text style={styles.friendMenuBtnText}>⋮</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
            {/* Friend Detail Modal */}
            <Modal
              visible={!!selectedFriend}
              transparent
              animationType="slide"
              onRequestClose={() => setSelectedFriend(null)}
            >
              <View style={styles.friendModalOverlay}>
                <View style={styles.friendModalContent}>
                  {selectedFriend && (
                    <>
                      <Image source={{ uri: selectedFriend.avatar }} style={styles.friendAvatarLarge} />
                      <Text style={styles.friendNameLarge}>{selectedFriend.name}</Text>
                      <View style={styles.friendTypeSelectorRow}>
                        {['Friend','Provider','Family'].map(type => (
                          <TouchableOpacity
                            key={type}
                            style={[styles.friendTypeSelectorBtn, selectedFriend.type === type && styles.friendTypeSelectorBtnActive]}
                            onPress={() => handleChangeFriendType(selectedFriend.id, type)}
                          >
                            <Text style={styles.friendTypeSelectorText}>{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.friendModalActionsRow}>
                        <TouchableOpacity style={styles.friendChatBtn} onPress={() => handleChat(selectedFriend)}><Text style={styles.friendChatBtnText}>Chat</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.friendRemoveBtn} onPress={() => handleRemoveFriend(selectedFriend.id)}><Text style={styles.friendRemoveBtnText}>Remove</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.friendBlockBtn} onPress={() => handleBlockFriend(selectedFriend.id)}><Text style={styles.friendBlockBtnText}>Block</Text></TouchableOpacity>
                      </View>
                      <TouchableOpacity style={styles.friendModalCloseBtn} onPress={() => setSelectedFriend(null)}><Text style={styles.friendModalCloseBtnText}>Close</Text></TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </Modal>
            {/* Add Friend Modal */}
            <Modal
              visible={showAddFriendModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowAddFriendModal(false)}
            >
              <View style={styles.friendModalOverlay}>
                <View style={styles.friendModalContent}>
                  <Text style={styles.addFriendTitle}>Search & Add Friends</Text>
                  <TextInput
                    style={styles.friendSearchInput}
                    placeholder="Enter name or email..."
                    value={addFriendSearch}
                    onChangeText={setAddFriendSearch}
                  />
                  <FlatList
                    data={addFriendResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.addFriendResultRow}>
                        <Image source={{ uri: item.avatar }} style={styles.friendAvatarSmall} />
                        <Text style={styles.friendNameSmall}>{item.name}</Text>
                        <TouchableOpacity style={styles.sendRequestBtn} onPress={() => handleSendFriendRequest(item.id)}><Text style={styles.sendRequestBtnText}>Request</Text></TouchableOpacity>
                      </View>
                    )}
                    style={{maxHeight: 200}}
                  />
                  <TouchableOpacity style={styles.friendModalCloseBtn} onPress={() => setShowAddFriendModal(false)}><Text style={styles.friendModalCloseBtnText}>Close</Text></TouchableOpacity>
                </View>
              </View>
            </Modal>
            {/* Group Chat Modal (placeholder) */}
            <Modal
              visible={showGroupChatModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowGroupChatModal(false)}
            >
              <View style={styles.friendModalOverlay}>
                <View style={styles.friendModalContent}>
                  <Text style={styles.groupChatTitle}>Start a Group Chat</Text>
                  <Text style={{marginBottom:14}}>Select friends to add to group chat (feature coming soon!)</Text>
                  <TouchableOpacity style={styles.friendModalCloseBtn} onPress={() => setShowGroupChatModal(false)}><Text style={styles.friendModalCloseBtnText}>Close</Text></TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader
        title="Profile"
        navigation={navigation}
        canGoBack={true}
        onBackPressOverride={handleBackToDashboard}
      />
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} style={styles.avatar} />
        <Text style={styles.profileName}>Sarah Conor</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statNumber}>12</Text><Text style={styles.statLabel}>Posts</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>8</Text><Text style={styles.statLabel}>Friends</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>Groups</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>2</Text><Text style={styles.statLabel}>Bookings</Text></View>
        </View>
        <View style={styles.profileButtonRow}>
          <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfileScreen')}>
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryProfileButton} onPress={() => navigation.navigate('BookingDetailScreen')}>
            <Text style={styles.secondaryProfileButtonText}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryProfileButton} onPress={() => navigation.navigate('NDISScreen')}>
            <Text style={styles.secondaryProfileButtonText}>NDIS</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, selectedTab === tab && styles.tabBtnActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Tab Content */}
      <View style={styles.tabContent} key={selectedTab}>{renderTabContent()}</View>

    </View>
  );
};

const styles = StyleSheet.create({
  // Modern Airbnb-style friends list
  friendsListModern: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  friendModernCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 18,
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  friendAvatarModern: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
    backgroundColor: '#eee',
  },
  friendNameModern: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  profileButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  },
  friendMenuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  friendMenuBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  secondaryProfileButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  secondaryProfileButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
    fontFamily: 'System',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  editBtn: {
    backgroundColor: '#f3b15a',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 6,
    marginTop: 8,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabBtnActive: {
    backgroundColor: '#f3b15a22',
  },
  tabText: {
    color: '#888',
    fontWeight: '500',
    fontSize: 15,
  },
  tabTextActive: {
    color: '#f3b15a',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  postsList: {
    alignItems: 'center',
  },
  postImage: {
    width: windowWidth / 3 - 14, 
    height: windowWidth / 3 - 14, 
    margin: 2,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  airbnbCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginVertical: 6,
    marginHorizontal: 8,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#888',
  },
  friendsList: {
    alignItems: 'center',
    paddingTop: 8,
  },
  friendCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    margin: 6,
    borderRadius: 14,
    padding: 14,
    width: windowWidth / 2 - 24, 
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  friendAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginBottom: 8,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  friendSearchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  friendSearchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 12,
  },
  addFriendBtn: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addFriendBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  groupChatBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  groupChatBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  friendRequestsSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  friendRequestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  friendRequestCard: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  friendAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  friendNameSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  friendRequestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  acceptBtn: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  declineBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  declineBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  friendModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  friendAvatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  friendNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  friendTypeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendTypeSelectorBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  friendTypeSelectorBtnActive: {
    backgroundColor: '#f3b15a',
    borderColor: '#f3b15a',
  },
  friendTypeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  friendModalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  friendChatBtn: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  friendChatBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  friendRemoveBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  friendRemoveBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  friendBlockBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  friendBlockBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  friendModalCloseBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  friendModalCloseBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  addFriendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  addFriendResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  sendRequestBtn: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendRequestBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  groupChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  friendTypeBadge: {
    fontSize: 12,
    color: '#888',
  },
  editProfileButton: {
    backgroundColor: '#f3b15a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfileButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  profileButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  }
});

export default ProfileScreen;
