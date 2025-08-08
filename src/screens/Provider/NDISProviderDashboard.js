import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import AppHeader from '../../components/layout/AppHeader';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, FONTS } from '../../constants/theme';
import { useUser } from '../../context/UserContext';

const { width: screenWidth } = Dimensions.get('window');

// NDIS Support Categories
const SUPPORT_CATEGORIES = [
  { id: 'core', name: 'Core Supports', color: '#34C759', icon: 'heart-outline' },
  { id: 'capacity', name: 'Capacity Building', color: '#007AFF', icon: 'trending-up-outline' },
  { id: 'capital', name: 'Capital Supports', color: '#FF9500', icon: 'business-outline' }
];

const RegistrationCard = ({ registration }) => {
  const getDaysUntilRenewal = (renewalDate) => {
    if (!renewalDate) return null;
    return differenceInDays(parseISO(renewalDate), new Date());
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#34C759';
      case 'pending': return '#FF9500';
      case 'expired': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const renewalDays = getDaysUntilRenewal(registration?.renewal_date);

  return (
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.registrationCard}
    >
      <View style={styles.registrationHeader}>
        <View style={styles.registrationIconContainer}>
          <MaterialCommunityIcons name="shield-check" size={32} color="#FFFFFF" />
        </View>
        <View style={styles.registrationInfo}>
          <Text style={styles.registrationTitle}>NDIS Registration</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(registration?.status) }]}>
            <Text style={styles.statusText}>{registration?.status || 'Not Registered'}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.registrationDetails}>
        <View style={styles.registrationRow}>
          <Text style={styles.registrationLabel}>Registration Number</Text>
          <Text style={styles.registrationValue}>{registration?.number || 'N/A'}</Text>
        </View>
        <View style={styles.registrationRow}>
          <Text style={styles.registrationLabel}>Next Renewal</Text>
          <Text style={styles.registrationValue}>
            {renewalDays !== null ? (
              renewalDays > 0 ? `${renewalDays} days` : 'Overdue'
            ) : 'N/A'}
          </Text>
        </View>
      </View>
      
      {renewalDays !== null && renewalDays <= 30 && (
        <View style={styles.renewalWarning}>
          <Ionicons name="warning" size={16} color="#FCD34D" />
          <Text style={styles.renewalWarningText}>
            {renewalDays > 0 ? 'Renewal due soon' : 'Registration expired'}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
};

const QuickActionCard = ({ icon, iconType, title, subtitle, onPress, color, backgroundColor }) => (
  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor }]} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
      {iconType === 'MaterialIcons' ? (
        <MaterialIcons name={icon} size={24} color={color} />
      ) : iconType === 'MaterialCommunityIcons' ? (
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      ) : iconType === 'FontAwesome5' ? (
        <FontAwesome5 name={icon} size={24} color={color} />
      ) : (
        <Ionicons name={icon} size={24} color={color} />
      )}
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
    <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
  </TouchableOpacity>
);

const ParticipantCard = ({ participant, onPress }) => {
  const getTotalBudget = () => {
    const core = participant.core_budget || 0;
    const capacity = participant.capacity_budget || 0;
    const capital = participant.capital_budget || 0;
    return core + capacity + capital;
  };

  const getUtilizationPercentage = () => {
    const total = getTotalBudget();
    const used = participant.budget_used || 0;
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  return (
    <TouchableOpacity style={styles.participantCard} onPress={() => onPress(participant)}>
      <View style={styles.participantHeader}>
        <View style={styles.participantAvatar}>
          <Ionicons name="person" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{participant.name}</Text>
          <Text style={styles.participantId}>NDIS: {participant.ndis_number}</Text>
        </View>
        <View style={styles.participantStatus}>
          <View style={[styles.planStatusDot, { 
            backgroundColor: participant.plan_status === 'active' ? '#34C759' : '#FF9500' 
          }]} />
        </View>
      </View>
      
      <View style={styles.budgetOverview}>
        <Text style={styles.budgetLabel}>Plan Budget</Text>
        <Text style={styles.budgetAmount}>${getTotalBudget().toLocaleString()}</Text>
        
        <View style={styles.utilizationBar}>
          <View 
            style={[styles.utilizationFill, { width: `${getUtilizationPercentage()}%` }]} 
          />
        </View>
        <Text style={styles.utilizationText}>{getUtilizationPercentage()}% utilized</Text>
      </View>
      
      <View style={styles.supportCategories}>
        {SUPPORT_CATEGORIES.map(category => (
          <View key={category.id} style={styles.categoryChip}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <Text style={styles.categoryText}>
              ${participant[`${category.id}_budget`] || 0}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const StatsCard = ({ title, value, subtitle, icon, color, onPress }) => (
  <TouchableOpacity style={styles.statsCard} onPress={onPress}>
    <LinearGradient
      colors={[color, color + 'CC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statsGradient}
    >
      <View style={styles.statsIcon}>
        <Ionicons name={icon} size={28} color="#FFFFFF" />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
      <Text style={styles.statsSubtitle}>{subtitle}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const NDISProviderDashboard = () => {
  const navigation = useNavigation();
  const { profile } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeClaims: 0,
    monthlyRevenue: 0,
    complianceScore: 0
  });

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async (isRefreshing = false) => {
    if (!profile?.id) return;
    
    if (!isRefreshing) setLoading(true);
    
    try {
      // Mock data for demonstration - replace with real Supabase queries
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setRegistration({
        status: 'Active',
        number: 'REG-' + profile.id.slice(0, 8).toUpperCase(),
        renewal_date: addDays(new Date(), 45).toISOString(),
        compliance_score: 95
      });
      
      setParticipants([
        {
          id: '1',
          name: 'Sarah Johnson',
          ndis_number: '123456789',
          plan_status: 'active',
          core_budget: 15000,
          capacity_budget: 8000,
          capital_budget: 5000,
          budget_used: 12000
        },
        {
          id: '2',
          name: 'Michael Chen',
          ndis_number: '987654321',
          plan_status: 'active',
          core_budget: 20000,
          capacity_budget: 12000,
          capital_budget: 8000,
          budget_used: 18000
        }
      ]);
      
      setStats({
        totalParticipants: 2,
        activeClaims: 5,
        monthlyRevenue: 8500,
        complianceScore: 95
      });
      
    } catch (error) {
      console.error('Error loading NDIS dashboard data:', error);
      Alert.alert('Error', 'Failed to load NDIS data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(true);
  };

  const handleParticipantPress = (participant) => {
    Alert.alert(
      'Participant Details',
      `View detailed information for ${participant.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => {
          // Navigate to participant detail screen
          console.log('Navigate to participant details:', participant.id);
        }}
      ]
    );
  };

  const quickActions = [
    {
      icon: 'receipt',
      iconType: 'Ionicons',
      title: 'Submit Claims',
      subtitle: 'Process service claims',
      color: '#34C759',
      backgroundColor: '#FFFFFF',
      onPress: () => Alert.alert('Submit Claims', 'Navigate to claims submission')
    },
    {
      icon: 'people',
      iconType: 'Ionicons',
      title: 'Participants',
      subtitle: 'Manage participant plans',
      color: '#007AFF',
      backgroundColor: '#FFFFFF',
      onPress: () => Alert.alert('Participants', 'Navigate to participant management')
    },
    {
      icon: 'document-text',
      iconType: 'Ionicons',
      title: 'Service Agreements',
      subtitle: 'Create & manage agreements',
      color: '#FF9500',
      backgroundColor: '#FFFFFF',
      onPress: () => Alert.alert('Service Agreements', 'Navigate to agreements')
    },
    {
      icon: 'chart-bar',
      iconType: 'FontAwesome5',
      title: 'Reports',
      subtitle: 'Compliance & outcomes',
      color: '#8B5CF6',
      backgroundColor: '#FFFFFF',
      onPress: () => Alert.alert('Reports', 'Navigate to reporting dashboard')
    },
    {
      icon: 'cash',
      iconType: 'Ionicons',
      title: 'Price Guide',
      subtitle: 'Current NDIS prices',
      color: '#10B981',
      backgroundColor: '#FFFFFF',
      onPress: () => Alert.alert('Price Guide', 'Navigate to NDIS price guide')
    },
    {
      icon: 'school',
      iconType: 'Ionicons',
      title: 'Training',
      subtitle: 'Compliance resources',
      color: '#F59E0B',
      backgroundColor: '#FFFFFF',
      onPress: () => Alert.alert('Training', 'Navigate to training resources')
    }
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="NDIS Provider Hub"
          navigation={navigation}
          canGoBack={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading NDIS dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="NDIS Provider Hub"
        navigation={navigation}
        canGoBack={true}
      />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Registration Status */}
        <View style={styles.section}>
          <RegistrationCard registration={registration} />
        </View>
        
        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Participants"
              value={stats.totalParticipants.toString()}
              subtitle="Active plans"
              icon="people"
              color="#007AFF"
              onPress={() => Alert.alert('Participants', 'View all participants')}
            />
            <StatsCard
              title="Claims"
              value={stats.activeClaims.toString()}
              subtitle="Pending"
              icon="receipt"
              color="#34C759"
              onPress={() => Alert.alert('Claims', 'View pending claims')}
            />
            <StatsCard
              title="Revenue"
              value={`$${stats.monthlyRevenue.toLocaleString()}`}
              subtitle="This month"
              icon="trending-up"
              color="#FF9500"
              onPress={() => Alert.alert('Revenue', 'View revenue details')}
            />
            <StatsCard
              title="Compliance"
              value={`${stats.complianceScore}%`}
              subtitle="Score"
              icon="shield-checkmark"
              color="#8B5CF6"
              onPress={() => Alert.alert('Compliance', 'View compliance details')}
            />
          </View>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} {...action} />
            ))}
          </View>
        </View>
        
        {/* Active Participants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Participants</Text>
            <TouchableOpacity onPress={() => Alert.alert('View All', 'Navigate to all participants')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {participants.map(participant => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              onPress={handleParticipantPress}
            />
          ))}
        </View>
        
        {/* NDIS Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources & Support</Text>
          <View style={styles.resourcesContainer}>
            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="file-document" size={24} color="#007AFF" />
              <Text style={styles.resourceTitle}>Policy Updates</Text>
              <Text style={styles.resourceSubtitle}>Latest NDIS changes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resourceCard}>
              <MaterialIcons name="support-agent" size={24} color="#34C759" />
              <Text style={styles.resourceTitle}>Provider Support</Text>
              <Text style={styles.resourceSubtitle}>Get help & guidance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="calculator" size={24} color="#FF9500" />
              <Text style={styles.resourceTitle}>Budget Calculator</Text>
              <Text style={styles.resourceSubtitle}>Plan budget tools</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...FONTS.body3,
    color: '#666',
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    ...FONTS.h4,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  viewAllText: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '500',
  },
  registrationCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  registrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  registrationIconContainer: {
    marginRight: 12,
  },
  registrationInfo: {
    flex: 1,
  },
  registrationTitle: {
    ...FONTS.body2,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...FONTS.body5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  registrationDetails: {
    gap: 8,
  },
  registrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  registrationLabel: {
    ...FONTS.body4,
    color: 'rgba(255,255,255,0.8)',
  },
  registrationValue: {
    ...FONTS.body4,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  renewalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    borderRadius: 8,
  },
  renewalWarningText: {
    ...FONTS.body5,
    color: '#FCD34D',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statsCard: {
    width: (screenWidth - 44) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statsIcon: {
    marginBottom: 8,
  },
  statsValue: {
    ...FONTS.h2,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsTitle: {
    ...FONTS.body4,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: 2,
  },
  statsSubtitle: {
    ...FONTS.body5,
    color: 'rgba(255,255,255,0.7)',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickActionCard: {
    width: (screenWidth - 44) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    ...FONTS.body4,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    ...FONTS.body5,
    color: '#666',
    textAlign: 'center',
  },
  participantCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    ...FONTS.body3,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  participantId: {
    ...FONTS.body5,
    color: '#666',
  },
  participantStatus: {
    alignItems: 'center',
  },
  planStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  budgetOverview: {
    marginBottom: 16,
  },
  budgetLabel: {
    ...FONTS.body5,
    color: '#666',
    marginBottom: 4,
  },
  budgetAmount: {
    ...FONTS.body2,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  utilizationBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginBottom: 4,
  },
  utilizationFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  utilizationText: {
    ...FONTS.body5,
    color: '#666',
  },
  supportCategories: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    ...FONTS.body5,
    color: '#666',
    fontWeight: '500',
  },
  resourcesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  resourceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  resourceTitle: {
    ...FONTS.body4,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  resourceSubtitle: {
    ...FONTS.body5,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default NDISProviderDashboard;