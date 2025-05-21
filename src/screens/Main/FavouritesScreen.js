import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/layout/AppHeader';

const dummyFavourites = [
  { id: '1', type: 'Group', title: 'Social Group', desc: 'NDIS Social Community' },
  { id: '2', type: 'Service', title: 'Physio Clinic', desc: 'Therapy for mobility' },
  { id: '3', type: 'Event', title: 'BBQ Meetup', desc: 'Meet other participants' },
  { id: '4', type: 'Housing', title: '2BR Accessible Unit', desc: 'Wheelchair accessible, central' },
  { id: '5', type: 'Housing Group', title: 'Supported Living', desc: 'SIL with 24/7 support' },
  { id: '6', type: 'Group', title: 'Book Club', desc: 'Monthly reading group' },
];

const FavouritesScreen = () => {
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState('All');
  const filteredFavourites = selectedType === 'All' ? dummyFavourites : dummyFavourites.filter(f => f.type === selectedType);

  const handleBackToDashboard = () => {
    navigation.navigate('DashboardScreen');
  };

  return (
    <View style={styles.screenContainer}>
      <AppHeader 
        title="Favourites"
        navigation={navigation}
        canGoBack={true} 
        onBackPressOverride={handleBackToDashboard}
      />
      {/* Filter section */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 10}} style={styles.filterScroll}>
          {['All', 'Group', 'Service', 'Event', 'Housing', 'Housing Group'].map(type => (
            <Text
              key={type}
              style={[
                styles.filterChip,
                selectedType === type && styles.filterChipActive
              ]}
              onPress={() => setSelectedType(type)}
            >
              {type}
            </Text>
          ))}
        </ScrollView>
      </View>
      {/* Favourites list */}
      <FlatList
        data={filteredFavourites}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardType}>{item.type}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 18, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>No favourites found.</Text>}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  screenContainer: { 
    flex: 1,
    backgroundColor: '#F8F7F3', 
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#f1f1f1',
    marginBottom: 2,
  },
  filterScroll: {
    backgroundColor: '#fff',
    paddingVertical: 4,
    marginBottom: 0,
  },
  filterChip: {
    backgroundColor: '#f2f4fa',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e3e9f2',
    color: '#555',
    fontWeight: '600',
    fontSize: 15,
    overflow: 'hidden',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cardType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 16,
  },
});

export default FavouritesScreen;
