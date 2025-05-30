import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native'; 
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window'); 

const ServiceCard = ({ item, onPress, displayAs = 'grid' }) => { 
  const [imageLoading, setImageLoading] = useState(true); 

  let categoryIconName = 'miscellaneous-services';
  switch (item.category?.toLowerCase()) {
    case 'therapy':
      categoryIconName = 'psychology';
      break;
    case 'transport':
      categoryIconName = 'directions-car';
      break;
    case 'support':
      categoryIconName = 'support-agent';
      break;
    case 'tech':
      categoryIconName = 'computer';
      break;
    case 'personal':
      categoryIconName = 'person';
      break;
    case 'social':
      categoryIconName = 'people';
      break;
  }

  if (displayAs === 'swipe') {
    return (
      <View style={styles.swipeCardContainer}>
        <Image 
          source={item.media_urls && item.media_urls.length > 0 ? { uri: item.media_urls[0] } : require('../../assets/images/placeholder.png')} 
          style={styles.swipeImage}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
        {imageLoading && (
          <ActivityIndicator 
            style={styles.imageLoader}
            size="large" 
            color="#FFFFFF" 
          />
        )}
        <View style={styles.swipeOverlay}>
          <Text style={styles.swipeTitle} numberOfLines={2}>{item.title || 'Service Title'}</Text>
          <View style={styles.swipeDetailRow}>
            <MaterialIcons name={categoryIconName} size={20} color="#FFF" />
            <Text style={styles.swipeDetailText}>{item.category || 'Category'}</Text>
          </View>
          <View style={styles.swipeDetailRow}>
            <AntDesign name="star" size={20} color="#FFD700" />
            <Text style={styles.swipeDetailText}>{item.rating || '4.5'} ({item.review_count || '100+'})</Text>
          </View>
        </View>
      </View>
    );
  }

  const cardStyle = displayAs === 'list' ? styles.listCardContainer : styles.gridCardContainer;
  const imageStyle = displayAs === 'list' ? styles.listImage : styles.gridImage;
  const imageContainerStyle = displayAs === 'list' ? styles.listImageContainer : styles.gridImageContainer; 
  const contentStyle = displayAs === 'list' ? styles.listContentContainer : styles.gridContentContainer;
  const titleStyle = displayAs === 'list' ? styles.listTitle : styles.gridTitle;
  const detailRowStyle = displayAs === 'list' ? styles.listDetailRow : styles.gridDetailRow;
  const iconRowStyle = displayAs === 'list' ? styles.listIconRow : styles.gridIconRow;

  return (
    <TouchableOpacity style={cardStyle} onPress={onPress}>
      <View style={imageContainerStyle}> 
        <Image 
          source={item.media_urls && item.media_urls.length > 0 ? { uri: item.media_urls[0] } : require('../../assets/images/placeholder.png')} 
          style={imageStyle}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
        {imageLoading && (
          <ActivityIndicator 
            style={styles.imageLoader}
            size={displayAs === 'list' ? "medium" : "small"} 
            color="#3A5E49" 
          />
        )}
      </View>
      <View style={contentStyle}>
        <Text style={titleStyle} numberOfLines={2}>{item.title || 'Service Title'}</Text>
        <View style={detailRowStyle}>
          <MaterialIcons name={categoryIconName} size={16} color="#555" />
          <Text style={styles.detailText}>{item.category || 'Category'}</Text>
        </View>
        <View style={detailRowStyle}>
          <AntDesign name="star" size={16} color="#FFC107" />
          <Text style={styles.detailText}>{item.rating || '4.5'} ({item.review_count || '100+'})</Text>
        </View>
        {displayAs === 'list' && (
          <View style={styles.descriptionContainerList}>
            <Text style={styles.descriptionTextList} numberOfLines={2}>{item.description || 'No description available.'}</Text>
          </View>
        )}
      </View>
      <View style={iconRowStyle}>
        <TouchableOpacity style={styles.iconButton} onPress={() => alert('Share pressed for ' + item.title)}>
          <Feather name="share-2" size={20} color={displayAs === 'list' ? '#555' : '#555'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => alert('Favourite pressed for ' + item.title)}>
          <AntDesign name="hearto" size={20} color={displayAs === 'list' ? '#555' : '#555'} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    margin: 8,
    alignItems: 'center', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: width / 2 - 24, 
  },
  gridImage: {
    width: 80,
    height: 80,
    borderRadius: 40, 
    marginBottom: 10,
    backgroundColor: '#E0E0E0',
  },
  gridImageContainer: { 
    width: 80, 
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#E0E0E0', 
  },
  gridContentContainer: {
    alignItems: 'center',
    width: '100%'
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 40, 
  },
  gridDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    alignSelf: 'center', 
  },
  gridIconRow: {
    flexDirection: 'row',
    position: 'absolute', 
    top: 8,
    right: 8,
  },

  listCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    flexDirection: 'row',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  listImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#E0E0E0',
  },
  listImageContainer: { 
    width: 90,
    height: 90,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0', 
  },
  listContentContainer: {
    flex: 1, 
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  listDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  descriptionContainerList: {
    marginTop: 4,
  },
  descriptionTextList: {
    fontSize: 13,
    color: '#666',
  },
  listIconRow: {
    flexDirection: 'column', 
    justifyContent: 'space-around', 
    marginLeft: 'auto', 
    paddingLeft: 10, 
  },
  
  detailText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 6,
  },
  iconButton: {
    padding: 6, 
  },

  swipeCardContainer: {
    width: width * 0.9, 
    height: height * 0.65, 
    borderRadius: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden', 
    justifyContent: 'flex-end', 
  },
  swipeImage: {
    width: '100%',
    height: '100%',
    position: 'absolute', 
  },
  swipeOverlay: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', 
  },
  swipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  swipeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  swipeDetailText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  imageLoader: { 
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});

export default ServiceCard;
