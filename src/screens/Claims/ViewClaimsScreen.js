import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, Modal, Pressable, ActivityIndicator, Image, Platform } from 'react-native';
import { Alert } from '../../utils/alert';

import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserClaims } from '../../services/claimsService';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

const STATUS_FILTERS = [
  { id: 'All', label: 'All Claims', icon: 'documents-outline' },
  { id: 'Pending', label: 'Pending', icon: 'time-outline' },
  { id: 'Approved', label: 'Approved', icon: 'checkmark-circle-outline' },
  { id: 'Rejected', label: 'Rejected', icon: 'close-circle-outline' }
];

const ClaimCard = ({ claim, onViewDocument }) => {
  // Get appropriate status icon and color
  const getStatusInfo = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return { icon: 'time-outline', color: '#F5A623' };
      case 'approved':
        return { icon: 'checkmark-circle-outline', color: '#4CD964' };
      case 'rejected':
        return { icon: 'close-circle-outline', color: '#FF3B30' };
      default:
        return { icon: 'help-circle-outline', color: '#8E8E93' };
    }
  };

  const statusInfo = getStatusInfo(claim.status);
  const hasDocument = claim.document_url && claim.document_url.length > 0;

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusIndicator}>
          <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {claim.status || 'Unknown'}
          </Text>
        </View>
        <Text style={styles.date}>{claim.service_date}</Text>
      </View>

      <Text style={styles.title}>{claim.claim_title}</Text>
      
      <Text style={styles.desc} numberOfLines={2}>{claim.claim_description}</Text>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.amount}>${parseFloat(claim.amount).toFixed(2)}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.category}>{claim.ndis_category}</Text>
        </View>
      </View>

      {hasDocument && (
        <TouchableOpacity 
          onPress={() => onViewDocument(claim.document_url)}
          style={styles.documentButton}
        >
          <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
          <Text style={styles.docLink}>View Document</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default function ViewClaimsScreen({ navigation }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [docUrl, setDocUrl] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    const allClaims = await getUserClaims();
    setClaims(allClaims);
    setLoading(false);
  };

  const filteredClaims = filter === 'All'
    ? claims
    : claims.filter(c => c.status && c.status.toLowerCase() === filter.toLowerCase());

  const handleViewDocument = (url) => {
    setDocUrl(url);
    setModalVisible(true);
  };

  const handleDownload = async () => {
    if (!docUrl) return;
    try {
      setDownloading(true);
      setDownloadProgress(0);
      
      const fileUri = FileSystem.documentDirectory + docUrl.split('/').pop();
      const callback = (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
      };
      
      const downloadResumable = FileSystem.createDownloadResumable(
        docUrl, 
        fileUri,
        {},
        callback
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      Alert.alert('Success', 'Document downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Could not download the document. Please try again.');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterBtn, filter === item.id && styles.filterBtnActive]}
              onPress={() => setFilter(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={item.icon} 
                size={16} 
                color={filter === item.id ? '#FFFFFF' : COLORS.gray} 
              />
              <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Claims List */}
      <FlatList
        data={filteredClaims}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => (
          <ClaimCard claim={item} onViewDocument={handleViewDocument} />
        )}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchClaims}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#DADADA" />
            <Text style={styles.emptyTitle}>No claims found</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'All' 
                ? `You don't have any ${filter.toLowerCase()} claims yet.` 
                : "You haven't submitted any claims yet."}
            </Text>
          </View>
        }
      />

      {/* Add Claim Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('SubmitClaim')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      {/* Document Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Document Preview</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)} 
                style={styles.modalCloseBtn}
                hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
              >
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            {docUrl ? (
              <WebView
                source={{ uri: docUrl }}
                style={styles.webview}
                originWhitelist={['*']}
                startInLoadingState={true}
                scrollEnabled={true}
                scalesPageToFit={Platform.OS === 'android'}
                domStorageEnabled={true}
                javaScriptEnabled={true}
                bounces={false}
                overScrollMode={'never'}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={true}
                nestedScrollEnabled={true}
                webviewDebuggingEnabled={true}
                renderLoading={() => (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loaderText}>Loading document...</Text>
                  </View>
                )}
                onError={() => (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
                    <Text style={styles.errorText}>Could not load document</Text>
                  </View>
                )}
              />
            ) : (
              <View style={styles.noDocContainer}>
                <Ionicons name="document-outline" size={48} color="#8E8E93" />
                <Text style={styles.noDocText}>No document to display</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.downloadBtn, downloading && styles.downloadingBtn]} 
              onPress={handleDownload} 
              disabled={downloading || !docUrl}
            >
              {downloading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.downloadBtnText}>
                    {Math.round(downloadProgress * 100)}%
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.downloadBtnText}>Download Document</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Filter styles
  filterContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 6,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Claims list styles
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtitle: {
    ...FONTS.body4,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 24,
  },
  
  // Claim card styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    ...FONTS.body4,
    marginLeft: 4,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  title: {
    ...FONTS.h3,
    color: '#333',
    marginBottom: 8,
  },
  desc: {
    ...FONTS.body4,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...FONTS.body5,
    color: '#8E8E93',
    marginBottom: 4,
  },
  amount: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontWeight: '600',
  },
  date: {
    ...FONTS.body4,
    color: '#8E8E93',
  },
  category: {
    ...FONTS.body4,
    color: '#666',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    marginTop: 4,
  },
  docLink: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  // Add button styles
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modalOverlay: {
    backgroundColor: '#caffc7',
    color: '#2e7d32',
  },
  status_rejected: {
    backgroundColor: '#ffd6d6',
    color: '#c62828',
  },
  desc: {
    ...FONTS.body5,
    color: COLORS.text,
    marginVertical: 8,
  },
  amount: {
    ...FONTS.h5,
    color: COLORS.secondary,
  },
  date: {
    ...FONTS.body5,
    color: COLORS.text,
  },
  category: {
    ...FONTS.body5,
    color: COLORS.info,
    marginTop: 4,
  },
  docLink: {
    ...FONTS.body5,
    color: COLORS.link,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  empty: {
    ...FONTS.body4,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '96%',
    height: '88%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 0,
    overflow: 'hidden',
    elevation: 6,
    display: 'flex',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
    backgroundColor: COLORS.background,
    zIndex: 2,
  },
  modalTitle: {
    ...FONTS.h4,
    color: COLORS.primary,
    flex: 1,
    textAlign: 'center',
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: 8,
    zIndex: 3,
  },
  webview: {
    flex: 1,
    width: '100%',
    minHeight: 300,
    backgroundColor: COLORS.white,
  },
  downloadBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    width: '100%',
  },
  downloadBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
