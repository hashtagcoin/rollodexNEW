import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/layout/AppHeader';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

const { width } = Dimensions.get('window');

const RewardsScreen = ({ navigation }) => {
  const [totalPoints, setTotalPoints] = useState(2450);
  const [animatedValue] = useState(new Animated.Value(0));
  const [selectedTab, setSelectedTab] = useState('available');

  useEffect(() => {
    // Animate points counter
    Animated.timing(animatedValue, {
      toValue: totalPoints,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [totalPoints]);

  const animatedPoints = animatedValue.interpolate({
    inputRange: [0, totalPoints],
    outputRange: ['0', totalPoints.toString()],
  });

  const activities = [
    {
      id: 1,
      title: 'Shared app with a friend',
      points: 50,
      date: '2 days ago',
      icon: 'share-social',
      color: '#4CAF50',
      completed: true,
    },
    {
      id: 2,
      title: 'Completed profile',
      points: 100,
      date: '1 week ago',
      icon: 'person-circle',
      color: '#2196F3',
      completed: true,
    },
    {
      id: 3,
      title: 'Booked first service',
      points: 200,
      date: '2 weeks ago',
      icon: 'calendar',
      color: '#FF9800',
      completed: true,
    },
    {
      id: 4,
      title: 'Left a review',
      points: 25,
      date: '3 weeks ago',
      icon: 'star',
      color: '#9C27B0',
      completed: true,
    },
    {
      id: 5,
      title: 'Joined a community group',
      points: 75,
      date: '1 month ago',
      icon: 'people',
      color: '#00BCD4',
      completed: true,
    },
  ];

  const rewards = [
    {
      id: 1,
      title: '$10 Service Discount',
      pointsCost: 500,
      description: 'Get $10 off your next service booking',
      icon: 'pricetag',
      color: '#4CAF50',
      available: true,
    },
    {
      id: 2,
      title: 'Priority Support',
      pointsCost: 1000,
      description: '24/7 priority customer support for 3 months',
      icon: 'headset',
      color: '#2196F3',
      available: true,
    },
    {
      id: 3,
      title: 'Premium Profile Badge',
      pointsCost: 1500,
      description: 'Stand out with a premium badge on your profile',
      icon: 'ribbon',
      color: '#FFD700',
      available: true,
    },
    {
      id: 4,
      title: 'Free Service Consultation',
      pointsCost: 2000,
      description: '1-hour free consultation with any service provider',
      icon: 'chatbubbles',
      color: '#9C27B0',
      available: true,
    },
    {
      id: 5,
      title: 'VIP Event Access',
      pointsCost: 3000,
      description: 'Exclusive access to NDIS community events',
      icon: 'ticket',
      color: '#FF5722',
      available: false,
    },
  ];

  const earnMoreWays = [
    { title: 'Invite a friend', points: 50, icon: 'person-add' },
    { title: 'Complete a booking', points: 200, icon: 'checkmark-circle' },
    { title: 'Write a review', points: 25, icon: 'star' },
    { title: 'Update your profile', points: 10, icon: 'create' },
    { title: 'Join a group', points: 75, icon: 'people' },
  ];

  const renderPointsCard = () => (
    <LinearGradient
      colors={['#1E90FF', '#4A6FA5']}
      style={styles.pointsCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.pointsCardContent}>
        <Text style={styles.pointsLabel}>Your Loyalty Points</Text>
        <Animated.Text style={styles.pointsValue}>
          {animatedPoints}
        </Animated.Text>
        <Text style={styles.pointsSubtext}>Keep earning to unlock rewards!</Text>
      </View>
      <MaterialCommunityIcons name="trophy" size={80} color="rgba(255, 255, 255, 0.3)" style={styles.trophyIcon} />
    </LinearGradient>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'available' && styles.activeTab]}
        onPress={() => setSelectedTab('available')}
      >
        <Text style={[styles.tabText, selectedTab === 'available' && styles.activeTabText]}>
          Available Rewards
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
        onPress={() => setSelectedTab('history')}
      >
        <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>
          Points History
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRewardItem = (reward) => {
    const canRedeem = totalPoints >= reward.pointsCost;
    
    return (
      <TouchableOpacity
        key={reward.id}
        style={[styles.rewardCard, !canRedeem && styles.disabledCard]}
        disabled={!canRedeem}
      >
        <View style={[styles.rewardIcon, { backgroundColor: `${reward.color}20` }]}>
          <Ionicons name={reward.icon} size={24} color={reward.color} />
        </View>
        <View style={styles.rewardContent}>
          <Text style={styles.rewardTitle}>{reward.title}</Text>
          <Text style={styles.rewardDescription}>{reward.description}</Text>
          <View style={styles.rewardFooter}>
            <Text style={[styles.rewardPoints, !canRedeem && styles.disabledText]}>
              {reward.pointsCost} points
            </Text>
            {canRedeem ? (
              <TouchableOpacity style={styles.redeemButton}>
                <Text style={styles.redeemButtonText}>Redeem</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.insufficientPoints}>
                Need {reward.pointsCost - totalPoints} more points
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderActivityItem = (activity) => (
    <View key={activity.id} style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
        <Ionicons name={activity.icon} size={20} color={activity.color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityDate}>{activity.date}</Text>
      </View>
      <Text style={styles.activityPoints}>+{activity.points}</Text>
    </View>
  );

  const renderEarnMore = () => (
    <View style={styles.earnMoreSection}>
      <Text style={styles.sectionTitle}>Earn More Points</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {earnMoreWays.map((way, index) => (
          <TouchableOpacity key={index} style={styles.earnCard}>
            <Ionicons name={way.icon} size={32} color={COLORS.primary} />
            <Text style={styles.earnCardTitle}>{way.title}</Text>
            <Text style={styles.earnCardPoints}>+{way.points} pts</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Rewards & Loyalty" navigation={navigation} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderPointsCard()}
        {renderTabs()}
        
        {selectedTab === 'available' ? (
          <>
            <View style={styles.rewardsSection}>
              {rewards.map(renderRewardItem)}
            </View>
            {renderEarnMore()}
          </>
        ) : (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {activities.map(renderActivityItem)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  pointsCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  pointsCardContent: {
    zIndex: 1,
  },
  pointsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pointsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  trophyIcon: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  rewardsSection: {
    paddingHorizontal: 16,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  disabledCard: {
    opacity: 0.6,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  disabledText: {
    color: '#999',
  },
  redeemButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  insufficientPoints: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  historySection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  activityItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  activityPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  earnMoreSection: {
    marginTop: 24,
    paddingBottom: 16,
  },
  earnCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    width: 120,
    alignItems: 'center',
    elevation: 2,
  },
  earnCardTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  earnCardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
  },
});

export default RewardsScreen;