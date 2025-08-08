import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApplicationItem from './ApplicationItem';
import { getHousingGroupApplications } from '../../services/housingGroupApplicationService';
import { DARK_GREEN, COLORS } from '../../constants/theme';
const MEDIUM_GREY = COLORS.gray; // Using gray from theme
const LIGHT_GREY = COLORS.lightGray; // Using lightGray from theme

const ApplicationsList = ({ housingGroupId, currentUserId, isAdmin, isMember }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'accepted', 'declined', 'left'
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await getHousingGroupApplications(housingGroupId);
      
      // If user is not admin or member, filter to only show their own application
      const filteredData = isAdmin || isMember 
        ? data 
        : data.filter(app => app.applicant_id === currentUserId);
      
      setApplications(filteredData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [housingGroupId]);
  
  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  };
  
  // Handle application processed event
  const handleApplicationProcessed = (processedApp) => {
    setApplications(prevApps => 
      prevApps.map(app => 
        app.id === processedApp.id ? processedApp : app
      )
    );
  };
  
  // Filter applications based on status
  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(app => app.status === filter);
  
  // Render filter chips
  const renderFilterChips = () => {
    const filters = [
      { key: 'all', label: 'All' },
      { key: 'pending', label: 'Pending' },
      { key: 'accepted', label: 'Accepted' },
      { key: 'declined', label: 'Declined' },
      { key: 'left', label: 'Left' }
    ];
    
    return (
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter:</Text>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === item.key ? styles.activeFilterChip : null
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text 
                style={[
                  styles.filterChipText,
                  filter === item.key ? styles.activeFilterChipText : null
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };
  
  // If user is neither admin nor member and has no applications
  if (!isAdmin && !isMember && applications.filter(app => app.applicant_id === currentUserId).length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Applications</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={loading || refreshing}>
          <Ionicons name="refresh" size={24} color={DARK_GREEN} />
        </TouchableOpacity>
      </View>
      
      {/* Only show filters to admins/members */}
      {(isAdmin || isMember) && renderFilterChips()}
      
      {loading ? (
        <ActivityIndicator size="large" color={DARK_GREEN} style={styles.loader} />
      ) : (
        <>
          {filteredApplications.length === 0 ? (
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'No applications found.' 
                : `No ${filter} applications found.`
              }
            </Text>
          ) : (
            <FlatList
              data={filteredApplications}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <ApplicationItem 
                  application={item} 
                  isAdmin={isAdmin} 
                  currentUserId={currentUserId}
                  onApplicationProcessed={handleApplicationProcessed}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterLabel: {
    marginRight: 8,
    fontWeight: '500',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: LIGHT_GREY,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: DARK_GREEN,
  },
  filterChipText: {
    fontSize: 14,
  },
  activeFilterChipText: {
    color: '#FFF',
  },
  listContent: {
    paddingBottom: 24,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: MEDIUM_GREY,
    fontStyle: 'italic',
  },
});

export default ApplicationsList;
