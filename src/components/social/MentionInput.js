import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';
import { searchUsersByTag } from '../../services/postService';

const { width } = Dimensions.get('window');

const MentionInput = ({ 
  value, 
  onChangeText, 
  placeholder = 'Write a comment...',
  style,
  inputStyle,
  suggestionsStyle,
  onSubmit,
  multiline = true,
  maxLength,
}) => {
  const [query, setQuery] = useState('');
  const [searchPosition, setSearchPosition] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (query.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  const fetchSuggestions = async () => {
    try {
      const { data } = await searchUsersByTag(query);
      setSuggestions(data || []);
      setShowSuggestions(data && data.length > 0);
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleChangeText = (text) => {
    onChangeText(text);
    
    // Check for @ character to trigger mentions
    const lastAtSymbol = text.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const currentCursorPosition = text.length;
      const textAfterAt = text.substring(lastAtSymbol + 1, currentCursorPosition);
      
      // Only search if we have at least one character after @
      if (textAfterAt.length >= 1 && !textAfterAt.includes(' ')) {
        setSearchPosition(lastAtSymbol);
        setQuery(textAfterAt);
        setShowSuggestions(true);
      } else {
        setSearchPosition(-1);
        setQuery('');
        setShowSuggestions(false);
      }
    } else {
      setSearchPosition(-1);
      setQuery('');
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (user) => {
    if (searchPosition === -1) return;
    
    const beforeMention = value.substring(0, searchPosition);
    const afterMention = value.substring(searchPosition + query.length + 1);
    const newText = `${beforeMention}@${user.username} ${afterMention}`;
    
    onChangeText(newText);
    setShowSuggestions(false);
    setQuery('');
    setSearchPosition(-1);
    
    // Focus the input and move cursor to end
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectUser(item)}
    >
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/30' }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <TextInput
        ref={inputRef}
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        multiline={multiline}
        maxLength={maxLength}
        onSubmitEditing={onSubmit}
      />
      
      {showSuggestions && (
        <View style={[styles.suggestionsContainer, suggestionsStyle]}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No users found</Text>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F6F6F6',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    marginTop: 5,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    padding: 10,
    color: '#888',
  },
});

export default MentionInput;
