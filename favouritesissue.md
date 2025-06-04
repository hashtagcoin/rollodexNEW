# Favorites Synchronization Fix Guide

## Issue Description
When favoriting/unfavoriting an item in one screen (e.g., ServiceDetailScreen), the favorite status wasn't correctly reflected in other screens (e.g., ProviderDiscoveryScreen) when navigating back.

## Root Causes
1. **Database Constraint Violations**: Attempts to insert duplicate favorite entries caused database errors
2. **Stale UI State**: Screens weren't refreshing favorites data when regaining focus
3. **Inconsistent Item Types**: Different screens sometimes used inconsistent item_type values

## Solution Implementation

### 1. Use `upsert()` with Conflict Handling Instead of `insert()`
When adding favorites, replace:

```javascript
// BEFORE:
const { error } = await supabase
  .from('favorites')
  .insert({ 
    user_id: user.id, 
    item_id: itemId, 
    item_type: itemType 
  });
```

With:

```javascript
// AFTER:
const { error } = await supabase
  .from('favorites')
  .upsert({ 
    user_id: user.id, 
    item_id: itemId, 
    item_type: itemType 
  }, {
    onConflict: 'user_id,item_id,item_type',
    ignoreDuplicates: true
  });
```

This prevents database errors from duplicate favorites entries.

### 2. Create a Dedicated Function to Refresh Favorites

```javascript
const refreshUserFavorites = useCallback(async () => {
  try {
    console.log('[ScreenName] Refreshing user favorites');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;
    
    // Get current displayed item IDs
    if (!items || items.length === 0) return;
    
    // Determine correct item type for the current content
    const itemTypeForFavorites = getCorrectItemType(); // e.g., 'service_provider', 'housing_listing'
    const itemIds = items.map(item => item.id);
    
    // Reset favorites state before fetching new data
    setUserFavorites(new Set());
    
    // Fetch latest favorites status
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('favorites')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', itemTypeForFavorites)
      .in('item_id', itemIds);
    
    if (!favoritesError && favoritesData) {
      const favoritedIds = new Set(favoritesData.map(fav => fav.item_id));
      setUserFavorites(favoritedIds);
    }
  } catch (err) {
    console.error('[ScreenName] Exception refreshing favorites:', err);
  }
}, [items, otherDependencies]);
```

### 3. Use `useFocusEffect` to Refresh Favorites on Screen Focus

```javascript
useFocusEffect(
  useCallback(() => {
    console.log('[ScreenName] Screen focused');
    
    // Refresh favorites when screen gains focus
    refreshUserFavorites();
    
    return () => {
      // Cleanup on unfocus (optional)
      console.log('[ScreenName] Screen unfocused');
    };
  }, [refreshUserFavorites]) // Only depend on refreshUserFavorites
);
```

## How to Apply This Fix to Other Screens

1. **For Any Screen that Adds Favorites**:
   - Replace `.insert()` with `.upsert()` and add conflict handling

2. **For Any Screen that Displays Favorites**:
   - Add a `refreshUserFavorites` function that fetches updated favorite data
   - Implement `useFocusEffect` to call this function when the screen gains focus
   - Ensure consistent item_type values are used across the app

3. **For Both Types of Screens**:
   - Add proper error handling for all database operations
   - Use consistent logging patterns for better debugging
   - Consider adding loading states for favorite toggle operations

## Best Practices

1. Always use `upsert()` with conflict handling for favorite operations
2. Always refresh favorites data when screens gain focus
3. Keep item_type values consistent across the entire application
4. Reset state before fetching new data to prevent stale states
5. Add detailed logging for easier debugging

By applying these changes consistently across all screens that handle favorites, the app will maintain synchronized favorite states throughout the user experience.
