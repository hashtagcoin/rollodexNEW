import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; 
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';
import SearchComponent from '../../components/common/SearchComponent';
import AppHeader from '../../components/layout/AppHeader';
import ServiceCardComponent from '../../components/cards/ServiceCard';
import HousingCardComponent from '../../components/cards/HousingCard';

const { width } = Dimensions.get('window');

const FavouritesScreen = () => { 
  const navigation = useNavigation(); 
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('List');
  const [sortConfig, setSortConfig] = useState({ field: 'favorited_at', direction: 'desc' });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const categories = ['All', 'Services', 'Events', 'Housing', 'Groups', 'Housing Groups']; 
  const PAGE_SIZE = 10;

  const mapCategoryToItemType = (category) => {
    switch (category) {
      case 'Services':
        return 'service_provider';
      case 'Events':
        return 'group_events';
      case 'Housing': 
        return 'housing_listing';
      case 'Groups':
        return 'group';
      case 'Housing Groups':
        return 'housing_group';
      default:
        return null; 
    }
  };

  const fetchFavorites = async (pageNum = 0, isRefreshing = false) => {
    console.log(`[FavouritesScreen] fetchFavorites called. Page: ${pageNum}, Refreshing: ${isRefreshing}, Loading: ${loading}, HasMore: ${hasMore}`);
    if ((!isRefreshing && loading) || (pageNum > 0 && !hasMore)) {
      console.log('[FavouritesScreen] fetchFavorites: Bailing out due to loading or no more data.');
      return;
    }

    try {
      if (pageNum === 0) {
        console.log('[FavouritesScreen] fetchFavorites: Setting loading to true (pageNum is 0).');
        setLoading(true);
      } else {
        console.log('[FavouritesScreen] fetchFavorites: Setting loadingMore to true.');
        setLoadingMore(true);
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[FavouritesScreen] fetchFavorites: User error or no user.', userError);
        throw userError || new Error('No authenticated user');
      }
      console.log(`[FavouritesScreen] fetchFavorites: User ID: ${user.id}`);

      let query = supabase
        .from('user_favorites_detailed')
        .select('*')
        .eq('user_id', user.id);

      const dbItemType = mapCategoryToItemType(selectedCategory);
      if (dbItemType) {
        query = query.eq('item_type', dbItemType);
        console.log(`[FavouritesScreen] fetchFavorites: Applied category filter: ${selectedCategory} -> ${dbItemType}`);
      } else {
        console.log('[FavouritesScreen] fetchFavorites: No category filter (All selected).');
      }

      if (searchTerm) {
        query = query.ilike('item_title', `%${searchTerm}%`);
        console.log(`[FavouritesScreen] fetchFavorites: Applied search term: ${searchTerm}`);
      }

      if (sortConfig.field) {
        query = query.order(sortConfig.field, { ascending: sortConfig.direction === 'asc' });
        console.log(`[FavouritesScreen] fetchFavorites: Applied sort: ${sortConfig.field} ${sortConfig.direction}`);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);
      console.log(`[FavouritesScreen] fetchFavorites: Applied range: ${from} to ${to}`);

      const { data, error, count } = await query;
      console.log('[FavouritesScreen] fetchFavorites: Query executed.');

      if (error) {
        console.error('[FavouritesScreen] fetchFavorites: Supabase query error:', error);
        throw error;
      }
      console.log(`[FavouritesScreen] fetchFavorites: Received data (length: ${data ? data.length : 0}), Count: ${count}`);

      const favoritesWithAppStatus = await Promise.all(
        data.map(async (favorite) => {
          if (favorite.item_type === 'housing_group') {
            const { data: appData, error: appError } = await supabase
              .from('housing_applications')
              .select('status')
              .eq('user_id', user.id)
              .eq('listing_id', favorite.item_id)
              .single();

            if (!appError && appData) {
              return { ...favorite, application_status: appData.status };
            }
            if (appError) {
              console.warn(`[FavouritesScreen] fetchFavorites: Error fetching app status for ${favorite.item_id}:`, appError);
            }
          }
          return favorite;
        })
      );

      setFavorites(prev => {
        const newFavorites = isRefreshing || pageNum === 0 ? favoritesWithAppStatus : [...prev, ...favoritesWithAppStatus];
        console.log(`[FavouritesScreen] fetchFavorites: Updating favorites state. Prev length: ${prev.length}, New data length: ${favoritesWithAppStatus.length}, Resulting length: ${newFavorites.length}`);
        return newFavorites;
      });
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
      console.log(`[FavouritesScreen] fetchFavorites: State updated. HasMore: ${data.length === PAGE_SIZE}, Page: ${pageNum}`);

    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      console.log('[FavouritesScreen] fetchFavorites: Setting loading/refreshing/loadingMore to false.');
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('[FavouritesScreen] onRefresh called.');
    setRefreshing(true);
    fetchFavorites(0, true);
  }, [selectedCategory, searchTerm, sortConfig]);

  const loadMore = useCallback(() => {
    console.log(`[FavouritesScreen] loadMore called. Loading: ${loading}, LoadingMore: ${loadingMore}, HasMore: ${hasMore}`);
    if (!loading && !loadingMore && hasMore) {
      fetchFavorites(page + 1);
    }
  }, [page, loading, loadingMore, hasMore, fetchFavorites]);

  useFocusEffect(
    useCallback(() => {
      console.log('[FavouritesScreen] useFocusEffect triggered. Dependencies:');
      console.log('  selectedCategory:', selectedCategory);
      console.log('  searchTerm:', searchTerm);
      console.log('  sortConfig:', sortConfig);
      fetchFavorites(0, true);
      return () => {
        console.log('[FavouritesScreen] useFocusEffect cleanup.');
      };
    }, [selectedCategory, searchTerm, sortConfig])
  );

  const toggleFavorite = async (itemId, itemType) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', supabase.auth.user()?.id)
        .eq('item_id', itemId)
        .eq('item_type', itemType);

      if (error) throw error;

      setFavorites(prev => prev.filter(item => !(item.item_id === itemId && item.item_type === itemType)));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const renderItem = ({ item }) => {
    console.log('[FavouritesScreen] renderItem called for item:', JSON.stringify(item, null, 2));
    const commonCardProps = {
      onPress: () => {
        if (item.item_type === 'service_provider' && item.item_id) {
          console.log(`[FavouritesScreen] Navigating to ServiceDetail for ID: ${item.item_id}`);
          navigation.navigate('ServiceDetail', { serviceId: item.item_id });
        } else if (item.item_type === 'housing_listing' && item.item_id) {
          console.log(`[FavouritesScreen] Navigating to HousingDetail for ID: ${item.item_id}`);
          const housingItemForNav = {
            id: item.item_id,
            title: item.item_title,
            suburb: item.housing_suburb,
            rent_amount: item.housing_weekly_rent,
            rent_frequency: 'week',
            bedrooms: item.housing_bedrooms,
            bathrooms: item.housing_bathrooms,
            property_type: item.housing_property_type,
            media_urls: item.item_image_url ? [item.item_image_url] : [],
            available_from: item.housing_availability_date,
          };
          navigation.navigate('HousingDetail', { item: housingItemForNav }); 
        } else if (item.item_type === 'group_events' && item.item_id) { 
          console.log(`[FavouritesScreen] Navigating to EventDetail for ID: ${item.item_id}`);
          navigation.navigate('EventDetail', { eventId: item.item_id });
        } else if (item.item_type === 'group' && item.item_id) {
          console.log(`[FavouritesScreen] Navigating to GroupDetail for ID: ${item.item_id}`);
          navigation.navigate('GroupDetail', { groupId: item.item_id });
        } else if (item.item_type === 'housing_group' && item.item_id) {
          console.log(`[FavouritesScreen] Navigating to HousingGroupDetail for ID: ${item.item_id}`);
          navigation.navigate('HousingGroupDetail', { groupId: item.item_id }); 
        }
      },
      isFavorited: true,
      onToggleFavorite: () => toggleFavorite(item.item_id, item.item_type),
      displayAs: viewMode === 'Grid' ? 'grid' : 'list',
    };

    switch (item.item_type) {
      case 'service_provider':
        const serviceCardItem = {
          id: item.item_id,
          title: item.item_title || 'Service Title',
          description: item.item_description || 'No description available.',
          media_urls: item.item_image_url ? [item.item_image_url] : [], 
          category: item.service_category || 'Service',         
          price: item.service_price,                          
          rating: item.service_rating,                        
          reviews: item.service_reviews,                      
          address_suburb: item.service_address_suburb,        
        };
        console.log('[FavouritesScreen] Rendering ServiceCardComponent with item:', JSON.stringify(serviceCardItem, null, 2));
        return <ServiceCardComponent item={serviceCardItem} {...commonCardProps} />;
      
      case 'housing_listing': 
        const housingCardItem = {
          id: item.item_id,
          title: item.item_title || 'Housing Title',
          media_urls: item.item_image_url ? [item.item_image_url] : [], 
          suburb: item.housing_suburb || 'Suburb N/A',
          rent_amount: item.housing_weekly_rent, 
          rent_frequency: 'week', 
          bedrooms: item.housing_bedrooms,
          bathrooms: item.housing_bathrooms,
          property_type: item.housing_property_type,
          available_from: item.housing_availability_date, 
        };
        console.log('[FavouritesScreen] Rendering HousingCardComponent with item:', JSON.stringify(housingCardItem, null, 2));
        return <HousingCardComponent item={housingCardItem} {...commonCardProps} />;

      case 'group_events': 
        console.log('[FavouritesScreen] Rendering local EventCard for item:', JSON.stringify(item, null, 2));
        return (
          <View style={styles.cardContainer}>
            <Image source={{ uri: item.item_image_url || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
            <Text style={styles.cardTitle}>{item.item_title || 'Event Title'}</Text>
            <Text>{item.event_location?.description || item.event_location?.address || 'Location TBD'}</Text> 
            <Text>{new Date(item.event_start_time).toLocaleString()}</Text>
            <TouchableOpacity onPress={() => toggleFavorite(item.item_id, item.item_type)} style={styles.favButton}>
              <Ionicons name="heart" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        );
      case 'housing_group':
        console.log('[FavouritesScreen] Rendering local HousingGroupCard for item:', JSON.stringify(item, null, 2));
        return (
          <View style={styles.cardContainer}>
            <Image source={{ uri: item.item_image_url || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
            <Text style={styles.cardTitle}>{item.item_title || 'Housing Group'}</Text>
            <Text numberOfLines={2}>{item.item_description || 'No description'}</Text>
            <TouchableOpacity onPress={() => toggleFavorite(item.item_id, item.item_type)} style={styles.favButton}>
              <Ionicons name="heart" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        );
      case 'group':
        console.log('[FavouritesScreen] Rendering local GroupCard for item:', JSON.stringify(item, null, 2));
        return (
          <View style={styles.cardContainer}>
            <Image source={{ uri: item.item_image_url || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
            <Text style={styles.cardTitle}>{item.item_title || 'Group'}</Text>
            <Text numberOfLines={2}>{item.item_description || 'No description'}</Text>
            <TouchableOpacity onPress={() => toggleFavorite(item.item_id, item.item_type)} style={styles.favButton}>
              <Ionicons name="heart" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        );
      default:
        console.warn(`[FavouritesScreen] Unknown item_type: ${item.item_type} for item ID: ${item.item_id}`);
        return (
          <View style={styles.cardContainer}>
            <Text>Unsupported favorite type: {item.item_type}</Text>
            <Text>{item.item_title}</Text>
            <TouchableOpacity onPress={() => toggleFavorite(item.item_id, item.item_type)} style={styles.favButton}>
              <Ionicons name="heart" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Favorites" />
      <SearchComponent 
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        showSortOptions={true}
      />
      {loading && favorites.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={80} color={COLORS.gray} />
          <Text style={styles.emptyText}>No favorites yet.</Text>
          <Text style={styles.emptySubText}>Add items to your favorites to see them here.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.item_type}-${item.item_id}`}
          numColumns={viewMode === 'Grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={viewMode === 'Grid' ? styles.gridContainer : styles.listContainer}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
  },
  emptyText: {
    ...FONTS.h3,
    marginTop: 16,
    color: COLORS.darkGray,
  },
  emptySubText: {
    ...FONTS.body4,
    marginTop: 8,
    color: COLORS.gray,
    textAlign: 'center',
  },
  gridContainer: {
    padding: 8,
  },
  listContainer: {
    padding: 8,
  },
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  cardTitle: {
    ...FONTS.h3,
    marginBottom: 4,
  },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default FavouritesScreen;
