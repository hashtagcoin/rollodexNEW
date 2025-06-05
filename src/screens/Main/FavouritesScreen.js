import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';
// Assuming isSingleLineTitle from CardStyles might be different or not used due to local redefinition
import { CardStyles, ConsistentHeightTitle /*, isSingleLineTitle as importedIsSingleLineTitle */ } from '../../constants/CardStyles';
import { getValidImageUrl } from '../../utils/imageHelper';
import SearchComponent from '../../components/common/SearchComponent';
import AppHeader from '../../components/layout/AppHeader';
import ServiceCardComponent from '../../components/cards/ServiceCard';
import HousingCardComponent from '../../components/cards/HousingCard';
import EventFavoriteCard from '../../components/cards/EventFavoriteCard';
import ShareTrayModal from '../../components/common/ShareTrayModal';

const { width } = Dimensions.get('window');

// Constants
const CARD_MARGIN = 10;
const PAGE_SIZE = 10; // Moved PAGE_SIZE to be a top-level constant

const FavouritesScreen = () => {
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('Grid');
  const [sortConfig, setSortConfig] = useState({ field: 'created_at', direction: 'desc' });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [itemToShare, setItemToShare] = useState(null);

  const categories = ['All', 'Services', 'Events', 'Housing', 'Groups', 'Housing Groups'];

  const mapCategoryToItemType = (category) => {
    switch (category) {
      case 'All':
        return null; // No filter, fetch all types
      case 'Services':
        return 'service_provider';
      case 'Events':
        return 'group_event'; // Assuming 'Events' might actually map to 'group_event' based on renderItem logic for 'event' type
      case 'Housing':
        return 'housing_listing';
      case 'Groups':
        return 'group';
      case 'Housing Groups':
        return 'housing_group';
      default:
        console.error(`[FavouritesScreen] Unknown category: ${category}`);
        return null;
    }
  };


  const fetchFavorites = useCallback(async (pageNum = 0, isRefreshing = false) => {
    console.log(`[FavouritesScreen] fetchFavorites called. Page: ${pageNum}, Refreshing: ${isRefreshing}, Loading: ${loading}, HasMore: ${hasMore}, Category: ${selectedCategory}, Search: ${searchTerm}`);
    if ((!isRefreshing && loading && pageNum > 0) || (pageNum > 0 && !hasMore)) { // Adjusted condition slightly: loading check mainly for non-refresh, non-initial loads
      console.log('[FavouritesScreen] fetchFavorites: Bailing out due to loading or no more data.');
      return;
    }

    try {
      if (pageNum === 0) {
        console.log('[FavouritesScreen] fetchFavorites: Setting loading to true (pageNum is 0).');
        setLoading(true);
        if (!isRefreshing) setFavorites([]); // Clear existing favorites on initial load for new filters
      } else {
        console.log('[FavouritesScreen] fetchFavorites: Setting loadingMore to true.');
        setLoadingMore(true);
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw userError || new Error('No authenticated user');
      }

      let query = supabase
        .from('favorites')
        .select('*') // Just select all columns from favorites
        .eq('user_id', user.id);

      const dbItemType = mapCategoryToItemType(selectedCategory);
      if (dbItemType) {
        query = query.eq('item_type', dbItemType);
      }

      if (searchTerm) {
        query = query.ilike('item_title', `%${searchTerm}%`);
      }

      if (sortConfig.field) {
        query = query.order(sortConfig.field, { ascending: sortConfig.direction === 'asc' });
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query; // Removed count as it wasn't used
      console.log('[FavouritesScreen] Supabase query result (favorites table):', { data, error });
      if (error) {
        throw error;
      }

      if (!data) { // Handle null data case
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          setHasMore(false);
          if (pageNum === 0) setFavorites([]);
          return;
      }

      const favoritesWithEnrichedData = await Promise.all(
        data.map(async (favorite) => {
          const favTableId = favorite.favorite_id; // Corrected to use 'favorite_id' as per schema
          if (favTableId === undefined) {
            // This warning should ideally not appear if favorite_id is the PK and always present
            console.warn(`[FavouritesScreen] fetchFavorites: favorite.favorite_id is undefined. Full favorite object:`, JSON.stringify(favorite));
          }
          let enriched = { ...favorite, favorite_table_id: favTableId }; // Preserve PK from 'favorites' table
          try {
            switch (favorite.item_type) {
              case 'service_provider': {
                const { data: service, error: serviceErr } = await supabase
                  .from('services')
                  .select('*')
                  .eq('id', favorite.item_id)
                  .single();
                if (!serviceErr && service) enriched = { ...enriched, ...service, id: favorite.item_id }; // Ensure original item_id is used as id if service table also has 'id'
                else if (serviceErr) console.warn(`[Enrichment] Service ${favorite.item_id}:`, serviceErr.message);
                break;
              }
              case 'housing_listing': {
                const { data: housing, error: housingErr } = await supabase
                  .from('housing_listings')
                  .select('*')
                  .eq('id', favorite.item_id)
                  .single();
                if (!housingErr && housing) enriched = { ...enriched, ...housing, id: favorite.item_id };
                else if (housingErr) console.warn(`[Enrichment] Housing ${favorite.item_id}:`, housingErr.message);
                break;
              }
              case 'group_event': { // This was 'Events' in mapCategoryToItemType, ensure consistency
                const { data: event, error: eventErr } = await supabase
                  .from('group_events')
                  .select('*')
                  .eq('id', favorite.item_id)
                  .single();
                if (!eventErr && event) enriched = { ...enriched, ...event, id: favorite.item_id };
                else if (eventErr) console.warn(`[Enrichment] Group Event ${favorite.item_id}:`, eventErr.message);
                break;
              }
              case 'group': {
                const { data: groupData, error: groupError } = await supabase
                  .from('groups')
                  .select('id, name, description, avatar_url, imageurl, category, is_public, group_members ( count )')
                  .eq('id', favorite.item_id)
                  .single();
                if (!groupError && groupData) {
                  enriched = {
                    ...enriched, // Original favorite data
                    ...groupData, // Group specific data
                    id: favorite.item_id, // Ensure item_id from favorite is the main id
                    members: groupData.group_members && groupData.group_members.length > 0 ? groupData.group_members[0].count : 0,
                    image: groupData.imageurl || groupData.avatar_url
                  };
                } else if (groupError) {
                  console.warn(`[FavouritesScreen] Enrichment error for group ${favorite.item_id}:`, groupError.message);
                }
                break;
              }
              case 'housing_group': {
                const { data: memberData, error: memberError } = await supabase
                  .from('housing_group_members')
                  .select('id, status, join_date')
                  .eq('user_id', user.id)
                  .eq('group_id', favorite.item_id)
                  .single();

                const { data: hgData, error: hgError } = await supabase
                  .from('housing_groups')
                  .select('*, housing_listings:listing_id (*)')
                  .eq('id', favorite.item_id)
                  .single();

                enriched.id = favorite.item_id; // Ensure item_id is the main id

                if (hgError) {
                  console.warn(`[FavouritesScreen] Enrichment error for housing_group ${favorite.item_id}:`, hgError.message);
                  enriched.housing_group_data = null;
                } else if (hgData) {
                  enriched.housing_group_data = {
                    ...hgData,
                    housing_listing_data: hgData.housing_listings || null,
                  };
                } else {
                  enriched.housing_group_data = {}; // Ensure it's an object
                }


                if (!memberError && memberData) {
                  enriched.membership_status = memberData.status;
                  enriched.membership_id = memberData.id; // This is the membership ID
                  enriched.join_date = memberData.join_date;
                } else {
                  enriched.membership_status = null;
                  const listingIdForAppCheck = hgData?.listing_id;
                  if (listingIdForAppCheck) {
                    const { data: appData, error: appError } = await supabase
                      .from('housing_applications')
                      .select('status')
                      .eq('user_id', user.id)
                      .eq('listing_id', listingIdForAppCheck)
                      .order('created_at', { ascending: false }) // Get the latest application
                      .limit(1)
                      .single();
                    if (!appError && appData) {
                      enriched.application_status = appData.status;
                    } else {
                      enriched.application_status = null;
                    }
                  } else {
                    enriched.application_status = null;
                  }
                }
                if (!enriched.housing_group_data && !hgError) { // Ensure housing_group_data exists
                    enriched.housing_group_data = {};
                }
                break;
              }
              // The original code had a case for 'event' in renderItem, but not in enrichment.
              // Assuming 'group_event' is the intended type for events.
              default:
                console.warn('[FavouritesScreen] Unknown item type for enrichment:', favorite.item_type);
                break;
            }
          } catch (err) {
            console.warn('[FavouritesScreen] Enrichment failed for', favorite.item_type, favorite.item_id, err);
          }
          return enriched;
        })
      );

      console.log('[FavouritesScreen] favoritesWithEnrichedData after enrichment:', JSON.stringify(favoritesWithEnrichedData.length, null, 2));
      setFavorites(prev => {
        let newItemsToAdd = favoritesWithEnrichedData;
        // When appending (not a refresh or initial load), filter out items already present based on favorite_table_id
        if (!isRefreshing && pageNum > 0) {
          const existingIds = new Set(prev.map(p => p.favorite_table_id));
          newItemsToAdd = favoritesWithEnrichedData.filter(item => !existingIds.has(item.favorite_table_id));
        }

        const updatedFavorites = isRefreshing || pageNum === 0 
          ? newItemsToAdd // For refresh or initial load, directly use (potentially filtered if pageNum > 0 but isRefreshing is true, though typically pageNum would be 0 for refresh)
          : [...prev, ...newItemsToAdd]; // For append, add the filtered new items
        
        console.log('[FavouritesScreen] setFavorites called. Prev count:', prev.length, 'New items received:', favoritesWithEnrichedData.length, 'New items to add:', newItemsToAdd.length, 'Updated favorites count:', updatedFavorites.length);
        return updatedFavorites;
      });
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);

    } catch (error) {
      console.error('[FavouritesScreen] fetchFavorites error:', error);
      // Alert.alert('Error', 'Could not fetch favorites.'); // Consider user-facing error
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, searchTerm, sortConfig, loading, hasMore]); // Added loading, hasMore as they affect conditional fetching logic

  // Reset scroll, state, and fetch data when tab is focused or critical filters change
  useFocusEffect(
    useCallback(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
      // Reset page state and filters
      setPage(0); // Reset page for new filter context
      fetchFavorites(0, true); // Fetch on every focus event
    }, []) // Runs on every focus event
  );

  // Fetch data when selectedCategory, searchTerm, or sortConfig change
  // This also covers the initial fetch after the reset effect sets category/term
  useEffect(() => {
    console.log("[FavouritesScreen] Filters changed or initial mount, fetching page 0. Category:", selectedCategory, "Search:", searchTerm);
    setPage(0); // Reset page when filters change
    fetchFavorites(0, true); // Fetch with new filters, as a refresh
  }, [selectedCategory, searchTerm, sortConfig]); // Note: fetchFavorites is not a dep here to avoid loop, it's called directly.

  const onRefresh = useCallback(() => {
    console.log("[FavouritesScreen] onRefresh called");
    setRefreshing(true); // Handled inside fetchFavorites now
    setPage(0); // Reset page on refresh
    fetchFavorites(0, true);
  }, [fetchFavorites]); // fetchFavorites is memoized

  const loadMore = useCallback(() => {
    console.log("[FavouritesScreen] loadMore called. HasMore:", hasMore, "LoadingMore:", loadingMore, "Loading:", loading);
    if (!loading && !loadingMore && hasMore) {
      fetchFavorites(page + 1);
    }
  }, [page, loading, loadingMore, hasMore, fetchFavorites]);


  const toggleFavorite = async (itemId, itemType) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Authentication Error", "You must be logged in to change favorites.");
        return;
      }

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('item_type', itemType);

      if (error) {
        throw error;
      }
      // Refresh list after unfavoriting
      setFavorites(prev => prev.filter(item => !(item.item_id === itemId && item.item_type === itemType)));
      // Or optionally, fully refetch:
      // fetchFavorites(0, true); 
    } catch (error) {
      console.error('[FavouritesScreen] toggleFavorite error:', error);
      Alert.alert('Error', 'Could not update favorites.');
    }
  };

  const handleOpenShareTray = (item) => {
    setItemToShare(item);
    setShareModalVisible(true);
  };

  const handleCloseShareTray = () => {
    setShareModalVisible(false);
    setItemToShare(null);
  };

  // Function to measure title text width to determine if it's single line
  // This is a local definition, shadowing any imported one.
  const isSingleLineTitleLocal = (title) => {
    if (!title) return true; // Or false, depending on desired behavior for null/undefined titles
    const avgCharWidth = 10; 
    const maxChars = width / avgCharWidth * 0.4; // Approx 40% of screen width for a grid item title
    return title.length < maxChars;
  };

  const renderItem = ({ item }) => {
    // console.log('[FavouritesScreen] renderItem called for item:', JSON.stringify(item, null, 2));
    // Use the locally defined isSingleLineTitle
    const titleIsSingleLine = item.item_type === 'housing_group' && item.housing_group_data?.name
                              ? isSingleLineTitleLocal(item.housing_group_data.name)
                              : (item.item_title ? isSingleLineTitleLocal(item.item_title) : true);


    const commonCardProps = {
      onPress: () => {
        // Ensure item.id or item.item_id is correctly referencing the actual entity ID
        const entityId = item.item_id; // This should be the ID of the service, housing, group etc.
        switch (item.item_type) {
          case 'service_provider':
            navigation.navigate('ServiceDetail', { providerId: entityId, service_provider_name: item.item_title || item.name });
            break;
          case 'housing_listing':
            navigation.navigate('HousingDetail', { listingId: entityId });
            break;
          case 'group': // Changed from 'housing_group'
            navigation.navigate('GroupDetail', { groupId: entityId });
            break;
          case 'housing_group':
            navigation.navigate('HousingGroupDetailScreen', { housingGroupId: entityId });
            break;
          case 'group_event': // Assuming 'event' favorites are stored as 'group_event' type
             navigation.navigate('EventDetail', { eventId: entityId, groupId: item.group_id });
            break;
          default:
            console.warn(`[FavouritesScreen] No specific navigation path for item_type: ${item.item_type} in commonCardProps.onPress`);
            break;
        }
      },
      isFavorited: true,
      onToggleFavorite: () => toggleFavorite(item.item_id, item.item_type), // Corrected: removed third argument
      displayAs: viewMode === 'Grid' ? 'grid' : 'list',
      onSharePress: () => handleOpenShareTray(item),
    };
    
    // Ensure item.id is consistently the actual item's ID from its original table,
    // and favorite-specific ID (if needed for deletion directly by favorite PK) is item.favorite_id_pk or similar
    // For toggleFavorite, item.item_id (entity ID) and item.item_type are used.

    switch (item.item_type) {
      // Case 'event' was present but 'group_event' seems to be the actual type based on enrichment logic.
      // If 'event' is a distinct type, its enrichment and card handling need to be defined.
      // For now, assuming events are 'group_event'.
      case 'group_event':
        console.log('[FavouritesScreen] Rendering EventFavoriteCard for group_event:', item.item_id);
        const groupEventCardItem = {
          id: item.item_id, // Main ID for the event
          item_id: item.item_id, // Redundant but for clarity if card expects it
          item_type: item.item_type,
          item_title: item.title || item.item_title || 'Group Event', // Fallback chain
          description: item.description,
          item_image_url: getValidImageUrl(item.image_url),
          event_start_time: item.start_time || item.event_start_time,
          event_location: { address: item.location?.full_address || item.location_address, ...item.location },
          event_category: item.category,
          group_id: item.group_id, // Important for navigation
        };
        return (
          <EventFavoriteCard
            item={groupEventCardItem}
            displayAs={commonCardProps.displayAs}
            onSharePress={commonCardProps.onSharePress}
            onPress={() => navigation.navigate('EventDetail', { eventId: groupEventCardItem.id, groupId: groupEventCardItem.group_id })}
            onRemoveFavorite={commonCardProps.onToggleFavorite}
            testID={`group-event-card-${groupEventCardItem.id}`}
          />
        );

      case 'service_provider':
        console.log('[FavouritesScreen] Rendering ServiceCardComponent for:', item.item_id);
        const serviceProviderItem = {
            id: item.item_id, // Use item_id as the primary id for the card
            ...item, // Spread the enriched item data
            name: item.name || item.item_title, // Ensure name is present
        };
        // delete serviceProviderItem.item_id; // Avoid duplicate id fields if item itself has id
        return <ServiceCardComponent item={serviceProviderItem} {...commonCardProps} />;

      case 'housing_listing':
        console.log('[FavouritesScreen] Rendering HousingCardComponent for:', item.item_id);
        const housingListingItem = {
            id: item.item_id,
            ...item,
            title: item.title || item.item_title,
        };
        return <HousingCardComponent item={housingListingItem} {...commonCardProps} />;

      case 'group':
      case 'housing_group':
        console.log('[FavouritesScreen] Rendering Group:', item.item_id, 'ViewMode:', viewMode);
        const groupImageUrl = getValidImageUrl(item.image || item.avatar_url, 'groupavatars');
        const groupName = item.name || item.item_title || 'Unnamed Group';
        const groupDescription = item.description || 'No description available.';
        const groupMembers = item.members != null ? `${item.members} members` : '';

        if (viewMode === 'Grid') {
          return (
            <View style={CardStyles.gridCardWrapper} testID={`group-card-grid-${item.item_id}`}>
              <TouchableOpacity
                style={CardStyles.gridCardContainer}
                onPress={commonCardProps.onPress}
                activeOpacity={0.8}
              >
                <View style={CardStyles.gridCardInner}>
                  <View style={CardStyles.gridImageContainer}>
                    {groupImageUrl ? (
                      <Image source={{ uri: groupImageUrl }} style={CardStyles.gridImage} resizeMode="cover" />
                    ) : (
                      <View style={[CardStyles.gridImage, CardStyles.gridCardPlaceholderImage]}>
                        <Ionicons name="people-outline" size={SIZES.xxxLarge} color={COLORS.mediumGray} />
                      </View>
                    )}
                    <TouchableOpacity
                        style={CardStyles.iconContainer}
                        onPress={commonCardProps.onToggleFavorite}
                    >
                        <View style={CardStyles.iconCircleActive}>
                          <Ionicons name="heart" size={20} style={CardStyles.favoriteIconActive} />
                        </View>
                    </TouchableOpacity>
                    {commonCardProps.onSharePress && (
                        <TouchableOpacity
                            style={[CardStyles.iconContainer, { top: 48 }]}
                            onPress={commonCardProps.onSharePress}
                        >
                            <View style={CardStyles.iconCircle}>
                              <Ionicons name="share-social-outline" size={20} style={CardStyles.favoriteIcon} />
                            </View>
                        </TouchableOpacity>
                    )}
                  </View>
                  <View style={{padding: 8}}>
                    <Text style={[CardStyles.title, {marginBottom: 4}]} numberOfLines={1}>{groupName}</Text>
                    <View style={CardStyles.labelsRow}>
                        {groupMembers ? (
                          <View style={CardStyles.labelContainer}>
                            <Ionicons name="people" size={14} color={COLORS.darkBlue} />
                            <Text style={[CardStyles.labelText, {marginLeft: 3}]} numberOfLines={1}>{groupMembers}</Text>
                          </View>
                        ) : <View/>}
                    </View>
                    <Text style={CardStyles.subtitle} numberOfLines={2}>{groupDescription}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        } else { // List view for 'group'
          return (
            <TouchableOpacity
              style={CardStyles.listCardContainer}
              onPress={commonCardProps.onPress}
              activeOpacity={0.8}
              testID={`group-card-list-${item.item_id}`}
            >
              <View style={CardStyles.listCardInner}>
                <View style={CardStyles.listImageContainer}>
                  {groupImageUrl ? (
                    <Image source={{ uri: groupImageUrl }} style={CardStyles.listImage} onError={(e) => console.log('Group List Image Error:', e.nativeEvent.error)} />
                  ) : (
                    <View style={CardStyles.listPlaceholderImage}><Ionicons name="people-outline" size={SIZES.xLarge} color={COLORS.mediumGray} /></View>
                  )}
                </View>
                <View style={CardStyles.listContentContainer}>
                    <View style={CardStyles.topSection}>
                        <Text style={[CardStyles.title, {flex:1}]} numberOfLines={1}>{groupName}</Text>
                    </View>
                    {groupMembers ? <Text style={CardStyles.subtitle} numberOfLines={1}>{groupMembers}</Text> : null}
                    <Text style={[CardStyles.subtitle, {marginVertical: 4}]} numberOfLines={2}>{groupDescription}</Text>
                </View>
                <View style={CardStyles.listIconContainer}>
                  <TouchableOpacity onPress={commonCardProps.onToggleFavorite} style={CardStyles.listIconWrapper}><Ionicons name="heart" size={24} color={COLORS.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={commonCardProps.onSharePress} style={CardStyles.listIconWrapper}><Ionicons name="share-social-outline" size={24} color={COLORS.primary} /></TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }

      case 'housing_group':
        console.log('[FavouritesScreen] Rendering Housing Group:', item.item_id, 'ViewMode:', viewMode);
        const hgData = item.housing_group_data; // This is the object { name: ..., housing_listing_data: ... }
        const listingData = hgData?.housing_listing_data; // This is the actual listing object or null
        let hgImageUrl = null;
        if (listingData?.media_urls?.length > 0) {
          hgImageUrl = getValidImageUrl(listingData.media_urls[0], 'housingimages');
        } else if (hgData?.avatar_url) {
          hgImageUrl = getValidImageUrl(hgData.avatar_url, 'housinggroupavatar');
        }
        const hgTitle = hgData?.name || item.item_title || 'Unnamed Housing Group';
        const hgMembers = (hgData?.current_members != null && hgData?.max_members != null)
                          ? `${hgData.current_members}/${hgData.max_members} members`
                          : (hgData?.member_count != null ? `${hgData.member_count} members` : '');


        let hgLocationDisplayValue = 'Location not specified';
        if (listingData?.location_text) {
          hgLocationDisplayValue = listingData.location_text;
        } else if (listingData?.address) {
          if (typeof listingData.address === 'string') {
            hgLocationDisplayValue = listingData.address;
          } else if (typeof listingData.address === 'object' && listingData.address !== null) {
            hgLocationDisplayValue = listingData.address.suburb || listingData.address.city || 'Address available';
          }
        }
        if (typeof hgLocationDisplayValue !== 'string' || hgLocationDisplayValue.trim() === '') {
            hgLocationDisplayValue = 'Location not specified';
        }

        if (viewMode === 'Grid') {
          return (
            <View style={CardStyles.gridCardWrapper} testID={`housinggroup-card-grid-${item.item_id}`}>
              <TouchableOpacity
                style={CardStyles.gridCardContainer}
                onPress={commonCardProps.onPress}
                activeOpacity={0.8}
              >
                <View style={CardStyles.gridCardInner}>
                  <View style={CardStyles.gridImageContainer}>
                    {hgImageUrl ? (
                      <Image source={{ uri: hgImageUrl }} style={CardStyles.gridImage} resizeMode="cover" />
                    ) : (
                      <View style={[CardStyles.gridImage, CardStyles.gridCardPlaceholderImage]}>
                        <Ionicons name="home-outline" size={SIZES.xxxLarge} color={COLORS.mediumGray} />
                      </View>
                    )}
                    <TouchableOpacity
                        style={CardStyles.iconContainer}
                        onPress={commonCardProps.onToggleFavorite}
                    >
                        <View style={CardStyles.iconCircleActive}>
                          <Ionicons name="heart" size={20} style={CardStyles.favoriteIconActive} />
                        </View>
                    </TouchableOpacity>
                    {commonCardProps.onSharePress && (
                        <TouchableOpacity
                            style={[CardStyles.iconContainer, { top: 48 }]}
                            onPress={commonCardProps.onSharePress}
                        >
                            <View style={CardStyles.iconCircle}>
                              <Ionicons name="share-social-outline" size={20} style={CardStyles.favoriteIcon} />
                            </View>
                        </TouchableOpacity>
                    )}
                  </View>
                  <View style={{padding: 8}}>
                    <Text style={[CardStyles.title, {marginBottom: 4}]} numberOfLines={titleIsSingleLine ? 1 : 2}>{hgTitle}</Text>
                    <View style={CardStyles.labelsRow}>
                      <View style={CardStyles.labelContainer}>
                        <Ionicons name="location-outline" size={14} color={COLORS.darkBlue} />
                        <Text style={[CardStyles.labelText, {marginLeft: 3}]} numberOfLines={1}>{hgLocationDisplayValue}</Text>
                      </View>
                      
                      {hgMembers ? (
                        <View style={CardStyles.labelContainer}>
                          <Ionicons name="people" size={14} color={COLORS.darkBlue} />
                          <Text style={[CardStyles.labelText, {marginLeft: 3}]} numberOfLines={1}>{hgMembers}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        } else { // List view for 'housing_group'
          return (
            <TouchableOpacity
              style={CardStyles.listCardContainer}
              onPress={commonCardProps.onPress}
              activeOpacity={0.8}
              testID={`housinggroup-card-list-${item.item_id}`}
            >
              <View style={CardStyles.listCardInner}>
                <View style={CardStyles.listImageContainer}>
                  {hgImageUrl ? (
                    <Image source={{ uri: hgImageUrl }} style={CardStyles.listImage} onError={(e) => console.log('Housing Group List Image Error:', e.nativeEvent.error)} />
                  ) : (
                    <View style={CardStyles.listPlaceholderImage}><Ionicons name="home-outline" size={SIZES.xLarge} color={COLORS.mediumGray} /></View>
                  )}
                </View>
                <View style={CardStyles.listContentContainer}>
                    <View style={CardStyles.topSection}>
                        <Text style={[CardStyles.title, {flex:1}]} numberOfLines={1}>{hgTitle}</Text>
                    </View>
                    <View style={CardStyles.labelsRow}>
                      <View style={CardStyles.labelContainer}>
                        <Ionicons name="location-outline" size={14} color={COLORS.darkBlue} />
                        <Text style={[CardStyles.labelText, {marginLeft: 3}]} numberOfLines={1}>{hgLocationDisplayValue}</Text>
                      </View>
                      
                      {hgMembers ? (
                        <View style={CardStyles.labelContainer}>
                          <Ionicons name="people" size={14} color={COLORS.darkBlue} />
                          <Text style={[CardStyles.labelText, {marginLeft: 3}]} numberOfLines={1}>{hgMembers}</Text>
                        </View>
                      ) : null}
                    </View>
                </View>
                <View style={CardStyles.listIconContainer}>
                  <TouchableOpacity onPress={commonCardProps.onToggleFavorite} style={CardStyles.listIconWrapper}><Ionicons name="heart" size={24} color={COLORS.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={commonCardProps.onSharePress} style={CardStyles.listIconWrapper}><Ionicons name="share-social-outline" size={24} color={COLORS.primary} /></TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }

      default:
        console.warn(`[FavouritesScreen] Unknown item_type in renderItem: ${item.item_type} for item ID: ${item.item_id}`);
        const defaultTitle = item.item_title || `Unknown Item: ${item.item_id}`;
        // Ensure CardStyles has definitions for these placeholder styles if they are different
        // from the standard ones like CardStyles.title, CardStyles.subtitle
        if (viewMode === 'Grid') {
          return (
            <View style={CardStyles.gridCardWrapper} testID={`unknown-card-grid-${item.item_id}`}>
              <View style={[CardStyles.gridCardContainer, CardStyles.gridCardPlaceholderImage, {alignItems:'center', justifyContent:'center'}]}>
                <Ionicons name="help-circle-outline" size={SIZES.xxxLarge} color={COLORS.mediumGray} />
                <Text style={[CardStyles.title, {textAlign:'center'}]} numberOfLines={2}>{defaultTitle}</Text>
                <Text style={[CardStyles.subtitle, {textAlign:'center'}]}>{`Type: ${item.item_type}`}</Text>
              </View>
            </View>
          );
        } else {
          return (
            <View style={[CardStyles.listCardContainer, {alignItems:'center'}]} testID={`unknown-card-list-${item.item_id}`}>
              <Ionicons name="help-circle-outline" size={SIZES.xLarge} color={COLORS.mediumGray} style={{marginRight: SIZES.base}}/>
              <View style={CardStyles.listContentContainer}>
                <Text style={CardStyles.title} numberOfLines={2}>{defaultTitle}</Text>
                <Text style={CardStyles.subtitle}>{`Type: ${item.item_type}`}</Text>
              </View>
            </View>
          );
        }
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Favorites" navigation={navigation} />
      <SearchComponent
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={(category) => {
            console.log("Category changed to:", category);
            setSelectedCategory(category);
        }}
        searchTerm={searchTerm}
        onSearchChange={(term) => {
            console.log("Search term changed to:", term);
            setSearchTerm(term);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortConfig={sortConfig}
        onSortChange={(config) => {
            console.log("Sort config changed to:", config);
            setSortConfig(config);
        }}
        showSortOptions={true}
      />
      {loading && favorites.length === 0 && page === 0 ? ( // Show loader only on initial full load
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : !loading && favorites.length === 0 ? ( // Show empty only if not loading and no favorites
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={80} color={COLORS.gray} />
          <Text style={styles.emptyText}>You haven't favorited anything yet.</Text>
          <Text style={styles.emptySubText}>Tap the heart on items to add them here!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item, index) => {
            if (item.favorite_table_id !== undefined && item.favorite_table_id !== null) {
              return item.favorite_table_id.toString();
            }
            // Fallback if favorite_table_id (from favorite.id) is not available
            const type = item.item_type || 'unknown_type';
            const entityId = item.item_id || 'unknown_item_id'; // item_id of the actual entity (service, group etc)
            console.warn(`[FavouritesScreen] keyExtractor: favorite_table_id is undefined for item_type: ${type}, item_id: ${entityId}. Using fallback key with index ${index}.`);
            return `${type}-${entityId}-${index}`;
          }} // Ensure item_id is unique per type
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary}/>}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }}/> : null}
          numColumns={viewMode === 'Grid' ? 2 : 1}
          key={viewMode} // Important for re-rendering on viewMode change
          contentContainerStyle={viewMode === 'Grid' ? styles.gridContainer : styles.listContainer}
          columnWrapperStyle={viewMode === 'Grid' ? styles.columnWrapper : null}
          // Performance settings
          initialNumToRender={PAGE_SIZE / 2}
          maxToRenderPerBatch={PAGE_SIZE / 2}
          windowSize={PAGE_SIZE + 5} // Roughly current page items + 1 page ahead and 1 behind
        />
      )}
      <ShareTrayModal
        visible={shareModalVisible}
        onClose={handleCloseShareTray}
        itemToShare={itemToShare}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray, // Or COLORS.background for consistency
  },
  loader: {
    flex: 1, // To center it if it's the only thing
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white, // Or transparent to see container bg
  },
  emptyText: {
    fontSize: SIZES.h3, // Use FONTS.h3
    fontFamily: FONTS.bold,
    marginTop: SIZES.medium,
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: SIZES.body3, // Use FONTS.body3
    fontFamily: FONTS.regular,
    marginTop: SIZES.base,
    color: COLORS.gray,
    textAlign: 'center',
  },
  gridContainer: {
    paddingBottom: SIZES.large, // Use theme sizes
    paddingHorizontal: CARD_MARGIN / 2, // Adjust for half margin on sides
  },
  listContainer: {
    paddingBottom: SIZES.large,
    paddingHorizontal: CARD_MARGIN,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: CARD_MARGIN / 2, // Distribute remaining margin
  },
  // Card specific styles were removed as they should come from CardStyles.js
  // If any were truly unique to this screen, they can be re-added or moved to CardStyles
});

export default FavouritesScreen;