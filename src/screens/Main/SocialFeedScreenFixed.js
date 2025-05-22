import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS } from '../../constants/theme';
import PostCardFixed from '../../components/social/PostCardFixed';

const { width, height } = Dimensions.get('window');

// Mock data for housing groups - kept for the housing modal
const dummyHousingGroups = [
  {
    id: 'h1',
    name: 'NDIS Housing Co-op',
    desc: 'Affordable, accessible housing for NDIS participants.',
    members: 18,
    image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'h2',
    name: 'Young Renters',
    desc: 'Support for young adults finding their first home.',
    members: 44,
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'h3',
    name: 'Accessible Living',
    desc: 'A group for accessible housing tips and listings.',
    members: 27,
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
  },
];

const SocialFeedScreen = () => {
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [housingModalVisible, setHousingModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'agreements'

  // Navigate back to dashboard
  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  // Fetch all posts for the social feed
  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Get all posts, sorted by most recent first
      const { data, error } = await supabase
        .from('posts')
        .select(`
          post_id,
          user_id,
          caption,
          media_urls,
          created_at,
          location,
          updated_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch service agreements
  const fetchAgreements = async () => {
    try {
      setLoading(true);
      
      // For demo purposes, use the global variable where we store signed agreements
      // In a real app, you would fetch from AsyncStorage or Supabase with proper RLS policies
      if (global.signedAgreements) {
        // Format the agreements data to match the structure expected by the renderAgreement function
        const formattedAgreements = global.signedAgreements.map(agreement => ({
          id: agreement.id,
          service_id: agreement.service_id,
          service_provider_id: agreement.service_provider_id,
          agreement_title: agreement.agreement_title,
          status: agreement.status,
          effective_date: agreement.effective_date,
          created_at: agreement.created_at,
          services: {
            title: agreement.service_title
          },
          service_providers: {
            business_name: agreement.provider_name,
            logo_url: 'https://via.placeholder.com/60' // Default placeholder for demo
          }
        }));
        
        setAgreements(formattedAgreements || []);
      } else {
        setAgreements([]);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error.message);
      setAgreements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts();
    } else {
      fetchAgreements();
    }
  }, [activeTab]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'posts') {
      fetchPosts();
    } else {
      fetchAgreements();
    }
  };

  // Render each post using the PostCardFixed component
  const renderPost = ({ item }) => (
    <PostCardFixed 
      post={item} 
      onPress={() => navigation.navigate('PostDetailScreen', { post: item })}
      showActions={true}
    />
  );
  
  // Render each service agreement
  const renderAgreement = ({ item }) => (
    <TouchableOpacity 
      style={styles.agreementCard}
      onPress={() => navigation.navigate('ServiceAgreement', { serviceId: item.service_id, viewOnly: true, agreementId: item.id })}
    >
      <View style={styles.agreementIconContainer}>
        <Image 
          source={{ uri: item.service_providers?.logo_url || 'https://via.placeholder.com/60' }} 
          style={styles.providerLogo} 
        />
      </View>
      <View style={styles.agreementDetails}>
        <Text style={styles.agreementTitle}>{item.agreement_title}</Text>
        <Text style={styles.serviceTitle}>{item.services?.title}</Text>
        <Text style={styles.providerName}>{item.service_providers?.business_name}</Text>
        <View style={styles.agreementMeta}>
          <Text style={styles.agreementDate}>
            Signed: {new Date(item.created_at).toLocaleDateString('en-AU')}
          </Text>
          <View style={[styles.statusBadge, item.status === 'signed' ? styles.statusSigned : styles.statusPending]}>
            <Text style={styles.statusText}>{item.status === 'signed' ? 'Active' : 'Pending'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.agreementAction}>
        <Feather name="chevron-right" size={22} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const renderHousingGroup = ({ item }) => (
    <View style={styles.housingCard}>
      <Image source={{ uri: item.image }} style={styles.housingCardImage} />
      <View style={styles.housingCardContent}>
        <Text style={styles.housingCardTitle}>{item.name}</Text>
        <Text style={styles.housingCardDesc}>{item.desc}</Text>
        <Text style={styles.housingCardMembers}>{item.members} members</Text>
      </View>
    </View>
  );

  // Header component with sticky navigation buttons and content tabs
  const HeaderComponent = () => (
    <View>
      <View style={styles.stickyHeader}>
        <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('GroupsListScreen')}>
          <Feather name="users" size={20} color="#007AFF" />
          <Text style={styles.stickerBtnText}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('HousingGroupsScreen')}>
          <Feather name="home" size={20} color="#007AFF" />
          <Text style={styles.stickerBtnText}>Housing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stickerBtn} onPress={() => navigation.navigate('EventsListScreen')}>
          <Feather name="calendar" size={20} color="#007AFF" />
          <Text style={styles.stickerBtnText}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.stickerBtn, styles.addPostBtn]}
          onPress={() => navigation.navigate('CreatePostScreen')}
        >
          <Feather name="plus-circle" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Feather 
            name="layout" 
            size={18} 
            color={activeTab === 'posts' ? '#2E7D32' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>Posts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'agreements' && styles.activeTab]}
          onPress={() => setActiveTab('agreements')}
        >
          <Feather 
            name="file-text" 
            size={18} 
            color={activeTab === 'agreements' ? '#2E7D32' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'agreements' && styles.activeTabText]}>Agreements</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Social"
        navigation={navigation}
        canGoBack={true} 
        onBackPressOverride={handleBackToDashboard}
      />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : activeTab === 'posts' ? (
        posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet.</Text>
            <TouchableOpacity 
              style={styles.createPostButton}
              onPress={() => navigation.navigate('CreatePostScreen')}
            >
              <Text style={styles.createPostButtonText}>Create your first post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={item => item.post_id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feedList}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListHeaderComponent={<HeaderComponent />}
            stickyHeaderIndices={[0]}
          />
        )
      ) : (
        agreements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <HeaderComponent />
            <View style={styles.emptyContentContainer}>
              <Feather name="file-text" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No service agreements yet.</Text>
              <Text style={styles.emptySubtext}>Your signed service agreements will appear here.</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={agreements}
            renderItem={renderAgreement}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.agreementsList}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListHeaderComponent={<HeaderComponent />}
            stickyHeaderIndices={[0]}
          />
        )
      )}

      <Modal
        visible={housingModalVisible}
        transparent={true}
        onRequestClose={() => setHousingModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setHousingModalVisible(false)}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Housing Groups</Text>
              <Pressable style={styles.closeBtn} onPress={() => setHousingModalVisible(false)}>
                <Feather name="x" size={24} color="#333" />
              </Pressable>
            </View>
            <FlatList
              data={dummyHousingGroups}
              renderItem={renderHousingGroup}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 12 }}
            />
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  modalList: {
    padding: 16,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  feedList: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  createPostButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  stickerBtnText: {
    marginLeft: 4,
    color: '#333',
    fontWeight: '500',
  },
  addPostBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 0,
  },
  housingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  housingCardImage: {
    width: 100,
    height: 100,
  },
  housingCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  housingCardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  housingCardDesc: {
    color: '#666',
    marginBottom: 8,
    fontSize: 14,
  },
  housingCardMembers: {
    color: '#007AFF',
    fontSize: 13,
  },
});

export default SocialFeedScreen;
