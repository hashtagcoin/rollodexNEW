/**
 * This file contains the core changes needed to fix the nested VirtualizedList warning.
 * To implement this fix:
 * 
 * 1. In your HousingDetailScreen.js, find the main return statement
 * 2. Replace the current structure with this conditional rendering approach
 * 3. This prevents nesting the FlatList inside a ScrollView for the Groups tab
 */

// IMPLEMENTATION EXAMPLE: 
// Place this in the return() of your HousingDetailScreen component

return (
  <View style={styles.screenContainer}>
    {/* Animated header */}
    <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
      <AppHeader
        title={housingData.title}
        navigation={navigation}
        canGoBack={true}
      />
    </Animated.View>
    
    {/* Regular header with back button */}
    <View style={styles.transparentHeader}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Feather name="chevron-left" size={28} color="white" />
      </TouchableOpacity>
    </View>
    
    {/* Conditional rendering to avoid nested VirtualizedList warning */}
    {activeTab === 'Groups' ? (
      // For Groups tab, use a regular View as container (not ScrollView)
      // since the FlatList inside renderGroupsTab() is already scrollable
      <View style={styles.container}>
        {renderImageGallery()}
        
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{housingData.title}</Text>
            <Text style={styles.location}>{housingData.suburb}</Text>
            <Text style={styles.price}>
              {formatPrice(housingData.weekly_rent)}/week
            </Text>
          </View>
          
          {renderTabs()}
          {renderGroupsTab()} {/* Direct render, not wrapped in ScrollView */}
        </View>
      </View>
    ) : (
      // For all other tabs, use ScrollView as before
      <Animated.ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {renderImageGallery()}
        
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{housingData.title}</Text>
            <Text style={styles.location}>{housingData.suburb}</Text>
            <Text style={styles.price}>
              {formatPrice(housingData.weekly_rent)}/week
            </Text>
          </View>
          
          {renderTabs()}
          {renderContent()} {/* This function should not return the Groups tab */}
        </View>
      </Animated.ScrollView>
    )}
    
    {/* Bottom action bar */}
    <View style={styles.bottomBar}>
      {/* ... bottom bar content ... */}
    </View>
  </View>
);

// ALSO UPDATE: Modify your renderContent function to exclude the Groups tab

const renderContent = () => {
  switch(activeTab) {
    case 'Details':
      return renderDetailsTab();
    case 'Location':
      return renderLocationTab();
    case 'Features':
      return renderFeaturesTab();
    case 'Photos':
      return renderPhotosTab();
    // No 'Groups' case here since it's handled separately
    default:
      return null;
  }
};
