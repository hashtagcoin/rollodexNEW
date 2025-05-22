import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, Modal, Pressable, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import AppHeader from '../../components/layout/AppHeader';
import { getUserClaims } from '../../services/claimsService';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

const ClaimCard = ({ claim, onViewDocument }) => (
  <View style={styles.card}>
    <View style={styles.rowBetween}>
      <Text style={styles.title}>{claim.claim_title}</Text>
      <Text style={[styles.status, styles[`status_${claim.status}`]]}>{claim.status}</Text>
    </View>
    <Text style={styles.desc}>{claim.claim_description}</Text>
    <View style={styles.rowBetween}>
      <Text style={styles.amount}>${claim.amount}</Text>
      <Text style={styles.date}>{claim.service_date}</Text>
    </View>
    <Text style={styles.category}>{claim.ndis_category}</Text>
    <TouchableOpacity onPress={() => claim.document_url ? onViewDocument(claim.document_url) : null}>
      <Text style={styles.docLink}>{claim.document_url ? 'View Document' : ''}</Text>
    </TouchableOpacity>
  </View>
);

export default function ViewClaimsScreen({ navigation }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [docUrl, setDocUrl] = useState(null);
  const [downloading, setDownloading] = useState(false);

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
      const fileUri = FileSystem.documentDirectory + docUrl.split('/').pop();
      const downloadResumable = FileSystem.createDownloadResumable(docUrl, fileUri);
      await downloadResumable.downloadAsync();
      Alert.alert('Downloaded', 'File saved to: ' + fileUri);
    } catch (e) {
      Alert.alert('Error', 'Could not download file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.filterBar}>
        {STATUS_FILTERS.map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterBtn, filter === status && styles.filterBtnActive]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>{status}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredClaims}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <ClaimCard claim={item} onViewDocument={handleViewDocument} />}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchClaims}
        ListEmptyComponent={<Text style={styles.empty}>No claims found.</Text>}
      />
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
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={{fontWeight:'bold',fontSize:18}}>×</Text>
              </Pressable>
            </View>
            {docUrl ? (
              <WebView
                source={{ uri: docUrl }}
                style={styles.webview}
                originWhitelist={['*']}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.white}}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={{marginTop:12,color:COLORS.text}}>Loading document...</Text>
                  </View>
                )}
                onError={() => (
                  <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.white}}>
                    <Text style={{color:COLORS.error}}>Could not load document.</Text>
                  </View>
                )}
              />
            ) : (
              <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.white}}>
                <Text style={{color:COLORS.text}}>No document to display.</Text>
              </View>
            )}
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} disabled={downloading}>
              <Text style={styles.downloadBtnText}>{downloading ? 'Downloading...' : 'Download'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 12,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.lightGrey,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...FONTS.body4,
    color: COLORS.text,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 12,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...FONTS.h4,
    color: COLORS.primary,
  },
  status: {
    ...FONTS.body4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  status_pending: {
    backgroundColor: '#ffe9a7',
    color: '#b68900',
  },
  status_approved: {
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
