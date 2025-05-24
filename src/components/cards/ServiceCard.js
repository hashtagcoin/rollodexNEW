import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, ActivityIndicator } from 'react-native'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getValidImageUrl } from '../../utils/imageHelper';

// Get screen dimensions and calculate card width for layouts
const { width } = Dimensions.get('window');
const GRID_CARD_WIDTH = (width / 2) - 10; // Half width for 2-column grid, with smaller margins
const LIST_CARD_WIDTH = width; // Full width for list view

// Main component
const ServiceCard = ({ item, onPress, onImageLoaded, displayAs = 'grid' }) => { 
  // State for favorite status
  const [isFavorited, setIsFavorited] = useState(item.is_favourited || false);
  // State for image loading
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setIsFavorited(item.is_favourited || false);
  }, [item]);

  // Modern rating display with just a number and a single star icon
  const renderModernRating = () => {
    const rating = item.rating || 0;
    return (
      <View style={styles.modernRatingContainer}>
        <Ionicons name="star" size={16} color="#FFD700" /> 
        <Text style={styles.modernRatingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  // Prepare variables from item object
  // Extract price (with fallback and formatting)
  const price = item.price ? `$${item.price}` : '$0';
  
  // Extract rating (with fallback)
  const rating = item.rating || 0;
  
  // Extract reviews count (with fallback)
  const reviews = item.reviews || 0;
  
  // Extract category (with fallback and formatting)
  const category = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Uncategorized';
  
  // Extract and process image URL with our imageHelper utility
  const rawImageUrl = item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null;
  
  // Use our helper to get a valid Supabase URL
  const imageUrl = getValidImageUrl(rawImageUrl, 'providerimages');
  
  // Create a memoized image source for better performance
  const imageSource = useMemo(() => {
    return imageUrl ? { uri: imageUrl } : { uri: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png' };
  }, [imageUrl]);
  
  // Extract suburb (with fallback)
  const suburb = item.address_suburb || 'Suburb';
  
  // Extract description (with fallback)
  const description = item.description || 'No description available';
  
  /* 
   * Note: To use this properly, when fetching services data, you should join with service_providers table:
   * 
   * SELECT s.*, sp.credentials 
   * FROM services s 
   * JOIN service_providers sp ON s.provider_id = sp.id;
   *
   * This ensures the credentials array is available in each service item.
   */
  
  // Process credentials from service_providers table
  const processCredentials = () => {
    const credentialButtons = [];
    
    // Check if item has credentials array from the service_providers table
    if (item.credentials && Array.isArray(item.credentials) && item.credentials.length > 0) {
      // Map each credential to a credential button object
      item.credentials.forEach((credential, index) => {
        // Assign colors based on credential type
        let color = '#2196F3'; // Default blue
        
        if (credential.toLowerCase().includes('ndis')) {
          color = '#28A745'; // Green for NDIS related
        } else if (credential.toLowerCase().includes('safety') || 
                   credential.toLowerCase().includes('certified')) {
          color = '#DC3545'; // Red for safety certifications
        } else if (credential.toLowerCase().includes('license') || 
                   credential.toLowerCase().includes('licence')) {
          color = '#2196F3'; // Blue for licenses
        } else if (credential.toLowerCase().includes('therapy')) {
          color = '#9C27B0'; // Purple for therapy
        } else if (credential.toLowerCase().includes('education') || 
                   credential.toLowerCase().includes('teacher')) {
          color = '#17A2B8'; // Teal for education
        }
        
        credentialButtons.push({
          name: credential,
          color: color
        });
      });
    } 
    // Fallback if no credentials are available
    else if (item.category) {
      credentialButtons.push({
        name: `${item.category} Provider`,
        color: '#2196F3', // Blue for category
      });
    }
    
    return credentialButtons;
  };
  
  // Get credentials for this service
  const credentials = processCredentials();
  
  // Determine which layout to use
  if (displayAs === 'list') {
    // MODERN LIST VIEW - Clean horizontal layout with improved spacing and typography
    return (
      <TouchableOpacity 
        style={styles.listCardContainer}
        onPress={onPress ? () => onPress(item) : undefined} 
        activeOpacity={0.8}
      >
        <View style={styles.listCardInner}>
          {/* Left side - Image */}
          <View style={styles.listImageContainer}>
            {!imageLoaded && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            )}
            <Image 
              source={imageSource}
              style={styles.listImage}
              onLoad={() => {
                setImageLoaded(true);
                if (typeof onImageLoaded === 'function' && imageUrl) {
                  onImageLoaded(imageUrl);
                }
              }}
              onError={(e) => console.log('Service Card List Image Error:', e.nativeEvent.error)}
            />
            {/* Heart icon overlay */}
            <TouchableOpacity 
              style={styles.listHeartIconContainer}
              onPress={() => setIsFavorited(!isFavorited)}
            >
              <View style={styles.listHeartIconCircle}>
                <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={16} color={isFavorited ? "#FF6B6B" : "white"} />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Right side - Content */}
          <View style={styles.listContentContainer}>
            {/* Top Section - Title and Rating */}
            <View style={styles.listTopSection}>
              <Text style={styles.listTitle} numberOfLines={1}>{item.title || 'Service Title'}</Text>
              {renderModernRating()}
            </View>
            
            {/* Category */}
            <Text style={styles.listCategory}>{category}</Text>
            
            {/* Middle Section - Description */}
            <Text style={styles.listDescription} numberOfLines={2}>{description}</Text>
            
            {/* Location and Price Row - Moved up one line */}
            <View style={styles.listBottomSection}>
              {/* Location */}
              <View style={styles.listLocationContainer}>
                <Ionicons name="location-outline" size={16} color="#000" />
                <Text style={styles.listLocationText} numberOfLines={1}>{suburb}</Text>
              </View>
              
              {/* Price */}
              <View style={styles.listPriceContainer}>
                <Text style={styles.listPriceValue}>{price}<Text style={styles.listPriceUnit}> /hr</Text></Text>
              </View>
            </View>
            
            {/* Credentials as tags */}
            <View style={styles.listCredentialsContainer}>
              {credentials.slice(0, 2).map((credential, index) => (
                <View 
                  key={`${credential.name}-${index}`}
                  style={styles.listCredentialButton}
                >
                  <Text style={styles.listCredentialText}>{credential.name}</Text>
                </View>
              ))}
              {credentials.length > 2 && (
                <View style={styles.listCredentialButton}>
                  <Text style={styles.listCredentialText}>+{credentials.length - 2} more</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  } else {
    // GRID VIEW - Vertical layout with centered card (matching reference image)
    return (
      <View style={styles.gridCardWrapper}>
        <TouchableOpacity 
          style={styles.gridCardContainer} 
          onPress={onPress ? () => onPress(item) : undefined} 
          activeOpacity={0.8}
        >
          {/* Card container with rounded corners */}
          <View style={styles.gridCardInner}>
            {/* Image Container */}
            <View style={styles.imageContainer}>
              {!imageLoaded && (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#000" />
                </View>
              )}
              <Image 
                source={imageSource}
                style={styles.image}
                onLoad={() => {
                  setImageLoaded(true);
                  if (typeof onImageLoaded === 'function' && imageUrl) {
                    onImageLoaded(imageUrl);
                  }
                }}
                onError={(e) => console.log('Service Card Image Error:', e.nativeEvent.error)}
              />
              {/* Heart icon overlay */}
              <TouchableOpacity 
                style={styles.heartIconContainer}
                onPress={() => setIsFavorited(!isFavorited)}
              >
                <View style={styles.heartIconCircle}>
                  <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={20} color={isFavorited ? "#FF6B6B" : "white"} />
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Content Area */}
            <View style={styles.contentContainer}>
              {/* Title section */}
              <View style={styles.titleContainer}>
                {/* Service Title */}
                <Text style={styles.title} numberOfLines={2}>{item.title || 'Service Title'}</Text>
              </View>
              
              {/* Category and rating on same row */}
              <View style={styles.categoryRatingRow}>
                {/* Left side - Category */}
                <Text style={styles.category}>{category}</Text>
                
                {/* Right side - Modern Rating */}
                {renderModernRating()}
              </View>
              
              {/* Location */}
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={18} color="#000" />
                <Text style={styles.locationText} numberOfLines={1}>{suburb}</Text>
              </View>
              
              {/* Bottom section removed - no pricing in grid view */}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  // ===== GRID VIEW STYLES =====
  // Wrapper for the grid card in 2-column layout
  gridCardWrapper: {
    width: '50%', // Take up half the screen width
    marginBottom: 8,
    paddingHorizontal: 1, // Minimal padding between columns
  },
  
  // Grid card container
  gridCardContainer: {
    width: GRID_CARD_WIDTH,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignSelf: 'center', // Center the card within its wrapper
  },
  
  // Grid inner container with border radius
  gridCardInner: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    height: 240, // Longer to prevent text cropping
  },
  
  // ===== MODERN LIST VIEW STYLES =====
  // List card container
  listCardContainer: {
    width: '100%',
    paddingHorizontal: 0,
    marginBottom: 8, // Reduced spacing between cards for more compact look
    backgroundColor: '#fff',
    borderRadius: 8, // Subtle rounded corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // List card inner
  listCardInner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    overflow: 'hidden',
    paddingTop: 10, // Reduced from 12px
    paddingRight: 10, // Reduced from 12px
    paddingBottom: 10, // Reduced from 12px
    paddingLeft: 10, // Reduced from 12px
    borderRadius: 8,
  },
  
  // List image container
  listImageContainer: {
    width: 90, // Reduced from 100px
    height: 90, // Reduced from 100px
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12, // Reduced from 16px
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // List image
  listImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Cover mode for better appearance
  },
  
  // List content container
  listContentContainer: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'space-between',
  },
  
  // Top section with title and rating
  listTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  // Modern rating container
  modernRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  // Modern rating text
  modernRatingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  
  // Bottom section with location and price
  listBottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4, // Reduced from 5px
    marginBottom: 0,
  },
  
  // List title
  listTitle: {
    fontSize: 15, // Slightly smaller
    fontWeight: '700',
    color: '#000',
    marginBottom: 1, // Reduced from 2px
    flex: 1,
    paddingRight: 8,
  },
  
  // List category
  listCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 6,
  },
  
  // List description
  listDescription: {
    fontSize: 13, // Slightly smaller font
    color: '#000',
    marginBottom: 4, // Reduced from 5px
    lineHeight: 17, // Tighter line height
  },
  
  // List location container
  listLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  // List location text
  listLocationText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 4,
  },
  
  // List price container
  listPriceContainer: {
    alignItems: 'flex-end',
  },
  
  // List price value
  listPriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  
  // List price unit
  listPriceUnit: {
    fontSize: 12,
    color: '#000',
    marginTop: 2,
  },
  
  // List credentials container
  listCredentialsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2, // Added small top margin instead of bottom
  },
  
  // List credential button
  listCredentialButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  
  // List credential text
  listCredentialText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  
  // Image container
  imageContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden', // This is critical to ensure the rounded corners are visible
  },
  
  // Image styles
  image: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: 'cover', // Changed to cover for better Airbnb-style appearance
  },
  
  // Loading container
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 248, 248, 0.7)',
    zIndex: 1,
    borderRadius: 8,
  },
  
  // Heart icon container for grid view
  heartIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  
  // Circle background for heart icon (grid view)
  heartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Heart icon container for list view
  listHeartIconContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
  },
  
  // Circle background for heart icon (list view)
  listHeartIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Content container
  contentContainer: {
    flex: 1,
    padding: 10,
  },
  
  // Credentials container - grid view
  credentialsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  
  // Credential button - grid view
  credentialButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  
  // Credential text - grid view
  credentialText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // List credentials container
  listCredentialsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  
  // List credential button
  listCredentialButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  
  // List credential text
  listCredentialText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Title text
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  
  // Category text
  category: {
    fontSize: 14,
    color: '#888',
  },
  
  // Top content row container for title and rating
  categoryRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  // Title container
  titleContainer: {
    width: '100%',
  },
  
  // Rating outer container on right side
  ratingOuterContainer: {
    alignItems: 'flex-end',
  },
  
  // Stars container
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  
  // Reviews text
  reviewsText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'right',
  },
  
  // Bottom content row for location and price
  bottomContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 0, // Remove any implicit dividing line
  },
  
  // Location container
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0, // Remove gap between location and category
    marginBottom: 4, // Reduced from 12 to 4
  },
  
  // Location text
  locationText: {
    fontSize: 13,
    marginLeft: 4,
    color: '#444',
  },
  
  // Price container
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  
  // Price label (small 'from' text above price value)
  priceLabel: {
    fontSize: 12,
    color: '#000',
    textAlign: 'right',
  },
  
  // Price value
  priceValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
  },
  
  // Price unit ('per hour' text below price value)
  priceUnit: {
    fontSize: 12,
    color: '#000',
    textAlign: 'right',
  },
});

export default ServiceCard;
